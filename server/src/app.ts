/**
 * app.ts — Express application factory
 * Applies middleware and mounts route groups.
 * No business logic here — only wiring.
 */

import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

// Route groups — populated per phase
import healthRouter from "./routes/health";
// Phase 1:  import authRouter from "./routes/auth";
// Phase 1:  import invoicesRouter from "./routes/invoices";
// Phase 1:  import clientsRouter from "./routes/clients";
// Phase 2:  import projectsRouter from "./routes/projects";
// Phase 2:  import expensesRouter from "./routes/expenses";
// Phase 3:  import journalsRouter from "./routes/journals";
// Phase 3:  import reportsRouter from "./routes/reports";
// Phase 4:  import taxRouter from "./routes/tax";
// Phase 5:  import employeesRouter from "./routes/employees";
// Phase 5:  import timesheetsRouter from "./routes/timesheets";

const app = express();

// ── Security
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  })
);

// ── Rate limiting — protect against brute force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please try again later." },
});
app.use("/api", limiter);

// ── Body parsing & compression
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// ── Request logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Routes
const API = "/api/v1";
app.use(`${API}/health`, healthRouter);
// Phase 1+: mount additional routers here

// ── 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
