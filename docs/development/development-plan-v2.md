# Kova — Development Plan v2

*Solo founder. Greenfield. Drain Right pilot target: prove the estimated opportunity number is real — with the owner's own prices — within 30 days of going live.*

*Document version: v2*
*Status: Living document — update prior to each phase kickoff*
*Date: May 2026*
*Supersedes: development-plan-v1.md*
*See `docs/product/product-brief-v1.md` for full product requirements*
*See `docs/product/product-strategy-v1.md` for risk register, legal compliance details, and competitive defense strategy*

---

## 0. What Changed from v1 — Decision Log

This section documents every material change from v1, why it changed, and what it means for execution. If v1 and v2 say different things, v2 wins.

### 0.1 Settled Decisions (Closed in v2)

| Decision | v1 stance | v2 resolution | Reason |
|---|---|---|---|
| Mobile framework | React Native committed | **React Native — confirmed** | react-native-audio-api v0.11 (lock screen controls, recording to file) and v0.12 (recording rotation/chunking) are real and ship. Full-stack TypeScript is a genuine solo-founder advantage. No change needed. |
| Annual billing default | Listed as open decision (Phase 1 vs. Phase 2) | **Annual billing at launch** | product-brief-v1 §12 is unambiguous: annual is the default offer, monthly is opt-in. Annual customers churn at 1/3 the rate. Stripe configuration is not complex. Resolved. |
| STT provider | Deepgram hard-committed | **Deepgram as Phase 1 default; formal bakeoff on real Drain Right calls at Week 8–9 before committing production traffic** | Deepgram Nova-3 Multilingual is the right starting point. See §0.2 for the corrected rationale — the v1 reasoning was partially wrong. The abstraction layer is in place from Day 1; switching is a config change. |
| FSM Phase 2 target | ServiceTitan deferred, framed as "API partner approval takes 2–6 months" | **ServiceTitan direct integration for Drain Right in Phase 2, starting at Month 3** | The 2–6 month timeline applies to ST marketplace listing, not to single-tenant direct access. Drain Right's admin can create an ST app and provision credentials immediately at developer.servicetitan.io — no partner approval required for the pilot integration. Phase 1 deferral stands, but the reason is "manual mode is sufficient to prove the number" — not API gating. |
| FSM Phase 3 | "Jobber/HCP expansion" | **Jobber first, HCP second** | Jobber's public GraphQL API is self-serve (developer.getjobber.com, 90-day dev account, no approval). HCP is also available but Jobber has richer dispatch/invoice/visit data that maps more cleanly to Kova's domain model. |

### 0.2 Corrected Claims

**v1 line 215 (removed in v2):**
> "AssemblyAI's code-switching support is primarily available on streaming (not pre-recorded async), and is not clearly documented for the use case."

This is factually incorrect. AssemblyAI has a dedicated pre-recorded code-switching endpoint (`/docs/pre-recorded-audio/code-switching`) supporting:
- Universal-3 Pro: built-in EN/ES/PT/FR/DE/IT code-switching, no parameters required, prompt-based
- Universal-2: `code_switching: true` across 99 languages including EN↔ES

The correct competitive picture: both Deepgram and AssemblyAI support pre-recorded EN↔ES code-switching well. Deepgram returns per-word language tags; AssemblyAI returns per-utterance language detection with confidence scores. Deepgram is chosen as the Phase 1 default because per-word language tags are useful for clip-level language analytics and keyterm prompting is more mature. AssemblyAI is a viable and ~2× cheaper alternative that should be formally evaluated on real Drain Right audio before production commitment.

**v1 line 980 (corrected in v2):**
> "ServiceTitan integration | API partner approval takes 2–6 months."

Corrected: ST API access for existing customers is self-serve. Drain Right's admin logs into developer.servicetitan.io with their ST credentials, creates an app, and provisions OAuth client credentials. No partner application required for single-tenant direct access. The 2–6 month timeline applies to ST Marketplace listing (multi-tenant distribution). Phase 2 ST integration proceeds without waiting for marketplace approval.

**v1 line 1751 (resolved in v2):**
> "Annual billing default launch timing | Phase 1 (at launch) vs. Phase 2 — open decision."

Resolved: annual billing is the default at launch. See §0.1.

### 0.3 New Sections in v2

- §0 — Decision log (this section)
- §4.13 — Commercial readiness: full churn prevention engineering scope
- §4.14 — Activation sprint: Day 1 / 7 / 14 / 30 trigger engineering
- §4.15 — Design partner instrumentation (multi-partner analytics, case study data collection)
- §7.8 — Week 8 now includes STT bakeoff gate
- §10.4 — Phase 2 ServiceTitan integration scope (single-tenant direct access)
- §10.5 — Phase 3 Jobber integration scope

---

## 1. Product Vision

**Kova** is a mobile-first revenue intelligence platform for drain and plumbing businesses.

It records every service call, analyzes technician behavior using trade-specific AI, and delivers a precise, dollar-denominated account of what each call was worth and what estimated opportunity was left on the table — priced at the owner's actual rates, not industry averages.

> **Core Promise:**
> "We show you exactly what your team is leaving on the table — per call, per tech, every day."

**Phase 1 success condition:**
> Show Drain Right $20K–$50K in identified estimated opportunity within 30 days of going live, powered by their actual pricebook prices, with a dispute rate below 40% on any single opportunity type.

**Phase timeline:**

| Phase | Duration | Goal |
|---|---|---|
| **Phase 1 (this document)** | Weeks 1–12 | Foundation — prove the number |
| Phase 2 | Months 3–6 | Intelligence — ST integration, pre-call context, invoice matching, ROI report |
| Phase 3 | Months 6–12 | Expansion — Jobber integration, multi-location, PE sales motion |
| Phase 4 | Year 2 | Real-time — in-call coaching, fine-tuned model, HVAC |

---

## 2. Pilot Context

### Drain Right

- **Team size:** 16+ technicians
- **Phone split:** Mixed iOS and Android — cross-platform is non-negotiable from Day 1
- **FSM:** ServiceTitan — single-tenant direct API access available immediately (Drain Right admin provisions credentials). No marketplace approval needed. ST integration is deferred to Phase 2 because manual job tagging is sufficient to prove the number, not because of API access gating.
- **Trade:** Both drain and plumbing — both scoring models are required for Phase 1
- **Expected data volume:** ~160+ calls/week, ~640 calls/month
- **Location:** California — two-party consent state, Cal. Penal Code §632 applies

### Pilot Success Metrics

| Metric | Target |
|---|---|
| Estimated opportunity identified in 30 days | $20K–$50K |
| Recording rate (calls recorded / dispatched jobs) | ≥ 65% |
| Processing latency (upload → push notification) | < 5 minutes, 95th percentile |
| Dispute rate per opportunity type | < 40% |
| Cross-language score parity (ES vs EN) | < 10 point gap on equivalent performance |

### Design Partner Expansion (Month 1–3)

Drain Right is the anchor pilot. The goal by Month 3 is 5–10 design partners with at least one published case study. Engineering must support multi-tenant instrumentation from Day 1 — per-company analytics, per-company recording rates, and a case study data export tool that produces the "$X estimated opportunity in 30 days" number for any company.

---

## 3. Tech Stack

All decisions are validated against production research. Where v1 and v2 differ, v2 rationale supersedes.

### 3.1 Mobile App — React Native (Bare)

**Decision: React Native with `react-native-audio-api` (Software Mansion) — confirmed.**

React Native is chosen over Flutter for three reasons:

1. **Background audio — features are real and ship.** `react-native-audio-api` v0.11 added recording to file and a playback/recording notification system (lock screen controls). v0.12 added recording rotation — chunking recordings into smaller files for crash resilience. These are confirmed shipped features, not roadmap items. The library is a Web Audio API implementation; recording was added as a primary use case starting v0.7 (microphone support) and is fully documented and maintained by Software Mansion.

2. **Full-stack TypeScript.** Mobile app, Next.js dashboard, and Node.js backend all use TypeScript. Shared types, shared Zod validation, shared API contracts. One language, one linter config, one mental model for a solo founder. Flutter would require Dart and TypeScript simultaneously.

3. **Expo managed workflow is a non-starter; bare RN is the right call.** `expo-av` does not support background audio recording without ejecting. Bare React Native (or Expo with a custom dev client and `expo-modules-core`) is required from Day 1.

**Week 3 validation gate:** Before any other work depends on it, confirm background recording on real hardware — not simulator. Record a 30-minute session, background the app, lock the phone, return after 20 minutes. Must continue uninterrupted on at least one iOS and one Android device. If this gate fails, escalate immediately — everything else depends on it.

**Framework:** React Native CLI (bare workflow) or Expo with custom dev client.

**Key libraries:**

| Library | Purpose |
|---|---|
| `react-native-audio-api` | Background audio recording, lock screen controls, recording rotation/chunking |
| `@clerk/clerk-expo` | Auth — phone OTP + session management |
| `react-native-fs` | Local filesystem (offline recording queue) |
| `react-native-mmkv` | Queue state persistence — survives app restarts |
| `@aws-sdk/client-s3` | S3 presigned URL upload |
| `react-native-background-upload` | Chunked multipart upload with retry |
| `@notifee/react-native` | Android foreground service notification (keepalive) |
| `react-native-firebase` | FCM push notifications (iOS + Android unified) |
| `zustand` | Local state management |
| `@tanstack/react-query` | Server state, API data fetching |
| `zod` | Runtime schema validation (shared with backend) |

**On-device recording format:** AAC-LC at 32kbps mono. ~2 MB/hr, natively supported on iOS (AVFoundation) and Android (MediaCodec), accepted directly by both Deepgram and AssemblyAI without server-side transcode.

**Android foreground service:** Required for background recording on Android regardless of framework. A persistent notification must be shown while recording is active. `@notifee/react-native` manages this. This is not a React Native limitation — it is an Android OS requirement.

### 3.2 Web Dashboard — Next.js on Vercel

**Decision: Next.js 15 (App Router) deployed on Vercel**

- SSR for dashboard reduces time-to-meaningful-content
- App Router with React Server Components keeps data fetching close to the server
- Vercel deployment is zero-config for Next.js
- TypeScript throughout, shared types with backend
- Tailwind CSS + shadcn/ui for component library

