// server/index.ts
// SOTA God Mode - Express Server Entry Point v3.0

import express from "express";
import { registerRoutes } from "./routes";
import {
  requestIdMiddleware,
  timingMiddleware,
  basicRateLimit,
  securityHeaders,
  corsMiddleware,
} from "./middleware";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// ─── Global Middleware ──────────────────────────────────────────────
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(requestIdMiddleware);
app.use(timingMiddleware);
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(basicRateLimit({ windowMs: 60_000, max: 120 }));

// ─── Health Check ───────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "12.0.0",
  });
});

// ─── Register All Routes ────────────────────────────────────────────
registerRoutes(app);

// ─── Global Error Handler ───────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("[Server] Unhandled error:", err.message, err.stack);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Internal server error",
        ...(process.env.NODE_ENV !== "production" && { details: err.message }),
      });
    }
  },
);

// ─── Start ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] ✅ Running on http://localhost:${PORT}`);
  console.log(
    `[Server] Database: ${process.env.DATABASE_URL ? "Connected" : "Not configured (offline mode)"}`,
  );
  console.log(`[Server] Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
