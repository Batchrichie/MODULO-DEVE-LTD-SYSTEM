/**
 * database.ts — PostgreSQL connection pool with mock fallback
 * Import { pool } wherever you need a database connection.
 * Uses a pool (not single connections) for concurrency and performance.
 * Falls back to mock database for development when PostgreSQL is unavailable.
 */

import { Pool, PoolClient } from "pg";
import logger from "../utils/logger";

// Mock data store
const mockData: Record<string, any[]> = {
  users: [
    { id: "user-1", email: "admin@buildright.gh", password_hash: "$2a$10$demo", role: "admin" }
  ],
  invoices: [
    { id: "inv-1", project_id: "proj-1", total: 5000, status: "draft", created_at: new Date().toISOString() }
  ],
  projects: [
    { id: "proj-1", name: "Demo Project", client_id: "client-1", status: "active" }
  ]
};

// Mock pool/client
class MockClient {
  async query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }> {
    // Simulate query responses based on SQL
    const upperText = text.toUpperCase();
    
    if (upperText.includes("SELECT 1")) {
      return { rows: [{ "?column?": 1 }] as any };
    }
    if (upperText.includes("FROM users")) {
      return { rows: mockData.users as T[] };
    }
    if (upperText.includes("FROM invoices")) {
      return { rows: mockData.invoices as T[] };
    }
    if (upperText.includes("FROM projects")) {
      return { rows: mockData.projects as T[] };
    }
    
    return { rows: [] as T[] };
  }

  async release() {
    // Mock client release
  }
}

const mockPool = {
  query: async <T,>(text: string, params?: unknown[]): Promise<{ rows: T[] }> => {
    const client = new MockClient();
    return client.query<T>(text, params);
  },
  connect: async () => new MockClient(),
  end: async () => {},
};

// Create PostgreSQL pool  
const pgPool = new Pool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? "buildright_dev",
  user: process.env.DB_USER ?? "postgres",
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  options: "-c timezone=UTC",
});

// Use mock if environment var is set, otherwise try PG
export const pool = process.env.USE_MOCK_DB === "true" ? mockPool : pgPool;

// Try to connect to real database, fall back to mock if needed
let initialized = false;

async function initializePool() {
  if (initialized) return;
  if (process.env.USE_MOCK_DB === "true") {
    logger.warn("⚠ Using mock database for development");
    return;
  }

  try {
    await pgPool.query("SELECT 1");
    logger.info("✓ PostgreSQL connected");
  } catch (err: any) {
    logger.warn(`⚠ PostgreSQL unavailable (${err.code}), falling back to mock database`);
    // Replace pool with mock
    Object.assign(pool, mockPool);
    await pgPool.end();
  }
  initialized = true;
}

// Initialize on startup
initializePool().catch(err => {
  logger.error("Initialization error:", err);
});

/**
 * Helper: run a query and return rows directly.
 * Usage: const rows = await query<Invoice>("SELECT * FROM invoices WHERE id = $1", [id])
 */
export async function query<T = any>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query<T as any>(text, params);
  return result.rows;
}

/**
 * Helper: get a client for transactions.
 * Always call client.release() in a finally block.
 */
export async function getClient() {
  return pool.connect();
}
