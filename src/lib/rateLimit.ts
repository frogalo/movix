// In-memory sliding window rate limiter for API requests
// Designed for edge/Node.js Next.js runtime

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Cleanup stale rate limit records periodically
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute

function cleanupExpiredRecords(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, record] of rateLimitMap.entries()) {
    if (now >= record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

export interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds (default: 60s)
  guestMax?: number; // Max requests for guests per window (default: 45)
  authMax?: number; // Max requests for authenticated users per window (default: 180)
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
}

export function checkRateLimit(
  identifier: string,
  isAuthenticated: boolean = false,
  options: RateLimitOptions = {}
): RateLimitResult {
  const now = Date.now();
  cleanupExpiredRecords(now);

  const windowMs = options.windowMs ?? 60 * 1000; // 1 minute window
  const maxRequests = isAuthenticated
    ? (options.authMax ?? 180)
    : (options.guestMax ?? 45);

  const key = `${isAuthenticated ? "auth" : "guest"}:${identifier}`;
  const existing = rateLimitMap.get(key);

  if (!existing || now >= existing.resetTime) {
    // New window
    const resetTime = now + windowMs;
    rateLimitMap.set(key, {
      count: 1,
      resetTime,
    });

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: Math.ceil(resetTime / 1000),
    };
  }

  // Increment within existing window
  existing.count += 1;

  const isAllowed = existing.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - existing.count);

  return {
    success: isAllowed,
    limit: maxRequests,
    remaining,
    reset: Math.ceil(existing.resetTime / 1000),
  };
}

/**
 * Helper to extract client IP from Next.js / Proxy headers
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // First IP in list is the client IP
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  return "127.0.0.1";
}
