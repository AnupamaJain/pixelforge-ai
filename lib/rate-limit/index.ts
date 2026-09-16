import "server-only";

/**
 * In-memory sliding-window rate limiter.
 *
 * Scoped to a single server instance, which is sufficient for the MVP and for
 * single-region deployments. For multi-instance production, swap the Map for a
 * shared store (Upstash Redis) — the call sites need no changes.
 */

interface Window {
  timestamps: number[];
}

const windows = new Map<string, Window>();

// Prevents the Map growing without bound on long-lived instances.
const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = Date.now();

function sweep(now: number, windowMs: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;

  for (const [key, window] of windows) {
    const live = window.timestamps.filter((t) => now - t < windowMs);
    if (live.length === 0) windows.delete(key);
    else window.timestamps = live;
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  sweep(now, params.windowMs);

  const window = windows.get(params.key) ?? { timestamps: [] };
  const live = window.timestamps.filter((t) => now - t < params.windowMs);

  if (live.length >= params.limit) {
    const oldest = Math.min(...live);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((params.windowMs - (now - oldest)) / 1000),
    );
    windows.set(params.key, { timestamps: live });
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  live.push(now);
  windows.set(params.key, { timestamps: live });

  return {
    allowed: true,
    remaining: params.limit - live.length,
    retryAfterSeconds: 0,
  };
}

function envInt(key: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[key] || "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Throttles generation endpoints per user. */
export function limitGeneration(userId: string): RateLimitResult {
  return rateLimit({
    key: `generate:${userId}`,
    limit: envInt("RATE_LIMIT_GENERATIONS_PER_MINUTE", 10),
    windowMs: 60_000,
  });
}

/** Throttles uploads per user. */
export function limitUpload(userId: string): RateLimitResult {
  return rateLimit({
    key: `upload:${userId}`,
    limit: envInt("RATE_LIMIT_UPLOADS_PER_MINUTE", 20),
    windowMs: 60_000,
  });
}

export class RateLimitError extends Error {
  readonly status = 429;
  constructor(readonly retryAfterSeconds: number) {
    super(`Too many requests. Try again in ${retryAfterSeconds}s.`);
    this.name = "RateLimitError";
  }
}
