import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { config } from "@/server/config";
import { connection } from "@/server/queue";

export interface RateLimitRule {
  bucket: string;
  identifiers: Array<string | null | undefined>;
  limit: number;
  windowSeconds: number;
  cost?: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  bucket: string;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAfterSeconds: number;
  total: number;
}

function hashIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function buildRateLimitKey(bucket: string, identifiers: Array<string | null | undefined>) {
  const normalized = identifiers
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join("|");

  return `${config.redisKeyPrefix}:ratelimit:${bucket}:${hashIdentifier(normalized || "anonymous")}`;
}

export async function consumeRateLimit(rule: RateLimitRule): Promise<RateLimitDecision> {
  const limit = Math.max(1, Math.floor(rule.limit));
  const windowSeconds = Math.max(1, Math.floor(rule.windowSeconds));
  const cost = Math.max(1, Math.floor(rule.cost || 1));
  const key = buildRateLimitKey(rule.bucket, rule.identifiers);

  const result = await connection.multi().incrby(key, cost).ttl(key).exec();
  const count = Number(result?.[0]?.[1] || cost);
  let ttl = Number(result?.[1]?.[1] || -1);

  if (count === cost || ttl < 0) {
    await connection.expire(key, windowSeconds);
    ttl = windowSeconds;
  }

  return {
    allowed: count <= limit,
    bucket: rule.bucket,
    limit,
    remaining: Math.max(limit - count, 0),
    retryAfterSeconds: count <= limit ? 0 : Math.max(ttl, 1),
    resetAfterSeconds: Math.max(ttl, 1),
    total: count
  };
}

export async function enforceRateLimits(rules: RateLimitRule[]) {
  for (const rule of rules) {
    const decision = await consumeRateLimit(rule);
    if (!decision.allowed) {
      return decision;
    }
  }

  return null;
}

export function rateLimitExceededResponse(decision: RateLimitDecision, message: string) {
  return NextResponse.json(
    {
      error: {
        code: "RATE_LIMITED",
        message
      }
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(decision.retryAfterSeconds),
        "X-RateLimit-Limit": String(decision.limit),
        "X-RateLimit-Remaining": String(decision.remaining),
        "X-RateLimit-Reset": String(decision.resetAfterSeconds)
      }
    }
  );
}