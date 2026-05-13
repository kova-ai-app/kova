# Cost-Optimized MVP Stack Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Railway Redis → Upstash, AWS S3 → Cloudflare R2, and Sentry → BetterStack to reduce monthly infrastructure costs from ~$6-56/mo to ~$0-5/mo.

**Architecture:** All three swaps are config/env-var changes at the application level. Only R2 requires two minimal code changes (adding an `endpoint` field to two `S3Client` constructors). No packages change. No deployment topology changes.

**Tech Stack:** ioredis + BullMQ (Redis), @aws-sdk/client-s3 (S3/R2), @sentry/nextjs + @sentry/react-native (error monitoring)

---

## Scope Note

These three tasks are fully independent. They can be done in any order and each can be verified in isolation. If you want to de-risk even further, do them one at a time with a deployment between each.

---

## Files Changed

| File | Change |
|---|---|
| `apps/web/src/lib/s3.ts` | Add `endpoint` option to `S3Client` constructor |
| `worker/src/lib/s3.ts` | Add `endpoint` option to `S3Client` constructor |
| `.env.example` | Update comments + add `S3_ENDPOINT`, update section headers |
| Vercel env vars | Update `REDIS_URL`, `AWS_*`, `S3_*`, `SENTRY_*` |
| Railway env vars | Update `REDIS_URL`, `AWS_*`, `S3_*`, `SENTRY_DSN_WORKER` |

---

## Task 1: Upstash Redis Setup (env var only)

**Files:**
- No code changes
- Update: Vercel environment variables (web)
- Update: Railway environment variables (worker)

### Context

`worker/src/lib/redis.ts:9` creates a Redis client with:
```ts
const redis = new Redis(REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})
```

ioredis natively handles `rediss://` (TLS) URLs by scheme. Upstash provides `rediss://default:<password>@<host>:<port>` URLs. No code change needed.

`apps/web/src/app/api/calls/upload-complete/route.ts:13-14` uses:
```ts
scoringQueue = new Queue(QUEUE_NAMES.SCORING, {
  connection: { url: process.env.REDIS_URL },
})
```

BullMQ also handles `rediss://` natively. No code change needed.

- [ ] **Step 1: Create Upstash account and database**

  Go to https://console.upstash.com → Sign up (free) → Create Database:
  - Name: `kova-redis`
  - Region: pick closest to your Railway worker region (e.g., `us-east-1`)
  - Type: Regional (free tier)
  - Enable TLS: yes (default)

  After creation, on the database detail page go to **"Connect" → "ioredis"** tab.
  Copy the connection URL — it will look like:
  ```
  rediss://default:AVNS_xxxxxxxxxxxx@sharp-mink-12345.upstash.io:6379
  ```

- [ ] **Step 2: Update REDIS_URL in Railway (worker)**

  Railway dashboard → your project → the worker service → Variables → edit `REDIS_URL`:
  ```
  rediss://default:<password>@<host>.upstash.io:6379
  ```
  Deploy the worker service to pick up the new variable.

- [ ] **Step 3: Update REDIS_URL in Vercel (web)**

  Vercel dashboard → kova-web project → Settings → Environment Variables → edit `REDIS_URL`:
  ```
  rediss://default:<password>@<host>.upstash.io:6379
  ```
  Redeploy (or trigger via git push) to pick up the new variable.

- [ ] **Step 4: Smoke test — verify BullMQ jobs flow**

  After both deployments:
  1. Open the mobile app and complete a short recording
  2. Watch the worker logs in Railway — you should see a `score-call` job being picked up
  3. Confirm the call appears as "scored" in the web dashboard
  4. Optional: open Bull Board at `<railway-worker-url>/bull-board` and verify queue stats show 0 failed jobs

---

## Task 2: Cloudflare R2 Setup (2 code changes + env vars)

**Files:**
- Modify: `apps/web/src/lib/s3.ts`
- Modify: `worker/src/lib/s3.ts`
- Modify: `.env.example` (add `S3_ENDPOINT`, update comments)

### Context

R2's S3-compatible API requires one extra field in the `S3Client` constructor: `endpoint`. Without it, the SDK routes to AWS S3. With it, it routes to R2. Everything else (presigned URLs, `GetObjectCommand`, `PutObjectCommand`) is identical.

