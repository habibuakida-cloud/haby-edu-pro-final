import { drizzle } from 'drizzle-orm/node-postgres';
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
    globalThis._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 20000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      allowExitOnIdle: false,
    });

    // Gracefully handle pool-level events and idle client recycles
    globalThis._postgresPool.on('error', (err: any) => {
      const isExpectedIdleTermination =
        err?.message?.includes('Connection terminated unexpectedly') ||
        err?.code === 'ECONNRESET' ||
        err?.code === 'EPIPE' ||
        err?.code === '57P01';

      if (isExpectedIdleTermination) {
        // Idle connection recycling by Cloud SQL proxy is normal behavior; pg.Pool automatically replaces it on next query
        console.info('Database pool notice: Idle connection recycled by PostgreSQL pool.');
      } else {
        console.warn('Database pool warning:', err?.message || err);
      }
    });
  }
  return globalThis._postgresPool;
};

// Create or retrieve the pool instance.
const pool = createPool();

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });

