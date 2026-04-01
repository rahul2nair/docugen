"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MetallicButton } from "@/components/buttons";
import { PreviewPanel } from "@/components/preview-panel";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  loadPersistedProfile,
  savePersistedProfile,
  type PersistedProfile
} from "@/lib/persisted-user-data-client";
import { ensureWorkspaceSession, getStoredWorkspaceSessionToken, setStoredWorkspaceSessionToken } from "@/lib/workspace-session-client";
import type { DocumentBranding } from "@/server/types";
import { Download, Sparkles } from "lucide-react";

type CompanyProfile = PersistedProfile;

const defaultProfile: CompanyProfile = {
  companyName: "Acme Labs",
  contactEmail: "ops@acmelabs.example",
  signerName: "Asha Menon",
  signerTitle: "Hiring Manager",
  primaryColor: "#2563eb",
  accentColor: "#dbeafe",
  footerText: "Generated with Templify. Verify commercial and legal details before issuing.",
  logoUrl: ""
};

type JobStatus = "idle" | "queued" | "processing" | "completed" | "failed";

interface Props {
  initialSessionToken?: string;
}

function buildBranding(profile: CompanyProfile): DocumentBranding {
  return {
    companyName: profile.companyName,
    contactEmail: profile.contactEmail,
    signerName: profile.signerName,
    signerTitle: profile.signerTitle,
    primaryColor: profile.primaryColor,
    accentColor: profile.accentColor,
    footerText: profile.footerText,
    logoUrl: profile.logoUrl || undefined
  };
}

