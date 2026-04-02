# Templify Production Starter

Queue-based document generation app with:
- Premium Next.js UI matching the mockup direction
- REST API (`/api/v1/...`)
- BullMQ + Redis job processing
- Playwright PDF generation (local or remote renderer offload)
- Built-in templates + inline template support
- Three modes:
  - `template_fill`
  - `draft_to_document`
  - `document_modify`

## Quick start

0. Use Node.js 20+

```bash
nvm use
node -v
```

1. Copy `.env.example` to `.env.local`
2. Start Redis

```bash
docker compose up -d redis
```

3. Install and run the app

```bash
npm install
npm run dev
```

4. In a second terminal, start the worker

```bash
npm run dev:worker
```

Recommended production worker setting:

```bash
WORKER_CONCURRENCY=1
```

The worker also runs recurring My Files cleanup in the background. By default it removes expired saved-file records and their Backblaze objects every 360 minutes. You can change that cadence with `MY_FILES_CLEANUP_INTERVAL_MINUTES`.

## PDF renderer offload (recommended for bulk stability)

PDF generation is the most memory-intensive part of the pipeline. You can offload it to a dedicated service instance with separate RAM/CPU.

### 1) Main app / queue worker configuration

Set these environment variables on your main app / worker service:

```bash
PDF_RENDERER_ENDPOINT=https://pdf-renderer.your-domain.com/api/internal/pdf
PDF_RENDERER_AUTH_TOKEN=replace-with-a-long-random-token
PDF_RENDERER_TIMEOUT_MS=45000
PDF_RENDERER_FALLBACK_TO_LOCAL=true
WORKER_CONCURRENCY=1
```

### 2) Dedicated renderer service configuration

Deploy a separate instance from the same codebase and configure:

```bash
PDF_RENDERER_AUTH_TOKEN=replace-with-the-same-token
WORKER_CONCURRENCY=1
```

This service exposes `POST /api/internal/pdf` and validates `x-renderer-token` (or `Authorization: Bearer <token>`).

Security note:
- Keep `PDF_RENDERER_AUTH_TOKEN` set on both services.
- Do not expose this endpoint publicly without token protection.

Operational note:
- BullMQ is durable in Redis and jobs are retry-safe, but retries can cause reprocessing.
- Keep output writes idempotent (the app already keys output files by `jobId + format`).

## Bulk load test (10 concurrent users)

Use this to simulate step 3 (concurrency stress) before changing limits.

1. Start app, Redis, and worker.
2. Run a quick smoke test first:

```bash
LOAD_TEST_CONCURRENT_USERS=2 LOAD_TEST_ROWS_PER_USER=3 npm run test:load:bulk
```

3. Run the full concurrency test:

```bash
LOAD_TEST_CONCURRENT_USERS=10 LOAD_TEST_ROWS_PER_USER=25 LOAD_TEST_SAVE_TO_MY_FILES=false npm run test:load:bulk
```

Optional knobs:

```bash
LOAD_TEST_BASE_URL=http://localhost:3000
LOAD_TEST_USER_STAGGER_MS=250
```

Recommended first pass for stability tuning:
- `WORKER_CONCURRENCY=1`
- `LOAD_TEST_SAVE_TO_MY_FILES=false`
- remote renderer enabled

## Railway deployment pipeline (recommended)

Use 3 Railway services from the same repo:

1. `web` service
- Purpose: Next.js UI + API
- Start command: `npm run start`

2. `worker` service
- Purpose: BullMQ job processing
- Start command: `npm run worker`

3. `renderer` service
- Purpose: isolated PDF rendering
- Start command: `npm run start:renderer`
- Uses endpoint `POST /api/internal/pdf`

Shared env across services:

```bash
REDIS_URL=...
APP_URL=https://your-web-service-url
PDF_RENDERER_AUTH_TOKEN=replace-with-long-random-token
```

`web` + `worker` env:

```bash
PDF_RENDERER_ENDPOINT=https://your-renderer-service-url/api/internal/pdf
PDF_RENDERER_FALLBACK_TO_LOCAL=false
PDF_RENDERER_TIMEOUT_MS=45000
WORKER_CONCURRENCY=1
```

`renderer` env:

```bash
WORKER_CONCURRENCY=1
```

Notes:
- Keep `PDF_RENDERER_FALLBACK_TO_LOCAL=false` in production if you want strict RAM isolation.
- Scale renderer separately from web/worker if PDF traffic grows.

## Railway load testing

Batch API is now paid-gated on the server. For realistic Railway tests, use a paid account API key.

1. Generate a paid account API key with `generations:create:batch` scope.
2. Run the test from your local machine against Railway URL:

