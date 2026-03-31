# Document Generator - Architecture Flow

## System Overview

A Next.js-based document generation service that supports both anonymous workspace sessions and authenticated accounts, transforms templates and content into multiple output formats (HTML/PDF), stores outputs on Backblaze B2, uses Redis for job queuing and short-lived session state, and uses Supabase Postgres via Prisma for durable user data.

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│                   (Next.js Frontend / React)                     │
│  ┌─────────────┬──────────────┬──────────────┬──────────────┐  │
│  │ Auth /      │ Dashboard /  │ Template     │  Workspace   │  │
│  │ Header      │ Settings     │ Showcase     │  (Editor)    │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┬┘
                             │
                    HTTP POST/GET Requests
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┬┘
│                      API LAYER (Next.js)                         │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Auth + Access Layer                                     │   │
│  │  ├─ Supabase SSR auth cookies                            │   │
│  │  ├─ Anonymous workspace session tokens                   │   │
│  │  ├─ Account API keys with scopes                         │   │
│  │  └─ Middleware/page-level access control                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Security Controls                                       │   │
│  │  ├─ Zod request validation                               │   │
│  │  ├─ Redis-backed rate limiting                           │   │
│  │  ├─ Owner/job access checks                              │   │
│  │  └─ Audit metadata for account API keys                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  POST /api/v1/generations                                │   │
│  │  ├─ Validate request (Zod schema)                        │   │
│  │  ├─ Enforce session/API-key auth rules                   │   │
│  │  ├─ Apply rate limits                                    │   │
│  │  ├─ Enqueue job to Redis                                 │   │
│  │  └─ Return jobId                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  GET /api/v1/generations/[jobId]/outputs                │   │
│  │  ├─ Check owner/API-key access when applicable          │   │
│  │  ├─ Apply rate limits                                    │   │
│  │  ├─ Query Redis for job status                           │   │
│  │  ├─ Return outputs array with download URLs             │   │
│  │  └─ Check job completion state                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  GET /api/v1/generations/[jobId]/outputs/[format]       │   │
│  │  ├─ Check owner/API-key access when applicable          │   │
│  │  ├─ Apply rate limits                                    │   │
│  │  ├─ Retrieve file from Backblaze B2                      │   │
│  │  ├─ Check job completion                                 │   │
│  │  └─ Stream file to client                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└────────────────────────────────────────────────────────────────┬┘
                             │
                   Queue Management (BullMQ)
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┬┘
│                    QUEUE LAYER (Redis)                           │
│                                                                   │
│                  BullMQ Queue: document-generation              │
│                  ├─ Max Retries: 3                              │
│                  ├─ Auto-cleanup: jobRetentionHours             │
│                  └─ Concurrency: 3 workers                      │
│                                                                   │
└────────────────────────────────────────────────────────────────┬┘
                             │
                    Pick up jobs from queue
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┬┘
│                   WORKER PROCESS                                 │
│              (Background Job Processor)                          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Process Job                                             │   │
│  │  1. Retrieve job data from Redis                         │   │
│  │  2. Read request configuration                           │   │
│  │  3. Pass to rendering engine                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Rendering Engine (render.ts)                            │   │
│  │  ├─ Template Processing                                  │   │
│  │  │  ├─ Load template (inline or builtin)                │   │
│  │  │  ├─ Sanitize template HTML allowlist                 │   │
│  │  │  └─ Compile Handlebars template                      │   │
│  │  ├─ Data Merging                                         │   │
│  │  │  └─ Inject data into template                        │   │
│  │  ├─ Sanitize rendered HTML allowlist                     │   │
│  │  └─ Output safe HTML wrapper                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Format Conversion                                       │   │
│  │  ├─ HTML Format: Return as-is                            │   │
│  │  └─ PDF Format: Playwright (Chromium) headless browser  │   │
│  │     ├─ Render HTML in Chromium                          │   │
│  │     └─ Export as PDF                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Upload to Storage                                       │   │
│  │  ├─ For each output format (HTML/PDF)                    │   │
│  │  ├─ Upload to Backblaze B2                               │   │
│  │  └─ Store with key: documents/{jobId}.{format}           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Return Job Result                                       │   │
│  │  ├─ Generate download URLs with expiry date              │   │
│  │  ├─ Store outputs[] in job result                        │   │
│  │  └─ Mark job as completed                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└────────────────────────────────────────────────────────────────┬┘
                             │
                    Store in Redis
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┬┘
│                  STORAGE LAYER                                   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Redis (Job State)                                       │   │
│  │  ├─ Job metadata (status, progress)                      │   │
│  │  ├─ Job results (output URLs, HTML)                      │   │
│  │  ├─ Anonymous session state + snapshots                  │   │
│  │  ├─ Session/job mapping                                  │   │
│  │  ├─ API rate-limit buckets                               │   │
│  │  └─ Auto-cleanup after jobRetentionHours                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Supabase Postgres via Prisma                            │   │
│  │  ├─ User profiles                                         │   │
│  │  ├─ Saved templates                                       │   │
│  │  ├─ SMTP settings                                         │   │
│  │  ├─ Managed account API keys                              │   │
│  │  └─ Audit / ownership metadata                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Backblaze B2 (Document Files)                           │   │
│  │  ├─ Bucket: docu-gen                                     │   │
│  │  ├─ Path: documents/{jobId}.html                         │   │
│  │  ├─ Path: documents/{jobId}.pdf                          │   │
│  │  └─ Files accessible via S3-compatible API               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Sequence

