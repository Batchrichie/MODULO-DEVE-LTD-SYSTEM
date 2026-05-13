/**
 * index.ts — Server entry point
 * Bootstraps the Express app, connects to PostgreSQL, starts listening.
 */

import "dotenv/config";
import app from "./app";
import { pool } from "./config/database";
import logger from "./utils/logger";

const PORT = process.env.PORT ?? 4000;

async function start() {
  try {
    // Verify database connection before accepting traffic
    await pool.query("SELECT 1");
    logger.info("✓ PostgreSQL connected");

    app.listen(PORT, () => {
      logger.info(`✓ Server running on http://localhost:${PORT}`);
      logger.info(`  Environment: ${process.env.NODE_ENV ?? "development"}`);
    });
  } catch (err) {
    logger.error("✗ Failed to connect to database:", err);
    process.exit(1);
  }
}

start();
