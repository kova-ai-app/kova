# Kova — Development Plan v1
## Phase 1 Engineering Plan: Foundation (Months 1–3)

*Solo founder. Greenfield. Drain Right pilot target: prove the estimated opportunity number is real — with the owner's own prices — within 30 days of going live.*

**Source of truth for product requirements:** `docs/product/product-brief-v1.md`
**Companion documents:** `docs/product/product-plan-v3.md`, `docs/product/product-strategy-v1.md`

---

## Table of Contents

1. [Overview & Scope](#1-overview--scope)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Phase 1 Feature Scope](#4-phase-1-feature-scope)
5. [What NOT to Build in Phase 1](#5-what-not-to-build-in-phase-1)
6. [Architecture Deep Dives](#6-architecture-deep-dives)
7. [Weekly Sprint Plan](#7-weekly-sprint-plan)
8. [Infrastructure & DevOps](#8-infrastructure--devops)
9. [Pre-Launch Checklist](#9-pre-launch-checklist)
10. [Risks & Solo Founder Constraints](#10-risks--solo-founder-constraints)
11. [Open Decisions](#11-open-decisions)

---

## 1. Overview & Scope

### What This Document Covers

This is a Phase 1 engineering plan for a solo founder. It covers the full technical implementation of Kova's Foundation phase: from empty repos to a working product live at Drain Right.

Phase 1 is not a polished consumer product. It is a working proof of concept with a real paying customer that proves a single hypothesis:

> **The estimated opportunity number is real, credible, and based on the owner's actual prices — and it changes technician behavior.**

Everything in this plan is scoped to prove that. Features that don't serve that proof are Phase 2.

### Phase 1 Success Gate

All three of the following must be true within 30 days of going live at Drain Right:

1. **$20K–$50K in estimated opportunity identified** — numbers powered by Drain Right's actual pricebook
2. **Owner credibility rating ≥ 8/10** — "this feels accurate" when asked
3. **Recording rate ≥ 65%** — techs are recording and reviewing feedback

### Drain Right Pilot Context

- **Team size:** 16+ technicians
- **Phone split:** Mixed iOS and Android — cross-platform is non-negotiable from Day 1
- **FSM:** ServiceTitan — but ST integration is deferred to Phase 2 (manual job tagging in Phase 1). The ST API partner approval process takes 2–6 months; starting it in Week 1 is a pre-launch action item, but it does not block the pilot.
- **Trade:** Both drain and plumbing — both scoring models are required for Phase 1
- **Expected data volume:** ~160+ calls/week

### Timeline

| Phase | Duration | Goal |
|---|---|---|
| **Phase 1 (this document)** | Weeks 1–12 | Foundation — prove the number |
| Phase 2 | Months 3–6 | Intelligence — ST integration, pre-call, invoice matching, ROI report |
| Phase 3 | Months 6–12 | Expansion — Jobber/HCP, multi-location, PE sales motion |
| Phase 4 | Year 2 | Real-time — in-call coaching, fine-tuned model, HVAC |

---

## 2. Tech Stack

All decisions are validated against production research. Rationale is provided for each.

### 2.1 Mobile App — React Native (Bare)

**Decision: React Native with `react-native-audio-api` (Software Mansion)**

React Native is chosen over Flutter for three reasons:

1. **Background audio reliability.** `react-native-audio-api` (Software Mansion, actively maintained, 73+ releases) has purpose-built background recording with lock screen notification controls (v0.11), recording rotation and chunking for crash resilience (v0.12), and a native C++ audio engine that runs on a dedicated audio thread — no JS bridge overhead during recording. This is the most critical technical requirement in the product.

2. **Full-stack TypeScript.** Mobile app, Next.js dashboard, and Node.js backend all use TypeScript. Shared types, shared validation (Zod schemas), shared API contracts. One language, one linter config, one mental model for a solo founder. Flutter would require maintaining Dart and TypeScript simultaneously.

3. **Expo alternative is insufficient.** `expo-av` does not support background audio recording without ejecting. The product requires bare React Native (or Expo with a custom dev client) from Day 1.

**Framework:** React Native CLI (bare workflow) or Expo with custom dev client + `expo-modules-core` for native module support. The native module requirement for background audio makes managed Expo a non-starter.

**Key libraries:**
| Library | Purpose |
|---|---|
| `react-native-audio-api` | Background audio recording, lock screen controls, recording rotation |
| `@clerk/clerk-expo` | Auth — phone OTP + session management |
| `react-native-fs` | Local file system (offline recording queue) |
| `@aws-sdk/client-s3` | S3 presigned URL upload |
| `react-native-background-upload` | Chunked multipart upload with retry |
| `@notifee/react-native` | Android notification (Foreground Service keepalive) |
| `react-native-push-notification` | Push notification handling (FCM/APNs) |
| `zustand` | Local state management |
| `@tanstack/react-query` | Server state, API data fetching |
| `zod` | Runtime schema validation (shared with backend) |

**On-device recording format:** AAC-LC at 32kbps mono. This produces ~2 MB/hr of audio, is natively supported on both iOS (AVFoundation) and Android (MediaCodec), and requires no codec bridging. Opus transcoding happens server-side during audio ingestion if needed before sending to the transcription API. This avoids the iOS Opus-in-CAF container problem that affects cross-platform Opus recording.

### 2.2 Web Dashboard — Next.js on Vercel

**Decision: Next.js 15 (App Router) deployed on Vercel**

- SSR for the dashboard reduces time-to-meaningful-content for owners checking scores
- App Router with React Server Components keeps data fetching close to the server
- Vercel deployment is zero-config for Next.js
- TypeScript throughout, shared types with the backend
- Tailwind CSS for styling (utility-first, fast to build, no CSS bundle management)

**Key libraries:**
| Library | Purpose |
|---|---|
| `@clerk/nextjs` | Auth — owner/manager web sessions |
| `@tanstack/react-query` | Client-side data fetching and cache |
| `zod` | Shared schema validation |
| `drizzle-orm` | Database ORM (see §2.4) |
| `recharts` | Dashboard charts and trend visualizations |
| `tailwindcss` | Styling |
| `shadcn/ui` | Component library (Radix-based, unstyled, composable) |

**Important:** Vercel handles the dashboard UI and lightweight API routes (presigned URL generation, webhook receipt, dashboard data reads). It does **not** run the audio processing pipeline. Long-running processing (transcription, LLM scoring) runs on Railway (see §2.3).

### 2.3 Backend Processing Pipeline — Railway + BullMQ

**Decision: Railway (Node.js worker service) with BullMQ job queue**

AWS Lambda was evaluated and rejected for Phase 1. The overhead of IAM roles, S3 triggers, CloudWatch logging, and VPC configuration for database access is not appropriate for a solo founder at 640 calls/month pilot scale. The Lambda 15-minute timeout is sufficient for the pipeline (~2–3 minutes total), but the operational complexity is not worth it at this stage. Migration to Lambda/Step Functions is straightforward later if scale requires it.

**Architecture:**
- Railway runs a persistent Node.js process with a BullMQ worker
- BullMQ uses Redis (Railway-provisioned) as the job queue backend
- The Vercel API enqueues a BullMQ job when an upload completes
- The Railway worker processes jobs: download → quality check → transcribe → rules engine → LLM → store → notify
- BullMQ provides built-in retry logic, dead-letter queue, job progress tracking, and a visual dashboard (Bull Board)

**Why Railway over other options:**
- `git push` deploys, no infrastructure configuration
- Normal Node.js process — debug with `console.log`, no CloudWatch
- Built-in metrics and log tailing
- ~$5/month at pilot scale
- No cold starts (persistent process)
- Migration path to ECS/Lambda when scale requires it

**Key libraries:**
| Library | Purpose |
|---|---|
| `bullmq` | Job queue with retry, DLQ, progress |
| `ioredis` | Redis client for BullMQ |
| `@aws-sdk/client-s3` | Download audio from S3 |
| `axios` | HTTP client for external API calls |
| `drizzle-orm` | Database ORM |
| `zod` | Schema validation |
| `pino` | Structured logging |

### 2.4 Database — Neon (PostgreSQL)

**Decision: Neon serverless PostgreSQL**

Neon is standard PostgreSQL with three advantages over other managed providers at this stage:

1. **Scale-to-zero** — costs $0 during development and cents during the pilot. Supabase free tier pauses after 1 week of inactivity; Neon's free tier does not.
2. **Database branching** — create isolated database branches for testing migrations locally without affecting the production schema. Critical for a solo founder with no DBA.
3. **Standard PostgreSQL** — `pg_dump` works, Drizzle ORM works, no vendor-specific extensions required. Zero lock-in.

**ORM: Drizzle ORM**

Drizzle is chosen over Prisma for two reasons: (1) the generated SQL is predictable and readable — important when debugging complex scoring queries, and (2) it supports Neon's serverless driver natively via `drizzle-orm/neon-http`. No connection pool configuration required for the Vercel API routes.

**Connection strategy:**
- Vercel API routes: `@neondatabase/serverless` HTTP driver (stateless, no persistent connection)
- Railway worker: standard `pg` connection pool via `drizzle-orm/node-postgres` (persistent process)

**Pilot cost:** $0 (Neon free tier: 0.5GB storage, 190 compute hours/month — more than enough for a 1-company pilot).

### 2.5 Authentication — Clerk

**Decision: Clerk with `@clerk/clerk-expo` (mobile) and `@clerk/nextjs` (web)**

Supabase Auth was evaluated and rejected. Phone OTP auth — required for technician login — is behind a **$75/month add-on** on Supabase Pro. Clerk's free tier includes phone OTP with no add-on.

**Clerk advantages for this stack:**
- `@clerk/clerk-expo` has prebuilt sign-in/sign-up components that work natively in React Native — weeks of saved development vs. building custom auth UI
- **Organizations** feature maps directly to Kova's multi-tenancy model: Company = Organization, with built-in RBAC. Technician/Field Manager/Owner roles are configured without writing custom middleware.
- Free tier covers 50K monthly active users — sufficient through growth stage
- JWT validation middleware for the Next.js and Railway APIs is one `npm install` away

**Auth flows:**
- **Technicians:** Phone number → SMS OTP → session (React Native)
- **Owners/Managers:** Email + password or Google SSO → session (Next.js web)
- **Role assignment:** Owner invites techs via phone number; Clerk sends onboarding SMS; owner assigns role in Clerk Organization dashboard

**Pilot cost:** $0/month.

### 2.6 Audio Storage — AWS S3

**Decision: AWS S3 for audio file storage**

S3 is retained even though we're moving away from Lambda for processing. S3 is the right storage layer regardless of processing architecture:
- Presigned URLs enable the mobile app to upload directly to S3 without routing audio through the API server (avoids Vercel 4.5MB request body limit)
- `s3:ObjectCreated` event notifications are available if we migrate to Lambda later
- Per-call audio storage cost: ~$0.001–$0.003/call/month
- Bucket policy: private, no public access. Audio URLs are generated as time-limited presigned URLs.

**Lifecycle policy (Day 1):**
- Active storage: S3 Standard (0–90 days)
- Transition to S3 Glacier Instant Retrieval at 90 days (~80% cost reduction)
- Deletion at owner-configured retention period (default 12 months)

**Pilot cost:** ~$0.50/month (10 GB storage + PUT/GET operations for 640 calls/month).

### 2.7 Transcription Provider — Deepgram (provider-agnostic interface)

**Decision: Deepgram Nova-3 Multilingual as the Phase 1 implementation; provider-agnostic interface from Day 1**

Deepgram is chosen over AssemblyAI for one decisive reason: **bilingual code-switching support**. Deepgram's `language=multi` mode provides per-word language detection for EN↔ES mid-sentence switching — exactly what bilingual drain tech calls require. AssemblyAI's code-switching support is primarily available on streaming (not pre-recorded async), and is not clearly documented for the use case.

Secondary reasons: Nova-3 is explicitly optimized for "background noise, crosstalk, and far-field audio" — Kova's exact recording environment. Deepgram has specialized noisy-environment models (drive-thru, automotive) demonstrating investment in this problem class.

**Cost at pilot scale:**
- ~$0.0058/min (Nova-3 Multilingual) + ~$0.002/min (diarization) = ~$0.0078/min
- 30-minute average call: ~$0.23
- 640 calls/month: ~$148/month (at 30-min average)

**AssemblyAI note:** 2–3x cheaper (~$0.11/call) and the Siro case study (90% complaint reduction after switching) is directly analogous to Kova's use case. The provider-agnostic interface means switching to AssemblyAI is a config change after validating real call quality.

**Required validation before committing:** Run 20–30 real Drain Right calls through both providers A/B and compare WER on bilingual and noisy samples.

### 2.8 LLM Provider — Provider-Agnostic Interface, Starting with OpenAI

**Decision: LLM-agnostic abstraction layer. Phase 1 implementation: OpenAI GPT-5.4-mini (primary) + GPT-5.4 (fallback)**

The LLM landscape is changing rapidly. Model pricing, quality, and availability shift on month-to-month timescales. An abstraction layer from Day 1 means swapping models — or accessing them through cloud provider marketplaces (AWS Bedrock, GCP Vertex AI, Azure AI Foundry, Anthropic direct) — is a config change, not a code change.

**Abstraction interface:**
```typescript
interface LLMProvider {
  analyze(input: LLMAnalysisInput): Promise<LLMAnalysisOutput>
  getSupportedModels(): string[]
  estimateCost(tokenCount: TokenCount): number
}

interface LLMAnalysisInput {
  systemPrompt: string
  transcript: string
  scoringSchema: z.ZodSchema        // enforces structured output format
  model: string                     // model identifier (provider-specific)
  maxTokens: number
  temperature: number               // 0 for scoring tasks
}

interface LLMAnalysisOutput {
  result: ScoringResult             // validated against scoringSchema
  confidence: number                // 0–1
  tokensUsed: TokenCount
  modelUsed: string
  latencyMs: number
}
```

**Phase 1 implementations (only):**

| Implementation | Model(s) | Use |
|---|---|---|
| `OpenAIProvider` | `gpt-5.4-mini`, `gpt-5.4` | Phase 1 default |

**Phase 2+ implementations (interface only in Phase 1):**

| Implementation | Routes to |
|---|---|
| `AnthropicProvider` | Claude Haiku, Sonnet via api.anthropic.com |
| `BedrockProvider` | Any Bedrock-hosted model via AWS SDK |
| `VertexProvider` | Gemini models via GCP Vertex AI |
| `AzureFoundryProvider` | Any model hosted on Azure AI Foundry |

**Routing logic:**

```
Transcript → OpenAIProvider (gpt-5.4-mini)
                 ↓
         output.confidence < CONFIDENCE_THRESHOLD (0.72)?
           Yes → OpenAIProvider (gpt-5.4) for re-analysis of low-confidence dimensions only
           No  → Accept scores
```

The fallback model can be from a different provider than the primary — the interface makes this transparent to the scoring engine.

**Cost at pilot scale:**
- GPT-5.4-mini: ~$0.01/call → ~$6.40/month for 640 calls
- Blended with ~10–15% GPT-5.4 re-analysis: ~$0.013–$0.016/call → ~$8–10/month
- Target COGS ($0.02–$0.08/call LLM) is comfortably met

**Config-driven provider selection:**
```
LLM_PRIMARY_PROVIDER=openai
LLM_PRIMARY_MODEL=gpt-5.4-mini
LLM_FALLBACK_PROVIDER=openai
LLM_FALLBACK_MODEL=gpt-5.4
LLM_CONFIDENCE_THRESHOLD=0.72
```

### 2.9 Payments — Stripe

Standard Stripe integration. No custom billing logic in Phase 1 — use Stripe Billing with products and prices pre-configured.

- Products: Starter ($89/seat), Pro ($129/seat), Team ($149/seat)
- Annual billing as default offer (2 months free = 10 months billed)
- Monthly as opt-in
- 14-day free trial via Stripe trial periods
- Webhook handler for subscription events (created, updated, canceled, payment failed)
- Dunning: Stripe's built-in Smart Retries handle failed payment retries

### 2.10 Push Notifications — Firebase Cloud Messaging (FCM)

- FCM for both iOS and Android (single API)
- `react-native-firebase` for the mobile SDK
- Server-side: `firebase-admin` SDK in the Railway worker
- Notification types in Phase 1: post-call summary ready, badge earned, streak milestone, weekly digest reminder

### 2.11 Email — Resend

- Resend for transactional email (weekly digest, auth emails, billing notifications)
- React Email for template authoring (TypeScript component-based templates)
- Vercel API route handles weekly digest scheduling via a cron job

### 2.12 Validated Tech Stack Summary

| Layer | Technology | Hosting |
|---|---|---|
| Mobile app | React Native (bare) | App Store + Google Play |
| Mobile audio | `react-native-audio-api` (Software Mansion) | On-device |
| Web dashboard | Next.js 15 (App Router) | Vercel |
| Processing pipeline | Node.js + BullMQ | Railway |
| Job queue | BullMQ + Redis | Railway (Redis add-on) |
| Database | PostgreSQL via Neon | Neon |
| ORM | Drizzle ORM | — |
| Auth | Clerk | Clerk cloud |
| Audio storage | AWS S3 | AWS us-east-1 |
| Transcription | Deepgram Nova-3 Multilingual | Deepgram cloud |
| LLM (primary) | OpenAI GPT-5.4-mini | OpenAI cloud |
| LLM (fallback) | OpenAI GPT-5.4 | OpenAI cloud |
| Payments | Stripe | Stripe cloud |
| Push notifications | Firebase Cloud Messaging | Google cloud |
| Email | Resend + React Email | Resend cloud |
| Language | TypeScript everywhere | — |

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MOBILE APP (React Native)                    │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────────┐   │
│  │  Recording   │  │  Offline Queue  │  │   Tech Dashboard     │   │
│  │  Engine      │  │  (local FS)     │  │   (scores/badges)    │   │
│  └──────┬───────┘  └────────┬────────┘  └──────────────────────┘   │
└─────────┼───────────────────┼─────────────────────────────────────┘
          │ AAC-LC audio       │ upload when online
          ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    VERCEL (Next.js)                                  │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Dashboard UI  │  /api/presign  │  /api/upload-complete    │     │
│  │  (SSR/RSC)     │  (S3 presign)  │  (enqueues BullMQ job)   │     │
│  └────────────────────────────────────────────────────────────┘     │
└──────┬──────────────────────┬──────────────────────────────────────┘
       │ presigned upload URL  │ POST upload-complete → enqueue job
       ▼                       ▼
┌────────────┐        ┌────────────────────────────────────────────────┐
│  AWS S3    │        │  RAILWAY (Node.js Worker)                      │
│  (audio)   │◄───────│                                                │
│            │ fetch  │  BullMQ Worker                                 │
└────────────┘        │  ┌──────────────────────────────────────────┐ │
                       │  │ 1. Download audio from S3                │ │
                       │  │ 2. Audio quality assessment              │ │
                       │  │ 3. TranscriptionProvider.transcribe()    │ │
                       │  │    └─► Deepgram Nova-3 Multilingual      │ │
                       │  │ 4. Rules engine scoring                  │ │
                       │  │ 5. LLMProvider.analyze()                 │ │
                       │  │    └─► OpenAI GPT-5.4-mini               │ │
                       │  │    └─► OpenAI GPT-5.4 (if re-score)      │ │
                       │  │ 6. Assemble ScoringResult                │ │
                       │  │ 7. Write to Neon (PostgreSQL)            │ │
                       │  │ 8. Send push notification (FCM)          │ │
                       │  └──────────────────────────────────────────┘ │
                       └────────────────────────────────────────────────┘
                                          │
                                          ▼
                               ┌──────────────────┐
                               │  Neon (Postgres)  │
                               │  calls, scores,   │
                               │  pricebooks,      │
                               │  users, companies │
                               └──────────────────┘
```

### 3.2 Request Flow: Recording → Scored Result

```
1.  Tech taps "Start Recording" on mobile
2.  Consent popup shown — tech verbally informs customer
3.  Tech taps "Customer Consented" — consent event logged with timestamp
4.  `react-native-audio-api` starts background recording session (AAC-LC 32kbps mono)
5.  Recording rotates every 5 minutes → local chunks stored in FS queue
6.  Tech taps "Stop" (or job ends)
7.  Mobile calls GET /api/presign → Vercel returns S3 presigned upload URL
8.  Mobile uploads audio file directly to S3 (chunked multipart)
9.  Mobile calls POST /api/upload-complete with { s3Key, callMetadata }
10. Vercel API enqueues BullMQ job → returns 202 Accepted
11. Railway worker picks up job (within seconds)
12. Worker downloads audio from S3
13. Audio quality assessment (SNR check, duration, clipping detection)
14. TranscriptionProvider.transcribe(audioBuffer, { language: 'multi', diarize: true })
    → Deepgram returns transcript with per-word timestamps and language tags
15. Rules engine runs over transcript → deterministic trigger detections
16. LLMProvider.analyze(transcript, systemPrompt, scoringSchema)
    → GPT-5.4-mini returns structured ScoringResult JSON
17. Confidence check → if any dimension < 0.72, re-run low-confidence dimensions with GPT-5.4
18. Assemble final ScoringResult (rules + LLM merged output)
19. Pricebook lookup for each detected opportunity → attach dollar values
20. Write Call, Transcript, Score, Opportunity[] records to Neon
21. FCM push notification to tech: "Your call summary is ready"
22. Total time from upload complete to notification: target < 5 minutes
```

### 3.3 Provider-Agnostic Interfaces

Three external AI/ML services use the same abstraction pattern. This isolates the scoring engine from vendor-specific API formats, auth, and pricing.

```
packages/
  providers/
    transcription/
      TranscriptionProvider.ts      ← interface
      DeepgramProvider.ts           ← Phase 1 implementation
      AssemblyAIProvider.ts         ← Phase 2 implementation
      index.ts                      ← factory: getTranscriptionProvider(config)

    llm/
      LLMProvider.ts                ← interface
      OpenAIProvider.ts             ← Phase 1 implementation
      AnthropicProvider.ts          ← stub (Phase 2)
      BedrockProvider.ts            ← stub (Phase 2)
      VertexProvider.ts             ← stub (Phase 2)
      AzureFoundryProvider.ts       ← stub (Phase 2)
      index.ts                      ← factory: getLLMProvider(config)

    fsm/
      FSMAdapter.ts                 ← interface
      ManualAdapter.ts              ← Phase 1 (no-op / manual tagging)
      ServiceTitanAdapter.ts        ← Phase 2 implementation
      JobberAdapter.ts              ← Phase 2 implementation
      index.ts                      ← factory: getFSMAdapter(config)
```

Switching providers is a config change:
```bash
# .env
TRANSCRIPTION_PROVIDER=deepgram        # → deepgram | assemblyai
LLM_PRIMARY_PROVIDER=openai            # → openai | anthropic | bedrock | vertex | azure
LLM_PRIMARY_MODEL=gpt-5.4-mini
FSM_ADAPTER=manual                     # → manual | servicetitan | jobber | hcp
```

### 3.4 Repository Structure

Monorepo using `pnpm` workspaces:

```
kova/
├── apps/
│   ├── mobile/           ← React Native app
│   └── web/              ← Next.js dashboard
├── packages/
│   ├── db/               ← Drizzle schema, migrations, seed data
│   ├── providers/        ← Transcription / LLM / FSM provider implementations
│   ├── scoring/          ← Rules engine, scoring logic, opportunity engine
│   └── shared/           ← Zod schemas, TypeScript types shared across apps
├── worker/               ← Railway BullMQ worker (separate deployable)
├── docs/
├── pnpm-workspace.yaml
└── turbo.json            ← Turborepo build orchestration
```

`packages/shared` is the type contract between all apps. The `Call`, `Score`, `Opportunity`, `PricebookItem`, and `ScoringResult` types defined here are the same types used in the mobile app, the web dashboard, and the Railway worker.

### 3.5 Core Data Model

Derived from product-plan-v3.md §22 (Core Data Entities), mapped to Drizzle schema:

```typescript
// packages/db/schema.ts

companies          id, name, plan, state, created_at
locations          id, company_id, name                        // Team tier
users              id, company_id, location_id, clerk_user_id, role, name, language_pref
jobs               id, company_id, tech_id, fsm_job_id, customer_name, job_type, scheduled_at, call_id
calls              id, tech_id, job_id, recorded_at, duration_sec, s3_key, transcript_id,
                   score_id, language, audio_quality, status, consent_logged_at, decline_reason
transcripts        id, call_id, segments (JSONB), language, wer_confidence
scores             id, call_id, overall_score, dimensions (JSONB), opportunity_total_low,
                   opportunity_total_high, confidence_level, model_used
opportunities      id, score_id, type, triggered, offered, pricebook_item_id, value_low,
                   value_high, ltv_value, clip_start_sec, clip_end_sec, is_default_price,
                   dispute_reason, disputed_at
pricebook_items    id, company_id, location_id, name, trade, opportunity_type, pricing_model,
                   price_fixed, price_low, price_high, tiers (JSONB), is_recurring,
                   ltv_annual, ltv_years, is_default, active
coaching_points    id, call_id, tech_id, text, clip_start_sec, clip_end_sec, reviewed_at, manager_note
badges             id, user_id, badge_type, earned_at
streaks            id, user_id, current_count, longest_count, last_call_date, threshold
notifications      id, user_id, type, payload (JSONB), sent_at, read_at, channel
audit_logs         id, company_id, user_id, action, target_type, target_id, created_at
```

**Multi-tenancy:** Every query from the API includes `company_id` from the Clerk session. No cross-tenant data access is possible by construction.

**Audit trail:** The `audit_logs` table retains scoring data for 3 years minimum (separate from call retention policy) for legal compliance. `scores`, `transcripts`, and `opportunities` records are never hard-deleted within the retention window.

---

## 4. Phase 1 Feature Scope

What gets built in 12 weeks. Organized by system.

### 4.1 Mobile App

#### Recording Engine
- One-tap record with prominent button accessible from the app home screen
- Lock screen shortcut — record button accessible without unlocking (via iOS Control Center widget and Android Quick Settings tile)
- Background recording via `react-native-audio-api` with `AVAudioSession` (iOS) and Foreground Service (Android)
- Recording format: AAC-LC, 32kbps, mono, 44.1kHz
- Recording rotation: new chunk every 5 minutes — if app crashes, only the last 5-minute chunk is lost
- Pause/resume for interruptions (running equipment, phone calls)
- Visual recording indicator always visible during active session
- Battery management:
  - In-app battery indicator before starting a job
  - Warning at 20% battery: "Low battery — recording quality may be affected"
  - Auto-pause at 15% battery with push notification to tech
- Wired earphone mic detection — prefer external mic if available (better audio quality, reduces phone muffling)

#### Consent Flow
- When tech taps "Start Recording," a full-screen modal appears **before** recording begins:

```
Before You Record

Please inform your customer:
"I'll be recording this appointment for quality
purposes — is that okay with you?"

Once they agree, tap Start.

┌─────────────────────────────────────┐
│   Customer Consented — Start Recording │
└─────────────────────────────────────┘

        Customer Declined
```

- "Customer Consented" tap: logs consent event with tech ID and timestamp → starts recording
- "Customer Declined" tap: does not record, logs decline event, adds job to "unrecorded" list with reason "customer declined"
- Audible tone plays for 1 second when recording begins (ambient secondary notice)
- State-specific consent language configurable by owner in admin settings (two-party consent states default to mandatory disclosure language)

#### Offline Queue
- Audio chunks written to device filesystem immediately on rotation
- Upload queue maintains ordered list of pending chunks + metadata
- Auto-upload triggers on: job completion, wifi connection, app foreground
- Chunked multipart S3 upload with exponential backoff retry
- If upload fails: chunks remain in queue and retry on next connectivity event
- Queue display in app: "2 calls pending upload"
- No call data is ever lost due to connectivity interruption

#### Manual Job Tagging
- After stopping recording: prompt tech to tag the job
  - Customer name (free text)
  - Job type: Drain / Plumbing / Both
  - Optional notes
- Tags stored locally and attached to upload metadata
- ST integration (Phase 2) will auto-populate this from FSM dispatch data

#### Non-Recording Reason Capture
- When a job ends without a recording, the app prompts before the tech can start their next job:
  - "Customer declined recording"
  - "Technical issue (battery / signal)"
  - "Emergency call — no time"
  - "Other"
- Reason is logged and surfaced to manager dashboard as a "compliance gap"
- Prevents managers from penalizing techs for legitimate skips

#### Post-Call Summary (Tech View)
- Push notification within 5 minutes of upload: "Your call summary is ready"
- Summary card shows:
  - Overall score (0–100)
  - Estimated opportunity total
  - Top 2 coaching points with "Play clip" button
- Expandable detail: full scoring breakdown by dimension
- Each opportunity item has:
  - Dollar value (from pricebook)
  - Timestamp of trigger moment
  - Play clip button (±30 seconds)
  - "Not Applicable" button with required reason selection
- "Mark as reviewed" per coaching point
- Call history: list of all personal calls, searchable by date

### 4.2 Transcription Pipeline (Railway Worker — Step 3)

#### Audio Quality Assessment (before transcription)
Run a lightweight analysis on the audio before sending to the transcription API:

| Check | Method | Threshold |
|---|---|---|
| Duration | File metadata | < 2 min → "Short call" flag; < 30 sec → skip scoring |
| Clipping / distortion | Peak amplitude analysis | > 5% clipped samples → "High distortion" flag |
| Background noise | SNR estimation | SNR < 10 dB → "Low quality" flag |
| Silence ratio | VAD (voice activity detection) | > 70% silence → "Sparse audio" flag |

Quality levels mapped to handling:
- **High:** Standard processing
- **Medium:** Standard processing with wider confidence intervals
- **Low:** Process with "Low Confidence" flag on all outputs; manager notified
- **Failed** (< 30% intelligible): Not scored; tech notified "audio was unclear"

#### Transcription
```typescript
const result = await transcriptionProvider.transcribe(audioBuffer, {
  language: 'multi',           // Deepgram: per-word EN/ES language tags
  diarize: true,               // Speaker separation
  punctuate: true,
  smartFormat: true,
  keywords: PLUMBING_KEYWORDS, // Deepgram keyterm prompting for trade vocabulary
})
```

- Target latency: < 2 minutes for a 30-minute call
- Output stored in `transcripts.segments` as JSONB: `[{ text, speaker, start_sec, end_sec, language, confidence }]`

#### Per-Language WER Tracking
- Confidence scores logged per segment and per language
- If average Spanish segment confidence < average English confidence by > 15 percentage points: entire call score flagged "lower confidence — transcription accuracy may be affected" in manager view
- Aggregate WER gap tracked over time as a model health metric

### 4.3 Scoring Engine (Railway Worker — Steps 4–6)

The scoring engine runs in two layers that execute independently and merge their outputs.

#### Rules Layer (Deterministic)

Pure TypeScript functions — no ML, fully testable with unit tests.

Each rule is defined as:
```typescript
interface ScoringRule {
  id: string
  opportunityType: OpportunityType
  trade: 'drain' | 'plumbing' | 'both'
  detect(transcript: Segment[]): RuleResult
  // Returns: { triggered: boolean, triggerTimestamp?: number, offerTimestamp?: number }
}
```

**Phase 1 opportunity types (2 at launch — highest confidence, lowest ambiguity):**

**1. Camera Inspection (Drain)**
- Trigger signals (keyword detection in segments):
  - "keeps happening", "keep coming back", "third time", "again", "every year", "always"
  - "siempre pasa", "otra vez", "de nuevo" (Spanish equivalents)
  - Prior visit detected in customer intro
  - Older home indicators: address-based (future) or customer mention of old pipes
- Offer detection: "camera", "inspection", "scope", "cámara", "inspección"
- Scoring: offer detected after trigger → no miss; trigger detected, no offer in remaining transcript → missed opportunity
- Confidence: High (binary detection — recurrence signal + no camera offer = deterministic)

**2. Maintenance Plan (Both trades)**
- Trigger: always checked at close — last 20% of call duration
- Offer detection: "maintenance", "service agreement", "plan", "membership", "mantenimiento", "contrato de servicio"
- Scoring: mentioned at close → no miss; no mention in close window → missed opportunity
- Confidence: High (binary detection on close window — offer present or absent)

**Phase 2 opportunity types (added Month 3):**
- Hydrojet not presented when snake-only diagnosed

**Phase 3 opportunity types (added Month 6+):**
- Water heater replacement, whole-home walkthrough, filtration/softener, service agreement framing

#### LLM Layer (Contextual)

Runs in parallel with the rules layer. Handles qualitative dimensions that rules cannot detect:

**Prompt structure:**
```
System: [1,000-word system prompt defining:
  - Kova's scoring rubric for drain + plumbing calls
  - Trade-specific context (when to offer camera, what recurrence signals mean, etc.)
  - Contextual suppression rules (emergency mode, customer distress)
  - Output schema definition
  - Language handling instructions]

User: [Transcript as formatted segments with timestamps]
       [Detected rule triggers from the rules layer as context]
       [Pricebook items relevant to this job type]
```

**Output schema (enforced via structured output / JSON mode):**
```typescript
interface LLMScoringOutput {
  dimensions: {
    diagnosisQuality: DimensionScore        // 0–3, reasoning, timestamp
    customerEducation: DimensionScore       // 0–3, reasoning, timestamp
    closeQuality: DimensionScore            // 0–3, reasoning, timestamp
    customerExperienceQuality: DimensionScore // 0–3, reasoning, timestamp
    overRecommendationFlags: OverRecFlag[]  // premature offer, pressure indicator, poor timing
  }
  contextualSuppressions: {
    emergencyContext: boolean               // flooding, burst pipe, no heat
    customerDistress: boolean              // "can't afford", "just the basics"
    shortCall: boolean                     // < 8 minutes
    firstTimeCaller: boolean
  }
  confidence: number                        // 0–1 overall
  dimensionConfidences: Record<string, number>
  reasoning: string                         // brief natural language explanation
}
```

Temperature is set to `0` for all scoring calls — deterministic output is required.

**Contextual suppression signals** (if detected, suppress all upsell opportunity flags for that call):
- `emergencyContext = true` → switch to "emergency mode" — no opportunity flags, score focuses on speed and safety
- `customerDistress = true` → suppress all upsell opportunity flags for the remainder of the call
- `shortCall = true` → score only dimensions that had sufficient time to be addressed; mark others as "N/A — insufficient duration"

**Customer Experience Quality dimension** (new — not present in most competitors):
Detects whether recommendations were contextually appropriate:
- Primary complaint addressed before any upsell discussion → full score
- Upsell directly connected to stated customer pain → full score
- Customer expressed discomfort ("I feel pressured", "just want the basics") → flag
- Recommendations not connected to observable evidence → lower score
- Multiple high-cost upsells on an emergency call → flag as "poor timing"
- Same upsell offered twice after customer declined → flag as "pressure indicator"

#### Score Assembly (Merge Rules + LLM)

```typescript
function assembleScore(
  ruleResults: RuleResult[],
  llmOutput: LLMScoringOutput,
  pricebook: PricebookItem[],
  transcript: Segment[],
): ScoringResult {
  // 1. Apply contextual suppressions from LLM
  // 2. Merge rule-detected opportunities with LLM confidence scores
  // 3. Calculate per-dimension scores (rules are authoritative on their dimensions;
  //    LLM is authoritative on qualitative dimensions)
  // 4. Look up pricebook values for each detected opportunity
  // 5. Calculate overall score (weighted average)
  // 6. Flag low-confidence items by threshold:
  //    >= 0.85 → surfaced in tech view
  //    0.60–0.85 → manager view only, "review recommended"
  //    < 0.60 → manager view only, "uncertain — verify manually"
  // 7. Check fallback trigger: if any dimension < CONFIDENCE_THRESHOLD, queue for re-analysis
}
```

#### Tech Dispute Mechanism

Every opportunity in the tech-facing view includes a "Not Applicable" button with required reason:
- "Customer already has this service"
- "I offered it — customer declined (not captured in audio)"
- "Not relevant to this job type"
- "Customer said they couldn't afford more today"
- "Other (free text)"

When disputed:
- Opportunity hidden from tech coaching view (they acted in good faith)
- Manager still sees the opportunity with dispute reason attached
- Dispute data written to `opportunities.dispute_reason` and `opportunities.disputed_at`
- Aggregate dispute rates tracked per opportunity type — if > 40% across all techs, type is flagged for model review

### 4.4 Estimated Opportunity Engine

Runs inside score assembly. For each detected (non-suppressed) opportunity:

```
1. Look up opportunity type in company's pricebook
2. Pricing model:
   - Fixed price → use exact value (value_low = value_high = price_fixed)
   - Range → value_low = price_low, value_high = price_high (display midpoint)
   - Tiered → use mid-tier as primary; note which tier was missed if context available
3. LTV flag → if is_recurring: calculate LTV = ltv_annual × ltv_years
4. No owner price → fall back to industry default; tag with "(default — update your pricebook)"
5. Attach: trigger timestamp, audio clip range (trigger ± 30 seconds)
```

Call-level output:
- `opportunity_total_low`: sum of all value_low
- `opportunity_total_high`: sum of all value_high
- Display: "Estimated Opportunity: $X – $Y" (or single value if fixed prices)

Footnote on every output:
> *Estimated opportunity reflects your pricebook prices. Actual revenue potential depends on customer need, timing, and context — not every flagged opportunity would have been accepted.*

### 4.5 Pricebook

#### Web UI (Owner-facing)
- Settings → Pricebook
- Table view: all items with name, trade, opportunity type, pricing model, price(s), active/inactive
- "Add Service" form: name, trade (Drain / Plumbing / Both), opportunity type (maps to scoring dimension), pricing model, price inputs
- CSV/Excel import: download template → upload → preview → confirm
- Pricebook completion indicator: "12 of 18 items use your actual prices. 6 still use industry defaults."
- "Pricebook Defaults" warning banner on dashboard when > 30% of items are defaults

#### Industry Defaults
- Pre-loaded at account creation for California drain + plumbing market
- Every default item tagged `is_default = true`
- Displayed with "(industry default — update with your price)" label
- Used immediately for scoring — no blocking on configuration

#### Pricing Models
- **Fixed:** Single price → `price_fixed`
- **Range:** Low + high → `price_low`, `price_high`
- **Tiered:** Up to 3 named tiers → `tiers: [{ name, price }]`

#### Phase 1 Default Pricebook (California Drain + Plumbing)

| Service | Opportunity Type | Pricing Model | Default Range |
|---|---|---|---|
| Camera Inspection | camera_inspection | Fixed | $425 |
| Drain Snaking (standard) | drain_snaking | Range | $150–$250 |
| Hydrojetting | hydrojet | Range | $750–$950 |
| Drain Snaking (main line) | drain_snaking_main | Range | $250–$400 |
| Maintenance / Service Plan (annual) | maintenance_plan | Recurring | $299/yr × 5yr = $1,495 LTV |
| Water Heater Replacement (standard) | water_heater | Range | $1,800–$3,200 |
| Water Heater Replacement (tankless) | water_heater_tankless | Range | $2,500–$5,000 |
| Whole-Home Plumbing Walkthrough | whole_home_walkthrough | Fixed | $89 |
| Water Filtration / Softener (install) | filtration_softener | Range | $800–$2,500 |
| Service Agreement (annual) | service_agreement | Recurring | $249/yr × 5yr = $1,245 LTV |
| Leak Detection | leak_detection | Range | $199–$399 |

### 4.6 Owner/Manager Web Dashboard

#### Home Screen (Owner View)
- **Estimated opportunity this week — large number, front and center**
- Trend vs. last week (arrow + percentage)
- Top 3 missed opportunity types this week (ranked by dollar value)
- Call review queue: calls auto-flagged for review (high opportunity miss, low score, new techs)
- Pricebook completion indicator (shown until ≥ 70% of items are owner-configured)
- Team recording compliance rate for the week

#### Team Performance
- Per-tech table: name, avg score (7-day), avg estimated opportunity per call, calls recorded this week, recording rate, trend arrow
- Click any tech → full call history + coaching activity
- Week-over-week improvement per tech per dimension

#### Call Review Queue
- Auto-flagged calls: estimated opportunity > $1,500, score < 50, tech hasn't been reviewed in 5+ days
- One-click to full call: transcript, score breakdown, audio playback, coaching notes
- Mark as reviewed / add coaching note / flag for 1:1

#### Compliance Dashboard
- Per-tech recording rate (calls recorded / dispatched jobs)
- Compliance gaps: dispatched jobs with no recording and no reason logged
- Decline rate (customer-initiated vs. tech-initiated)

### 4.7 Basic Call Library

- List view: all calls, sorted by date (most recent first)
- Per-row: tech name, date, job type, duration, overall score, estimated opportunity total, language, audio quality indicator
- Click → full call detail:
  - Audio player (waveform)
  - Synchronized transcript: click any transcript line to jump to that position in audio
  - Score breakdown panel
  - Opportunities list with clip markers on the waveform
- Search: by tech name, date range, job type only (full-text search is Phase 2)

### 4.8 Gamification (Phase 1 Light Set)

#### Streaks
- Consecutive calls above a score threshold (default: 70/100, configurable by owner)
- Streak counter displayed on tech home screen
- Streak resets on a call below threshold
- Milestones surfaced as push notifications: 3-call streak, 7-call streak, 14-call streak

#### Personal Bests
- Highest single-call score ever
- Longest streak ever
- Best 7-day average score
- Displayed on tech profile screen

#### Badges (Phase 1 set)
| Badge | Criteria |
|---|---|
| Pioneer | Complete 3 recordings in Week 1 |
| First Call | Complete first scored call |
| Perfect Score | 100/100 on any call |
| Consistent | 7-day average score above 80 |

Full badge set (Camera Pro, Maintenance Closer, Comeback, Streak Master, Top Earner) deferred to Phase 2.

### 4.9 Dispatch-Linked Compliance

In Phase 1 (no FSM), this runs in manual mode:
- Owner enters or imports the week's job schedule
- Kova compares dispatched jobs against recorded calls
- Any dispatched job with no recording and no logged reason → flagged as "compliance gap" in manager dashboard
- Compliance gaps have equal visual weight to coaching scores — "did they record?" is as important as "how did they score?"

### 4.10 Onboarding Flow

Target: account created → first scored call delivered in < 35 minutes.

#### Owner (Web)
1. **Account creation (2 min):** Email + password or Google SSO. Company name, state, primary trade. Billing (or skip for 14-day trial).
2. **Team setup (3 min):** Add techs by name + phone number. Kova sends each tech an SMS with the app download link. Skip available.
3. **Pricebook setup (5–10 min):** Industry defaults pre-loaded. Three options: "Start with defaults," "Import CSV," "I'll configure later." Pricebook completion indicator shown.
4. **Completion:** Dashboard shown (empty state with clear call-to-action: "Ask a tech to record their first call").

#### Technician (Mobile)
1. Tech receives SMS: "Download Kova — [Company Name] uses this for calls. [link]"
2. App install → phone number → SMS verification code (Clerk)
3. Three-screen swipe intro: what Kova is, how it helps you earn more, how to record (skippable)
4. Home screen with prominent "Record" button and "Pioneer" badge prompt

### 4.11 Notifications

#### Tech Notifications
| Event | Channel | Timing |
|---|---|---|
| Post-call summary ready | Push + in-app | Within 5 min of processing |
| Badge earned | Push + in-app | Real-time |
| Streak milestone | Push + in-app | Real-time |
| Weekly personal stats | Push | Monday 8am (tech's timezone) |

#### Owner/Manager Notifications
| Event | Channel | Timing |
|---|---|---|
| Weekly digest email | Email | Monday 7am (owner's timezone) |
| High opportunity alert (> $1,500 on single call) | Push + email | Real-time (configurable threshold) |
| Tech hasn't recorded in 3 days | Push | Real-time |

#### Weekly Digest Email (Monday)
- Total estimated opportunity identified last week
- Week-over-week change (↑ / ↓ + %)
- Top 3 missed opportunity types
- Top performing tech (score)
- Most improved tech (score change)
- 1–2 specific high-value moments with clip links
- Pricebook completion reminder (if still using defaults)
- Login-free summary — all key numbers visible without clicking through

### 4.12 Auth & Billing

#### Auth
- Clerk handles all auth flows (no custom session code)
- Company = Clerk Organization
- Roles: `technician`, `field_manager`, `owner` (Clerk custom roles)
- Middleware in Next.js API routes: `clerkMiddleware()` validates session, extracts `orgId` for all queries
- Middleware in Railway worker: validates Clerk JWT on BullMQ job payload before processing

#### Billing
- Stripe Billing with Kova products/prices pre-configured
- 14-day free trial (no credit card required)
- Subscription tiers: Starter ($89/seat), Pro ($129/seat), Team ($149/seat)
- Annual default (2 months free = pay for 10, get 12)
- Webhook handler: `stripe.webhooks.constructEvent()` for subscription lifecycle events
- Seat management: owner adds/removes tech seats from dashboard → Stripe subscription item updated
- Billing portal: Stripe Customer Portal for invoice download, card update, plan changes

---

## 5. What NOT to Build in Phase 1

These are explicit exclusions. Each one is either a Phase 2 feature, architecturally premature, or a scope trap.

| Category | Why Excluded | When |
|---|---|---|
| ServiceTitan integration | API partner approval takes 2–6 months. Manual job tagging works for pilot. ST integration being built in parallel (start application Week 1). | Phase 2 |
| Pre-call intelligence | Requires FSM dispatch data. No FSM in Phase 1. | Phase 2 |
| Invoice matching / recovery rate | Requires FSM invoice data. | Phase 2 |
| Kova ROI Report | Requires 30+ days of baseline data before it's meaningful. | Phase 2 |
| Full call library (search, clips, sharing) | Complex; basic list view sufficient for pilot. | Phase 2 |
| Clip sharing (expiring secure links) | Nice-to-have; email is sufficient for Phase 1 coaching. | Phase 2 |
| Hydrojet opportunity type | Higher ambiguity than camera/maintenance plan. Needs more transcript data to tune. | Phase 2 (Month 3) |
| Water heater, whole-home walkthrough, filtration | High ambiguity; requires more annotated data. | Phase 3 (Month 6+) |
| Auto-record on arrival (geofence) | Phase 2 per product brief. Addresses adoption; not critical for proving the number. | Phase 2 |
| Spanish mobile UI | Full Spanish app UI deferred. Coaching points delivered in Spanish. | Phase 2+ |
| Leaderboard (team-facing) | Personal bests and streaks first; competitive leaderboard is Phase 2. | Phase 2 |
| Full badge set | Pioneer, First Call, Perfect Score, Consistent for Phase 1. Full set Phase 2. | Phase 2 |
| SOC 2 | Phase 2 process begins at Month 9–12. | Phase 2+ |
| Custom scoring weight configuration | Team tier feature; not needed for pilot. | Phase 3 |
| Multi-location support | Drain Right is single-location. | Phase 3 |
| API access (Team tier) | Not needed until Phase 3+ customers. | Phase 3 |
| Real-time in-call coaching | High latency risk, distraction risk. Year 2 feature. | Year 2 |
| Proprietary ML model | Need annotated training data first — earn it in Phase 1+2. | Year 2+ |
| HVAC scoring model | Nail plumbing/drain first. | Year 2 |
| CRM / booking / scheduling | FSMs own this. Never. | Never |
| Full pricebook / CPQ tool | Kova uses prices; it doesn't manage them. | Never |

---

## 6. Architecture Deep Dives

### 6.1 Audio Pipeline

#### On-Device Recording (React Native)

```
react-native-audio-api
  ├── MediaStream (mic input)
  ├── AudioContext
  ├── MediaRecorder (AAC-LC, 32kbps, mono, 44.1kHz)
  └── Recording rotation every 5 minutes → local chunk files
```

iOS configuration (`Info.plist`):
```xml
<key>NSMicrophoneUsageDescription</key>
<string>Kova records service calls to help you earn more.</string>
<key>UIBackgroundModes</key>
<array><string>audio</string></array>
```

Android configuration (`AndroidManifest.xml`):
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
<service android:name=".RecordingService"
         android:foregroundServiceType="microphone" />
```

#### Offline Queue State Machine

```
IDLE
  ↓ (tech taps Record)
RECORDING
  ↓ (every 5 min) → write chunk to queue
  ↓ (tech taps Stop)
STOPPED
  ↓ (wifi/connectivity available)
UPLOADING
  ↓ (all chunks uploaded)
  ↓ (POST /api/upload-complete)
PENDING_ANALYSIS
  ↓ (worker completes, push received)
COMPLETE

On upload failure at any chunk:
UPLOADING → UPLOAD_RETRY (exponential backoff, max 5 attempts)
           → UPLOAD_FAILED (notify tech, retry manually)
```

Queue persistence: stored in SQLite via `react-native-mmkv` — survives app restarts.

#### Server-Side Audio Handling (Railway Worker)

```typescript
async function processAudioFile(s3Key: string): Promise<ProcessedAudio> {
  const audioBuffer = await downloadFromS3(s3Key)
  const quality = await assessAudioQuality(audioBuffer)

  if (quality.level === 'failed') {
    await markCallUnprocessable(callId, quality.reason)
    await notifyTechPoorAudio(techId, quality.guidanceTip)
    return
  }

  // AAC-LC audio is sent directly to Deepgram
  // Deepgram Nova-3 handles AAC-LC natively — no transcode needed
  return { buffer: audioBuffer, quality }
}
```

Note: Deepgram Nova-3 accepts AAC-LC directly — no server-side Opus transcode is required. The server-side transcode option exists if a different transcription provider requires it (AssemblyAI also accepts AAC-LC). The transcode step is implemented in the `TranscriptionProvider` interface's pre-processing hook, not in the main pipeline.

### 6.2 Transcription Pipeline

```typescript
// packages/providers/transcription/DeepgramProvider.ts

export class DeepgramProvider implements TranscriptionProvider {
  async transcribe(
    audioBuffer: Buffer,
    options: TranscriptionOptions,
  ): Promise<TranscriptionResult> {
    const response = await this.client.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: 'nova-3',
        language: 'multi',          // EN↔ES code-switching with per-word language tags
        diarize: true,
        punctuate: true,
        smart_format: true,
        keyterms: PLUMBING_KEYTERMS, // Trade-specific vocabulary boost
        filler_words: false,
      },
    )

    return this.normalize(response) // → TranscriptionResult (standard interface format)
  }
}
```

**Standard `TranscriptionResult` (shared type):**
```typescript
interface TranscriptionResult {
  segments: Array<{
    text: string
    speaker: number
    start_sec: number
    end_sec: number
    language: 'en' | 'es' | 'unknown'
    confidence: number
  }>
  languages_detected: string[]
  overall_confidence: number
  duration_sec: number
  provider: string
  model: string
}
```

**PLUMBING_KEYTERMS** (boosts recognition accuracy for trade vocabulary):
```typescript
const PLUMBING_KEYTERMS = [
  'hydrojetting', 'hydrojet', 'snaking', 'camera inspection', 'sewer scope',
  'mainline', 'cleanout', 'p-trap', 'auger', 'rooter', 'backflow',
  'tankless water heater', 'anode rod', 'pressure relief valve',
  'water softener', 'filtration system', 'service agreement', 'maintenance plan',
  // Spanish equivalents
  'inspección de cámara', 'limpieza de alcantarilla', 'calentador de agua',
  'plan de mantenimiento', 'acuerdo de servicio',
]
```

### 6.3 Scoring Engine Deep Dive

#### Prompt Engineering

The system prompt is the most critical piece of engineering in the product. It encodes Kova's domain expertise about what makes a profitable, ethical drain/plumbing service call.

Structure:
```
[ROLE]
You are Kova's call scoring engine. You analyze transcripts of plumbing and drain
service calls to assess technician performance and identify estimated missed service
opportunities.

[TRADE CONTEXT — ~300 words]
Detailed explanation of drain and plumbing service call economics, what signals
mean what, when specific offers are appropriate, what constitutes a professional
diagnosis, etc.

[SCORING RUBRIC — ~400 words]
Per-dimension definitions with 0/1/2/3 scoring criteria and examples.

[CONTEXTUAL SUPPRESSION RULES — ~150 words]
When NOT to flag opportunities. Emergency context. Customer financial distress.
Short calls. What "can't afford more today" means for the rest of the call.

[OUTPUT SCHEMA — ~150 words]
Exact JSON structure with field descriptions. Reinforcement that temperature = 0
and output must be parseable JSON matching the schema.
```

The system prompt is stored in `packages/scoring/prompts/v1/` as a versioned file — not hardcoded in the provider. Prompt versions can be A/B tested on the same calls by re-running analysis with a different prompt version.

#### Score Weighting

Drain scoring weights (Phase 1):
```typescript
const DRAIN_SCORE_WEIGHTS = {
  diagnosisQuality: 0.20,
  cameraInspection: 0.25,        // High weight — core drain opportunity
  maintenancePlan: 0.20,
  customerEducation: 0.15,
  closeQuality: 0.10,
  customerExperienceQuality: 0.10,
}
```

Plumbing scoring weights (Phase 1):
```typescript
const PLUMBING_SCORE_WEIGHTS = {
  diagnosisQuality: 0.20,
  wholeHomeWalkthrough: 0.20,
  maintenancePlan: 0.20,
  customerEducation: 0.15,
  closeQuality: 0.15,
  customerExperienceQuality: 0.10,
}
```

Weights are configurable per company in Phase 3 (custom scoring weight configuration).

### 6.4 API Design

**REST API** (not GraphQL — simpler to implement, easier to debug, sufficient for Phase 1 data patterns).

Base URL:
- Vercel API: `/api/` (dashboard data, presigned URLs, webhook receipt, auth callbacks)
- Railway worker: internal only (not exposed externally; receives jobs via BullMQ queue)

**Endpoint groups:**

```
Auth (Clerk webhooks)
  POST /api/webhooks/clerk         Sync user/org events to Neon

Audio Upload
  GET  /api/calls/presign          Generate S3 presigned upload URL
  POST /api/calls/upload-complete  Enqueue processing job, create Call record

Calls
  GET  /api/calls                  List calls (company-scoped, paginated)
  GET  /api/calls/:id              Single call detail with transcript + score
  GET  /api/calls/:id/audio        Presigned S3 audio URL (time-limited)

Scoring & Opportunities
  POST /api/opportunities/:id/dispute   Submit "Not Applicable" dispute
  GET  /api/opportunities/dispute-rates Internal health metric

Pricebook
  GET  /api/pricebook              List pricebook items for company
  POST /api/pricebook              Create pricebook item
  PUT  /api/pricebook/:id          Update pricebook item
  DELETE /api/pricebook/:id        Deactivate pricebook item
  POST /api/pricebook/import       CSV import (multipart upload)

Dashboard
  GET  /api/dashboard/summary      Weekly numbers, top missed types, trends
  GET  /api/dashboard/team         Per-tech performance table
  GET  /api/dashboard/compliance   Recording compliance rates + gaps

Coaching
  POST /api/coaching/:callId/notes  Add manager coaching note
  PUT  /api/coaching/:pointId/review  Mark coaching point reviewed

Notifications
  POST /api/notifications/register  Register FCM device token
  GET  /api/notifications           List unread notifications for user

Billing (Stripe)
  POST /api/billing/checkout        Create Stripe checkout session
  POST /api/billing/portal          Create Stripe billing portal session
  POST /api/webhooks/stripe         Handle Stripe webhook events

Users & Teams
  GET  /api/team                   List team members
  POST /api/team/invite            Send tech invite SMS
  PUT  /api/team/:userId/role      Update role
  DELETE /api/team/:userId         Remove from company
```

All endpoints are protected by Clerk JWT middleware except `/api/webhooks/*`.

---

## 7. Weekly Sprint Plan

12-week plan for a solo founder. Each week has a primary focus and specific deliverables. The test for "done" each week: the deliverable works end-to-end, not just as a stub.

### Week 1 — Infrastructure & Scaffolding

**Goal:** Everything compiles, connects, and deploys. Zero features, but the full stack is wired up.

**Deliverables:**
- Monorepo initialized (`pnpm` workspaces + Turborepo)
- `apps/web` — Next.js 15 app with Tailwind + shadcn/ui initialized, Clerk middleware configured, deployed to Vercel
- `apps/mobile` — React Native bare project with `@clerk/clerk-expo`, basic tab navigator
- `packages/db` — Drizzle schema skeleton, Neon connection configured, first migration runs
- `worker/` — BullMQ worker service initialized, Railway project created, Redis add-on provisioned, worker deploys and processes a test job
- AWS S3 bucket created, IAM user for app access, presigned URL generation confirmed working
- Clerk application configured: phone OTP enabled, Organizations enabled, custom roles (`technician`, `field_manager`, `owner`) defined
- Stripe account created, products/prices configured, test checkout session works
- `.env` schema documented and validated — every environment variable named and described
- GitHub repo + CI: `pnpm lint && pnpm typecheck && pnpm test` runs on every PR

**Action items (not code):**
- Submit ServiceTitan API partner application (takes 2–6 months — start now even though integration is Phase 2)
- Schedule CA privacy attorney consultation (goal: Week 3)

---

### Week 2 — Database Schema & Auth

**Goal:** Users can create accounts and sign in on both web and mobile. The full data schema exists.

**Deliverables:**
- Full Drizzle schema written and migrated to Neon (all tables from §3.5)
- Owner web sign-up flow: email/password + Google SSO via Clerk, company/org created, user record written to Neon via Clerk webhook
- Tech mobile sign-in: phone number → SMS OTP via Clerk, session established
- Role-based access: Clerk Organization roles map to Kova roles; middleware enforces role checks on API routes
- Seed script: creates a test company, 3 techs, 1 manager, basic pricebook items — used for all development going forward
- Neon database branching set up: `main` (production), `dev` (development), `test` (CI)
- Drizzle migrations run in CI before tests

---

### Week 3 — Recording Engine (Mobile)

**Goal:** A technician can record a call on both iOS and Android, the file lands in S3, and a processing job is enqueued. No analysis yet — just the recording pipeline.

**Deliverables:**
- `react-native-audio-api` integrated and recording working on iOS simulator + real Android device
- Background recording confirmed: app backgrounded mid-recording, audio continues
- Consent popup implemented: full-screen modal before recording, "Customer Consented" / "Customer Declined" flows, consent event logged with timestamp
- Audible tone on recording start
- Recording rotation: new chunk every 5 minutes, chunks stored in local filesystem queue
- Battery management: in-app indicator, warning at 20%, auto-pause at 15%
- Offline queue: upload on wifi, retry on failure, queue visible in app
- S3 presigned URL flow: mobile calls Vercel `/api/calls/presign` → uploads directly to S3 → calls `/api/calls/upload-complete` → BullMQ job enqueued
- Call record created in Neon with status `uploaded`
- Manual job tagging screen: customer name, job type, notes
- Non-recording reason capture: prompt when job ends without recording

**CA privacy attorney consultation target: this week**

---

### Week 4 — Transcription Pipeline

**Goal:** Uploaded audio is transcribed within 5 minutes. Quality assessment works. Transcript stored in Neon.

**Deliverables:**
- `TranscriptionProvider` interface implemented
- `DeepgramProvider` implemented: Nova-3 Multilingual, diarization, keyterm prompting, normalized output
- Audio quality assessment: SNR check, duration check, silence ratio, clipping detection
- Per-language confidence tracking: average confidence per language segment logged
- WER gap flag: if Spanish confidence < English confidence by > 15pp, call flagged as "lower confidence"
- Transcript stored in `transcripts` table as normalized JSONB
- Call status updated: `uploaded` → `transcribed`
- Unit tests: 10 synthetic transcripts (5 English, 3 Spanish, 2 bilingual) run through the pipeline, output validated against expected structure
- BullMQ job dashboard (Bull Board) accessible at internal URL for monitoring

---

### Week 5 — Rules Engine

**Goal:** The rules layer runs on transcripts and correctly detects the two Phase 1 opportunity types. Fully unit-tested.

**Deliverables:**
- `ScoringRule` interface implemented
- `CameraInspectionRule` implemented:
  - EN + ES recurrence signal keyword detection
  - Offer detection after trigger
  - Correct handling of: trigger present + offer present (no miss), trigger present + no offer (miss), no trigger (not applicable)
- `MaintenancePlanRule` implemented:
  - Close-window detection (last 20% of call duration)
  - EN + ES offer keyword detection
  - Correct handling of: offer at close (no miss), no offer at close (miss)
- Contextual suppression integration: emergency context + customer distress suppress all opportunity flags
- Short call handling: < 8 minutes → "limited scoring" flag, suppress time-sensitive dimensions
- Unit test suite: 20 synthetic call scenarios covering all edge cases for each rule
- Rules output stored in intermediary `RuleResult[]` before LLM layer runs

---

### Week 6 — LLM Layer & Score Assembly

**Goal:** Full scoring pipeline runs end-to-end. A recorded call produces a complete `ScoringResult`.

**Deliverables:**
- `LLMProvider` interface implemented
- `OpenAIProvider` implemented: GPT-5.4-mini primary, GPT-5.4 fallback, structured output enforced via JSON schema, temperature = 0
- System prompt v1 written for drain + plumbing (both trades required for Drain Right)
- Prompt tested on 10 synthetic transcripts; output validates against `LLMScoringOutput` Zod schema
- Confidence-based routing: if any dimension < 0.72, re-run low-confidence dimensions with GPT-5.4
- Score assembly function: rules + LLM merged, weights applied, overall score calculated
- Pricebook lookup: opportunity types matched to pricebook items, dollar values attached
- Full `ScoringResult` written to `scores` + `opportunities` tables in Neon
- Call status updated: `transcribed` → `scored`
- End-to-end test: real recording uploaded → transcript → rules → LLM → score → stored in < 5 minutes
- Cost logging: tokens used + cost per call written to a `processing_costs` table (health monitoring)

---

### Week 7 — Post-Call Summary & Tech View

**Goal:** A tech records a call, and within 5 minutes receives a push notification with their scored summary. The tech view in the mobile app shows the full output.

**Deliverables:**
- FCM integration: `react-native-firebase` in mobile, `firebase-admin` in Railway worker
- Push notification sent after scoring completes: "Your call summary is ready"
- Post-call summary screen (mobile):
  - Overall score display
  - Estimated opportunity total with footnote
  - Per-opportunity list: type, dollar value, timestamp, "Play clip" button, "Not Applicable" button
  - Clip playback: load audio from S3 presigned URL, seek to clip start, play 60-second window
  - "Mark as reviewed" per coaching point
- Dispute mechanism: "Not Applicable" button → reason selection → written to `opportunities.dispute_reason`
- Confidence display: opportunities with confidence < 0.85 not shown in tech view (manager-only)
- Personal call history: list view of all tech's calls, sorted by date, with score + opportunity total

---

### Week 8 — Owner Dashboard & Call Library

**Goal:** The owner logs into the web dashboard and sees the week's numbers, their team's performance, and can review any call.

**Deliverables:**
- Dashboard home screen (Next.js SSR):
  - Weekly estimated opportunity total (large, front and center)
  - Week-over-week trend
  - Top 3 missed opportunity types
  - Team recording compliance rate
  - Pricebook completion indicator
- Team performance table: per-tech row with avg score, avg opportunity/call, recording rate, trend
- Call review queue: auto-flagged calls surfaced for manager action
- Basic call library: list view with filters by tech + date range
- Call detail page:
  - Audio player (wavesurfer.js or similar)
  - Synchronized transcript: click line → seek audio
  - Score breakdown sidebar
  - Opportunity markers on waveform
- Manager coaching notes: text input on any call, stored in `coaching_points`
- Weekly digest email: React Email template, sent via Resend every Monday 7am (Vercel cron)

---

### Week 9 — Pricebook & Admin Controls

**Goal:** Owner can fully configure their pricebook. Industry defaults are loaded. The dashboard shows accurate dollar figures from their actual prices.

**Deliverables:**
- Pricebook management UI (web): list view, add/edit/delete items, active/inactive toggle
- All three pricing models: fixed, range, tiered — all working in form UI and scoring engine
- LTV configuration: recurring flag, annual price, average years → LTV calculation in opportunity output
- Industry defaults pre-loaded for California drain + plumbing market (see §4.5 table)
- CSV import: template download, file upload, preview table, confirm import, error display for invalid rows
- Pricebook completion indicator in both dashboard and pricebook settings
- Default price tagging: all default items labeled "(industry default — update with your price)" in opportunity outputs
- Admin settings skeleton: company profile, state selection (consent language), notification thresholds, recording target per tech

---

### Week 10 — Gamification, Notifications & Billing

**Goal:** The full user loop is working — techs earn badges and streaks, owners receive alerts. Billing is live.

**Deliverables:**
- Streak tracking: streak calculated after each call, written to `streaks` table, milestone pushes sent
- Personal bests: calculated and updated after each call (highest score, longest streak, best 7-day avg)
- Badges: Pioneer, First Call, Perfect Score, Consistent — all working with automated award logic
- Badge display on tech profile screen (mobile)
- Real-time threshold alerts (web + push): single call exceeds configured opportunity threshold → immediate notification
- Tech hasn't recorded in 3 days → manager push notification
- Stripe billing fully integrated:
  - Checkout session: trial start, credit card capture
  - Subscription webhook handler: `customer.subscription.created/updated/deleted`, `invoice.payment_failed`
  - Seat management: add/remove techs → Stripe subscription item quantity updated
  - Billing portal: owner can update card, download invoices, cancel
- Dunning: Stripe Smart Retries enabled; 7-day grace period on failed payment before service interruption

---

### Week 11 — Onboarding Flow & End-to-End Polish

**Goal:** A brand-new owner can sign up and have their first scored call delivered in < 35 minutes. Drain Right can onboard without hand-holding.

**Deliverables:**
- Full owner onboarding flow: account → team setup → pricebook → first recording CTA
- Tech onboarding: SMS invite → app download → phone OTP → intro screens → home screen
- "Pioneer" badge onboarding incentive: 3 calls in Week 1 → badge awarded
- Empty states: all dashboard views have clear empty state with next-step CTA (not blank screens)
- Error handling: every API route has consistent error responses; mobile app handles network errors gracefully
- Loading states: all async operations have loading indicators
- End-to-end test run: solo founder performs full flow from account creation → team setup → pricebook → recording → scoring → dashboard review. Target: < 35 minutes total.
- Cross-language score parity bias test (see §9)
- Drain Right pricebook configured with their actual prices

---

### Week 12 — Drain Right Pilot Prep & Launch

**Goal:** Drain Right is live. First calls are scored. Owner sees the number.

**Deliverables:**
- Drain Right account created, all 16+ techs invited, roles assigned
- Pricebook finalized with Drain Right's actual prices (camera inspection, hydrojetting, maintenance plan, water heater, etc.)
- Tech kickoff: provide owner with the suggested team meeting script (framing: earning potential + documentation protection, not surveillance)
- Manager walkthrough: 1-hour session with Drain Right owner/manager walking through the dashboard, call review queue, pricebook
- Monitoring dashboard (internal): recording rate, processing pipeline health, job queue depth, error rates — all visible before first day
- Recording compliance check: confirm all 16+ techs have downloaded the app and completed the onboarding flow
- First call scored and reviewed together with Drain Right owner
- Week 1 check-in scheduled: 7-day follow-up to review early numbers
- Bugs fixed as they surface during first week of real usage

---

## 8. Infrastructure & DevOps

### 8.1 AWS Setup

Resources required for Phase 1:

```
S3:
  kova-audio-prod              Production audio storage
  kova-audio-dev               Development audio storage

IAM:
  kova-app-user                Programmatic access (S3 read/write, presign)
  Policies: S3:PutObject, S3:GetObject, S3:DeleteObject on kova-audio-*

S3 Bucket Policy:
  No public access
  ACL disabled
  Server-side encryption: SSE-S3 (AES-256)
  Versioning: disabled (not needed — files are immutable after upload)
  Lifecycle rules:
    - Transition to Glacier Instant Retrieval at 90 days
    - Expire at 365 days (default retention; configurable)
```

No other AWS services are needed in Phase 1. Lambda, RDS, VPC — all deferred.

### 8.2 Environment Configuration

Three environments:

| Environment | Branch | Database | Services |
|---|---|---|---|
| `production` | `main` | Neon `main` branch | Live Clerk, live Stripe, live Deepgram, live OpenAI |
| `staging` | `staging` | Neon `staging` branch | Clerk test, Stripe test, live Deepgram, live OpenAI |
| `development` | feature branches | Neon `dev` branch | Clerk dev, Stripe test, live APIs with dev keys |

**All secrets in environment variables** — never committed. `.env.example` documents every required variable with descriptions and no values.

Required environment variables:
```bash
# Database
DATABASE_URL=                    # Neon connection string (HTTP for Vercel, pooled for Railway)

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# AWS
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET_AUDIO=

# Transcription
TRANSCRIPTION_PROVIDER=deepgram
DEEPGRAM_API_KEY=

# LLM
LLM_PRIMARY_PROVIDER=openai
LLM_PRIMARY_MODEL=gpt-5.4-mini
LLM_FALLBACK_PROVIDER=openai
LLM_FALLBACK_MODEL=gpt-5.4
LLM_CONFIDENCE_THRESHOLD=0.72
OPENAI_API_KEY=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Push Notifications
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Email
RESEND_API_KEY=
EMAIL_FROM=notifications@kovahq.com

# Queue (Railway)
REDIS_URL=                       # Railway Redis add-on URL

# App
NEXT_PUBLIC_APP_URL=
```

### 8.3 CI/CD

**GitHub Actions** — two workflows:

**`ci.yml` (on every PR):**
```yaml
- pnpm install
- pnpm typecheck       # tsc --noEmit across all packages
- pnpm lint            # ESLint across all packages
- pnpm test            # Vitest unit tests
- pnpm db:migrate:test # Drizzle migrations run against Neon test branch
```

**`deploy.yml` (on merge to main):**
```yaml
- Vercel CLI: vercel --prod (web dashboard)
- Railway CLI: railway up (worker service)
- Mobile: EAS Build (Expo Application Services) — triggered manually for TestFlight/Play Store releases
```

**Mobile CI:**
- TestFlight (iOS) and Play Store internal track (Android) updated weekly via EAS Build
- OTA updates (JS bundle only, no native changes) via EAS Update

### 8.4 Monitoring

Phase 1 monitoring is minimal but sufficient:

| What | Tool | Where |
|---|---|---|
| BullMQ job status | Bull Board UI | Railway internal URL |
| Processing pipeline errors | `pino` logs | Railway log viewer |
| API errors (web) | Vercel Function logs | Vercel dashboard |
| Database performance | Neon dashboard | Neon console |
| Stripe events | Stripe dashboard | Stripe console |
| Recording rate, scoring health | Internal `/api/admin/health` endpoint | Custom (Week 12) |

Phase 2: Sentry for error tracking, Datadog or Axiom for log aggregation.

### 8.5 Estimated Monthly Cost — Drain Right Pilot (640 calls/month)

| Service | Monthly Cost | Notes |
|---|---|---|
| Deepgram Nova-3 (30-min avg, diarization) | ~$95 | Dominant cost |
| OpenAI GPT-5.4-mini + GPT-5.4 | ~$8–10 | Blended with 10-15% fallback rate |
| Railway (worker + Redis) | ~$5 | Hobby plan |
| AWS S3 (10 GB storage + operations) | ~$0.50 | |
| Vercel (Next.js) | $0–20 | Hobby or Pro |
| Neon (PostgreSQL) | $0 | Free tier (plenty for pilot) |
| Clerk (auth) | $0 | Free tier (50K MAU limit) |
| Firebase (FCM) | $0 | Free |
| Resend (email) | $0 | Free tier (3K emails/month) |
| **Total** | **~$110–130/mo** | |

The Drain Right subscription on Starter tier (16 techs + 1 owner = 17 seats × $89) = **$1,513/month**. Infrastructure costs are ~7% of revenue from the first paying customer.

---

## 9. Pre-Launch Checklist

All items must be complete before Drain Right goes live. Items marked **[BLOCKER]** must be complete before any recording is made.

### Legal & Compliance

- [ ] **[BLOCKER]** Consult with California privacy attorney — validate consent popup flow against Cal. Penal Code §632 and CCPA before any recordings are made (~$300–500 for 1-hour consultation). Confirm: (a) tech verbal disclosure + popup is sufficient for two-party consent, (b) CCPA notice requirement is satisfied, (c) timestamp log in Neon satisfies the compliance record requirement.
- [ ] **[BLOCKER]** Determine if Kova's AI creates any voice profile or speaker identification model (Deepgram diarization creates speaker labels, not voiceprints — confirm this distinction with CA attorney). If voiceprints are created, Illinois BIPA compliance is required for IL customers before launch.
- [ ] Audit Drain Right's existing recording/consent policy — they may already inform customers of recording. Coordinate so Kova's in-app disclosure doesn't conflict with existing practice.
- [ ] Remove all "hiring/firing decisions" language from codebase, dashboards, and email templates. Replace with "performance insights to inform coaching conversations and development planning." (Required per product-strategy-v1.md §3.10 — NYC LL 144 compliance.)
- [ ] Submit ServiceTitan API partner application (not a launch blocker — takes 2–6 months, needed for Phase 2).

### Technical Validation

- [ ] **[BLOCKER]** Cross-language score parity bias test:
  - Record 20 English synthetic calls, 20 Spanish synthetic calls, 10 bilingual calls through full pipeline
  - Compare: average score per language, trigger detection rate per language, false positive rate per language
  - Pass criteria: Spanish calls do not score more than 10 points lower than equivalent English calls on identical performance
  - If test fails: do not deploy until the gap is corrected (adjust prompts, improve transcription model, or apply score normalization)
- [ ] **[BLOCKER]** End-to-end latency validation: 10 test recordings processed from upload to push notification delivery. All 10 must complete in < 5 minutes.
- [ ] **[BLOCKER]** Offline queue validation: record a call with airplane mode → enable wifi → confirm upload and processing complete without data loss.
- [ ] Background recording validation: start recording → lock phone → wait 20 minutes → unlock → confirm recording continued uninterrupted on both iOS and Android devices.
- [ ] Battery impact test: record a 60-minute call with battery monitoring; confirm < 30% battery consumed per hour on mid-range Android device.
- [ ] Test on Drain Right's specific device models — confirm background recording works on their actual hardware.

### Drain Right-Specific

- [ ] Drain Right phone audit: confirm Android vs. iOS split among their 16+ techs. If > 30% Android, confirm Android app is stable on their specific devices before launch.
- [ ] Drain Right FSM status: confirm whether Drain Right has ST Field Pro active. If they do, the competitive positioning and integration narrative may need adjustment.
- [ ] Drain Right pricebook configured: all prices entered at their actual rates. Confirm with owner that the prices in Kova match their current service pricing. No defaults should be in use for their core services on Day 1.
- [ ] Drain Right pilot success criteria co-defined with owner:
  - What dollar range of estimated opportunity in 30 days would confirm the product is working? (Product brief target: $20K–$50K)
  - What would the owner need to see to consider Phase 1 a success vs. a failure?
  - Agreed check-in cadence: Day 7, Day 14, Day 30
- [ ] Owner kickoff script prepared: team meeting script for introducing Kova to techs (framing: earning potential + documentation protection, not surveillance).
- [ ] Tech onboarding confirmed: all 16+ techs have downloaded the app, signed in, and completed the intro screens before the official start date.

### Deepgram A/B Validation

- [ ] Record 20–30 real Drain Right calls through both Deepgram and AssemblyAI (using the provider-agnostic interface) before committing fully to Deepgram.
- [ ] Measure WER manually on 5 bilingual calls and 5 noisy calls.
- [ ] If AssemblyAI accuracy is comparable on real field audio, evaluate switching (2–3x cheaper at scale).

---

## 10. Risks & Solo Founder Constraints

### Critical Path

The single longest dependency chain:

```
Week 3 (recording engine)
  → Week 4 (transcription)
  → Week 5 (rules engine)
  → Week 6 (LLM + score assembly)
  → Week 7 (tech view + push notification)
  → Week 8 (owner dashboard)
  → Week 11 (end-to-end pilot prep)
  → Week 12 (Drain Right live)
```

If Week 3 slips (background audio reliability issues), everything else slips by the same amount. Background audio recording on both iOS and Android is the single highest-risk technical task in the project.

### Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Background audio unreliable on Android devices | High | Critical | Prioritize Android testing in Week 3. Have a contingency: start Drain Right iOS-only for the first 2 weeks if Android isn't stable, then add Android. The mixed phone split means starting iOS-only loses ~50% of techs, but it's better than delaying the pilot. |
| LLM prompt quality insufficient for accurate scoring | Medium | High | Build the synthetic test suite in Week 6 before Drain Right goes live. If < 70% of test cases score correctly, prompt tuning takes priority over everything else. Don't launch with an inaccurate scoring engine — it's worse than no scoring engine. |
| Deepgram accuracy poor on real Drain Right field audio | Medium | High | Run the A/B validation in Week 11 with real calls. Provider-agnostic interface means switching to AssemblyAI is a config change. Budget $50 for a test run on both providers before committing. |
| Opportunity dispute rate > 40% on any type | Medium | High | Start with only 2 opportunity types (camera inspection + maintenance plan) — the highest-confidence, lowest-ambiguity detections. If dispute rate exceeds 40% on either, pull it and investigate before adding Phase 2 types. Monitor dispute rate weekly from Day 1. |
| Tech adoption at Drain Right < 50% recording rate | High | Critical | Owner must mandate recording as job policy before launch. Provide the team meeting script. If Day-7 recording rate < 50%, escalate immediately — this is a product-ending condition, not a product improvement. |

### Scope Management — If You Fall Behind

**Cut in this order (least to most damage):**

1. **Cut first:** Gamification (streaks, badges, personal bests) — soft launch without these if Week 10 slips. They don't affect the core hypothesis.
2. **Cut second:** Weekly digest email — replace with a manual export for the pilot. Not blocking.
3. **Cut third:** Billing integration — run the pilot for free (14-day trial extension) if Stripe integration isn't finished. Don't delay the pilot for billing.
4. **Never cut:** Recording engine, transcription, scoring engine, pricebook, post-call summary, owner dashboard. These are the product. Everything else is around them.

### Non-Negotiable Quality Bars

These cannot be released with known issues:

- **Consent logging:** Every recording must have a timestamped consent event in Neon. No exception. This is both a legal requirement and the product's core ethical differentiation.
- **No data loss:** The offline queue must never lose an audio file. Test failure modes explicitly (mid-upload network loss, app crash during recording, device restart with pending uploads).
- **Cross-language parity:** Do not launch if the bias test fails. A product that systematically scores Spanish-speaking techs lower due to transcription quality is both ethically wrong and legally exposed.
- **Opportunity accuracy:** The dispute rate gate (40% = pull the type) is a hard rule. A product whose "coaching insights" feel wrong to the people receiving them will be ignored and will churn.

---

## 11. Open Decisions

Items that need a decision before or during Phase 1. Each has an owner and a deadline.

### Before Phase 1 Kickoff

| Decision | Options | Deadline | Owner |
|---|---|---|---|
| React Native approach | Bare RN CLI vs. Expo bare workflow with dev client. Expo simplifies EAS Build and OTA updates but adds complexity to the native audio module setup. | Week 1 | Engineering |
| Score dispute authority | When a tech disputes a flag and the manager disagrees, who has final authority? Option A: manager authority (manager can override a dispute). Option B: tech authority (dispute is accepted, manager can add a coaching note but the flag stays hidden from tech view). | Week 5 (before dispute UI is built) | Product |
| "Over-recommendation" flag consequences | Is an over-recommendation flag (premature offer, pressure indicator, poor timing) surfaced to the owner, the manager only, or both? Does it affect the tech's overall score, or route to manager review only? | Week 6 | Product |

### Before Phase 2 Kickoff

| Decision | Options | Deadline | Owner |
|---|---|---|---|
| Annual billing default launch timing | Phase 1 (at launch) vs. Phase 2. Annual billing reduces churn but requires more Stripe configuration. Monthly is simpler to launch with. | Phase 2 kickoff | Founder |
| ServiceTitan API partnership positioning | Do not position Kova as a Field Pro competitor in the ST partner application. Positioning: "complementary to Field Pro — serves ST customers who haven't activated it yet." Confirm this framing before application is submitted. | Week 1 | Founder |
| Deepgram vs. AssemblyAI final decision | After real-call A/B test in Week 11. | Week 11 | Engineering |

### External Dependencies to Track

| Item | Status | Follow-up |
|---|---|---|
| ServiceTitan API partner application | Apply Week 1 | 2–6 month process; follow up monthly |
| CA privacy attorney consultation | Schedule Week 1, complete Week 3 | Required before first recording |
| Drain Right device audit | Complete Week 1 | Determines Android urgency |
| Drain Right pricebook data | Collect Week 11 | Required before launch |
| NYC LL 144 applicability | Assess when first NYC customer signs up | Not a Phase 1 blocker |
| Illinois BIPA (voiceprint determination) | Confirm with CA attorney whether Deepgram diarization creates voiceprints | Before Phase 1 launch |

---

*Document version: v1*
*Status: Living document — update prior to each phase kickoff*
*Date: May 2026*
*Phase 2 kickoff: update this document at Month 3 to incorporate ST integration, pre-call intelligence, invoice matching, ROI report, and FSM adapter implementations*
*See `docs/product/product-brief-v1.md` for full product requirements*
*See `docs/product/product-strategy-v1.md` for risk register, legal compliance details, and competitive defense strategy*
