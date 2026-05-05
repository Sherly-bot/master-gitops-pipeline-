// src/server.js — starts the HTTP server
require("dotenv").config({ path: process.env.ENV_FILE || ".env.local" });

const app = require("./app");

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.info(`✅ Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.info(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.info("HTTP server closed.");
    process.exit(0);
  });

  // Force exit after 10s if not clean
  setTimeout(() => {
    console.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

module.exports = server;
