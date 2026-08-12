import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "./lib/migrate";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Startup diagnostics — confirm critical env vars are present
const dbUrl = process.env["DATABASE_URL"] ?? "";
if (!dbUrl) {
  throw new Error("DATABASE_URL environment variable is required but was not provided.");
}
if (!process.env["SESSION_SECRET"]) {
  throw new Error("SESSION_SECRET environment variable is required but was not provided.");
}

// Log masked DB host so we can confirm the right DB is connected
const dbHost = (() => {
  try { return new URL(dbUrl).host; } catch { return "unknown"; }
})();

async function start() {
  try {
    await runMigrations();
  } catch (err) {
    logger.error({ err }, "Migration failed — aborting startup");
    process.exit(1);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port, dbHost }, "Server listening");
  });
}

start();
