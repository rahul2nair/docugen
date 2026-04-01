# Templify Production Starter

Queue-based document generation app with:
- Premium Next.js UI matching the mockup direction
- REST API (`/api/v1/...`)
- BullMQ + Redis job processing
- Playwright PDF generation
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

The worker also runs recurring My Files cleanup in the background. By default it removes expired saved-file records and their Backblaze objects every 360 minutes. You can change that cadence with `MY_FILES_CLEANUP_INTERVAL_MINUTES`.

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