### 1. **Document Generation Request**
```
Client → POST /api/v1/generations
  ├─ Request Body: GenerationRequest
  │  ├─ mode: "template_fill" | "draft_to_document"
  │  ├─ templateSource: { type: "inline" | "builtin", content/templateId }
  │  ├─ data: { key: value } (template variables)
  │  ├─ outputs: ["html", "pdf"]
  │  ├─ session: { token, revision } for anonymous or browser workspace flows
  │  └─ options: { locale, pdf settings, clauses, branding, etc }
  │
  ├─ Auth Paths
  │  ├─ Anonymous/browser flow: valid workspace session token required
  │  └─ Public API flow: account API key with required scopes
  │
  ├─ Security Checks
  │  ├─ Validate request with Zod
  │  ├─ Resolve owner context
  │  ├─ Apply Redis-backed rate limiting
  │  └─ Reject invalid or expired anonymous session tokens
  │
  └─ Response: { jobId, status: "queued" }
```

### 2. **Job Queuing**
```
generationQueue.add("generate", requestData)
  ├─ Creates job in Redis
  ├─ Job ID: auto-generated nanoid
  ├─ Ownership Tracking
  │  ├─ Anonymous jobs linked to workspace session in Redis
  │  └─ API-key jobs linked to ownerKey for later authorization
  │
  ├─ Job Options:
  │  ├─ Attempts: 3 (retry on failure)
  │  ├─ Remove on complete: after jobRetentionHours
  │  └─ Remove on fail: after jobRetentionHours
  │
  └─ Job sits in queue awaiting worker
```

### 3. **Job Processing by Worker**
```
Worker picks up job from queue
  ├─ renderRequest(request)
  │  ├─ Load template
  │  ├─ Sanitize template source HTML
  │  ├─ Compile Handlebars
  │  ├─ Merge template + data
  │  ├─ Sanitize rendered HTML
  │  └─ Return: { html: string }
  │
  ├─ If "html" in outputs:
  │  └─ saveOutput(jobId, "html", htmlContent)
  │     └─ Upload to B2: documents/{jobId}.html
  │
  ├─ If "pdf" in outputs:
  │  ├─ htmlToPdf(html, pdfOptions)
  │  │  └─ Playwright: render HTML → PDF
  │  │
  │  └─ saveOutput(jobId, "pdf", pdfBuffer)
  │     └─ Upload to B2: documents/{jobId}.pdf
  │
  └─ Return job result with output URLs
```

