"use client";

import { useEffect, useMemo, useState } from "react";
import { SecondaryButton } from "@/components/buttons";
import { getStoredWorkspaceSessionToken, setStoredWorkspaceSessionToken } from "@/lib/workspace-session-client";
import type { Mode } from "@/server/types";
import { CheckCircle2, Clock3, FileClock, Inbox, RefreshCw, Sparkles, XCircle } from "lucide-react";

const GENERATION_HISTORY_KEY = "templify-generation-history";

type ActivityFilter = "all" | "in_progress" | "success" | "failed";

interface SessionJob {
  id: string;
  createdAt?: string;
  status: string;
  result?: {
    outputs?: Array<{ format: string; downloadUrl: string }>;
  };
  error?: string;
}

interface GenerationHistoryItem {
  id: string;
  label: string;
  mode: Mode;
  createdAt: string;
  outputs: Record<string, string>;
}

interface Props {
  initialSessionToken?: string;
}

function formatTimestamp(value?: string) {
  if (!value) return "Time unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function WorkspaceActivity({ initialSessionToken }: Props) {
  const [sessionToken, setSessionToken] = useState<string>(() => initialSessionToken || getStoredWorkspaceSessionToken());
  const [loading, setLoading] = useState<boolean>(false);
  const [jobs, setJobs] = useState<SessionJob[]>([]);
  const [accountJobs, setAccountJobs] = useState<SessionJob[]>([]);
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [errorMessage, setErrorMessage] = useState<string>("");

  function simplifyStatus(status: string): Exclude<ActivityFilter, "all"> {
    if (status === "completed") {
      return "success";
    }

    if (status === "failed" || status === "not_found") {
      return "failed";
    }

    return "in_progress";
  }

  const mergedJobs = useMemo(() => {
    const merged = new Map<string, SessionJob>();

    for (const item of accountJobs) {
      merged.set(item.id, item);
    }

    for (const item of jobs) {
      const existing = merged.get(item.id);
      if (!existing) {
        merged.set(item.id, item);
        continue;
      }

      merged.set(item.id, {
        ...existing,
        ...item,
        createdAt: item.createdAt || existing.createdAt
      });
    }

    return Array.from(merged.values()).sort((left, right) => {
      const leftAt = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightAt = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightAt - leftAt;
    });
  }, [accountJobs, jobs]);

  const filteredJobs = useMemo(() => {
    if (filter === "all") return mergedJobs;
    return mergedJobs.filter((job) => simplifyStatus(job.status) === filter);
  }, [mergedJobs, filter]);

  useEffect(() => {
    try {
      const storedHistory = window.localStorage.getItem(GENERATION_HISTORY_KEY);
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch {
      setHistory([]);
    }

    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("s") || "";
    if (tokenFromUrl && !initialSessionToken) {
      setSessionToken(tokenFromUrl);
      return;
    }

    if (!tokenFromUrl && !initialSessionToken) {
      setSessionToken(getStoredWorkspaceSessionToken());
    }
  }, [initialSessionToken]);

  useEffect(() => {
    if (!sessionToken) {
      return;
    }

    setStoredWorkspaceSessionToken(sessionToken);
  }, [sessionToken]);

  async function loadJobs(token: string) {
    if (!token.trim()) {
      setJobs([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/sessions/${encodeURIComponent(token)}/jobs?limit=50`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message || "Unable to load session jobs");
      }

      setJobs(payload.jobs || []);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load session jobs");
    } finally {
      setLoading(false);
    }
  }

  async function loadAccountJobs() {
    try {
      const response = await fetch("/api/v1/account/jobs?limit=100");
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setAccountJobs([]);
        return;
      }

      setAccountJobs(Array.isArray(payload.jobs) ? payload.jobs : []);
    } catch {
      setAccountJobs([]);
    }
  }

  useEffect(() => {
    void loadAccountJobs();

    if (sessionToken) {
      void loadJobs(sessionToken);
    }
  }, [sessionToken]);

  return (
    <section className="page-shell py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium uppercase tracking-[0.18em] text-[#2563eb]">Activity</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Batch status updates</h2>
          <div className="mt-1 text-sm text-slate-600">Use this page for simple request status. Download completed files from My Files.</div>
        </div>
        <a href={`/workspace${sessionToken ? `?s=${encodeURIComponent(sessionToken)}` : ""}`}>
          <SecondaryButton className="px-4 py-2 text-xs">Back to create</SecondaryButton>
        </a>
      </div>

      <div className="mb-5 rounded-2xl border border-[#d6ead8] bg-[#f4fff5] px-4 py-3 text-sm text-[#166534]">
        Completed items are saved in My Files. This view only shows whether requests are in progress, successful, or failed.
      </div>

      <div className="mb-5 glass-panel p-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">Shared workspace link</label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={sessionToken}
            onChange={(event) => setSessionToken(event.target.value)}
            className="min-w-[280px] flex-1 rounded-2xl border border-[#dbe4f0] bg-white/85 px-4 py-3 text-sm outline-none"
            placeholder="Paste a shared workspace code if you want to view another workspace"
          />
          <SecondaryButton
            className="px-4 py-3 text-xs"
            onClick={() => {
              void loadJobs(sessionToken);
              void loadAccountJobs();
            }}
          >
            <RefreshCw size={14} className="mr-2" />
            Refresh jobs
          </SecondaryButton>
        </div>
        <div className="mt-2 text-xs text-slate-500">Signed-in users see account-wide activity. Paste a shared code only when viewing another workspace session.</div>
        {errorMessage && <div className="mt-3 text-sm text-[#be123c]">{errorMessage}</div>}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileClock size={16} /> Activity feed
            </div>
            <div className="inline-flex rounded-full border border-[#dbe4f0] bg-[#f8fafc] p-1">
              {(["all", "in_progress", "success", "failed"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    filter === item ? "bg-white text-slate-900 shadow" : "text-slate-600"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-[#dbe4f0] px-4 py-6 text-sm text-slate-500">
                Loading shared jobs...
              </div>
            ) : filteredJobs.length ? (
              filteredJobs.map((job) => {
                const simplifiedStatus = simplifyStatus(job.status);
                const statusStyles =
                  simplifiedStatus === "success"
                    ? {
                        label: "Success",
                        classes: "border-[#d6ead8] bg-[#f4fff5] text-[#166534]",
                        icon: CheckCircle2
                      }
                    : simplifiedStatus === "failed"
                      ? {
                          label: "Failed",
                          classes: "border-[#fecdd3] bg-[#fff1f2] text-[#be123c]",
                          icon: XCircle
                        }
                      : {
                          label: "In progress",
                          classes: "border-[#dbeafe] bg-[#eff6ff] text-[#2563eb]",
                          icon: Clock3
                        };
                const StatusIcon = statusStyles.icon;

                return (
                  <div key={job.id} className="rounded-2xl border border-[#dbe4f0] bg-[#f8fafc] px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-slate-900">Job {job.id}</div>
                        <div className="mt-1 text-xs text-slate-500">{formatTimestamp(job.createdAt)}</div>
                      </div>
                      <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusStyles.classes}`}>
                        <StatusIcon size={12} />
                        {statusStyles.label}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-[#dbe4f0] bg-[#f8fafc] px-4 py-8 text-center text-sm text-slate-500">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dbeafe] text-[#2563eb]">
                  <Inbox size={20} />
                </div>
                <div className="mt-3 text-sm font-medium text-slate-800">No matching jobs yet</div>
                <div className="mt-1 text-xs text-slate-500">
                  Run a generation from the template or custom editor, then refresh this page.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel p-5">
          <div className="text-sm font-semibold text-slate-900">Recent generations</div>
          <div className="mt-1 text-xs text-slate-500">Stored locally in your browser so you can quickly reopen valid links.</div>
          <div className="mt-4 space-y-3">
            {history.length ? (
              history.map((item) => (
                <div key={item.id} className="rounded-2xl border border-[#dbe4f0] bg-[#f8fafc] px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{item.label}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatTimestamp(item.createdAt)}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(item.outputs).map(([format, url]) => (
                        <a key={format} href={url} target="_blank" rel="noreferrer">
                          <SecondaryButton className="px-3 py-2 text-xs">{format.toUpperCase()}</SecondaryButton>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#dbe4f0] bg-[#f8fafc] px-4 py-8 text-center text-sm text-slate-500">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dbeafe] text-[#2563eb]">
                  <Sparkles size={20} />
                </div>
                <div className="mt-3 text-sm font-medium text-slate-800">No recent generations</div>
                <div className="mt-1 text-xs text-slate-500">
                  Generate a document from Workspace or Custom and links will appear here.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
