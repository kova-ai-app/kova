# Cost Optimization Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Railway Redis → Upstash, AWS S3 → Cloudflare R2, and Sentry → BetterStack to reduce monthly costs from ~$6-56/mo to ~$0/mo for the MVP.

**Architecture:** Three independent config-level swaps — each service uses the same API surface as its replacement, so code changes are minimal. Upstash Redis requires a TLS flag addition to the ioredis client. Cloudflare R2 requires an `endpoint` field in the S3Client config. BetterStack accepts Sentry SDK DSNs, making it a pure env-var swap for runtime error capture (source map upload via the Sentry build plugin is dropped as a non-critical MVP feature).

**Tech Stack:** ioredis (BullMQ), @aws-sdk/client-s3, @sentry/nextjs, @sentry/react-native

---

## Files Modified

| File | Change |
|---|---|
| `worker/src/lib/redis.ts` | Add conditional TLS option for `rediss://` URLs |
| `apps/web/src/lib/s3.ts` | Add `endpoint` from `S3_ENDPOINT_URL` env var |
| `worker/src/lib/s3.ts` | Add `endpoint` from `S3_ENDPOINT_URL` env var |
| `apps/web/next.config.mjs` | Remove `withSentryConfig` wrapper (drops build-time source map upload) |
| `.env.example` | Update comments and add `S3_ENDPOINT_URL`; rename Redis/S3/Sentry sections |

---

## Task 1: Switch Railway Redis → Upstash Redis

**Context:** Upstash Redis uses TLS (`rediss://` scheme). The current ioredis client doesn't pass `tls: {}` explicitly, which is required for Upstash. We add a one-liner conditional so the same code works with both local Redis (`redis://`) and Upstash (`rediss://`).

**Files:**
- Modify: `worker/src/lib/redis.ts`

- [ ] **Step 1: Create a free Upstash Redis database**

  Go to https://console.upstash.com → Create Database → pick a name (e.g., `kova-redis`) → Region: US-East-1 → Free tier → Create.

  After creation, go to the database detail page → **Connect** tab → copy the **ioredis** connection string. It will look like:
  ```
  rediss://default:<password>@<host>.upstash.io:6379
  ```

- [ ] **Step 2: Update `worker/src/lib/redis.ts` to support TLS**

  Replace the entire file content with:

  ```typescript
  import { Redis } from 'ioredis'

  const REDIS_URL = process.env.REDIS_URL
  if (!REDIS_URL) {
    throw new Error('REDIS_URL is required')
  }

  export function createClient() {
    const useTLS = REDIS_URL!.startsWith('rediss://')

    const redis = new Redis(REDIS_URL!, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      ...(useTLS ? { tls: {} } : {}),
    })

    redis.on('error', (err) => {
      console.error('Redis error:', err)
    })

    return redis
  }

  // Singleton for workers (BullMQ requires dedicated connections)
  let _redisClient: Redis | null = null

  export function getRedisClient() {
    if (!_redisClient) {
      _redisClient = createClient()
    }
    return _redisClient
  }
  ```

- [ ] **Step 3: Update `REDIS_URL` in Railway (worker environment)**

  Railway dashboard → your project → the **worker** service → Variables tab → find `REDIS_URL` → update value to the Upstash `rediss://` URL copied in Step 1.

- [ ] **Step 4: Update `REDIS_URL` in Vercel (web environment)**

  Vercel dashboard → Kova project → Settings → Environment Variables → find `REDIS_URL` → update value to the same Upstash `rediss://` URL.

- [ ] **Step 5: Verify Redis connection locally**

  Set `REDIS_URL` in your local `.env` to the Upstash URL, then run the worker:
  ```bash
  cd worker
  pnpm dev
  ```
  Expected output includes:
  ```
  Redis connected
  Worker ready. Waiting for jobs...
  ```

- [ ] **Step 6: Commit the redis.ts change**

  ```bash
  git add worker/src/lib/redis.ts
  git commit -m "feat: add TLS support for Upstash Redis compatibility"
  ```

- [ ] **Step 7: Cancel the Railway Redis service**

  Once the worker runs on Upstash for 24 hours without errors, go to Railway → your Redis service → Settings → Delete Service. Keep the Railway worker service (still needed to host the BullMQ worker process).

---

## Task 2: Switch AWS S3 → Cloudflare R2

