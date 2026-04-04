import { createHash, createHmac, randomBytes } from "crypto";
import { nanoid } from "nanoid";
import { Prisma } from "../generated/prisma/client";
import type { UserApiKey, UserProfile, UserSmtpSettings, UserTemplate } from "../generated/prisma/client";
import { defaultApiKeyScopes, type ApiKeyScope } from "@/lib/api-key-scopes";
import { config } from "./config";
import { prisma } from "./prisma";
import { decryptSecret, encryptSecret } from "./secrets";

export interface StoredProfile {
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  footerText?: string;
  signerName?: string;
  signerTitle?: string;
  contactEmail?: string;
}

export interface StoredTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  supportedOutputs: Array<"html" | "pdf">;
  fields: Array<{
    key: string;
    label: string;
    type: "text" | "textarea" | "date" | "number";
    required?: boolean;
    placeholder?: string;
  }>;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredApiKey {
  id: string;
  label?: string;
  keyHint: string;
  createdBy?: string;
  scopes: ApiKeyScope[];
  ownershipHistory: OwnershipHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  lastUsedIp?: string;
  lastUsedUserAgent?: string;
  expiresAt?: string;
  revokedAt?: string;
}

export interface StoredGeneratedFile {
  id: string;
  ownerKey: string;
  jobId: string;
  label: string;
  templateId?: string;
  templateName?: string;
  availableFormats: Array<"html" | "pdf">;
  createdAt: string;
  expiresAt: string;
}

export interface OwnershipHistoryEntry {
  ownerKey: string;
  changedAt: string;
  action: "created" | "claimed" | "revoked";
  actor?: string;
}

const managedApiKeyRecordPrefix = "appkey";

function isManagedApiKeyId(value: string) {
  return /^k[a-f0-9]{16}$/i.test(value);
}

function generateManagedApiKeyId() {
  return `k${randomBytes(8).toString("hex")}`;
}

