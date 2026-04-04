"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MetallicButton, SecondaryButton } from "@/components/buttons";
import { PreviewPanel } from "@/components/preview-panel";
import {
  loadPersistedProfile,
  loadPersistedTemplates,
  readLocalTemplates,
  savePersistedProfile,
  type PersistedProfile
} from "@/lib/persisted-user-data-client";
import {
  ensureWorkspaceSession,
  getStoredWorkspaceSessionToken,
  setStoredWorkspaceSessionToken
} from "@/lib/workspace-session-client";
import type { BuiltinTemplate, BuiltinTemplatePreview, TemplateClause } from "@/server/templates";
import type {
  ClauseSelection,
  CustomClause,
  DocumentBranding,
  Mode,
  OutputFormat,
  WorkspaceSessionState,
  WorkspaceSnapshot
} from "@/server/types";
import {
  ChevronDown,
  Clock3,
  Copy,
  Download,
  FilePlus2,
  FileWarning,
  History,
  RefreshCw,
  Save,
  Sparkles
} from "lucide-react";

interface Props {
  templates: BuiltinTemplate[];
  templatePreviews: BuiltinTemplatePreview[];
  initialSessionToken?: string;
  hasPaidAccess?: boolean;
}

type JobStatus = "idle" | "queued" | "processing" | "completed" | "failed";

type CompanyProfile = PersistedProfile;

interface GenerationHistoryItem {
  id: string;
  label: string;
  mode: Mode;
  createdAt: string;
  outputs: Record<string, string>;
}

const GENERATION_HISTORY_KEY = "templify-generation-history";
const EDITOR_ID_KEY = "templify-editor-id";

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

interface CustomClauseDraft extends CustomClause {
  id: string;
}