**Context:** Cloudflare R2 is S3-API-compatible. The only code change is adding an `endpoint` field to the `S3Client` constructor in two files. The env vars `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `S3_BUCKET_NAME` are reused with new values. `AWS_REGION` is set to `auto`. A new `S3_ENDPOINT_URL` env var points to the R2 account endpoint.

**Files:**
- Modify: `apps/web/src/lib/s3.ts`
- Modify: `worker/src/lib/s3.ts`

- [ ] **Step 1: Create a Cloudflare account and R2 buckets**

  Go to https://dash.cloudflare.com → sign up if needed → left sidebar → **R2 Object Storage** → Create bucket:
  - Name: `kova-audio-dev` → Location: Automatic → Create
  - Repeat: Name: `kova-audio-prod` → Create

- [ ] **Step 2: Note your Cloudflare Account ID**

  Cloudflare dashboard → right sidebar → your account name → **Account ID** (32-char hex string). Your R2 endpoint will be:
  ```
  https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  ```

- [ ] **Step 3: Create an R2 API token**

  R2 dashboard → **Manage R2 API Tokens** → Create API Token → Name: `kova-app` → Permissions: **Object Read & Write** → Specify bucket: both `kova-audio-dev` and `kova-audio-prod` → Create API Token.

  Save the **Access Key ID** and **Secret Access Key** shown — these replace your AWS credentials.

- [ ] **Step 4: Configure CORS on each R2 bucket (required for presigned PUT uploads)**

  R2 dashboard → `kova-audio-dev` → Settings → CORS Policy → Add rule:

  ```json
  [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
  ```

  Repeat for `kova-audio-prod`.

- [ ] **Step 5: Update `apps/web/src/lib/s3.ts` to add R2 endpoint**

  Replace the entire file with:

  ```typescript
  import { S3Client } from '@aws-sdk/client-s3'

  // ---------------------------------------------------------------------------
  // Singleton S3 client — re-used across invocations in the same warm function
  // ---------------------------------------------------------------------------

  let s3Client: S3Client | null = null

  export function getS3Client(): S3Client {
    if (!s3Client) {
      s3Client = new S3Client({
        region: process.env.AWS_REGION ?? 'auto',
        endpoint: process.env.S3_ENDPOINT_URL, // undefined for real AWS; set for R2
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      })
    }
    return s3Client
  }

  export const S3_BUCKET = process.env.S3_BUCKET_NAME ?? 'kova-audio-dev'
  ```

- [ ] **Step 6: Update `worker/src/lib/s3.ts` to add R2 endpoint**

  Replace the entire file with:

  ```typescript
  import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

  function getS3Client(): S3Client {
    return new S3Client({
      region: process.env.AWS_REGION ?? 'auto',
      endpoint: process.env.S3_ENDPOINT_URL, // undefined for real AWS; set for R2
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }

  async function downloadObject(bucket: string, key: string): Promise<Buffer> {
    const res = await getS3Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    if (!res.Body) throw new Error('S3 object has no body')
    const parts: Uint8Array[] = []
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      parts.push(chunk)
    }
    return Buffer.concat(parts)
  }

  /**
   * Download all S3 chunks for a call and return them concatenated in order.
   * AAC-LC ADTS files can be safely byte-concatenated.
   */
  export async function downloadChunks(s3Keys: string[]): Promise<Buffer> {
    const bucket = process.env.S3_BUCKET_NAME!
    const buffers = await Promise.all(s3Keys.map((key) => downloadObject(bucket, key)))
    return Buffer.concat(buffers)
  }
  ```

- [ ] **Step 7: Update env vars in Vercel (web)**

  Vercel → Kova project → Settings → Environment Variables. Update/add:
  - `AWS_ACCESS_KEY_ID` → R2 Access Key ID from Step 3
  - `AWS_SECRET_ACCESS_KEY` → R2 Secret Access Key from Step 3
  - `AWS_REGION` → `auto`
  - `S3_BUCKET_NAME` → `kova-audio-prod` (production) / `kova-audio-dev` (preview)
  - `S3_ENDPOINT_URL` → `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

- [ ] **Step 8: Update env vars in Railway (worker)**

  Railway → worker service → Variables. Set the same 5 variables (use `kova-audio-prod` for the production worker).

- [ ] **Step 9: Migrate existing audio files from S3 to R2**

  If the buckets have existing files, use `rclone` to copy them across providers:

  ```bash
  brew install rclone

  # Configure rclone (run interactive wizard):
  rclone config
  # Add remote "s3-kova" (type: s3, provider: AWS, use existing AWS env vars)
  # Add remote "r2-kova" (type: s3, provider: Cloudflare, endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com, R2 credentials)

  rclone sync s3-kova:kova-audio-dev r2-kova:kova-audio-dev --progress
  rclone sync s3-kova:kova-audio-prod r2-kova:kova-audio-prod --progress
  ```

  If buckets are empty or data loss is acceptable at this MVP stage, skip this step.

- [ ] **Step 10: Verify the full upload + download flow**

  With local `.env` pointing to R2, trigger a test call recording through the mobile app. Confirm:
  1. Web API returns a presigned PUT URL pointing to `*.r2.cloudflarestorage.com`
  2. Mobile uploads audio chunks successfully
  3. Worker downloads audio from R2 and completes transcription + scoring

  Check Cloudflare R2 dashboard → `kova-audio-dev` → Objects to confirm test files appear.

- [ ] **Step 11: Commit the S3 client changes**

  ```bash
  git add apps/web/src/lib/s3.ts worker/src/lib/s3.ts
  git commit -m "feat: migrate audio storage from AWS S3 to Cloudflare R2"
  ```

---

## Task 3: Switch Sentry → BetterStack

**Context:** BetterStack error tracking accepts Sentry SDK DSNs for runtime error capture. The only code change is removing the `withSentryConfig` build wrapper in `next.config.mjs` — that wrapper only handled source map uploads, which is non-critical for an MVP. The `@sentry/nextjs` and `@sentry/react-native` packages stay installed.

> **If you are a solo developer:** Sentry's free tier (1 user, 5K errors/month) costs $0/mo and covers you entirely. Skip this task until you add team members.

**Files:**
- Modify: `apps/web/next.config.mjs`

- [ ] **Step 1: Create a BetterStack account**

  Go to https://betterstack.com → Sign up for free → navigate to **Logs & Error Tracking**.

- [ ] **Step 2: Create two error tracking sources**

  BetterStack → **Sources** → New Source:
  - Source 1: Name `kova-web` → Platform: **Sentry** → copy the DSN shown
  - Source 2: Name `kova-mobile` → Platform: **Sentry** → copy the DSN shown

- [ ] **Step 3: Update env vars in Vercel (web)**

  Vercel → Kova project → Settings → Environment Variables:
  - `SENTRY_DSN` → BetterStack `kova-web` DSN
  - `NEXT_PUBLIC_SENTRY_DSN` → BetterStack `kova-web` DSN
  - Delete `SENTRY_ORG` (no longer needed)
  - Delete `SENTRY_PROJECT` (no longer needed)
  - Delete `SENTRY_AUTH_TOKEN` (no longer needed)

- [ ] **Step 4: Update env var for Expo (mobile)**

  In `apps/mobile/.env` and in EAS Secrets:
  - `EXPO_PUBLIC_SENTRY_DSN` → BetterStack `kova-mobile` DSN

  To update EAS Secrets: `eas secret:push --scope project` (from `apps/mobile/`)

- [ ] **Step 5: Remove `withSentryConfig` from `apps/web/next.config.mjs`**

  Replace the entire file with:

  ```javascript
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    experimental: {
      typedRoutes: false,
    },
    // Packages that need to be transpiled for server components
    serverExternalPackages: ['@neondatabase/serverless'],
  }

  export default nextConfig
  ```

- [ ] **Step 6: Verify errors appear in BetterStack**

  Deploy the web app. Temporarily add to any API route to test:
  ```typescript
  throw new Error('BetterStack connectivity test — delete me')
  ```
  Check BetterStack → `kova-web` source → Events. Error should appear within 30 seconds. Remove the test throw and redeploy.

- [ ] **Step 7: Commit**

  ```bash
  git add apps/web/next.config.mjs
  git commit -m "feat: migrate error monitoring from Sentry to BetterStack"
  ```

---

## Task 4: Update `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Rewrite `.env.example` to reflect the new services**

  Replace the entire file with:

  ```
  # =============================================================================
  # KOVA — Environment Variables
  # =============================================================================
  # Copy this file to .env.local (web), .env (worker), and fill in real values.
  # Never commit .env or .env.local files.
  #
  # Sections:
  #   1. Clerk (Auth)
  #   2. Database (Neon)
  #   3. Redis (Upstash — free)
  #   4. Cloudflare R2 (Audio storage — free 10 GB)
  #   5. AI Services
  #   6. BetterStack (Error Monitoring — free)
  #   7. Internal
  # =============================================================================

  # -----------------------------------------------------------------------------
  # 1. Clerk (Auth)
  # https://dashboard.clerk.com → API Keys
  # Free up to 50,000 monthly active users
  # -----------------------------------------------------------------------------

  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  CLERK_SECRET_KEY=sk_test_...
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  CLERK_WEBHOOK_SECRET=whsec_...

  # -----------------------------------------------------------------------------
  # 2. Database (Neon Postgres)
  # https://console.neon.tech → Connection string
  # Use the "pooled" connection string for Vercel (serverless)
  # Use the "direct" connection string for drizzle-kit migrations
  # -----------------------------------------------------------------------------

  DATABASE_URL=postgres://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
  DATABASE_URL_UNPOOLED=postgres://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

  # -----------------------------------------------------------------------------
  # 3. Redis (Upstash — free tier)
  # https://console.upstash.com → your database → Connect → ioredis URL
  # Must use rediss:// (TLS) URL — the client auto-detects and enables TLS
  # -----------------------------------------------------------------------------

  REDIS_URL=rediss://default:password@<name>.upstash.io:6379

  # -----------------------------------------------------------------------------
  # 4. Cloudflare R2 (Audio Storage — free 10 GB/mo, no egress fees)
  # https://dash.cloudflare.com → R2 → Manage R2 API Tokens
  # Endpoint format: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  # Buckets: kova-audio-prod (production), kova-audio-dev (development)
  # -----------------------------------------------------------------------------

  AWS_ACCESS_KEY_ID=<r2-access-key-id>
  AWS_SECRET_ACCESS_KEY=<r2-secret-access-key>
  AWS_REGION=auto
  S3_BUCKET_NAME=kova-audio-dev
  S3_ENDPOINT_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com

  # -----------------------------------------------------------------------------
  # 5. AI Services
  # -----------------------------------------------------------------------------

  # Deepgram (Transcription — Nova-3 Multilingual)
  # https://console.deepgram.com → API Keys
  # $200 free credit on signup (~694 hours of transcription)
  DEEPGRAM_API_KEY=...

  # OpenAI (Scoring — GPT-4o-mini)
  # https://platform.openai.com → API Keys
  OPENAI_API_KEY=sk-...

  # -----------------------------------------------------------------------------
  # 6. BetterStack (Error Monitoring — free tier)
  # https://betterstack.com → Logs & Error Tracking → Sources
  # Create two sources (kova-web, kova-mobile) with platform: Sentry
  # The DSN format is Sentry-compatible — no SDK changes required
  # -----------------------------------------------------------------------------

  SENTRY_DSN=https://...@<host>/...
  NEXT_PUBLIC_SENTRY_DSN=https://...@<host>/...
  EXPO_PUBLIC_SENTRY_DSN=https://...@<host>/...

  # -----------------------------------------------------------------------------
  # 7. Internal
  # -----------------------------------------------------------------------------

  APP_ENV=development
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  EXPO_PUBLIC_API_URL=http://localhost:3000
  WORKER_INTERNAL_URL=http://localhost:3001
  BULL_BOARD_PORT=3001
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add .env.example
  git commit -m "docs: update env.example for Upstash Redis, Cloudflare R2, and BetterStack"
  ```

---

## Summary

| Task | Code Changes | Time |
|---|---|---|
| 1. Upstash Redis | `worker/src/lib/redis.ts` + env vars | ~20 min |
| 2. Cloudflare R2 | `apps/web/src/lib/s3.ts`, `worker/src/lib/s3.ts` + env vars | ~30 min |
| 3. BetterStack | `apps/web/next.config.mjs` + env vars | ~15 min |
| 4. Update .env.example | `.env.example` | ~5 min |

**Expected monthly cost after migration: ~$0/mo**
(Vercel Hobby free + Upstash free + R2 free 10 GB + BetterStack free + Clerk/Neon/Expo already free)
