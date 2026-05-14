import { Router } from "express";
import { getSupabaseClient } from "../config/supabaseClient";

const router = Router();

/**
 * GET /health
 * Verifies the API can reach Supabase (reads `firms`, limit 1).
 */
router.get("/", async (_req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("firms").select("id").limit(1);

    if (error) {
      res.status(503).json({
        status: "error",
        service: "buildright-api",
        timestamp: new Date().toISOString(),
        database: "unreachable",
        message: error.message,
      });
      return;
    }

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
