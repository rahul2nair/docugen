"use client";

import { startTransition, useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownAZ, CalendarClock, Download, FileClock, Search, Trash2 } from "lucide-react";
import type { StoredGeneratedFile } from "@/server/user-data-store";

interface Props {
  initialFiles: StoredGeneratedFile[];
}

type SortOption = "newest" | "oldest" | "expiring-soon" | "name-asc";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function MyFilesLibrary({ initialFiles }: Props) {
  const [files, setFiles] = useState<StoredGeneratedFile[]>(initialFiles);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<StoredGeneratedFile | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filteredFiles = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();

    if (!normalized) {
      return files;
    }

    return files.filter((file) => {
      const haystack = [
        file.label,
        file.templateName || "",
        file.templateId || "",
        file.availableFormats.join(" ")
      ].join(" ").toLowerCase();

      return haystack.includes(normalized);
    });
  }, [deferredQuery, files]);

  const visibleFiles = useMemo(() => {
    const sorted = [...filteredFiles];

    sorted.sort((left, right) => {
      if (sortBy === "oldest") {
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      }

      if (sortBy === "expiring-soon") {
        return new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime();
      }

      if (sortBy === "name-asc") {
        return left.label.localeCompare(right.label);
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

    return sorted;
  }, [filteredFiles, sortBy]);

  async function handleDelete(fileId: string) {
    setDeletingId(fileId);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/v1/my-files/${encodeURIComponent(fileId)}`, {
        method: "DELETE"
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "Unable to delete file.");
      }

      startTransition(() => {
        setFiles((current) => current.filter((file) => file.id !== fileId));
      });
      setConfirmingDelete((current) => (current?.id === fileId ? null : current));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete file.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="glass-panel border-slate-200 bg-[rgba(255,253,249,0.92)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[260px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by file name, template, or format"
              className="w-full rounded-2xl border border-slate-300 bg-white px-11 py-3 text-sm outline-none"
            />
          </label>
          <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
            {sortBy === "expiring-soon" ? <CalendarClock size={16} /> : <ArrowDownAZ size={16} />}
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="bg-transparent outline-none"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="expiring-soon">Expiring soon</option>
              <option value="name-asc">Name A-Z</option>
            </select>
          </label>
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
            {visibleFiles.length} {visibleFiles.length === 1 ? "file" : "files"}
          </div>
        </div>
        {errorMessage ? <div className="mt-3 text-sm text-[#be123c]">{errorMessage}</div> : null}
      </div>

      {visibleFiles.length ? (
        visibleFiles.map((file) => (
          <div key={file.id} className="glass-panel border-slate-200 bg-[rgba(255,253,249,0.92)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">{file.label}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                    Created {formatTimestamp(file.createdAt)}
                  </div>
                  <div className="rounded-full border border-slate-200 bg-[rgba(250,245,238,0.92)] px-3 py-1.5">
                    Expires {formatTimestamp(file.expiresAt)}
                  </div>
                  {file.templateName ? (
                    <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                      {file.templateName}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {file.availableFormats.map((format) => (
                  <Link
                    key={`${file.id}-${format}`}
                    href={`/api/v1/generations/${encodeURIComponent(file.jobId)}/outputs/${format}`}
                    className="inline-flex items-center justify-center rounded-2xl border border-[rgba(120,90,58,0.18)] bg-white/88 px-4 py-3 text-sm font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] transition hover:border-[rgba(120,90,58,0.26)] hover:bg-white"
                  >
                    <Download size={15} className="mr-2" /> Download {format.toUpperCase()}
                  </Link>
                ))}
                <button
                  onClick={() => setConfirmingDelete(file)}
                  disabled={deletingId === file.id}
                  className="inline-flex items-center justify-center rounded-2xl border border-[rgba(166,86,72,0.18)] bg-[rgba(255,247,245,0.92)] px-4 py-3 text-sm font-semibold text-[#8e4a40] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={15} className="mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="glass-panel border-slate-200 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(243,228,208,0.92)] text-[#2563eb]">
            <FileClock size={22} />
          </div>
          <div className="mt-4 text-lg font-semibold text-slate-900">{files.length ? "No files match this search" : "No saved files yet"}</div>
          <div className="mt-2 text-sm leading-6 text-slate-600">
            {files.length
              ? "Try a different search term or clear the search field."
              : "Generate a document while signed in and it will appear here until the retention window ends."}
          </div>
        </div>
      )}

      {confirmingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,18,11,0.42)] p-4 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md border-[rgba(166,86,72,0.18)] bg-[rgba(255,252,248,0.98)] p-6 shadow-[0_28px_90px_rgba(39,25,12,0.24)]">
            <div className="text-lg font-semibold text-slate-900">Delete this saved file?</div>
            <div className="mt-3 text-sm leading-6 text-slate-600">
              <span className="font-semibold text-slate-900">{confirmingDelete.label}</span> will be removed from My Files and its stored downloads will be deleted.
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setConfirmingDelete(null)}
                disabled={deletingId === confirmingDelete.id}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-[rgba(252,248,242,0.92)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete(confirmingDelete.id)}
                disabled={deletingId === confirmingDelete.id}
                className="inline-flex items-center justify-center rounded-2xl border border-[rgba(166,86,72,0.18)] bg-[rgba(255,247,245,0.92)] px-4 py-3 text-sm font-semibold text-[#8e4a40] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={15} className="mr-2" />
                {deletingId === confirmingDelete.id ? "Deleting..." : "Delete file"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}