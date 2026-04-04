import type { WorkspaceSession, WorkspaceSessionState } from "@/server/types";

const ACTIVE_SESSION_TOKEN_KEY = "templify-active-session-token";

export function getStoredWorkspaceSessionToken() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(ACTIVE_SESSION_TOKEN_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

export function setStoredWorkspaceSessionToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (token.trim()) {
      window.localStorage.setItem(ACTIVE_SESSION_TOKEN_KEY, token.trim());
    } else {
      window.localStorage.removeItem(ACTIVE_SESSION_TOKEN_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

export async function ensureWorkspaceSession(options?: {
  token?: string | null;
  initialState?: WorkspaceSessionState;
}) {
  const candidateToken = options?.token?.trim() || getStoredWorkspaceSessionToken();

  if (candidateToken) {
    try {
      const response = await fetch("/api/v1/session", {
        headers: {
          "x-workspace-session": candidateToken
        }
      });
      const payload = await response.json();

      if (response.ok && payload.session) {
        setStoredWorkspaceSessionToken(candidateToken);
        return {
          token: candidateToken,
          session: payload.session as WorkspaceSession,
          created: false
        };
      }

      // Backward-compatible fallback for older deployments.
      const legacyResponse = await fetch(`/api/v1/sessions/${encodeURIComponent(candidateToken)}`);
      const legacyPayload = await legacyResponse.json();

      if (legacyResponse.ok && legacyPayload.session) {
        setStoredWorkspaceSessionToken(candidateToken);
        return {
          token: candidateToken,
          session: legacyPayload.session as WorkspaceSession,
          created: false
        };
      }
    } catch {
      // Fall through and create a fresh session.
    }
  }

  setStoredWorkspaceSessionToken("");

  const response = await fetch("/api/v1/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(
      options?.initialState
        ? {
            initialState: options.initialState
          }
        : {}
    )
  });
  const payload = await response.json();

  if (!response.ok || !payload.token || !payload.session) {
    throw new Error(payload.error?.message || "Unable to create workspace session");
  }

  const token = payload.token as string;
  setStoredWorkspaceSessionToken(token);

  return {
    token,
    session: payload.session as WorkspaceSession,
    created: true
  };
}