function htmlToPlainText(html: string) {
  if (typeof window === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  const container = document.createElement("div");
  container.innerHTML = html;
  return (container.textContent || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeEditorHtml(html: string) {
  const trimmed = html.trim();

  if (!trimmed || trimmed === "<p></p>" || trimmed === "<p><br></p>") {
    return "";
  }

  return trimmed;
}

export function CustomWorkspace({ initialSessionToken }: Props) {
  const router = useRouter();
  const profilePersistenceReadyRef = useRef(false);
  const [documentTitle, setDocumentTitle] = useState("Drafted Document");
  const [contentHtml, setContentHtml] = useState("");
  const [outputFormat, setOutputFormat] = useState<"html" | "pdf">("pdf");
  const [pdfFormat, setPdfFormat] = useState<"A4" | "Letter">("A4");
  const [pdfMargin, setPdfMargin] = useState<"normal" | "narrow">("normal");
  const [profile, setProfile] = useState<CompanyProfile>(defaultProfile);
  const [status, setStatus] = useState<JobStatus>("idle");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [downloadLinks, setDownloadLinks] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [sessionToken, setSessionToken] = useState<string>(() => initialSessionToken || getStoredWorkspaceSessionToken());

  useEffect(() => {
    let cancelled = false;

    async function hydrateProfile() {
      const nextProfile = await loadPersistedProfile(sessionToken || "", defaultProfile);

      if (cancelled) {
        return;
      }

      setProfile(nextProfile);
      profilePersistenceReadyRef.current = true;
    }

    void hydrateProfile();

    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  useEffect(() => {
    if (!profilePersistenceReadyRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void savePersistedProfile(sessionToken || "", profile);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [profile, sessionToken]);

  useEffect(() => {
    setSessionToken(initialSessionToken || getStoredWorkspaceSessionToken());
  }, [initialSessionToken]);

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
        const resolved = await ensureWorkspaceSession({ token: sessionToken });

        if (cancelled) {
          return;
        }

        setSessionToken(resolved.token);
        setErrorMessage("");
        router.replace(`/workspace/custom?s=${encodeURIComponent(resolved.token)}`);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to create workspace session");
        }
      }
    }

    void ensureSession();

    return () => {
      cancelled = true;
    };
  }, [router, sessionToken]);

  async function poll(jobId: string) {
    let tries = 0;

    while (tries < 40) {
      tries += 1;
      const res = await fetch(`/api/v1/generations/${jobId}`);
      const payload = await res.json();

      if (payload.status === "completed") {
        setStatus("completed");
        const nextLinks = Object.fromEntries(
          (payload.result?.outputs || []).map((item: any) => [item.format, item.downloadUrl])
        );
        setDownloadLinks(nextLinks);

        const htmlOutput = (payload.result?.outputs || []).find((item: any) => item.format === "html");
        if (htmlOutput?.downloadUrl) {
          const htmlRes = await fetch(htmlOutput.downloadUrl);
          setPreviewHtml(await htmlRes.text());
        }
        return;
      }

      if (payload.status === "failed") {
        setStatus("failed");
        setErrorMessage(payload.error?.message || "Generation failed");
        return;
      }

      setStatus(payload.status === "queued" ? "queued" : "processing");
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    setStatus("failed");
    setErrorMessage("Generation timed out");
  }

  async function handleGenerate() {
    const normalizedHtml = normalizeEditorHtml(contentHtml);
    const plainText = htmlToPlainText(normalizedHtml);

    if (!plainText) {
      setErrorMessage("Please enter some document content.");
      return;
    }

    setStatus("queued");
    setErrorMessage("");
    setDownloadLinks({});

    const body = {
      mode: "draft_to_document",
      source: { type: "html", content: normalizedHtml },
      outputs: Array.from(new Set(["html", outputFormat])),
      session: sessionToken
        ? {
            token: sessionToken,
            revision: 0
          }
        : undefined,
      options: {
        documentType: documentTitle.trim() || "Drafted Document",
        branding: buildBranding(profile),
        pdf: {
          format: pdfFormat,
          margin: pdfMargin
        }
      }
    };

    const response = await fetch("/api/v1/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatus("failed");
      setErrorMessage(payload.error?.message || "Unable to queue generation");
      return;
    }

    await poll(payload.jobId);
  }

  const isGenerating = status === "queued" || status === "processing";

  return (
    <section id="custom-workspace" className="page-shell py-10">
      <div className="mb-6">
        <div className="text-sm font-medium uppercase tracking-[0.18em] text-[#2563eb]">Draft From Notes</div>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          Turn rough notes into a polished document.
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Paste a draft, policy outline, or freeform content. Templify applies structure and branding so you can turn notes into something ready to send.
        </p>
        {sessionToken && (
          <p className="mt-2 text-xs text-slate-500">
            This page is linked to your current workspace session so generated jobs appear in Activity.
          </p>
        )}
      </div>

      {errorMessage && (
        <div className="mb-5 rounded-xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm text-[#be123c]">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left column: editor + settings */}
        <div className="flex flex-col gap-5">
          {/* Editor */}
          <div className="glass-panel p-5">
            <div className="text-sm font-semibold text-slate-900">Document content</div>
            <div className="mt-1 text-xs text-slate-500">Write with basic formatting, then generate a polished document from the draft.</div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">Document title</label>
              <input
                value={documentTitle}
                onChange={(event) => setDocumentTitle(event.target.value)}
                className="w-full rounded-2xl border border-[#dbe4f0] bg-white/85 px-4 py-3 text-sm outline-none"
                placeholder="e.g. Hiring policy draft, service summary, internal memo"
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">Content</label>
              <RichTextEditor
                value={contentHtml}
                onChange={setContentHtml}
                placeholder="Paste your notes or first draft here. Use headings, bullets, and emphasis if the source already has structure."
              />
              <div className="mt-2 text-xs text-slate-500">This editor supports headings, bold, italic, quotes, and lists. Generated documents preserve that structure.</div>
            </div>
          </div>

          {/* Branding */}
          <div className="glass-panel p-5">
            <div className="text-sm font-semibold text-slate-900">Company profile</div>
            <div className="mt-1 text-xs text-slate-500">Applied to headers, footers, and document styling.</div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Company name</label>
                <input
                  value={profile.companyName}
                  onChange={(event) => setProfile((current) => ({ ...current, companyName: event.target.value }))}
                  className="w-full rounded-2xl border border-[#dbe4f0] bg-white/85 px-4 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Contact email</label>
                <input
                  value={profile.contactEmail}
                  onChange={(event) => setProfile((current) => ({ ...current, contactEmail: event.target.value }))}
                  className="w-full rounded-2xl border border-[#dbe4f0] bg-white/85 px-4 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Signer name</label>
                <input
                  value={profile.signerName}
                  onChange={(event) => setProfile((current) => ({ ...current, signerName: event.target.value }))}
                  className="w-full rounded-2xl border border-[#dbe4f0] bg-white/85 px-4 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Signer title</label>
                <input
                  value={profile.signerTitle}
                  onChange={(event) => setProfile((current) => ({ ...current, signerTitle: event.target.value }))}
                  className="w-full rounded-2xl border border-[#dbe4f0] bg-white/85 px-4 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Primary color</label>
                <input
                  value={profile.primaryColor}
                  onChange={(event) => setProfile((current) => ({ ...current, primaryColor: event.target.value }))}
                  className="w-full rounded-2xl border border-[#dbe4f0] bg-white/85 px-4 py-3 text-sm outline-none"
                  placeholder="#2563eb"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Accent color</label>
                <input
                  value={profile.accentColor}
                  onChange={(event) => setProfile((current) => ({ ...current, accentColor: event.target.value }))}
                  className="w-full rounded-2xl border border-[#dbe4f0] bg-white/85 px-4 py-3 text-sm outline-none"
                  placeholder="#dbeafe"
                />
              </div>
            </div>

            <div className="mt-3 grid gap-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Logo URL</label>
                <input
                  value={profile.logoUrl}
                  onChange={(event) => setProfile((current) => ({ ...current, logoUrl: event.target.value }))}
                  className="w-full rounded-2xl border border-[#dbe4f0] bg-white/85 px-4 py-3 text-sm outline-none"
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Footer note</label>
                <textarea
                  value={profile.footerText}
                  onChange={(event) => setProfile((current) => ({ ...current, footerText: event.target.value }))}
                  className="min-h-[80px] w-full rounded-2xl border border-[#dbe4f0] bg-white/85 px-4 py-3 text-sm outline-none"
                />
              </div>
            </div>
          </div>

          {/* Generate */}
          <div className="glass-panel p-5">
            <div className="text-sm font-semibold text-slate-900">Export</div>

            <div className="mt-4 flex gap-2">
              {(["pdf", "html"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setOutputFormat(fmt)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    outputFormat === fmt
                      ? "border-[#93c5fd] bg-[#fff6eb] text-[#2563eb]"
                      : "border-[#dbe4f0] bg-white/80 text-slate-700 hover:bg-white"
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>

            {outputFormat === "pdf" && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">PDF size</label>
                  <select
                    value={pdfFormat}
                    onChange={(event) => setPdfFormat(event.target.value as "A4" | "Letter")}
                    className="w-full rounded-2xl border border-[#dbe4f0] bg-white/85 px-4 py-3 text-sm outline-none"
                  >
                    <option value="A4">A4</option>
                    <option value="Letter">Letter</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">PDF margin</label>
                  <select
                    value={pdfMargin}
                    onChange={(event) => setPdfMargin(event.target.value as "normal" | "narrow")}
                    className="w-full rounded-2xl border border-[#dbe4f0] bg-white/85 px-4 py-3 text-sm outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="narrow">Narrow</option>
                  </select>
                </div>
              </div>
            )}

            <div className="mt-4">
              <MetallicButton
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
              >
                <Sparkles size={16} className="mr-2" />
                {isGenerating
                  ? status === "queued"
                    ? "Queued…"
                    : "Generating…"
                  : "Generate Document"}
              </MetallicButton>
            </div>

            {status === "completed" && Object.keys(downloadLinks).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(downloadLinks).map(([fmt, url]) => (
                  <a
                    key={fmt}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-2xl border border-[#cbd5e1] bg-white/80 px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-white"
                  >
                    <Download size={14} className="mr-2" />
                    Download {fmt.toUpperCase()}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: preview */}
        <PreviewPanel html={previewHtml} status={status} />
      </div>
    </section>
  );
}
