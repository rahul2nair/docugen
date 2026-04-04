const COMPANY_PROFILE_KEY = "templify-company-profile";
const PERSONAL_TEMPLATES_KEY = "templify-personal-templates";
const SMTP_SETTINGS_KEY = "templify-smtp-config";
const STORAGE_UNAVAILABLE_STATUS = 503;

export interface PersistedProfile {
  companyName: string;
  contactEmail: string;
  signerName: string;
  signerTitle: string;
  primaryColor: string;
  accentColor: string;
  footerText: string;
  logoUrl: string;
}

export interface PersistedTemplateField {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "number";
  required?: boolean;
  placeholder?: string;
}

export interface PersistedTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  supportedOutputs: Array<"html" | "pdf">;
  fields: PersistedTemplateField[];
  content: string;
}

export interface PersistedApiKey {
  id: string;
  label?: string;
  keyHint: string;
  scopes: string[];
  createdBy?: string;
  ownershipHistory: Array<{
    ownerKey: string;
    changedAt: string;
    action: "created" | "claimed" | "revoked";
    actor?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  lastUsedIp?: string;
  lastUsedUserAgent?: string;
  revokedAt?: string;
}

export interface GeneratedPersistedApiKey {
  id: string;
  label?: string;
  apiKey: string;
  keyHint: string;
  scopes: string[];
}

export interface PersistedApiKeyCollection {
  apiKeys: PersistedApiKey[];
  revokedApiKeys: PersistedApiKey[];
}

export interface PersistedSmtpSettings {
  host: string;
  port: string;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  updatedAt?: string;
}

function isBrowser() {
  return typeof window !== "undefined";
}

async function sessionFetch(sessionToken: string, path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers || {});

  if (sessionToken.trim()) {
    headers.set("x-workspace-session", sessionToken.trim());
  }

  return fetch(`/api/v1/session${path}`, {
    ...init,
    headers
  });
}

export function readLocalSmtpSettings(defaultConfig: PersistedSmtpSettings) {
  if (!isBrowser()) {
    return defaultConfig;
  }

  try {
    const raw = window.localStorage.getItem(SMTP_SETTINGS_KEY);
    if (!raw) {
      return defaultConfig;
    }

    return {
      ...defaultConfig,
      ...(JSON.parse(raw) as Partial<PersistedSmtpSettings>)
    };
  } catch {
    return defaultConfig;
  }
}

export function writeLocalSmtpSettings(config: PersistedSmtpSettings) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(SMTP_SETTINGS_KEY, JSON.stringify(config));
  } catch {
    // ignore local storage failures
  }
}

export function readLocalProfile(defaultProfile: PersistedProfile) {
  if (!isBrowser()) {
    return defaultProfile;
  }

  try {
    const raw = window.localStorage.getItem(COMPANY_PROFILE_KEY);
    if (!raw) {
      return defaultProfile;
    }

    return {
      ...defaultProfile,
      ...(JSON.parse(raw) as Partial<PersistedProfile>)
    };
  } catch {
    return defaultProfile;
  }
}

export function writeLocalProfile(profile: PersistedProfile) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(COMPANY_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore local storage failures
  }
}

export function readLocalTemplates() {
  if (!isBrowser()) {
    return [] as PersistedTemplate[];
  }

  try {
    const raw = window.localStorage.getItem(PERSONAL_TEMPLATES_KEY);
    if (!raw) {
      return [] as PersistedTemplate[];
    }

    const parsed = JSON.parse(raw) as PersistedTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as PersistedTemplate[];
  }
}

export function writeLocalTemplates(templates: PersistedTemplate[]) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(PERSONAL_TEMPLATES_KEY, JSON.stringify(templates.slice(0, 60)));
    window.dispatchEvent(new CustomEvent("templify:personal-templates-updated"));
  } catch {
    // ignore local storage failures
  }
}

export function mergeTemplates(localTemplates: PersistedTemplate[], remoteTemplates: PersistedTemplate[]) {
  const merged = new Map<string, PersistedTemplate>();

  for (const template of [...remoteTemplates, ...localTemplates]) {
    if (template?.id) {
      merged.set(template.id, template);
    }
  }

  return Array.from(merged.values());
}

export async function loadPersistedProfile(sessionToken: string, defaultProfile: PersistedProfile) {
  const localProfile = readLocalProfile(defaultProfile);

  if (!sessionToken.trim()) {
    return localProfile;
  }

  try {
    const response = await sessionFetch(sessionToken, "/profile");
    if (response.status === STORAGE_UNAVAILABLE_STATUS) {
      return localProfile;
    }

    const payload = await response.json();
    if (!response.ok || !payload.profile) {
      return localProfile;
    }

    const nextProfile = {
      ...defaultProfile,
      ...payload.profile
    } as PersistedProfile;

    writeLocalProfile(nextProfile);
    return nextProfile;
  } catch {
    return localProfile;
  }
}

export async function savePersistedProfile(sessionToken: string, profile: PersistedProfile) {
  writeLocalProfile(profile);

  if (!sessionToken.trim()) {
    return;
  }

  try {
    const response = await sessionFetch(sessionToken, "/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(profile)
    });

    if (!response.ok && response.status !== STORAGE_UNAVAILABLE_STATUS) {
      throw new Error("Unable to persist profile");
    }
  } catch {
    // keep local fallback only
  }
}

