import { z } from "zod";
import { apiKeyScopes } from "@/lib/api-key-scopes";

const brandingSchema = z
  .object({
    companyName: z.string().trim().min(1).optional(),
    logoUrl: z.string().url().optional().or(z.literal("")),
    primaryColor: z.string().trim().min(1).optional(),
    accentColor: z.string().trim().min(1).optional(),
    footerText: z.string().trim().min(1).optional(),
    signerName: z.string().trim().min(1).optional(),
    signerTitle: z.string().trim().min(1).optional(),
    contactEmail: z.string().email().optional().or(z.literal(""))
  })
  .optional();

const clauseSelectionSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
  content: z.string().optional()
});

const customClauseSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1)
});

const templateFieldSchema = z.object({
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  type: z.enum(["text", "textarea", "date", "number"]),
  required: z.boolean().optional(),
  placeholder: z.string().trim().max(240).optional()
});

const templateSourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("builtin"),
    templateId: z.string().trim().min(1)
  }),
  z.object({
    type: z.literal("inline"),
    syntax: z.literal("handlebars"),
    content: z.string().trim().min(1)
  })
]);

export const generationRequestSchema = z.object({
  mode: z.enum(["template_fill", "draft_to_document"]),
  templateSource: templateSourceSchema.optional(),
  data: z.record(z.any()).optional(),
  saveToMyFiles: z.boolean().optional(),
  source: z
    .object({
      type: z.enum(["text", "html"]),
      content: z.string().min(1)
    })
    .optional(),
  outputs: z.array(z.enum(["html", "pdf"])).min(1),
  session: z
    .object({
      token: z.string().min(1).optional(),
      id: z.string().min(1).optional(),
      revision: z.number().int().min(0),
      editorId: z.string().min(1).optional()
    })
    .optional(),
  options: z
    .object({
      locale: z.string().optional(),
      documentType: z.string().optional(),
      branding: brandingSchema,
      clauses: z.array(clauseSelectionSchema).optional(),
      customClauses: z.array(customClauseSchema).optional(),
      pdf: z
        .object({
          format: z.enum(["A4", "Letter"]).optional(),
          margin: z.enum(["normal", "narrow"]).optional()
        })
        .optional()
    })
    .optional()
}).superRefine((value, ctx) => {
  if (value.mode === "template_fill" && !value.templateSource) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "templateSource is required for template_fill",
      path: ["templateSource"]
    });
  }

  if (value.mode === "draft_to_document" && !value.source?.content) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "source.content is required for draft_to_document",
      path: ["source", "content"]
    });
  }
});

export type GenerationRequestInput = z.infer<typeof generationRequestSchema>;

export const batchGenerationRequestSchema = z.object({
  requests: z.array(generationRequestSchema).min(1).max(25),
  sessionToken: z.string().min(1).optional(),
  saveToMyFiles: z.boolean().optional()
});

export type BatchGenerationRequestInput = z.infer<typeof batchGenerationRequestSchema>;

const workspaceSessionStateSchema = z.object({
  mode: z.enum(["template_fill", "draft_to_document"]),
  versioningEnabled: z.boolean().optional(),
  selectedTemplateId: z.string().optional(),
  data: z.record(z.any()).optional(),
  source: z
    .object({
      type: z.enum(["text", "html"]),
      content: z.string().min(1)
    })
    .optional(),
  outputs: z.array(z.enum(["html", "pdf"])).min(1),
  options: z
    .object({
      locale: z.string().optional(),
      documentType: z.string().optional(),
      branding: brandingSchema,
      clauses: z.array(clauseSelectionSchema).optional(),
      customClauses: z.array(customClauseSchema).optional(),
      pdf: z
        .object({
          format: z.enum(["A4", "Letter"]).optional(),
          margin: z.enum(["normal", "narrow"]).optional()
        })
        .optional()
    })
    .optional()
});

export const createSessionSchema = z.object({
  initialState: workspaceSessionStateSchema.optional()
});

export const saveSessionStateSchema = z.object({
  editorId: z.string().trim().min(1),
  baseRevision: z.number().int().min(0),
  note: z.string().trim().max(240).optional(),
  kind: z.enum(["manual", "auto", "conflict", "restore"]).optional(),
  createSnapshot: z.boolean().optional(),
  state: workspaceSessionStateSchema
});

export const listSnapshotsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const restoreSnapshotSchema = z.object({
  editorId: z.string().trim().min(1),
  baseRevision: z.number().int().min(0),
  note: z.string().trim().max(240).optional()
});

export const profileUpsertSchema = z.object({
  companyName: z.string().trim().max(120).optional(),
  logoUrl: z.string().url().max(2048).optional().or(z.literal("")),
  primaryColor: z.string().trim().max(32).optional(),
  accentColor: z.string().trim().max(32).optional(),
  footerText: z.string().trim().max(240).optional(),
  signerName: z.string().trim().max(120).optional(),
  signerTitle: z.string().trim().max(120).optional(),
  contactEmail: z.string().email().max(190).optional().or(z.literal(""))
});

export const templateUpsertSchema = z.object({
  id: z.string().trim().min(1).max(64).optional(),
  name: z.string().trim().min(1).max(140),
  description: z.string().trim().max(240).optional(),
  category: z.string().trim().max(80).optional(),
  supportedOutputs: z.array(z.enum(["html", "pdf"])).min(1).max(2).optional(),
  fields: z.array(templateFieldSchema).max(200).optional(),
  content: z.string().trim().min(1).max(200000)
});

export const templateDeleteSchema = z.object({
  id: z.string().trim().min(1).max(64)
});

export const apiKeyCreateSchema = z.object({
  label: z.string().trim().max(120).optional(),
  scopes: z.array(z.enum(apiKeyScopes)).min(1).max(apiKeyScopes.length).optional()
});

export const apiKeyDeleteSchema = z.object({
  id: z.string().trim().regex(/^k[a-f0-9]{16}$/i)
});

export const smtpSettingsSchema = z.object({
  host: z.string().trim().max(255),
  port: z.string().trim().max(16),
  secure: z.boolean(),
  username: z.string().trim().max(320),
  password: z.string().trim().max(4000),
  fromName: z.string().trim().max(160),
  fromEmail: z.string().trim().email().max(320).or(z.literal(""))
});

export const smtpTestSchema = z.object({
  to: z.string().trim().email().max(320)
});

export type WorkspaceSessionStateInput = z.infer<typeof workspaceSessionStateSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type SaveSessionStateInput = z.infer<typeof saveSessionStateSchema>;
export type RestoreSnapshotInput = z.infer<typeof restoreSnapshotSchema>;
export type ProfileUpsertInput = z.infer<typeof profileUpsertSchema>;
export type TemplateUpsertInput = z.infer<typeof templateUpsertSchema>;
export type TemplateDeleteInput = z.infer<typeof templateDeleteSchema>;
export type ApiKeyCreateInput = z.infer<typeof apiKeyCreateSchema>;
export type ApiKeyDeleteInput = z.infer<typeof apiKeyDeleteSchema>;
export type SmtpSettingsInput = z.infer<typeof smtpSettingsSchema>;
export type SmtpTestInput = z.infer<typeof smtpTestSchema>;
