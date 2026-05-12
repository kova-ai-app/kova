# Kova Development Plan — MVP

# Phase 1: Foundation (Weeks 1–12), Drain Right Pilot

*Status: Living document — update prior to each sprint kickoff*
*Supersedes: development-plan-v2, development-plan-web-v2, development-plan-mobile-v2*
*Product source of truth: product-plan-v3.md*

---

## 0. MVP Scope Definition

### What This Plan Builds

A working revenue intelligence product for Drain Right's 16+ technicians: a mobile app that records service calls, a backend pipeline that transcribes and scores them with trade-specific AI, and a web dashboard where the owner sees exactly how much money the team left on the table — per call, per tech, every week.

### What's In

| Feature | Why |
|---|---|
| Recording engine (background, chunked, offline-first, tus upload) | Core product — techs record in the field |
| AI scoring pipeline (rules + LLM, 6 drain + 5 plumbing dimensions) | Core product — the score IS the product |
| Full bilingual support (EN + ES) | Drain Right has bilingual techs |
| Pricebook (manual entry + industry defaults) | Powers the dollar output |
| Call list + call detail (score, transcript, audio, opportunities) | Both mobile and web |
| Dashboard hero number (weekly missed revenue) | Owner needs to see "the number" |
| Admin coaching notes + dispute | Owner/manager gives feedback on calls |
| Consent flow (offline-first) | Legal requirement (CA two-party) |
| Push notifications (call ready) | Tech needs to know when scores land |
| Auth (Clerk — phone OTP for techs, email/SSO for owners) | Required |

### What's Cut

| Feature | Reason | Phase |
|---|---|---|
| Gamification (badges, streaks, leaderboard, personal bests) | Not needed to validate core hypothesis | 2 |
| Billing (Stripe checkout, portal, seat management) | Free pilot — add post-validation | 2 |
| Compliance dashboard | Just track recording rate in call list | 2 |
| Weekly digest email | Manual founder outreach instead | 2 |
| Activation sprint automation | Manual founder outreach | 2 |
| Design partner snapshots / case study export | Manual data pull from Neon | 2 |
| Pricebook CSV import | Manual entry for one company | 2 |
| Tiered pricing (Good/Better/Best) | Fixed + range covers Drain Right | 2 |
| Call review queue (auto-flagging) | Owner scrolls the call list for 16 techs | 2 |
| Team performance table | Simplified — call list with tech filter | 2 |
| App version forcing | Controlled pilot via TestFlight | 2 |
| Non-recording reason capture | Nice data, not hypothesis-critical | 2 |
| Rate limiting | 16 techs won't DDoS the API | 2 |
| Audio quality assessment | Score everything; flag bad audio manually | 2 |
| LLM fallback routing (confidence → GPT-5.4) | Single model (GPT-5.4-mini) sufficient | 2 |
| AssemblyAI stub / STT bakeoff | Commit to Deepgram, abstract later | 2 |
| VU meter (AudioContext AnalyserNode) | Pulsing dot indicator instead | 2 |
| Bluetooth audio routing | Let OS handle mic selection | 2 |
| Battery auto-pause at 15% | Show level, trust the tech | 2 |
| Intro screens (3-screen onboarding) | In-person pilot walkthrough | 2 |
| Provider interfaces (Transcription/LLM) | Direct integration, abstract later | 2 |
| Emails (Resend — digest, activation, pre-dunning) | All email cut from MVP | 2 |
| Configurable notification settings | Hardcode thresholds | 2 |

### Success Metrics (from product-plan-v3)

| Metric | Target |
|---|---|
| Missed revenue identified (Drain Right, 30 days) | $20K–$50K |
| Owner credibility rating | ≥ 8/10 |
| Recording rate | ≥ 80% |
| Post-call summary open rate | ≥ 70% |
| Time to first scored call | < 35 minutes |

### North Star

"Do owners believe the missed revenue numbers are real — and does seeing them change technician behavior?"

---

## 1. Architecture

### 1.1 High-Level Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                       MOBILE APP (React Native)                      │
│  ┌──────────────┐  ┌─────────────────┐  ┌────────────────────────┐  │
│  │  Recording    │  │  Offline Queue  │  │   Call List + Detail   │  │
│  │  Engine       │  │  (MMKV + FS)    │  │   (score, transcript)  │  │
│  └──────┬────────┘  └────────┬────────┘  └────────────────────────┘  │
└─────────┼────────────────────┼───────────────────────────────────────┘
          │ AAC-LC chunks       │ tus upload when online
          ▼                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      VERCEL (Next.js 15)                             │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Dashboard UI   │  /api/calls/upload  │  /api/upload-complete │    │
│  │  (SSR/RSC)      │  (tus endpoint)     │  (enqueues BullMQ)   │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────┬────────────────────────┬─────────────────────────────────────┘
       │ store audio chunks      │ BullMQ job via Railway Redis
       ▼                         ▼
┌────────────┐          ┌──────────────────────────────────────────────┐
│  AWS S3    │          │  RAILWAY (Node.js Worker)                    │
│  (audio)   │◄─────────│                                              │
│            │  fetch   │  BullMQ Worker                               │
└────────────┘          │  ┌────────────────────────────────────────┐  │
                        │  │ 1. Download audio from S3              │  │
                        │  │ 2. Deepgram Nova-3 transcription       │  │
                        │  │ 3. Rules engine (EN + ES)              │  │
                        │  │ 4. OpenAI GPT-5.4-mini analysis        │  │
                        │  │ 5. Score assembly + pricebook lookup   │  │
                        │  │ 6. Write results to Neon               │  │
                        │  │ 7. Push notification via Expo Push     │  │
                        │  └────────────────────────────────────────┘  │
                        └──────────────────────────────────────────────┘
                                          │
                                          ▼
                               ┌──────────────────┐
                               │  Neon (Postgres)  │
                               │  Free tier        │
                               └──────────────────┘
