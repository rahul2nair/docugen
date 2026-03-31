export type BatchInputFormat = "json" | "csv" | "txt";

export interface BatchTemplateField {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
}

export interface BatchValidationIssue {
  code:
    | "json_parse_error"
    | "invalid_json_shape"
    | "invalid_row_type"
    | "csv_missing_header"
    | "csv_duplicate_header"
    | "csv_unknown_header"
    | "txt_invalid_line"
    | "unknown_field"
    | "missing_required_field"
    | "empty_input";
  message: string;
  row?: number;
  field?: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface BatchInputAnalysis {
  rows: Array<Record<string, unknown>>;
  issues: BatchValidationIssue[];
  fileFormat: BatchInputFormat;
}

function exampleValue(key: string, index: number) {
  const normalizedKey = key.toLowerCase();

  if (normalizedKey.includes("email")) return index === 0 ? "ops@acme.io" : "team@northstar.io";
  if (normalizedKey.includes("date") || normalizedKey.includes("due")) return index === 0 ? "2026-04-01" : "2026-04-15";
  if (normalizedKey.includes("company") || normalizedKey.includes("client")) return index === 0 ? "Acme Inc." : "Northstar Systems";
  if (normalizedKey.includes("name")) return index === 0 ? "Rahul Nair" : "Asha Menon";
  if (/(amount|price|salary|fee|rate|pricing)/.test(normalizedKey)) return index === 0 ? "USD 7,500" : "USD 3,200";
  if (/(timeline|duration)/.test(normalizedKey)) return index === 0 ? "6 weeks" : "3 weeks";
  if (/(scope|services)/.test(normalizedKey)) return index === 0 ? "UX audit, redesign, implementation" : "Messaging refresh and responsive rebuild";
  if (/(title|role)/.test(normalizedKey)) return index === 0 ? "Solution Architect" : "Product Designer";

  return index === 0 ? `${key.replace(/_/g, " ")} sample A` : `${key.replace(/_/g, " ")} sample B`;
}

interface ParseContext {
  aliases: Map<string, string>;
  allowedKeys: Set<string>;
  fields: BatchTemplateField[];
}

interface ParsedRowsResult {
  rows: Array<Record<string, unknown>>;
  issues: BatchValidationIssue[];
}

function normalizeBatchKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function levenshteinDistance(left: string, right: string) {
  const matrix = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));

  for (let row = 0; row <= left.length; row += 1) {
    matrix[row][0] = row;
  }

  for (let col = 0; col <= right.length; col += 1) {
    matrix[0][col] = col;
  }

  for (let row = 1; row <= left.length; row += 1) {
    for (let col = 1; col <= right.length; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  return matrix[left.length][right.length];
}

function findClosestFieldSuggestion(rawKey: string, fields: BatchTemplateField[]) {
  const normalized = normalizeBatchKey(rawKey);
  if (!normalized || !fields.length) {
    return null;
  }

  const partialMatch = fields.find((field) => {
    const candidates = [field.key, field.label].map((value) => normalizeBatchKey(value));
    return candidates.some((candidate) => candidate.startsWith(normalized) || normalized.startsWith(candidate));
  });

  if (partialMatch) {
    return partialMatch.key;
  }

  let bestMatch: { key: string; distance: number } | null = null;

  for (const field of fields) {
    for (const candidate of [field.key, field.label].map((value) => normalizeBatchKey(value))) {
      if (!candidate) {
        continue;
      }

      const distance = levenshteinDistance(normalized, candidate);
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { key: field.key, distance };
      }
    }
  }

  if (!bestMatch) {
    return null;
  }

  const threshold = Math.max(2, Math.floor(normalized.length / 3));
  return bestMatch.distance <= threshold ? bestMatch.key : null;
}

