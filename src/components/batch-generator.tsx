"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileJson,
  FileSpreadsheet,
  FileText,
  Info,
  UploadCloud
} from "lucide-react";
import { MetallicButton, SecondaryButton } from "@/components/buttons";
import {
  analyzeBatchRows,
  applyBatchFieldSuggestion,
  createBatchExampleInput,
  type BatchInputFormat,
  type BatchValidationIssue
} from "@/lib/batch-input";
import { ensureWorkspaceSession, getStoredWorkspaceSessionToken, setStoredWorkspaceSessionToken } from "@/lib/workspace-session-client";
import type { BuiltinTemplate, BuiltinTemplatePreview } from "@/server/templates";

interface Props {
  templates: BuiltinTemplate[];
  templatePreviews: BuiltinTemplatePreview[];
  initialSessionToken?: string;
  hasPaidAccess?: boolean;
}

type WizardStep = 0 | 1 | 2 | 3;

const STEPS: Array<{ id: WizardStep; title: string; summary: string }> = [
  { id: 0, title: "Template", summary: "Choose a template and review its fields" },
  { id: 1, title: "Format", summary: "Pick the input file format and structure" },
  { id: 2, title: "Upload", summary: "Upload one file and validate it" },
  { id: 3, title: "Review", summary: "Preview rows, set output, and queue" }
];