### 4. **Output Storage on Backblaze B2**
```
saveOutput(jobId, format, content)
  ├─ S3Client with B2 credentials
  ├─ PutObjectCommand()
  │  ├─ Bucket: B2_BUCKET (docu-gen)
  │  ├─ Key: documents/{jobId}.{html|pdf}
  │  ├─ Body: file content
  │  └─ ContentType: application/pdf | text/html
  │
  └─ Returns: S3 response (file stored)
```

### 5. **Retrieve Job Status & Outputs**
```
Client → GET /api/v1/generations/{jobId}/outputs
  ├─ If job is API-key-owned:
  │  ├─ Require account API key
  │  ├─ Verify ownerKey match
  │  └─ Verify generations:read scope
  │
  ├─ Apply read rate limits
  ├─ Query Redis for job
  ├─ Check job.getState() → "completed" | "pending" | "failed"
  │
  ├─ If completed:
  │  └─ Return job.returnvalue.outputs[]
  │     ├─ Each output:
  │     │  ├─ format: "html" | "pdf"
  │     │  ├─ downloadUrl: /api/v1/generations/{jobId}/outputs/{format}
  │     │  └─ expiresAt: ISO timestamp
  │     │
  │     └─ Example:
  │        {
  │          "format": "pdf",
  │          "downloadUrl": "http://localhost:3000/api/v1/...",
  │          "expiresAt": "2026-03-27T12:00:00Z"
  │        }
  │
  └─ If not completed: Return 409 "Outputs are not ready yet"
```

### 6. **Download Generated Document**
```
Client → GET /api/v1/generations/{jobId}/outputs/{format}
  ├─ If job is API-key-owned:
  │  ├─ Require account API key
  │  ├─ Verify ownerKey match
  │  └─ Verify generations:read scope
  │
  ├─ Apply read rate limits
  ├─ Validate job completion
  ├─ readOutput(jobId, format)
  │  ├─ GetObjectCommand() from B2
  │  │  ├─ Bucket: B2_BUCKET
  │  │  ├─ Key: documents/{jobId}.{format}
  │  │  └─ Return: file stream
  │  │
  │  └─ Convert stream to Buffer
  │
  ├─ Set response headers:
  │  ├─ Content-Type: application/pdf | text/html
  │  └─ Content-Disposition: attachment (pdf) | inline (html)
  │
  └─ Stream file to client
```

### 7. **Anonymous Workspace Persistence**
```
Client → POST /api/v1/sessions
  ├─ Apply IP-based session creation rate limit
  ├─ Create session token + session state in Redis
  └─ Return share URL and session metadata

Client → Workspace save / history APIs
  ├─ Resolve session token in Redis
  ├─ Update session state and snapshots
  └─ Keep anonymous workflow available without login
```

### 8. **Authenticated Persistence and Account Data**
```
Signed-in user → Next.js / Supabase SSR auth
  ├─ Middleware refreshes and protects auth-aware routes
  ├─ Persistence context resolves owner as user:{supabaseUserId}
  ├─ Anonymous data can be claimed into authenticated ownership
  └─ Durable records stored in Supabase Postgres via Prisma

Settings / templates / API keys
  ├─ User profile + saved templates → Prisma tables
  ├─ SMTP settings → Prisma + encrypted secret storage
  └─ Managed account API keys → Prisma with scopes and audit metadata
```

### 9. **Public API Key Flow**
```
Client → Authorization: Bearer <api-key> or x-api-key
  ├─ Resolve managed API key by hashed/HMAC record
  ├─ Verify revoked state and scopes
  ├─ Mark key as used with IP + user-agent metadata
  ├─ Associate created jobs with ownerKey
  └─ Enforce scoped access for create/read endpoints
```

---

## Configuration Files