R2 endpoint format: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

R2 requires `region: 'auto'` (R2 ignores the region value, but `'auto'` is the conventional placeholder).

- [ ] **Step 1: Create Cloudflare R2 bucket**

  Cloudflare dashboard (https://dash.cloudflare.com) → R2 Object Storage → Create bucket:
  - Bucket name: `kova-audio-prod` (or `kova-audio-dev` for dev environment)
  - Location: Automatic

  Note your **Account ID** from the URL bar: `https://dash.cloudflare.com/<ACCOUNT_ID>/r2/...`

- [ ] **Step 2: Create R2 API token**

  Cloudflare dashboard → R2 → Manage R2 API Tokens → Create API Token:
  - Permissions: Object Read & Write
  - Bucket: restrict to `kova-audio-prod` (and/or `kova-audio-dev`)

  This gives you:
  - `Access Key ID` (analogous to `AWS_ACCESS_KEY_ID`)
  - `Secret Access Key` (analogous to `AWS_SECRET_ACCESS_KEY`)

- [ ] **Step 3: Configure CORS on R2 bucket**

  The mobile app uploads audio directly to presigned PUT URLs. R2 must allow cross-origin PUT requests.

  In R2 bucket settings → CORS → Add rule:
  ```json
  [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["PUT", "GET"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
  ```

- [ ] **Step 4: Update `apps/web/src/lib/s3.ts`**

  Current (`apps/web/src/lib/s3.ts:11-17`):
  ```ts
  s3Client = new S3Client({
    region: process.env.AWS_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
  ```

  Replace with:
  ```ts
  s3Client = new S3Client({
    region: process.env.AWS_REGION ?? 'auto',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
  ```

  Note: `endpoint` is `undefined` when the env var is not set, which the SDK ignores — backward-compatible with any local dev that still uses AWS.

- [ ] **Step 5: Update `worker/src/lib/s3.ts`**

  Current (`worker/src/lib/s3.ts:3-11`):
  ```ts
  function getS3Client(): S3Client {
    return new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  ```

  Replace with:
  ```ts
  function getS3Client(): S3Client {
    return new S3Client({
      region: process.env.AWS_REGION!,
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  ```

- [ ] **Step 6: Update env vars in Vercel (web)**

  Vercel → kova-web → Settings → Environment Variables. Update or add:
  ```
  AWS_ACCESS_KEY_ID=<R2 Access Key ID>
  AWS_SECRET_ACCESS_KEY=<R2 Secret Access Key>
  AWS_REGION=auto
  S3_BUCKET_NAME=kova-audio-prod
  S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  ```

- [ ] **Step 7: Update env vars in Railway (worker)**

  Railway → worker service → Variables. Update or add:
  ```
  AWS_ACCESS_KEY_ID=<R2 Access Key ID>
  AWS_SECRET_ACCESS_KEY=<R2 Secret Access Key>
  AWS_REGION=auto
  S3_BUCKET_NAME=kova-audio-prod
  S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  ```

- [ ] **Step 8: Deploy and smoke test**

  After deploying both services:
  1. Open mobile app → start a short recording → end it
  2. Verify in the Cloudflare R2 dashboard that audio chunks appear in the `kova-audio-prod` bucket under `audio/<company_id>/<session_id>/`
  3. Confirm the worker downloads them and processes the job to completion (call appears as "scored" in web)

- [ ] **Step 9: Commit the two S3 file changes**

  ```bash
  git add apps/web/src/lib/s3.ts worker/src/lib/s3.ts .env.example
  git commit -m "feat: add R2 endpoint support to S3 clients"
  ```

---

## Task 3: BetterStack Error Monitoring (env var only)

**Files:**
- No code changes in runtime files
- Update: Vercel environment variables (web)
- Update: Railway environment variables (worker)
- Update: Expo/EAS environment variables (mobile)

### Context

All three Sentry SDK initializations read from env vars:
- `apps/web/sentry.client.config.ts:3` — `process.env.NEXT_PUBLIC_SENTRY_DSN`
- `apps/web/sentry.server.config.ts:3` — `process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN`
- `apps/web/sentry.edge.config.ts:3` — `process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN`
- `apps/mobile/src/App.tsx:16` — `process.env.EXPO_PUBLIC_SENTRY_DSN`
- Worker — `SENTRY_DSN_WORKER` is in `.env.example` but the worker has no Sentry SDK initialized yet; it's a placeholder for future use

`apps/web/next.config.mjs:12-24` wraps with `withSentryConfig`. This wrapper:
1. **Build-time:** Uploads source maps to Sentry using `SENTRY_AUTH_TOKEN`. Without a valid token it silently skips.
2. **Runtime:** Auto-instruments server functions. This still works — it uses the DSN from `sentry.server.config.ts` at runtime.

Clearing `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` in Vercel causes source map uploads to silently skip. Runtime error reporting continues working and will report to BetterStack via the updated DSN. **No change to `next.config.mjs` is needed.**

`apps/mobile/app.json:53-60` has the Sentry Expo plugin for EAS source map uploads:
```json
["@sentry/react-native/expo", { "url": "https://sentry.io/", "project": "kova-mobile", "organization": "kova" }]
```
This only affects EAS build source map uploads (not runtime error capture). It will fail silently on EAS builds since there's no auth token. Runtime error reporting works via `EXPO_PUBLIC_SENTRY_DSN`. Leave `app.json` unchanged.

- [ ] **Step 1: Create BetterStack account and ingest sources**

  Go to https://betterstack.com → Sign up (free) → Logs & Telemetry.

  Create 3 ingest sources (one per surface):
  - Source name: `kova-web` → Platform: **Sentry** → copy the DSN URL
  - Source name: `kova-worker` → Platform: **Sentry** → copy the DSN URL
  - Source name: `kova-mobile` → Platform: **Sentry** → copy the DSN URL

  Each DSN will look like: `https://<token>@in.logs.betterstack.com/<id>`

- [ ] **Step 2: Update env vars in Vercel (web)**

  Vercel → kova-web → Settings → Environment Variables:
  ```
  SENTRY_DSN=https://<token>@in.logs.betterstack.com/<web-id>
  NEXT_PUBLIC_SENTRY_DSN=https://<token>@in.logs.betterstack.com/<web-id>
  ```

  Also remove or clear these (no longer needed for source map uploads):
  ```
  SENTRY_AUTH_TOKEN=  (clear value)
  SENTRY_ORG=         (clear value)
  SENTRY_PROJECT=     (clear value)
  ```

- [ ] **Step 3: Update env vars in Railway (worker)**

  Railway → worker service → Variables:
  ```
  SENTRY_DSN_WORKER=https://<token>@in.logs.betterstack.com/<worker-id>
  ```

- [ ] **Step 4: Update EXPO_PUBLIC_SENTRY_DSN in Expo/EAS**

  In your EAS environment secrets (https://expo.dev → your project → Secrets):
  ```
  EXPO_PUBLIC_SENTRY_DSN=https://<token>@in.logs.betterstack.com/<mobile-id>
  ```

  Also update `apps/mobile/.env` (local dev):
  ```
  EXPO_PUBLIC_SENTRY_DSN=https://<token>@in.logs.betterstack.com/<mobile-id>
  ```

- [ ] **Step 5: Smoke test — verify errors reach BetterStack**

  1. Trigger a test error in the web app (e.g., temporarily throw in a server action), then check BetterStack → `kova-web` source for the event
  2. Open the mobile app and confirm it loads without crash; BetterStack should show an init event if `debug: true` in dev
  3. On the worker, check Railway logs to confirm no init errors on startup

---

## Task 4: Update `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Update the Redis section (lines 46-50)**

  Replace:
  ```bash
  # -----------------------------------------------------------------------------
  # 3. Redis (Railway)
  # Railway dashboard → your Redis service → Connect → REDIS_URL
  # -----------------------------------------------------------------------------

  REDIS_URL=redis://default:password@monorail.proxy.rlwy.net:PORT
  ```

  With:
  ```bash
  # -----------------------------------------------------------------------------
  # 3. Redis (Upstash)
  # https://console.upstash.com → your database → Connect → ioredis tab
  # Use the rediss:// URL (TLS is required by Upstash)
  # -----------------------------------------------------------------------------

  REDIS_URL=rediss://default:password@sharp-mink-12345.upstash.io:6379
  ```

- [ ] **Step 2: Update the S3 section (lines 53-61)**

  Replace:
  ```bash
  # -----------------------------------------------------------------------------
  # 4. AWS S3 (Audio Storage)
  # IAM user: kova-app-user
  # Buckets: kova-audio-prod (production), kova-audio-dev (development)
  # -----------------------------------------------------------------------------

  AWS_ACCESS_KEY_ID=AKIA...
  AWS_SECRET_ACCESS_KEY=...
  AWS_REGION=us-east-1
  S3_BUCKET_NAME=kova-audio-dev
  ```

  With:
  ```bash
  # -----------------------------------------------------------------------------
  # 4. Audio Storage (Cloudflare R2 — S3-compatible)
  # Cloudflare dashboard → R2 → Manage R2 API Tokens → Create token
  # S3_ENDPOINT = https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  # Buckets: kova-audio-prod (production), kova-audio-dev (development)
  # -----------------------------------------------------------------------------

  AWS_ACCESS_KEY_ID=...
  AWS_SECRET_ACCESS_KEY=...
  AWS_REGION=auto
  S3_BUCKET_NAME=kova-audio-dev
  S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  ```

- [ ] **Step 3: Update the Sentry section (lines 76-91)**

  Replace:
  ```bash
  # -----------------------------------------------------------------------------
  # 6. Sentry
  # https://sentry.io → Project Settings → Client Keys (DSN)
  # -----------------------------------------------------------------------------

  # Web
  SENTRY_DSN=https://...@o...ingest.sentry.io/...
  NEXT_PUBLIC_SENTRY_DSN=https://...@o...ingest.sentry.io/...
  SENTRY_ORG=kova
  SENTRY_PROJECT=kova-web
  SENTRY_AUTH_TOKEN=sntrys_...

  # Mobile
  EXPO_PUBLIC_SENTRY_DSN=https://...@o...ingest.sentry.io/...

  # Worker
  SENTRY_DSN_WORKER=https://...@o...ingest.sentry.io/...
  ```

  With:
  ```bash
  # -----------------------------------------------------------------------------
  # 6. Error Monitoring (BetterStack — Sentry-SDK compatible)
  # https://betterstack.com → Logs & Telemetry → your source → DSN
  # SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN removed (source map upload not used)
  # -----------------------------------------------------------------------------

  # Web (used by sentry.server.config.ts and sentry.client.config.ts)
  SENTRY_DSN=https://...@in.logs.betterstack.com/...
  NEXT_PUBLIC_SENTRY_DSN=https://...@in.logs.betterstack.com/...

  # Mobile
  EXPO_PUBLIC_SENTRY_DSN=https://...@in.logs.betterstack.com/...

  # Worker (placeholder — Sentry SDK not yet initialized in worker)
  SENTRY_DSN_WORKER=https://...@in.logs.betterstack.com/...
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add .env.example
  git commit -m "docs: update env.example for Upstash, R2, and BetterStack"
  ```

---

## Full Verification Checklist

After all four tasks:

- [ ] Record a short call in the mobile app
- [ ] Confirm audio chunks appear in R2 bucket (Cloudflare dashboard → R2 → `kova-audio-prod`)
- [ ] Confirm `score-call` job appears in Bull Board (`<railway-worker-url>/bull-board`)
- [ ] Confirm job completes successfully (no Redis or S3 errors in worker logs)
- [ ] Confirm call appears as "scored" in web dashboard
- [ ] Confirm at least one error event visible in BetterStack → `kova-web`

---

## Risk Notes

| Risk | Likelihood | Mitigation |
|---|---|---|
| Upstash free tier connection limit (10 concurrent) | Low | BullMQ worker concurrency is 5; web is serverless. Well within limits. |
| R2 presigned URL compatibility with mobile PUT | Low | R2 presigned PUT URLs are spec-identical to AWS S3. CORS rule handles preflight. |
| BetterStack DSN format incompatibility | Low | BetterStack explicitly supports the Sentry SDK protocol. |
| `next.config.mjs` Sentry build plugin errors without token | Very low | `withSentryConfig` silently skips upload when `authToken` is undefined. |
| R2 10 GB free tier exceeded | Very low | AAC-LC at 32kbps mono ≈ 14 MB/hour. Needs ~700 hours of calls to hit limit. |
