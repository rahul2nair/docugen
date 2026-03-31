"use client";

import Link from "next/link";
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
  ArrowLeft,
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
}

type JobStatus = "idle" | "queued" | "processing" | "completed" | "failed";
type WizardStep = 1 | 2 | 3;

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
  primaryColor: "#8d6334",
  accentColor: "#efe3d3",
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

export function Workspace({ templates, templatePreviews, initialSessionToken }: Props) {
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
  const [showTemplatePicker, setShowTemplatePicker] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<WizardStep>(1);
  const profilePersistenceReadyRef = useRef(false);

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

  async function loadSession(token: string, hydrateState = false) {
    const res = await fetch(`/api/v1/sessions/${encodeURIComponent(token)}`);
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
      const res = await fetch(`/api/v1/sessions/${encodeURIComponent(token)}/snapshots?limit=30`);
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
      const res = await fetch(
        `/api/v1/sessions/${encodeURIComponent(sessionToken)}/snapshots/${encodeURIComponent(snapshotId)}/restore`,
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
        }
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

    const response = await fetch(`/api/v1/sessions/${encodeURIComponent(sessionToken)}/snapshots`, {
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
    });

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

    const response = await fetch(`/api/v1/sessions/${encodeURIComponent(sessionToken)}`, {
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
    });

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
      const response = await fetch(`/api/v1/sessions/${encodeURIComponent(sessionToken)}/rotate`, {
        method: "POST"
      });
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
      const res = await fetch(`/api/v1/generations/${jobId}`);
      const payload = await res.json();

      if (payload.status === "completed") {
        setStatus("completed");
        const nextLinks = Object.fromEntries(
          (payload.result?.outputs || []).map((item: any) => [item.format, item.downloadUrl])
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
          const htmlRes = await fetch(htmlOutput.downloadUrl);
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
        <label className="mb-2 block text-sm font-medium text-ink-700">{field.label}</label>
        {field.type === "textarea" ? (
          <textarea
            value={data[field.key] || ""}
            onChange={(event) =>
              setData((current) => ({ ...current, [field.key]: event.target.value }))
            }
            placeholder={field.placeholder}
            className="min-h-[130px] w-full rounded-[22px] border border-[rgba(126,94,60,0.14)] bg-white px-4 py-3 text-sm outline-none"
          />
        ) : (
          <input
            type={field.type}
            value={data[field.key] || ""}
            onChange={(event) =>
              setData((current) => ({ ...current, [field.key]: event.target.value }))
            }
            placeholder={field.placeholder}
            className="w-full rounded-[22px] border border-[rgba(126,94,60,0.14)] bg-white px-4 py-3 text-sm outline-none"
          />
        )}
      </div>
    );
  }

  function handleTemplateSwitch(nextTemplateId: string) {
    if (nextTemplateId === selectedTemplateId) {
      setShowTemplatePicker(false);
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
    setShowTemplatePicker(false);
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
  const completedFieldCount = selectedTemplate
    ? selectedTemplate.fields.filter((field) => String(data[field.key] || "").trim()).length
    : 0;
  const completedEssentialFieldCount = primaryFields.filter((field) => String(data[field.key] || "").trim()).length;
  const completionRatio = selectedTemplate?.fields.length
    ? Math.round((completedFieldCount / selectedTemplate.fields.length) * 100)
    : 0;
  const previewDescriptions: Record<WizardStep, string> = {
    1: "Choose the document structure first. The preview helps you confirm the template direction.",
    2: "The preview updates as you fill the essential fields so you can see the document take shape.",
    3: "Review the document, adjust export settings if needed, and generate the final file."
  };
  const stepSummaries: Record<WizardStep, string> = {
    1: "Choose the closest document type and keep moving.",
    2: "Fill the essentials before opening anything advanced.",
    3: "Review the result and export when it reads the way you want."
  };

  return (
    <section className="page-shell space-y-5 pt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-[#8f6a44]">Create</div>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink-900">Document Builder</div>
          <div className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
            A guided path for choosing a document, filling the essentials, and exporting only when the draft looks right.
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center rounded-full border border-[rgba(120,90,58,0.14)] bg-white/84 px-4 py-2 text-sm font-semibold text-ink-800 transition hover:bg-white">
            <ArrowLeft size={15} className="mr-2" /> Home
          </Link>
        </div>
      </div>

      {sessionError && (
        <div className="mb-5 rounded-[20px] border border-[#efcdc9] bg-[#fff4f2] px-4 py-3 text-sm text-[#92443c]">
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

      <div className="glass-panel border-[rgba(126,94,60,0.12)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          {([
            { id: 1, label: "Choose document" },
            { id: 2, label: "Fill essentials" },
            { id: 3, label: "Review and export" }
          ] as const).map((step) => {
            const isActive = activeStep === step.id;
            const isComplete = activeStep > step.id;

            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 text-sm transition ${
                  isActive
                    ? "border-[#c89d70] bg-[#fff8ef] font-semibold text-ink-900"
                    : isComplete
                      ? "border-[rgba(126,94,60,0.14)] bg-white/90 text-ink-800"
                      : "border-[rgba(126,94,60,0.12)] bg-[rgba(255,255,255,0.7)] text-ink-600"
                }`}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  isActive ? "bg-[#8f6a44] text-white" : isComplete ? "bg-[#efe3d3] text-[#8f6a44]" : "bg-[rgba(126,94,60,0.1)] text-ink-600"
                }`}>
                  {step.id}
                </span>
                <span>{step.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 text-sm text-ink-600">{stepSummaries[activeStep]}</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.28fr_0.94fr] lg:items-start">
        <div className="space-y-5">
          <div className="glass-panel border-[rgba(126,94,60,0.12)] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">Step {activeStep} of 3</div>
            <div className="mt-2 text-xl font-semibold text-ink-900">
              {activeStep === 1 ? "Choose your document" : activeStep === 2 ? "Fill the essentials" : "Review and export"}
            </div>
            <div className="mt-1 text-sm leading-6 text-ink-600">
              {activeStep === 1
                ? "Start with the closest structure. You can change the document type before moving on."
                : activeStep === 2
                  ? "Complete the most important fields first. Everything else stays tucked away until you need it."
                  : "Review the preview, generate the document, and only open advanced export or workspace tools if needed."}
            </div>

            {activeStep === 1 && (
              <>
                <div className="mt-5 rounded-[24px] border border-[rgba(126,94,60,0.12)] bg-[rgba(255,255,255,0.82)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-[#8f6a44]">Active template</div>
                      <div className="mt-1 text-lg font-semibold text-ink-900">{selectedTemplate?.name || "Template"}</div>
                      <div className="mt-2 text-sm leading-6 text-ink-600">
                        {selectedTemplate?.description || "Choose a template to begin drafting."}
                      </div>
                    </div>
                    <SecondaryButton className="px-4 py-2 text-xs" onClick={() => setShowTemplatePicker(true)}>
                      Change
                    </SecondaryButton>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[20px] border border-[rgba(126,94,60,0.12)] bg-white px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">Source</div>
                      <div className="mt-1 text-sm font-semibold text-ink-900">
                        {templateSource.type === "builtin" ? "Built-in template" : "Custom template"}
                      </div>
                    </div>
                    <div className="rounded-[20px] border border-[rgba(126,94,60,0.12)] bg-white px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">Fields</div>
                      <div className="mt-1 text-sm font-semibold text-ink-900">{selectedTemplate?.fields.length || 0} to review</div>
                    </div>
                    <div className="rounded-[20px] border border-[rgba(126,94,60,0.12)] bg-white px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">Clauses</div>
                      <div className="mt-1 text-sm font-semibold text-ink-900">{selectedTemplate?.clauses?.length || 0} optional</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  <Link href="/templates">
                    <SecondaryButton>Browse all document types</SecondaryButton>
                  </Link>
                  <MetallicButton onClick={() => setActiveStep(2)}>
                    Continue to essentials
                  </MetallicButton>
                </div>
              </>
            )}

            {activeStep === 2 && (
              <>
                {selectedTemplate && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-600">
                    <div className="rounded-full border border-[rgba(126,94,60,0.12)] bg-[rgba(250,245,238,0.92)] px-3 py-1.5 font-medium text-ink-700">
                      {completedEssentialFieldCount} of {primaryFields.length || selectedTemplate.fields.length} essentials filled
                    </div>
                    <div className="rounded-full border border-[rgba(126,94,60,0.12)] bg-white px-3 py-1.5">
                      {completedFieldCount} of {selectedTemplate.fields.length} total fields filled
                    </div>
                    <div className="rounded-full border border-[rgba(126,94,60,0.12)] bg-white px-3 py-1.5">
                      {completionRatio}% complete
                    </div>
                  </div>
                )}

                {mode === "template_fill" && selectedTemplate && (
                  <div className="mt-5 grid gap-4">
                    {primaryFields.map(renderFieldInput)}

                    <details className="rounded-[24px] border border-[rgba(126,94,60,0.12)] bg-[rgba(255,255,255,0.78)] p-4">
                      <summary className="cursor-pointer list-none">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-ink-900">More options</div>
                            <div className="mt-1 text-xs text-ink-500">Open this only if you want to complete every field, change branding defaults, or edit clauses.</div>
                          </div>
                          <div className="rounded-full border border-[rgba(126,94,60,0.12)] bg-white px-3 py-1 text-[11px] font-medium text-ink-600">
                            Optional
                          </div>
                        </div>
                      </summary>

                      {additionalFields.length > 0 && (
                        <div className="mt-4 grid gap-4">
                          <div className="text-sm font-semibold text-ink-900">Additional fields</div>
                          {additionalFields.map(renderFieldInput)}
                        </div>
                      )}

                      <details className="mt-4 rounded-[24px] border border-[rgba(126,94,60,0.12)] bg-[rgba(255,255,255,0.8)] p-4">
            <summary className="cursor-pointer list-none">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-ink-900">Branding defaults</div>
                  <div className="mt-1 text-xs text-ink-500">Optional. Use this if you want your company name, signer, colors, and footer applied automatically.</div>
                </div>
                <div className="rounded-full border border-[#eadfce] bg-[#f9f4ed] px-3 py-1 text-[11px] font-medium text-ink-600">Optional</div>
              </div>
            </summary>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Company name</label>
                <input
                  value={profile.companyName}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, companyName: event.target.value }))
                  }
                  className="w-full rounded-[22px] border border-[rgba(126,94,60,0.14)] bg-white px-4 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Contact email</label>
                <input
                  value={profile.contactEmail}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, contactEmail: event.target.value }))
                  }
                  className="w-full rounded-[22px] border border-[rgba(126,94,60,0.14)] bg-white px-4 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Signer name</label>
                <input
                  value={profile.signerName}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, signerName: event.target.value }))
                  }
                  className="w-full rounded-[22px] border border-[rgba(126,94,60,0.14)] bg-white px-4 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Signer title</label>
                <input
                  value={profile.signerTitle}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, signerTitle: event.target.value }))
                  }
                  className="w-full rounded-[22px] border border-[rgba(126,94,60,0.14)] bg-white px-4 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Primary color</label>
                <input
                  value={profile.primaryColor}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, primaryColor: event.target.value }))
                  }
                  className="w-full rounded-[22px] border border-[rgba(126,94,60,0.14)] bg-white px-4 py-3 text-sm outline-none"
                  placeholder="#8d6334"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Accent color</label>
                <input
                  value={profile.accentColor}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, accentColor: event.target.value }))
                  }
                  className="w-full rounded-[22px] border border-[rgba(126,94,60,0.14)] bg-white px-4 py-3 text-sm outline-none"
                  placeholder="#efe3d3"
                />
              </div>
            </div>
            <div className="mt-3 grid gap-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Logo URL</label>
                <input
                  value={profile.logoUrl}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, logoUrl: event.target.value }))
                  }
                  className="w-full rounded-[22px] border border-[rgba(126,94,60,0.14)] bg-white px-4 py-3 text-sm outline-none"
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Footer note</label>
                <textarea
                  value={profile.footerText}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, footerText: event.target.value }))
                  }
                  className="min-h-[96px] w-full rounded-[22px] border border-[rgba(126,94,60,0.14)] bg-white px-4 py-3 text-sm outline-none"
                />
              </div>
            </div>
          </details>

                      {!!selectedTemplate.clauses?.length && (
                        <details className="mt-4 rounded-[24px] border border-[rgba(126,94,60,0.12)] bg-[rgba(255,255,255,0.82)] p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-ink-900">Optional clauses and legal sections</div>
                        <div className="mt-1 text-xs text-ink-500">Open this only if you want to include standard clauses, edit legal wording, or add custom sections.</div>
                      </div>
                      <div className="rounded-full border border-[#eadfce] bg-[#f9f4ed] px-3 py-1 text-[11px] font-medium text-ink-600">Optional</div>
                    </div>
                  </summary>
                  <div className="mt-4 space-y-4">
                    {selectedTemplate.clauses.map((templateClause) => {
                      const clause = clauseSelections.find((item) => item.id === templateClause.id);

                      return (
                        <div key={templateClause.id} className="rounded-[22px] border border-[rgba(126,94,60,0.12)] bg-[rgba(250,245,238,0.92)] p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-semibold text-ink-900">{templateClause.title}</div>
                              <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[#8f6a44]">{templateClause.category}</div>
                              <div className="mt-2 text-sm leading-6 text-ink-600">{templateClause.description}</div>
                            </div>
                            <label className="inline-flex items-center gap-2 text-sm font-medium text-ink-700">
                              <input
                                type="checkbox"
                                checked={Boolean(clause?.enabled)}
                                onChange={(event) => updateClause(templateClause.id, { enabled: event.target.checked })}
                              />
                              Include
                            </label>
                          </div>

                          {templateClause.editable && clause?.enabled && (
                            <textarea
                              value={clause.content || ""}
                              onChange={(event) => updateClause(templateClause.id, { content: event.target.value })}
                              className="mt-4 min-h-[120px] w-full rounded-[22px] border border-[rgba(126,94,60,0.14)] bg-white px-4 py-3 text-sm leading-6 outline-none"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 rounded-[22px] border border-dashed border-[rgba(126,94,60,0.18)] bg-[rgba(255,255,255,0.72)] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-ink-900">Custom clauses</div>
                        <div className="mt-1 text-xs text-ink-500">Use these for edge cases like location-specific privacy, work timing, or compliance language not covered above.</div>
                      </div>
                      <SecondaryButton className="px-4 py-2 text-xs" onClick={addCustomClause}>
                        <FilePlus2 size={14} className="mr-2" />
                        Add clause
                      </SecondaryButton>
                    </div>

                    <div className="mt-4 space-y-4">
                      {customClauses.map((clause, index) => (
                        <div key={clause.id} className="rounded-[22px] border border-[rgba(126,94,60,0.12)] bg-white p-4">
                          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                            <input
                              value={clause.title}
                              onChange={(event) => updateCustomClause(clause.id, { title: event.target.value })}
                              className="w-full rounded-[18px] border border-[rgba(126,94,60,0.14)] bg-white px-4 py-3 text-sm outline-none"
                              placeholder={`Custom clause ${index + 1} title`}
                            />
                            <SecondaryButton className="px-4 py-3 text-xs" onClick={() => removeCustomClause(clause.id)}>
                              Remove
                            </SecondaryButton>
                          </div>
                          <textarea
                            value={clause.content}
                            onChange={(event) => updateCustomClause(clause.id, { content: event.target.value })}
                            className="mt-3 min-h-[110px] w-full rounded-[18px] border border-[rgba(126,94,60,0.14)] bg-white px-4 py-3 text-sm leading-6 outline-none"
                            placeholder="Add a custom clause for timing, work structure, confidentiality, jurisdiction, or another requirement."
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )}
                    </details>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap justify-between gap-3">
                  <SecondaryButton onClick={() => setActiveStep(1)}>Back</SecondaryButton>
                  <MetallicButton onClick={() => setActiveStep(3)}>
                    Review draft
                  </MetallicButton>
                </div>
              </>
            )}

            {activeStep === 3 && (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[20px] border border-[rgba(126,94,60,0.12)] bg-white px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">Document</div>
                    <div className="mt-1 text-sm font-semibold text-ink-900">{selectedTemplate?.name || "Choose a template"}</div>
                  </div>
                  <div className="rounded-[20px] border border-[rgba(126,94,60,0.12)] bg-white px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">Progress</div>
                    <div className="mt-1 text-sm font-semibold text-ink-900">{completedFieldCount} of {selectedTemplate?.fields.length || 0} fields</div>
                  </div>
                  <div className="rounded-[20px] border border-[rgba(126,94,60,0.12)] bg-white px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">Output</div>
                    <div className="mt-1 text-sm font-semibold text-ink-900">{outputFormat === "pdf" ? "PDF export" : "HTML export"}</div>
                  </div>
                </div>

                <details className="mt-5 rounded-[24px] border border-[rgba(126,94,60,0.12)] bg-[rgba(255,255,255,0.8)] p-4">
            <summary className="cursor-pointer list-none">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-ink-900">Advanced export and workspace tools</div>
                  <div className="mt-1 text-xs text-ink-500">Open this only for export settings, version history, or workspace link controls.</div>
                </div>
                <div className="rounded-full border border-[#eadfce] bg-[#f9f4ed] px-3 py-1 text-[11px] font-medium text-ink-600">Advanced</div>
              </div>
            </summary>

            <div className="mt-5 rounded-[24px] border border-[rgba(126,94,60,0.12)] bg-[rgba(255,255,255,0.84)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-ink-900">Version history</div>
                  <div className="mt-1 text-xs text-ink-500">
                    Optional snapshots and restore points for this shared workspace. Current state sync still works even when this is off.
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-ink-700">
                  <input
                    type="checkbox"
                    checked={versioningEnabled}
                    onChange={(event) => setVersioningEnabled(event.target.checked)}
                  />
                  Enable
                </label>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-[rgba(126,94,60,0.12)] bg-[rgba(255,255,255,0.84)] p-4">
              <div className="text-sm font-medium text-ink-900">Export format</div>
              <div className="mt-1 text-xs text-ink-500">PDF is the default. Switch only if you need raw HTML output.</div>
              <div className="mt-3 inline-flex rounded-full border border-[rgba(126,94,60,0.14)] bg-[rgba(244,236,226,0.85)] p-1">
                {(["html", "pdf"] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => setOutputFormat(format)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      outputFormat === format
                        ? "bg-white text-ink-900 shadow"
                        : "text-ink-600"
                    }`}
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>

              {outputFormat === "pdf" && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">PDF size</label>
                    <select
                      value={pdfFormat}
                      onChange={(event) => setPdfFormat(event.target.value as "A4" | "Letter")}
                      className="w-full rounded-[22px] border border-[rgba(126,94,60,0.14)] bg-white px-4 py-3 text-sm outline-none"
                    >
                      <option value="A4">A4</option>
                      <option value="Letter">Letter</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">PDF margin</label>
                    <select
                      value={pdfMargin}
                      onChange={(event) => setPdfMargin(event.target.value as "normal" | "narrow")}
                      className="w-full rounded-[22px] border border-[rgba(126,94,60,0.14)] bg-white px-4 py-3 text-sm outline-none"
                    >
                      <option value="normal">Normal</option>
                      <option value="narrow">Narrow</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {session && (
              <div className="mt-4 rounded-[24px] border border-[rgba(126,94,60,0.12)] bg-[rgba(255,255,255,0.84)] p-4">
                <div className="flex items-start gap-3 text-sm text-ink-700">
                  <Clock3 size={16} className="mt-0.5 text-[#8f6a44]" />
                  <div>
                    <div className="font-medium text-ink-900">Workspace sync</div>
                    <div className="mt-1 text-xs text-ink-500">
                      Revision {session.revision} · expires {formatTimestamp(session.expiresAt)}
                    </div>
                    <div className="mt-1 text-xs text-ink-500">
                      {versioningEnabled
                        ? lastAutosavedAt
                          ? `Last sync ${formatTimestamp(lastAutosavedAt)} · snapshots are manual`
                          : "Version history enabled · snapshots are manual"
                        : lastAutosavedAt
                          ? `Last sync ${formatTimestamp(lastAutosavedAt)}`
                          : "Workspace sync enabled"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {versioningEnabled && (
              <div className="mt-4 rounded-[24px] border border-[rgba(126,94,60,0.12)] bg-[rgba(255,255,255,0.84)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                    <History size={16} /> Version history
                  </div>
                  {sessionToken && (
                    <SecondaryButton className="px-3 py-2 text-xs" onClick={() => loadSnapshots(sessionToken)}>
                      <RefreshCw size={14} className="mr-2" />
                      Refresh
                    </SecondaryButton>
                  )}
                </div>
                <div className="mt-1 text-xs text-ink-500">Manual snapshots are saved as checkpoints in this shared workspace and expire with the link.</div>
                <div className="mt-4 space-y-3">
                  {loadingSnapshots ? (
                    <div className="rounded-[22px] border border-dashed border-[#eadfce] px-4 py-6 text-sm text-ink-500">
                      Loading snapshots...
                    </div>
                  ) : snapshots.length ? (
                    snapshots.map((snapshot) => (
                      <div key={snapshot.id} className="rounded-[22px] border border-[rgba(126,94,60,0.12)] bg-[rgba(250,245,238,0.92)] px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-sm font-medium text-ink-900">
                              Rev {snapshot.revision} · {snapshot.kind}
                            </div>
                            <div className="mt-1 text-xs text-ink-500">{formatTimestamp(snapshot.createdAt)}</div>
                            {snapshot.note && <div className="mt-1 text-xs text-ink-600">{snapshot.note}</div>}
                          </div>
                          <SecondaryButton
                            className="px-3 py-2 text-xs"
                            onClick={() => restoreSnapshot(snapshot.id)}
                            disabled={restoringSnapshotId === snapshot.id}
                          >
                            {restoringSnapshotId === snapshot.id ? "Restoring..." : "Restore"}
                          </SecondaryButton>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-[rgba(126,94,60,0.18)] px-4 py-6 text-sm text-ink-500">
                      Save a snapshot to start version history for this workspace.
                    </div>
                  )}
                </div>
              </div>
            )}

                </details>

                <div className="mt-5 flex justify-start">
                  <SecondaryButton className="px-5 py-3" onClick={() => setActiveStep(2)}>
                    <ArrowLeft size={15} className="mr-2" />
                    Back to fields
                  </SecondaryButton>
                </div>

                <div className="mt-5 rounded-[24px] border border-[rgba(126,94,60,0.12)] bg-[rgba(255,253,249,0.94)] p-5">
                  <div className="text-sm font-semibold text-ink-900">Final actions</div>
                  <div className="mt-1 text-xs text-ink-500">Generate the file from the reviewed draft, then download it when it is ready.</div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {versioningEnabled && (
                      <SecondaryButton className="px-4 py-2 text-xs" onClick={handleSaveSnapshot}>
                        <Save size={16} className="mr-2" />
                        Save snapshot
                      </SecondaryButton>
                    )}

                    <MetallicButton className="px-5 py-3" onClick={handleGenerate}>
                      <Sparkles size={16} className="mr-2" />
                      {outputFormat === "pdf" ? "Generate PDF" : "Generate document"}
                    </MetallicButton>
                  </div>

                  {downloadLinks[outputFormat] && (
                    <div className="mt-3">
                      <a href={downloadLinks[outputFormat]} target="_blank">
                        <SecondaryButton className="w-full justify-center px-5 py-3">
                          <Download size={16} className="mr-2" />
                          Download {outputFormat.toUpperCase()}
                        </SecondaryButton>
                      </a>
                    </div>
                  )}
                </div>
                  </>
                )}

                {status === "failed" && (
                  <div className="mt-5 flex items-start gap-3 rounded-[24px] border border-[#efcdc9] bg-[#fff4f2] p-4 text-sm text-[#92443c]">
                    <FileWarning size={18} className="mt-0.5" />
                    <div>{errorMessage || "Generation failed."}</div>
                  </div>
                )}
              </div>
        </div>

        <div className="space-y-5 self-start lg:sticky lg:top-28">
          <PreviewPanel
            html={previewHtml}
            status={status === "idle" ? previewStatus : status}
                description={previewDescriptions[activeStep]}
          />
        </div>
      </div>

      {showTemplatePicker && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(30,22,15,0.45)] p-4">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-[28px] border border-[rgba(126,94,60,0.16)] bg-[linear-gradient(180deg,rgba(255,253,249,0.98)_0%,rgba(247,240,231,0.98)_100%)] shadow-[0_26px_80px_rgba(51,35,19,0.18)]">
            <div className="flex items-start justify-between gap-4 border-b border-[rgba(126,94,60,0.12)] px-6 py-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">Choose a template</div>
                <div className="mt-2 text-2xl font-semibold text-ink-900">Switch your document type</div>
                <div className="mt-1 text-sm text-ink-600">Pick another template to restart from a different structure.</div>
              </div>
              <SecondaryButton className="px-3 py-2 text-xs" onClick={() => setShowTemplatePicker(false)}>
                Close
              </SecondaryButton>
            </div>

            <div className="max-h-[calc(85vh-108px)] overflow-y-auto px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {allTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSwitch(template.id)}
                    className={`rounded-[24px] border p-4 text-left transition ${
                      template.id === selectedTemplateId
                        ? "border-[#c89d70] bg-[#fff8ef] shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]"
                        : "border-[rgba(126,94,60,0.12)] bg-white/84 hover:border-[#d9c2a7] hover:bg-white"
                    }`}
                  >
                    <div className="text-xs font-medium uppercase tracking-[0.16em] text-[#9b7750]">{template.category}</div>
                    <div className="mt-2 text-base font-semibold text-ink-900">{template.name}</div>
                    <div className="mt-2 text-sm leading-6 text-ink-600">{template.description}</div>
                    <div className="mt-4 text-xs text-ink-500">{template.fields.length} fields</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