function uniqueIssues(issues: BatchValidationIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.row || 0}:${issue.field || ""}:${issue.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function formatBadge(format: BatchInputFormat) {
  return format.toUpperCase();
}

export function BatchGenerator({ templates, templatePreviews, initialSessionToken, hasPaidAccess = false }: Props) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>(0);
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id || "");
  const [inputFormat, setInputFormat] = useState<BatchInputFormat>("csv");
  const [fileContent, setFileContent] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [outputFormat, setOutputFormat] = useState<"html" | "pdf">("pdf");
  const [pdfFormat, setPdfFormat] = useState<"A4" | "Letter">("A4");
  const [pdfMargin, setPdfMargin] = useState<"normal" | "narrow">("normal");
  const [sessionToken, setSessionToken] = useState<string>(() => initialSessionToken || getStoredWorkspaceSessionToken());
  const [saveToMyFiles, setSaveToMyFiles] = useState<boolean>(hasPaidAccess);
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [showQueueDialog, setShowQueueDialog] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [uploadMessage, setUploadMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === templateId) || templates[0],
    [templateId, templates]
  );
  const previewMap = useMemo(() => new Map(templatePreviews.map((preview) => [preview.id, preview.html])), [templatePreviews]);

  const requiredFields = useMemo(
    () => (selectedTemplate?.fields || []).filter((field) => field.required !== false),
    [selectedTemplate]
  );
  const optionalFields = useMemo(
    () => (selectedTemplate?.fields || []).filter((field) => field.required === false),
    [selectedTemplate]
  );

  const exampleInput = useMemo(() => {
    return createBatchExampleInput(inputFormat, selectedTemplate?.fields || []);
  }, [inputFormat, selectedTemplate]);

  const analysis = useMemo(() => {
    const nextAnalysis = analyzeBatchRows(fileContent, inputFormat, selectedTemplate?.fields || []);
    const blockingIssues = uniqueIssues(nextAnalysis.issues.filter((issue) => issue.code !== "unknown_field"));
    const warningIssues = uniqueIssues(nextAnalysis.issues.filter((issue) => issue.code === "unknown_field"));
    const previewRows = nextAnalysis.rows.slice(0, 5).map((row, index) => {
      const rowIssues = nextAnalysis.issues.filter((issue) => issue.row === index + 1);
      return { row, rowIssues, rowNumber: index + 1 };
    });

    return {
      ...nextAnalysis,
      blockingIssues,
      warningIssues,
      previewRows,
      hiddenRowCount: Math.max(nextAnalysis.rows.length - previewRows.length, 0),
      canQueue: Boolean(fileContent.trim()) && blockingIssues.length === 0 && nextAnalysis.rows.length > 0 && nextAnalysis.rows.length <= 25
    };
  }, [fileContent, inputFormat, selectedTemplate]);

  const acceptValue = inputFormat === "csv" ? ".csv,text/csv" : inputFormat === "txt" ? ".txt,text/plain" : ".json,application/json";

  const formatGuide = useMemo(() => {
    if (inputFormat === "csv") {
      return {
        title: "CSV format",
        summary: "Use the first row as headers. Every following row becomes one document.",
        rules: [
          "Header names should match the field keys listed for the selected template.",
          "One data row equals one generated document.",
          "Quoted values are supported for commas and line breaks inside a cell."
        ],
        icon: FileSpreadsheet,
        example: exampleInput
      };
    }

    if (inputFormat === "txt") {
      return {
        title: "TXT format",
        summary: "Use key: value pairs, with one record per blank-line-separated block.",
        rules: [
          "Each block becomes one generated document.",
          "Keys should match the field keys listed for the selected template.",
          "Multi-line values are allowed by continuing on the next line after a key."
        ],
        icon: FileText,
        example: exampleInput
      };
    }

    return {
      title: "JSON format",
      summary: "Upload a JSON array of objects, where each object is one document row.",
      rules: [
        "Top-level value must be an array, not a single object.",
        "Each object key should match the field keys listed for the selected template.",
        "Every object becomes one generated document."
      ],
      icon: FileJson,
      example: exampleInput
    };
  }, [exampleInput, inputFormat]);

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
        router.replace(`/workspace/batch?s=${encodeURIComponent(resolved.token)}`);
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

  function resetMessages() {
    setErrorMessage("");
    setUploadMessage("");
  }

  async function processUploadedFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (ext !== inputFormat) {
      setErrorMessage(`Selected format is ${formatBadge(inputFormat)}, but the uploaded file is .${ext || "unknown"}. Switch the format first or upload a .${inputFormat} file.`);
      setUploadMessage("");
      return;
    }

    try {
      const raw = (await file.text()).replace(/\r\n/g, "\n").trim();
      if (!raw) {
        throw new Error("The uploaded file looks empty.");
      }

      setFileContent(raw);
      setUploadedFileName(file.name);
      setQueuedCount(0);
      setShowQueueDialog(false);
      setErrorMessage("");
      setUploadMessage(`Loaded ${file.name}. Continue to review the parsed rows and validation results.`);
      setCurrentStep(3);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not read this file.");
      setUploadMessage("");
    }
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await processUploadedFile(file);
    event.target.value = "";
  }

  async function handleFileDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingFile(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    await processUploadedFile(file);
  }

  function clearUploadedFile() {
    setFileContent("");
    setUploadedFileName("");
    setQueuedCount(0);
    setShowQueueDialog(false);
    resetMessages();
    setCurrentStep(2);
  }

  function handleDownloadSample() {
    const content = createBatchExampleInput(inputFormat, selectedTemplate?.fields || []);
    const blob = new Blob([content], {
      type: inputFormat === "csv" ? "text/csv;charset=utf-8" : inputFormat === "json" ? "application/json;charset=utf-8" : "text/plain;charset=utf-8"
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${selectedTemplate?.id || "template"}-sample.${inputFormat}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  function handleApplySuggestion(issue: BatchValidationIssue) {
    if (!issue.field || !issue.suggestion || !fileContent.trim()) {
      return;
    }

    try {
      const nextContent = applyBatchFieldSuggestion(fileContent, inputFormat, issue.field, issue.suggestion);
      if (nextContent === fileContent) {
        setErrorMessage(`No matching field named "${issue.field}" was found in the uploaded ${formatBadge(inputFormat)} file.`);
        return;
      }

      setFileContent(nextContent);
      setErrorMessage("");
      setUploadMessage(`Renamed "${issue.field}" to "${issue.suggestion}" in the uploaded ${formatBadge(inputFormat)} file.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not apply the suggested field fix.");
    }
  }

  function handleNextStep() {
    if (currentStep === 2 && !uploadedFileName) {
      setErrorMessage("Upload a file before moving to review.");
      return;
    }

    resetMessages();
    setCurrentStep((step) => Math.min(step + 1, 3) as WizardStep);
  }

  function handlePreviousStep() {
    resetMessages();
    setCurrentStep((step) => Math.max(step - 1, 0) as WizardStep);
  }

  async function handleQueueBatch() {
    setErrorMessage("");
    setQueuedCount(0);
    setShowQueueDialog(false);

    if (!analysis.canQueue) {
      setErrorMessage(
        analysis.rows.length > 25
          ? "A batch can include up to 25 rows at a time. Split larger files into smaller uploads."
          : analysis.blockingIssues[0]?.message || "Upload a valid batch file before queueing."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        sessionToken: sessionToken.trim() || undefined,
        saveToMyFiles,
        requests: analysis.rows.map((data) => ({
          mode: "template_fill",
          templateSource: {
            type: "builtin",
            templateId
          },
          data,
          outputs: Array.from(new Set(["html", outputFormat])),
          options: {
            pdf: {
              format: pdfFormat,
              margin: pdfMargin
            }
          }
        }))
      };

      const response = await fetch("/api/v1/generations/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error?.message || "Unable to queue batch");
      }

      const queuedJobs = (body.jobIds || []).length;
      setQueuedCount(queuedJobs);
      setShowQueueDialog(queuedJobs > 0);
      if (queuedJobs > 0) {
        setUploadMessage(
          saveToMyFiles
            ? `Queued ${queuedJobs} document request${queuedJobs === 1 ? "" : "s"}. Track progress in Activity and collect finished files in My Files.`
            : `Queued ${queuedJobs} document request${queuedJobs === 1 ? "" : "s"}. Track progress in Activity. Files are not being saved to My Files for this run.`
        );
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to queue batch");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canAdvance = currentStep === 0 || currentStep === 1 || (currentStep === 2 ? Boolean(uploadedFileName) : false);
  const nextLabel = currentStep === 2 ? "Review file" : "Next";
  const GuideIcon = formatGuide.icon;
  const totalIssues = analysis.blockingIssues.length + analysis.warningIssues.length;
  const reviewStatusLabel = analysis.rows.length > 25
    ? "Over the 25-row limit"
    : analysis.canQueue
      ? "Ready to queue"
      : totalIssues
        ? `${totalIssues} item${totalIssues === 1 ? "" : "s"} to review`
        : "Needs review";
  const activityHref = `/workspace/activity${sessionToken ? `?s=${encodeURIComponent(sessionToken)}` : ""}`;

  return (
    <section className="page-shell py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="max-w-4xl">
          <div className="text-sm font-medium uppercase tracking-[0.18em] text-[#2563eb]">Batch Generator</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Queue many documents without building the file structure by guesswork</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">This flow keeps the user on one route but moves one decision at a time: choose a template, pick a format, upload the file, review the mapping, then queue the batch. Each upload can include up to 25 rows.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="glass-panel p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2563eb]">Wizard progress</div>
            <div className="mt-4 space-y-3">
              {STEPS.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left transition ${
                      isActive
                        ? "border-[#c9ab86] bg-[linear-gradient(180deg,#fff8ee_0%,#f4eadb_100%)] shadow-soft"
                        : isCompleted
                          ? "border-[#d8ead9] bg-[#f5fff6]"
                          : "border-[#dbe4f0] bg-white/80"
                    }`}
                  >
                    <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${isCompleted ? "bg-emerald-600 text-white" : isActive ? "bg-[#2563eb] text-white" : "bg-[#f3eadf] text-[#2563eb]"}`}>
                      {isCompleted ? "✓" : index + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">{step.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-600">{step.summary}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="glass-panel p-6">
            {currentStep === 0 ? (
              <div className="space-y-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2563eb]">Step 1</div>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Choose the template first</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">The uploaded file structure depends entirely on this selection, so users should lock the template before preparing or uploading anything.</p>
                </div>

                <div>
                  <div className="mb-2 block text-sm font-medium text-slate-700">Template</div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {templates.map((template) => {
                      const isSelected = template.id === templateId;

                      return (
                        <button
                          key={template.id}
                          onClick={() => {
                            setTemplateId(template.id);
                            setQueuedCount(0);
                            setShowQueueDialog(false);
                            resetMessages();
                          }}
                          className={`overflow-hidden rounded-2xl border text-left transition ${
                            isSelected
                              ? "border-[#c9ab86] bg-[linear-gradient(180deg,#fff8ee_0%,#f4eadb_100%)] shadow-soft"
                              : "border-[#dbe4f0] bg-white/80 hover:bg-white"
                          }`}
                        >
                          <div className="border-b border-[#dbe4f0] bg-[#eff6ff] p-2">
                            <iframe
                              title={`${template.name} preview`}
                              srcDoc={previewMap.get(template.id) || ""}
                              className="h-[210px] w-full rounded-lg border-0 bg-white"
                              sandbox=""
                            />
                          </div>
                          <div className="p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-xs font-medium uppercase tracking-[0.16em] text-[#3b82f6]">{template.category}</div>
                              <div className="text-[11px] text-slate-500">{template.supportedOutputs.join(" • ").toUpperCase()}</div>
                            </div>
                            <div className="mt-2 text-base font-semibold text-slate-900">{template.name}</div>
                            <div className="mt-2 text-sm leading-6 text-slate-600">{template.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#dbe4f0] bg-white/75 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{selectedTemplate?.name}</div>
                      <div className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{selectedTemplate?.description}</div>
                    </div>
                    <div className="rounded-full border border-[#dbe4f0] bg-[#f8fafc] px-3 py-1 text-xs font-medium text-slate-700">
                      {requiredFields.length} required{optionalFields.length ? ` • ${optionalFields.length} optional` : ""}
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><CheckCircle2 size={16} className="text-emerald-600" /> Fields to include in the file</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {requiredFields.map((field) => (
                        <div key={field.key} className="rounded-full border border-[#d9eadc] bg-[#f5fff6] px-3 py-2 text-xs font-medium text-slate-800">
                          {field.label}
                          <span className="ml-2 text-slate-500">{field.key}</span>
                        </div>
                      ))}
                      {optionalFields.map((field) => (
                        <div key={field.key} className="rounded-full border border-[#dbe4f0] bg-[#f8fafc] px-3 py-2 text-xs font-medium text-slate-700">
                          {field.label}
                          <span className="ml-2 text-slate-500">optional</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {currentStep === 1 ? (
              <div className="space-y-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2563eb]">Step 2</div>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Choose the file format</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Users should see one format at a time with the exact structure expected for the selected template.</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {(["csv", "txt", "json"] as const).map((format) => {
                    const Icon = format === "csv" ? FileSpreadsheet : format === "txt" ? FileText : FileJson;
                    return (
                      <button
                        key={format}
                        onClick={() => {
                          setInputFormat(format);
                          setUploadedFileName("");
                          setFileContent("");
                          setQueuedCount(0);
                          setShowQueueDialog(false);
                          resetMessages();
                        }}
                        className={`min-w-[170px] rounded-2xl border px-4 py-4 text-left transition ${
                          inputFormat === format
                            ? "border-[#c9ab86] bg-[linear-gradient(180deg,#fff8ee_0%,#f4eadb_100%)] shadow-soft"
                            : "border-[#dbe4f0] bg-white/75 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <Icon size={16} />
                          {formatBadge(format)}
                        </div>
                        <div className="mt-2 text-xs leading-5 text-slate-600">
                          {format === "csv" ? "Spreadsheet rows with headers" : format === "txt" ? "Plain text blocks with key/value pairs" : "Structured array of objects"}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
                  <div className="rounded-2xl border border-[#dbe4f0] bg-white/75 p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><GuideIcon size={16} /> {formatGuide.title}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">{formatGuide.summary}</div>
                    <div className="mt-4 rounded-xl border border-[#efe5d7] bg-[#f8fafc] px-4 py-3 text-sm leading-6 text-slate-700">
                      {formatGuide.rules[0]}
                      {formatGuide.rules[1] ? <div className="mt-1 text-xs text-slate-500">{formatGuide.rules[1]}</div> : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#dbe4f0] bg-[#fffdfa] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Expected structure</div>
                        <div className="mt-2 text-xs text-slate-500">Use these exact field keys from the selected template.</div>
                      </div>
                      <SecondaryButton className="px-4 py-2 text-xs" onClick={handleDownloadSample}>Download sample</SecondaryButton>
                    </div>
                    <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-[#efe5d7] bg-[#f8f3ec] p-4 text-xs leading-6 text-slate-700">{formatGuide.example}</pre>
                  </div>
                </div>
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="space-y-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2563eb]">Step 3</div>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Upload the batch file</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">The upload area accepts only the currently selected format. Users get a clear error if the file type and selected format do not match.</p>
                </div>

                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDraggingFile(false);
                  }}
                  onDrop={handleFileDrop}
                  className={`rounded-[28px] border-2 border-dashed p-8 text-center transition ${isDraggingFile ? "border-[#2563eb] bg-[#fff8ee]" : "border-[#d9cdbb] bg-[linear-gradient(180deg,rgba(255,252,247,0.92)_0%,rgba(248,241,232,0.92)_100%)]"}`}
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#dbeafe] text-[#2563eb]">
                    <UploadCloud size={24} />
                  </div>
                  <div className="mt-4 text-lg font-semibold text-slate-900">Drop your .{inputFormat} file here</div>
                  <div className="mt-2 text-sm text-slate-600">or choose it manually below. The uploaded file will be validated against {selectedTemplate?.name}.</div>
                  <div className="mt-4">
                    <input
                      type="file"
                      accept={acceptValue}
                      onChange={handleFileUpload}
                      className="w-full rounded-2xl border border-[#dbe4f0] bg-white/90 px-4 py-3 text-sm outline-none file:mr-3 file:rounded-full file:border-0 file:bg-[#fff3e1] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#2563eb]"
                    />
                  </div>
                </div>

                {uploadMessage ? <div className="rounded-xl border border-[#d6ead8] bg-[#f4fff5] px-4 py-3 text-sm text-[#166534]">{uploadMessage}</div> : null}
                {errorMessage ? <div className="rounded-xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm text-[#be123c]">{errorMessage}</div> : null}

                <div className="rounded-2xl border border-[#dbe4f0] bg-white/75 p-5">
                  <div className="text-sm font-semibold text-slate-900">Uploaded file</div>
                  <div className="mt-2 text-sm text-slate-700">{uploadedFileName || "No file uploaded yet"}</div>
                  <div className="mt-1 text-xs text-slate-500">{uploadedFileName ? `${analysis.rows.length} parsed row${analysis.rows.length === 1 ? "" : "s"} found so far.` : `Expected file type: .${inputFormat}`}</div>
                  {uploadedFileName ? (
                    <div className="mt-4">
                      <SecondaryButton className="px-4 py-2 text-sm" onClick={clearUploadedFile}>Clear file</SecondaryButton>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {currentStep === 3 ? (
              <div className="space-y-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2563eb]">Step 4</div>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Review the parsed rows and queue</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">This step brings together validation, row-level highlights, output settings, and the queue action so users do not need to scroll between concerns.</p>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-[#dbe4f0] bg-white/75 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Parsed preview</div>
                        <div className="mt-1 text-xs text-slate-500">Check the first few rows before queueing.</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <div className="rounded-full border border-[#dbe4f0] bg-[#f8fafc] px-3 py-1 text-xs font-medium text-slate-600">
                          {analysis.rows.length} row{analysis.rows.length === 1 ? "" : "s"}
                        </div>
                        <div className={`rounded-full px-3 py-1 text-xs font-medium ${analysis.canQueue ? "border border-[#d6ead8] bg-[#f4fff5] text-[#166534]" : "border border-[#dbeafe] bg-[#eff6ff] text-[#2563eb]"}`}>
                          {reviewStatusLabel}
                        </div>
                      </div>
                    </div>

                    {analysis.rows.length > 25 ? (
                      <div className="mt-4 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
                        This file has {analysis.rows.length} rows. Queue up to 25 rows per upload, then repeat with the next file.
                      </div>
                    ) : null}

                    {analysis.previewRows.length ? (
                      <div className="mt-4 space-y-4">
                        {analysis.previewRows.map(({ row, rowIssues, rowNumber }) => {
                          const missingFields = new Set(rowIssues.filter((issue) => issue.code === "missing_required_field").map((issue) => issue.field));
                          const unknownFields = new Set(rowIssues.filter((issue) => issue.code === "unknown_field").map((issue) => issue.field));
                          const templateFields = selectedTemplate?.fields || [];
                          const extraKeys = Object.keys(row).filter((key) => !templateFields.some((field) => field.key === key));
                          return (
                            <div key={`row-${rowNumber}`} className="rounded-xl border border-[#dbe4f0] bg-white/90 p-4 md:p-5">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2563eb]">Row {rowNumber}</div>
                                <div className="text-xs text-slate-500">{rowIssues.length ? `${rowIssues.length} issue${rowIssues.length === 1 ? "" : "s"}` : "No row-specific issues"}</div>
                              </div>

                              <div className="mt-3 grid gap-3 lg:grid-cols-3 xl:grid-cols-4">
                                {templateFields.map((field) => {
                                  const value = row[field.key];
                                  const isMissing = missingFields.has(field.key);
                                  return (
                                    <div key={field.key} className={`min-w-0 rounded-[14px] border px-3 py-3 ${isMissing ? "border-[#fecdd3] bg-[#fff1f2]" : "border-[#f0e6d9] bg-[#f8fafc]"}`}>
                                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2563eb]">{field.key}</div>
                                      <div className={`mt-1 break-words text-sm leading-6 ${isMissing ? "text-[#be123c]" : "text-slate-800"}`}>
                                        {value ? String(value) : field.required === false ? "Optional and empty" : "Missing required field"}
                                      </div>
                                    </div>
                                  );
                                })}

                                {extraKeys.map((key) => (
                                  <div key={key} className={`min-w-0 rounded-[14px] border px-3 py-3 ${unknownFields.has(key) ? "border-[#dbeafe] bg-[#eff6ff]" : "border-[#f0e6d9] bg-[#f8fafc]"}`}>
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2563eb]">{key}</div>
                                    <div className="mt-1 break-words text-sm leading-6 text-[#2563eb]">{String(row[key] || "")}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {analysis.hiddenRowCount > 0 ? <div className="text-xs text-slate-500">{analysis.hiddenRowCount} more {analysis.hiddenRowCount === 1 ? "row" : "rows"} not shown.</div> : null}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-dashed border-[#dbe4f0] bg-white/70 px-4 py-4 text-sm text-slate-500">Upload a valid file to preview how the rows map to this template.</div>
                    )}
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.92fr)]">
                    <div className="space-y-5">
                      <div className="rounded-2xl border border-[#dbe4f0] bg-white/75 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">What needs attention</div>
                            <div className="mt-1 text-xs text-slate-500">Only the items below matter before queueing.</div>
                          </div>
                          {analysis.canQueue ? <div className="rounded-full border border-[#d6ead8] bg-[#f4fff5] px-3 py-1 text-xs font-medium text-[#166534]">No blocking issues</div> : null}
                        </div>

                        <div className="mt-4 space-y-3">
                          {analysis.blockingIssues.map((issue, index) => (
                            <div key={`${issue.code}-${issue.row || 0}-${issue.field || ""}-${index}`} className="rounded-xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm text-[#be123c]">
                              <div className="flex items-start gap-2"><AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{issue.message}</span></div>
                            </div>
                          ))}
                          {analysis.warningIssues.map((issue, index) => (
                            <div key={`${issue.code}-${issue.row || 0}-${issue.field || ""}-${index}`} className="rounded-xl border border-[#dbeafe] bg-[#eff6ff] px-4 py-3 text-sm text-[#2563eb]">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-2"><Info size={16} className="mt-0.5 shrink-0" /> <span>{issue.message}</span></div>
                                {issue.suggestion && issue.field ? (
                                  <SecondaryButton className="shrink-0 px-3 py-2 text-xs" onClick={() => handleApplySuggestion(issue)}>
                                    Apply suggestion
                                  </SecondaryButton>
                                ) : null}
                              </div>
                            </div>
                          ))}
                          {!analysis.blockingIssues.length && !analysis.warningIssues.length ? (
                            <div className="rounded-xl border border-[#d6ead8] bg-[#f4fff5] px-4 py-3 text-sm text-[#166534]">Everything looks good. You can queue this batch now.</div>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#dbe4f0] bg-white/75 p-5">
                      <div className="text-sm font-semibold text-slate-900">Output and queue</div>
                      <div className="mt-4">
                        <div className="mb-2 text-sm font-medium text-slate-700">Output format</div>
                        <div className="inline-flex rounded-full border border-[#dbe4f0] bg-[#f8fafc] p-1">
                          {(["html", "pdf"] as const).map((format) => (
                            <button
                              key={format}
                              onClick={() => setOutputFormat(format)}
                              className={`rounded-full px-4 py-2 text-sm font-medium transition ${outputFormat === format ? "bg-white text-slate-900 shadow" : "text-slate-600"}`}
                            >
                              {format.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {outputFormat === "pdf" ? (
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
                      ) : null}

                      <div className="mt-4 space-y-2 text-sm text-slate-700">
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#efe5d7] bg-[#f8fafc] px-4 py-3">
                          <span>Template</span>
                          <span className="font-medium text-slate-900">{selectedTemplate?.name}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#efe5d7] bg-[#f8fafc] px-4 py-3">
                          <span>File</span>
                          <span className="max-w-[180px] truncate font-medium text-slate-900">{uploadedFileName || "None"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#efe5d7] bg-[#f8fafc] px-4 py-3">
                          <span>Rows ready</span>
                          <span className="font-medium text-slate-900">{analysis.rows.length}</span>
                        </div>
                        <div className="rounded-lg border border-[#efe5d7] bg-[#f8fafc] px-4 py-3">
                          <label className="flex items-start gap-3 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={saveToMyFiles}
                              onChange={(event) => setSaveToMyFiles(event.target.checked)}
                              disabled={!hasPaidAccess}
                              className="mt-1"
                            />
                            <span>
                              <span className="block font-medium text-slate-900">Save completed files to My Files for 30 days</span>
                              <span className="mt-1 block text-xs leading-5 text-slate-500">
                                If this stays off, the batch still runs, but completed files are not kept in My Files.
                              </span>
                            </span>
                          </label>
                        </div>
                      </div>

                      <div className="mt-5 flex gap-3">
                        <MetallicButton onClick={handleQueueBatch} disabled={isSubmitting || !analysis.canQueue} className="flex-1">
                          {isSubmitting ? "Queueing..." : "Queue batch"}
                        </MetallicButton>
                        <SecondaryButton className="px-4" onClick={clearUploadedFile}>Clear file</SecondaryButton>
                      </div>

                      {!analysis.canQueue ? (
                        <div className="mt-4 rounded-xl border border-[#dbeafe] bg-[#eff6ff] px-4 py-3 text-sm text-[#2563eb]">
                          {analysis.rows.length > 25 ? "Split this file into batches of 25 rows or fewer before queueing." : "Resolve the issues above before queueing."}
                        </div>
                      ) : null}
                      </div>

                      <details className="rounded-2xl border border-[#dbe4f0] bg-white/75 p-4">
                        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-900">
                          Advanced session settings
                          <ChevronDown size={16} className="text-slate-500" />
                        </summary>
                        <div className="mt-4">
                          <label className="mb-2 block text-sm font-medium text-slate-700">Session token</label>
                          <input
                            value={sessionToken}
                            onChange={(event) => setSessionToken(event.target.value)}
                            className="w-full rounded-2xl border border-[#dbe4f0] bg-white/85 px-4 py-3 text-sm outline-none"
                            placeholder="Attach queued jobs to a specific workspace session"
                          />
                          <div className="mt-2 text-xs text-slate-500">This is auto-managed for normal users. Only change it if you intentionally want a different workspace activity stream.</div>
                        </div>
                      </details>
                    </div>

                    <div className="space-y-5">
                    <div className="rounded-2xl border border-[#dbe4f0] bg-white/75 p-5">
                      <div className="text-sm font-semibold text-slate-900">Status tracking</div>
                      <div className="mt-1 text-xs text-slate-500">Activity shows in-progress, success, and failed states. Only batches with saving turned on appear in My Files for 30 days.</div>
                      <div className="mt-3 space-y-2">
                        <div className="rounded-lg border border-dashed border-[#dbe4f0] bg-white/85 px-3 py-4 text-xs text-slate-500">After you queue a batch, use Activity for progress. Use My Files only for runs saved to your account.</div>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>

                {uploadMessage ? <div className="rounded-xl border border-[#d6ead8] bg-[#f4fff5] px-4 py-3 text-sm text-[#166534]">{uploadMessage}</div> : null}
                {errorMessage ? <div className="rounded-xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm text-[#be123c]">{errorMessage}</div> : null}
              </div>
            ) : null}

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-[#dbe4f0] pt-5">
              <SecondaryButton onClick={handlePreviousStep} disabled={currentStep === 0} className="px-4 py-2">
                <ArrowLeft size={16} className="mr-2" /> Back
              </SecondaryButton>

              {currentStep < 3 ? (
                <MetallicButton onClick={handleNextStep} disabled={!canAdvance} className="px-5 py-2.5">
                  {nextLabel}
                  <ArrowRight size={16} className="ml-2" />
                </MetallicButton>
              ) : (
                <div className="text-xs text-slate-500">Final step: review validation and queue the batch.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showQueueDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,18,11,0.42)] p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-[#d6ead8] bg-white p-6 shadow-[0_28px_90px_rgba(39,25,12,0.24)]">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#166534]">Batch queued</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{queuedCount} request{queuedCount === 1 ? "" : "s"} are now processing</div>
            <div className="mt-3 text-sm leading-6 text-slate-600">
              {saveToMyFiles
                ? "Watch progress in Activity. Completed files will be saved in My Files for 30 days unless you delete them earlier."
                : "Watch progress in Activity. This run is not being saved to My Files, so download management stays temporary for this batch."}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <a href={activityHref}>
                <MetallicButton className="px-4 py-2.5 text-sm">Open Activity</MetallicButton>
              </a>
              <a href="/my-files">
                <SecondaryButton className="px-4 py-2.5 text-sm">Open My Files</SecondaryButton>
              </a>
              <SecondaryButton className="px-4 py-2.5 text-sm" onClick={() => setShowQueueDialog(false)}>
                Stay here
              </SecondaryButton>
            </div>
          </div>
        </div>
      ) : null}

    </section>
  );
}
