import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === 'production') {
    console.error("DATABASE_URL must be set. Please configure it in your deployment settings.");
    // Create a dummy connection string for production startup
    process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';
  } else {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
}

// Configure connection pool with better settings for deployment
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: process.env.NODE_ENV === 'production' ? 10 : 5, // Fewer connections in production
  min: 1, // Minimum connections to maintain
  idleTimeoutMillis: process.env.NODE_ENV === 'production' ? 60000 : 30000,
  connectionTimeoutMillis: process.env.NODE_ENV === 'production' ? 15000 : 10000,
  acquireTimeoutMillis: 15000, // Time to wait for connection from pool
  createTimeoutMillis: 15000, // Time to wait for new connection creation
  destroyTimeoutMillis: 5000, // Time to wait for connection destruction
  reapIntervalMillis: 1000, // Cleanup interval
  createRetryIntervalMillis: 200, // Retry interval for connection creation
};

let pool: Pool;
let db: any;

try {
  pool = new Pool(poolConfig);
  
  // Add comprehensive connection error handling
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });

  pool.on('connect', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('New database connection established');
    }
  });

  pool.on('remove', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Database connection removed from pool');
    }
  });

  db = drizzle({ client: pool, schema });
} catch (error) {
  console.error('Failed to initialize database pool:', error);
  // Create dummy objects for graceful degradation
  pool = null as any;
  db = null as any;
}

export { pool, db };

// Test database connection function with improved error handling
export async function testDatabaseConnection(): Promise<boolean> {
  if (!pool) {
    console.error('Database pool not initialized');
    return false;
  }

  let client;
  try {
    // Test with timeout
    const connectionPromise = pool.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 10000)
    );
    
    client = await Promise.race([connectionPromise, timeoutPromise]) as any;
    
    // Test simple query
    await client.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing database connection:', releaseError);
      }
    }
  }
}