**Key libraries:**

| Library | Purpose |
|---|---|
| `@clerk/nextjs` | Auth — owner/manager web sessions |
| `@tanstack/react-query` | Client-side data fetching and cache |
| `zod` | Shared schema validation |
| `drizzle-orm` | Database ORM |
| `recharts` | Dashboard charts and trend visualizations |
| `tailwindcss` | Styling |
| `shadcn/ui` | Component library (Radix-based, unstyled, composable) |

Vercel handles the dashboard UI and lightweight API routes (presigned URL generation, webhook receipt, dashboard data reads). Long-running processing (transcription, LLM scoring) runs on Railway.

### 3.3 Backend Processing Pipeline — Railway + BullMQ

**Decision: Railway (Node.js worker service) with BullMQ job queue**

AWS Lambda was evaluated and rejected for Phase 1. IAM, S3 triggers, CloudWatch, and VPC configuration overhead is not appropriate for a solo founder at 640 calls/month pilot scale. Railway with a BullMQ queue and Redis is simpler to operate, easier to debug, and trivially migrated to Lambda/Step Functions later if scale requires it.

**Architecture:**
- Vercel API route enqueues a BullMQ job when audio upload is complete
- Railway worker processes jobs: download audio → assess quality → transcribe → score → write to DB → push notification
- Redis (Railway add-on) backs the BullMQ queue
- Bull Board accessible at an internal Railway URL for job monitoring

### 3.4 Database — PostgreSQL via Neon

**Decision: Neon (serverless PostgreSQL) with Drizzle ORM**

- Neon's branching model gives a free `dev` and `test` branch alongside `main`
- Drizzle provides type-safe queries with explicit SQL — no magic, easy to debug
- Free tier is more than sufficient for the pilot (scale up when revenue justifies it)
- HTTP-based connection for Vercel serverless functions; standard pooled connection for Railway worker

### 3.5 Auth — Clerk

- Phone OTP for technicians (mobile) — no email required
- Email/password + Google SSO for owners/managers (web)
- Clerk Organizations map to Kova companies
- Custom roles: `technician`, `field_manager`, `owner`
- All API routes protected by Clerk JWT middleware

### 3.6 Audio Storage — AWS S3

- S3 Standard for active audio (0–90 days)
- Lifecycle transition to S3 Glacier Instant Retrieval at 90 days (~80% cost reduction)
- Deletion at owner-configured retention period (default 12 months)
- No public access; presigned URLs for all reads and writes
- SSE-S3 encryption at rest

### 3.7 Transcription Provider — Deepgram (provider-agnostic interface)

**Decision: Deepgram Nova-3 Multilingual as the Phase 1 implementation; provider-agnostic interface from Day 1; formal bakeoff at Week 8–9.**

**Why Deepgram as starting point:**
- Nova-3 Multilingual with `language=multi` provides per-word language detection for EN↔ES mid-sentence code-switching — each word in the response carries a `language` tag (`"en"` or `"es"`) and confidence score. This is useful for clip-level language analytics and for tracking which language each coaching moment occurred in.
- Nova-3 is explicitly marketed for "background noise, crosstalk, and far-field audio" — directly matching Kova's recording environment (phone in a pocket or set down in a noisy field environment).
- Keyterm prompting (`keyterms` parameter) boosts accuracy for trade-specific vocabulary (hydrojet, cleanout, p-trap, inspección de cámara, plan de mantenimiento).

**Why NOT a permanent lock:**
Both Deepgram and AssemblyAI support pre-recorded EN↔ES code-switching. AssemblyAI Universal-3 Pro has built-in code-switching for EN/ES (no parameters required, prompt-based) and Universal-2 supports it across 99 languages. AssemblyAI is approximately 2× cheaper at pilot scale (~$74/month vs ~$150/month for 640 calls at 30-minute average with diarization). The provider-agnostic interface means switching is a one-line config change.

**Bakeoff gate (Week 8–9):** Run 20–30 real Drain Right calls through both Deepgram Nova-3 and AssemblyAI Universal-3 Pro using the abstraction layer. Evaluate: WER on noisy calls, WER on bilingual calls, word-level vs. utterance-level language detection quality for Kova's scoring use case, cost per call. Pick the winner before production traffic scales beyond the pilot.

**Cost at pilot scale (640 calls/month, 30-min average):**

| Provider | Rate | + Diarization | Per call | Monthly |
|---|---|---|---|---|
| Deepgram Nova-3 Multilingual | $0.0058/min | +$0.002/min | ~$0.23 | ~$150 |
| AssemblyAI Universal-3 Pro | $0.0035/min | +$0.00033/min | ~$0.115 | ~$74 |
| AssemblyAI Universal-2 | $0.0025/min | +$0.00033/min | ~$0.085 | ~$54 |

### 3.8 LLM Provider — Provider-Agnostic Interface, Starting with OpenAI

**Decision: LLM-agnostic abstraction layer. Phase 1 implementation: OpenAI GPT-5.4-mini (primary) + GPT-5.4 (fallback for low-confidence re-analysis)**

The LLM landscape changes on month-to-month timescales. The abstraction layer means swapping models is a config change, not a code change.

```bash
# .env
TRANSCRIPTION_PROVIDER=deepgram        # → deepgram | assemblyai
LLM_PRIMARY_PROVIDER=openai            # → openai | anthropic | bedrock | vertex | azure
LLM_PRIMARY_MODEL=gpt-5.4-mini
LLM_FALLBACK_PROVIDER=openai
LLM_FALLBACK_MODEL=gpt-5.4
LLM_CONFIDENCE_THRESHOLD=0.72
FSM_ADAPTER=manual                     # → manual | servicetitan | jobber | hcp
```

### 3.9 Payments — Stripe

- Products: Starter ($89/seat), Pro ($129/seat), Team ($149/seat)
- **Annual billing as default offer** — 2 months free (pay 10, get 12). This is not optional; it is the primary offer. Monthly billing is presented as a secondary opt-in.
- 14-day free trial via Stripe trial periods (no credit card required to start)
- Subscription webhook handler for lifecycle events
- Seat management: add/remove techs → Stripe subscription item quantity updated
- Stripe Customer Portal for owner self-service (card update, invoice download, plan change, cancel)
- Smart Retries enabled (built-in Stripe dunning)
- See §4.13 for the full involuntary churn prevention engineering scope beyond Smart Retries

### 3.10 Push Notifications — Firebase Cloud Messaging

- FCM for both iOS and Android via single API
- `react-native-firebase` for mobile SDK
- `firebase-admin` in Railway worker

### 3.11 Email — Resend

- Transactional email: weekly digest, auth, billing notifications, activation sprint triggers
- React Email for TypeScript component-based templates
- Vercel cron for weekly digest scheduling

### 3.12 Validated Tech Stack Summary

| Layer | Technology | Hosting |
|---|---|---|
| Mobile app | React Native (bare) | App Store + Google Play |
| Mobile audio | `react-native-audio-api` v0.11+ | On-device |
| Web dashboard | Next.js 15 (App Router) | Vercel |
| Processing pipeline | Node.js + BullMQ | Railway |
| Job queue | BullMQ + Redis | Railway (Redis add-on) |
| Database | PostgreSQL via Neon | Neon |
| ORM | Drizzle ORM | — |
| Auth | Clerk | Clerk cloud |
| Audio storage | AWS S3 | AWS us-east-1 |
| Transcription (Phase 1) | Deepgram Nova-3 Multilingual | Deepgram cloud |
| LLM (primary) | OpenAI GPT-5.4-mini | OpenAI cloud |
| LLM (fallback) | OpenAI GPT-5.4 | OpenAI cloud |
| Payments | Stripe | Stripe cloud |
| Push notifications | Firebase Cloud Messaging | Google cloud |
| Email | Resend + React Email | Resend cloud |
| Language | TypeScript everywhere | — |

---

## 4. System Architecture

### 4.1 High-Level Architecture

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
                       │  │    └─► OpenAI GPT-5.4 (fallback)         │ │
                       │  │ 6. Assemble ScoringResult                │ │
                       │  │ 7. Write to Neon (PostgreSQL)            │ │
                       │  │ 8. Send push notification (FCM)          │ │
                       │  │ 9. Trigger activation events             │ │
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

### 4.2 Request Flow: Recording → Scored Result

```
1.  Tech taps "Start Recording" on mobile
2.  Consent modal shown — tech verbally informs customer
3.  Tech taps "Customer Consented" — consent event logged with timestamp
4.  react-native-audio-api starts background recording session (AAC-LC 32kbps mono)
5.  Recording rotates every 5 minutes → local chunks stored in FS queue
6.  Tech taps "Stop" (or job ends)
7.  Mobile calls GET /api/calls/presign → Vercel returns S3 presigned upload URL
8.  Mobile uploads audio file directly to S3 (chunked multipart)
9.  Mobile calls POST /api/calls/upload-complete with { s3Key, callMetadata }
10. Vercel API enqueues BullMQ job → returns 202 Accepted
11. Railway worker picks up job (within seconds)
12. Worker downloads audio from S3
13. Audio quality assessment (SNR, duration, clipping, silence ratio)
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
22. Activation event check: trigger any Day 1/7/14/30 activation sprint actions
23. Total time from upload complete to notification: target < 5 minutes
```

### 4.3 Provider-Agnostic Interfaces

```
packages/
  providers/
    transcription/
      TranscriptionProvider.ts      ← interface
      DeepgramProvider.ts           ← Phase 1 implementation
      AssemblyAIProvider.ts         ← Phase 1 stub (used for bakeoff)
      index.ts                      ← factory: getTranscriptionProvider(config)

    llm/
      LLMProvider.ts                ← interface
      OpenAIProvider.ts             ← Phase 1 implementation
      AnthropicProvider.ts          ← stub
      BedrockProvider.ts            ← stub
      index.ts                      ← factory: getLLMProvider(config)

    fsm/
      FSMAdapter.ts                 ← interface
      ManualAdapter.ts              ← Phase 1 (no-op / manual tagging)
      ServiceTitanAdapter.ts        ← Phase 2 implementation (single-tenant)
      JobberAdapter.ts              ← Phase 3 implementation
      index.ts                      ← factory: getFSMAdapter(config)
```

