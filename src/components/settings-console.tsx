"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiKeySettings } from "@/components/api-key-settings";
import { SmtpSettings } from "@/components/smtp-settings";
import {
  ensureWorkspaceSession,
  getStoredWorkspaceSessionToken,
  setStoredWorkspaceSessionToken
} from "@/lib/workspace-session-client";

export function SettingsConsole() {
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
          router.replace(`/settings?s=${encodeURIComponent(resolved.token)}`);
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

  return (
    <>
      <section className="page-shell pt-8">
        <div className="glass-panel p-8">
          <div className="text-sm font-medium uppercase tracking-[0.18em] text-[#2563eb]">Settings</div>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Delivery and integrations</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Most users can ignore this area until they want to send documents directly from Templify
            or connect the product to another system. These settings are optional and do not affect
            normal document creation.
          </p>
        </div>
      </section>
      <SmtpSettings sessionToken={sessionToken} sessionReady={sessionReady} />
      <ApiKeySettings
        sessionToken={sessionToken}
        sessionReady={sessionReady}
        sessionError={sessionError}
      />
    </>
  );
}