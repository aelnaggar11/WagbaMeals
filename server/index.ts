import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { DatabaseStorage } from "./database-storage";
import { testDatabaseConnection, pool } from "./db";

// Validate required environment variables
function validateEnvironment() {
  const requiredEnvVars = ['DATABASE_URL'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
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

    // Test database connection first
    log("Testing database connection...");
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      const errorMsg = "Database connection failed during startup";
      if (process.env.NODE_ENV === 'production') {
        console.warn(errorMsg + " - continuing with limited functionality");
      } else {
        throw new Error(errorMsg);
      }
    } else {
      log("Database connection successful");
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
        // The app might still work for basic functionality
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
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          database: dbHealthy ? 'connected' : 'disconnected',
          environment: process.env.NODE_ENV || 'development'
        };
        
        if (dbHealthy) {
          res.status(200).json(status);
        } else {
          res.status(503).json({ ...status, status: 'degraded' });
        }
      } catch (error) {
        res.status(503).json({
          status: 'error',
          timestamp: new Date().toISOString(),
          error: 'Health check failed'
        });
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

    // Start the server
    const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
    const host = process.env.HOST || "0.0.0.0";
    
    server.listen({
      port,
      host,
      reusePort: true,
    }, () => {
      log(`Server started successfully on ${host}:${port}`);
      log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
      } else {
        console.error(`Server error: ${error.message}`);
      }
      process.exit(1);
    });

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