function positionToLineColumn(input: string, position: number) {
  const normalizedPosition = Math.max(0, Math.min(position, input.length));
  const source = input.slice(0, normalizedPosition);
  const lines = source.split(/\r\n|\r|\n/);

  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

function createJsonParseIssue(input: string, error: unknown): BatchValidationIssue {
  if (!(error instanceof Error)) {
    return {
      code: "json_parse_error",
      message: "Invalid JSON input"
    };
  }

  const positionMatch = error.message.match(/position\s+(\d+)/i);
  if (!positionMatch) {
    return {
      code: "json_parse_error",
      message: error.message
    };
  }

  const position = Number(positionMatch[1]);
  const { line, column } = positionToLineColumn(input, position);

  return {
    code: "json_parse_error",
    message: `Invalid JSON at line ${line}, column ${column}`,
    line,
    column
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildFieldAliasMap(fields: BatchTemplateField[] = []) {
  const aliases = new Map<string, string>();

  for (const field of fields) {
    const keyAlias = normalizeBatchKey(field.key);
    const labelAlias = normalizeBatchKey(field.label);

    if (keyAlias) {
      aliases.set(keyAlias, field.key);
    }

    if (labelAlias) {
      aliases.set(labelAlias, field.key);
    }
  }

  return aliases;
}

function resolveFieldKey(rawKey: string, aliases: Map<string, string>) {
  const normalized = normalizeBatchKey(rawKey);
  return aliases.get(normalized) || normalized;
}

function normalizeRowValues(row: Record<string, unknown>, aliases: Map<string, string>) {
  return Object.entries(row).reduce<Record<string, unknown>>((accumulator, [rawKey, value]) => {
    const resolvedKey = resolveFieldKey(rawKey, aliases);
    if (resolvedKey) {
      accumulator[resolvedKey] = value;
    }
    return accumulator;
  }, {});
}

function parseJsonRows(input: string, context: ParseContext): ParsedRowsResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch (error) {
    return {
      rows: [],
      issues: [createJsonParseIssue(input, error)]
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      rows: [],
      issues: [{ code: "invalid_json_shape", message: "JSON input must be an array of objects" }]
    };
  }

  const issues: BatchValidationIssue[] = [];
  const rows = parsed.map((item, index) => {
    if (!isPlainObject(item)) {
      issues.push({
        code: "invalid_row_type",
        message: `Row ${index + 1} must be a JSON object`,
        row: index + 1
      });
      return {};
    }

    const normalizedRow = normalizeRowValues(item, context.aliases);
    for (const key of Object.keys(normalizedRow)) {
      if (context.allowedKeys.size > 0 && !context.allowedKeys.has(key)) {
        const suggestion = findClosestFieldSuggestion(key, context.fields);
        issues.push({
          code: "unknown_field",
          message: `Row ${index + 1} contains unknown field "${key}"${suggestion ? `. Did you mean "${suggestion}"?` : ""}`,
          row: index + 1,
          field: key,
          suggestion: suggestion || undefined
        });
      }
    }

    return normalizedRow;
  });

  return { rows, issues };
}

function parseCsvMatrix(input: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;
  const normalizedInput = input.replace(/\r\n/g, "\n");

  for (let index = 0; index < normalizedInput.length; index += 1) {
    const character = normalizedInput[index];
    const nextCharacter = normalizedInput[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if (character === "\n" && !inQuotes) {
      currentRow.push(currentValue);
      if (currentRow.some((cell) => cell.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  currentRow.push(currentValue);
  if (currentRow.some((cell) => cell.trim().length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

function serializeCsvMatrix(rows: string[][]) {
  const escapeCsv = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  return rows.map((row) => row.map((value) => escapeCsv(value)).join(",")).join("\n");
}

function parseCsvRows(input: string, context: ParseContext): ParsedRowsResult {
  const matrix = parseCsvMatrix(input);
  if (matrix.length < 2) {
    return {
      rows: [],
      issues: [{ code: "csv_missing_header", message: "CSV input must include a header row and at least one data row" }]
    };
  }

  const issues: BatchValidationIssue[] = [];
  const resolvedHeaders = matrix[0].map((value) => resolveFieldKey(value, context.aliases));
  const duplicateHeaders = resolvedHeaders.filter((header, index) => header && resolvedHeaders.indexOf(header) !== index);

  for (const header of Array.from(new Set(duplicateHeaders))) {
    issues.push({
      code: "csv_duplicate_header",
      message: `CSV header "${header}" appears more than once`,
      field: header
    });
  }

  const headers = resolvedHeaders.map((header, index) => {
    if (!header) {
      return "";
    }

    if (context.allowedKeys.size > 0 && !context.allowedKeys.has(header)) {
      const suggestion = findClosestFieldSuggestion(matrix[0][index], context.fields);
      issues.push({
        code: "csv_unknown_header",
        message: `CSV header "${matrix[0][index]}" does not match any field in the selected template${suggestion ? `. Did you mean "${suggestion}"?` : ""}`,
        field: header,
        suggestion: suggestion || undefined
      });
    }

    return header;
  });

  if (!headers.some(Boolean)) {
    issues.push({ code: "csv_missing_header", message: "CSV header row is empty" });
    return { rows: [], issues };
  }

  const rows = matrix.slice(1).reduce<Array<Record<string, unknown>>>((accumulator, cells) => {
    const row = headers.reduce<Record<string, unknown>>((record, header, index) => {
      if (!header) {
        return record;
      }

      const value = cells[index]?.trim() || "";
      if (value) {
        record[header] = value;
      }

      return record;
    }, {});

    if (Object.keys(row).length > 0) {
      accumulator.push(row);
    }

    return accumulator;
  }, []);

  if (!rows.length) {
    issues.push({ code: "empty_input", message: "CSV input did not contain any non-empty data rows" });
  }

  return { rows, issues };
}

function parseTextRows(input: string, context: ParseContext): ParsedRowsResult {
  const blocks = input
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (!blocks.length) {
    return {
      rows: [],
      issues: [{ code: "empty_input", message: "Text input is empty" }]
    };
  }

  const issues: BatchValidationIssue[] = [];
  const rows = blocks.reduce<Array<Record<string, unknown>>>((accumulator, block) => {
    const row: Record<string, unknown> = {};
    let currentKey = "";

    for (const [lineIndex, line] of block.split("\n").entries()) {
      const rawLine = line.trimEnd();
      if (!rawLine.trim()) {
        continue;
      }

      const pairMatch = rawLine.match(/^([^:]+):\s*(.*)$/);
      if (pairMatch) {
        const resolvedKey = resolveFieldKey(pairMatch[1], context.aliases);

        if (context.allowedKeys.size > 0 && !context.allowedKeys.has(resolvedKey)) {
          const suggestion = findClosestFieldSuggestion(pairMatch[1].trim(), context.fields);
          issues.push({
            code: "unknown_field",
            message: `Unknown field "${pairMatch[1].trim()}" in text input${suggestion ? `. Did you mean "${suggestion}"?` : ""}`,
            row: accumulator.length + 1,
            field: resolvedKey,
            suggestion: suggestion || undefined
          });
        }

        row[resolvedKey] = pairMatch[2].trim();
        currentKey = resolvedKey;
        continue;
      }

      if (currentKey) {
        const previous = typeof row[currentKey] === "string" ? row[currentKey] : String(row[currentKey] || "");
        row[currentKey] = previous ? `${previous}\n${rawLine.trim()}` : rawLine.trim();
      } else {
        issues.push({
          code: "txt_invalid_line",
          message: `Line ${lineIndex + 1} in text block ${accumulator.length + 1} must use key: value format`,
          row: accumulator.length + 1,
          line: lineIndex + 1
        });
      }
    }

    if (Object.keys(row).length > 0) {
      accumulator.push(row);
    }

    return accumulator;
  }, []);

  if (!rows.length) {
    issues.push({
      code: "empty_input",
      message: "Text input must use key: value pairs, with one record per blank-line-separated block"
    });
  }

  return { rows, issues };
}

function validateRequiredFields(rows: Array<Record<string, unknown>>, fields: BatchTemplateField[]) {
  const requiredFields = fields.filter((field) => field.required !== false);
  const issues: BatchValidationIssue[] = [];

  rows.forEach((row, index) => {
    for (const field of requiredFields) {
      const value = row[field.key];
      if (value === undefined || value === null || String(value).trim() === "") {
        issues.push({
          code: "missing_required_field",
          message: `Row ${index + 1} is missing required field "${field.label}"`,
          row: index + 1,
          field: field.key
        });
      }
    }
  });

  return issues;
}

export function analyzeBatchRows(input: string, format: BatchInputFormat, fields: BatchTemplateField[] = []): BatchInputAnalysis {
  if (!input.trim()) {
    return {
      rows: [],
      issues: [{ code: "empty_input", message: "Upload a file with at least one row before queueing the batch" }],
      fileFormat: format
    };
  }

  const context: ParseContext = {
    aliases: buildFieldAliasMap(fields),
    allowedKeys: new Set(fields.map((field) => field.key)),
    fields
  };

  let parsed: ParsedRowsResult;

  switch (format) {
    case "json":
      parsed = parseJsonRows(input, context);
      break;
    case "csv":
      parsed = parseCsvRows(input, context);
      break;
    case "txt":
      parsed = parseTextRows(input, context);
      break;
    default:
      return {
        rows: [],
        issues: [{ code: "empty_input", message: "Unsupported batch input format" }],
        fileFormat: format
      };
  }

  return {
    rows: parsed.rows,
    issues: [...parsed.issues, ...validateRequiredFields(parsed.rows, fields)],
    fileFormat: format
  };
}

export function createBatchExampleRows(fields: BatchTemplateField[] = [], rowCount = 2) {
  const fieldKeys = fields.length ? fields.map((field) => field.key) : ["client_name", "project_name", "scope", "timeline", "pricing"];

  return Array.from({ length: rowCount }, (_, rowIndex) =>
    fieldKeys.reduce<Record<string, string>>((accumulator, key) => {
      accumulator[key] = exampleValue(key, rowIndex);
      return accumulator;
    }, {})
  );
}

export function createBatchExampleInput(format: BatchInputFormat, fields: BatchTemplateField[] = [], rowCount = 2) {
  const rows = createBatchExampleRows(fields, rowCount);

  if (format === "json") {
    return JSON.stringify(rows, null, 2);
  }

  if (format === "csv") {
    const headers = fields.length ? fields.map((field) => field.key) : Object.keys(rows[0] || {});
    const matrix = [headers, ...rows.map((row) => headers.map((header) => String(row[header] || "")))];
    return serializeCsvMatrix(matrix);
  }

  return rows
    .map((row) => Object.entries(row).map(([key, value]) => `${key}: ${value}`).join("\n"))
    .join("\n\n");
}

function renameJsonKeys(value: unknown, fromKey: string, toKey: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => renameJsonKeys(item, fromKey, toKey));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.entries(value).reduce<Record<string, unknown>>((accumulator, [key, childValue]) => {
    const nextKey = normalizeBatchKey(key) === fromKey ? toKey : key;
    accumulator[nextKey] = renameJsonKeys(childValue, fromKey, toKey);
    return accumulator;
  }, {});
}

export function applyBatchFieldSuggestion(input: string, format: BatchInputFormat, fromKey: string, toKey: string) {
  if (!input.trim() || !fromKey || !toKey || fromKey === toKey) {
    return input;
  }

  if (format === "csv") {
    const matrix = parseCsvMatrix(input);
    if (!matrix.length) {
      return input;
    }

    matrix[0] = matrix[0].map((header) => (normalizeBatchKey(header) === fromKey ? toKey : header));
    return serializeCsvMatrix(matrix);
  }

  if (format === "json") {
    const parsed = JSON.parse(input);
    return JSON.stringify(renameJsonKeys(parsed, fromKey, toKey), null, 2);
  }

  return input
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => {
      const match = line.match(/^([^:]+):(.*)$/);
      if (!match) {
        return line;
      }

      return normalizeBatchKey(match[1]) === fromKey ? `${toKey}:${match[2]}` : line;
    })
    .join("\n");
}

export function parseBatchRows(input: string, format: BatchInputFormat, fields: BatchTemplateField[] = []) {
  const analysis = analyzeBatchRows(input, format, fields);
  const blockingIssue = analysis.issues.find((issue) => issue.code !== "unknown_field");

  if (blockingIssue) {
    throw new Error(blockingIssue.message);
  }

  return analysis.rows;
}
