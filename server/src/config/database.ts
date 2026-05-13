/**
 * database.ts — PostgreSQL connection pool
 * Import { pool } wherever you need a database connection.
 * Uses a pool (not single connections) for concurrency and performance.
 */

import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? "buildright_dev",
  user: process.env.DB_USER ?? "postgres",
  password: process.env.DB_PASSWORD,
  // Pool config
  max: 20,                  // Maximum connections in pool
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // Always use UTC — critical for accounting dates
  options: "-c timezone=UTC",
});

/**
 * Helper: run a query and return rows directly.
 * Usage: const rows = await query<Invoice>("SELECT * FROM invoices WHERE id = $1", [id])
 */
export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

/**
 * Helper: get a client for transactions.
 * Always call client.release() in a finally block.
 */
export async function getClient() {
  return pool.connect();
}
