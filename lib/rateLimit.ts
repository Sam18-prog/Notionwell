/**
 * Public Demo Safeguards: In-Memory Sliding Window Rate Limiter & Input Limits
 */

const MAX_GENERATIONS_PER_HOUR = 5;
const ONE_HOUR_MS = 60 * 60 * 1000;

// Hard input limit on extracted document text (~15-20 pages)
export const MAX_DOCUMENT_CHARS = 20000;

// In-memory store for client IP/session generation timestamps
const rateLimitMap = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMinutes: number;
}

export function checkGenerationRateLimit(clientId: string): RateLimitResult {
  const now = Date.now();
  const rawTimestamps = rateLimitMap.get(clientId) || [];

  // Filter timestamps within rolling 1-hour window
  const validTimestamps = rawTimestamps.filter((t) => now - t < ONE_HOUR_MS);

  if (validTimestamps.length >= MAX_GENERATIONS_PER_HOUR) {
    const oldest = validTimestamps[0];
    const resetMinutes = Math.max(1, Math.ceil((ONE_HOUR_MS - (now - oldest)) / 60000));
    return {
      allowed: false,
      remaining: 0,
      resetMinutes,
    };
  }

  validTimestamps.push(now);
  rateLimitMap.set(clientId, validTimestamps);

  return {
    allowed: true,
    remaining: MAX_GENERATIONS_PER_HOUR - validTimestamps.length,
    resetMinutes: 0,
  };
}