Switching providers is a config change — no code change required:
```bash
TRANSCRIPTION_PROVIDER=assemblyai   # switches the entire transcription pipeline
FSM_ADAPTER=servicetitan            # activates ST integration for a company
```

### 4.4 Repository Structure

Monorepo using `pnpm` workspaces + Turborepo:

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
└── turbo.json
```

`packages/shared` is the type contract between all apps. `Call`, `Score`, `Opportunity`, `PricebookItem`, `ScoringResult` defined here are the same types used in mobile, web, and Railway worker.

### 4.5 Core Data Model

```typescript
// packages/db/schema.ts

companies          id, name, plan, state, created_at, fsm_adapter, fsm_config (JSONB)
locations          id, company_id, name                        // Team tier
users              id, company_id, location_id, clerk_user_id, role, name, language_pref
jobs               id, company_id, tech_id, fsm_job_id, customer_name, job_type,
                   scheduled_at, call_id, dispatched_at
calls              id, tech_id, job_id, recorded_at, duration_sec, s3_key, transcript_id,
                   score_id, language, audio_quality, status, consent_logged_at, decline_reason
transcripts        id, call_id, segments (JSONB), language, wer_confidence,
                   provider, model
scores             id, call_id, overall_score, dimensions (JSONB), opportunity_total_low,
                   opportunity_total_high, confidence_level, model_used, prompt_version
opportunities      id, score_id, type, triggered, offered, pricebook_item_id, value_low,
                   value_high, ltv_value, clip_start_sec, clip_end_sec, is_default_price,
                   dispute_reason, disputed_at, confidence
pricebook_items    id, company_id, location_id, name, trade, opportunity_type, pricing_model,
                   price_fixed, price_low, price_high, tiers (JSONB), is_recurring,
                   ltv_annual, ltv_years, is_default, active
coaching_points    id, call_id, tech_id, text, clip_start_sec, clip_end_sec, reviewed_at,
                   manager_note
badges             id, user_id, badge_type, earned_at
streaks            id, user_id, current_count, longest_count, last_call_date, threshold
notifications      id, user_id, type, payload (JSONB), sent_at, read_at, channel
audit_logs         id, company_id, user_id, action, target_type, target_id, created_at
activation_events  id, company_id, user_id, event_type, triggered_at, actioned_at, channel
processing_costs   id, call_id, provider, tokens_in, tokens_out, cost_usd, created_at
design_partner_snapshots  id, company_id, snapshot_date, calls_recorded, opportunity_total,
                          avg_score, recording_rate, top_opportunity_type
```

**Multi-tenancy:** Every query includes `company_id` from the Clerk session. No cross-tenant data access by construction.

**Audit trail:** `audit_logs` retains scoring data for 3 years minimum (separate from call retention policy). `scores`, `transcripts`, and `opportunities` are never hard-deleted within the retention window.

**FSM config:** `companies.fsm_config` stores per-company FSM credentials as encrypted JSONB. Phase 2 ST integration stores the ST tenant ID, client ID, and client secret here. No FSM credentials are shared across companies.

---

## 5. Phase 1 Feature Scope

What gets built in 12 weeks. Organized by system.

### 5.1 Mobile App

#### Recording Engine
- One-tap record with prominent button on app home screen
- Lock screen controls — record button accessible via iOS Control Center widget and Android Quick Settings tile (react-native-audio-api v0.11 notification system)
- Background recording via `react-native-audio-api` with `AVAudioSession` (iOS) and Foreground Service with visible notification (Android)
- Recording format: AAC-LC, 32kbps, mono, 44.1kHz
- Recording rotation: new chunk every 5 minutes (react-native-audio-api v0.12) — if app crashes, only the last 5-minute chunk is lost
- Pause/resume for interruptions
- Visual recording indicator always visible during active session
- Battery management:
  - In-app battery indicator before starting a job
  - Warning at 20%: "Low battery — recording quality may be affected"
  - Auto-pause at 15% with push notification
- Wired earphone mic detection — prefer external mic if available

#### Consent Flow

State-specific consent language is configurable by owner in admin settings. Two-party consent states (including California) default to mandatory full-disclosure language. The consent event is the most legally critical piece of data Kova stores — it must be logged before a single byte of audio is written.

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

- "Customer Consented": logs consent event with tech ID + timestamp → starts recording
- "Customer Declined": does not record, logs decline event, adds job to unrecorded list
- Audible tone plays for 1 second when recording begins (ambient secondary notice)
- Consent timestamp stored in `calls.consent_logged_at` — never nullable if recording exists

#### Offline Queue
- Audio chunks written to device filesystem immediately on rotation
- Queue maintains ordered list of pending chunks + metadata, persisted via `react-native-mmkv` — survives app restarts
- Auto-upload on: job completion, wifi connection, app foreground
- Chunked multipart S3 upload with exponential backoff retry
- Queue state display: "2 calls pending upload"
- No call data is ever lost due to connectivity interruption

#### Manual Job Tagging
- After stopping: prompt tech to tag the job
  - Customer name (free text)
  - Job type: Drain / Plumbing / Both
  - Optional notes
- ST integration (Phase 2) will auto-populate from FSM dispatch data

#### Non-Recording Reason Capture
- When a job ends without a recording, app prompts before the tech starts next job:
  - "Customer declined recording"
  - "Technical issue (battery / signal)"
  - "Emergency call — no time"
  - "Other"
- Reason logged and surfaced in manager dashboard as a compliance gap
- Prevents managers from penalizing techs for legitimate skips

#### Post-Call Summary (Tech View)
- Push notification within 5 minutes: "Your call summary is ready"
- Summary card: overall score, estimated opportunity total, top 2 coaching points with "Play clip"
- Expandable detail: full scoring breakdown by dimension
- Each opportunity item: dollar value, trigger timestamp, Play clip, "Not Applicable" button with required reason
- "Mark as reviewed" per coaching point
- Personal call history: all calls, searchable by date

### 5.2 Transcription Pipeline (Railway Worker — Step 3)

#### Audio Quality Assessment
| Check | Method | Threshold |
|---|---|---|
| Duration | File metadata | < 2 min → "Short call" flag; < 30 sec → skip scoring |
| Clipping | Peak amplitude | > 5% clipped samples → "High distortion" flag |
| Background noise | SNR estimation | SNR < 10 dB → "Low quality" flag |
| Silence ratio | VAD | > 70% silence → "Sparse audio" flag |

Quality → handling:
- **High:** Standard processing
- **Medium:** Standard processing with wider confidence intervals
- **Low:** Process with "Low Confidence" flag; manager notified
- **Failed** (< 30% intelligible): Not scored; tech notified "audio was unclear"

#### Transcription

```typescript
const result = await transcriptionProvider.transcribe(audioBuffer, {
  language: 'multi',           // Deepgram: per-word EN/ES language tags
  diarize: true,               // Speaker separation
  punctuate: true,
  smartFormat: true,
  keywords: PLUMBING_KEYTERMS, // Trade vocabulary boost
})
```

Target latency: < 2 minutes for a 30-minute call.
Output stored in `transcripts.segments` as JSONB: `[{ text, speaker, start_sec, end_sec, language, confidence }]`

#### Per-Language WER Tracking
- Confidence scores logged per segment and per language
- If average Spanish segment confidence < English confidence by > 15pp: call flagged "lower confidence — transcription accuracy may be affected"
- Aggregate WER gap tracked over time as a model health metric and reviewed weekly

### 5.3 Scoring Engine (Railway Worker — Steps 4–6)

#### Rules Layer (Deterministic)

Pure TypeScript functions — no ML, fully unit-tested.

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
- Trigger signals: "keeps happening", "keep coming back", "third time", "again", "every year", "always", "siempre pasa", "otra vez", "de nuevo"; prior visit detected in customer intro
- Offer detection: "camera", "inspection", "scope", "cámara", "inspección"
- Scoring: offer detected after trigger → no miss; trigger present + no offer → missed opportunity

**2. Maintenance Plan (Both trades)**
- Trigger: always checked at close — last 20% of call duration
- Offer detection: "maintenance", "service agreement", "plan", "membership", "mantenimiento", "contrato de servicio"
- Scoring: mentioned at close → no miss; not mentioned → missed opportunity

**Phase 2 additions (Month 3):**
- Hydrojet not presented when snake-only diagnosed

**Phase 3 additions (Month 6+):**
- Water heater replacement, whole-home walkthrough, filtration/softener, service agreement framing

#### LLM Layer (Contextual)

Runs in parallel with rules layer. Handles qualitative dimensions rules cannot detect.

**Output schema:**
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
    emergencyContext: boolean
    customerDistress: boolean
    shortCall: boolean
    firstTimeCaller: boolean
  }
  confidence: number
  dimensionConfidences: Record<string, number>
  reasoning: string
}
```

Temperature: `0` for all scoring calls. Deterministic output required.

**Contextual suppressions:**
- `emergencyContext = true` → emergency mode — no opportunity flags
- `customerDistress = true` → suppress all upsell flags
- `shortCall = true` → score only dimensions with sufficient time; others "N/A"

**Customer Experience Quality dimension** (not present in most competitors): detects whether recommendations were contextually appropriate, including over-recommendation detection (same upsell offered twice after customer declined = "pressure indicator" flag).

#### Score Assembly

```typescript
function assembleScore(
  ruleResults: RuleResult[],
  llmOutput: LLMScoringOutput,
  pricebook: PricebookItem[],
  transcript: Segment[],
): ScoringResult {
  // 1. Apply contextual suppressions from LLM
  // 2. Merge rule-detected opportunities with LLM confidence scores
  // 3. Calculate per-dimension scores
  // 4. Look up pricebook values for each detected opportunity
  // 5. Calculate overall score (weighted average)
  // 6. Flag low-confidence items:
  //    >= 0.85 → surfaced in tech view
  //    0.60–0.85 → manager view only, "review recommended"
  //    < 0.60 → manager view only, "uncertain — verify manually"
  // 7. Check fallback trigger: if any dimension < CONFIDENCE_THRESHOLD, queue re-analysis
}
```

**Score weights — Drain:**
```typescript
const DRAIN_SCORE_WEIGHTS = {
  diagnosisQuality: 0.20,
  cameraInspection: 0.25,
  maintenancePlan: 0.20,
  customerEducation: 0.15,
  closeQuality: 0.10,
  customerExperienceQuality: 0.10,
}
```