```

### 1.2 Monorepo Structure

pnpm workspaces + Turborepo:

```
kova/
├── apps/
│   ├── mobile/               ← React Native (Expo SDK 55)
│   └── web/                  ← Next.js 15 dashboard + API routes
├── packages/
│   ├── db/                   ← Drizzle schema, migrations, seed
│   └── shared/               ← Zod schemas, TypeScript types
├── worker/                   ← BullMQ worker (scoring pipeline)
├── docs/
├── pnpm-workspace.yaml
└── turbo.json
```

`packages/shared` is the type contract. `Call`, `Score`, `Opportunity`, `PricebookItem`, `ScoringResult` — same types used in mobile, web, and worker.

**Intentionally omitted for MVP:**
- `packages/scoring` — scoring logic lives directly in `worker/`
- `packages/providers` — direct Deepgram/OpenAI calls, no abstraction layer

---

## 2. Tech Stack

### 2.1 Mobile

| Library | Version | Purpose |
|---|---|---|
| `expo` | SDK 55 | Development build (not Expo Go) |
| `react-native` | 0.83 | Ships with SDK 55 |
| `react` | 19.2 | Ships with SDK 55 |
| `react-native-audio-api` | 0.12.1 | Background recording, chunk rotation |
| `react-native-mmkv` | 4.3.1 | Queue state persistence (survives crashes) |
| `react-native-nitro-modules` | ≥ 0.20 | Peer dep of mmkv v4 |
| `tus-js-client` | 4.3.1 | Resumable chunked upload |
| `expo-notifications` | 55.0.22 | Push notifications + Android foreground service |
| `@clerk/clerk-expo` | 2.19.31 | Phone OTP auth |
| `@sentry/react-native` | 8.11.0 | Crash reporting from Day 1 |
| `zustand` | 5.0.13 | UI state management |
| `@tanstack/react-query` | ≥ 5.x | Server state / API cache |
| `zod` | ≥ 3.x | Runtime schema validation |
| `react-native-fs` | ≥ 2.20 | Local chunk storage |
| `react-native-device-info` | 15.0.2 | Battery level, device model |
| `@react-native-community/netinfo` | 12.0.1 | Connectivity detection |
| `react-native-reanimated` | ≥ 3.x | Recording indicator animation |
| `@react-navigation/native` | 7.x | Navigation |
| `@react-navigation/native-stack` | 7.x | Stack navigator |
| `@react-navigation/bottom-tabs` | 7.x | Tab navigator |
| `react-native-safe-area-context` | ≥ 4.x | Safe area insets |
| `react-native-screens` | ≥ 3.x | Native screen optimization |

**New Architecture mandatory** — SDK 55 removes legacy arch entirely.

**Min OS:** iOS 15.1, Android API 29.

**Removed from prior plans:** `@notifee/react-native` (archived), `react-native-background-upload` (abandoned), `react-native-track-player` (commercial license), `@react-native-firebase/app+messaging` (replaced by expo-notifications).

### 2.2 Web

| Library | Version | Purpose |
|---|---|---|
| `next` | 15.x | App Router, pinned |
| `tailwindcss` | 4.x | CSS-based config (no `tailwind.config.js`) |
| `shadcn/ui` | per-component install | Radix-based components |
| `@clerk/nextjs` | latest | Auth, Organization middleware |
| `drizzle-orm` | ≥ 0.45 | Type-safe Postgres queries |
| `@neondatabase/serverless` | latest | HTTP-based Postgres for Vercel |
| `@tanstack/react-query` | ≥ 5.x | Client component data fetching |
| `zod` | ≥ 3.x | Request/response validation |
| `@aws-sdk/client-s3` | v3 | S3 presigned GET URLs (audio playback) + tus server writes |
| `bullmq` | ≥ 5.x | Job enqueue (type definitions) |
| `ioredis` | latest | Redis connection for BullMQ enqueue |
| `@sentry/nextjs` | latest | Error monitoring |

**shadcn/ui Phase 1 components:** button, card, table, dialog, form, input, select, tabs, toast, skeleton, alert, separator, dropdown-menu.

**Removed from prior plans:** `@upstash/redis` (use Railway Redis directly via ioredis), `@upstash/ratelimit` (not needed for 16 techs), `react-email` + `resend` (no emails in MVP), `stripe` (no billing).

### 2.3 Worker

| Library | Version | Purpose |
|---|---|---|
| `bullmq` | ≥ 5.x | Job queue processing |
| `ioredis` | latest | Redis connection |
| `@deepgram/sdk` | latest | Transcription (Nova-3 Multilingual) |
| `openai` | latest | LLM scoring (GPT-5.4-mini) |
| `@aws-sdk/client-s3` | v3 | Download audio from S3 |
| `drizzle-orm` | ≥ 0.45 | Write results to Neon |
| `@neondatabase/serverless` | latest | Postgres connection |
| `expo-server-sdk` | latest | Send push notifications via Expo |
| `zod` | ≥ 3.x | Validate LLM output |
| `pino` | latest | Structured logging |

### 2.4 Infrastructure Costs (Pilot)

| Service | Monthly | Tier | Notes |
|---|---|---|---|
| Neon | $0 | Free | 0.5 GB storage, sufficient for pilot |
| Vercel | $0 | Hobby | No cron jobs needed |
| Clerk | $0 | Free | 10K MAU |
| Railway | ~$5 | Hobby | Worker + Redis |
| Firebase/FCM | $0 | Free | Via Expo Push Service |
| AWS S3 | ~$0.50 | Pay-as-you-go | ~10 GB audio |
| Deepgram | ~$100–150 | Usage | ~640 calls × 30 min avg |
| OpenAI | ~$8–10 | Usage | GPT-5.4-mini |
| Sentry | $0 | Free | 5K errors/month |
| **Total** | **~$115–165/mo** | | Deepgram is ~90% of cost |

---

## 3. Database Schema

### 3.1 Tables (packages/db/schema.ts)

```
companies        id, name, plan, state, created_at

users            id, company_id, clerk_user_id, role, name, phone,
                 language_pref

calls            id, company_id, tech_id, session_id, recorded_at,
                 duration_sec, s3_key, transcript_id, score_id,
                 language, status, consent_logged_at, decline_reason

transcripts      id, call_id, segments (JSONB), language,
                 wer_confidence, provider, model

scores           id, call_id, overall_score, dimensions (JSONB),
                 opportunity_total_low, opportunity_total_high,
                 confidence_level, model_used, prompt_version

opportunities    id, score_id, type, triggered, offered,
                 pricebook_item_id, value_low, value_high, ltv_value,
                 clip_start_sec, clip_end_sec, is_default_price,
                 dispute_reason, disputed_at, confidence

pricebook_items  id, company_id, name, trade, opportunity_type,
                 pricing_model, price_fixed, price_low, price_high,
                 is_recurring, ltv_annual, ltv_years, is_default,
                 active

coaching_points  id, call_id, tech_id, text, clip_start_sec,
                 clip_end_sec, reviewed_at, manager_note

notifications    id, user_id, type, payload (JSONB), sent_at,
                 read_at, channel

jobs             id, company_id, tech_id, customer_name, job_type,
                 call_id

processing_costs id, call_id, provider, tokens_in, tokens_out,
                 cost_usd, created_at

audit_logs       id, company_id, user_id, action, target_type,
                 target_id, created_at
