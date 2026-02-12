// server/middleware.ts
// SOTA God Mode - Enterprise Middleware v3.0

import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// ═══════════════════════════════════════════════════════════════════
// REQUEST ID
// ═══════════════════════════════════════════════════════════════════

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const existing = req.header("x-request-id");
  const id = existing || crypto.randomUUID();
  res.setHeader("X-Request-Id", id);
  (req as Record<string, unknown>).requestId = id;
  next();
}

// ═══════════════════════════════════════════════════════════════════
// TIMING / ACCESS LOG
// ═══════════════════════════════════════════════════════════════════

export function timingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const start = performance.now();
  res.on("finish", () => {
    const ms = (performance.now() - start).toFixed(1);
    const id = (req as Record<string, unknown>).requestId
      ? ` rid=${(req as Record<string, unknown>).requestId}`
      : "";
    console.log(
      `[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${ms}ms)${id}`,
    );
  });
  next();
}

// ═══════════════════════════════════════════════════════════════════
// SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════════

export function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.removeHeader("X-Powered-By");
  next();
}

// ═══════════════════════════════════════════════════════════════════
// CORS - Configurable Allowlist (replaces wildcard *)
// ═══════════════════════════════════════════════════════════════════

const ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:3000,http://localhost:3001")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);

export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const origin = req.header("origin") || "";

  if (ALLOWED_ORIGINS.has(origin) || ALLOWED_ORIGINS.has("*")) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-NeuronWriter-Key, X-API-KEY, X-Request-Id",
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
}

// ═══════════════════════════════════════════════════════════════════
// CLIENT IP EXTRACTION (behind reverse proxies)
// ═══════════════════════════════════════════════════════════════════

function getClientIp(req: Request): string {
  const cfIp = req.header("cf-connecting-ip");
  if (cfIp) return cfIp;

  const forwarded = req.header("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.header("x-real-ip");
  if (realIp) return realIp;

  return req.ip || "unknown";
}

// ═══════════════════════════════════════════════════════════════════
// RATE LIMITER
// ═══════════════════════════════════════════════════════════════════

export function basicRateLimit(options?: {
  windowMs?: number;
  max?: number;
}) {
  const windowMs = options?.windowMs ?? 60_000;
  const max = options?.max ?? 120;

  const hits = new Map<string, { count: number; resetAt: number }>();

  // Periodic cleanup to prevent memory leak
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now > entry.resetAt) {
        hits.delete(key);
      }
    }
  }, windowMs * 2);

  // Prevent interval from keeping process alive
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const key = getClientIp(req);
    const now = Date.now();

    const entry = hits.get(key);
    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.status(429).json({
        success: false,
        error: "Too Many Requests",
        message: "Rate limit exceeded. Try again soon.",
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
      return;
    }

    next();
  };
}