**Score weights — Plumbing:**
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

#### Tech Dispute Mechanism

Every opportunity in tech view includes a "Not Applicable" button:
- "Customer already has this service"
- "I offered it — customer declined (not captured in audio)"
- "Not relevant to this job type"
- "Customer said they couldn't afford more today"
- "Other (free text)"

When disputed: hidden from tech coaching view; manager still sees with dispute reason; aggregate dispute rates tracked per opportunity type. **If dispute rate > 40% on any type: pull the type and investigate — this gate is non-negotiable.**

### 5.4 Estimated Opportunity Engine

For each detected (non-suppressed) opportunity:
```
1. Look up opportunity type in company pricebook
2. Pricing model:
   - Fixed → value_low = value_high = price_fixed
   - Range → value_low = price_low, value_high = price_high (display midpoint)
   - Tiered → use mid-tier; note which tier was missed if context available
3. LTV flag → if is_recurring: LTV = ltv_annual × ltv_years
4. No owner price → fall back to industry default; tag "(default — update your pricebook)"
5. Attach: trigger timestamp, audio clip range (trigger ± 30 seconds)
```

Call-level output: `opportunity_total_low` / `opportunity_total_high`.

Footnote on every output:
> *Estimated opportunity reflects your pricebook prices. Actual revenue potential depends on customer need, timing, and context — not every flagged opportunity would have been accepted.*

### 5.5 Pricebook

- Settings → Pricebook: table view, add/edit/delete, active/inactive toggle
- Pricing models: Fixed, Range, Tiered
- LTV configuration: recurring flag, annual price, years → LTV in opportunity output
- CSV import with template download, preview, confirm
- Industry defaults pre-loaded for California drain + plumbing market
- Pricebook completion indicator: shown until ≥ 70% of items are owner-configured
- Default price tagging: "(industry default — update with your price)"

**Phase 1 default pricebook (California drain + plumbing):**

| Service | Opportunity Type | Pricing Model | Default |
|---|---|---|---|
| Camera Inspection | camera_inspection | Fixed | $425 |
| Drain Snaking (standard) | drain_snaking | Range | $150–$250 |
| Hydrojetting | hydrojet | Range | $750–$950 |
| Drain Snaking (main line) | drain_snaking_main | Range | $250–$400 |
| Maintenance Plan (annual) | maintenance_plan | Recurring | $299/yr × 5yr = $1,495 LTV |
| Water Heater Replacement | water_heater | Range | $1,800–$3,200 |
| Water Heater (tankless) | water_heater_tankless | Range | $2,500–$5,000 |
| Whole-Home Walkthrough | whole_home_walkthrough | Fixed | $89 |
| Water Filtration/Softener | filtration_softener | Range | $800–$2,500 |
| Service Agreement (annual) | service_agreement | Recurring | $249/yr × 5yr = $1,245 LTV |
| Leak Detection | leak_detection | Range | $199–$399 |

### 5.6 Owner/Manager Web Dashboard

#### Home Screen (Owner View)
- **Estimated opportunity this week — large number, front and center**
- Trend vs. last week (arrow + percentage)
- Top 3 opportunity types this week (ranked by dollar value)
- Call review queue: auto-flagged calls (high opportunity miss, low score, new techs)
- Pricebook completion indicator (shown until ≥ 70% configured)
- Team recording compliance rate for the week

#### Team Performance
- Per-tech table: name, avg score (7-day), avg estimated opportunity/call, calls recorded, recording rate, trend arrow
- Click any tech → full call history + coaching activity
- Week-over-week improvement per tech per dimension

#### Call Review Queue
- Auto-flagged: estimated opportunity > $1,500, score < 50, tech not reviewed in 5+ days
- One-click to full call: transcript, score breakdown, audio playback, coaching notes
- Mark as reviewed / add coaching note / flag for 1:1

#### Compliance Dashboard
- Per-tech recording rate (calls recorded / dispatched jobs)
- Compliance gaps: dispatched jobs with no recording and no reason logged
- Decline rate (customer-initiated vs. tech-initiated)

### 5.7 Basic Call Library

- List view: all calls sorted by date (most recent first)
- Per-row: tech name, date, job type, duration, overall score, estimated opportunity total, language, audio quality indicator
- Call detail: audio player (waveform), synchronized transcript, score breakdown panel, opportunity markers on waveform
- Search: by tech name, date range, job type (full-text search Phase 2)

### 5.8 Gamification (Phase 1 Light Set)

#### Streaks
- Consecutive calls above score threshold (default: 70/100, configurable by owner)
- Milestone pushes: 3-call, 7-call, 14-call streaks
- Streak resets on call below threshold

#### Personal Bests
- Highest single-call score, longest streak, best 7-day average
- Displayed on tech profile screen

#### Badges (Phase 1)
| Badge | Criteria |
|---|---|
| Pioneer | Complete 3 recordings in Week 1 |
| First Call | Complete first scored call |
| Perfect Score | 100/100 on any call |
| Consistent | 7-day average above 80 |

Full badge set deferred to Phase 2.

### 5.9 Dispatch-Linked Compliance (Manual Mode)

- Owner enters or imports the week's job schedule
- Kova compares dispatched jobs against recorded calls
- Any dispatched job with no recording and no logged reason → "compliance gap" in manager dashboard
- Compliance gaps carry equal visual weight to coaching scores

### 5.10 Onboarding Flow

Target: account created → first scored call delivered in < 35 minutes.

**Owner (web):**
1. Account creation (2 min): email/password or Google SSO, company name, state, primary trade
2. Team setup (3 min): add techs by name + phone → Kova sends SMS with app download link
3. Pricebook setup (5–10 min): defaults pre-loaded; "Start with defaults / Import CSV / Configure later"
4. Completion: dashboard with empty state and "Ask a tech to record their first call" CTA

**Technician (mobile):**
1. SMS: "Download Kova — [Company] uses this for calls. [link]"
2. App install → phone number → SMS OTP (Clerk)
3. Three-screen intro: what Kova is, how it helps you earn more, how to record (skippable)
4. Home screen with prominent Record button and Pioneer badge prompt

### 5.11 Notifications