### Environment Variables (.env)
```
REDIS_URL              → Job queue storage
REDIS_KEY_PREFIX       → Prefix for Redis keys, sessions, and rate limits
APP_URL                → Absolute URL used for share and download links
B2_ENDPOINT            → Backblaze S3-compatible endpoint
B2_KEY_ID              → Backblaze API credentials
B2_SECRET_KEY          → Backblaze API secret
B2_BUCKET              → Storage bucket name
B2_REGION              → Backblaze region (eu-central-003)
NEXT_PUBLIC_SUPABASE_URL      → Supabase project URL
SUPABASE_SECRET_KEY           → Supabase service role key
SUPABASE_SERVICE_ROLE_KEY     → Fallback service role key name
DATABASE_URL                  → Prisma pooled connection string
DIRECT_URL                    → Prisma direct connection string
SECRETS_ENCRYPTION_KEY        → HMAC/encryption key for managed secrets
RATE_LIMIT_SESSION_CREATE_LIMIT           → Session create quota
RATE_LIMIT_SESSION_CREATE_WINDOW_SECONDS  → Session create window
RATE_LIMIT_ANONYMOUS_WRITE_LIMIT          → Anonymous generation quota
RATE_LIMIT_ANONYMOUS_WRITE_WINDOW_SECONDS → Anonymous generation window
RATE_LIMIT_ANONYMOUS_READ_LIMIT           → Anonymous read quota
RATE_LIMIT_ANONYMOUS_READ_WINDOW_SECONDS  → Anonymous read window
RATE_LIMIT_API_WRITE_LIMIT                → API key write quota
RATE_LIMIT_API_WRITE_WINDOW_SECONDS       → API key write window
RATE_LIMIT_API_READ_LIMIT                 → API key read quota
RATE_LIMIT_API_READ_WINDOW_SECONDS        → API key read window
RATE_LIMIT_IP_SAFETY_LIMIT                → Cross-tenant IP safety cap
RATE_LIMIT_IP_SAFETY_WINDOW_SECONDS       → Cross-tenant IP safety window
```

### Key Configuration (src/server/config.ts)
```typescript
{
  redisUrl,            // BullMQ connection
  redisKeyPrefix,      // Namespace for Redis objects
  appUrl,              // For generating download URLs
  jobRetentionHours,   // Auto-cleanup threshold
  sessionTtlHours,     // Anonymous session lifetime
  sessionSnapshotLimit,// Workspace history retention
  rateLimit: {         // In-app API protection thresholds
    sessionCreateLimit,
    sessionCreateWindowSeconds,
    anonymousWriteLimit,
    anonymousWriteWindowSeconds,
    anonymousReadLimit,
    anonymousReadWindowSeconds,
    apiWriteLimit,
    apiWriteWindowSeconds,
    apiReadLimit,
    apiReadWindowSeconds,
    ipSafetyLimit,
    ipSafetyWindowSeconds
  },
  supabaseUrl,
  supabaseServiceRoleKey,
  secretsEncryptionKey,
  b2: {                // Backblaze B2 config
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    bucket
  }
}
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS | UI, API communication |
| **Auth** | Supabase SSR Auth | Browser + server session auth |
| **API Routes** | Next.js App Router Route Handlers | HTTP endpoints |
| **Job Queue / Cache** | BullMQ, Redis, ioredis | Async job processing, session state, rate limits |
| **Worker** | Node.js / tsx | Background job processor |
| **Template Engine** | Handlebars | Dynamic content rendering |
| **Sanitization** | sanitize-html | Allowlist HTML and style sanitization |
| **PDF Generation** | Playwright, Chromium | HTML → PDF conversion |
| **Persistence** | Prisma 7, Supabase Postgres | Durable user/account data |
| **Storage** | Backblaze B2, AWS SDK S3 | Document storage |
| **Validation** | Zod | Request validation |

---

## Key Features

✅ **Async Processing** - BullMQ queues requests, worker processes in background  
✅ **Multi-format Output** - Generate HTML and PDF from single template  
✅ **Scalable Storage** - Backblaze B2 with S3-compatible API  
✅ **Time-limited Links** - Generated documents with expiry dates  
✅ **Anonymous + Authenticated Modes** - Workspace sessions for guests, Supabase auth for accounts  
✅ **Durable Persistence** - Profiles, templates, SMTP settings, and API keys stored in Postgres via Prisma  
✅ **Automatic Cleanup** - Jobs auto-removed after retention period  
✅ **Retry Logic** - 3 automatic retries for failed jobs  
✅ **Managed API Keys** - Scoped account API keys with usage and ownership metadata  
✅ **In-App Rate Limiting** - Redis-backed quotas on session creation, writes, reads, and IP safety caps  
✅ **Render Hardening** - Allowlist sanitization before and after Handlebars rendering  
✅ **Multiple Modes** - template_fill and draft_to_document  
✅ **Anonymous Workspace History** - Session snapshots and shareable workspace state  

---

## API Endpoints

```
POST   /api/v1/generations
  ├─ Generate documents asynchronously
  ├─ Anonymous: requires valid workspace session token
  ├─ API: supports scoped account API key
       └─ Returns: { jobId, status }