interface SessionSummary {
  id: string;
  revision: number;
  expiresAt: string;
  state: WorkspaceSessionState;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function templateDefaultsFromProfile(profile: CompanyProfile) {
  return {
    company_name:  profile.companyName,
    contact_email: profile.contactEmail,
    manager_name:  profile.signerName,
    sender_name:   profile.signerName,
    signer_name:   profile.signerName
  };
}

function makeClauseSelections(clauses: TemplateClause[] = []): ClauseSelection[] {
  return clauses.map((clause) => ({
    id: clause.id,
    enabled: Boolean(clause.defaultEnabled),
    content: clause.content
  }));
}

function getEditorId() {
  const existing = window.localStorage.getItem(EDITOR_ID_KEY);
  if (existing) {
    return existing;
  }

  const next = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(EDITOR_ID_KEY, next);
  return next;
}

function getFieldPriorityScore(field: BuiltinTemplate["fields"][number]) {
  const value = `${field.key} ${field.label}`.toLowerCase();

  if (/(name|title|subject|company|client|customer|job|role)/.test(value)) {
    return 4;
  }

  if (/(date|start|end|deadline|due)/.test(value)) {
    return 3;
  }

  if (/(amount|salary|price|rate|fee|total|budget)/.test(value)) {
    return 2;
  }

  if (/(email|phone|contact|address|location)/.test(value)) {
    return 1;
  }

  return 0;
}

function prioritizeTemplateFields(fields: BuiltinTemplate["fields"]) {
  return [...fields].sort((left, right) => {
    const scoreDelta = getFieldPriorityScore(right) - getFieldPriorityScore(left);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return fields.indexOf(left) - fields.indexOf(right);
  });
}

const templateCardTones: Record<string, { accent: string; chip: string; line: string }> = {
  hr: {
    accent: "from-amber-100 via-orange-50 to-white",
    chip: "bg-amber-500/15 text-amber-700",
    line: "bg-amber-300/70"
  },
  communication: {
    accent: "from-emerald-100 via-teal-50 to-white",
    chip: "bg-emerald-500/15 text-emerald-700",
    line: "bg-emerald-300/70"
  },
  finance: {
    accent: "from-sky-100 via-cyan-50 to-white",
    chip: "bg-sky-500/15 text-sky-700",
    line: "bg-sky-300/70"
  },
  legal: {
    accent: "from-violet-100 via-fuchsia-50 to-white",
    chip: "bg-violet-500/15 text-violet-700",
    line: "bg-violet-300/70"
  }
};

function getTemplateCardTone(category: string) {
  return templateCardTones[category.toLowerCase()] || {
    accent: "from-slate-100 via-slate-50 to-white",
    chip: "bg-slate-900/10 text-slate-700",
    line: "bg-slate-300/80"
  };
}

function getTemplateThumbnailPath() {
  return "/template-thumbnails/default.svg";
}

function buildCardPreviewHtml(html: string) {
  const injectedStyles = `
    <style id="card-preview-scale-styles">
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        min-width: 0 !important;
        overflow: hidden !important;
        background: #ffffff !important;
      }

      #card-preview-shell {
        padding: 0;
        overflow: hidden;
      }

      #card-preview-stage {
        transform-origin: top left;
        will-change: transform;
      }
    </style>
  `;

  const injectedScript = `
    <script>
      (() => {
        const SIDE_PADDING = 6;

        function mount() {
          if (!document.body) return;

          let shell = document.getElementById("card-preview-shell");
          let stage = document.getElementById("card-preview-stage");

          if (!shell || !stage) {
            shell = document.createElement("div");
            shell.id = "card-preview-shell";
            stage = document.createElement("div");
            stage.id = "card-preview-stage";

            while (document.body.firstChild) {
              stage.appendChild(document.body.firstChild);
            }

            shell.appendChild(stage);
            document.body.appendChild(shell);
          }

          const contentRoot = stage.querySelector(".page") || stage.firstElementChild || stage;
          const baseWidth = Math.max(contentRoot.scrollWidth || 0, 920);
          const availableWidth = Math.max(window.innerWidth - SIDE_PADDING, 180);
          const scale = Math.min(1, availableWidth / baseWidth);

          stage.style.width = baseWidth + "px";
          stage.style.transform = "scale(" + scale + ")";
          shell.style.height = Math.ceil(stage.scrollHeight * scale) + "px";
        }

        window.addEventListener("resize", mount);
        window.addEventListener("load", mount);
        setTimeout(mount, 0);
      })();
    </script>
  `;

  if (html.includes("</head>")) {
    return html.replace("</head>", `${injectedStyles}</head>`).replace("</body>", `${injectedScript}</body>`);
  }

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        ${injectedStyles}
      </head>
      <body>
        ${html}
        ${injectedScript}
      </body>
    </html>
  `;
}

function withSessionToken(url: string, token?: string | null) {
  if (!token) {
    return url;
  }

  try {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.set("sessionToken", token);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

export function Workspace({ templates, templatePreviews, initialSessionToken, hasPaidAccess = false }: Props) {
  const mode: Mode = "template_fill";
  const [personalTemplates, setPersonalTemplates] = useState<BuiltinTemplate[]>([]);
  const allTemplates = useMemo(
    () => [...templates, ...personalTemplates],
    [templates, personalTemplates]
  );
  const builtinTemplateIds = useMemo(
    () => new Set(templates.map((template) => template.id)),
    [templates]
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const template of allTemplates) {
      cats.add(template.category);
    }
    return Array.from(cats).sort();
  }, [allTemplates]);

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === "my-templates") {
      return personalTemplates;
    }
    if (selectedCategory) {
      return allTemplates.filter((t) => t.category === selectedCategory);
    }
    return allTemplates;
  }, [allTemplates, personalTemplates, selectedCategory]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || "");
  const selectedTemplate = useMemo(
    () => allTemplates.find((template) => template.id === selectedTemplateId),
    [allTemplates, selectedTemplateId]
  );
  const previewMap = useMemo(
    () => new Map(templatePreviews.map((preview) => [preview.id, preview.html])),
    [templatePreviews]
  );

  const [data, setData] = useState<Record<string, string>>({
    candidate_name: "Rahul Nair",
    company_name: "Acme Labs",
    job_title: "Solution Architect",
    salary: "€120,000",
    start_date: "2026-04-01",
    manager_name: "Asha Menon"
  });

  const [versioningEnabled, setVersioningEnabled] = useState<boolean>(false);
  const [outputFormat, setOutputFormat] = useState<"html" | "pdf">("pdf");
  const [pdfFormat, setPdfFormat] = useState<"A4" | "Letter">("A4");
  const [pdfMargin, setPdfMargin] = useState<"normal" | "narrow">("normal");
  const [saveToMyFiles, setSaveToMyFiles] = useState<boolean>(hasPaidAccess);
  const [status, setStatus] = useState<JobStatus>("idle");
  const [previewHtml, setPreviewHtml] = useState<string>(previewMap.get(templates[0]?.id || "") || "");
  const [previewStatus, setPreviewStatus] = useState<string>("Template preview");
  const [downloadLinks, setDownloadLinks] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [profile, setProfile] = useState<CompanyProfile>(defaultProfile);
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  const [clauseSelections, setClauseSelections] = useState<ClauseSelection[]>([]);
  const [customClauses, setCustomClauses] = useState<CustomClauseDraft[]>([]);
  const [editorId, setEditorId] = useState<string>("");
  const [sessionToken, setSessionToken] = useState<string | null>(() => initialSessionToken || getStoredWorkspaceSessionToken() || null);
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [sessionError, setSessionError] = useState<string>("");
  const [hasConflict, setHasConflict] = useState<boolean>(false);
  const [snapshots, setSnapshots] = useState<WorkspaceSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState<boolean>(false);
  const [restoringSnapshotId, setRestoringSnapshotId] = useState<string | null>(null);
  const [lastAutosavedAt, setLastAutosavedAt] = useState<string>("");
  const [isRotatingLink, setIsRotatingLink] = useState<boolean>(false);
  const [visibleTemplateIds, setVisibleTemplateIds] = useState<Set<string>>(new Set());
  const profilePersistenceReadyRef = useRef(false);

  useEffect(() => {
    setVisibleTemplateIds((current) => {
      const next = new Set(current);
      for (const template of allTemplates.slice(0, 4)) {
        next.add(template.id);
      }
      if (selectedTemplateId) {
        next.add(selectedTemplateId);
      }
      return next;
    });

    if (typeof IntersectionObserver === "undefined") {
      setVisibleTemplateIds(new Set(allTemplates.map((template) => template.id)));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleTemplateIds((current) => {
          const next = new Set(current);
          let changed = false;

          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }

            const templateId = (entry.target as HTMLElement).dataset.templateCardId;
            if (templateId && !next.has(templateId)) {
              next.add(templateId);
              changed = true;
            }
          }

          return changed ? next : current;
        });
      },
      {
        root: null,
        rootMargin: "220px 0px",
        threshold: 0.01
      }
    );

    const cards = document.querySelectorAll<HTMLElement>("[data-template-card-id]");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [allTemplates, selectedTemplateId]);

  useEffect(() => {
    const storedHistory = window.localStorage.getItem(GENERATION_HISTORY_KEY);
    setPersonalTemplates(readLocalTemplates() as BuiltinTemplate[]);

    if (storedHistory) {
      try {
        setHistory(JSON.parse(storedHistory));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  useEffect(() => {
    function syncPersonalTemplates() {
      setPersonalTemplates(readLocalTemplates() as BuiltinTemplate[]);
    }

    window.addEventListener("storage", syncPersonalTemplates);
    window.addEventListener("templify:personal-templates-updated", syncPersonalTemplates as EventListener);
    return () => {
      window.removeEventListener("storage", syncPersonalTemplates);
      window.removeEventListener("templify:personal-templates-updated", syncPersonalTemplates as EventListener);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydratePersistedData() {
      const [nextProfile, nextTemplates] = await Promise.all([
        loadPersistedProfile(sessionToken || "", defaultProfile),
        loadPersistedTemplates(sessionToken || "")
      ]);

      if (cancelled) {
        return;
      }

      setProfile(nextProfile);
      setPersonalTemplates(nextTemplates as BuiltinTemplate[]);
      profilePersistenceReadyRef.current = true;
    }

    void hydratePersistedData();

    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  useEffect(() => {
    if (selectedTemplateId) {
      const exists = allTemplates.some((template) => template.id === selectedTemplateId);
      if (exists) {
        return;
      }
    }

    if (allTemplates[0]?.id) {
      setSelectedTemplateId(allTemplates[0].id);
    }
  }, [allTemplates, selectedTemplateId]);

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
    window.localStorage.setItem(GENERATION_HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    const defaults = templateDefaultsFromProfile(profile);
    setData((current) => {
      const next = { ...current };

      for (const field of selectedTemplate?.fields || []) {
        const fallback = defaults[field.key as keyof typeof defaults];
        if (fallback && !String(next[field.key] || "").trim()) {
          next[field.key] = fallback;
        }
      }

      return next;
    });
  }, [profile, selectedTemplate]);

  useEffect(() => {
    setClauseSelections(makeClauseSelections(selectedTemplate?.clauses));
    setCustomClauses([]);
  }, [selectedTemplateId, selectedTemplate]);

  function buildWorkspaceState() {
    const outputs = Array.from(new Set<OutputFormat>(["html", outputFormat]));
    const branding = buildBranding(profile);

    return {
      mode,
      versioningEnabled,
      selectedTemplateId,
      data: {
        ...templateDefaultsFromProfile(profile),
        ...data
      },
      outputs,
      options: {
        branding,
        clauses: clauseSelections,
        customClauses: customClauses
          .map(({ title, content }) => ({ title: title.trim(), content: content.trim() }))
          .filter((clause) => clause.title && clause.content),
        pdf: {
          format: pdfFormat,
          margin: pdfMargin
        }
      }
    };
  }

  function applyWorkspaceState(state: any) {
    if (!state) {
      return;
    }

    setVersioningEnabled(Boolean(state.versioningEnabled));

    if (state.selectedTemplateId) {
      setSelectedTemplateId(state.selectedTemplateId);
    }

    if (state.data) {
      setData((current) => ({ ...current, ...state.data }));
    }

    if (Array.isArray(state.outputs)) {
      setOutputFormat(state.outputs.includes("pdf") ? "pdf" : "html");
    }

    if (state.options?.pdf?.format) {
      setPdfFormat(state.options.pdf.format);
    }

    if (state.options?.pdf?.margin) {
      setPdfMargin(state.options.pdf.margin);
    }

    if (Array.isArray(state.options?.clauses)) {
      setClauseSelections(state.options.clauses);
    }

    if (Array.isArray(state.options?.customClauses)) {
      setCustomClauses(
        state.options.customClauses.map((clause: CustomClause, index: number) => ({
          id: `${Date.now()}-${index}`,
          title: clause.title,
          content: clause.content
        }))
      );
    }

    if (state.options?.branding) {
      const branding = state.options.branding;
      setProfile((current) => ({
        ...current,
        companyName: branding.companyName || current.companyName,
        contactEmail: branding.contactEmail || current.contactEmail,
        signerName: branding.signerName || current.signerName,
        signerTitle: branding.signerTitle || current.signerTitle,
        primaryColor: branding.primaryColor || current.primaryColor,
        accentColor: branding.accentColor || current.accentColor,
        footerText: branding.footerText || current.footerText,
        logoUrl: branding.logoUrl || current.logoUrl
      }));
    }
  }

  function sessionRequest(path: string, init?: RequestInit, tokenOverride?: string) {
    const token = (tokenOverride || sessionToken || "").trim();
    const headers = new Headers(init?.headers || {});

    if (token) {
      headers.set("x-workspace-session", token);
    }

    return fetch(`/api/v1/session${path}`, {
      ...init,
      headers
    });
  }

  async function loadSession(token: string, hydrateState = false) {
    const res = await sessionRequest("", undefined, token);
    const payload = await res.json();

    if (!res.ok) {
      throw new Error(payload.error?.message || "Unable to load workspace session");
    }

    setSession(payload.session);
    setSessionError("");
    setHasConflict(false);

    if (hydrateState) {
      applyWorkspaceState(payload.session?.state);
    }

    return payload.session as SessionSummary;
  }

  async function loadSnapshots(token: string) {
    if (!versioningEnabled) {
      setSnapshots([]);
      return;
    }

    setLoadingSnapshots(true);
    try {
      const res = await sessionRequest("/snapshots?limit=30", undefined, token);
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.error?.message || "Unable to load snapshots");
      }

      setSnapshots(payload.snapshots || []);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Unable to load snapshots");
    } finally {
      setLoadingSnapshots(false);
    }
  }

  async function restoreSnapshot(snapshotId: string) {
    if (!sessionToken || !session || !versioningEnabled) {
      return;
    }

    const activeEditorId = editorId || getEditorId();
    if (!editorId) {
      setEditorId(activeEditorId);
    }

    setRestoringSnapshotId(snapshotId);
    try {
      const res = await sessionRequest(
        `/snapshots/${encodeURIComponent(snapshotId)}/restore`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            editorId: activeEditorId,
            baseRevision: session.revision,
            note: "Restored from version history"
          })
        },
        sessionToken
      );

      const payload = await res.json();

      if (res.status === 409) {
        setSession(payload.session || null);
        setHasConflict(true);
        setSessionError("Restore conflict detected. Load latest state and retry.");
        return;
      }

      if (!res.ok) {
        throw new Error(payload.error?.message || "Unable to restore snapshot");
      }

      setSession(payload.session);
      applyWorkspaceState(payload.session?.state);
      setSessionError("");
      setHasConflict(false);
      await loadSnapshots(sessionToken);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Unable to restore snapshot");
    } finally {
      setRestoringSnapshotId(null);
    }
  }

  async function createSession() {
    const response = await fetch("/api/v1/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        initialState: buildWorkspaceState()
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || "Unable to create workspace session");
    }

    const token = payload.token as string;
    setSessionToken(token);
  setStoredWorkspaceSessionToken(token);
    setSession(payload.session);
    setSessionError("");
    setHasConflict(false);
    setSnapshots([]);

    window.history.replaceState({}, "", `/workspace?s=${encodeURIComponent(token)}`);

    await loadSnapshots(token);

    return token;
  }

  async function saveSnapshot(
    kind: "manual" | "auto",
    note: string,
    editorOverride?: string,
    baseRevisionOverride?: number,
    retryCount = 0
  ) {
    const activeEditorId = editorOverride || editorId;
    const baseRevision = baseRevisionOverride ?? session?.revision;

    if (!sessionToken || !session || !activeEditorId || baseRevision === undefined) {
      return false;
    }

    const response = await sessionRequest("/snapshots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        editorId: activeEditorId,
        baseRevision,
        kind,
        note,
        state: buildWorkspaceState()
      })
    }, sessionToken);

    const payload = await response.json();

    if (response.status === 409) {
      setSession(payload.session || null);
      setHasConflict(true);
      if (payload.session?.revision !== undefined && retryCount < 1) {
        return saveSnapshot(kind, note, activeEditorId, payload.session.revision, retryCount + 1);
      }
      setSessionError("This workspace changed in another tab. Refresh and apply your edits again.");
      return false;
    }

    if (!response.ok) {
      setSessionError(payload.error?.message || "Unable to save snapshot");
      return false;
    }

    setSession(payload.session);
    setSessionError("");
    setHasConflict(false);
    if (sessionToken) {
      await loadSnapshots(sessionToken);
    }
    return true;
  }

  async function handleSaveSnapshot() {
    if (!sessionToken || !versioningEnabled) {
      return;
    }

    await saveSnapshot("manual", "Manual snapshot");
  }

  async function copyShareLink() {
    if (!sessionToken) {
      return;
    }

    const shareUrl = `${window.location.origin}/workspace?s=${encodeURIComponent(sessionToken)}`;
    await navigator.clipboard.writeText(shareUrl);
  }

  async function handleReloadLatestState() {
    if (!sessionToken) {
      return;
    }

    try {
      await loadSession(sessionToken, true);
      await loadSnapshots(sessionToken);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Unable to reload latest state");
    }
  }

  async function saveDraftState(editorOverride?: string) {
    const activeEditorId = editorOverride || editorId;

    if (!sessionToken || !session || !activeEditorId) {
      return false;
    }

    const response = await sessionRequest("", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        editorId: activeEditorId,
        baseRevision: session.revision,
        createSnapshot: false,
        state: buildWorkspaceState()
      })
    }, sessionToken);

    const payload = await response.json();

    if (response.status === 409) {
      setSession(payload.session || null);
      setHasConflict(true);
      setSessionError("This workspace changed in another tab. Load latest state before continuing.");
      return false;
    }

    if (!response.ok) {
      setSessionError(payload.error?.message || "Unable to autosave workspace");
      return false;
    }

    setSession(payload.session);
    setSessionError("");
    setHasConflict(false);
    setLastAutosavedAt(new Date().toISOString());
    return true;
  }

  async function handleRotateShareLink() {
    if (!sessionToken) {
      return;
    }

    setIsRotatingLink(true);
    try {
      const response = await sessionRequest("/rotate", {
        method: "POST"
      }, sessionToken);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message || "Unable to rotate share link");
      }

      const nextToken = payload.token as string;
      setSessionToken(nextToken);
      setStoredWorkspaceSessionToken(nextToken);
      window.history.replaceState({}, "", `/workspace?s=${encodeURIComponent(nextToken)}`);
      setSessionError("");
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Unable to rotate share link");
    } finally {
      setIsRotatingLink(false);
    }
  }

  useEffect(() => {
    if (!sessionToken) {
      return;
    }

    setStoredWorkspaceSessionToken(sessionToken);
  }, [sessionToken]);

  useEffect(() => {
    const id = getEditorId();
    setEditorId(id);

    async function bootstrapSession() {
      try {
        const resolved = await ensureWorkspaceSession({
          token: sessionToken,
          initialState: buildWorkspaceState()
        });

        setSessionToken(resolved.token);
        setSession(resolved.session);
        setSessionError("");
        setHasConflict(false);
        setSnapshots([]);
        applyWorkspaceState(resolved.session.state);
        window.history.replaceState({}, "", `/workspace?s=${encodeURIComponent(resolved.token)}`);
        await loadSnapshots(resolved.token);
      } catch (error) {
        setSessionError(error instanceof Error ? error.message : "Unable to create workspace session");
      }
    }

    void bootstrapSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionToken) {
      return;
    }

    if (!versioningEnabled) {
      setSnapshots([]);
      return;
    }

    void loadSnapshots(sessionToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versioningEnabled, sessionToken]);

  useEffect(() => {
    if (!sessionToken || !versioningEnabled) {
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken, versioningEnabled]);

  function updateClause(id: string, patch: Partial<ClauseSelection>) {
    setClauseSelections((current) =>
      current.map((clause) => (clause.id === id ? { ...clause, ...patch } : clause))
    );
  }

  function addCustomClause() {
    setCustomClauses((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        title: "Custom clause",
        content: ""
      }
    ]);
  }

  function updateCustomClause(id: string, patch: Partial<CustomClauseDraft>) {
    setCustomClauses((current) =>
      current.map((clause) => (clause.id === id ? { ...clause, ...patch } : clause))
    );
  }

  function removeCustomClause(id: string) {
    setCustomClauses((current) => current.filter((clause) => clause.id !== id));
  }

  async function poll(jobId: string) {
    let tries = 0;

    while (tries < 40) {
      tries += 1;
      const statusUrl = withSessionToken(`/api/v1/generations/${jobId}`, sessionToken);
      const res = await fetch(statusUrl);
      const payload = await res.json();

      if (payload.status === "completed") {
        setStatus("completed");
        const nextLinks = Object.fromEntries(
          (payload.result?.outputs || []).map((item: any) => [item.format, withSessionToken(item.downloadUrl, sessionToken)])
        );
        setDownloadLinks(nextLinks);
        setHistory((current) => [
          {
            id: jobId,
            label: selectedTemplate?.name || "Template run",
            mode,
            createdAt: new Date().toISOString(),
            outputs: nextLinks
          },
          ...current.filter((item) => item.id !== jobId)
        ].slice(0, 8));

        const htmlOutput = (payload.result?.outputs || []).find((item: any) => item.format === "html");
        if (htmlOutput?.downloadUrl) {
          const htmlRes = await fetch(withSessionToken(htmlOutput.downloadUrl, sessionToken));
          setPreviewHtml(await htmlRes.text());
        }

        if (sessionToken) {
          await loadSession(sessionToken);
        }
        return;
      }

      if (payload.status === "failed") {
        setStatus("failed");
        setErrorMessage(payload.error?.message || "Generation failed");
        if (sessionToken) {
          await loadSession(sessionToken);
        }
        return;
      }

      setStatus(payload.status === "queued" ? "queued" : "processing");
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    setStatus("failed");
    setErrorMessage("Generation timed out");
  }

  async function handleGenerate() {
    setStatus("queued");
    setErrorMessage("");
    setDownloadLinks({});

    let token = sessionToken;
    if (!token) {
      try {
        token = await createSession();
      } catch (error) {
        setStatus("failed");
        setErrorMessage(error instanceof Error ? error.message : "Unable to create workspace session");
        return;
      }
    }

    const activeEditorId = editorId || getEditorId();
    if (!editorId) {
      setEditorId(activeEditorId);
    }

    const draftSaved = await saveDraftState(activeEditorId);
    if (!draftSaved) {
      setStatus("failed");
      setErrorMessage("Workspace sync conflict detected. Refresh and retry generation.");
      return;
    }

    // Build from the latest in-memory values after sync to avoid stale request payloads.
    const workspaceState = buildWorkspaceState();

    const templateSource = builtinTemplateIds.has(workspaceState.selectedTemplateId || "")
      ? {
          type: "builtin" as const,
          templateId: workspaceState.selectedTemplateId
        }
      : {
          type: "inline" as const,
          syntax: "handlebars" as const,
          content: selectedTemplate?.content || ""
        };

    const body = {
      mode: workspaceState.mode,
      templateSource,
      data: workspaceState.data,
      saveToMyFiles,
      outputs: workspaceState.outputs,
      session: {
        token: token,
        id: session?.id,
        revision: session?.revision || 0,
        editorId: activeEditorId
      },
      options: workspaceState.options
    };

    const response = await fetch("/api/v1/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
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

  function hasTemplateEdits() {
    if (!selectedTemplate) {
      return false;
    }

    const defaults = templateDefaultsFromProfile(profile);
    const fieldDirty = selectedTemplate.fields.some((field) => {
      const currentValue = String(data[field.key] || "").trim();
      const defaultValue = String(defaults[field.key as keyof typeof defaults] || "").trim();
      return currentValue !== defaultValue;
    });

    const defaultClauses = makeClauseSelections(selectedTemplate.clauses);
    const clauseDirty = defaultClauses.some((defaultClause) => {
      const current = clauseSelections.find((item) => item.id === defaultClause.id);
      if (!current) {
        return false;
      }

      return (
        Boolean(current.enabled) !== Boolean(defaultClause.enabled)
        || String(current.content || "").trim() !== String(defaultClause.content || "").trim()
      );
    });

    const customClauseDirty = customClauses.some(
      (clause) => clause.title.trim().length > 0 || clause.content.trim().length > 0
    );

    return fieldDirty || clauseDirty || customClauseDirty;
  }

  function buildTemplateSourceFromWorkspace(selectedId: string, templateContent?: string) {
    return builtinTemplateIds.has(selectedId)
      ? {
          type: "builtin" as const,
          templateId: selectedId
        }
      : {
          type: "inline" as const,
          syntax: "handlebars" as const,
          content: templateContent || ""
        };
  }

  function renderFieldInput(field: BuiltinTemplate["fields"][number]) {
    return (
      <div key={field.key}>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{field.label}</label>
        {field.type === "textarea" ? (
          <textarea
            value={data[field.key] || ""}
            onChange={(event) =>
              setData((current) => ({ ...current, [field.key]: event.target.value }))
            }
            placeholder={field.placeholder}
            className="min-h-[120px] w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
        ) : (
          <input
            type={field.type}
            value={data[field.key] || ""}
            onChange={(event) =>
              setData((current) => ({ ...current, [field.key]: event.target.value }))
            }
            placeholder={field.placeholder}
            className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
        )}
      </div>
    );
  }

  function handleTemplateSwitch(nextTemplateId: string) {
    if (nextTemplateId === selectedTemplateId) {
      return;
    }

    if (hasTemplateEdits()) {
      const confirmed = window.confirm(
        "You have unsaved template edits. Switching will reset template-specific clauses and custom clauses. Continue?"
      );

      if (!confirmed) {
        return;
      }
    }

    setSelectedTemplateId(nextTemplateId);
    setPreviewHtml(previewMap.get(nextTemplateId) || "");
    setPreviewStatus("Template preview");
  }

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    if (!sessionToken) {
      setPreviewHtml(previewMap.get(selectedTemplate.id) || "");
      setPreviewStatus("Template preview");
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setPreviewStatus("Updating preview");

        const workspaceState = buildWorkspaceState();
        const templateSource = buildTemplateSourceFromWorkspace(
          workspaceState.selectedTemplateId || selectedTemplate.id,
          selectedTemplate.content
        );

        const response = await fetch("/api/v1/generations/preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            mode: workspaceState.mode,
            templateSource,
            data: workspaceState.data,
            session: {
              token: sessionToken,
              revision: session?.revision || 0,
              editorId: editorId || undefined
            },
            options: workspaceState.options
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error?.message || "Unable to render live preview");
        }

        const html = await response.text();
        setPreviewHtml(html || previewMap.get(selectedTemplate.id) || "");
        setPreviewStatus("Live preview");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setPreviewHtml(previewMap.get(selectedTemplate.id) || "");
        setPreviewStatus("Template preview");
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [
    clauseSelections,
    customClauses,
    data,
    editorId,
    outputFormat,
    pdfFormat,
    pdfMargin,
    previewMap,
    profile,
    selectedTemplate,
    selectedTemplateId,
    session?.revision,
    sessionToken,
    versioningEnabled
  ]);
  const templateSource = buildTemplateSourceFromWorkspace(
    selectedTemplateId || "",
    selectedTemplate?.content || ""
  );
  const prioritizedFields = selectedTemplate ? prioritizeTemplateFields(selectedTemplate.fields) : [];
  const primaryFields = prioritizedFields.slice(0, 4);
  const additionalFields = prioritizedFields.slice(4);

  return (
    <section className="page-shell space-y-5 pt-6">

      {sessionError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>{sessionError}</div>
            {hasConflict && (
              <SecondaryButton className="px-3 py-2 text-xs" onClick={handleReloadLatestState}>
                <RefreshCw size={14} className="mr-2" />
                Load latest state
              </SecondaryButton>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 px-1 pb-3">
              <div className="text-sm font-semibold text-slate-900">Templates</div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                {filteredTemplates.length}
              </div>
            </div>

            <select
              value={selectedCategory === null ? "" : selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="mb-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
            >
              <option value="">All Templates</option>
              {personalTemplates.length > 0 && (
                <option value="my-templates">My Templates ({personalTemplates.length})</option>
              )}
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <div className="h-[420px] space-y-3 overflow-y-auto pr-1 xl:h-[calc(100vh-220px)]">
              {filteredTemplates.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">No templates in this category.</div>
              )}
              {filteredTemplates.map((template) => {
                const tone = getTemplateCardTone(template.category);
                const selected = template.id === selectedTemplateId;
                const templateThumbnailHtml = previewMap.get(template.id);
                const shouldRenderLiveThumbnail = selected || visibleTemplateIds.has(template.id);

                return (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSwitch(template.id)}
                    data-template-card-id={template.id}
                    className={`w-full rounded-[26px] border p-3 text-left transition ${
                      selected
                        ? "border-slate-900 bg-slate-950 text-white shadow-[0_24px_48px_rgba(15,23,42,0.16)]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`rounded-[20px] border p-3 ${selected ? "border-white/10 bg-white/5" : "border-slate-200 bg-gradient-to-br " + tone.accent}`}>
                      <div className="rounded-[16px] border border-black/5 bg-white/90 p-2 shadow-sm">
                        {templateThumbnailHtml && shouldRenderLiveThumbnail ? (
                          <iframe
                            title={`${template.name} template thumbnail`}
                            srcDoc={buildCardPreviewHtml(templateThumbnailHtml)}
                            className="h-[112px] w-full rounded-xl border border-slate-200 bg-white"
                            loading="lazy"
                          />
                        ) : (
                          <img
                            src={getTemplateThumbnailPath()}
                            alt={`${template.name} template thumbnail`}
                            className="h-[112px] w-full rounded-xl border border-slate-200 object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                    </div>
                    <div className="mt-2 px-1">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <div className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${selected ? "bg-white/15 text-white" : tone.chip}`}>
                          {template.category}
                        </div>
                        <div className={`text-[10px] font-medium uppercase tracking-[0.14em] ${selected ? "text-slate-300" : "text-slate-400"}`}>
                          {template.supportedOutputs.join(" / ")}
                        </div>
                      </div>
                      <div className={`text-sm font-semibold ${selected ? "text-white" : "text-slate-950"}`}>{template.name}</div>
                      <div className={`mt-1 line-clamp-2 text-xs leading-5 ${selected ? "text-slate-300" : "text-slate-500"}`}>{template.description}</div>
                      <div className={`mt-3 flex items-center justify-between text-xs ${selected ? "text-slate-300" : "text-slate-500"}`}>
                        <span>{template.fields.length} fields</span>
                        <span>{template.clauses?.length || 0} clauses</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="space-y-5">
          <div className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-3">
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                    {selectedTemplate?.name || "Choose a template"}
                  </div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                    {templateSource.type === "builtin" ? "Built-in" : "Custom"}
                  </div>
                </div>
              </div>

              <div className="flex flex-nowrap items-center justify-start gap-2 xl:flex-shrink-0 xl:justify-end">
                <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
                  <input type="checkbox" checked={versioningEnabled} onChange={(event) => setVersioningEnabled(event.target.checked)} />
                  Versioning
                </label>
                <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                  {(["html", "pdf"] as const).map((format) => (
                    <button
                      key={format}
                      onClick={() => setOutputFormat(format)}
                      className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${outputFormat === format ? "bg-slate-950 text-white" : "text-slate-600"}`}
                    >
                      {format}
                    </button>
                  ))}
                </div>
                <SecondaryButton className="min-w-[116px] px-3 py-3 text-xs" onClick={copyShareLink} disabled={!sessionToken}>
                  <Copy size={14} className="mr-2" /> Copy link
                </SecondaryButton>
                <SecondaryButton className={`min-w-[116px] px-3 py-3 text-xs ${!versioningEnabled ? "invisible" : ""}`} onClick={handleSaveSnapshot} disabled={!versioningEnabled}>
                  <Save size={14} className="mr-2" /> Save version
                </SecondaryButton>
                <MetallicButton className="px-4 py-3 text-sm" onClick={handleGenerate}>
                  <Sparkles size={16} className="mr-2" /> {outputFormat === "pdf" ? "Generate PDF" : "Generate HTML"}
                </MetallicButton>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-start justify-between gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <label className="inline-flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={saveToMyFiles}
                  onChange={(event) => setSaveToMyFiles(event.target.checked)}
                  disabled={!hasPaidAccess}
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold text-slate-900">Save to My Files for 30 days</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    When this is off, files stay temporary and are only available from the current request.
                  </span>
                </span>
              </label>
              <div className="max-w-sm text-xs leading-5 text-slate-500">
                {hasPaidAccess
                  ? "Saved files can be downloaded again from My Files until the 30-day retention window ends."
                  : "My Files saving is available on paid signed-in accounts. You can still generate and download files immediately."}
              </div>
            </div>
          </div>

          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-5">
              <PreviewPanel
                html={previewHtml}
                status={status === "idle" ? previewStatus : status}
                description={selectedTemplate?.description || "Live draft preview"}
              />

