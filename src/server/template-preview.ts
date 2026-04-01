import Handlebars from "handlebars/dist/cjs/handlebars";
import sanitizeHtml, { type IOptions } from "sanitize-html";
import { buildTemplatePreviewData, type BuiltinTemplate } from "@/server/templates";

let helpersRegistered = false;
const previewHtmlCache = new Map<string, string>();

function registerPreviewHelpers() {
  if (helpersRegistered) {
    return;
  }

  const escape = Handlebars.escapeExpression;

  const splitMultiline = (value: unknown) =>
    String(value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

  const splitColumns = (line: string) => line.split("·").map((part) => part.trim());

  Handlebars.registerHelper("add", (a: unknown, b: unknown) => Number(a || 0) + Number(b || 0));
  Handlebars.registerHelper("sub", (a: unknown, b: unknown) => Number(a || 0) - Number(b || 0));
  Handlebars.registerHelper("mul", (a: unknown, b: unknown) => Number(a || 0) * Number(b || 0));
  Handlebars.registerHelper("div", (a: unknown, b: unknown) => {
    const denominator = Number(b || 0);
    if (!denominator) return 0;
    return Number(a || 0) / denominator;
  });
  Handlebars.registerHelper("money", (value: unknown, currency: string = "USD") => {
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
  Handlebars.registerHelper("lineItemRows", (value: unknown) => {
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
  Handlebars.registerHelper("expenseRows", (value: unknown) => {
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
  Handlebars.registerHelper("bulletList", (value: unknown) => {
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

function getFirstString(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function buildPreviewSignerPanel(data: Record<string, unknown>) {
  const signerName = getFirstString(data, [
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
  const signerTitle = getFirstString(data, [
    "job_title",
    "role_title"
  ]) || "Authorized Representative";
  const signerOrganization = getFirstString(data, [
    "company_name",
    "seller_name",
    "buyer_company",
    "supplier_name",
    "client_name",
    "provider_name",
    "party_one"
  ]);

  return `
    <section class="preview-signature-panel">
      <div class="preview-signature-kicker">Document Sign-off</div>
      <div class="preview-signature-grid">
        <div>
          <div class="preview-signature-label">Approved / Issued By</div>
          <div class="preview-signature-name">${Handlebars.escapeExpression(signerName)}</div>
          <div class="preview-signature-meta">${Handlebars.escapeExpression(signerTitle)}${signerOrganization ? ` · ${Handlebars.escapeExpression(signerOrganization)}` : ""}</div>
        </div>
        <div class="preview-signature-lines">
          <div>Signature: ____________________</div>
          <div>Date: ____________________</div>
        </div>
      </div>
    </section>
  `;
}

export function renderBuiltinTemplatePreview(template: BuiltinTemplate) {
  const cacheKey = `${template.id}:${template.content.length}`;
  const cached = previewHtmlCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  registerPreviewHelpers();

  const previewData = buildTemplatePreviewData(template);
  const compiled = Handlebars.compile(sanitizeTemplateHtml(template.content));
  const rendered = sanitizeRenderedHtml(compiled(previewData));
  const signerPanel = buildPreviewSignerPanel(previewData);

  const html = `
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
            display: flex;
            flex-direction: column;
            gap: 24px;
          }
          .preview-page table {
            width: 100%;
            border-collapse: collapse;
          }
          .preview-page td,
          .preview-page th {
            vertical-align: top;
          }
          .preview-signature-panel {
            padding: 22px 24px;
            border-radius: 22px;
            background: linear-gradient(180deg, #faf6f0 0%, #fffdfa 100%);
            border: 1px solid rgba(141, 99, 52, 0.16);
          }
          .preview-signature-kicker {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #8d6334;
            margin-bottom: 12px;
          }
          .preview-signature-grid {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 20px;
            align-items: end;
          }
          .preview-signature-label {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #7b6c5e;
          }
          .preview-signature-name {
            margin-top: 10px;
            font-size: 22px;
            font-weight: 700;
            color: #2e241d;
          }
          .preview-signature-meta {
            margin-top: 6px;
            font-size: 14px;
            line-height: 1.7;
            color: #5f5044;
          }
          .preview-signature-lines {
            font-size: 13px;
            line-height: 2.1;
            color: #4c4035;
          }
        </style>
      </head>
      <body>
        <div class="preview-viewport">
          <div class="preview-page">${rendered}${signerPanel}</div>
        </div>
      </body>
    </html>
  `;

  previewHtmlCache.set(cacheKey, html);
  return html;
}
