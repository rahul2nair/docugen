"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MetallicButton, SecondaryButton } from "@/components/buttons";
import { savePersistedTemplate } from "@/lib/persisted-user-data-client";
import { ensureWorkspaceSession, getStoredWorkspaceSessionToken, setStoredWorkspaceSessionToken } from "@/lib/workspace-session-client";

interface GeneratedField {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "number";
  required: boolean;
}

interface PersonalTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  supportedOutputs: Array<"html" | "pdf">;
  fields: GeneratedField[];
  content: string;
}

interface SmartDetectionResult {
  text: string;
  labels: string[];
}

type ImportStep = 1 | 2 | 3;

const SOURCE_TEXT_PLACEHOLDER = "Service Agreement between [Client Name] and [Provider Name].\n\nProject starts on [Start Date] and total fee is [Project Fee].";

function toKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function toLabel(key: string) {
  return key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function guessFieldType(key: string): "text" | "textarea" | "date" | "number" {
  if (/(date|deadline|due)/.test(key)) return "date";
  if (/(amount|price|rate|fee|hours|qty|quantity|total|percent)/.test(key)) return "number";
  return "text";
}

function replaceLabelValueLines(input: string) {
  const detectedLabels: string[] = [];

  const text = input.replace(
    /(^|\n)([A-Za-z][A-Za-z &/()#.-]{2,40}?)(\s*:\s*)([^\n]+)(?=\n|$)/g,
    (match, prefix, rawLabel, separator, rawValue) => {
      if (/{{|\[[^\]]+\]/.test(rawValue)) {
        return match;
      }

      const label = String(rawLabel).trim();
      const value = String(rawValue).trim();
      const key = toKey(label);

      if (!key || value.length < 2 || value.length > 80) {
        return match;
      }

      detectedLabels.push(label);
      return `${prefix}${label}${separator}{{${key}}}`;
    }
  );

  return { text, labels: detectedLabels };
}

function replaceSentenceFields(input: string) {
  const detectedLabels: string[] = [];
  const labelPattern = [
    "client name",
    "provider name",
    "company name",
    "candidate name",
    "employee name",
    "customer name",
    "job title",
    "manager name",
    "start date",
    "effective date",
    "due date",
    "project fee",
    "total fee",
    "amount",
    "salary"
  ].join("|");

  const text = input.replace(
    new RegExp(`\\b(${labelPattern})\\b(\\s*(?:is|are|=|:)\\s*)([^.,;\\n]{2,60})`, "gi"),
    (match, rawLabel, separator, rawValue) => {
      if (/{{|\[[^\]]+\]/.test(rawValue)) {
        return match;
      }

      const label = String(rawLabel).trim();
      const key = toKey(label);

      if (!key) {
        return match;
      }

      detectedLabels.push(label);
      return `${label}${separator}{{${key}}}`;
    }
  );

  return { text, labels: detectedLabels };
}

function runSmartPlaceholderDetection(input: string): SmartDetectionResult {
  const lineDetection = replaceLabelValueLines(input);
  const sentenceDetection = replaceSentenceFields(lineDetection.text);

  return {
    text: sentenceDetection.text,
    labels: Array.from(new Set([...lineDetection.labels, ...sentenceDetection.labels]))
  };
}

function convertToHtml(content: string) {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!paragraphs.length) return "";

  return `<section>\n${paragraphs
    .map(
      (paragraph) =>
        `  <p style=\"font-size:16px;line-height:1.7;color:#302720;white-space:pre-wrap;\">${paragraph}</p>`
    )
    .join("\n")}\n</section>`;
}

function sameKeys(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

interface Props {
  initialSessionToken?: string;
}

export function TemplateImporter({ initialSessionToken }: Props) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<ImportStep>(1);
  const [templateName, setTemplateName] = useState("Imported Template");
  const [templateCategory, setTemplateCategory] = useState("Operations");
  const [sourceText, setSourceText] = useState("");
  const [copied, setCopied] = useState<"content" | "json" | "">("");
  const [copyError, setCopyError] = useState<string>("");
  const [excludedFieldKeys, setExcludedFieldKeys] = useState<string[]>([]);
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [uploadMessage, setUploadMessage] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");
  const [detectionMessage, setDetectionMessage] = useState<string>("");
  const [sessionToken, setSessionToken] = useState<string>(() => initialSessionToken || getStoredWorkspaceSessionToken());
  const [sessionError, setSessionError] = useState<string>("");
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);

  const conversion = useMemo(() => {
    const explicitVars = new Set<string>();

    sourceText.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, varName) => {
      explicitVars.add(toKey(varName));
      return "";
    });

    const contentWithVars = sourceText.replace(/\[([^\]\n]{1,60})\]/g, (_, rawLabel) => {
      const key = toKey(rawLabel);
      if (!key) return `[${rawLabel}]`;
      explicitVars.add(key);
      return `{{${key}}}`;
    });

    const fields: GeneratedField[] = Array.from(explicitVars)
      .filter(Boolean)
      .sort()
      .map((key) => ({
        key,
        label: toLabel(key),
        type: guessFieldType(key),
        required: true
      }));

    const excludedSet = new Set(excludedFieldKeys);
    const activeFields = fields.filter((field) => !excludedSet.has(field.key));
    const fallbackLabelByKey = new Map(fields.map((field) => [field.key, field.label]));
    const templateId = toKey(templateName) || "imported_template";

    const normalizedContent = contentWithVars.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, rawKey) => {
      const key = toKey(rawKey);
      if (!key || !excludedSet.has(key)) {
        return `{{${key || rawKey}}}`;
      }

      return fallbackLabelByKey.get(key) || rawKey;
    });

    const content = convertToHtml(normalizedContent);
    const templateObject: PersonalTemplate = {
      id: templateId,
      name: templateName || "Imported Template",
      description: "Template converted from imported text.",
      category: templateCategory || "Operations",
      supportedOutputs: ["html", "pdf"],
      fields: activeFields,
      content
    };

    return {
      fields,
      activeFields,
      content,
      templateObject,
      templateJson: JSON.stringify(templateObject, null, 2)
    };
  }, [excludedFieldKeys, sourceText, templateCategory, templateName]);

  const detectedKeys = useMemo(
    () => new Set(conversion.fields.map((field) => field.key)),
    [conversion.fields]
  );

  useEffect(() => {
    setExcludedFieldKeys((current) => {
      const next = current.filter((key) => detectedKeys.has(key));
      return sameKeys(current, next) ? current : next;
    });
  }, [detectedKeys]);

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
        setSessionError("");
        router.replace(`/workspace/import?s=${encodeURIComponent(resolved.token)}`);
      } catch (error) {
        if (!cancelled) {
          setSessionError(error instanceof Error ? error.message : "Unable to create workspace session");
        }
      }
    }

    void ensureSession();

    return () => {
      cancelled = true;
    };
  }, [router, sessionToken]);

  async function copy(kind: "content" | "json", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyError("");
      setCopied(kind);
      setTimeout(() => setCopied(""), 1200);
    } catch {
      setCopyError("Clipboard access was blocked. You can still select and copy the text manually.");
    }
  }

  function downloadTemplateJson() {
    const blob = new Blob([conversion.templateJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${toKey(templateName) || "imported_template"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function saveAsPersonalTemplate() {
    setIsSavingTemplate(true);

    try {
      const result = await savePersistedTemplate(sessionToken || "", conversion.templateObject);

      setSaveMessage(
        result.synced
          ? `Saved \"${conversion.templateObject.name}\" to My Templates and synced it to this workspace session.`
          : `Saved \"${conversion.templateObject.name}\" to My Templates locally. It will still appear in Workspace on this browser.`
      );
    } catch {
      setSaveMessage("Could not save template. You can still download the JSON from Advanced review.");
    } finally {
      setIsSavingTemplate(false);
    }
  }

  function removeDetectedField(key: string) {
    setExcludedFieldKeys((current) => (current.includes(key) ? current : [...current, key]));
  }

  function restoreDetectedField(key: string) {
    setExcludedFieldKeys((current) => current.filter((item) => item !== key));
  }

  function applySmartDetection() {
    const normalized = sourceText.trim();

    if (!normalized) {
      setDetectionMessage("Paste or upload a document first.");
      return;
    }

    const smartDetection = runSmartPlaceholderDetection(normalized);
    setSourceText(smartDetection.text);
    setDetectionMessage(
      smartDetection.labels.length
        ? `Smart detection suggested ${smartDetection.labels.length} field${smartDetection.labels.length === 1 ? "" : "s"}: ${smartDetection.labels.slice(0, 4).join(", ")}${smartDetection.labels.length > 4 ? ", ..." : ""}`
        : "No obvious variable fields were detected automatically. Add [Placeholders] for anything the app should turn into a field."
    );
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const supported = new Set(["txt", "md", "markdown", "html", "htm", "json", "csv", "rtf"]);

    if (!supported.has(ext)) {
      setUploadError("Unsupported file type. Upload .txt, .md, .html, .rtf, .csv, or .json. For .docx/.pdf, export to .txt first.");
      setUploadMessage("");
      setDetectionMessage("");
      event.target.value = "";
      return;
    }

    try {
      const raw = await file.text();
      const text = ext === "html" || ext === "htm"
        ? new DOMParser().parseFromString(raw, "text/html").body.textContent || ""
        : raw;

      const normalized = text.replace(/\r\n/g, "\n").trim();
      if (!normalized) {
        setUploadError("The uploaded file looks empty.");
        setUploadMessage("");
        setDetectionMessage("");
        event.target.value = "";
        return;
      }

      const smartDetection = runSmartPlaceholderDetection(normalized);
      setSourceText(smartDetection.text);
      setUploadError("");
      setUploadMessage(`Loaded ${file.name}. Review the detected fields before saving.`);
      setDetectionMessage(
        smartDetection.labels.length
          ? `Smart detection suggested ${smartDetection.labels.length} field${smartDetection.labels.length === 1 ? "" : "s"}: ${smartDetection.labels.slice(0, 4).join(", ")}${smartDetection.labels.length > 4 ? ", ..." : ""}`
          : "No obvious variable fields were detected automatically. Add [Placeholders] where the document should vary."
      );
      setActiveStep(2);
      event.target.value = "";
    } catch {
      setUploadError("Could not read this file. Try exporting it to plain text and upload again.");
      setUploadMessage("");
      setDetectionMessage("");
      event.target.value = "";
    }
  }

  function handleContinueToReview() {
    if (!sourceText.trim()) {
      setUploadError("Upload or paste a document before continuing.");
      return;
    }

    setUploadError("");
    applySmartDetection();
    setActiveStep(2);
  }

  function handleStepChange(step: ImportStep) {
    if (step === 1) {
      setActiveStep(1);
      return;
    }

    if (!sourceText.trim()) {
      setUploadError("Upload or paste a document before continuing.");
      setActiveStep(1);
      return;
    }

    if (step === 3 && conversion.activeFields.length === 0) {
      setDetectionMessage("No editable fields were detected yet. Add placeholders or review the source text first.");
      setActiveStep(2);
      return;
    }

    setActiveStep(step);
  }

  return (
    <section className="page-shell py-10">
      <div className="mb-6">
        <div className="text-sm font-medium uppercase tracking-[0.18em] text-[#8f6a44]">Template Import</div>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">Upload an existing document and turn it into a reusable template</h2>
        <p className="mt-1 text-sm text-ink-600">Upload the document, review the detected fields, and save the template. Everything else stays out of the way.</p>
      </div>

      {sessionError ? (
        <div className="mb-5 rounded-[20px] border border-[#efcdc9] bg-[#fff4f2] px-4 py-3 text-sm text-[#92443c]">
          {sessionError}
        </div>
      ) : null}

      {copyError ? (
        <div className="mb-5 rounded-[20px] border border-[#efcdc9] bg-[#fff4f2] px-4 py-3 text-sm text-[#92443c]">
          {copyError}
        </div>
      ) : null}

      {saveMessage ? (
        <div className="mb-5 rounded-[20px] border border-[#d6ead8] bg-[#f4fff5] px-4 py-3 text-sm text-[#2b5d34]">
          {saveMessage}
        </div>
      ) : null}

      {uploadMessage ? (
        <div className="mb-5 rounded-[20px] border border-[#d6ead8] bg-[#f4fff5] px-4 py-3 text-sm text-[#2b5d34]">
          {uploadMessage}
        </div>
      ) : null}

      {uploadError ? (
        <div className="mb-5 rounded-[20px] border border-[#efcdc9] bg-[#fff4f2] px-4 py-3 text-sm text-[#92443c]">
          {uploadError}
        </div>
      ) : null}

      {detectionMessage ? (
        <div className="mb-5 rounded-[20px] border border-[#e5dac8] bg-[#fffaf3] px-4 py-3 text-sm text-ink-700">
          {detectionMessage}
        </div>
      ) : null}

      <div className="mb-5 glass-panel border-[rgba(126,94,60,0.12)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          {([
            { id: 1, label: "Upload" },
            { id: 2, label: "Review fields" },
            { id: 3, label: "Save template" }
          ] as const).map((step) => {
            const isActive = activeStep === step.id;
            const isComplete = activeStep > step.id;

            return (
              <button
                key={step.id}
                onClick={() => handleStepChange(step.id)}
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
        <div className="mt-3 text-sm text-ink-600">
          {activeStep === 1
            ? "Start by uploading the source document or pasting its text."
            : activeStep === 2
              ? "Review the detected fields and remove anything that should stay static."
              : "Name the template, save it to your library, and open it in Workspace when ready."}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          {activeStep === 1 ? (
            <div className="glass-panel p-5">
              <div className="text-sm font-semibold text-ink-900">1. Upload the source document</div>
              <div className="mt-1 text-xs text-ink-500">Upload a plain-text version of the document. If you prefer, you can also paste the source manually.</div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-ink-700">Upload file</label>
                <input
                  type="file"
                  accept=".txt,.md,.markdown,.html,.htm,.rtf,.csv,.json"
                  onChange={handleFileUpload}
                  className="w-full rounded-[22px] border border-[#eadfce] bg-white/85 px-4 py-3 text-sm outline-none file:mr-3 file:rounded-full file:border-0 file:bg-[#fff3e1] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#8d6334]"
                />
                <div className="mt-2 text-xs text-ink-500">Accepted types: .txt, .md, .html, .rtf, .csv, .json. For Word or PDF, export to plain text first.</div>
              </div>

              <details className="mt-5 rounded-[24px] border border-[rgba(126,94,60,0.12)] bg-[rgba(255,255,255,0.8)] p-4">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-ink-900">Paste or edit source manually</div>
                      <div className="mt-1 text-xs text-ink-500">Use this only if the uploaded text needs cleanup or you want to paste the document yourself.</div>
                    </div>
                    <div className="rounded-full border border-[#eadfce] bg-[#f9f4ed] px-3 py-1 text-[11px] font-medium text-ink-600">Optional</div>
                  </div>
                </summary>
                <div className="mt-4">
                  <textarea
                    value={sourceText}
                    onChange={(event) => setSourceText(event.target.value)}
                    rows={16}
                    className="h-[40vh] min-h-[280px] max-h-[640px] w-full resize-y rounded-[24px] border border-[#eadfce] bg-white/85 px-4 py-4 text-sm leading-6 outline-none"
                    placeholder={SOURCE_TEXT_PLACEHOLDER}
                  />
                </div>
              </details>

              <div className="mt-5 flex justify-end gap-3">
                <SecondaryButton className="px-5 py-3" onClick={applySmartDetection}>
                  Run smart detection
                </SecondaryButton>
                <MetallicButton className="px-5 py-3" onClick={handleContinueToReview}>
                  Review detected fields
                </MetallicButton>
              </div>
            </div>
          ) : null}

          {activeStep === 2 ? (
            <div className="glass-panel p-5">
              <div className="text-sm font-semibold text-ink-900">2. Review detected fields</div>
              <div className="mt-1 text-xs text-ink-500">Keep the fields that should stay editable. Remove anything that should remain fixed text.</div>

              <div className="mt-4 rounded-[20px] border border-[rgba(126,94,60,0.12)] bg-white/82 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f6a44]">Detected</div>
                <div className="mt-1 text-sm font-semibold text-ink-900">{conversion.activeFields.length} active field{conversion.activeFields.length === 1 ? "" : "s"}</div>
              </div>

              <div className="mt-4 space-y-2">
                {conversion.activeFields.length ? (
                  conversion.activeFields.map((field) => (
                    <div key={field.key} className="flex items-center justify-between gap-3 rounded-[16px] border border-[#eadfce] bg-white/90 px-3 py-3">
                      <div>
                        <div className="text-sm font-medium text-ink-900">{field.label}</div>
                        <div className="text-xs text-ink-500">{field.key} · {field.type}</div>
                      </div>
                      <SecondaryButton className="px-3 py-2 text-xs" onClick={() => removeDetectedField(field.key)}>
                        Remove
                      </SecondaryButton>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[16px] border border-dashed border-[#eadfce] bg-white/70 px-3 py-4 text-sm text-ink-600">
                    No fields are active yet. Add placeholders in the source text or rerun smart detection.
                  </div>
                )}
              </div>

              {excludedFieldKeys.length ? (
                <div className="mt-4 rounded-[16px] border border-dashed border-[#eadfce] bg-white/70 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f6a44]">Removed fields</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {excludedFieldKeys.map((key) => {
                      const field = conversion.fields.find((item) => item.key === key);
                      return (
                        <button
                          key={key}
                          onClick={() => restoreDetectedField(key)}
                          className="rounded-full border border-[#eadfce] bg-white px-3 py-1 text-xs text-ink-700 transition hover:bg-[#fff8ee]"
                        >
                          Restore {field?.label || key}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="mt-5 flex justify-between gap-3">
                <SecondaryButton className="px-5 py-3" onClick={() => setActiveStep(1)}>
                  Back
                </SecondaryButton>
                <MetallicButton className="px-5 py-3" onClick={() => setActiveStep(3)}>
                  Continue to save
                </MetallicButton>
              </div>
            </div>
          ) : null}

          {activeStep === 3 ? (
            <div className="glass-panel p-5">
              <div className="text-sm font-semibold text-ink-900">3. Save the template</div>
              <div className="mt-1 text-xs text-ink-500">Name the template, choose a category, and save it to My Templates.</div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Template name</label>
                  <input
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                    className="w-full rounded-[22px] border border-[#eadfce] bg-white/85 px-4 py-3 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Category</label>
                  <input
                    value={templateCategory}
                    onChange={(event) => setTemplateCategory(event.target.value)}
                    className="w-full rounded-[22px] border border-[#eadfce] bg-white/85 px-4 py-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <SecondaryButton className="px-5 py-3" onClick={() => setActiveStep(2)}>
                  Back to fields
                </SecondaryButton>
                <MetallicButton className="px-5 py-3" onClick={saveAsPersonalTemplate} disabled={isSavingTemplate}>
                  {isSavingTemplate ? "Saving..." : "Save to My Templates"}
                </MetallicButton>
              </div>

              <div className="mt-5 text-xs text-ink-500">
                Saved templates appear in Workspace under My Templates.
                <a className="ml-1 font-semibold text-[#8d6334] hover:text-[#6f4f2c]" href={sessionToken ? `/workspace?s=${encodeURIComponent(sessionToken)}` : "/workspace"}>Open Workspace</a>
              </div>

              <details className="mt-5 rounded-[24px] border border-[rgba(126,94,60,0.12)] bg-[rgba(255,255,255,0.8)] p-4">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-ink-900">Advanced review</div>
                      <div className="mt-1 text-xs text-ink-500">Open this only if you want to inspect the raw source, converted template content, or JSON export.</div>
                    </div>
                    <div className="rounded-full border border-[#eadfce] bg-[#f9f4ed] px-3 py-1 text-[11px] font-medium text-ink-600">Optional</div>
                  </div>
                </summary>

                <div className="mt-4 space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-ink-900">Source text</div>
                      <SecondaryButton className="px-3 py-2 text-xs" onClick={applySmartDetection}>
                        Rerun detection
                      </SecondaryButton>
                    </div>
                    <textarea
                      value={sourceText}
                      onChange={(event) => setSourceText(event.target.value)}
                      rows={12}
                      className="w-full rounded-[24px] border border-[#eadfce] bg-white/85 px-4 py-4 text-sm leading-6 outline-none"
                      placeholder={SOURCE_TEXT_PLACEHOLDER}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-ink-900">Converted template content</div>
                      <SecondaryButton className="px-3 py-2 text-xs" onClick={() => copy("content", conversion.content)}>
                        {copied === "content" ? "Copied" : "Copy content"}
                      </SecondaryButton>
                    </div>
                    <pre className="mt-3 max-h-[240px] overflow-auto whitespace-pre-wrap break-words rounded-[18px] border border-[#eadfce] bg-white/90 p-3 text-xs leading-6 text-ink-700">{conversion.content}</pre>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-ink-900">Full template JSON</div>
                      <div className="flex gap-2">
                        <SecondaryButton className="px-3 py-2 text-xs" onClick={() => copy("json", conversion.templateJson)}>
                          {copied === "json" ? "Copied" : "Copy JSON"}
                        </SecondaryButton>
                        <SecondaryButton className="px-3 py-2 text-xs" onClick={downloadTemplateJson}>
                          Download JSON
                        </SecondaryButton>
                      </div>
                    </div>
                    <pre className="mt-3 max-h-[260px] overflow-auto whitespace-pre-wrap break-words rounded-[18px] border border-[#eadfce] bg-white/90 p-3 text-xs leading-6 text-ink-700">{conversion.templateJson}</pre>
                  </div>
                </div>
              </details>
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <div className="glass-panel p-5">
            <div className="text-sm font-semibold text-ink-900">Detected fields</div>
            <div className="mt-1 text-xs text-ink-500">These are the editable parts the importer found in the document.</div>
            <div className="mt-3 rounded-[18px] border border-[rgba(126,94,60,0.12)] bg-white/85 px-4 py-3 text-sm font-semibold text-ink-900">
              {conversion.activeFields.length} field{conversion.activeFields.length === 1 ? "" : "s"} ready
            </div>
            <div className="mt-3 space-y-2">
              {conversion.activeFields.length ? (
                conversion.activeFields.slice(0, 6).map((field) => (
                  <div key={field.key} className="rounded-[16px] border border-[#eadfce] bg-white/90 px-3 py-2">
                    <div className="text-sm font-medium text-ink-900">{field.label}</div>
                    <div className="text-xs text-ink-500">{field.key}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-[16px] border border-dashed border-[#eadfce] bg-white/70 px-3 py-4 text-sm text-ink-600">
                  Upload a document or paste the source text to start detection.
                </div>
              )}
              {conversion.activeFields.length > 6 ? (
                <div className="text-xs text-ink-500">+ {conversion.activeFields.length - 6} more fields in the review step</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