function hashManagedApiKeyLegacy(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hashManagedApiKey(value: string) {
  if (!config.secretsEncryptionKey) {
    return hashManagedApiKeyLegacy(value);
  }

  return createHmac("sha256", config.secretsEncryptionKey).update(value).digest("hex");
}

function buildManagedApiKey(id: string) {
  const secret = randomBytes(24).toString("base64url");
  return `tmpl_${id}_${secret}`;
}

function normalizeApiKeyScopes(scopes?: ApiKeyScope[]) {
  const candidate = scopes?.length ? scopes : defaultApiKeyScopes;
  const normalized = candidate.filter((scope, index, items) => {
    return defaultApiKeyScopes.includes(scope) && items.indexOf(scope) === index;
  });

  return normalized.length ? normalized : [...defaultApiKeyScopes];
}

function encodeManagedApiKeyRecord(apiKey: string, scopes?: ApiKeyScope[]) {
  const suffix = apiKey.slice(-4);
  const encodedScopes = Buffer.from(JSON.stringify(normalizeApiKeyScopes(scopes))).toString("base64url");
  return `${managedApiKeyRecordPrefix}:v2:${hashManagedApiKey(apiKey)}:${suffix}:${encodedScopes}`;
}

function decodeManagedApiKeyRecord(value: string) {
  if (!value.startsWith(`${managedApiKeyRecordPrefix}:`)) {
    return null;
  }

  const parts = value.split(":");

  if (parts[1] === "v1") {
    const hash = parts[2];
    const suffix = parts[3] || "";

    if (!hash) {
      return null;
    }

    return {
      version: "v1" as const,
      hash,
      suffix,
      scopes: [...defaultApiKeyScopes]
    };
  }

  if (parts[1] !== "v2") {
    return null;
  }

  const hash = parts[2];
  const suffix = parts[3] || "";
  const encodedScopes = parts[4] || "";

  if (!hash) {
    return null;
  }

  try {
    const parsedScopes = JSON.parse(Buffer.from(encodedScopes, "base64url").toString("utf8")) as ApiKeyScope[];

    return {
      version: "v2" as const,
      hash,
      suffix,
      scopes: normalizeApiKeyScopes(parsedScopes)
    };
  } catch {
    return {
      version: "v2" as const,
      hash,
      suffix,
      scopes: [...defaultApiKeyScopes]
    };
  }
}

function parseManagedApiKey(value: string) {
  if (!value.startsWith("tmpl_")) {
    return null;
  }

  const trimmed = value.slice(5);
  const separatorIndex = trimmed.indexOf("_");

  if (separatorIndex <= 0) {
    return null;
  }

  const id = trimmed.slice(0, separatorIndex);
  const secret = trimmed.slice(separatorIndex + 1);

  if (!id || !secret || !isManagedApiKeyId(id)) {
    return null;
  }

  return { id, secret };
}

async function upsertRawApiKeyRecord(
  ownerKey: string,
  provider: string,
  encryptedValue: string,
  metadata?: {
    label?: string | null;
    createdBy?: string | null;
    scopes?: ApiKeyScope[];
    ownershipHistory?: OwnershipHistoryEntry[];
    createdAt?: Date;
    lastUsedAt?: Date | null;
    lastUsedIp?: string | null;
    lastUsedUserAgent?: string | null;
    expiresAt?: Date | null;
    revokedAt?: Date | null;
  }
) {
  const normalizedScopes = normalizeApiKeyScopes(metadata?.scopes);

  await prisma.userApiKey.upsert({
    where: {
      ownerKey_provider: {
        ownerKey,
        provider
      }
    },
    create: {
      ownerKey,
      provider,
      label: metadata?.label ?? null,
      createdBy: metadata?.createdBy ?? null,
      scopes: normalizedScopes,
      encryptedValue,
      ownershipHistory: ((metadata?.ownershipHistory || []) as unknown as Prisma.InputJsonValue),
      createdAt: metadata?.createdAt,
      lastUsedAt: metadata?.lastUsedAt ?? null,
      lastUsedIp: metadata?.lastUsedIp ?? null,
      lastUsedUserAgent: metadata?.lastUsedUserAgent ?? null,
      expiresAt: metadata?.expiresAt ?? null,
      revokedAt: metadata?.revokedAt ?? null
    },
    update: {
      label: metadata?.label === undefined ? undefined : metadata.label,
      createdBy: metadata?.createdBy === undefined ? undefined : metadata.createdBy,
      scopes: normalizedScopes,
      encryptedValue,
      ownershipHistory: metadata?.ownershipHistory
        ? (metadata.ownershipHistory as unknown as Prisma.InputJsonValue)
        : undefined,
      lastUsedAt: metadata?.lastUsedAt === undefined ? undefined : metadata.lastUsedAt,
      lastUsedIp: metadata?.lastUsedIp === undefined ? undefined : metadata.lastUsedIp,
      lastUsedUserAgent: metadata?.lastUsedUserAgent === undefined ? undefined : metadata.lastUsedUserAgent,
      expiresAt: metadata?.expiresAt === undefined ? undefined : metadata.expiresAt,
      revokedAt: metadata?.revokedAt === undefined ? undefined : metadata.revokedAt
    }
  });
}

function parseOwnershipHistory(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) {
    return [] as OwnershipHistoryEntry[];
  }

  return value.reduce<OwnershipHistoryEntry[]>((entries, item) => {
    if (
      item &&
      typeof item === "object" &&
      "ownerKey" in item &&
      "changedAt" in item &&
      "action" in item &&
      typeof item.ownerKey === "string" &&
      typeof item.changedAt === "string" &&
      (item.action === "created" || item.action === "claimed" || item.action === "revoked")
    ) {
      entries.push({
        ownerKey: item.ownerKey,
        changedAt: item.changedAt,
        action: item.action,
        actor: typeof item.actor === "string" ? item.actor : undefined
      });
    }

    return entries;
  }, []);
}

function appendOwnershipHistory(
  history: OwnershipHistoryEntry[],
  entry: OwnershipHistoryEntry
) {
  return [...history, entry];
}

export interface StoredSmtpSettings {
  host: string;
  port: string;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  updatedAt?: string;
}

export function sessionOwnerKey(sessionId: string) {
  return `session:${sessionId}`;
}

export function userOwnerKey(userId: string) {
  return `user:${userId}`;
}

const defaultSupportedOutputs: Array<"html" | "pdf"> = ["html", "pdf"];

interface GeneratedFileRow {
  id: string;
  owner_session_id: string;
  job_id: string;
  label: string;
  template_id: string | null;
  template_name: string | null;
  available_formats: string[] | null;
  created_at: Date;
  expires_at: Date;
}

function preferredItem<T extends { ownerKey: string }>(
  items: T[],
  preferredOwnerKeys: string[]
) {
  for (const ownerKey of preferredOwnerKeys) {
    const match = items.find((item) => item.ownerKey === ownerKey);
    if (match) {
      return match;
    }
  }

  return items[0] || null;
}

function dedupeOwnerKeys(ownerKeys: string[]) {
  return Array.from(new Set(ownerKeys.filter(Boolean)));
}

function mapProfile(record: UserProfile | null): StoredProfile | null {
  if (!record) {
    return null;
  }

  return {
    companyName: record.companyName || undefined,
    logoUrl: record.logoUrl || undefined,
    primaryColor: record.primaryColor || undefined,
    accentColor: record.accentColor || undefined,
    footerText: record.footerText || undefined,
    signerName: record.signerName || undefined,
    signerTitle: record.signerTitle || undefined,
    contactEmail: record.contactEmail || undefined
  };
}

