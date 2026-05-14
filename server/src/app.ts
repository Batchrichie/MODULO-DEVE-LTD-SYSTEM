import express from "express";
import cors from "cors";
import helmet from "helmet";
import logger from "./utils/logger";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import invoicesRouter from "./routes/invoices";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "BuildRight API" });
});

app.use("/health", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/invoices", invoicesRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;