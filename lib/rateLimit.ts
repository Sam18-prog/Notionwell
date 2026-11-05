/**
 * Notionwell Production Rate Limiting & AI Usage Quota Manager
 * Enforces per-user and per-IP sliding window limits to protect against abuse,
 * API cost spikes, and shared Gemini quota exhaustion.
 */

export const MAX_DOCUMENT_CHARS = 25000; // ~20-25 pages of extracted text
export const MAX_CHAT_PROMPT_CHARS = 4000;

interface UsageBucket {
  timestamps: number[];
}

// In-memory sliding window stores (Key: `${userId}:${featureType}`)
const userRateLimitMap = new Map<string, UsageBucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMinutes: number;
  limit: number;
}

export type FeatureRateType = 'study_generation' | 'rag_chat' | 'exam_generation' | 'viva_turn' | 'document_index';

const FEATURE_LIMITS: Record<FeatureRateType, { maxPerHour: number; windowMs: number }> = {
  study_generation: { maxPerHour: 15, windowMs: 60 * 60 * 1000 },
  rag_chat: { maxPerHour: 60, windowMs: 60 * 60 * 1000 },
  exam_generation: { maxPerHour: 12, windowMs: 60 * 60 * 1000 },
  viva_turn: { maxPerHour: 80, windowMs: 60 * 60 * 1000 },
  document_index: { maxPerHour: 20, windowMs: 60 * 60 * 1000 },
};

/**
 * Checks and records rate limit for a user or client IP.
 */
export function checkRateLimit(
  identifier: string,
  feature: FeatureRateType = 'study_generation'
): RateLimitResult {
  const config = FEATURE_LIMITS[feature] || FEATURE_LIMITS.study_generation;
  const key = `${identifier}:${feature}`;
  const now = Date.now();

  const bucket = userRateLimitMap.get(key) || { timestamps: [] };

  // Filter timestamps within rolling window
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < config.windowMs);

  if (bucket.timestamps.length >= config.maxPerHour) {
    const oldest = bucket.timestamps[0];
    const resetMinutes = Math.max(1, Math.ceil((config.windowMs - (now - oldest)) / 60000));
    return {
      allowed: false,
      remaining: 0,
      resetMinutes,
      limit: config.maxPerHour,
    };
  }

  bucket.timestamps.push(now);
  userRateLimitMap.set(key, bucket);

  return {
    allowed: true,
    remaining: config.maxPerHour - bucket.timestamps.length,
    resetMinutes: 0,
    limit: config.maxPerHour,
  };
}

/**
 * Backward compatibility alias for generation
 */
export function checkGenerationRateLimit(clientId: string): RateLimitResult {
  return checkRateLimit(clientId, 'study_generation');
}

/**
 * Production Exponential Backoff Retry Wrapper for Gemini AI Calls
 * Handles transient 429 (Resource Exhausted) or 503 (Overloaded) with jittered backoff.
 */
export async function withAiRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; initialDelayMs?: number; maxDelayMs?: number } = {}
): Promise<T> {
  const { retries = 3, initialDelayMs = 800, maxDelayMs = 5000 } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const isTransient =
        err?.status === 429 ||
        err?.status === 503 ||
        err?.message?.includes('429') ||
        err?.message?.includes('503') ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('overloaded');

      if (!isTransient || attempt >= retries) {
        throw err;
      }

      // Add jitter: ±25%
      const jitter = delay * (0.75 + Math.random() * 0.5);
      console.warn(`[AI Retry]: Transient AI error (attempt ${attempt}/${retries}). Backing off for ${Math.round(jitter)}ms...`);
      await new Promise((res) => setTimeout(res, jitter));
      delay = Math.min(delay * 2, maxDelayMs);
    }
  }
}
