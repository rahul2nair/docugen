import type { GenerationRequest } from "@/server/types";

const subjectFieldKeys = [
  "candidate_name",
  "client_name",
  "customer_name",
  "recipient_name",
  "employee_name",
  "full_name",
  "name",
  "company_name"
];

const referenceFieldKeys = [
  "invoice_number",
  "document_number",
  "reference",
  "order_id",
  "contract_id",
  "job_title",
  "role_title"
];

function normalizeValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function firstMatchingValue(data: Record<string, unknown> | undefined, keys: string[]) {
  if (!data) {
    return "";
  }

  for (const key of keys) {
    const value = normalizeValue(data[key]);
    if (value) {
      return value;
    }
  }

  return "";
}

function cleanLabelPart(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function deriveGeneratedFileLabel(request: GenerationRequest, fallbackTemplateName?: string) {
  const documentName = cleanLabelPart(
    request.options?.documentType?.trim()
      || fallbackTemplateName
      || (request.mode === "draft_to_document" ? "Drafted document" : "Generated document")
  );
  const subject = cleanLabelPart(firstMatchingValue(request.data, subjectFieldKeys));
  const reference = cleanLabelPart(firstMatchingValue(request.data, referenceFieldKeys));

  const parts = [subject, documentName, reference].filter(Boolean);
  if (!parts.length) {
    return "Generated document";
  }

  return parts.join(" - ");
}

export function buildDownloadFilename(label: string, format: "html" | "pdf") {
  const normalized = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${normalized || "generated-document"}.${format}`;
}