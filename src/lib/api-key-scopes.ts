export const apiKeyScopes = [
  "generations:create",
  "generations:create:inline",
  "generations:create:batch",
  "generations:read"
] as const;

export type ApiKeyScope = (typeof apiKeyScopes)[number];

export const defaultApiKeyScopes = [...apiKeyScopes] as ApiKeyScope[];

export const apiKeyScopeLabels: Record<ApiKeyScope, { title: string; description: string }> = {
  "generations:create": {
    title: "Create generation jobs",
    description: "Allow standard POST /api/v1/generations requests"
  },
  "generations:create:inline": {
    title: "Create inline-template jobs",
    description: "Allow POST /api/v1/generations/from-template"
  },
  "generations:create:batch": {
    title: "Create batch jobs",
    description: "Allow POST /api/v1/generations/batch"
  },
  "generations:read": {
    title: "Read job status and outputs",
    description: "Allow status polling plus output listing and downloads"
  }
};