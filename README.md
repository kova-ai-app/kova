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
└── worker/           ← BullMQ scoring worker (Railway + Redis)
```

**Data flow:** Mobile → S3 (audio) → Worker (transcribe+score) → Neon → Web

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

> Web runs at http://localhost:3000. The worker requires Redis — either provision via Railway (see below) or run locally with Docker: `docker run -d -p 6379:6379 redis:alpine`

---

## Project Structure

| Package | Description | Key Tech |
|---------|-------------|----------|
| `apps/web` | Owner/manager dashboard for reviewing call scores and missed revenue | Next.js 15, Clerk, Tailwind 4, Drizzle |
| `apps/mobile` | Technician app for recording customer calls in the field | Expo SDK 55, React Navigation 7, Clerk |
| `packages/shared` | Shared TypeScript types, Zod schemas, and scoring constants | TypeScript, Zod |
| `packages/db` | Database schema, migrations, and seed data | Drizzle ORM, Neon Postgres |
| `worker` | Background job processor for transcription and AI scoring | BullMQ, Redis, Deepgram, OpenAI |

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
| Queue | BullMQ + Redis (Railway) |
| Transcription | Deepgram Nova-3 |
| AI Scoring | OpenAI GPT-4o |
| Audio Storage | AWS S3 |
| Monitoring | Sentry (web + mobile) |
| CI/CD | GitHub Actions, Vercel (web), EAS (mobile) |

---

## Environment Variables

All variables are documented with descriptions in `.env.example`. Copy it to `apps/web/.env.local` for web and `worker/.env` for the worker.

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

### Railway (Redis)

1. Create account at https://railway.app
2. New Project → Add Redis
3. Redis service → Connect → copy `REDIS_URL`

### AWS S3 (Audio Storage)

1. Create S3 bucket: `kova-audio-dev` (region: us-east-1, ACL: private, block all public access)
2. IAM → Users → Create user: `kova-app-user`
3. Attach inline policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
       "Resource": "arn:aws:s3:::kova-audio-dev/*"
     }]
   }
   ```
4. Security credentials → Create access key → copy `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

### Sentry (Error Monitoring)

1. Create account at https://sentry.io
2. New project → Next.js → name: `kova-web` → copy DSN → `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`
3. New project → React Native → name: `kova-mobile` → copy DSN → `EXPO_PUBLIC_SENTRY_DSN`
4. Settings → Auth Tokens → Create token → `SENTRY_AUTH_TOKEN`

### Vercel (Web Deployment)

1. Create account at https://vercel.com
2. Add New Project → Import from GitHub → select `kova-ai-app/kova`
3. Root Directory: `.` (monorepo root)
4. Framework Preset: Next.js
5. Environment Variables: add all vars from `.env.example` (Clerk, Neon, AWS, Sentry sections)
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