function mapTemplate(record: UserTemplate): StoredTemplate {
  return {
    id: record.id,
    name: record.name,
    description: record.description || undefined,
    category: record.category || undefined,
    supportedOutputs:
      Array.isArray(record.supportedOutputs) && record.supportedOutputs.length
        ? (record.supportedOutputs as Array<"html" | "pdf">)
        : [...defaultSupportedOutputs],
    fields: Array.isArray(record.fields)
      ? (record.fields as StoredTemplate["fields"])
      : [],
    content: record.content,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function mapSmtpSettings(record: UserSmtpSettings | null): StoredSmtpSettings | null {
  if (!record) {
    return null;
  }

  return {
    host: record.host || "",
    port: record.port || "587",
    secure: Boolean(record.secure),
    username: record.username || "",
    password: record.passwordEncrypted ? decryptSecret(record.passwordEncrypted) : "",
    fromName: record.fromName || "",
    fromEmail: record.fromEmail || "",
    updatedAt: record.updatedAt.toISOString()
  };
}

function mapGeneratedFile(record: GeneratedFileRow | null): StoredGeneratedFile | null {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    ownerKey: record.owner_session_id,
    jobId: record.job_id,
    label: record.label,
    templateId: record.template_id || undefined,
    templateName: record.template_name || undefined,
    availableFormats:
      Array.isArray(record.available_formats) && record.available_formats.length
        ? (record.available_formats as Array<"html" | "pdf">)
        : [...defaultSupportedOutputs],
    createdAt: new Date(record.created_at).toISOString(),
    expiresAt: new Date(record.expires_at).toISOString()
  };
}

function profileWriteData(profile: StoredProfile) {
  return {
    companyName: profile.companyName || null,
    logoUrl: profile.logoUrl || null,
    primaryColor: profile.primaryColor || null,
    accentColor: profile.accentColor || null,
    footerText: profile.footerText || null,
    signerName: profile.signerName || null,
    signerTitle: profile.signerTitle || null,
    contactEmail: profile.contactEmail || null
  };
}

function templateWriteData(
  ownerKey: string,
  payload: {
    name: string;
    description?: string;
    category?: string;
    supportedOutputs?: Array<"html" | "pdf">;
    fields?: StoredTemplate["fields"];
    content: string;
  }
) {
  return {
    ownerKey,
    name: payload.name,
    description: payload.description || null,
    category: payload.category || null,
    supportedOutputs: payload.supportedOutputs || [...defaultSupportedOutputs],
    fields: (payload.fields || []) as Prisma.InputJsonValue,
    content: payload.content
  };
}

function smtpWriteData(settings: StoredSmtpSettings) {
  return {
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    username: settings.username,
    passwordEncrypted: encryptSecret(settings.password),
    fromName: settings.fromName || null,
    fromEmail: settings.fromEmail || null
  };
}

async function deleteProfilesByOwnerKeys(ownerKeys: string[]) {
  if (!ownerKeys.length) {
    return;
  }

  await prisma.userProfile.deleteMany({
    where: {
      ownerKey: {
        in: ownerKeys
      }
    }
  });
}

async function deleteApiKeysByOwnerKeys(ownerKeys: string[]) {
  if (!ownerKeys.length) {
    return;
  }

  await prisma.userApiKey.deleteMany({
    where: {
      ownerKey: {
        in: ownerKeys
      }
    }
  });
}

async function deleteSmtpSettingsByOwnerKeys(ownerKeys: string[]) {
  if (!ownerKeys.length) {
    return;
  }

  await prisma.userSmtpSettings.deleteMany({
    where: {
      ownerKey: {
        in: ownerKeys
      }
    }
  });
}

async function deleteGeneratedFilesByOwnerKeys(ownerKeys: string[]) {
  if (!ownerKeys.length) {
    return;
  }

  await prisma.$executeRaw(
    Prisma.sql`
      DELETE FROM user_generated_files
      WHERE owner_session_id IN (${Prisma.join(ownerKeys)})
    `
  );
}

export async function getProfileByOwnerKey(ownerKey: string): Promise<StoredProfile | null> {
  return getProfileByOwnerKeys([ownerKey]);
}

export async function getProfileByOwnerKeys(ownerKeys: string[]): Promise<StoredProfile | null> {
  const dedupedOwnerKeys = dedupeOwnerKeys(ownerKeys);
  if (!dedupedOwnerKeys.length) {
    return null;
  }

  const profiles = await prisma.userProfile.findMany({
    where: {
      ownerKey: {
        in: dedupedOwnerKeys
      }
    }
  });

  return mapProfile(preferredItem(profiles, dedupedOwnerKeys));
}

export async function upsertProfileByOwnerKey(ownerKey: string, profile: StoredProfile) {
  await prisma.userProfile.upsert({
    where: { ownerKey },
    create: {
      ownerKey,
      ...profileWriteData(profile)
    },
    update: profileWriteData(profile)
  });
}

export async function getProfileBySessionId(sessionId: string): Promise<StoredProfile | null> {
  return getProfileByOwnerKeys([sessionOwnerKey(sessionId), sessionId]);
}

export async function upsertProfileBySessionId(sessionId: string, profile: StoredProfile) {
  return upsertProfileByOwnerKey(sessionOwnerKey(sessionId), profile);
}

export async function claimProfile(ownerKey: string, sourceOwnerKeys: string[]) {
  const target = await getProfileByOwnerKey(ownerKey);
  const source = await getProfileByOwnerKeys(sourceOwnerKeys);

  if (!target && source) {
    await upsertProfileByOwnerKey(ownerKey, source);
  }

  await deleteProfilesByOwnerKeys(sourceOwnerKeys.filter((key) => key !== ownerKey));
}

export async function listTemplatesByOwnerKeys(ownerKeys: string[]) {
  const dedupedOwnerKeys = dedupeOwnerKeys(ownerKeys);
  if (!dedupedOwnerKeys.length) {
    return [] as StoredTemplate[];
  }

  const data = await prisma.userTemplate.findMany({
    where: {
      ownerKey: {
        in: dedupedOwnerKeys
      }
    },
    orderBy: {
      updatedAt: "desc"
    },
    take: 200
  });

  const rank = new Map(dedupedOwnerKeys.map((key, index) => [key, index]));
  const merged = new Map<string, UserTemplate>();

  for (const item of data.sort((left, right) => {
    return (rank.get(left.ownerKey) ?? Number.MAX_SAFE_INTEGER) - (rank.get(right.ownerKey) ?? Number.MAX_SAFE_INTEGER);
  })) {
    if (!merged.has(item.id)) {
      merged.set(item.id, item);
    }
  }

  return Array.from(merged.values()).map(mapTemplate);
}

export async function getTemplateByOwnerKey(ownerKey: string, templateId: string) {
  const data = await prisma.userTemplate.findFirst({
    where: {
      ownerKey,
      id: templateId
    }
  });

  return data ? mapTemplate(data) : null;
}

export async function saveTemplateByOwnerKey(
  ownerKey: string,
  payload: {
    id?: string;
    name: string;
    description?: string;
    category?: string;
    supportedOutputs?: Array<"html" | "pdf">;
    fields?: Array<{
      key: string;
      label: string;
      type: "text" | "textarea" | "date" | "number";
      required?: boolean;
      placeholder?: string;
    }>;
    content: string;
  }
) {
  const templateId = payload.id || nanoid(16);

  await prisma.userTemplate.upsert({
    where: { id: templateId },
    create: {
      id: templateId,
      ...templateWriteData(ownerKey, payload)
    },
    update: templateWriteData(ownerKey, payload)
  });

  return templateId;
}

export async function listTemplatesBySessionId(sessionId: string) {
  return listTemplatesByOwnerKeys([sessionOwnerKey(sessionId), sessionId]);
}

export async function saveTemplateBySessionId(
  sessionId: string,
  payload: {
    id?: string;
    name: string;
    description?: string;
    category?: string;
    supportedOutputs?: Array<"html" | "pdf">;
    fields?: Array<{
      key: string;
      label: string;
      type: "text" | "textarea" | "date" | "number";
      required?: boolean;
      placeholder?: string;
    }>;
    content: string;
  }
) {
  return saveTemplateByOwnerKey(sessionOwnerKey(sessionId), payload);
}

export async function deleteTemplateBySessionId(sessionId: string, templateId: string) {
  return deleteTemplateByOwnerKey(sessionOwnerKey(sessionId), templateId);
}

export async function deleteTemplateByOwnerKey(ownerKey: string, templateId: string) {
  await prisma.userTemplate.deleteMany({
    where: {
      ownerKey,
      id: templateId
    }
  });
}

export async function claimTemplates(ownerKey: string, sourceOwnerKeys: string[]) {
  const targetTemplates = await listTemplatesByOwnerKeys([ownerKey]);
  const targetIds = new Set(targetTemplates.map((template) => template.id));
  const sourceTemplates = await listTemplatesByOwnerKeys(sourceOwnerKeys);

  for (const template of sourceTemplates) {
    if (targetIds.has(template.id)) {
      continue;
    }

    await saveTemplateByOwnerKey(ownerKey, template);
  }

  if (!sourceOwnerKeys.length) {
    return;
  }

  await prisma.userTemplate.deleteMany({
    where: {
      ownerKey: {
        in: sourceOwnerKeys.filter((key) => key !== ownerKey)
      }
    }
  });
}

export async function listGeneratedFilesByOwnerKey(
  ownerKey: string,
  options?: { includeExpired?: boolean; limit?: number }
) {
  const limit = Math.min(Math.max(options?.limit || 50, 1), 200);
  const rows = await prisma.$queryRaw<GeneratedFileRow[]>(
    Prisma.sql`
      SELECT
        id,
        owner_session_id,
        job_id,
        label,
        template_id,
        template_name,
        available_formats,
        created_at,
        expires_at
      FROM user_generated_files
      WHERE owner_session_id = ${ownerKey}
        ${options?.includeExpired ? Prisma.empty : Prisma.sql`AND expires_at > NOW()`}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
  );

  return rows.map((row) => mapGeneratedFile(row)).filter((item): item is StoredGeneratedFile => Boolean(item));
}

export async function listExpiredGeneratedFilesByOwnerKey(ownerKey: string, limit = 200) {
  const safeLimit = Math.min(Math.max(limit, 1), 500);
  const rows = await prisma.$queryRaw<GeneratedFileRow[]>(
    Prisma.sql`
      SELECT
        id,
        owner_session_id,
        job_id,
        label,
        template_id,
        template_name,
        available_formats,
        created_at,
        expires_at
      FROM user_generated_files
      WHERE owner_session_id = ${ownerKey}
        AND expires_at <= NOW()
      ORDER BY expires_at ASC
      LIMIT ${safeLimit}
    `
  );

  return rows.map((row) => mapGeneratedFile(row)).filter((item): item is StoredGeneratedFile => Boolean(item));
}

export async function listExpiredGeneratedFiles(limit = 200) {
  const safeLimit = Math.min(Math.max(limit, 1), 500);
  const rows = await prisma.$queryRaw<GeneratedFileRow[]>(
    Prisma.sql`
      SELECT
        id,
        owner_session_id,
        job_id,
        label,
        template_id,
        template_name,
        available_formats,
        created_at,
        expires_at
      FROM user_generated_files
      WHERE expires_at <= NOW()
      ORDER BY expires_at ASC
      LIMIT ${safeLimit}
    `
  );

  return rows.map((row) => mapGeneratedFile(row)).filter((item): item is StoredGeneratedFile => Boolean(item));
}

export async function getGeneratedFileByIdAndOwnerKey(ownerKey: string, id: string) {
  const rows = await prisma.$queryRaw<GeneratedFileRow[]>(
    Prisma.sql`
      SELECT
        id,
        owner_session_id,
        job_id,
        label,
        template_id,
        template_name,
        available_formats,
        created_at,
        expires_at
      FROM user_generated_files
      WHERE owner_session_id = ${ownerKey}
        AND id = ${id}
      LIMIT 1
    `
  );

  return mapGeneratedFile(rows[0] || null);
}

export async function getGeneratedFileByJobId(jobId: string) {
  const rows = await prisma.$queryRaw<GeneratedFileRow[]>(
    Prisma.sql`
      SELECT
        id,
        owner_session_id,
        job_id,
        label,
        template_id,
        template_name,
        available_formats,
        created_at,
        expires_at
      FROM user_generated_files
      WHERE job_id = ${jobId}
      LIMIT 1
    `
  );

  return mapGeneratedFile(rows[0] || null);
}

export async function saveGeneratedFileByOwnerKey(
  ownerKey: string,
  payload: {
    jobId: string;
    label: string;
    templateId?: string;
    templateName?: string;
    availableFormats?: Array<"html" | "pdf">;
    expiresAt: string;
  }
) {
  const generatedId = nanoid(16);
  const availableFormats = payload.availableFormats?.length ? payload.availableFormats : [...defaultSupportedOutputs];
  const rows = await prisma.$queryRaw<GeneratedFileRow[]>(
    Prisma.sql`
      INSERT INTO user_generated_files (
        id,
        owner_session_id,
        job_id,
        label,
        template_id,
        template_name,
        available_formats,
        expires_at
      )
      VALUES (
        ${generatedId},
        ${ownerKey},
        ${payload.jobId},
        ${payload.label},
        ${payload.templateId || null},
        ${payload.templateName || null},
        ARRAY[${Prisma.join(availableFormats.map((format) => Prisma.sql`${format}`))}]::text[],
        ${new Date(payload.expiresAt)}
      )
      ON CONFLICT (job_id)
      DO UPDATE SET
        owner_session_id = EXCLUDED.owner_session_id,
        label = EXCLUDED.label,
        template_id = EXCLUDED.template_id,
        template_name = EXCLUDED.template_name,
        available_formats = EXCLUDED.available_formats,
        expires_at = EXCLUDED.expires_at
      RETURNING id, owner_session_id, job_id, label, template_id, template_name, available_formats, created_at, expires_at
    `
  );

  return mapGeneratedFile(rows[0] || null);
}

export async function deleteGeneratedFileByIdAndOwnerKey(ownerKey: string, id: string) {
  const rows = await prisma.$queryRaw<GeneratedFileRow[]>(
    Prisma.sql`
      DELETE FROM user_generated_files
      WHERE owner_session_id = ${ownerKey}
        AND id = ${id}
      RETURNING id, owner_session_id, job_id, label, template_id, template_name, available_formats, created_at, expires_at
    `
  );

  return mapGeneratedFile(rows[0] || null);
}

export async function deleteGeneratedFileById(id: string) {
  const rows = await prisma.$queryRaw<GeneratedFileRow[]>(
    Prisma.sql`
      DELETE FROM user_generated_files
      WHERE id = ${id}
      RETURNING id, owner_session_id, job_id, label, template_id, template_name, available_formats, created_at, expires_at
    `
  );

  return mapGeneratedFile(rows[0] || null);
}

export async function claimGeneratedFiles(ownerKey: string, sourceOwnerKeys: string[]) {
  const dedupedOwnerKeys = dedupeOwnerKeys(sourceOwnerKeys).filter((key) => key !== ownerKey);

  if (!dedupedOwnerKeys.length) {
    return;
  }

  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE user_generated_files
      SET owner_session_id = ${ownerKey}
      WHERE owner_session_id IN (${Prisma.join(dedupedOwnerKeys)})
        AND owner_session_id <> ${ownerKey}
    `
  );
}

export async function listApiKeysByOwnerKeys(ownerKeys: string[], options?: { includeRevoked?: boolean }) {
  const dedupedOwnerKeys = dedupeOwnerKeys(ownerKeys);
  if (!dedupedOwnerKeys.length) {
    return [] as StoredApiKey[];
  }

  const data = await prisma.userApiKey.findMany({
    where: {
      ownerKey: {
        in: dedupedOwnerKeys
      },
      ...(options?.includeRevoked ? {} : { revokedAt: null })
    },
    orderBy: {
      updatedAt: "desc"
    },
    take: 100
  });

  const rank = new Map(dedupedOwnerKeys.map((key, index) => [key, index]));
  const merged = new Map<string, UserApiKey>();

  for (const item of data.sort((left, right) => {
    return (rank.get(left.ownerKey) ?? Number.MAX_SAFE_INTEGER) - (rank.get(right.ownerKey) ?? Number.MAX_SAFE_INTEGER);
  })) {
    if (!merged.has(item.provider)) {
      merged.set(item.provider, item);
    }
  }

  const normalizedItems = Array.from(merged.values()).map((item) => {
    const managedRecord = decodeManagedApiKeyRecord(item.encryptedValue);

    if (!managedRecord || !isManagedApiKeyId(item.provider)) {
      return null;
    }

    return {
      record: item,
      managedRecord
    };
  }).filter((item): item is { record: UserApiKey; managedRecord: NonNullable<ReturnType<typeof decodeManagedApiKeyRecord>> } => Boolean(item));

  return normalizedItems.map(({ record, managedRecord }) => ({
    id: record.provider,
    label: record.label || undefined,
    keyHint: managedRecord.suffix ? `***${managedRecord.suffix}` : "***",
    createdBy: record.createdBy || undefined,
    scopes: Array.isArray(record.scopes) && record.scopes.length
      ? (record.scopes as ApiKeyScope[])
      : managedRecord.scopes,
    ownershipHistory: parseOwnershipHistory(record.ownershipHistory),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    lastUsedAt: record.lastUsedAt?.toISOString() || undefined,
    lastUsedIp: record.lastUsedIp || undefined,
    lastUsedUserAgent: record.lastUsedUserAgent || undefined,
    expiresAt: record.expiresAt?.toISOString() || undefined,
    revokedAt: record.revokedAt?.toISOString() || undefined
  }));
}

export async function listApiKeysBySessionId(sessionId: string) {
  return listApiKeysByOwnerKeys([sessionOwnerKey(sessionId), sessionId]);
}

export async function listRevokedApiKeysByOwnerKeys(ownerKeys: string[]) {
  const keys = await listApiKeysByOwnerKeys(ownerKeys, { includeRevoked: true });
  return keys.filter((item) => Boolean(item.revokedAt));
}

export async function saveApiKeyBySessionId(sessionId: string, provider: string, apiKey: string) {
  return saveApiKeyByOwnerKey(sessionOwnerKey(sessionId), provider, apiKey);
}

export async function saveApiKeyByOwnerKey(ownerKey: string, provider: string, apiKey: string) {
  const encryptedValue = encryptSecret(apiKey);

  await upsertRawApiKeyRecord(ownerKey, provider, encryptedValue);
}

export async function createManagedApiKeyByOwnerKey(
  ownerKey: string,
  scopes?: ApiKeyScope[],
  metadata?: { label?: string; createdBy?: string; expiresAt?: Date }
) {
  let id = generateManagedApiKeyId();

  while (await prisma.userApiKey.findFirst({ where: { provider: id }, select: { provider: true } })) {
    id = generateManagedApiKeyId();
  }

  const apiKey = buildManagedApiKey(id);
  const normalizedScopes = normalizeApiKeyScopes(scopes);
  const createdAt = new Date();
  const ownershipHistory = appendOwnershipHistory([], {
    ownerKey,
    changedAt: createdAt.toISOString(),
    action: "created",
    actor: metadata?.createdBy || ownerKey
  });

  await upsertRawApiKeyRecord(ownerKey, id, encodeManagedApiKeyRecord(apiKey, normalizedScopes), {
    label: metadata?.label ?? null,
    createdBy: metadata?.createdBy ?? ownerKey,
    scopes: normalizedScopes,
    ownershipHistory,
    createdAt,
    expiresAt: metadata?.expiresAt ?? null
  });

  return {
    id,
    label: metadata?.label,
    apiKey,
    keyHint: `***${apiKey.slice(-4)}`,
    scopes: normalizedScopes,
    expiresAt: metadata?.expiresAt?.toISOString()
  };
}

export async function resolveOwnerKeyForManagedApiKey(apiKey: string) {
  const parsed = parseManagedApiKey(apiKey.trim());
  if (!parsed) {
    return null;
  }

  const record = await prisma.userApiKey.findFirst({
    where: {
      provider: parsed.id,
      revokedAt: null
    }
  });

  if (!record) {
    return null;
  }

  const managedRecord = decodeManagedApiKeyRecord(record.encryptedValue);
  if (!managedRecord) {
    return null;
  }

  const matches = managedRecord.version === "v1"
    ? managedRecord.hash === hashManagedApiKeyLegacy(apiKey)
    : managedRecord.hash === hashManagedApiKey(apiKey);

  if (!matches) {
    return null;
  }

  return {
    ownerKey: record.ownerKey,
    id: record.provider,
    scopes: Array.isArray(record.scopes) && record.scopes.length
      ? (record.scopes as ApiKeyScope[])
      : managedRecord.scopes,
    expiresAt: record.expiresAt?.toISOString()
  };
}

export async function markManagedApiKeyUsed(
  id: string,
  metadata?: { lastUsedIp?: string | null; lastUsedUserAgent?: string | null }
) {
  await prisma.userApiKey.updateMany({
    where: {
      provider: id,
      revokedAt: null
    },
    data: {
      lastUsedAt: new Date(),
      lastUsedIp: metadata?.lastUsedIp ?? undefined,
      lastUsedUserAgent: metadata?.lastUsedUserAgent ?? undefined
    }
  });
}

export async function getApiKeyBySessionId(sessionId: string, provider: string) {
  return getApiKeyByOwnerKeys([sessionOwnerKey(sessionId), sessionId], provider);
}

export async function getApiKeyByOwnerKeys(ownerKeys: string[], provider: string) {
  const dedupedOwnerKeys = dedupeOwnerKeys(ownerKeys);
  if (!dedupedOwnerKeys.length) {
    return null;
  }

  const apiKeys = await prisma.userApiKey.findMany({
    where: {
      ownerKey: {
        in: dedupedOwnerKeys
      },
      provider
    },
    take: 10
  });

  const preferred = preferredItem(apiKeys, dedupedOwnerKeys);
  if (!preferred?.encryptedValue) {
    return null;
  }

  return decryptSecret(preferred.encryptedValue);
}

export async function deleteApiKeyBySessionId(sessionId: string, provider: string) {
  return deleteApiKeyByOwnerKey(sessionOwnerKey(sessionId), provider);
}

export async function deleteApiKeyByOwnerKey(ownerKey: string, provider: string) {
  const record = await prisma.userApiKey.findFirst({
    where: {
      ownerKey,
      provider,
      revokedAt: null
    }
  });

  if (!record) {
    return;
  }

  await prisma.userApiKey.updateMany({
    where: {
      ownerKey,
      provider,
      revokedAt: null
    },
    data: {
      revokedAt: new Date(),
      ownershipHistory: appendOwnershipHistory(parseOwnershipHistory(record.ownershipHistory), {
        ownerKey,
        changedAt: new Date().toISOString(),
        action: "revoked",
        actor: ownerKey
      }) as unknown as Prisma.InputJsonValue
    }
  });
}

export async function claimApiKeys(ownerKey: string, sourceOwnerKeys: string[]) {
  const targetApiKeys = await listApiKeysByOwnerKeys([ownerKey]);
  const targetProviders = new Set(targetApiKeys.map((item) => item.id));
  const filteredOwnerKeys = sourceOwnerKeys.filter((key) => key !== ownerKey);
  const sourceApiKeys = await prisma.userApiKey.findMany({
    where: {
      ownerKey: {
        in: filteredOwnerKeys
      }
    }
  });
  const rank = new Map(filteredOwnerKeys.map((key, index) => [key, index]));
  const merged = new Map<string, UserApiKey>();

  for (const item of sourceApiKeys.sort((left, right) => {
    return (rank.get(left.ownerKey) ?? Number.MAX_SAFE_INTEGER) - (rank.get(right.ownerKey) ?? Number.MAX_SAFE_INTEGER);
  })) {
    if (!merged.has(item.provider)) {
      merged.set(item.provider, item);
    }
  }

  for (const item of merged.values()) {
    if (targetProviders.has(item.provider)) {
      continue;
    }

    await upsertRawApiKeyRecord(ownerKey, item.provider, item.encryptedValue, {
      label: item.label,
      createdBy: item.createdBy,
      scopes: Array.isArray(item.scopes) && item.scopes.length ? (item.scopes as ApiKeyScope[]) : undefined,
      ownershipHistory: appendOwnershipHistory(parseOwnershipHistory(item.ownershipHistory), {
        ownerKey,
        changedAt: new Date().toISOString(),
        action: "claimed",
        actor: ownerKey
      }),
      createdAt: item.createdAt,
      lastUsedAt: item.lastUsedAt,
      expiresAt: item.expiresAt,
      revokedAt: item.revokedAt
    });
  }

  await deleteApiKeysByOwnerKeys(filteredOwnerKeys);
}

export async function getSmtpSettingsBySessionId(sessionId: string): Promise<StoredSmtpSettings | null> {
  return getSmtpSettingsByOwnerKeys([sessionOwnerKey(sessionId), sessionId]);
}

export async function getSmtpSettingsByOwnerKey(ownerKey: string): Promise<StoredSmtpSettings | null> {
  return getSmtpSettingsByOwnerKeys([ownerKey]);
}

export async function getSmtpSettingsByOwnerKeys(ownerKeys: string[]): Promise<StoredSmtpSettings | null> {
  const dedupedOwnerKeys = dedupeOwnerKeys(ownerKeys);
  if (!dedupedOwnerKeys.length) {
    return null;
  }

  const smtpSettings = await prisma.userSmtpSettings.findMany({
    where: {
      ownerKey: {
        in: dedupedOwnerKeys
      }
    }
  });

  return mapSmtpSettings(preferredItem(smtpSettings, dedupedOwnerKeys));
}

export async function upsertSmtpSettingsBySessionId(sessionId: string, settings: StoredSmtpSettings) {
  return upsertSmtpSettingsByOwnerKey(sessionOwnerKey(sessionId), settings);
}

export async function upsertSmtpSettingsByOwnerKey(ownerKey: string, settings: StoredSmtpSettings) {
  await prisma.userSmtpSettings.upsert({
    where: { ownerKey },
    create: {
      ownerKey,
      ...smtpWriteData(settings)
    },
    update: smtpWriteData(settings)
  });
}

export async function deleteSmtpSettingsBySessionId(sessionId: string) {
  return deleteSmtpSettingsByOwnerKey(sessionOwnerKey(sessionId));
}

export async function deleteSmtpSettingsByOwnerKey(ownerKey: string) {
  await prisma.userSmtpSettings.deleteMany({
    where: {
      ownerKey
    }
  });
}

export async function claimSmtpSettings(ownerKey: string, sourceOwnerKeys: string[]) {
  const target = await getSmtpSettingsByOwnerKey(ownerKey);
  const source = await getSmtpSettingsByOwnerKeys(sourceOwnerKeys);

  if (!target && source) {
    await upsertSmtpSettingsByOwnerKey(ownerKey, source);
  }

  await deleteSmtpSettingsByOwnerKeys(sourceOwnerKeys.filter((key) => key !== ownerKey));
}

export async function claimPersistedData(ownerKey: string, sourceOwnerKeys: string[]) {
  const dedupedSourceOwnerKeys = dedupeOwnerKeys(sourceOwnerKeys).filter((key) => key !== ownerKey);

  if (!dedupedSourceOwnerKeys.length) {
    return;
  }

  await claimProfile(ownerKey, dedupedSourceOwnerKeys);
  await claimTemplates(ownerKey, dedupedSourceOwnerKeys);
  await claimApiKeys(ownerKey, dedupedSourceOwnerKeys);
  await claimSmtpSettings(ownerKey, dedupedSourceOwnerKeys);
  await claimGeneratedFiles(ownerKey, dedupedSourceOwnerKeys);
}
