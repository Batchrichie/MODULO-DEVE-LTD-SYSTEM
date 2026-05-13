import { Router } from "express";
import { pool } from "../config/database";

const router = Router();

/**
 * GET /api/v1/health
 * Used by load balancers, monitoring, and the deploy pipeline.
 * Returns 200 if the server and DB are up, 503 if not.
 */
router.get("/", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      service: "buildright-api",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch {
    res.status(503).json({
      status: "error",
      service: "buildright-api",
      timestamp: new Date().toISOString(),
      database: "unreachable",
    });
  }
});

export default router;