```

**Tables cut from MVP:** `badges`, `streaks`, `activation_events`, `design_partner_snapshots`, `locations` (single-location pilot).

### 3.2 Indexes

```sql
CREATE INDEX calls_company_recorded ON calls(company_id, recorded_at);
CREATE INDEX calls_tech ON calls(tech_id);
CREATE INDEX calls_status ON calls(status);
CREATE INDEX opportunities_score ON opportunities(score_id);
CREATE INDEX opportunities_disputed ON opportunities(disputed_at);
```

### 3.3 Multi-Tenancy

Every query includes `company_id` from the Clerk session. No cross-tenant data access by construction.

### 3.4 Neon Branching

| Environment | Branch | Use |
|---|---|---|
| production | `main` | Live pilot data |
| staging | `staging` | Pre-deploy testing |
| development | `dev` | Feature branches |
| CI | `test` | Automated tests |

---

## 4. Authentication & Authorization

### 4.1 Provider

Clerk. Free tier (10K MAU). Organizations enabled.

### 4.2 Auth Flows

**Mobile (techs):** Phone number → SMS OTP → 6-digit code → session. `@clerk/clerk-expo` handles token refresh automatically.

**Web (owners/managers):** Email/password + Google SSO → session. `@clerk/nextjs` middleware protects all routes except `/sign-in`, `/sign-up`, `/api/webhooks/*`.

### 4.3 Roles

Clerk Organization roles map to Kova roles:

| Clerk Role | Kova Role | Access |
|---|---|---|
| `org:owner` | Owner/Admin | All features, web + mobile |
| `org:admin` | Field Manager | All calls, coaching, web + mobile |
| `org:member` | Technician | Own calls only, mobile primary |

### 4.4 Role-Based Access (MVP)

| Resource | Technician | Manager | Owner |
|---|---|---|---|
| Record calls | Yes | Yes | Yes |
| View own calls + scores | Yes | Yes | Yes |
| View all team calls | — | Yes | Yes |
| Add coaching notes | — | Yes | Yes |
| Dispute opportunities | Own only | Any | Any |
| Manage team | — | — | Yes |
| Manage pricebook | — | — | Yes |
| View dashboard hero number | — | Yes | Yes |

### 4.5 Middleware

```typescript
// apps/web/src/middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
}
```

Public routes: `/sign-in`, `/sign-up`, `/api/webhooks/clerk`.

---

## 5. API Contract

REST (not GraphQL). All endpoints protected by Clerk JWT except `/api/webhooks/*`.

### 5.1 Audio Upload

**`POST /api/calls/consent`**

```typescript
// Request
{
  sessionId: string
  techId: string
  companyId: string
  consentedAt: string          // ISO8601 device timestamp
  devicePlatform: 'ios' | 'android'
}

// Response 200
{
  callId: string
  consentLoggedAt: string
}
```

**`POST /api/calls/decline`**

```typescript
// Request
{
  sessionId: string
  techId: string
  companyId: string
  declinedAt: string
  reason: 'customer_declined'
}

// Response 204
```

**`POST /api/calls/upload`** — tus-compatible endpoint

The tus protocol handles the full upload lifecycle. Mobile does not manage S3 directly; the server-side tus endpoint manages S3 writes.

**`POST /api/calls/upload-complete`**

```typescript
// Request
{
  callId: string
  sessionId: string
  s3Keys: string[]
  totalDurationSec: number
  chunkCount: number
  jobMetadata: {
    customerName?: string
    jobType: 'drain' | 'plumbing' | 'both'
    notes?: string
  } | null
  devicePlatform: 'ios' | 'android'
  audioFormat: 'aac-lc'
  audioBitrateKbps: 32
  audioChannels: 1
}

// Response 202
{
  callId: string
  status: 'processing'
}
```

### 5.2 Calls

**`GET /api/calls`** — paginated, company-scoped

```typescript
// Query: page, limit (default 20), techId?, status?

// Response
{
  calls: CallSummary[]
  nextPage: number | null
  total: number
}
```

**`GET /api/calls/:id`** — full call detail

```typescript
// Response
{
  call: Call
  transcript: Transcript
  score: Score
  opportunities: Opportunity[]
  coachingPoints: CoachingPoint[]
}
```

**`GET /api/calls/:id/audio`** — presigned S3 GET URL

```typescript
// Response
{
  url: string          // expires in 1 hour
  durationSec: number
}
```

**`POST /api/calls/:id/tag`** — job tagging

```typescript
// Request
{
  customerName?: string
  jobType: 'drain' | 'plumbing' | 'both'
  notes?: string
}

// Response 200
{ updated: true }
```

### 5.3 Dashboard

**`GET /api/dashboard/summary`** — cached 5 min via `unstable_cache`

```typescript
// Response
{
  opportunityTotalLow: number
  opportunityTotalHigh: number
  opportunityChangePct: number
  cumulativeTotal: number
  topOpportunityTypes: Array<{
    type: string
    totalValue: number
  }>
  pricebookCompletionPct: number
}
```

### 5.4 Scoring & Coaching

**`POST /api/opportunities/:id/dispute`**

```typescript
// Request
{
  reason: 'existing_service' | 'offered_declined' |
          'not_relevant' | 'affordability' | 'other'
  notes?: string
}

// Response 204
```

**`POST /api/coaching/:callId/notes`**

```typescript
// Request
{ text: string }

// Response 201
{ id: string; createdAt: string }
```

**`PUT /api/coaching/:pointId/review`**

```typescript
// Response 204
```

### 5.5 Pricebook

**`GET /api/pricebook`** — list all items (company-scoped)

**`POST /api/pricebook`** — create item

**`PUT /api/pricebook/:id`** — update item

**`DELETE /api/pricebook/:id`** — soft deactivate

```typescript
interface PricebookItemInput {
  name: string
  trade: 'drain' | 'plumbing' | 'both'
  opportunityType: OpportunityType
  pricingModel: 'fixed' | 'range'
  priceFixed?: number
  priceLow?: number
  priceHigh?: number
  isRecurring?: boolean
  ltvAnnual?: number
  ltvYears?: number
  active: boolean
}
```

### 5.6 Notifications

**`POST /api/notifications/register`**

```typescript
// Request
{ token: string; platform: 'ios' | 'android' }

// Response 200
```

**`GET /api/notifications`** — list with unread count

```typescript
// Response
{
  notifications: Notification[]
  unreadCount: number
}
```

### 5.7 Team

**`GET /api/team`** — list team members

**`POST /api/team/invite`** — send tech invite (SMS via Clerk)

**`PUT /api/team/:userId/role`** — update role

**`DELETE /api/team/:userId`** — remove from company

**`GET /api/team/me`** — current user profile + company info

```typescript
interface MeResponse {
  id: string
  name: string
  role: string
  companyId: string
  company: {
    name: string
    plan: string
  }
}
```

### 5.8 Webhooks

**`POST /api/webhooks/clerk`** — sync user/org events to Neon

Events: `organization.created`, `organizationMembership.created`, `organizationMembership.deleted`, `user.updated`.

Deduplication: upsert on `clerk_user_id` (no separate events table in MVP).

### 5.9 Error Response Shape

```typescript
interface APIError {
  error: string
  code: string
  status: number
}
```

### 5.10 Endpoints Cut from MVP

| Endpoint | Reason |
|---|---|
| `GET /api/calls/presign` | Replaced by tus endpoint |
| `POST /api/calls/:id/no-recording-reason` | Cut feature |
| `GET /api/dashboard/team` | Cut — use call list with tech filter |
| `GET /api/dashboard/compliance` | Cut feature |
| `POST /api/billing/*` | No billing in MVP |
| `POST /api/webhooks/stripe` | No billing in MVP |
| `/api/cron/*` | No cron jobs (Vercel Hobby) |
| `/api/admin/health` | Check DB directly |
| `/api/admin/case-study/*` | Cut feature |
| `/api/admin/activation` | Cut feature |

---

## 6. Mobile App

### 6.1 Navigation Structure

```
RootNavigator
├── AuthStack (no Clerk session)
│   ├── PhoneScreen
│   └── OTPScreen
└── AppStack (authenticated)
    └── BottomTabNavigator
        ├── HomeTab       → HomeScreen (call list + record button)
        │                   → RecordingScreen (modal)
        ├── HistoryTab    → CallHistoryScreen → CallDetailScreen
        └── SettingsTab   → SettingsScreen
```

**Modal screens** (over tabs):
- `ConsentModal` — before recording, blocks navigation
- `JobTaggingScreen` — after recording stops
- `DisputeModal` — from opportunity item in call detail

**Deep links:**
- `kova://call/:id` → `CallDetailScreen`
- `kova://home` → `HomeScreen`

### 6.2 Recording Engine

The highest-risk, most critical subsystem. Everything else depends on this working.

#### Audio Pipeline

```
Microphone input (hardware)
      │
      ▼
react-native-audio-api
  ├── AudioRecorder (proprietary class, NOT W3C MediaRecorder)
  │     ├── configure({ bitRate: 32000, sampleRate: 44100,
  │     │               channels: 1 })
  │     ├── startRecording(outputPath) → AAC-LC to file
  │     ├── Every 5 minutes → stop chunk, write to FS,
  │     │                      add to MMKV queue
  │     └── stopRecording() → finalize current chunk
  │
  └── Recording indicator: pulsing dot (no VU meter in MVP)

OS-level session management:
  iOS:  AVAudioSession.setCategory(.record)
        UIBackgroundModes: ['audio']
  Android: ForegroundService (foregroundServiceType: microphone)
           Persistent notification via expo-notifications
```

**Audio format:** AAC-LC, 32kbps, mono, 44.1kHz.

**File size:** ~14 MB/hour (32,000 bits/sec × 3,600 sec ÷ 8 = 14.4 MB/hr).

**Chunk naming:** `call_{sessionId}_chunk_{n}_{timestamp}.aac`

#### iOS Configuration

`Info.plist`:
```xml
<key>NSMicrophoneUsageDescription</key>
<string>Kova records service calls to help you track
performance and earn more.</string>
<key>UIBackgroundModes</key>
<array><string>audio</string></array>
```

AVAudioSession: category `.record`, mix with others enabled, interruption handling (phone call → PAUSED, call ends → auto-resume).

Request microphone permission at first launch, not just-in-time.

#### Android Configuration

`AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission
  android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />

<service android:name=".RecordingService"
  android:foregroundServiceType="microphone"
  android:exported="false" />
```

API 34+ runtime permission branching:
```typescript
async function requestRecordingPermissions() {
  if (Platform.OS === 'android' && Platform.Version >= 34) {
    const { status } = await requestPermission(
      'android.permission.FOREGROUND_SERVICE_MICROPHONE'
    )
    if (status !== 'granted') {
      throw new PermissionError(
        'FOREGROUND_SERVICE_MICROPHONE denied on API 34+'
      )
    }
  }
  const { status } = await requestPermission(
    'android.permission.RECORD_AUDIO'
  )
  if (status !== 'granted') {
    throw new PermissionError('RECORD_AUDIO permission denied')
  }
}
```

Foreground service notification:
```typescript
import * as Notifications from 'expo-notifications'

async function showRecordingNotification() {
  await Notifications.setNotificationChannelAsync('kova-recording', {
    name: 'Recording Status',
    importance: Notifications.AndroidImportance.LOW,
  })
  await Notifications.scheduleNotificationAsync({
    identifier: 'recording-active',
    content: {
      title: 'Kova — Recording Active',
      body: 'Recording in progress. Tap to return.',
      sticky: true,
      priority: 'low',
    },
    trigger: null,
  })
}

async function dismissRecordingNotification() {
  await Notifications.dismissNotificationAsync('recording-active')
}
```

**Edge-to-edge (Android 16+):** SDK 55 makes edge-to-edge mandatory. All screens must account for system bar insets via `react-native-safe-area-context`.

#### Recording State Machine

```
IDLE
  │ (tap Record — concurrent guard: fail if session active)
  │ (disk space check: fail if < 200 MB free)
  ▼
CONSENT_SHOWN
  │ "Customer Declined"          │ "Customer Consented"
  ▼                              ▼
IDLE (logged)            → Write consent to MMKV (device timestamp)
                         → Play tone
                         → Start AudioRecorder
                         → POST /api/calls/consent (background)
                         ▼
                      RECORDING
                         │ every 5 min → rotate chunk
                         │ phone call → PAUSED (auto-resume)
                         │ tap Pause → PAUSED
                         │ tap Stop ↓
                         ▼
                      STOPPED
                         → write final chunk
                         → show JobTaggingScreen
                         ▼
                      UPLOADING
                         → upload manager picks up queue
                         → all chunks uploaded → upload-complete
                         ▼
                      PENDING_ANALYSIS
                         → wait for push notification
                         ▼
                      COMPLETE

Upload failure:
  UPLOADING → retry (exponential backoff, max 5 attempts)
            → if max reached: UPLOAD_FAILED (manual retry button)
```

#### Battery Management (Simplified for MVP)

Poll every 60s via `react-native-device-info`. Show battery level on RecordingScreen. Warning overlay at 20%. No auto-pause in MVP (trust the tech).

#### Concurrent Recording Guard

```typescript
const existingSession = mmkvQueue.sessions
  .find(s => s.overallStatus === 'recording')
if (existingSession) {
  Alert.alert(
    'Recording Already Active',
    'Stop the current recording before starting a new one.',
    [{ text: 'OK' }]
  )
  return
}
```

On startup: if MMKV has `overallStatus: 'recording'` with no `recordingStoppedAt` → "Incomplete recording — resume or discard?"

#### Disk Space Check

200 MB minimum. Check on Record button tap before ConsentModal. `react-native-fs` `RNFS.getFSInfo()`.

### 6.3 Consent Flow

Full-screen modal, non-dismissable:

```
Before You Record

Please inform your customer:
"I'll be recording this appointment for
quality purposes — is that okay with you?"

┌──────────────────────────────────────┐
│ Customer Consented — Start Recording │
└──────────────────────────────────────┘

         Customer Declined
```

**"Customer Consented" (offline-first):**
1. Generate `callId` (UUID v4, client-side)
2. Write consent to MMKV immediately (device timestamp)
3. Play 1-second tone
4. Start recording
5. Background: attempt `POST /api/calls/consent` — if fails, add to `unsyncedConsentEvents` queue for retry with audio upload

**"Customer Declined":**
1. Attempt `POST /api/calls/decline`; if offline, queue
2. Return to HomeScreen

**Critical design choice:** Recording does not wait for server confirmation. The local MMKV write with device timestamp is the primary consent record. Server sync is required but non-blocking. This enables recording in offline conditions.

### 6.4 Offline Queue & Tus Upload

#### Design Principle

The offline queue is the **primary** data flow, not a fallback. Audio is always written locally first. Upload is always async. A tech in a basement with no signal records all day — everything uploads when they drive back to the shop.

#### MMKV Queue Schema

```typescript
interface UploadQueue {
  sessions: Record<string, QueuedSession>
  unsyncedConsentEvents: ConsentEvent[]
}

interface QueuedSession {
  sessionId: string
  callId: string              // client-generated UUID
  techId: string
  companyId: string
  consentLoggedAt: string     // device timestamp — never null
  consentSyncedAt: string | null
  recordingStartedAt: string
  recordingStoppedAt: string | null
  jobMetadata: JobMetadata | null
  chunks: PendingChunk[]
  overallStatus: 'recording' | 'stopped' | 'uploading' |
                 'complete' | 'failed'
}

interface PendingChunk {
  chunkId: string
  sessionId: string
  chunkIndex: number
  filePath: string
  sizeBytes: number
  durationSec: number
  createdAt: string
  uploadAttempts: number
  lastAttemptAt: string | null
  tusUploadUrl: string | null
  status: 'pending' | 'uploading' | 'uploaded' | 'failed'
}

interface ConsentEvent {
  callId: string
  sessionId: string
  techId: string
  companyId: string
  consentedAt: string         // device timestamp
  devicePlatform: 'ios' | 'android'
  synced: boolean
}
```

#### Upload Manager

```
Runs on: app open, connectivity change, recording stop

1. Read pending chunks + unsynced consent events from MMKV
2. Check connectivity (NetInfo)
   → offline: subscribe to connectivity event, exit
   → online: proceed
3. Sync unsynced consent events first (POST /api/calls/consent)
4. For each pending chunk (ordered by chunkIndex):
   a. Create or resume tus upload:
      - MMKV urlStorage has tusUploadUrl? → resume from last byte
      - No URL? → create new upload to POST /api/calls/upload
   b. tus-js-client handles retry internally
   c. Success: mark 'uploaded' in MMKV
   d. Failure (tus retries exhausted):
      → increment uploadAttempts
      → attempts < 5: schedule retry (30s, 2m, 10m, 30m, 2h)
      → attempts == 5: set 'failed', surface in UI
5. All chunks uploaded:
   a. POST /api/calls/upload-complete
   b. Remove chunks from MMKV
   c. Delete local chunk files
   d. Set status 'PENDING_ANALYSIS'
```

#### MMKV-Backed tus urlStorage

```typescript
import { MMKV } from 'react-native-mmkv'

const mmkv = new MMKV({ id: 'tus-url-storage' })

export const mmkvUrlStorage = {
  getItem: async (key: string) => mmkv.getString(key) ?? null,
  setItem: async (key: string, value: string) =>
    mmkv.set(key, value),
  removeItem: async (key: string) => mmkv.delete(key),
  getAllItems: async () => {
    const keys = mmkv.getAllKeys()
    return keys.map(key =>
      [key, mmkv.getString(key)] as [string, string])
  },
}
```

Required because React Native has no Web Storage API. Without this, tus-js-client cannot resume uploads after app is killed and reopened.

#### tus Upload Creation

```typescript
import { Upload } from 'tus-js-client'

function createChunkUpload(
  chunk: PendingChunk,
  authToken: string
): Upload {
  return new Upload(chunk.filePath, {
    endpoint: `${API_BASE_URL}/api/calls/upload`,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    urlStorage: mmkvUrlStorage,
    metadata: {
      chunkId: chunk.chunkId,
      sessionId: chunk.sessionId,
      chunkIndex: String(chunk.chunkIndex),
      contentType: 'audio/aac',
    },
    headers: { Authorization: `Bearer ${authToken}` },
    onProgress: (bytesUploaded, bytesTotal) => {
      updateUploadProgress(
        chunk.chunkId, bytesUploaded / bytesTotal
      )
    },
    onSuccess: () => {
      markChunkUploaded(chunk.chunkId)
    },
    onError: (error) => {
      Sentry.captureException(error,
        { extra: { chunkId: chunk.chunkId } })
      incrementUploadAttempts(chunk.chunkId)
    },
  })
}
```

#### Failure Modes

| Failure | Recovery |
|---|---|
| App crash during recording | MMKV shows active session → "Resume or discard?" |
| Consent sync fails (offline) | Retry on next connectivity event |
| tus retries exhausted | "Upload failed" + manual Retry button |
| Server 5xx | tus-js-client auto-retries per `retryDelays` |
| Chunk file missing from FS | Mark failed, continue with remaining chunks |
| MMKV corruption | Fall back to empty queue, FS reconciliation, Sentry alert |
| tus URL expired (410 Gone) | Create new upload for that chunk |
| Low storage mid-recording | Pause, show "Out of storage" alert |

### 6.5 Screens

**HomeScreen:**
- Call list (own calls for techs, all calls for admin/manager)
- Prominent record button (center bottom)
- Queue status widget: "2 calls pending upload" / "All caught up"

**CallDetailScreen:**
- Score (0–100, color-coded: green ≥ 70, yellow 50–69, red < 50)
- Opportunity cards with estimated dollar values
- Audio playback (react-native-audio-api, presigned S3 URL)
- Transcript with speaker labels, language badges (`[ES]`)
- Dispute button per opportunity
- Coaching notes (admin: add note form; tech: read-only)
- "Mark as Reviewed" per coaching point

**SettingsScreen:**
- Profile (name, phone)
- Notification toggle

**JobTaggingScreen (modal, post-recording):**
- Customer name (optional)
- Job type: drain / plumbing / both
- Notes (optional)
- "Save" → attach to call record

### 6.6 Push Notifications

**Setup:** `expo-notifications` handles FCM (Android) and APNs (iOS). Backend sends via Expo Push Service (free) — no `firebase-admin` needed.

**Registration:**
```
1. App opens → Notifications.requestPermissionsAsync()
2. Notifications.getExpoPushTokenAsync()
3. POST /api/notifications/register { token, platform }
4. On token refresh: re-register
```

**MVP notification types:**

| Type | Trigger | Priority |
|---|---|---|
| `call_ready` | Worker completes scoring | High |

**Deep link on tap:** `kova://call/{callId}` → CallDetailScreen.

**Foreground handling:**
```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})
```

---

## 7. Web Dashboard

### 7.1 Route Map

```
/                        → redirect to /dashboard or /sign-in
/sign-in                 → Clerk SignIn
/sign-up                 → Clerk SignUp (owner)
/dashboard               → Hero number + call list
/dashboard/calls         → Call library (filterable)
/dashboard/calls/:callId → Call detail (audio, transcript, score)
/dashboard/pricebook     → Pricebook management
/dashboard/settings      → Company settings, team management
```

**Cut routes:** `/onboarding/*` (manual setup), `/dashboard/team` (use call list with tech filter), `/dashboard/compliance`, `/dashboard/billing`, `/admin/*`.

### 7.2 Tailwind 4 Setup

`src/app/globals.css`:
```css
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.62 0.19 250);
  --color-brand-600: oklch(0.54 0.21 250);
  --font-sans: "Inter", system-ui, sans-serif;
  --radius: 0.5rem;
}
```

No `tailwind.config.js` — Tailwind 4 uses CSS-based config. Content detection is automatic.

### 7.3 Dashboard Home `/dashboard`

The product in one screen:

- **Pricebook completion banner** (if < 70% configured)
- **Hero number:** `$34,750 – $41,200` (weekly opportunity total, sum of undisputed opportunities, 7 days)
  - Week-over-week: `↑ 23%`
  - Cumulative: `Since you started: $142,800 identified`
- **Top 3 opportunity types** (ranked by dollar value)
- **Recent calls** (last 10, with score + opportunity total per call)

**Opportunity footnote:** Always visible — "Estimated based on your pricebook. Disputed items excluded."

**Empty state:** "No calls recorded yet. Ask your team to record their first call — results appear here within 5 minutes." CTA: "Add Team Members →"

**No charts** — text-based numbers + directional arrows. Recharts deferred to Phase 2.

### 7.4 Call Library `/dashboard/calls`

- Filters: Tech (dropdown), date range, job type, status (URL query params)
- Per row: tech name, date, job type, duration, score (color-coded), opportunity range, language
- Pagination: 20/page + "Load more"

### 7.5 Call Detail `/dashboard/calls/:callId`

Three sections:

**Audio Player:**
- HTML5 `<audio>` + `<progress>` bar
- Seek + speed controls (0.75×, 1×, 1.5×, 2×)
- Opportunity timestamp buttons (click to jump to relevant moment)

**Transcript:**
- Auto-scrolling synchronized with audio playback
- Speaker labels (Tech / Customer)
- Language badges: `[ES]` on Spanish-detected segments
- Click any segment to seek audio to that position

**Score + Feedback:**
- Overall score (0–100, color-coded)
- Per-dimension breakdown with reasoning text
- Opportunity cards: type, dollar range, clip timestamp
- Dispute button per opportunity (reason: `existing_service | offered_declined | not_relevant | affordability | other`)
- Coaching notes: textarea form for admin, read-only list for tech view
- "Mark as reviewed" per coaching point

### 7.6 Pricebook `/dashboard/pricebook`

- Completion indicator bar (% configured vs defaults)
- Table: name, trade, opportunity type, pricing model, price, status
- `(default)` badge on industry-average items
- Add/Edit modal: name, trade, opportunity type, pricing model (fixed | range), prices, recurring toggle, LTV inputs (annual price + years)
- Delete = soft deactivate

**Pre-seeded:** California drain + plumbing industry defaults. For Drain Right pilot: seed their actual prices directly in the database.

### 7.7 Settings `/dashboard/settings`

- Company: name, state (consent language)
- Team: list of techs (name, phone, role), add/remove

### 7.8 Empty States

| Page | Copy | CTA |
|---|---|---|
| Dashboard | "No calls recorded yet..." | "Add Team Members →" |
| Call Library | "No calls match your filters." | Reset filters |
| Pricebook | (Never empty — defaults loaded) | — |

### 7.9 Webhooks

**Clerk webhook** (`POST /api/webhooks/clerk`):
- `organization.created` → create `companies` record
- `organizationMembership.created` → create `users` record
- `organizationMembership.deleted` → deactivate user
- `user.updated` → sync name/metadata
- Deduplication: upsert on `clerk_user_id` (no separate events table in MVP)

---

## 8. Scoring Engine

### 8.1 Drain Scoring Model (from product-plan-v3)

**8 phases:**
1. Arrival & Rapport
2. Problem Intake
3. Diagnosis
4. Root Cause Explanation
5. Solution Presentation
6. Upsell Opportunities
7. Close
8. Follow-through (service agreement offer)

**6 dimensions (each 0–3 points):**

| Dimension | Criteria | Scoring Method |
|---|---|---|
| **Diagnosis Quality** | Root cause explained in plain language, recurrence risk discussed | LLM-evaluated + timing check |
| **Camera Inspection** | Triggers: recurrence, older home (pre-1980), prior visit. Offered+accepted(3) / offered+declined(2) / not offered(0). Not offered after trigger = auto missed revenue flag | Rules (keyword) + LLM (context) |
| **Hydrojet vs. Snaking** | Long-term vs short-term explained (yes/no); hydrojet presented as option even if snaking selected (yes/no). Full score requires both | Rules + LLM |
| **Maintenance Plan** | Mentioned(1pt), tied to customer pain(1pt), offered with specifics(1pt) | Rules (keywords) + LLM (quality) |
| **Customer Education** | Time spent before pricing. Price in first 2 min = flag | LLM + rules timing check |
| **Close Quality** | Options presented (good/better/best vs single quote), objection handling, close language quality | LLM |

### 8.2 Plumbing Scoring Model (from product-plan-v3)

**8 phases:**
1. Arrival & Rapport
2. Problem Intake
3. Diagnosis
4. Whole-Home Assessment
5. Solution Presentation
6. Upsell/Upgrade Discussion
7. Close
8. Follow-through

**5 dimensions (each 0–3 points):**

| Dimension | Criteria | Scoring Method |
|---|---|---|
| **Whole-Home Walkthrough** | Checked additional fixtures: full(3) / verbal offer(2) / no mention(0) | Rules + LLM |
| **Water Heater Opportunity** | Trigger: age >10yr, rust, slow recovery, hot water complaint. Trigger+qualified offer(3) / trigger+mentioned(2) / trigger missed(0) | Rules (keywords) + LLM |
| **Filtration/Softener** | Water quality triggered (yes/no), solution offered (yes/no) | Rules + LLM |
| **Fix vs. Improve Framing** | Upgrade path offered alongside repair | LLM-evaluated |
| **Service Agreement** | Offered at close(2pts), connected to customer's specific pain(1pt) | Rules + LLM |

### 8.3 Rules Layer

- `ScoringRule` interface per dimension
- EN + ES keyword detection for each trigger type
- Trigger phrases defined in both languages. Examples:
  - Camera: "keeps happening" / "sigue pasando," "third time" / "tercera vez"
  - Maintenance: "maintenance plan" / "plan de mantenimiento," "service agreement" / "acuerdo de servicio"
- Contextual suppression: emergency + distress signals → suppress all opportunity flags
- Short call handling: < 8 minutes → limited scoring, suppress time-sensitive dimensions

### 8.4 LLM Layer

- OpenAI GPT-5.4-mini (direct integration, no provider abstraction)
- Temperature = 0
- Structured output via JSON schema
- System prompt covers both drain and plumbing trades
- Prompted with bilingual context
- Output validated against `LLMScoringOutput` Zod schema
- Prompt tested on 10 synthetic transcripts before launch

### 8.5 Missed Revenue Engine

```
1. Signal detection: rules + LLM identify triggers
2. Opportunity mapping: trigger → opportunity type
   Drain:    Camera inspection, Hydrojet, Maintenance plan,
             Root cause explanation (qualitative, no dollar)
   Plumbing: Whole-home walkthrough, Water heater replacement,
             Filtration/softener, Fix vs improve (qualitative),
             Service agreement
3. Pricebook lookup:
   - Fixed price → exact
   - Range → midpoint displayed, range in detail
   - Recurring (LTV) → annual price × years
   - No owner price → industry default (tagged "(default)")
4. Dollar output per opportunity → call total →
   tech aggregate → company weekly total
```

### 8.6 Multi-Language Support

- Deepgram Nova-3 Multilingual auto-detects EN/ES per segment
- Scoring trigger phrases defined in both EN and ES
- LLM prompted with bilingual context
- Transcript shows language per segment (`[ES]` badge)
- Score output and coaching insights always in English
- WER gap flag: if Spanish confidence < English by > 15pp → "lower confidence" flag on that call

---

## 9. Processing Pipeline (Worker)

### 9.1 Job Flow

```
BullMQ job received (callId)
  │
  ├── 1. Download audio chunks from S3
  ├── 2. Concatenate chunks (if multiple)
  ├── 3. Deepgram Nova-3 Multilingual transcription
  │      - Diarization enabled
  │      - Keyterm prompting (trade vocabulary)
  │      - Per-language confidence tracking
  ├── 4. Rules engine scoring (all 11 dimensions, EN + ES)
  ├── 5. OpenAI GPT-5.4-mini analysis
  │      - Structured JSON output
  │      - Zod validation of output
  ├── 6. Score assembly: rules + LLM merged, weights applied
  ├── 7. Pricebook lookup: opportunity types → dollar values
  ├── 8. Write to Neon:
  │      - transcripts, scores, opportunities, coaching_points
  │      - processing_costs (provider, tokens, cost)
  │      - calls.status = 'scored'
  └── 9. Push notification via Expo Push Service
         → "Your call summary is ready"
```

### 9.2 Call Status Transitions

```
pending → processing → scored
                     → failed (retry up to 3x)
```

### 9.3 Target Latency

< 5 minutes from upload-complete to scored result + push notification.

---

## 10. Onboarding (Simplified for MVP)

No guided wizard. Manual setup for the pilot.

### Owner Onboarding

1. Owner visits web → sign up (email/password or Google SSO)
2. Clerk creates Organization → webhook → `companies` record
3. Owner lands on `/dashboard` (empty state)
4. Owner goes to `/dashboard/settings` → adds techs (name + phone)
5. Clerk sends SMS invite to each tech
6. Owner goes to `/dashboard/pricebook` → edits prices (or founder seeds Drain Right's prices directly)
7. Owner tells techs: "Download Kova, record your next call"

### Tech Onboarding

1. Tech receives SMS with download link
2. Downloads app, opens it
3. Phone OTP sign-in
4. Lands on HomeScreen (empty, record button prominent)
5. In-person walkthrough from owner/founder (no intro screens in MVP)

**Target:** First scored call < 35 minutes from account creation.

---

## 11. Sprint Plan (Weeks 1–12)

### Week 1 — Infrastructure & Scaffolding

**Goal:** Everything compiles, connects, and deploys. Zero features, but the full stack is wired up.

**Deliverables:**
- Monorepo initialized (pnpm workspaces + Turborepo)
- `apps/web` — Next.js 15 + Tailwind 4 + Clerk, deployed to Vercel
- `apps/mobile` — React Native + Expo SDK 55 + Clerk, basic tab navigator, builds on real device
- `packages/db` — Drizzle schema skeleton, Neon connection, first migration
- `worker/` — BullMQ worker initialized, Railway + Redis provisioned, test job processes
- AWS S3 bucket created, IAM user configured
- Clerk: phone OTP enabled, Organizations enabled, custom roles defined
- Sentry configured on both mobile and web
- GitHub repo + CI: `pnpm lint && pnpm typecheck && pnpm test`
- `.env.example` with every variable named and described

**Non-code:**
- Contact Drain Right admin for ST developer credentials (Phase 2 prep)
- Begin phone audit (iOS vs Android fleet)
- Schedule CA privacy attorney consultation (target: Week 3)

---

### Week 2 — Database Schema & Auth

**Goal:** Users can sign in on both web and mobile. Full schema exists.

**Deliverables:**
- Full Drizzle schema written and migrated (all MVP tables from §3)
- Owner web sign-up: email/password + Google SSO, company/org created, user record written via Clerk webhook
- Tech mobile sign-in: phone OTP, session established
- Role-based access middleware on all API routes
- Seed script: test company, 3 techs, 1 manager, basic pricebook items
- Neon branching: main, staging, dev, test
- Drizzle migrations run in CI before tests

---

### Week 3 — Recording Engine (CRITICAL GATE)

**Goal:** A tech can record a call on iOS and Android. Audio lands in S3 and a BullMQ job is enqueued. No analysis yet — just the recording pipeline end-to-end.

**Deliverables:**
- `react-native-audio-api` integrated and recording on real iOS + Android devices
- **Background recording validation gate:** App backgrounded → phone locked 20 minutes → unlock → recording uninterrupted. Must pass on at least one real iOS and one real Android device. **If it fails, halt everything and fix before Week 4.**
- Consent modal with offline-first MMKV write
- Audible tone on recording start
- 5-minute chunk rotation, stored in local FS queue
- Disk space check (200 MB min)
- Concurrent recording guard
- Offline queue: MMKV persistence, upload on connectivity
- Tus upload endpoint on Vercel (server-side S3 writes)
- `POST /api/calls/upload-complete` → BullMQ job enqueued
- Call record created in Neon with status `pending`
- Manual job tagging screen (customer name, job type, notes)
- Android foreground service notification visible during recording

**CA privacy attorney consultation target: this week.**

---

### Week 4 — Transcription Pipeline

**Goal:** Uploaded audio is transcribed within 5 minutes. Transcript stored in Neon.

**Deliverables:**
- Deepgram Nova-3 Multilingual integration (direct, no provider interface)
- Diarization, keyterm prompting, normalized output
- Per-language confidence tracking
- Transcript stored as JSONB in `transcripts`
- Call status: `pending` → `processing` → `transcribed`
- Unit tests: 10 synthetic transcripts (5 EN, 3 ES, 2 bilingual)
- `processing_costs` record written per call (provider, tokens, cost)
- Bull Board accessible at internal Railway URL

---

### Week 5 — Rules Engine

**Goal:** Rules layer runs on transcripts and detects all opportunity types for both drain and plumbing. Fully unit-tested.

**Deliverables:**
- Rule implementations for all 11 dimensions (6 drain, 5 plumbing)
- EN + ES keyword detection per rule
- Contextual suppression (emergency/distress)
- Short call handling (< 8 min)
- Unit tests: 20 synthetic scenarios per rule covering edge cases

---

### Week 6 — LLM Layer & Score Assembly

**Goal:** Full scoring pipeline runs end-to-end. A recorded call produces a complete ScoringResult.

**Deliverables:**
- OpenAI GPT-5.4-mini integration (direct)
- System prompt v1 for drain + plumbing (both trades for Drain Right)
- Structured JSON output validated against Zod schema
- Prompt tested on 10 synthetic transcripts
- Score assembly: rules + LLM merged, weights applied
- Pricebook lookup: opportunity types → dollar values
- Full ScoringResult written to scores + opportunities tables
- Call status: `transcribed` → `scored`
- E2E test: recording → transcript → score in < 5 minutes
- Cost logged to `processing_costs`

---

### Week 7 — Post-Call Summary & Push Notifications

**Goal:** Tech records a call, gets a push notification within 5 minutes, sees their scored summary.

**Deliverables:**
- Expo Push Service integration in worker
- Push notification: "Your call summary is ready"
- `POST /api/notifications/register` endpoint
- Mobile CallDetailScreen: score, opportunities, transcript, audio playback, dispute button
- Deep link from notification → CallDetailScreen
- Mobile HomeScreen: call list with scores + queue status widget
- Foreground notification handling

---

### Week 8 — Web Dashboard & Audio Player

**Goal:** Owner logs into the web dashboard and sees the week's numbers.

**Deliverables:**
- Dashboard home: hero number (weekly opportunity total), trend, top 3 types, recent calls
- Call library page with filters (tech, date, job type, status)
- Call detail page: HTML5 audio player + synchronized transcript + score breakdown + opportunity cards
- Coaching notes form (admin can add notes on any call)
- Dispute functionality on web (same as mobile)
- Empty states for all pages
- Pricebook completion banner

---

### Week 9 — Pricebook & Settings

**Goal:** Owner can configure their pricebook. Dashboard shows accurate dollar figures from actual prices.

**Deliverables:**
- Pricebook management UI: list, add/edit/deactivate
- Fixed + range pricing models in UI and scoring engine
- LTV configuration: recurring flag, annual price, years → LTV in opportunity output
- Industry defaults pre-loaded for California drain + plumbing
- Pricebook completion indicator in dashboard + pricebook page
- Default price tagging: `is_default: true` items show `(default)` badge
- Settings page: company profile, state selection, team management (add/remove techs)
- Seed Drain Right's actual prices

---

### Week 10 — Polish & Integration Testing

**Goal:** Full flow works end-to-end. All rough edges smoothed.

**Deliverables:**
- Mobile → web data flow validated end-to-end
- Full chain: consent → recording → upload → transcription → scoring → dashboard
- Push notifications working on both iOS and Android
- Error handling: network errors, upload failures, API errors handled gracefully
- Loading states on all async operations
- Cross-language score parity test: 20 EN + 20 ES + 10 bilingual calls — Spanish scores must not be > 10 points lower than English
- Performance test: 10 recordings, all scored < 5 minutes

---

### Week 11 — E2E Testing & App Store Submission

**Goal:** Ready for Drain Right. App Store submission started.

**Deliverables:**
- E2E onboarding test: account creation → team setup → pricebook → recording → scored summary in < 35 minutes
- Offline queue stress test:
  - 3 calls in airplane mode → wifi → all upload without data loss
  - Mid-upload kill → reopen → tus resumes from last checkpoint
  - 20-chunk queue processes correctly
- Background recording regression: 20-min test on real hardware (both platforms)
- Battery impact test: < 30% drain/hour on mid-range Android
- App Store submission (iOS) + Play Store internal track (Android)
- Fix bugs as they surface

---

### Week 12 — Drain Right Pilot Launch

**Goal:** Live. First calls are scored. Owner sees the number.

**Deliverables:**
- Drain Right account created, all 16+ techs invited, roles assigned
- Pricebook finalized with Drain Right's actual prices
- Tech kickoff: team meeting script provided to owner (framing: earning potential + documentation protection, not surveillance)
- Manager walkthrough: 1-hour session covering dashboard, call review, pricebook
- All techs have app installed and completed first recording
- First call scored and reviewed together with Drain Right owner
- Monitoring active: recording rate, pipeline health, error rates
- Bugs fixed as they surface in real usage

### Scope Cut Order (If Behind)

```
1. Cut first:  Pricebook UI — seed DB directly, edit via Neon console
2. Cut second: Web dashboard polish — owner uses mobile admin view
3. Cut third:  Job tagging — record without metadata
4. Never cut:  Recording → transcription → scoring → call detail.
               This IS the product.
```

---

## 12. Testing Strategy

### 12.1 Unit Tests

- Scoring rules: 20 synthetic scenarios per dimension (220 total)
- LLM output validation: 10 synthetic transcripts against Zod schema
- Transcription pipeline: 10 transcripts (5 EN, 3 ES, 2 bilingual)
- Drizzle query helpers (against Neon test branch)
- Clerk webhook handler (org/user events, upsert behavior)

Framework: Jest + `@testing-library/react-native` (mobile), Jest + `@testing-library/react` (web).

### 12.2 Device Testing Matrix

| Device | OS | Priority |
|---|---|---|
| iPhone 14 or 15 | iOS 17 | P0 |
| iPhone SE (3rd gen) | iOS 15.1 | P0 |
| Samsung Galaxy S-series | Android 14 (API 34) | P0 |
| Samsung Galaxy A-series (mid-range) | Android 11–12 | P0 |
| Pixel 6 or 7 | Android 13 | P1 |
| Drain Right fleet devices | Varies | P0 |

P0 = must pass before launch. P1 = test but not a launch blocker.

### 12.3 Validation Gates

| Gate | When | Criteria |
|---|---|---|
| Background recording | Week 3, Week 11 | 20 min backgrounded + locked, both platforms |
| E2E latency | Week 10 | 10 recordings, all scored < 5 min |
| Offline queue | Week 11 | 3 calls airplane → wifi → no data loss |
| Cross-language parity | Week 10 | Spanish scores not > 10 pts lower |
| Battery impact | Week 11 | < 30% drain/hour, mid-range Android |
| Onboarding time | Week 11 | Account → scored call < 35 min |

### 12.4 CI Pipeline

```yaml
# .github/workflows/ci.yml (on every PR)
- pnpm install
- pnpm typecheck
- pnpm lint
- pnpm test
- pnpm db:migrate:test
```

---

## 13. Deployment & Infrastructure

### 13.1 Environments

| Environment | Branch | Database |
|---|---|---|
| production | `main` | Neon `main` |
| staging | `staging` | Neon `staging` |
| development | feature branches | Neon `dev` |

All secrets in environment variables — never committed. `.env.example` documents every variable.

### 13.2 Deploy

- **Web:** Vercel auto-deploy on merge to `main`
- **Worker:** Railway deploy on merge to `main` (`railway up`)
- **Mobile:** EAS Build → TestFlight (iOS) + Play Store internal track (Android). OTA JS updates via EAS Update.

### 13.3 AWS S3

```
S3:
  kova-audio-prod          Production audio
  kova-audio-dev           Development audio

IAM:
  kova-app-user            S3 read/write
  Policies: S3:PutObject, S3:GetObject, S3:DeleteObject
            on kova-audio-*

Bucket policy:
  No public access, ACL disabled
  SSE-S3 encryption (AES-256)
  Lifecycle: Glacier Instant Retrieval at 90 days,
             expire at 365 days (configurable)
```

### 13.4 Monitoring

| What | Tool |
|---|---|
| BullMQ jobs | Bull Board (Railway internal URL) |
| Worker errors | pino logs (Railway log viewer) |
| API errors | Vercel Function logs |
| Database | Neon dashboard |
| Crashes (mobile + web) | Sentry (free tier) |
| Recording rate | Manual Neon query |

---

## 14. Environment Variables

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
DEEPGRAM_API_KEY=

# LLM
OPENAI_API_KEY=
LLM_MODEL=gpt-5.4-mini

# Queue (Railway Redis)
REDIS_URL=

# Push Notifications
EXPO_ACCESS_TOKEN=

# App
NEXT_PUBLIC_APP_URL=
API_BASE_URL=
```

---

## 15. Risk Table

| Risk | Prob | Impact | Mitigation |
|---|---|---|---|
| Background recording unreliable on Android | High | Critical | Week 3 hard gate. Contingency: iOS-only soft launch while Android is debugged. |
| expo-notifications + react-native-audio-api foreground service conflict | Medium | Critical | Validate explicitly Week 3. Fallback: install @notifee alongside expo-notifications temporarily. |
| OEM battery optimization kills foreground service | High | High | Prompt affected OEM users (Samsung, Xiaomi) during pilot onboarding. Test on Drain Right's actual devices. |
| tus server endpoint implementation | Medium | High | tus-js-client is standard; risk is server-side. Integration test end-to-end Week 4. |
| react-native-audio-api instability on SDK 55 / RN 0.83 | Medium | Critical | Pin v0.12.1 Week 1. Fallback: `expo-audio` (SDK 55 supports background recording). |
| react-native-mmkv v4 New Architecture peer dep | Low | Medium | Validate auto-link Week 1 before any queue code. |
| Deepgram accuracy on noisy field calls | Medium | Medium | Test with real field recordings Week 4. Keyterm prompting helps. |
| 12-week timeline for solo founder | High | High | Aggressive scope cuts already made. Cut order defined. Buffer exists from cut features. |
| Xcode 26 not available in EAS Build | Low | High | Confirm EAS Build runner image supports it before first iOS build. |

---

## 16. Phase 2+ Roadmap (What's Deferred)

### Phase 2 (Months 3–6)

- Gamification: badges, streaks, personal bests, leaderboard
- Billing: Stripe checkout, portal, seat management, churn prevention (Smart Retries, grace period, pre-dunning, ACH, Account Updater)
- ServiceTitan integration (job data, invoice matching, pricebook sync)
- Pre-call intelligence (FSM-driven briefs or manual checklists)
- Full call library (clips, sharing, secure expiring links)
- Pricebook CSV import + tiered pricing (Good/Better/Best)
- ROI Report (monthly, auto-generated)
- Weekly digest email (Monday 7am)
- Compliance dashboard (recording targets per tech)
- Activation sprint automation (Day 1/7/14/30 emails)
- Team performance table (sortable, per-tech drill-down)
- Real-time threshold alerts (configurable missed revenue threshold)
- App version forcing (hard update + soft update banner)
- VU meter (AudioContext AnalyserNode for recording feedback)
- Bluetooth audio routing (prefer external mic)
- Battery auto-pause at 15%
- Audio quality assessment (High/Medium/Low/Failed scoring)
- LLM fallback routing (confidence < 0.72 → GPT-5.4)
- Provider interfaces (Transcription/LLM abstraction layer)
- Rate limiting (@upstash/ratelimit)
- Design partner snapshots + case study export
- Spanish mobile UI
- Intro screens (3-screen onboarding flow)
- Notification settings (configurable per type)
- Webhook deduplication table
- AssemblyAI integration + STT bakeoff

### Phase 3 (Months 6–12)

- Jobber + HCP integrations
- Multi-location support (Team tier, per-location pricebooks)
- Custom scoring weight configuration
- "Best Calls" training library
- "Moments" feed (top missed moments across team)
- Team comparison views (two techs side-by-side)
- SOC 2 Type I certification
- API access (Team tier)
- Auto-record on arrival (geofence trigger)
- Coaching completion metrics and trend tracking

### Phase 4 (Year 2)

- Real-time in-call coaching
- Fine-tuned ML model on annotated Kova call data
- HVAC scoring model (new vertical)
- Rehash/reactivation lead engine
- Call center/CSR intelligence layer
- SOC 2 Type II + enterprise SSO

---

## 17. Appendix

### A.1 Audio Format Specification

AAC-LC, 32kbps, mono, 44.1kHz sample rate. ~14 MB/hour (32,000 bits/sec × 3,600 sec ÷ 8 = 14.4 MB/hr). Native codec on both iOS (AVFoundation) and Android (MediaCodec). Accepted directly by Deepgram and AssemblyAI — no transcoding needed.

### A.2 Library Migration Notes (v1 → v2)

| Removed | Replacement | Reason |
|---|---|---|
| `@notifee/react-native` | `expo-notifications` v55.0.22 | @notifee archived by Invertase, April 2026 |
| `react-native-background-upload` | `tus-js-client` v4.3.1 | Abandoned since October 2022 |
| `react-native-track-player` | `react-native-audio-api` playback | v5 changed to commercial license |
| `@react-native-firebase/app` + `messaging` | `expo-notifications` (FCM built in) | Full Firebase SDK unnecessary on mobile |

**New peer dep:** `react-native-nitro-modules` ≥ 0.20 — required by `react-native-mmkv` v4.

### A.3 Factual Corrections from v1

| v1 Error | Correction |
|---|---|
| Recording API shown as W3C `MediaRecorder` | `react-native-audio-api` uses proprietary `AudioRecorder` class. `MediaRecorder` does not exist in React Native. |
| `FOREGROUND_SERVICE_MICROPHONE` described as "unavailable below API 29" | It is a **runtime permission** added in API 34. API 29 introduced the `foregroundServiceType="microphone"` **manifest attribute** — different mechanism. |
| `@react-navigation` version listed as "≥ 6.x" | v7 is correct since expo-router v4 (SDK 52). |

### A.4 Errata Corrections from Prior Plans

| Source | Error | Correction |
|---|---|---|
| dev-plan-v2 §3.1 | Audio file size "~2 MB/hr" | ~14 MB/hr |
| dev-plan-v2 §4.1 | Upload flow shows S3 presigned URLs | Replaced with tus protocol |
| dev-plan-web-v2 §1.1 | "Two separate repos" architecture | Monorepo (pnpm workspaces) |
| product-plan-v3 §24 | "iOS first" | iOS + Android from Day 1 |

### A.5 Open Decisions

| Decision | Options | Decide By |
|---|---|---|
| Expo development build vs bare RN CLI | Start Expo, fall back if native module issues | Week 1 |
| expo-notifications for foreground service | Validate, fall back to @notifee if needed | Week 3 |