export async function loadPersistedTemplates(sessionToken: string) {
  const localTemplates = readLocalTemplates();

  if (!sessionToken.trim()) {
    return localTemplates;
  }

  try {
    const response = await sessionFetch(sessionToken, "/templates");
    if (response.status === STORAGE_UNAVAILABLE_STATUS) {
      return localTemplates;
    }

    const payload = await response.json();
    if (!response.ok || !Array.isArray(payload.templates)) {
      return localTemplates;
    }

    const merged = mergeTemplates(localTemplates, payload.templates as PersistedTemplate[]);
    writeLocalTemplates(merged);
    return merged;
  } catch {
    return localTemplates;
  }
}

export async function savePersistedTemplate(sessionToken: string, template: PersistedTemplate) {
  const localTemplates = readLocalTemplates();
  const deduped = [template, ...localTemplates.filter((item) => item.id !== template.id)].slice(0, 60);
  writeLocalTemplates(deduped);

  if (!sessionToken.trim()) {
    return { synced: false };
  }

  try {
    const response = await sessionFetch(sessionToken, "/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(template)
    });

    if (response.status === STORAGE_UNAVAILABLE_STATUS) {
      return { synced: false };
    }

    if (!response.ok) {
      throw new Error("Unable to persist template");
    }

    return { synced: true };
  } catch {
    return { synced: false };
  }
}

export async function loadPersistedApiKeys(sessionToken: string) {
  if (!sessionToken.trim()) {
    return {
      apiKeys: [],
      revokedApiKeys: []
    } as PersistedApiKeyCollection;
  }

  try {
    const response = await sessionFetch(sessionToken, "/api-keys");
    if (response.status === STORAGE_UNAVAILABLE_STATUS) {
      return {
        apiKeys: [],
        revokedApiKeys: []
      } as PersistedApiKeyCollection;
    }

    const payload = await response.json();
    if (!response.ok || !Array.isArray(payload.apiKeys)) {
      return {
        apiKeys: [],
        revokedApiKeys: []
      } as PersistedApiKeyCollection;
    }

    return {
      apiKeys: payload.apiKeys as PersistedApiKey[],
      revokedApiKeys: Array.isArray(payload.revokedApiKeys) ? (payload.revokedApiKeys as PersistedApiKey[]) : []
    } as PersistedApiKeyCollection;
  } catch {
    return {
      apiKeys: [],
      revokedApiKeys: []
    } as PersistedApiKeyCollection;
  }
}

export async function createPersistedApiKey(sessionToken: string, scopes: string[], label?: string) {
  if (!sessionToken.trim()) {
    return { synced: false } as const;
  }

  try {
    const response = await sessionFetch(sessionToken, "/api-keys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ label, scopes })
    });

    if (response.status === STORAGE_UNAVAILABLE_STATUS) {
      return { synced: false } as const;
    }

    if (!response.ok) {
      throw new Error("Unable to generate API key");
    }

    const payload = await response.json();

    return {
      synced: true,
      apiKey: payload.apiKey as GeneratedPersistedApiKey
    } as const;
  } catch {
    return { synced: false } as const;
  }
}

export async function deletePersistedApiKey(sessionToken: string, id: string) {
  if (!sessionToken.trim()) {
    return { synced: false };
  }

  try {
    const response = await sessionFetch(sessionToken, `/api-keys?id=${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    if (response.status === STORAGE_UNAVAILABLE_STATUS) {
      return { synced: false };
    }

    if (!response.ok) {
      throw new Error("Unable to delete API key");
    }

    return { synced: true };
  } catch {
    return { synced: false };
  }
}

export async function loadPersistedSmtpSettings(sessionToken: string, defaultConfig: PersistedSmtpSettings) {
  const localConfig = readLocalSmtpSettings(defaultConfig);

  if (!sessionToken.trim()) {
    return localConfig;
  }

  try {
    const response = await sessionFetch(sessionToken, "/smtp");
    if (response.status === STORAGE_UNAVAILABLE_STATUS) {
      return localConfig;
    }

    const payload = await response.json();
    if (!response.ok || !payload.smtp) {
      return localConfig;
    }

    const nextConfig = {
      ...defaultConfig,
      ...payload.smtp
    } as PersistedSmtpSettings;

    writeLocalSmtpSettings(nextConfig);
    return nextConfig;
  } catch {
    return localConfig;
  }
}

export async function savePersistedSmtpSettings(sessionToken: string, config: PersistedSmtpSettings) {
  writeLocalSmtpSettings(config);

  if (!sessionToken.trim()) {
    return { synced: false };
  }

  try {
    const response = await sessionFetch(sessionToken, "/smtp", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(config)
    });

    if (response.status === STORAGE_UNAVAILABLE_STATUS) {
      return { synced: false };
    }

    if (!response.ok) {
      throw new Error("Unable to persist SMTP settings");
    }

    return { synced: true };
  } catch {
    return { synced: false };
  }
}

export async function deletePersistedSmtpSettings(sessionToken: string, defaultConfig: PersistedSmtpSettings) {
  writeLocalSmtpSettings(defaultConfig);

  if (!sessionToken.trim()) {
    return { synced: false };
  }

  try {
    const response = await sessionFetch(sessionToken, "/smtp", {
      method: "DELETE"
    });

    if (response.status === STORAGE_UNAVAILABLE_STATUS) {
      return { synced: false };
    }

    if (!response.ok) {
      throw new Error("Unable to delete SMTP settings");
    }

    return { synced: true };
  } catch {
    return { synced: false };
  }
}

export async function sendPersistedSmtpTest(sessionToken: string, to: string) {
  if (!sessionToken.trim()) {
    return { ok: false, message: "A workspace session is required before testing SMTP." };
  }

  try {
    const response = await sessionFetch(sessionToken, "/smtp/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ to })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        message: (payload as { error?: { message?: string } }).error?.message || "Send failed"
      };
    }

    return { ok: true, message: "Test email sent successfully." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Network error"
    };
  }
}