```bash
LOAD_TEST_BASE_URL=https://your-web-service-url \
LOAD_TEST_API_KEY=your_api_key_here \
LOAD_TEST_CONCURRENT_USERS=10 \
LOAD_TEST_ROWS_PER_USER=25 \
LOAD_TEST_SAVE_TO_MY_FILES=false \
npm run test:load:bulk
```

Optional safer ramp-up:

```bash
LOAD_TEST_BASE_URL=https://your-web-service-url \
LOAD_TEST_API_KEY=your_api_key_here \
LOAD_TEST_CONCURRENT_USERS=3 \
LOAD_TEST_ROWS_PER_USER=10 \
LOAD_TEST_USER_STAGGER_MS=300 \
npm run test:load:bulk
```

Watch in Railway while test runs:
- worker memory usage
- worker restarts
- renderer memory usage
- queue latency and failure logs

Important:
- UI has always hidden bulk behind paid access.
- API now also enforces paid access (session-token calls from free/anonymous users return `402`).
- For paid account API key calls, `saveToMyFiles` now defaults to `true`; send `saveToMyFiles: false` to opt out.

### Programmatic test-user lifecycle

You can automate create -> key -> paid billing -> load test -> revoke -> disable/delete with one script.

Prerequisites:
- `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`)
- `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
- `DATABASE_URL`
- `LOAD_TEST_BASE_URL`

Seed test users only:

```bash
LOAD_TEST_USER_COUNT=3 \
LOAD_TEST_USER_PREFIX=railway-load \
LOAD_TEST_SUBSCRIPTION_STATUS=active \
npm run test:load:lifecycle -- seed
```

Run load test using seeded manifest:

```bash
LOAD_TEST_BASE_URL=https://your-web-service-url \
LOAD_TEST_CONCURRENT_USERS=10 \
LOAD_TEST_ROWS_PER_USER=25 \
npm run test:load:lifecycle -- test
```

Teardown (revoke keys, cancel billing, then disable users):

```bash
LOAD_TEST_DISABLE_USERS=true \
npm run test:load:lifecycle -- teardown
```

Optional hard cleanup (delete users instead of disable):

```bash
LOAD_TEST_DELETE_USERS=true \
npm run test:load:lifecycle -- teardown
```

End-to-end in one command (seed -> test -> teardown):

```bash
LOAD_TEST_BASE_URL=https://your-web-service-url \
LOAD_TEST_USER_COUNT=3 \
LOAD_TEST_DISABLE_USERS=true \
npm run test:load:lifecycle
```

The script writes `scripts/load-test-users.generated.json` so the same accounts can be reused or torn down safely.

## Supabase persistence (optional but recommended)

Use this when you want session-linked durable storage for profile data, personal templates, and encrypted API keys.

1. Create a Supabase project
2. Copy values into `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
DATABASE_URL=...
DIRECT_URL=...
SECRETS_ENCRYPTION_KEY=replace-with-long-random-secret
```

3. Apply the Prisma migration:

```bash
npm run prisma:migrate:deploy
```

4. If you need the raw SQL instead, use the initial Prisma migration:

```sql
-- prisma/migrations/20260328000000_init/migration.sql
```

New API routes:
- `GET|PUT /api/v1/sessions/:token/profile`
- `GET|POST|DELETE /api/v1/sessions/:token/templates`
- `GET|PUT|DELETE /api/v1/sessions/:token/api-keys`

## Stripe billing

Stripe is now wired in as an account-level billing foundation.

Add these variables to `.env.local` when you want checkout and portal access:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
```

Billing endpoints:
- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `POST /api/billing/webhook`

Recommended local webhook forwarding:

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

## Prisma

Prisma is configured as the schema and migration layer for the same Supabase Postgres database.

- `prisma/schema.prisma` is the schema source of truth for app-owned tables
- `prisma.config.ts` tells Prisma CLI which database URL and migrations path to use
- `prisma/migrations/...` contains the SQL applied to Supabase Postgres
- `src/server/prisma.ts` provides a reusable Prisma client for future runtime queries

Useful commands:

```bash
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate:dev -- --name your_change_name
npm run prisma:migrate:deploy
```

Keep Supabase-managed schemas like `auth` under Supabase control. Prisma should manage only the app tables in `public`.

## Production notes

This starter is production-oriented, but ships with a **local file storage provider** for simplicity.
For true multi-instance production, swap `src/server/output-store.ts` to S3 / R2 and keep the same interface.

## API endpoints

- `GET /api/v1/templates`
- `GET /api/v1/templates/:templateId`
- `POST /api/v1/generations`
- `POST /api/v1/generations/from-template`
- `GET /api/v1/generations/:jobId`
- `GET /api/v1/generations/:jobId/outputs`
- `GET /api/v1/generations/:jobId/outputs/:format`

## Architecture

UI/API (Next.js) -> Redis/BullMQ -> Worker -> local output store (replaceable)
