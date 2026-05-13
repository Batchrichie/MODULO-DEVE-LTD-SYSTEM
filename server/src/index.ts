/**
 * index.ts — Server entry point
 * Bootstraps the Express app, connects to PostgreSQL, starts listening.
 */

import "dotenv/config";
import app from "./app";
import { pool } from "./config/database";
import logger from "./utils/logger";

const PORT = process.env.PORT ?? 4000;

function start() {
  // Start server immediately
  app.listen(PORT, () => {
    logger.info(`✓ Server running on http://localhost:${PORT}`);
    logger.info(`  Environment: ${process.env.NODE_ENV ?? "development"}`);
  });

  // Test database connection in the background (non-blocking)
  pool.query("SELECT 1")
    .then(() => logger.info("✓ PostgreSQL connected"))
    .catch((err: any) => logger.warn("⚠ Database unavailable - running in test mode"));
}

start();
