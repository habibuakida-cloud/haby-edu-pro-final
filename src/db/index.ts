import { drizzle } from 'drizzle-orm/node-postgres';
// @ts-ignore
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema.ts';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: any;
}

// Function to create or retrieve the connection pool.
export const createPool = () => {
  if (!globalThis._postgresPool) {
    const instanceConn = process.env.INSTANCE_CONNECTION_NAME;
    const isSocket = instanceConn || (process.env.SQL_HOST && process.env.SQL_HOST.startsWith('/'));
    const socketPath = instanceConn ? `/cloudsql/${instanceConn}` : process.env.SQL_HOST;

    const poolConfig: any = {
      user: process.env.SQL_USER || process.env.POSTGRES_USER || 'postgres',
      password: process.env.SQL_PASSWORD || process.env.POSTGRES_PASSWORD || '',
      database: process.env.SQL_DB_NAME || process.env.POSTGRES_DB || 'postgres',
      max: 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    };

    if (process.env.DATABASE_URL) {
      poolConfig.connectionString = process.env.DATABASE_URL;
    } else if (isSocket && socketPath) {
      poolConfig.host = socketPath;
    } else if (process.env.SQL_HOST) {
      poolConfig.host = process.env.SQL_HOST;
      poolConfig.port = Number(process.env.SQL_PORT) || 5432;
    } else {
      poolConfig.host = 'localhost';
      poolConfig.port = 5432;
    }

    globalThis._postgresPool = new Pool(poolConfig);

    // Prevent unhandled pool-level errors from crashing the application
    globalThis._postgresPool.on('error', (err: any) => {
      console.error('Unexpected error on idle SQL pool client:', err?.message || err);
    });
  }
  return globalThis._postgresPool;
};

// Create or retrieve the pool instance.
const pool = createPool();

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });
