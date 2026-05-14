import "dotenv/config";
import app from "./app";
import logger from "./utils/logger";

const PORT = Number(process.env.PORT || 4000);

if (!process.env.SUPABASE_URL) {
  logger.info("Missing required environment variable: SUPABASE_URL");
  process.exit(1);
}

if (!process.env.SUPABASE_ANON_KEY) {
  logger.info("Missing required environment variable: SUPABASE_ANON_KEY");
  process.exit(1);
}

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});