              {mode === "template_fill" && selectedTemplate && (
                <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                    <div className="text-sm font-semibold text-slate-900">Input data</div>
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      {selectedTemplate.fields.length} fields
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    {primaryFields.map(renderFieldInput)}
                    {additionalFields.map(renderFieldInput)}
                  </div>

                  <div className="mt-5 space-y-4 border-t border-slate-200 pt-5">
                    <details className="group rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                        <span>Branding</span>
                        <ChevronDown size={15} className="text-slate-500 transition group-open:rotate-180" />
                      </summary>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Company name</label>
                        <input value={profile.companyName} onChange={(event) => setProfile((current) => ({ ...current, companyName: event.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Contact email</label>
                        <input value={profile.contactEmail} onChange={(event) => setProfile((current) => ({ ...current, contactEmail: event.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Signer name</label>
                        <input value={profile.signerName} onChange={(event) => setProfile((current) => ({ ...current, signerName: event.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Signer title</label>
                        <input value={profile.signerTitle} onChange={(event) => setProfile((current) => ({ ...current, signerTitle: event.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Primary color</label>
                        <input value={profile.primaryColor} onChange={(event) => setProfile((current) => ({ ...current, primaryColor: event.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none" placeholder="#2563eb" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Accent color</label>
                        <input value={profile.accentColor} onChange={(event) => setProfile((current) => ({ ...current, accentColor: event.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none" placeholder="#dbeafe" />
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Logo URL</label>
                        <input value={profile.logoUrl} onChange={(event) => setProfile((current) => ({ ...current, logoUrl: event.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none" placeholder="https://example.com/logo.png" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Footer note</label>
                        <textarea value={profile.footerText} onChange={(event) => setProfile((current) => ({ ...current, footerText: event.target.value }))} className="min-h-[96px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none" />
                      </div>
                    </div>
                    </details>

                    {!!selectedTemplate.clauses?.length && (
                      <details className="group rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                          <span>Clauses</span>
                          <ChevronDown size={15} className="text-slate-500 transition group-open:rotate-180" />
                        </summary>
                      <div className="mt-4 space-y-4">
                        {selectedTemplate.clauses.map((templateClause) => {
                          const clause = clauseSelections.find((item) => item.id === templateClause.id);

                          return (
                            <div key={templateClause.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">{templateClause.title}</div>
                                  <div className="mt-1 text-xs uppercase tracking-[0.14em] text-blue-700">{templateClause.category}</div>
                                  <div className="mt-2 text-sm leading-6 text-slate-600">{templateClause.description}</div>
                                </div>
                                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                                  <input type="checkbox" checked={Boolean(clause?.enabled)} onChange={(event) => updateClause(templateClause.id, { enabled: event.target.checked })} />
                                  Include
                                </label>
                              </div>

                              {templateClause.editable && clause?.enabled && (
                                <textarea value={clause.content || ""} onChange={(event) => updateClause(templateClause.id, { content: event.target.value })} className="mt-4 min-h-[120px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">Custom clauses</div>
                          </div>
                          <SecondaryButton className="px-4 py-2 text-xs" onClick={addCustomClause}>
                            <FilePlus2 size={14} className="mr-2" /> Add clause
                          </SecondaryButton>
                        </div>

                        <div className="mt-4 space-y-4">
                          {customClauses.map((clause, index) => (
                            <div key={clause.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                                <input value={clause.title} onChange={(event) => updateCustomClause(clause.id, { title: event.target.value })} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none" placeholder={`Custom clause ${index + 1} title`} />
                                <SecondaryButton className="px-4 py-3 text-xs" onClick={() => removeCustomClause(clause.id)}>Remove</SecondaryButton>
                              </div>
                              <textarea value={clause.content} onChange={(event) => updateCustomClause(clause.id, { content: event.target.value })} className="mt-3 min-h-[110px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none" placeholder="Add a custom clause for timing, work structure, confidentiality, jurisdiction, or another requirement." />
                            </div>
                          ))}
                        </div>
                      </div>
                      </details>
                    )}

                    {outputFormat === "pdf" && (
                      <details className="group rounded-[24px] border border-slate-200 bg-slate-50 p-4" open>
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                          <span>PDF settings</span>
                          <ChevronDown size={15} className="text-slate-500 transition group-open:rotate-180" />
                        </summary>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">PDF size</label>
                          <select value={pdfFormat} onChange={(event) => setPdfFormat(event.target.value as "A4" | "Letter")} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none">
                            <option value="A4">A4</option>
                            <option value="Letter">Letter</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">PDF margin</label>
                          <select value={pdfMargin} onChange={(event) => setPdfMargin(event.target.value as "normal" | "narrow")} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none">
                            <option value="normal">Normal</option>
                            <option value="narrow">Narrow</option>
                          </select>
                        </div>
                      </div>
                      </details>
                    )}
                  </div>
                </div>
              )}

              {status === "failed" && (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  <FileWarning size={18} className="mt-0.5" />
                  <div>{errorMessage || "Generation failed."}</div>
                </div>
              )}
            </div>

            <div className="space-y-5">
              {downloadLinks[outputFormat] && (
                <a href={downloadLinks[outputFormat]} target="_blank">
                  <SecondaryButton className="w-full justify-center px-5 py-4">
                    <Download size={16} className="mr-2" /> Download {outputFormat.toUpperCase()}
                  </SecondaryButton>
                </a>
              )}

              <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3 text-sm text-slate-700">
                  <Clock3 size={16} className="mt-0.5 text-slate-500" />
                  <div>
                    <div className="font-medium text-slate-900">Workspace</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {session ? `Revision ${session.revision}` : "Local draft"}
                    </div>
                    {session?.expiresAt && (
                      <div className="mt-1 text-xs text-slate-500">Expires {formatTimestamp(session.expiresAt)}</div>
                    )}
                    {lastAutosavedAt && (
                      <div className="mt-1 text-xs text-slate-500">Synced {formatTimestamp(lastAutosavedAt)}</div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  <SecondaryButton className="w-full justify-center px-4 py-3 text-xs" onClick={copyShareLink} disabled={!sessionToken}>
                    <Copy size={14} className="mr-2" /> Copy workspace link
                  </SecondaryButton>
                  <SecondaryButton className="w-full justify-center px-4 py-3 text-xs" onClick={handleRotateShareLink} disabled={!sessionToken || isRotatingLink}>
                    <RefreshCw size={14} className="mr-2" /> {isRotatingLink ? "Rotating..." : "Rotate link"}
                  </SecondaryButton>
                </div>
              </div>

              {versioningEnabled && (
                <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <History size={16} /> Versions
                    </div>
                    {sessionToken && (
                      <SecondaryButton className="px-3 py-2 text-xs" onClick={() => loadSnapshots(sessionToken)}>
                        <RefreshCw size={14} className="mr-2" /> Refresh
                      </SecondaryButton>
                    )}
                  </div>
                  <div className="mt-4 space-y-3">
                    {loadingSnapshots ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">Loading...</div>
                    ) : snapshots.length ? (
                      snapshots.map((snapshot) => (
                        <div key={snapshot.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="text-sm font-medium text-slate-900">Rev {snapshot.revision}</div>
                              <div className="mt-1 text-xs text-slate-500">{formatTimestamp(snapshot.createdAt)}</div>
                              {snapshot.note && <div className="mt-1 text-xs text-slate-600">{snapshot.note}</div>}
                            </div>
                            <SecondaryButton className="px-3 py-2 text-xs" onClick={() => restoreSnapshot(snapshot.id)} disabled={restoringSnapshotId === snapshot.id}>
                              {restoringSnapshotId === snapshot.id ? "Restoring..." : "Restore"}
                            </SecondaryButton>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">No versions yet.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