**Tech:**
| Event | Channel | Timing |
|---|---|---|
| Post-call summary ready | Push + in-app | Within 5 min of processing |
| Badge earned | Push + in-app | Real-time |
| Streak milestone | Push + in-app | Real-time |
| Weekly personal stats | Push | Monday 8am (tech's timezone) |

**Owner/Manager:**
| Event | Channel | Timing |
|---|---|---|
| Weekly digest email | Email | Monday 7am (owner's timezone) |
| High opportunity alert (> $1,500 on single call) | Push + email | Real-time (configurable threshold) |
| Tech hasn't recorded in 3 days | Push | Real-time |

**Weekly digest email (Monday):**
- Total estimated opportunity last week + week-over-week change
- Top 3 opportunity types
- Top performing tech (score) + most improved tech (score change)
- 1–2 specific high-value moments with clip links
- Pricebook completion reminder if still using defaults
- Login-free summary — all key numbers visible without clicking through

### 5.12 Auth & Billing

**Auth:** Clerk handles all flows. Company = Clerk Organization. Roles: `technician`, `field_manager`, `owner`.

**Billing:**
- Stripe Billing with products/prices pre-configured
- 14-day free trial, no credit card required
- Annual billing as default offer (2 months free)
- Monthly billing as opt-in secondary offer
- Webhook handler for subscription lifecycle events
- Seat management: owner adds/removes tech seats → Stripe subscription item updated
- Billing portal: Stripe Customer Portal (card update, invoice download, plan change, cancel)

### 5.13 Commercial Readiness — Full Churn Prevention Engineering

v1 only implemented Stripe Smart Retries and the 7-day grace period. The full set of involuntary churn prevention measures from product-brief-v1 §13 must be in engineering scope for Phase 1.

**Involuntary churn prevention (all 6 measures, not just 2):**

| Measure | Implementation | When |
|---|---|---|
| Smart Retries | Stripe built-in | Week 10 |
| 7-day grace period | Stripe trial period on failed invoice | Week 10 |
| Pre-dunning email at card expiry − 7 days | Stripe webhook `customer.updated` → check `card.exp_month/year` → Resend email | Week 10 |
| In-app "payment failed" banner | Stripe webhook `invoice.payment_failed` → set `company.payment_failed = true` → banner in web + mobile | Week 10 |
| ACH/bank debit option | Stripe ACH direct debit enabled on Stripe account; presented as secondary payment option in billing portal | Week 10 |
| Visa/Mastercard Account Updater | Enable in Stripe Dashboard → Settings → Card updates (automatic, no code required) | Week 10 setup |

**Voluntary churn defense — success-triggered churn:**
As techs improve, estimated opportunity per month declines. Owners may interpret declining numbers as declining value. The cumulative ROI framing prevents this:

- Dashboard always shows **cumulative** opportunity identified since account creation alongside the weekly number
- When monthly opportunity drops > 30% month-over-month: show "Your team's estimated opportunity dropped from $X to $Y — that means they're capturing approximately $Z more per month than when you started."
- This framing is built into the weekly digest email template logic in Phase 2 when the ROI report launches; in Phase 1 it is shown on the dashboard home screen.

### 5.14 Activation Sprint Engineering

product-brief-v1 §13 specifies a Day 1 / 7 / 14 / 30 activation sprint. 50% of first-year churn happens in the first 90 days. These triggers must be engineered, not handled manually forever.

**Activation event schema (`activation_events` table):**
```typescript
id, company_id, user_id, event_type, triggered_at, actioned_at, channel
```

**Automated triggers:**

| Day | Trigger Condition | Action | Channel |
|---|---|---|---|
| 1 | Account created | Send "Welcome — here's what to do first" email with setup checklist | Email |
| 7 | < 10 calls recorded in first 7 days | Flag in internal CS dashboard; send check-in email to owner | Email + CS flag |
| 14 | < 10 calls total | Urgent CS flag: "Troubleshoot together" email with calendar link | Email + CS flag |
| 30 | < 30 calls total OR recording rate < 40% | CS outreach escalation; owner and founder 1:1 | CS flag |

**Internal CS dashboard (owner):**
- New accounts in last 30 days with recording rate and call count
- Activation health score per company (green/yellow/red)
- Triggered activation events and whether they were actioned

At pilot scale (1 company), this is manual review of a simple dashboard widget. Engineering it as an `activation_events` table from Day 1 means it scales automatically as more design partners are added.

### 5.15 Design Partner Instrumentation

Drain Right is the anchor pilot. By Month 3 the goal is 5–10 design partners and one published case study. Engineering must support this from Day 1.

**Per-company analytics snapshot (daily job, `design_partner_snapshots` table):**
- `calls_recorded` — total and this week
- `opportunity_total` — cumulative and this week
- `avg_score` — this week
- `recording_rate` — this week
- `top_opportunity_type` — by dollar value

**Case study export endpoint:**
```
GET /api/admin/case-study/:companyId?from=YYYY-MM-DD&to=YYYY-MM-DD
```
Returns: total calls recorded, total estimated opportunity identified, avg score improvement (first week vs. last week), recording rate trend, top 3 opportunity types with total dollar value, dispute rate per type.

This produces the "$X in estimated opportunity in 30 days" number that powers every case study and sales conversation.

---

## 6. What NOT to Build in Phase 1

| Category | Why Excluded | When |
|---|---|---|
| ServiceTitan integration | Manual job tagging is sufficient to prove the number. ST single-tenant integration ready to build in Phase 2 (no approval needed for Drain Right). | Phase 2 |
| Pre-call intelligence | Requires FSM dispatch data. No FSM in Phase 1. | Phase 2 |
| Invoice matching / recovery rate | Requires FSM invoice data. | Phase 2 |
| Kova ROI Report | Requires 30+ days of baseline data. | Phase 2 |
| Full call library (search, clips, sharing) | Basic list view sufficient for pilot. | Phase 2 |
| Clip sharing (expiring secure links) | Email is sufficient for Phase 1 coaching. | Phase 2 |
| Hydrojet opportunity type | Higher ambiguity. Needs more transcript data. | Phase 2 (Month 3) |
| Water heater, whole-home, filtration | High ambiguity; needs annotated data. | Phase 3 |
| Auto-record on arrival (geofence) | Addresses adoption; not critical for proving the number. | Phase 2 |
| Spanish mobile UI | Coaching points delivered in Spanish; full UI deferred. | Phase 2+ |
| Leaderboard (team-facing) | Personal bests and streaks first. | Phase 2 |
| Full badge set | 4 badges sufficient for Phase 1. | Phase 2 |
| SOC 2 | Process begins Month 9–12. | Phase 2+ |
| Custom scoring weights | Team tier feature. | Phase 3 |
| Multi-location support | Drain Right is single-location. | Phase 3 |
| API access | Not needed until Phase 3+ customers. | Phase 3 |
| Real-time in-call coaching | High latency risk, distraction risk. | Year 2 |
| Proprietary ML model | Need annotated training data first. | Year 2+ |
| HVAC scoring model | Nail plumbing/drain first. | Year 2 |
| CRM / booking / scheduling | FSMs own this. | Never |
| Full pricebook / CPQ tool | Kova uses prices; it doesn't manage them. | Never |

---

## 7. Architecture Deep Dives

### 7.1 Audio Pipeline — On-Device (React Native)

```
react-native-audio-api
  ├── MediaStream (mic input)
  ├── AudioContext
  ├── MediaRecorder (AAC-LC, 32kbps, mono, 44.1kHz)
  └── Recording rotation every 5 minutes → local chunk files
```

**iOS (`Info.plist`):**
```xml
<key>NSMicrophoneUsageDescription</key>
<string>Kova records service calls to help you earn more.</string>
<key>UIBackgroundModes</key>
<array><string>audio</string></array>
```

**Android (`AndroidManifest.xml`):**
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
<service android:name=".RecordingService"
         android:foregroundServiceType="microphone" />
```

Android requires a visible persistent notification during recording — this is an OS requirement, not a React Native limitation. `@notifee/react-native` manages the foreground service notification.

#### Offline Queue State Machine

```
IDLE
  ↓ (tech taps Record)
RECORDING
  ↓ (every 5 min) → write chunk to FS queue
  ↓ (tech taps Stop)
STOPPED
  ↓ (connectivity available)
UPLOADING
  ↓ (all chunks uploaded)
  ↓ (POST /api/upload-complete)
PENDING_ANALYSIS
  ↓ (worker completes, push received)
COMPLETE

On upload failure:
UPLOADING → UPLOAD_RETRY (exponential backoff, max 5 attempts)
           → UPLOAD_FAILED (notify tech, retry manually)
```

Queue persistence: `react-native-mmkv` — survives app restarts. No call data is ever lost.

### 7.2 Transcription Pipeline

```typescript
// packages/providers/transcription/DeepgramProvider.ts

export class DeepgramProvider implements TranscriptionProvider {
  async transcribe(audioBuffer: Buffer, options: TranscriptionOptions): Promise<TranscriptionResult> {
    const response = await this.client.listen.prerecorded.transcribeFile(audioBuffer, {
      model: 'nova-3',
      language: 'multi',          // EN↔ES per-word language tags
      diarize: true,
      punctuate: true,
      smart_format: true,
      keyterms: PLUMBING_KEYTERMS,
      filler_words: false,
    })
    return this.normalize(response)  // → standard TranscriptionResult
  }
}
```

```typescript
// packages/providers/transcription/AssemblyAIProvider.ts
// Used for bakeoff at Week 8–9; stub in Phase 1 build

export class AssemblyAIProvider implements TranscriptionProvider {
  async transcribe(audioBuffer: Buffer, options: TranscriptionOptions): Promise<TranscriptionResult> {
    const transcript = await this.client.transcripts.transcribe({
      audio: audioBuffer,
      speech_models: ['universal-3-pro', 'universal-2'],
      language_codes: ['en', 'es'],
      speaker_labels: true,
      punctuate: true,
      keyterms: PLUMBING_KEYTERMS,
      prompt: 'The spoken language may change throughout the audio. Transcribe in the original language mix, preserving words in the language they are spoken.',
    })
    return this.normalize(transcript)
  }
}
```

**Standard `TranscriptionResult` (shared type — provider-agnostic):**
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

**PLUMBING_KEYTERMS:**
```typescript
const PLUMBING_KEYTERMS = [
  'hydrojetting', 'hydrojet', 'snaking', 'camera inspection', 'sewer scope',
  'mainline', 'cleanout', 'p-trap', 'auger', 'rooter', 'backflow',
  'tankless water heater', 'anode rod', 'pressure relief valve',
  'water softener', 'filtration system', 'service agreement', 'maintenance plan',
  'inspección de cámara', 'limpieza de alcantarilla', 'calentador de agua',
  'plan de mantenimiento', 'acuerdo de servicio',
]
```

### 7.3 Scoring Engine — Prompt Engineering

The system prompt is the most critical piece of engineering in the product. It encodes Kova's domain expertise about what makes a profitable, ethical drain/plumbing service call. It is versioned (`packages/scoring/prompts/v1/`) and A/B testable — the same call can be re-scored with a different prompt version.

Prompt structure:
```
[ROLE — ~50 words]
You are Kova's call scoring engine. Analyze transcripts of plumbing and drain
service calls to assess technician performance and identify estimated missed
service opportunities.

[TRADE CONTEXT — ~300 words]
Detailed explanation of drain and plumbing service call economics, what signals
mean what, when specific offers are appropriate, what constitutes a professional
diagnosis, etc.

[SCORING RUBRIC — ~400 words]
Per-dimension definitions with 0/1/2/3 scoring criteria and examples.

[CONTEXTUAL SUPPRESSION RULES — ~150 words]
When NOT to flag opportunities. Emergency context. Customer financial distress.
Short calls. Repeat declines.

[ETHICS GUARDRAILS — ~100 words]
Over-recommendation detection. Pressure indicators. Premature offer patterns.
Kova's estimated opportunity data is provided to identify genuine service value —
not to pressure techs into recommending services customers do not need.

[OUTPUT SCHEMA — ~150 words]
Exact JSON structure with field descriptions. Temperature = 0. Must be parseable
JSON matching the Zod schema.
```

### 7.4 API Design

REST (not GraphQL — simpler, easier to debug, sufficient for Phase 1 data patterns).

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
  GET  /api/pricebook              List pricebook items
  POST /api/pricebook              Create item
  PUT  /api/pricebook/:id          Update item
  DELETE /api/pricebook/:id        Deactivate item
  POST /api/pricebook/import       CSV import (multipart)

Dashboard
  GET  /api/dashboard/summary      Weekly numbers, top opportunity types, trends
  GET  /api/dashboard/team         Per-tech performance table
  GET  /api/dashboard/compliance   Recording compliance rates + gaps

Coaching
  POST /api/coaching/:callId/notes  Add manager coaching note
  PUT  /api/coaching/:pointId/review  Mark coaching point reviewed

Notifications
  POST /api/notifications/register  Register FCM device token
  GET  /api/notifications           List unread notifications

Billing (Stripe)
  POST /api/billing/checkout        Create Stripe checkout session
  POST /api/billing/portal          Create Stripe billing portal session
  POST /api/webhooks/stripe         Handle Stripe webhook events

Users & Teams
  GET  /api/team                   List team members
  POST /api/team/invite            Send tech invite SMS
  PUT  /api/team/:userId/role      Update role
  DELETE /api/team/:userId         Remove from company

Admin (internal)
  GET  /api/admin/health           Pipeline health, recording rates, error rates
  GET  /api/admin/case-study/:id   Design partner case study data export
  GET  /api/admin/activation       Activation health per company
```

All endpoints protected by Clerk JWT middleware except `/api/webhooks/*`.

---

## 8. Weekly Sprint Plan

12-week plan for a solo founder. The test for "done" each week: the deliverable works end-to-end, not just as a stub. No feature is "done" until it runs on real data.

### Week 1 — Infrastructure & Scaffolding

**Goal:** Everything compiles, connects, and deploys. Zero features, but the full stack is wired up.

**Deliverables:**
- Monorepo initialized (`pnpm` workspaces + Turborepo)
- `apps/web` — Next.js 15 with Tailwind + shadcn/ui, Clerk middleware, deployed to Vercel
- `apps/mobile` — React Native bare project with `@clerk/clerk-expo`, basic tab navigator
- `packages/db` — Drizzle schema skeleton, Neon connection, first migration runs
- `worker/` — BullMQ worker initialized, Railway project + Redis add-on provisioned, worker deploys and processes a test job
- AWS S3 bucket created, IAM user, presigned URL generation confirmed working
- Clerk: phone OTP enabled, Organizations enabled, custom roles defined
- Stripe: products/prices configured, test checkout session works
- `.env` schema documented — every variable named and described
- GitHub repo + CI: `pnpm lint && pnpm typecheck && pnpm test` runs on every PR
- `design_partner_snapshots` and `activation_events` tables in schema from Day 1
- `processing_costs` table in schema (cost tracking from the first call)

**Action items (not code):**
- Contact Drain Right admin: get ST developer credentials created (developer.servicetitan.io → Login → Create App → share Client ID + Secret). This is not a launch blocker but it means Phase 2 ST work can start immediately at Month 3.
- Schedule CA privacy attorney consultation (target: Week 3)
- Begin Drain Right phone audit: how many techs on iOS vs. Android

---

### Week 2 — Database Schema & Auth

**Goal:** Users can create accounts and sign in on both web and mobile. The full data schema exists.

**Deliverables:**
- Full Drizzle schema written and migrated (all tables from §4.5)
- Owner web sign-up: email/password + Google SSO, company/org created, user record written via Clerk webhook
- Tech mobile sign-in: phone number → SMS OTP, session established
- Role-based access: Clerk Organization roles map to Kova roles; middleware enforces role checks
- Seed script: test company, 3 techs, 1 manager, basic pricebook items
- Neon branching: `main` (production), `staging`, `dev` (development), `test` (CI)
- Drizzle migrations run in CI before tests

---

### Week 3 — Recording Engine (Mobile)

**Goal:** A technician can record a call on both iOS and Android. The file lands in S3 and a processing job is enqueued. No analysis yet — just the recording pipeline end-to-end.

**Deliverables:**
- `react-native-audio-api` integrated and recording working on iOS simulator + real Android device
- **Background recording validation gate:** App backgrounded mid-recording → audio continues. Lock phone for 20 minutes → unlock → recording uninterrupted. Must pass on at least one real iOS and one real Android device before Week 4 begins. If it fails, halt and fix before proceeding.
- Consent modal: full-screen, "Customer Consented" / "Customer Declined" flows, consent timestamp logged
- Audible tone on recording start
- Recording rotation: new chunk every 5 minutes, stored in local FS queue
- Battery management: indicator, warning at 20%, auto-pause at 15%
- Offline queue: upload on wifi, retry on failure, queue visible in app
- S3 presigned URL flow: mobile → Vercel presign → S3 → upload-complete → BullMQ enqueued
- Call record created in Neon with status `uploaded`
- Manual job tagging screen: customer name, job type, notes
- Non-recording reason capture
- Android foreground service notification visible during recording

**CA privacy attorney consultation target: this week.**

---

### Week 4 — Transcription Pipeline

**Goal:** Uploaded audio is transcribed within 5 minutes. Quality assessment works. Transcript stored in Neon.

**Deliverables:**
- `TranscriptionProvider` interface implemented
- `DeepgramProvider` implemented: Nova-3 Multilingual, diarization, keyterm prompting, normalized output
- `AssemblyAIProvider` stub implemented (same interface, ready for bakeoff at Week 8–9)
- Audio quality assessment: SNR, duration, silence ratio, clipping
- Per-language confidence tracking: average confidence per language segment logged
- WER gap flag: if Spanish confidence < English by > 15pp → "lower confidence" flag
- Transcript stored in `transcripts` as normalized JSONB
- Call status: `uploaded` → `transcribed`
- Unit tests: 10 synthetic transcripts (5 EN, 3 ES, 2 bilingual) through pipeline, output validated
- BullMQ Bull Board accessible at internal Railway URL
- `processing_costs` record written per call (provider, tokens, cost)

---

### Week 5 — Rules Engine

**Goal:** The rules layer runs on transcripts and correctly detects both Phase 1 opportunity types. Fully unit-tested.

**Deliverables:**
- `ScoringRule` interface implemented
- `CameraInspectionRule`: EN + ES keyword detection, offer detection, all edge cases covered
- `MaintenancePlanRule`: close-window detection, EN + ES offer keywords, all edge cases
- Contextual suppression: emergency + distress → suppress all opportunity flags
- Short call handling: < 8 minutes → limited scoring, suppress time-sensitive dimensions
- Unit test suite: 20 synthetic call scenarios per rule covering all edge cases
- Rules output stored as `RuleResult[]` before LLM layer runs

---

### Week 6 — LLM Layer & Score Assembly

**Goal:** Full scoring pipeline runs end-to-end. A recorded call produces a complete `ScoringResult`.

**Deliverables:**
- `LLMProvider` interface implemented
- `OpenAIProvider`: GPT-5.4-mini primary, GPT-5.4 fallback, structured output via JSON schema, temperature = 0
- System prompt v1 written for drain + plumbing (both trades required for Drain Right)
- Prompt tested on 10 synthetic transcripts; output validates against `LLMScoringOutput` Zod schema
- Confidence-based routing: if any dimension < 0.72, re-run low-confidence dimensions with GPT-5.4
- Score assembly: rules + LLM merged, weights applied, overall score calculated
- Pricebook lookup: opportunity types matched to pricebook items, dollar values attached
- Full `ScoringResult` written to `scores` + `opportunities` tables
- Call status: `transcribed` → `scored`
- End-to-end test: real recording → transcript → rules → LLM → score → stored in < 5 minutes
- Cost logged per call to `processing_costs` (tokens + cost)

---

### Week 7 — Post-Call Summary & Tech View

**Goal:** Tech records a call, within 5 minutes receives a push notification with their scored summary. Full tech view in mobile app.

**Deliverables:**
- FCM integration: `react-native-firebase` in mobile, `firebase-admin` in Railway worker
- Push notification after scoring: "Your call summary is ready"
- Post-call summary screen (mobile): score, opportunity total with footnote, per-opportunity list, clip playback, "Not Applicable" dispute button
- Clip playback: load audio from S3 presigned URL, seek to clip start, play 60-second window
- Dispute mechanism: reason selection → `opportunities.dispute_reason` written
- Confidence thresholds: < 0.85 not shown in tech view (manager-only)
- Personal call history: list of all tech's calls by date with score + opportunity total

---

### Week 8 — Owner Dashboard, Call Library & STT Bakeoff

**Goal:** Owner logs into the web dashboard and sees the week's numbers. STT bakeoff run against real (or high-quality synthetic) audio before production traffic commits to Deepgram.

**Deliverables:**
- Dashboard home screen (Next.js SSR): weekly opportunity total, trend, top 3 types, compliance rate, pricebook completion indicator
- Team performance table: per-tech row with avg score, avg opportunity/call, recording rate, trend
- Call review queue: auto-flagged calls surfaced for manager action
- Basic call library: list view with filters by tech + date range
- Call detail page: audio player, synchronized transcript, score breakdown, opportunity markers on waveform
- Manager coaching notes: text input on any call, stored in `coaching_points`
- Weekly digest email: React Email template, sent via Resend every Monday 7am (Vercel cron)
- **STT bakeoff:** Run 20–30 real or high-quality synthetic calls through both `DeepgramProvider` and `AssemblyAIProvider`. Evaluate: WER on noisy calls, WER on bilingual calls, cost per call, qualitative accuracy on trade vocabulary. Document results. If AssemblyAI is clearly superior or equal at half the cost, switch `TRANSCRIPTION_PROVIDER` before production traffic scales.

---

### Week 9 — Pricebook & Admin Controls

**Goal:** Owner can fully configure their pricebook. The dashboard shows accurate dollar figures from their actual prices.

**Deliverables:**
- Pricebook management UI: list, add/edit/delete, active/inactive toggle
- All three pricing models in UI and scoring engine: fixed, range, tiered
- LTV configuration: recurring flag, annual price, years → LTV in opportunity output
- Industry defaults pre-loaded for California drain + plumbing
- CSV import: template download, upload, preview, confirm, error display
- Pricebook completion indicator in dashboard + pricebook settings
- Default price tagging in opportunity outputs
- Admin settings skeleton: company profile, state selection (consent language), notification thresholds, recording target per tech
- Internal health endpoint: `/api/admin/health` — recording rate, processing pipeline status, job queue depth, error rates, per-company activation health

---

### Week 10 — Gamification, Full Billing & Churn Prevention

**Goal:** Full user loop working. All 6 churn prevention measures engineered. Annual billing live.

**Deliverables:**
- Streak tracking: calculated after each call, milestone pushes sent
- Personal bests: updated after each call
- Badges: Pioneer, First Call, Perfect Score, Consistent — all with automated award logic
- Badge display on tech profile screen
- Real-time threshold alerts: high opportunity push, tech not recorded in 3 days push

**Full billing and churn prevention:**
- Annual billing as default offer (2 months free = pay 10, get 12)
- Monthly billing as opt-in secondary
- Stripe Checkout: trial start, card capture
- Subscription webhook handler: `created/updated/deleted`, `invoice.payment_failed`
- Seat management: add/remove techs → Stripe subscription item updated
- Billing portal: Stripe Customer Portal
- Smart Retries enabled
- 7-day grace period on failed payment before service interruption
- Pre-dunning email at card expiry − 7 days (Stripe `customer.updated` webhook → Resend)
- In-app "payment failed" banner: `invoice.payment_failed` webhook → `company.payment_failed = true` → banner in web + mobile
- ACH/bank debit option: enabled in Stripe dashboard, presented in billing portal
- Visa/Mastercard Account Updater: enabled in Stripe Dashboard → Settings → Card updates (no code)

---

### Week 11 — Onboarding, Activation Sprint & End-to-End Polish

**Goal:** A brand-new owner can sign up and have their first scored call delivered in < 35 minutes. Drain Right can onboard without hand-holding. Activation sprint is live.

**Deliverables:**
- Full owner onboarding flow: account → team setup → pricebook → first recording CTA
- Tech onboarding: SMS invite → app install → phone OTP → intro screens → home screen
- "Pioneer" badge onboarding incentive: 3 calls in Week 1 → badge awarded
- Empty states: all dashboard views have clear empty state with next-step CTA
- Error handling: consistent error responses across all API routes; mobile handles network errors gracefully
- Loading states: all async operations have loading indicators
- Activation sprint automation:
  - Day 1 welcome email with setup checklist (Resend, triggered by Clerk webhook `organizationMembership.created`)
  - Day 7 check-in flag in `/api/admin/activation` when < 10 calls recorded
  - Day 14 urgency flag when < 10 calls total
  - Day 30 escalation flag when < 30 calls or recording rate < 40%
- Design partner case study export endpoint working: `/api/admin/case-study/:companyId`
- Activation health dashboard widget in internal admin view
- Cross-language score parity bias test (see §9.2)
- Drain Right pricebook configured with their actual prices

**End-to-end test run:** Solo founder performs full flow from account creation → team setup → pricebook → recording → scoring → dashboard review. Target: < 35 minutes total.

---

### Week 12 — Drain Right Pilot Prep & Launch

**Goal:** Drain Right is live. First calls are scored. Owner sees the number.

**Deliverables:**
- Drain Right account created, all 16+ techs invited, roles assigned
- Pricebook finalized with Drain Right's actual prices
- Tech kickoff: team meeting script provided to owner (framing: earning potential + documentation protection, not surveillance)
- Manager walkthrough: 1-hour session with Drain Right owner/manager covering dashboard, call review queue, pricebook
- Monitoring dashboard (internal): recording rate, processing pipeline health, queue depth, error rates — all visible before Day 1
- Recording compliance check: all 16+ techs have downloaded the app and completed onboarding
- First call scored and reviewed together with Drain Right owner
- Day 1 activation email sent automatically
- Week 1 check-in (Day 7) scheduled
- Bugs fixed as they surface in real usage

---

## 9. Infrastructure & DevOps

### 9.1 AWS Setup

```
S3:
  kova-audio-prod              Production audio
  kova-audio-dev               Development audio

IAM:
  kova-app-user                Programmatic access (S3 read/write, presign)
  Policies: S3:PutObject, S3:GetObject, S3:DeleteObject on kova-audio-*

S3 Bucket Policy:
  No public access; ACL disabled
  SSE-S3 encryption (AES-256)
  Lifecycle: Glacier Instant Retrieval at 90 days; expire at 365 days (configurable)
```

### 9.2 Environment Configuration

| Environment | Branch | Database | Services |
|---|---|---|---|
| `production` | `main` | Neon `main` | Live Clerk, live Stripe, live Deepgram, live OpenAI |
| `staging` | `staging` | Neon `staging` | Clerk test, Stripe test, live APIs with dev keys |
| `development` | feature branches | Neon `dev` | Clerk dev, Stripe test, live APIs with dev keys |

All secrets in environment variables — never committed. `.env.example` documents every variable.

**Required environment variables:**
```bash
# Database
DATABASE_URL=

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
TRANSCRIPTION_PROVIDER=deepgram    # deepgram | assemblyai
DEEPGRAM_API_KEY=
ASSEMBLYAI_API_KEY=                # needed for bakeoff in Week 8

# LLM
LLM_PRIMARY_PROVIDER=openai
LLM_PRIMARY_MODEL=gpt-5.4-mini
LLM_FALLBACK_PROVIDER=openai
LLM_FALLBACK_MODEL=gpt-5.4
LLM_CONFIDENCE_THRESHOLD=0.72
OPENAI_API_KEY=

# FSM
FSM_ADAPTER=manual                 # manual | servicetitan | jobber

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

# Queue
REDIS_URL=

# App
NEXT_PUBLIC_APP_URL=
```

### 9.3 CI/CD

**`ci.yml` (on every PR):**
```yaml
- pnpm install
- pnpm typecheck
- pnpm lint
- pnpm test
- pnpm db:migrate:test
```

**`deploy.yml` (on merge to main):**
```yaml
- Vercel CLI: vercel --prod
- Railway CLI: railway up
- Mobile: EAS Build (triggered manually for TestFlight/Play Store releases)
```

**Mobile CI:** TestFlight (iOS) and Play Store internal track (Android) updated weekly via EAS Build. OTA updates (JS bundle only) via EAS Update.

### 9.4 Monitoring

| What | Tool | Where |
|---|---|---|
| BullMQ job status | Bull Board UI | Railway internal URL |
| Processing pipeline errors | `pino` logs | Railway log viewer |
| API errors | Vercel Function logs | Vercel dashboard |
| Database performance | Neon dashboard | Neon console |
| Stripe events | Stripe dashboard | Stripe console |
| Recording rate, pipeline health | `/api/admin/health` | Custom (Week 9) |
| Activation health per company | `/api/admin/activation` | Custom (Week 11) |
| Processing costs per call | `processing_costs` table | Neon query |

Phase 2: Sentry for error tracking, Axiom for log aggregation.

### 9.5 Estimated Monthly Cost — Drain Right Pilot (640 calls/month)

| Service | Monthly Cost | Notes |
|---|---|---|
| Deepgram Nova-3 Multi (30-min avg, diarization) | ~$150 | Switch to AssemblyAI if bakeoff favors it (~$74/mo) |
| OpenAI GPT-5.4-mini + GPT-5.4 | ~$8–10 | Blended, ~10–15% fallback rate |
| Railway (worker + Redis) | ~$5 | Hobby plan |
| AWS S3 (10 GB + operations) | ~$0.50 | |
| Vercel | $0–20 | Hobby or Pro |
| Neon (PostgreSQL) | $0 | Free tier |
| Clerk (auth) | $0 | Free tier |
| Firebase (FCM) | $0 | Free |
| Resend (email) | $0 | Free tier (3K emails/month) |
| **Total** | **~$165–190/mo** | ~$75–115 if AssemblyAI bakeoff wins |

Drain Right on Starter (17 seats × $89) = **$1,513/month**. Infrastructure is ~11% of revenue from the first paying customer.

---

## 10. Phase 2 & Phase 3 Integration Scope

### 10.1 Phase 2 Overview (Months 3–6)

Triggered at Month 3 after 30+ days of Drain Right baseline data.

**Phase 2 additions:**
- ServiceTitan single-tenant integration for Drain Right (§10.2)
- Auto job matching: dispatched ST jobs linked to recorded calls
- Invoice matching: estimated opportunity vs. actual invoice (calibration)
- Pre-call intelligence: tech sees job context before recording starts
- Kova ROI Report: monthly report with cumulative ROI framing
- Hydrojet opportunity type
- Full call library: keyword search, clip sharing (expiring secure links)
- Leaderboard (team-facing)
- Full badge set
- Spanish mobile UI
- Auto-record on arrival (geofence trigger)
- AssemblyAI as primary transcription if bakeoff result warrants it
- Expand to 3–5 additional design partners

### 10.2 ServiceTitan Integration — Single-Tenant (Phase 2)

**Access model:** Drain Right's admin provisions credentials directly at developer.servicetitan.io. No ST partner application or marketplace approval required for single-tenant direct access. This is available to start immediately.

**OAuth 2.0 machine-to-machine flow:**
```
Drain Right admin:
  1. Logs in at developer.servicetitan.io with ST credentials
  2. Creates an app → generates App Key
  3. In ST Settings → Integrations → API Application Access
  4. Connects the app → generates Client ID + Client Secret
  5. Shares Client ID + Client Secret with Kova

Kova:
  SERVICETITAN_TENANT_ID=<drain_right_tenant_id>
  SERVICETITAN_CLIENT_ID=<from_drain_right_admin>
  SERVICETITAN_CLIENT_SECRET=<from_drain_right_admin>
  FSM_ADAPTER=servicetitan
```

Stored per-company in `companies.fsm_config` (encrypted JSONB).

**ST API scope for Phase 2:**
- `Jobs` endpoint: fetch scheduled jobs by tech and date → pre-populate manual job tagging
- `Invoices` endpoint: fetch invoice line items by job → invoice matching calibration
- `Technicians` endpoint: sync tech roster with Kova user list
- `Pricebook` endpoint: optionally sync ST pricebook items to Kova pricebook

**ST multi-tenant / marketplace:** When Kova has multiple ST customers, a ST Marketplace listing enables self-serve connection via OAuth. This requires a ST partner application. Submit at Month 3 alongside the Phase 2 build. The 2–6 month approval timeline means marketplace listing arrives around Month 6–9.

### 10.3 ServiceTitan Competitive Positioning

Do not position Kova as a Field Pro competitor in any ST partner application or marketplace context. Correct positioning: "complementary to Field Pro — serves ST customers who haven't activated coaching features, and provides call-level intelligence that Field Pro does not offer." This is both accurate and strategically safe.

### 10.4 Phase 3 Overview (Months 6–12)

**Phase 3 additions:**
- Jobber GraphQL integration (self-serve, first post-Drain-Right FSM)
- HCP integration
- Multi-location support (Team tier)
- PE sales motion: portfolio-level reporting, multi-company dashboards
- Water heater, whole-home walkthrough, filtration opportunity types
- SOC 2 process begins (Month 9)
- Custom scoring weight configuration (Team tier)

### 10.5 Jobber Integration — Phase 3

**Access model:** Self-serve. Create a developer account at developer.getjobber.com (90-day testing account). Build the GraphQL integration against the dev account before any customer connects.

**Jobber GraphQL data model — maps to Kova domain:**
- `Job` (with `visits`, `invoices`, `lineItems`) → dispatched jobs
- `Invoice` (with `lineItems`, `amounts`) → invoice matching
- `Visit` (with `startAt`, `endAt`, `assignedUsers`) → pre-call context, arrival-based triggers
- `ProductOrService` (with `defaultUnitCost`) → pricebook sync

**OAuth 2.0 flow:** Standard authorization code flow. Jobber admin installs Kova app from Jobber App Marketplace → authorizes scopes → Kova stores access token per company. When Kova is listed on the Jobber App Marketplace, any Jobber customer can self-serve connect.

---

## 11. Pre-Launch Checklist

All items must be complete before Drain Right goes live. **[BLOCKER]** items must be complete before any recording is made.

### Legal & Compliance

- [ ] **[BLOCKER]** CA privacy attorney consultation — validate consent popup flow against Cal. Penal Code §632 and CCPA. Confirm: (a) tech verbal disclosure + popup is sufficient for two-party consent, (b) CCPA notice requirement satisfied, (c) timestamp log in Neon satisfies compliance record. (~$300–500 for 1-hour consultation, target Week 3)
- [ ] **[BLOCKER]** Confirm whether Deepgram diarization creates voiceprints (speaker labels ≠ voiceprints — confirm this distinction with CA attorney). If voiceprints are created, Illinois BIPA compliance required for IL customers before launch.
- [ ] Remove all "hiring/firing decisions" language from codebase, dashboards, and email templates. Replace with "performance insights to inform coaching conversations and development planning." (Required per product-strategy-v1.md §3.10, NYC LL 144 compliance.)
- [ ] Confirm "estimated opportunity" language is used consistently throughout the product — not "missed revenue." product-plan-v3 stale language does not appear in any user-facing surface.
- [ ] Audit Drain Right's existing recording/consent policy — coordinate so Kova's in-app disclosure doesn't conflict.
- [ ] ToS and Privacy Policy include acceptable use language: Kova estimated opportunity data is provided to identify genuine service value — using Kova data to pressure techs into recommending services customers do not need is a violation of Terms of Service.
- [ ] Begin ST Marketplace partner application (not a launch blocker — needed for Phase 2/3 multi-tenant ST distribution). Note: Drain Right direct access is self-serve and does not require this.

### Technical Validation

- [ ] **[BLOCKER]** Cross-language score parity bias test:
  - Run 20 English synthetic calls, 20 Spanish synthetic calls, 10 bilingual calls through full pipeline
  - Compare: average score per language, trigger detection rate, false positive rate
  - **Pass criteria: Spanish calls do not score more than 10 points lower than equivalent English calls on identical performance**
  - If test fails: do not deploy. Fix prompts, transcription model, or apply score normalization first.
- [ ] **[BLOCKER]** End-to-end latency validation: 10 test recordings from upload to push notification. All 10 must complete in < 5 minutes.
- [ ] **[BLOCKER]** Offline queue validation: record in airplane mode → enable wifi → confirm upload and processing complete without data loss.
- [ ] Background recording validation: start recording → lock phone → wait 20 minutes → unlock → confirm uninterrupted on both iOS and Android.
- [ ] Battery impact test: record 60-minute call with battery monitoring; confirm < 30% consumed per hour on mid-range Android.
- [ ] Test on Drain Right's specific device models (confirm in Week 1 phone audit what they actually use).
- [ ] STT bakeoff complete (Week 8–9): Deepgram vs. AssemblyAI on real field audio. Decision documented. Provider set in production `.env`.

### Commercial Validation

- [ ] Annual billing confirmed as default in Stripe: checkout flow presents annual first, monthly as opt-in secondary.
- [ ] All 6 churn prevention measures active: Smart Retries, grace period, pre-dunning email, in-app payment failed banner, ACH option, Account Updater.
- [ ] Activation sprint automation live: Day 1 welcome email sends on account creation, `/api/admin/activation` shows health per company.

### Drain Right-Specific

- [ ] Drain Right phone audit complete: iOS vs. Android split confirmed. If > 30% Android, Android app is stable on their specific devices before launch.
- [ ] Drain Right ST credentials provisioned (admin creates app at developer.servicetitan.io, shares Client ID + Secret). Stored in Kova for Phase 2 — not needed for Phase 1 launch.
- [ ] Drain Right pricebook configured at actual prices. No industry defaults for their core services on Day 1.
- [ ] Pilot success criteria co-defined with Drain Right owner:
  - What dollar range of estimated opportunity in 30 days = success? (Target: $20K–$50K)
  - Agreed check-in cadence: Day 7, Day 14, Day 30
- [ ] Owner kickoff script prepared: team meeting script for introducing Kova (framing: earning potential + documentation protection, not surveillance).
- [ ] All 16+ techs have downloaded the app, signed in, and completed intro screens before go-live.
- [ ] Case study data collection confirmed: owner agrees to allow Kova to publish anonymized 30-day results for case study.

---

## 12. Risks & Solo Founder Constraints

### Critical Path

```
Week 3 (recording engine + background validation gate)
  → Week 4 (transcription)
  → Week 5 (rules engine)
  → Week 6 (LLM + score assembly)
  → Week 7 (tech view + push notification)
  → Week 8 (owner dashboard + STT bakeoff)
  → Week 11 (end-to-end pilot prep + activation sprint)
  → Week 12 (Drain Right live)
```

If the Week 3 background recording gate fails on Android, everything slips by the same amount. This is the single highest-risk technical task in the project.

### Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Background audio unreliable on Android | High | Critical | Week 3 background validation gate is a hard stop. Contingency: start Drain Right iOS-only for the first 2 weeks if Android isn't stable, then add Android. Losing 50% of techs temporarily is better than delaying the pilot. |
| LLM prompt insufficient for accurate scoring | Medium | High | Build the synthetic test suite in Week 6 before Drain Right goes live. If < 70% of test cases score correctly, prompt tuning takes priority over everything else. Do not launch with an inaccurate scoring engine. |
| Deepgram WER poor on real Drain Right field audio | Medium | High | Week 8–9 bakeoff with real calls. Provider-agnostic interface means switching is a config change. AssemblyAI is a ready alternative. |
| Opportunity dispute rate > 40% on any type | Medium | High | Start with only 2 opportunity types — highest confidence, lowest ambiguity. Monitor dispute rate weekly from Day 1. 40% dispute rate = pull the type immediately. |
| Tech adoption at Drain Right < 50% recording rate | High | Critical | Owner must mandate recording as job policy before launch. Provide team meeting script. Day-7 recording rate < 50% is a product-ending condition — escalate immediately, not in the next retrospective. |
| Early churn due to passive activation | Medium | High | Activation sprint automation (§5.14) addresses this. Day 7 and Day 14 flags catch low-engagement accounts before they churn silently. |
| ST marketplace approval delays Phase 2 multi-tenant growth | Low | Medium | Single-tenant direct access works for Drain Right and any individually managed ST customer. Marketplace listing is Phase 3, not Phase 2 critical path. |

### Scope Management — If You Fall Behind

**Cut in this order (least to most damage):**
1. **Cut first:** Gamification (streaks, badges) — soft launch without them. They don't affect the core hypothesis.
2. **Cut second:** Weekly digest email — manual export for the pilot.
3. **Cut third:** Stripe billing integration — extend the trial. Don't delay the pilot for billing.
4. **Cut fourth (only in emergency):** ACH and Account Updater — launch with Smart Retries + grace period only, add the rest in Week 13.
5. **Never cut:** Recording engine, transcription, scoring, pricebook, post-call summary, owner dashboard. These are the product.

### Non-Negotiable Quality Bars

These cannot be released with known issues:
- **Consent logging:** Every recording must have a timestamped consent event in Neon. No exception. Legal requirement and core ethical differentiation.
- **No data loss:** The offline queue must never lose an audio file. Test failure modes explicitly — mid-upload network loss, app crash during recording, device restart with pending uploads.
- **Cross-language parity:** Do not launch if the bias test fails. Systematically scoring Spanish-speaking techs lower due to transcription quality is both ethically wrong and legally exposed.
- **Opportunity accuracy:** Dispute rate > 40% on any type = pull the type. A product that feels wrong to the people receiving it will be ignored and will churn.
- **Annual billing as default:** The product ships with annual as the primary offer. Do not flip this to monthly for simplicity. The churn math is the business model.

---

## 13. Open Decisions

Items that need a decision before or during Phase 1.

### Before Phase 1 Kickoff

| Decision | Options | Deadline | Owner |
|---|---|---|---|
| React Native approach | Bare RN CLI vs. Expo bare workflow with custom dev client. Expo simplifies EAS Build and OTA updates but adds native module setup complexity. | Week 1 | Engineering |
| Score dispute authority | When tech disputes and manager disagrees — who has final authority? Option A: manager can override the dispute. Option B: tech dispute is accepted; manager adds coaching note but flag stays hidden from tech view. | Week 5 | Product |
| Over-recommendation flag consequences | Is an over-recommendation flag surfaced to owner, manager-only, or both? Does it affect overall score or route to manager review only? | Week 6 | Product |

### Before Phase 2 Kickoff

| Decision | Options | Deadline | Owner |
|---|---|---|---|
| STT final provider | Resolved after Week 8–9 bakeoff | Week 9 | Engineering |
| ST marketplace partner application positioning | Do not position as Field Pro competitor. Framing: "complementary to Field Pro — serves ST customers who haven't activated coaching features." Confirm before application is submitted. | Month 3 | Founder |
| Annual billing opt-out threshold | What happens if a new customer specifically requests monthly? Offer it but upsell annual on the next billing cycle, or hard-require annual for first 3 months? | Week 10 | Founder |

### External Dependencies to Track

| Item | Status | Follow-up |
|---|---|---|
| Drain Right ST credentials provisioned | Action in Week 1 — Drain Right admin creates app at developer.servicetitan.io | One-time action; no approval timeline |
| ST Marketplace partner application | Submit at Month 3 | 2–6 month process; needed for multi-tenant ST distribution in Phase 3 |
| CA privacy attorney consultation | Schedule Week 1, complete Week 3 | Required before first recording |
| Drain Right device audit | Complete Week 1 | Determines Android testing urgency |
| Drain Right pricebook data | Collect Week 11 | Required before launch |
| NYC LL 144 applicability | Assess when first NYC customer signs up | Not a Phase 1 blocker |
| Illinois BIPA (voiceprint determination) | Confirm with CA attorney whether Deepgram diarization creates voiceprints | Before Phase 1 launch |
| Jobber App Marketplace listing | Submit at Month 6 | Needed for self-serve Jobber connections in Phase 3 |

---

*Document version: v2*
*Status: Living document — update prior to each phase kickoff*
*Date: May 2026*
*Supersedes: development-plan-v1.md*
*Phase 2 kickoff: update at Month 3 to incorporate ST single-tenant integration, pre-call intelligence, invoice matching, ROI report, and Hydrojet opportunity type*
*See `docs/product/product-brief-v1.md` for full product requirements*
*See `docs/product/product-strategy-v1.md` for risk register, legal compliance details, and competitive defense strategy*
