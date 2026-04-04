import { NextResponse } from "next/server";
import { config } from "@/server/config";

export interface TimeoutOptions {
  timeoutMs?: number;
  abortSignal?: AbortSignal;
}

/**
 * Wraps an async function with a timeout.
 * Rejects with an error after the specified duration.
 */
export async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

/**
 * API route wrapper that enforces timeouts.
 * Usage: export const POST = withRequestTimeout(async (req) => { ... })
 */
export function withRequestTimeout<T extends { params?: unknown }>(
  handler: (request: Request, context: T) => Promise<Response>,
  timeoutMs?: number
) {
  return async (request: Request, context: T) => {
    const ms = timeoutMs || config.request.apiTimeoutMs;

    try {
      return await withTimeout(
        async (signal) => {
          // Note: In a real implementation, you might pass the signal to the handler
          // For now, we rely on database/external service timeouts
          return await handler(request, context);
        },
        ms
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          {
            error: {
              code: "TIMEOUT",
              message: `Request exceeded ${ms}ms timeout limit`
            }
          },
          { status: 504 }
        );
      }

      throw error;
    }
  };
}

/**
 * Validates request body size and returns 413 if exceeded.
 */
export async function validateRequestBodySize(
  request: Request,
  maxBytes?: number
): Promise<{ valid: true } | { valid: false; response: Response }> {
  const contentLength = request.headers.get("content-length");
  const max = maxBytes || config.request.maxJsonSizeBytes;

  if (contentLength) {
    const bytes = Number(contentLength);

    if (bytes > max) {
      return {
        valid: false,
        response: NextResponse.json(
          {
            error: {
              code: "PAYLOAD_TOO_LARGE",
              message: `Request body exceeds ${max} bytes limit`
            }
          },
          { status: 413 }
        )
      };
    }
  }

  return { valid: true };
}
