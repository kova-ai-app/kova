# Kova — Revenue Intelligence

[![CI](https://github.com/kova-ai-app/kova/actions/workflows/ci.yml/badge.svg)](https://github.com/kova-ai-app/kova/actions/workflows/ci.yml)

Revenue intelligence for drain & plumbing service teams. Records technician calls, transcribes them with Deepgram Nova-3, scores upsell performance with AI, and surfaces missed revenue to field managers.

---

## Architecture Overview

```
kova/ (monorepo)
├── apps/
│   ├── web/          ← Next.js 15 + Clerk + Tailwind 4 (owner/manager dashboard)
│   └── mobile/       ← Expo SDK 55 + React Navigation 7 (technician recording app)
├── packages/
│   ├── shared/       ← TypeScript types, Zod schemas, scoring constants
│   └── db/           ← Drizzle ORM schema + migrations (Neon Postgres)
└── worker/           ← BullMQ scoring worker (Upstash Redis)
```

**Data flow:** Mobile → R2 (audio) → Worker (transcribe+score) → Neon → Web

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node | 22 | Managed via nvm; `.nvmrc` present |
| pnpm | 11.1.0 | Package manager |
| EAS CLI | latest | For mobile builds: `npm install -g eas-cli` |
| Watchman | latest | macOS only: `brew install watchman` |

---

## Quick Start

```bash
# 1. Use correct Node version
nvm use

# 2. Install dependencies
pnpm install

# 3. Copy env file and fill in values (see External Services below)
cp .env.example apps/web/.env.local   # Next.js web app
cp .env.example worker/.env           # Background worker
cp .env.example apps/mobile/.env      # Expo mobile app (EXPO_PUBLIC_* vars)

# 4. Start development servers
pnpm dev
```

> Web runs at http://localhost:3000. The worker requires Redis — either provision via Upstash (see below) or run locally with Docker: `docker run -d -p 6379:6379 redis:alpine`

---

## Project Structure

| Package | Description | Key Tech |
|---------|-------------|----------|
| `apps/web` | Owner/manager dashboard for reviewing call scores and missed revenue | Next.js 15, Clerk, Tailwind 4, Drizzle |
| `apps/mobile` | Technician app for recording customer calls in the field | Expo SDK 55, React Navigation 7, Clerk |
| `packages/shared` | Shared TypeScript types, Zod schemas, and scoring constants | TypeScript, Zod |
| `packages/db` | Database schema, migrations, and seed data | Drizzle ORM, Neon Postgres |
| `worker` | Background job processor for transcription and AI scoring | BullMQ, Upstash Redis, Deepgram, Vercel AI SDK |

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all dev servers (web, mobile Expo, worker) concurrently |
| `pnpm build` | Build all packages and apps for production |
| `pnpm typecheck` | Run TypeScript type checking across the monorepo |
| `pnpm lint` | Lint all packages with ESLint |
| `pnpm test` | Run test suites across all packages |
| `pnpm db:generate` | Generate Drizzle migration files from schema changes |
| `pnpm db:migrate` | Apply pending migrations to the database |
| `pnpm db:seed` | Seed test data (Drain Right company, 5 users, pricebook) |
| `pnpm format` | Format all files with Prettier |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile App | Expo SDK 55, React Navigation 7 |
| Web Dashboard | Next.js 15, Tailwind CSS 4, React |
| Auth | Clerk (with Organizations + phone auth) |
| Database | Neon Postgres (serverless), Drizzle ORM |
| Queue | BullMQ + Upstash Redis |
| Transcription | Deepgram Nova-3 |
| AI Scoring | Vercel AI SDK v6 (OpenAI, Anthropic, Google, Groq, OpenRouter — switchable via env vars) |
| Audio Storage | Cloudflare R2 (S3-compatible) |
| Monitoring | BetterStack (Sentry-SDK compatible) |
| CI/CD | GitHub Actions, Vercel (web), EAS (mobile) |

---

## Environment Variables

All variables are documented with descriptions in `.env.example`. Copy it to `apps/web/.env.local` for web and `worker/.env` for the worker.

Key variables for the worker:

| Variable | Description |
|----------|-------------|
| `LLM_PROVIDER` | LLM provider to use: `openai`, `anthropic`, `google`, `groq`, or `openrouter` |
| `LLM_MODEL` | Model ID for the chosen provider (e.g. `gpt-4o-mini`, `claude-3-haiku-20240307`) |
| `OPENAI_API_KEY` | Required when `LLM_PROVIDER=openai` |
| `ANTHROPIC_API_KEY` | Required when `LLM_PROVIDER=anthropic` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Required when `LLM_PROVIDER=google` |
| `GROQ_API_KEY` | Required when `LLM_PROVIDER=groq` |
| `OPENROUTER_API_KEY` | Required when `LLM_PROVIDER=openrouter` |

---

## External Services Setup

### Clerk (Auth)

1. Create account at https://dashboard.clerk.com
2. Create application → name it "Kova"
3. API Keys → copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (publishable) and `CLERK_SECRET_KEY` (secret)
4. User & Authentication → Phone number → enable "Phone number" as identifier
5. Organizations → Enable Organizations
6. Organizations → Roles → Create role `org:manager` (slug: `org:manager`)
7. Webhooks → Add endpoint → URL: `https://<your-vercel-domain>/api/webhooks/clerk`
8. Subscribe to events: `user.created`, `organization.created`, `organizationMembership.created`
9. Copy Signing Secret → `CLERK_WEBHOOK_SECRET`
10. Mobile: Use same publishable key as `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`

### Neon (Database)

1. Create account at https://console.neon.tech
2. New project → region: US East (AWS)
3. Connection Details → copy "Connection string" (pooled) → `DATABASE_URL`
4. Connection Details → toggle "Direct connection" → copy → `DATABASE_URL_UNPOOLED`
5. Branches → Create branches: `staging`, `dev`, `test` (each gets its own connection string; use `dev` branch URL for local development, `test` branch URL for CI)
6. Run initial migration: `pnpm db:migrate`

### Upstash (Redis)

1. Create account at https://console.upstash.com
2. New Database → name it "kova-redis" → region closest to your worker deployment
3. REST → copy the `REDIS_URL` (use the `rediss://` TLS URL — required by Upstash)

### Cloudflare R2 (Audio Storage)

1. Create account at https://dash.cloudflare.com
2. R2 → Create bucket: `kova-audio-dev` (default region)
3. R2 → Manage R2 API Tokens → Create token with `Object Read & Write` on your bucket
4. Copy credentials → `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
5. Account Home → copy Account ID → set `AWS_ENDPOINT_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
6. Set `AWS_REGION=auto` and `S3_BUCKET_NAME=kova-audio-dev`

### LLM Provider (AI Scoring)

The worker uses [Vercel AI SDK v6](https://sdk.vercel.ai) and supports switching providers without code changes — just set env vars:

| Provider | `LLM_PROVIDER` | `LLM_MODEL` example | Key variable |
|----------|---------------|---------------------|--------------|
| OpenAI | `openai` | `gpt-4o-mini` | `OPENAI_API_KEY` |
| Anthropic | `anthropic` | `claude-3-haiku-20240307` | `ANTHROPIC_API_KEY` |
| Google | `google` | `gemini-1.5-flash` | `GOOGLE_GENERATIVE_AI_API_KEY` |
| Groq | `groq` | `llama-3.1-8b-instant` | `GROQ_API_KEY` |
| OpenRouter | `openrouter` | `openai/gpt-4o-mini` | `OPENROUTER_API_KEY` |

Default (if env vars unset): `openai` / `gpt-4o-mini`.

### BetterStack (Error Monitoring)

1. Create account at https://betterstack.com
2. Logs → Sources → New source → name: `kova-web` → copy ingest URL → `BETTERSTACK_SOURCE_TOKEN`
3. Repeat for `kova-worker`
4. BetterStack is Sentry-SDK compatible — existing `SENTRY_DSN` integrations continue to work

### Vercel (Web Deployment)

1. Create account at https://vercel.com
2. Add New Project → Import from GitHub → select `kova-ai-app/kova`
3. Root Directory: `.` (monorepo root)
4. Framework Preset: Next.js
5. Environment Variables: add all vars from `.env.example` (Clerk, Neon, R2, LLM sections)
6. Deploy
7. Copy production URL → update `NEXT_PUBLIC_APP_URL`
8. Add the Vercel URL to Clerk webhook endpoint

---

## Development Workflow

- **Running migrations:** `pnpm db:migrate` (requires `DATABASE_URL_UNPOOLED`)
- **Generating migrations** after schema changes: `pnpm db:generate`
- **Seeding test data:** `pnpm db:seed` (inserts Drain Right test company + 5 users + pricebook)
- **Mobile development:** `pnpm --filter @kova/mobile dev` (starts Expo dev server)

---

## License

MIT
