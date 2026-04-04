import Handlebars from "handlebars";
import sanitizeHtml, { type IOptions } from "sanitize-html";
import { buildTemplatePreviewData, getBuiltinTemplate, type BuiltinTemplate } from "@/server/templates";
import type { ClauseSelection, CustomClause, DocumentBranding, GenerationRequest, GenerationResult } from "@/server/types";

let helpersRegistered = false;

function registerHandlebarsHelpers() {
  if (helpersRegistered) return;

  const escape = Handlebars.escapeExpression;

  const splitMultiline = (value: unknown) =>
    String(value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

  const splitColumns = (line: string) => line.split("·").map((part) => part.trim());

  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("ne", (a, b) => a !== b);
  Handlebars.registerHelper("gt", (a, b) => Number(a) > Number(b));
  Handlebars.registerHelper("lt", (a, b) => Number(a) < Number(b));
  Handlebars.registerHelper("add", (a, b) => Number(a || 0) + Number(b || 0));
  Handlebars.registerHelper("sub", (a, b) => Number(a || 0) - Number(b || 0));
  Handlebars.registerHelper("mul", (a, b) => Number(a || 0) * Number(b || 0));
  Handlebars.registerHelper("div", (a, b) => {
    const denominator = Number(b || 0);
    if (!denominator) return 0;
    return Number(a || 0) / denominator;
  });
  Handlebars.registerHelper("money", (value, currency = "USD") => {
    const amount = Number(value || 0);
    const code = String(currency || "USD").toUpperCase();

    try {
      return new Intl.NumberFormat("en", {
        style: "currency",
        currency: code,
        maximumFractionDigits: 2
      }).format(amount);
    } catch {
      return `${code} ${amount.toFixed(2)}`;
    }
  });
  Handlebars.registerHelper("lineItemRows", (value) => {
    const rows = splitMultiline(value)
      .map((line) => {
        const [description = "", quantity = "", unitPrice = ""] = splitColumns(line);
        return `
          <tr>
            <td style="padding:14px 16px;border-bottom:1px solid #e8edf3;font-size:14px;line-height:1.7;color:#314555;">${escape(description)}</td>
            <td style="padding:14px 16px;border-bottom:1px solid #e8edf3;font-size:13px;line-height:1.7;color:#5d7387;">${escape(quantity)}</td>
            <td style="padding:14px 16px;border-bottom:1px solid #e8edf3;font-size:13px;line-height:1.7;color:#314555;text-align:right;">${escape(unitPrice)}</td>
          </tr>`;
      })
      .join("");

    return new Handlebars.SafeString(rows);
  });
  Handlebars.registerHelper("expenseRows", (value) => {
    const rows = splitMultiline(value)
      .map((line) => {
        const [description = "", expenseDate = "", amount = ""] = splitColumns(line);
        return `
          <tr>
            <td style="padding:14px 16px;border-bottom:1px solid #e6edf4;font-size:13px;line-height:1.7;color:#314555;">${escape(description)}</td>
            <td style="padding:14px 16px;border-bottom:1px solid #e6edf4;font-size:13px;line-height:1.7;color:#5d7387;">${escape(expenseDate)}</td>
            <td style="padding:14px 16px;border-bottom:1px solid #e6edf4;font-size:13px;line-height:1.7;color:#314555;text-align:right;">${escape(amount)}</td>
          </tr>`;
      })
      .join("");

    return new Handlebars.SafeString(rows);
  });
  Handlebars.registerHelper("bulletList", (value) => {
    const items = splitMultiline(value)
      .map((line) => `<li style="margin:0 0 10px 18px;padding-left:6px;">${escape(line.replace(/^[-*]\s*/, ""))}</li>`)
      .join("");

    return new Handlebars.SafeString(items);
  });

  helpersRegistered = true;
}

const safeStyleValue = /^(?!.*(?:expression|url)\s*\()[a-z0-9\s.,%#()\-\/]+$/i;

const sanitizeOptions: IOptions = {
  allowedTags: [
    "a",
    "article",
    "blockquote",
    "br",
    "caption",
    "code",
    "div",
    "em",
    "footer",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "header",
    "hr",
    "img",
    "li",
    "main",
    "ol",
    "p",
    "section",
    "span",
    "strong",
    "sub",
    "sup",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "u",
    "ul"
  ],
  allowedAttributes: {
    "*": ["style", "class", "id"],
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"]
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"]
  },
  allowedStyles: {
    "*": {
      alignItems: [safeStyleValue],
      "align-items": [safeStyleValue],
      background: [safeStyleValue],
      "background-color": [safeStyleValue],
      backgroundColor: [safeStyleValue],
      border: [safeStyleValue],
      "border-bottom": [safeStyleValue],
      borderBottom: [safeStyleValue],
      "border-collapse": [safeStyleValue],
      "border-left": [safeStyleValue],
      borderLeft: [safeStyleValue],
      "border-radius": [safeStyleValue],
      borderRadius: [safeStyleValue],
      "border-right": [safeStyleValue],
      borderRight: [safeStyleValue],
      "border-top": [safeStyleValue],
      borderTop: [safeStyleValue],
      boxShadow: [safeStyleValue],
      "box-shadow": [safeStyleValue],
      color: [safeStyleValue],
      display: [safeStyleValue],
      flex: [safeStyleValue],
      "flex-direction": [safeStyleValue],
      flexDirection: [safeStyleValue],
      fontSize: [safeStyleValue],
      "font-size": [safeStyleValue],
      fontWeight: [safeStyleValue],
      "font-style": [safeStyleValue],
      "font-weight": [safeStyleValue],
      gap: [safeStyleValue],
      grid: [safeStyleValue],
      "grid-column": [safeStyleValue],
      gridColumn: [safeStyleValue],
      "grid-row": [safeStyleValue],
      gridRow: [safeStyleValue],
      "grid-template-columns": [safeStyleValue],
      gridTemplateColumns: [safeStyleValue],
      "grid-template-rows": [safeStyleValue],
      gridTemplateRows: [safeStyleValue],
      height: [safeStyleValue],
      "justify-content": [safeStyleValue],
      justifyContent: [safeStyleValue],
      letterSpacing: [safeStyleValue],
      "letter-spacing": [safeStyleValue],
      lineHeight: [safeStyleValue],
      "line-height": [safeStyleValue],
      margin: [safeStyleValue],
      "margin-bottom": [safeStyleValue],
      marginBottom: [safeStyleValue],
      "margin-left": [safeStyleValue],
      marginLeft: [safeStyleValue],
      "margin-right": [safeStyleValue],
      marginRight: [safeStyleValue],
      "margin-top": [safeStyleValue],
      marginTop: [safeStyleValue],
      "max-height": [safeStyleValue],
      maxWidth: [safeStyleValue],
      "max-width": [safeStyleValue],
      minHeight: [safeStyleValue],
      "min-height": [safeStyleValue],
      minWidth: [safeStyleValue],
      "min-width": [safeStyleValue],
      objectFit: [safeStyleValue],
      "object-fit": [safeStyleValue],
      overflow: [safeStyleValue],
      padding: [safeStyleValue],
      "padding-bottom": [safeStyleValue],
      paddingBottom: [safeStyleValue],
      "padding-left": [safeStyleValue],
      paddingLeft: [safeStyleValue],
      "padding-right": [safeStyleValue],
      paddingRight: [safeStyleValue],
      "padding-top": [safeStyleValue],
      paddingTop: [safeStyleValue],
      textIndent: [safeStyleValue],
      textAlign: [safeStyleValue],
      "text-align": [safeStyleValue],
      textDecoration: [safeStyleValue],
      "text-decoration": [safeStyleValue],
      textTransform: [safeStyleValue],
      "text-transform": [safeStyleValue],
      transform: [safeStyleValue],
      "transform-origin": [safeStyleValue],
      verticalAlign: [safeStyleValue],
      "vertical-align": [safeStyleValue],
      whiteSpace: [safeStyleValue],
      "white-space": [safeStyleValue],
      width: [safeStyleValue]
    }
  },
  disallowedTagsMode: "discard"
};

function sanitizeTemplateHtml(input: string) {
  return sanitizeHtml(input, sanitizeOptions);
}

function sanitizeRenderedHtml(input: string) {
  return sanitizeHtml(input, sanitizeOptions);
}

function sanitizeColor(input: string | undefined, fallback: string) {
  if (!input) {
    return fallback;
  }

  const trimmed = input.trim();
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) || /^(?:rgb|rgba|hsl|hsla)\([\d\s.,%]+\)$/i.test(trimmed) || /^[a-z\s]+$/i.test(trimmed)
    ? trimmed
    : fallback;
}

function sanitizeLogoUrl(input: string | undefined) {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "data:") {
      return trimmed;
    }
  } catch {
    return null;
  }

  return null;
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getFirstString(data: Record<string, unknown> | undefined, keys: string[]) {
  if (!data) {
    return undefined;
  }

  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function buildSignerPanel(branding?: DocumentBranding, data?: Record<string, unknown>) {
  const signerName = branding?.signerName || getFirstString(data, [
    "signer_name",
    "sender_name",
    "manager_name",
    "prepared_by",
    "approved_by",
    "approver_name",
    "pm_name",
    "requested_by",
    "quote_author"
  ]) || "Authorized Signatory";
  const signerTitle = branding?.signerTitle || getFirstString(data, [
    "job_title",
    "role_title"
  ]) || "Authorized Representative";
  const signerOrganization = branding?.companyName || getFirstString(data, [
    "company_name",
    "seller_name",
    "buyer_company",
    "supplier_name",
    "client_name",
    "provider_name",
    "party_one"
  ]);

  return `
    <section class="doc-signature-panel">
      <div class="doc-signature-kicker">Document Sign-off</div>
      <div class="doc-signature-grid">
        <div>
          <div class="doc-signature-label">Approved / Issued By</div>
          <div class="doc-signature-name">${escapeHtml(signerName)}</div>
          <div class="doc-signature-meta">${escapeHtml(signerTitle)}${signerOrganization ? ` · ${escapeHtml(signerOrganization)}` : ""}</div>
        </div>
        <div class="doc-signature-lines">
          <div>Signature: ____________________</div>
          <div>Date: ____________________</div>
        </div>
      </div>
    </section>
  `;
}

function wrapHtml(body: string, title = "Generated Document", branding?: DocumentBranding, data?: Record<string, unknown>) {
  const primaryColor = sanitizeColor(branding?.primaryColor, "#8d6334");
  const accentColor = sanitizeColor(branding?.accentColor, "#efe3d3");
  const companyName = branding?.companyName || "Generated Document";
  const headerLabel = getFirstString(data, ["doc_header_label", "header_eyebrow"]) || title;
  const headerTitle = getFirstString(data, ["doc_header_title", "header_title"]) || companyName;
  const safeLogoUrl = sanitizeLogoUrl(branding?.logoUrl);
  const logoMarkup = safeLogoUrl
    ? `<img src="${escapeHtml(safeLogoUrl)}" alt="${escapeHtml(companyName)} logo" style="height:40px;max-width:160px;object-fit:contain;" />`
    : `<div style="height:40px;min-width:40px;padding:0 14px;border-radius:999px;background:${accentColor};display:inline-flex;align-items:center;justify-content:center;color:${primaryColor};font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(companyName.slice(0, 18))}</div>`;
  const contactLine = branding?.contactEmail
    ? `<div style="font-size:13px;color:#6f6256;">${escapeHtml(branding.contactEmail)}</div>`
    : "";
  const footerLine = branding?.footerText
    ? `<div style="font-size:12px;color:#76685b;">${escapeHtml(branding.footerText)}</div>`
    : "";
  const signerPanel = buildSignerPanel(branding, data);

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 16px;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #221c16;
            background: linear-gradient(180deg, #f7f3ee 0%, #fbfaf8 100%);
          }
          .page {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            background: #fffdfa;
            border: 1px solid rgba(162, 145, 126, 0.18);
            border-radius: 28px;
            padding: 30px;
            box-shadow: 0 24px 60px rgba(53, 35, 16, 0.08);
          }
          .doc-shell {
            display: flex;
            flex-direction: column;
            gap: 28px;
          }
          .doc-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(141, 99, 52, 0.16);
          }
          .doc-title {
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: ${primaryColor};
          }
          .doc-footer {
            padding-top: 20px;
            border-top: 1px solid rgba(141, 99, 52, 0.14);
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .doc-signature-panel {
            padding: 22px 24px;
            border-radius: 22px;
            background: linear-gradient(180deg, #faf6f0 0%, #fffdfa 100%);
            border: 1px solid rgba(141, 99, 52, 0.16);
          }
          .doc-signature-kicker {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: ${primaryColor};
            margin-bottom: 12px;
          }
          .doc-signature-grid {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 20px;
            align-items: end;
          }
          .doc-signature-label {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #7b6c5e;
          }
          .doc-signature-name {
            margin-top: 10px;
            font-size: 22px;
            font-weight: 700;
            color: #2e241d;
          }
          .doc-signature-meta {
            margin-top: 6px;
            font-size: 14px;
            line-height: 1.7;
            color: #5f5044;
          }
          .doc-signature-lines {
            font-size: 13px;
            line-height: 2.1;
            color: #4c4035;
          }
          .doc-shell table {
            width: 100%;
            border-collapse: collapse;
          }
          .doc-shell td,
          .doc-shell th {
            vertical-align: top;
          }
          p, li { margin: 0 0 16px; }
          h1, h2, h3 { margin: 0 0 12px; }
          a { color: ${primaryColor}; }

          @media print {
            body {
              padding: 0;
              background: #ffffff;
            }

            .page {
              border: none;
              border-radius: 0;
              box-shadow: none;
              padding: 0;
            }

            .doc-shell {
              gap: 18px;
            }

            .doc-signature-grid {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <div class="doc-shell">
            <header class="doc-header">
              <div>
                <div class="doc-title">${escapeHtml(headerLabel)}</div>
                <div style="margin-top:10px;font-size:28px;font-weight:700;color:#2e241d;">${escapeHtml(headerTitle)}</div>
                ${contactLine}
              </div>
              <div>${logoMarkup}</div>
            </header>
            <section>${body}</section>
            <footer class="doc-footer">
              ${signerPanel}
              ${footerLine}
            </footer>
          </div>
        </main>
      </body>
    </html>
  `;
}

function renderClauseBlocks(
  data: Record<string, unknown>,
  clauses: ClauseSelection[] = [],
  customClauses: CustomClause[] = [],
  templateClauseMap: Map<string, { title: string; content: string }>
) {
  const sections: string[] = [];

  for (const clause of clauses) {
    if (!clause.enabled) continue;

    const templateClause = templateClauseMap.get(clause.id);
    const source = clause.content || templateClause?.content;
    if (!source) continue;

    const compiled = Handlebars.compile(sanitizeTemplateHtml(source));
    const rendered = sanitizeRenderedHtml(compiled(data));
    sections.push(
      `<section style="padding:20px 0 0;"><h3 style="font-size:18px;color:#2e241d;margin-bottom:8px;">${escapeHtml(templateClause?.title || clause.id.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase()))}</h3><div style="font-size:16px;line-height:1.75;color:#302720;">${rendered}</div></section>`
    );
  }

  for (const clause of customClauses) {
    sections.push(
      `<section style="padding:20px 0 0;"><h3 style="font-size:18px;color:#2e241d;margin-bottom:8px;">${escapeHtml(clause.title)}</h3><p style="font-size:16px;line-height:1.75;color:#302720;white-space:pre-wrap;">${escapeHtml(clause.content)}</p></section>`
    );
  }

  if (!sections.length) return "";

  return `<section style="margin-top:8px;padding-top:20px;border-top:1px solid rgba(141, 99, 52, 0.14);"><div style="font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8d6334;margin-bottom:8px;">Additional Clauses</div>${sections.join("")}</section>`;
}

function buildDraftDocument(
  content: string,
  sourceType: "text" | "html" = "text",
  documentType?: string,
  branding?: DocumentBranding
) {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  const title = documentType
    ? documentType.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
    : "Structured Document";

  const bodyContent =
    sourceType === "html"
      ? `<div style="font-size:16px;line-height:1.75;color:#302720;">${sanitizeRenderedHtml(content)}</div>`
      : paragraphs
          .map(
            (paragraph) =>
              `<p style="font-size:16px;line-height:1.75;color:#302720;">${escapeHtml(paragraph)}</p>`
          )
          .join("");

  const body = `
    <section>
      <div style="font-size:28px;font-weight:700;color:#2e241d;margin-bottom:18px;">${title}</div>
      ${bodyContent}
    </section>
  `;
  return wrapHtml(body, title, branding);
}

export function renderBuiltinTemplatePreview(template: BuiltinTemplate) {
  registerHandlebarsHelpers();

  const compiled = Handlebars.compile(sanitizeTemplateHtml(template.content));
  const rendered = sanitizeRenderedHtml(compiled(buildTemplatePreviewData(template)));

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            background: linear-gradient(180deg, #f7f1e8 0%, #fbfaf8 100%);
            overflow: hidden;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          .preview-viewport {
            width: 960px;
            min-height: 1320px;
            padding: 28px;
            transform: scale(0.42);
            transform-origin: top left;
          }
          .preview-page {
            width: 860px;
            background: #fffdfa;
            border: 1px solid rgba(162, 145, 126, 0.18);
            border-radius: 26px;
            box-shadow: 0 24px 60px rgba(53, 35, 16, 0.08);
            padding: 42px;
          }
        </style>
      </head>
      <body>
        <div class="preview-viewport">
          <div class="preview-page">${rendered}</div>
        </div>
      </body>
    </html>
  `;
}

export async function renderRequest(request: GenerationRequest): Promise<GenerationResult> {
  registerHandlebarsHelpers();
  let html = "";
  const branding = request.options?.branding;

  if (request.mode === "template_fill") {
    const source = request.templateSource;
    if (!source) throw new Error("Missing template source");

    const builtinTemplate = source.type === "builtin" ? getBuiltinTemplate(source.templateId) : undefined;
    const content = source.type === "builtin" ? builtinTemplate?.content : source.content;

    if (!content) {
      if (source.type === "builtin") {
        throw new Error(`Template not found: ${source.templateId}`);
      }

      throw new Error("Template not found: inline content missing");
    }

    const compiled = Handlebars.compile(sanitizeTemplateHtml(content));
    const data = request.data || {};
    const rendered = sanitizeRenderedHtml(compiled(data));
    const clauseMap = new Map(
      (builtinTemplate?.clauses || []).map((clause) => [clause.id, { title: clause.title, content: clause.content }])
    );
    const clauseMarkup = renderClauseBlocks(
      data,
      request.options?.clauses,
      request.options?.customClauses,
      clauseMap
    );
    html = wrapHtml(
      `${rendered}${clauseMarkup}`,
      source.type === "builtin" ? builtinTemplate?.name || source.templateId : "Inline Template",
      branding,
      data
    );
  }

  if (request.mode === "draft_to_document") {
    html = buildDraftDocument(
      request.source?.content || "",
      request.source?.type || "text",
      request.options?.documentType,
      branding
    );
  }

  return { outputs: [], html };
}
