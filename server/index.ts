import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { DatabaseStorage } from "./database-storage";
import { testDatabaseConnection, pool } from "./db";

// Validate required environment variables
function validateEnvironment() {
  log("Validating environment configuration...");
  
  // Production deployment diagnostics
  console.log('=== DEPLOYMENT DIAGNOSTICS ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
  console.log('SESSION_SECRET present:', !!process.env.SESSION_SECRET);
  console.log('PORT:', process.env.PORT || '5000');
  
  if (process.env.DATABASE_URL) {
    console.log('Database URL format:', process.env.DATABASE_URL.substring(0, 20) + '...');
  }
  
  if (process.env.SESSION_SECRET) {
    console.log('Session secret length:', process.env.SESSION_SECRET.length);
  }
  console.log('================================');
  
  const requiredEnvVars = ['DATABASE_URL'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    if (process.env.NODE_ENV === 'production') {
      console.error('PRODUCTION DEPLOYMENT FAILED: Missing critical environment variables');
      console.error('Required environment variables:');
      console.error('   - DATABASE_URL: PostgreSQL connection string');
      console.error('   - SESSION_SECRET: Secure random string (32+ characters)');
      throw new Error(`Production deployment failed: Missing environment variables`);
    }
    console.warn("Continuing in development mode with missing variables");
  }
  
  // Validate SESSION_SECRET for production
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    console.error('SESSION_SECRET is required for production deployments');
    console.error('Generate a secure session secret with: openssl rand -base64 32');
    throw new Error('SESSION_SECRET environment variable is required');
  }
  
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    console.warn('SESSION_SECRET should be at least 32 characters long for security');
  }
  
  log("Environment validation complete");
}

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error(`Uncaught Exception: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  console.error(reason);
  process.exit(1);
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add cookie parser for token authentication
import cookieParser from 'cookie-parser';
app.use(cookieParser());



app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

async function initializeServer() {
  try {
    // Validate environment variables first
    log("Validating environment configuration...");
    validateEnvironment();
    log("Environment validation complete");

    // Test database connection with retry logic
    log("Testing database connection...");
    let dbConnected = false;
    let retryCount = 0;
    const maxRetries = process.env.NODE_ENV === 'production' ? 5 : 3;

    while (!dbConnected && retryCount < maxRetries) {
      try {
        dbConnected = await testDatabaseConnection();
        if (dbConnected) {
          log("Database connection successful");
          break;
        }
      } catch (error) {
        console.error(`Database connection attempt ${retryCount + 1} failed:`, error);
      }
      
      retryCount++;
      if (retryCount < maxRetries) {
        log(`Retrying database connection in ${retryCount * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
      }
    }

    if (!dbConnected) {
      const errorMsg = "Database connection failed after multiple attempts";
      if (process.env.NODE_ENV === 'production') {
        console.warn(errorMsg + " - continuing with limited functionality. Please check DATABASE_URL configuration.");
      } else {
        throw new Error(errorMsg);
      }
    }

    // Initialize database with sample data (with timeout and retry logic)
    if (dbConnected) {
      log("Initializing database with sample data...");
      try {
        const dbStorage = storage as DatabaseStorage;
        
        // Add timeout to database initialization
        const initPromise = dbStorage.seedInitialData();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database initialization timeout')), 30000)
        );
        
        await Promise.race([initPromise, timeoutPromise]);
        log("Database initialization complete");
      } catch (dbError) {
        console.error(`Error initializing database: ${dbError}`);
        // Don't exit on database initialization failure in production
        if (process.env.NODE_ENV === 'production') {
          console.warn("Continuing startup despite database initialization failure");
        } else {
          throw dbError;
        }
      }
    }

    const server = await registerRoutes(app);

    // Health check endpoint for deployment monitoring
    app.get('/health', async (req, res) => {
      try {
        const dbHealthy = await testDatabaseConnection();
        const status = {
          status: dbHealthy ? 'ok' : 'degraded',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          database: dbHealthy ? 'connected' : 'disconnected',
          environment: process.env.NODE_ENV || 'development',
          version: '1.0.0',
          services: {
            database: dbHealthy ? 'healthy' : 'unhealthy',
            session: 'healthy',
            api: 'healthy'
          }
        };
        
        if (dbHealthy) {
          res.status(200).json(status);
        } else {
          res.status(503).json(status);
        }
      } catch (error) {
        res.status(503).json({
          status: 'error',
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
          environment: process.env.NODE_ENV || 'development'
        });
      }
    });

    // Readiness probe endpoint
    app.get('/ready', async (req, res) => {
      try {
        const dbHealthy = await testDatabaseConnection();
        if (dbHealthy) {
          res.status(200).json({ status: 'ready' });
        } else {
          res.status(503).json({ status: 'not ready', reason: 'database unavailable' });
        }
      } catch (error) {
        res.status(503).json({ status: 'not ready', reason: 'health check failed' });
      }
    });

    // Improved error handler that doesn't re-throw
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error(`Error: ${status} - ${message}`);
      
      // Send error response but don't crash the server
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });

    // Setup Vite in development or static serving in production
    try {
      if (process.env.NODE_ENV === "development") {
        await setupVite(app, server);
        log("Vite development server setup complete");
      } else {
        serveStatic(app);
        log("Static file serving setup complete"); 
      }
    } catch (viteError) {
      console.error(`Error setting up frontend: ${viteError}`);
      // Continue without frontend in case of setup failure
      console.warn("Continuing with API-only mode");
    }

    // Start the server with port fallback
    let port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
    const host = process.env.HOST || "0.0.0.0";
    
    const startServer = (attemptPort: number, maxAttempts: number = 10): Promise<void> => {
      return new Promise((resolve, reject) => {
        const serverInstance = server.listen({
          port: attemptPort,
          host,
        }, () => {
          log(`Server started successfully on ${host}:${attemptPort}`);
          log(`Environment: ${process.env.NODE_ENV || 'development'}`);
          resolve();
        });

        serverInstance.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            if (maxAttempts > 1) {
              log(`Port ${attemptPort} is in use, trying ${attemptPort + 1}...`);
              startServer(attemptPort + 1, maxAttempts - 1).then(resolve).catch(reject);
            } else {
              reject(new Error(`No available ports found after trying ${port} to ${attemptPort}`));
            }
          } else {
            reject(error);
          }
        });
      });
    };

    await startServer(port);

    // NOTE: Billing scheduler is now deprecated as Paymob handles subscription billing
    // via their native subscription API. This code is kept for reference/migration purposes.
    // 
    // Initialize billing scheduler for subscription payments
    // const { BillingScheduler } = await import('./billing');
    // const billingScheduler = new BillingScheduler(storage as DatabaseStorage);
    // billingScheduler.start();
    // log('Billing scheduler initialized successfully');

    // Graceful shutdown handlers
    const gracefulShutdown = (signal: string) => {
      log(`Received ${signal}, starting graceful shutdown...`);
      
      server.close((err) => {
        if (err) {
          console.error('Error during server shutdown:', err);
          process.exit(1);
        }
        
        log('HTTP server closed');
        
        // Close database connections
        try {
          pool.end(() => {
            log('Database connections closed');
            process.exit(0);
          });
        } catch (dbCloseError) {
          console.error('Error closing database connections:', dbCloseError);
          process.exit(0);
        }
      });
      
      // Force close after 30 seconds
      setTimeout(() => {
        console.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error: any) {
    console.error(`Failed to start server: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Initialize server with proper error handling
initializeServer();
