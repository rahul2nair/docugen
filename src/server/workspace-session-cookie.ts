import { NextResponse } from "next/server";
import { config } from "@/server/config";

export const WORKSPACE_SESSION_COOKIE_NAME = "templify_ws_session";

function parseCookieHeader(rawCookieHeader: string | null) {
  if (!rawCookieHeader) {
    return new Map<string, string>();
  }

  const entries = rawCookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex < 0) {
        return [part, ""] as const;
      }

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      return [key, decodeURIComponent(value)] as const;
    });

  return new Map(entries);
}

export function readWorkspaceSessionTokenFromRequest(
  request: Request,
  options?: { allowQueryParam?: boolean }
) {
  const fromHeader = request.headers.get("x-workspace-session")?.trim();
  if (fromHeader) {
    return fromHeader;
  }

  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const fromCookie = cookies.get(WORKSPACE_SESSION_COOKIE_NAME)?.trim();
  if (fromCookie) {
    return fromCookie;
  }

  if (options?.allowQueryParam) {
    const fromQuery = new URL(request.url).searchParams.get("sessionToken")?.trim();
    if (fromQuery) {
      return fromQuery;
    }
  }

  return "";
}

export function applyWorkspaceSessionCookie(response: NextResponse, token: string) {
  if (!token.trim()) {
    return;
  }

  const ttlSeconds = Math.max(60, Math.floor(config.sessionTtlHours * 60 * 60));

  response.cookies.set({
    name: WORKSPACE_SESSION_COOKIE_NAME,
    value: token.trim(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ttlSeconds
  });
}
