export type OutputFormat = "html" | "pdf";
export type Mode = "template_fill" | "draft_to_document";

export interface TemplateSourceInline {
  type: "inline";
  syntax: "handlebars";
  content: string;
}

export interface TemplateSourceBuiltin {
  type: "builtin";
  templateId: string;
}

export type TemplateSource = TemplateSourceInline | TemplateSourceBuiltin;

export interface DocumentBranding {
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  footerText?: string;
  signerName?: string;
  signerTitle?: string;
  contactEmail?: string;
}

export interface ClauseSelection {
  id: string;
  enabled: boolean;
  content?: string;
}

export interface CustomClause {
  title: string;
  content: string;
}

export interface GenerationRequest {
  mode: Mode;
  templateSource?: TemplateSource;
  data?: Record<string, unknown>;
  source?: {
    type: "text" | "html";
    content: string;
  };
  outputs: OutputFormat[];
  session?: {
    token?: string;
    id?: string;
    revision: number;
    editorId?: string;
  };
  options?: {
    locale?: string;
    pdf?: {
      format?: "A4" | "Letter";
      margin?: "normal" | "narrow";
    };
    documentType?: string;
    branding?: DocumentBranding;
    clauses?: ClauseSelection[];
    customClauses?: CustomClause[];
  };
  persistence?: {
    ownerKey: string;
  };
}

export interface GenerationOutput {
  format: OutputFormat;
  downloadUrl: string;
  expiresAt: string;
}

export interface GenerationResult {
  outputs: GenerationOutput[];
  html?: string;
  session?: {
    id?: string;
    revision?: number;
  };
}

export interface WorkspaceSessionState {
  mode: Mode;
  versioningEnabled?: boolean;
  selectedTemplateId?: string;
  data?: Record<string, unknown>;
  source?: {
    type: "text" | "html";
    content: string;
  };
  outputs: OutputFormat[];
  options?: GenerationRequest["options"];
}

export interface WorkspaceSession {
  id: string;
  revision: number;
  createdAt: string;
  lastAccessedAt: string;
  expiresAt: string;
  state: WorkspaceSessionState;
}

export interface WorkspaceSnapshot {
  id: string;
  revision: number;
  createdAt: string;
  editorId: string;
  note?: string;
  kind: "manual" | "auto" | "conflict" | "restore";
  state: WorkspaceSessionState;
}