POST   /api/v1/generations/from-template
  ├─ Inline template generation for public API consumers
  ├─ Requires account API key with generations:create:inline
  └─ Returns: { jobId, status }

POST   /api/v1/generations/batch
  ├─ Queue multiple generation jobs
  ├─ Anonymous: requires valid workspace session token
  ├─ API: requires account API key with generations:create:batch
  └─ Returns: { queued, jobIds }

GET    /api/v1/generations/{jobId}
  ├─ Read job status
  ├─ API-key-owned jobs require generations:read scope
  └─ Returns: job state and optional result/error

GET    /api/v1/generations/{jobId}/outputs
  ├─ Get job outputs
  ├─ API-key-owned jobs require generations:read scope
       └─ Returns: GenerationOutput[]

GET    /api/v1/generations/{jobId}/outputs/{format}
       ├─ Download generated document
  ├─ API-key-owned jobs require generations:read scope
       └─ Returns: file (html/pdf)

POST   /api/v1/sessions
  ├─ Create anonymous workspace session
  ├─ Protected by IP-based rate limiting
  └─ Returns: { token, shareUrl, session }

GET    /api/v1/sessions/{token}
  ├─ Read anonymous workspace session
  └─ Returns: session state

POST   /api/v1/sessions/{token}/rotate
  ├─ Rotate share token for workspace session
  └─ Returns: { token, shareUrl, expiresAt }

GET    /api/v1/sessions/{token}/jobs
  ├─ List jobs associated with a workspace session
  └─ Returns: job history

GET    /api/v1/sessions/{token}/snapshots
  ├─ List workspace snapshots
  └─ Returns: revision history

POST   /api/v1/sessions/{token}/snapshots/{snapshotId}/restore
  ├─ Restore a workspace snapshot
  └─ Returns: updated session state

GET    /api/v1/sessions/{token}/profile
  ├─ Resolve profile for owner context
  └─ Returns: branding/profile settings

GET    /api/v1/sessions/{token}/templates
  ├─ List persisted custom templates for owner context
  └─ Returns: saved templates

GET    /api/v1/sessions/{token}/smtp
  ├─ Read persisted SMTP settings for owner context
  └─ Returns: SMTP configuration

POST   /api/v1/sessions/{token}/smtp/test
  ├─ Send SMTP test email using persisted settings
  └─ Returns: success/failure

GET    /api/v1/sessions/{token}/api-keys
  ├─ List active and revoked managed account API keys
  └─ Returns: key metadata and audit history

GET    /api/v1/templates
       ├─ List built-in templates
       └─ Returns: template metadata

GET    /api/v1/templates/{templateId}
       ├─ Get template details
       └─ Returns: template content
```

---

## Future Enhancements

- Document link expiry enforcement (delete old files from B2)
- Webhook notifications on job completion
- Template versioning
- More automated coverage for API-key read-route throttling and ownership edge cases
- More output formats (DOCX, XLSX, etc)
