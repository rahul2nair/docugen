"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiKeySettings } from "@/components/api-key-settings";
import {
  ensureWorkspaceSession,
  getStoredWorkspaceSessionToken,
  setStoredWorkspaceSessionToken
} from "@/lib/workspace-session-client";

export function ApiConsole() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("s")?.trim() || "";
  const [sessionToken, setSessionToken] = useState<string>(() => tokenFromUrl || getStoredWorkspaceSessionToken());
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    if (tokenFromUrl) {
      setSessionToken(tokenFromUrl);
      return;
    }

    setSessionToken(getStoredWorkspaceSessionToken());
  }, [tokenFromUrl]);

  useEffect(() => {
    if (!sessionToken) {
      return;
    }

    setStoredWorkspaceSessionToken(sessionToken);
  }, [sessionToken]);

  useEffect(() => {
    let cancelled = false;

    async function ensureSession() {
      try {
        const resolved = await ensureWorkspaceSession({ token: sessionToken || undefined });

        if (cancelled) {
          return;
        }

        setSessionToken(resolved.token);
        setSessionReady(true);
        setSessionError("");

        if (tokenFromUrl !== resolved.token) {
          router.replace(`/api-docs?s=${encodeURIComponent(resolved.token)}`);
        }
      } catch (error) {
        if (!cancelled) {
          setSessionReady(false);
          setSessionError(error instanceof Error ? error.message : "Unable to prepare workspace session");
        }
      }
    }

    setSessionReady(false);
    void ensureSession();

    return () => {
      cancelled = true;
    };
  }, [router, sessionToken, tokenFromUrl]);

  return <ApiKeySettings sessionToken={sessionToken} sessionReady={sessionReady} sessionError={sessionError} />;
}