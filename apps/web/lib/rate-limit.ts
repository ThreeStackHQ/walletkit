/**
 * In-memory sliding window rate limiter.
 * Separate limits for API key (30/min) and IP (60/min).
 */

interface RateLimitEntry {
  timestamps: number[];
}

const apiKeyBuckets = new Map<string, RateLimitEntry>();
const ipBuckets = new Map<string, RateLimitEntry>();

const API_KEY_LIMIT = 30;
const IP_LIMIT = 60;
const WINDOW_MS = 60_000;

function cleanup(entry: RateLimitEntry, now: number): void {
  const cutoff = now - WINDOW_MS;
  while (entry.timestamps.length > 0 && entry.timestamps[0] < cutoff) {
    entry.timestamps.shift();
  }
}

function check(
  buckets: Map<string, RateLimitEntry>,
  key: string,
  limit: number,
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    buckets.set(key, entry);
  }
  cleanup(entry, now);

  if (entry.timestamps.length >= limit) {
    const resetMs = entry.timestamps[0] + WINDOW_MS - now;
    return { allowed: false, remaining: 0, resetMs };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: limit - entry.timestamps.length, resetMs: WINDOW_MS };
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  limitedBy: "api_key" | "ip" | null;
}

export function rateLimit(apiKey: string, ip: string): RateLimitResult {
  const keyResult = check(apiKeyBuckets, apiKey, API_KEY_LIMIT);
  if (!keyResult.allowed) {
    return { ...keyResult, limitedBy: "api_key" };
  }

  const ipResult = check(ipBuckets, ip, IP_LIMIT);
  if (!ipResult.allowed) {
    return { ...ipResult, limitedBy: "ip" };
  }

  return {
    allowed: true,
    remaining: Math.min(keyResult.remaining, ipResult.remaining),
    resetMs: WINDOW_MS,
    limitedBy: null,
  };
}
