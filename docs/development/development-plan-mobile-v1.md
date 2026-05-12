# Kova — Mobile Development Plan v1

*Document scope: React Native mobile app, Phase 1 only (Weeks 1–12). Covers the technician-facing iOS and Android application — recording engine, offline queue, post-call summary, gamification, auth, and push notifications.*

*Document version: v1*
*Status: Living document — update prior to each sprint kickoff*
*Date: May 2026*
*Parent document: `docs/development/development-plan-v2.md` — all unresolved questions defer to v2*
*Product requirements: `docs/product/product-brief-v1.md`*
*Legal/compliance: `docs/product/product-strategy-v1.md`*

> **Relationship to dev-plan-v2:** This document expands the mobile-specific sections of dev-plan-v2 into a standalone reference. Where the two documents conflict, dev-plan-v2 wins. Where this document adds detail not present in dev-plan-v2, this document is authoritative for mobile. Do not make mobile architecture decisions from dev-plan-v2 alone — always cross-reference here.

---

## 0. Summary

The mobile app is the primary product surface for Kova's end users — the technicians. Owners interact with a web dashboard; techs live in the mobile app. The mobile app must do three things well:

1. **Record service calls reliably** in the background, with no data loss, on both iOS and Android.
2. **Deliver a scored summary within 5 minutes** of the call ending so the tech sees feedback before leaving the job site.
3. **Make recording feel worth doing** — through feedback, streaks, badges, and scores that make the experience rewarding rather than surveillance-like.

Everything else in the mobile app is secondary. If background recording is unreliable, nothing else matters.

**Phase 1 success condition (mobile):**
> 16+ Drain Right techs recording ≥ 65% of dispatched jobs with zero call data loss and < 5 minute time-to-summary.

**Week 3 is the critical gate.** Background recording must be validated on real hardware before Week 4 begins. If it fails, all subsequent work stops until it is fixed.

---

## 1. Constraints

These are non-negotiable. Every architecture decision is made inside these boundaries.

### 1.1 Pilot Constraints

| Constraint | Detail |
|---|---|
| **iOS + Android parity on Day 1** | Drain Right has a mixed iOS/Android fleet. "Android later" is not an option. Both platforms must work on launch day. |
| **16+ technicians** | Phase 1 must handle 16 concurrent users. Not a scaling challenge — a reliability challenge. Each tech needs to independently record, queue, and upload without affecting others. |
| **~640 calls/month** | ~4 calls/tech/day, ~30-minute average duration. This is the load model. |
| **California two-party consent** | Cal. Penal Code §632. Consent must be logged with a timestamp before a single byte of audio is written to disk. The consent event is the most legally critical data the app stores. |
| **Mixed connectivity** | Techs work in basements, crawl spaces, and areas with poor signal. The app must record and queue locally when offline and upload when connectivity returns. |
| **Android foreground service** | Android requires a visible persistent notification while background audio recording is active. This is an OS requirement — it cannot be bypassed or hidden. |

### 1.2 Engineering Constraints

| Constraint | Detail |
|---|---|
| **Solo founder** | No dedicated mobile engineer. Architecture must be straightforward enough to debug alone at 11pm when a tech calls to say recordings aren't uploading. |
| **No Expo managed workflow** | `expo-av` does not support background audio recording without a custom dev client. The app must use either React Native CLI (bare) or Expo with `expo-modules-core` and a custom dev client. Expo managed is explicitly excluded. |
| **TypeScript everywhere** | Mobile, web, and backend share types from `packages/shared`. The mobile app uses TypeScript throughout — no JavaScript files. |
| **Minimum OS targets** | iOS 15+ (covers 99%+ of active devices). Android API 29+ (Android 10+). Drain Right device audit in Week 1 confirms actual fleet composition. |
| **AAC-LC 32kbps mono** | Recording format. Natively supported on iOS (AVFoundation) and Android (MediaCodec). Accepted directly by Deepgram and AssemblyAI without server-side transcode. ~14 MB/hour. No codec server overhead. |

### 1.3 What the Mobile App Does NOT Do in Phase 1

| Excluded | Reason | When |
|---|---|---|
| Spanish mobile UI | Full English UI first; coaching points delivered in tech's detected language | Phase 2+ |
| Auto-record on arrival (geofence) | Adoption aid — not critical for proving the number | Phase 2 |
| Leaderboard (team-facing) | Personal bests and streaks first; social comparison deferred | Phase 2 |
| Full badge set | 4 badges sufficient for Phase 1 pilot | Phase 2 |
| Real-time in-call coaching | High latency risk, distraction risk; requires real-time streaming pipeline | Year 2 |
| Pre-call intelligence cards | Requires FSM dispatch data; no FSM in Phase 1 | Phase 2 |
| Clip sharing | Email is sufficient for Phase 1 coaching | Phase 2 |

---

## 2. Tech Stack

### 2.1 Framework

**React Native (bare workflow) — confirmed.**

The framework decision is settled in dev-plan-v2 §3.1. Summary:

- `react-native-audio-api` v0.11+ provides background recording to file and lock screen notification controls. v0.12 adds recording rotation (chunking). These are confirmed shipped features.
- Full-stack TypeScript: shared types with web dashboard and backend. One language, one linter config, one mental model for a solo founder.
- Expo managed workflow is excluded. If using Expo as a toolchain (for EAS Build and EAS Update), a custom dev client with `expo-modules-core` is required from Day 1.

**Preferred approach:** Expo with a custom dev client. This gives EAS Build (iOS/Android cloud builds), EAS Update (OTA JS bundle updates), and the Expo dev tools without the managed workflow constraints. If any native module causes issues with the Expo dev client, fall back to React Native CLI bare workflow. Make this call in Week 1 and document it — do not revisit after that.

### 2.2 Library Table

| Library | Version Target | Purpose | Native Link Required |
|---|---|---|---|
| `react-native-audio-api` | ≥ 0.12 | Background audio recording, recording rotation, lock screen controls | Yes |
| `@clerk/clerk-expo` | latest stable | Auth — phone OTP, session management, JWT | No |
| `react-native-fs` | ≥ 2.20 | Filesystem access for local chunk storage | Yes |
| `react-native-mmkv` | ≥ 2.12 | Queue state persistence — survives app restarts | Yes |
| `@aws-sdk/client-s3` | v3 | S3 presigned URL upload | No |
| `react-native-background-upload` | latest | Chunked multipart upload with retry, survives backgrounding | Yes |
| `@notifee/react-native` | ≥ 7.x | Android foreground service notification (keepalive during recording) | Yes |
| `@react-native-firebase/app` | ≥ 20.x | Firebase SDK root | Yes |
| `@react-native-firebase/messaging` | ≥ 20.x | FCM push notifications (iOS + Android) | Yes |
| `zustand` | ≥ 4.x | Local UI state management | No |
| `@tanstack/react-query` | ≥ 5.x | Server state, API data fetching, cache | No |
| `zod` | ≥ 3.x | Runtime schema validation (shared with backend from `packages/shared`) | No |
| `@react-navigation/native` | ≥ 6.x | Navigation container | Yes (peer deps) |
| `@react-navigation/native-stack` | ≥ 6.x | Stack navigator | No |
| `@react-navigation/bottom-tabs` | ≥ 6.x | Tab navigator | No |
| `react-native-safe-area-context` | ≥ 4.x | Safe area insets | Yes |
| `react-native-screens` | ≥ 3.x | Native screen optimization | Yes |
| `react-native-reanimated` | ≥ 3.x | Smooth recording indicator animation | Yes |
| `react-native-track-player` | ≥ 4.x | Audio playback for clip review in post-call summary | Yes |

> **Version pins:** Lock all library versions in `package.json` (exact, not ranges) and commit `pnpm-lock.yaml`. `react-native-audio-api` is actively developed — do not auto-update without testing on both platforms. Pin it at Week 1, update intentionally.

### 2.3 Native Module Dependency Summary

Native modules requiring Xcode/Gradle changes or pod install:

```
react-native-audio-api         → Info.plist (NSMicrophoneUsageDescription, UIBackgroundModes:audio)
                                  AndroidManifest.xml (RECORD_AUDIO, FOREGROUND_SERVICE permissions + service declaration)
react-native-fs                → Standard auto-link
react-native-mmkv              → Standard auto-link
@notifee/react-native          → AndroidManifest.xml (WAKE_LOCK, RECEIVE_BOOT_COMPLETED)
@react-native-firebase/*       → google-services.json (Android), GoogleService-Info.plist (iOS)
react-native-background-upload → Standard auto-link
react-native-track-player      → Background modes (audio, AirPlay) in Info.plist
react-native-reanimated        → babel.config.js plugin, Hermes required
react-native-screens           → Standard auto-link; MainActivity.java extends ReactActivity
```

All native modules must be validated on real devices (not simulators) in Week 1 as part of the initial scaffolding. A native module that works on simulator only is equivalent to not working.

### 2.4 Minimum OS Targets

| Platform | Minimum Version | Reason |
|---|---|---|
| iOS | 15.0 | Covers 99%+ of active iOS devices. AVAudioSession background recording API stable from iOS 13. |
| Android | 10 (API 29) | ForegroundService microphone type requires API 29+. Below this, `FOREGROUND_SERVICE_MICROPHONE` permission is unavailable. |

---

## 3. Architecture

### 3.1 Folder Structure

Feature-based organization inside `apps/mobile/src/`. Each feature owns its screens, components, hooks, and local state. Shared utilities live at the top level.

```
apps/mobile/
├── src/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── screens/          PhoneScreen, OTPScreen
│   │   │   ├── hooks/            useAuth.ts
│   │   │   └── index.ts
│   │   ├── recording/
│   │   │   ├── screens/          HomeScreen, RecordingScreen, ConsentModal
│   │   │   ├── components/       RecordButton, RecordingIndicator, BatteryWarning
│   │   │   ├── hooks/            useRecordingEngine.ts, useOfflineQueue.ts, useBattery.ts
│   │   │   ├── stores/           recordingStore.ts (Zustand)
│   │   │   └── index.ts
│   │   ├── post-call/
│   │   │   ├── screens/          JobTaggingScreen, NonRecordingReasonScreen
│   │   │   ├── components/       JobTypeSelector, ReasonPicker
│   │   │   └── index.ts
│   │   ├── call-summary/
│   │   │   ├── screens/          CallSummaryScreen, CallDetailScreen
│   │   │   ├── components/       ScoreCard, OpportunityItem, ClipPlayer, DisputeModal
│   │   │   ├── hooks/            useCallSummary.ts, useClipPlayback.ts
│   │   │   └── index.ts
│   │   ├── call-history/
│   │   │   ├── screens/          CallHistoryScreen
│   │   │   ├── components/       CallRow
│   │   │   └── index.ts
│   │   ├── gamification/
│   │   │   ├── screens/          ProfileScreen
│   │   │   ├── components/       StreakCard, BadgeGrid, PersonalBests
│   │   │   └── index.ts
│   │   └── settings/
│   │       ├── screens/          SettingsScreen, NotificationSettingsScreen
│   │       └── index.ts
│   ├── navigation/
│   │   ├── RootNavigator.tsx     Auth gate → App navigator
│   │   ├── AppNavigator.tsx      Bottom tab navigator
│   │   ├── types.ts              Navigation param types (typed screens)
│   │   └── linking.ts            Deep link config
│   ├── api/
│   │   ├── client.ts             Typed fetch wrapper with Clerk JWT injection
│   │   ├── calls.ts              API functions for calls
│   │   ├── pricebook.ts          API functions for pricebook
│   │   ├── notifications.ts      FCM token registration
│   │   └── types.ts              Re-export from packages/shared
│   ├── lib/
│   │   ├── constants.ts          Chunk duration, battery thresholds, upload retry config
│   │   ├── audio.ts              Audio format config, keyterms list
│   │   └── device.ts             Platform utilities (iOS vs. Android branches)
│   └── App.tsx                   Root component, ClerkProvider, QueryClientProvider
├── android/
├── ios/
├── app.json                      Expo app config
└── package.json
```

### 3.2 State Management Strategy

Three distinct state layers. Each layer owns a specific domain:

| Layer | Tool | What Lives Here | Persistence |
|---|---|---|---|
| **Local UI state** | Zustand | Recording session state, consent modal open/closed, current upload progress, battery level | In-memory (reset on app restart) |
| **Queue state** | Zustand + MMKV | Ordered list of pending chunks and their metadata, upload retry counts | MMKV — survives restarts and crashes |
| **Server state** | React Query | Call list, call detail/score, pricebook items, notifications, user profile | React Query cache (in-memory + optional persistence) |

**Rule:** Server data is never stored in Zustand. Local ephemeral UI state is never put in React Query. Queue state (which must survive crashes) is always backed by MMKV. This boundary is maintained strictly — crossing it creates debugging nightmares.

```typescript
// Zustand store example — recording feature
// features/recording/stores/recordingStore.ts

interface RecordingState {
  sessionStatus: RecordingSessionStatus  // IDLE | CONSENT_SHOWN | RECORDING | STOPPED | UPLOADING | COMPLETE
  activeSessionId: string | null
  currentChunkPath: string | null
  chunkStartedAt: Date | null
  batteryLevel: number
  isExternalMicConnected: boolean
  uploadProgress: Record<string, UploadProgress>  // keyed by chunk filename
}

// MMKV-backed queue state — separate store
interface QueueState {
  pendingChunks: PendingChunk[]   // ordered, persisted
  failedChunks: FailedChunk[]     // retry eligible
}
```

### 3.3 Navigation Structure

```
RootNavigator
├── AuthStack (shown if no Clerk session)
│   ├── PhoneScreen
│   └── OTPScreen
└── AppStack (shown if authenticated)
    ├── IntroStack (shown only on first launch — first_launch MMKV flag)
    │   ├── IntroScreen1  (what Kova is)
    │   ├── IntroScreen2  (how it helps you earn more)
    │   └── IntroScreen3  (how to record — skippable after 2 seconds)
    └── BottomTabNavigator
        ├── HomeTab         → HomeScreen → RecordingScreen (modal)
        ├── HistoryTab      → CallHistoryScreen → CallDetailScreen
        └── ProfileTab      → ProfileScreen → SettingsScreen
```

**Modal screens** (appear over tabs, not as tabs):
- `ConsentModal` — shown before recording starts; blocks navigation until resolved
- `JobTaggingScreen` — shown after recording stops; can be dismissed and completed later
- `NonRecordingReasonScreen` — shown when starting next job without prior recording
- `DisputeModal` — shown from opportunity item in call summary
- `CallSummaryScreen` — pushed from HomeTab via deep link after push notification

**Deep link routes:**

| Route | Destination |
|---|---|
| `kova://call/:id` | `CallDetailScreen` with call ID |
| `kova://summary/:id` | `CallSummaryScreen` (post-call) |
| `kova://badge/:type` | `ProfileScreen` with badge highlight |

### 3.4 API Layer Pattern

All API calls go through a single typed client that injects the Clerk JWT automatically. No raw `fetch` calls outside of `src/api/`.

```typescript
// src/api/client.ts

async function apiRequest<T>(
  path: string,
  options: RequestInit & { schema?: ZodType<T> }
): Promise<T> {
  const token = await getToken()  // Clerk session token
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!res.ok) throw new APIError(res.status, await res.json())
  const data = await res.json()
  return options.schema ? options.schema.parse(data) : data
}
```

**React Query wrapping:** Every API function is a React Query `queryFn` or `mutationFn`. No direct `apiRequest` calls from component code — always through a hook in `features/<feature>/hooks/`.

### 3.5 Error Boundary Strategy

- Root-level `ErrorBoundary` catches unhandled render errors — shows a "Something went wrong — restart the app" screen with a restart button.
- Recording-critical code paths (consent logging, chunk write, queue persistence) have explicit try/catch with structured error logging. A crash in the recording engine must be caught and reported, never silently swallowed.
- Upload failures are not errors from the user's perspective — they are queue states. The queue manager handles retries; the user sees "Pending upload" not an error.
- Network errors in API calls surface as React Query error states in the UI. Each hook exposes `isError` and `error` for the screen to handle appropriately.

---

## 4. Screen Inventory

Complete list of Phase 1 screens with purpose and key interactions.

### 4.1 Auth Screens

**`PhoneScreen`**
- Purpose: Collect tech's phone number for Clerk OTP
- Input: Phone number (formatted, country-aware)
- Action: `POST /api/auth` via Clerk SDK → sends SMS OTP
- Edge cases: Invalid number format; Clerk rate limit (too many OTPs)
- No back button — this is the entry point

**`OTPScreen`**
- Purpose: Enter 6-digit SMS code
- Input: 6-digit OTP (auto-focus, auto-submit on 6th digit)
- Action: Clerk `signIn.attemptFirstFactor()` → session established
- Edge cases: Expired OTP, wrong code (3 attempts → re-send prompt), no SMS received
- On success: RootNavigator switches to AppStack (auth state listener)

### 4.2 Intro Screens (First Launch Only)

**`IntroScreen1` — "What is Kova"**
- One illustration, 2-sentence explanation: Kova records service calls so you can see how your conversations translate to business.
- "Next" button
- Skippable via "Skip" in top right

**`IntroScreen2` — "How it helps you earn more"**
- One illustration: post-call summary with score and estimated opportunity highlighted
- 2-sentence copy: Your score and coaching appear within 5 minutes of finishing a call. Over time, you'll see exactly where you're leaving money on the table.
- "Next" button

**`IntroScreen3` — "How to record"**
- Animated illustration: tap Record → consent popup → recording indicator
- One-paragraph copy covering the consent popup, background recording, and upload
- "Get Started" button → sets `first_launch = false` in MMKV → navigates to HomeScreen
- Pioneer badge prompt: "Complete 3 recordings this week to earn the Pioneer badge"

### 4.3 Home Screen

**`HomeScreen`**
- Purpose: The primary daily surface for a tech. Must answer "did my last call get processed?" and "am I ready to record my next call?" at a glance.

**Top section:**
- Queue status widget: `2 calls pending upload`, `All caught up` — always visible
- Active badge/streak summary: current streak count, most recent badge
- Payment failed banner (if `company.payment_failed = true` — from Stripe webhook)

**Middle section — dominant:**
- Large `RecordButton` component (120pt diameter, brand color)
- State-aware label: `Record`, `Recording...`, `Uploading...`
- Tap → shows `ConsentModal` if IDLE

**Bottom section:**
- Recent calls list: last 3 calls with score and opportunity total
- "View all" → `CallHistoryScreen`

**Empty state (no calls yet):**
- Pioneer badge prompt front and center
- "Record your first call" instructional CTA

### 4.4 Recording Screen

**`RecordingScreen`** (full-screen modal, shown while recording is active)
- Purpose: Keep recording session visible and give the tech control
- Always on top of home; replacing home navigation during an active session

**Layout:**
- Recording indicator: animated waveform or pulsing circle (react-native-reanimated)
- Duration timer: live elapsed time counter
- Battery level indicator (prominent if < 30%)
- `Pause` / `Resume` button
- `Stop Recording` button (prominent, requires single intentional tap — no accidental stops)
- Chunk status: subtle "Chunk saved" indicator on each 5-minute rotation

**Battery warning overlay** (at 20%):
```
⚠️ Low Battery (20%)
Recording quality may be affected.
Plug in if possible.
                [OK]
```

**Auto-pause at 15%** — recording pauses, push notification sent, overlay shown:
```
⚠️ Recording Paused — Battery Critical
Plug in your phone and tap Resume.

[Resume]
```

### 4.5 Consent Modal

**`ConsentModal`** (full-screen, non-dismissable by back button or swipe)
- Purpose: Legal gate before recording. Cannot be bypassed.

State: Replaces the normal recording flow. The tech must resolve it before any other action is possible.

**Layout:**
```
Before You Record

Please inform your customer:

"I'll be recording this appointment for
quality purposes — is that okay with you?"

┌────────────────────────────────────────┐
│  Customer Consented — Start Recording  │
└────────────────────────────────────────┘

         Customer Declined
```

**"Customer Consented" tap:**
1. Log consent event: `POST /api/calls/consent` → `calls.consent_logged_at` set in Neon (synchronous — if this fails, do not start recording)
2. Play 1-second audible tone
3. Start `react-native-audio-api` recording session
4. Transition `RecordingSession` state to `RECORDING`
5. Navigate to `RecordingScreen`

**"Customer Declined" tap:**
1. Log decline event: `POST /api/calls/decline`
2. `calls.decline_reason = 'customer_declined'`
3. Dismiss modal, return to `HomeScreen`
4. `NonRecordingReasonScreen` will prompt on next session start if this job is un-tagged

**Critical:** Consent event write to the server must succeed before recording starts. Do not start recording optimistically and log consent later. If the consent API call fails (no connectivity), show an error and do not start recording. The consent timestamp is a compliance record.

### 4.6 Job Tagging Screen

**`JobTaggingScreen`** (shown after "Stop Recording" tapped)
- Purpose: Associate the recording with a job so the scored result is meaningful

**Fields:**
- Customer name (free text, optional)
- Job type: `Drain`, `Plumbing`, `Both` (required — used for scoring model selection)
- Notes (free text, optional, max 280 chars)
- "Submit" → creates job tag record, transitions queue to UPLOADING

**Dismissal behavior:** Tech can tap "Do Later" to dismiss without tagging. A reminder is shown the next time the app is opened: "You have an untagged call. Tag it now for accurate scoring."

**Phase 2 note:** Job tagging is replaced by auto-population from the ServiceTitan dispatch record. The same screen will receive pre-filled data from FSM context.

### 4.7 Non-Recording Reason Screen

**`NonRecordingReasonScreen`** (modal, shown when tech starts a new job without a prior recording for the dispatched job)
- Purpose: Give techs a safe way to log non-recording reasons without penalty; give managers visibility into compliance gaps

**Reason options:**
- "Customer declined recording"
- "Technical issue (battery or signal)"
- "Emergency call — no time"
- "Duplicate or incorrect dispatch"
- "Other (please describe)"

**"Other" selected:** Free text field appears.

**Behavior:** Logged to `calls.decline_reason`; this job excluded from recording compliance numerator. Manager sees the reason in the compliance dashboard, not as a penalty for the tech.

**Dismissal:** Tech can skip this screen. Skipped reasons appear as "No reason logged" in manager view — a softer signal than a confirmed non-recording.

### 4.8 Call Summary Screen

**`CallSummaryScreen`** (pushed from deep link after push notification)
- Purpose: The tech's payoff. Show them what their call looked like within 5 minutes of finishing.

**Header:**
- Overall score: large number (0–100), color-coded (green ≥ 70, yellow 50–69, red < 50)
- Estimated opportunity total: `$425–$650 estimated opportunity` in large type
- Footnote: *"Estimated opportunity reflects your pricebook prices. Actual revenue potential depends on customer need, timing, and context."*
- Job context: customer name (if tagged), job type, date/time

**Opportunity list:**
Each detected opportunity is one card:
```
Camera Inspection
Not offered after customer mentioned repeat visits    [estimated $425]

Trigger heard at 4:12 → [Play Clip ▶]
                                    [Not Applicable ▼]
```

**"Not Applicable" → `DisputeModal`:**
- "Customer already has this service"
- "I offered it — customer declined (not captured)"
- "Not relevant to this job type"
- "Customer couldn't afford more today"
- "Other (free text)"
On submit: `POST /api/opportunities/:id/dispute`; card is grayed out and marked "Reviewed"

**Coaching section:**
Each coaching point from the LLM layer:
```
Diagnosis Quality — 2/3
Strong: You identified the root cause clearly.
Improve: Consider explaining the long-term risk of not addressing it.

[Mark as Reviewed]
```

Coaching points in tech's detected call language (Spanish coaching cards for Spanish-primary calls — Phase 2). Phase 1: English only.

**Confidence gating:** Opportunities and coaching points with confidence < 0.85 are not shown in tech view. Manager sees them with a "review recommended" flag. Tech does not know items are hidden — no "X items hidden" message.

### 4.9 Call History Screen

**`CallHistoryScreen`**
- List of all the tech's calls, most recent first
- Per-row: date, job type, duration, overall score (color-coded), estimated opportunity total, audio quality indicator
- Tap row → `CallDetailScreen`

**`CallDetailScreen`**
- Full score breakdown by dimension
- Audio player (waveform visualization)
- Synchronized transcript (tap a segment → audio seeks to that position)
- Opportunity markers on waveform (colored pins at trigger timestamps)
- Coaching points list with "Mark as reviewed" per item

**Phase 1 scope note:** No keyword search in call history. Search is Phase 2. Date filter: this week / last week / this month.

### 4.10 Profile Screen

**`ProfileScreen`**
- Tech's name and phone number
- Active streak: "🔥 5-call streak — keep it going"
- Personal bests: highest score, longest streak, best 7-day average
- Badge shelf: earned badges displayed; locked badges shown grayed out with criteria
- "View Settings" link

**`SettingsScreen`**
- Notification preferences toggle (push notifications on/off)
- App version and build number
- "Sign Out" (Clerk sign-out)

### 4.11 Phase 1 Badge Set

| Badge | Criteria | Award Trigger |
|---|---|---|
| Pioneer | Complete 3 recordings in the first 7 days | Automatic after 3rd call processed in first week |
| First Call | Complete first scored call | Automatic after first `scored` call status |
| Perfect Score | 100/100 on any single call | Automatic after score written with `overall_score = 100` |
| Consistent | 7-day rolling average above 80 | Cron check or post-call calculation |

Badge award: `POST /api/badges/award` (worker-side, triggered post-scoring) → push notification to tech → badge highlighted on next `ProfileScreen` visit.

---

## 5. Recording Engine

The highest-risk, most critical subsystem. Everything else depends on this working.

### 5.1 Audio Pipeline Architecture

```
Microphone input (hardware)
      │
      ▼
react-native-audio-api
  ├── getUserMedia({ audio: true })         → MediaStream
  ├── AudioContext                          → audio graph
  ├── MediaRecorder(stream, {
  │     mimeType: 'audio/aac',
  │     audioBitsPerSecond: 32000,          → 32kbps
  │   })
  └── Recording rotation (v0.12)
        ├── Every 5 minutes → ondataavailable event
        ├── Write chunk → local filesystem (react-native-fs)
        ├── Add chunk metadata to MMKV queue
        └── Start next chunk

OS-level session management:
  iOS:  AVAudioSession.setCategory(.record, mode: .default,
                                   options: [.mixWithOthers])
                                   + .setActive(true)
        UIBackgroundModes: ['audio']

  Android: RecordingService (ForegroundService)
           foregroundServiceType: microphone
           Persistent notification via @notifee
```

**Audio format:** AAC-LC, 32kbps, mono, 44.1kHz sample rate.

Why these parameters:
- **AAC-LC:** Native codec on both iOS (AVFoundation) and Android (MediaCodec). No transcoding overhead.
- **32kbps mono:** Sufficient for speech intelligibility. Deepgram and AssemblyAI both accept this directly.
- **44.1kHz:** Standard sample rate; avoids resampling artifacts.
- **Mono:** Service calls are recorded from a single mic source. Stereo doubles file size with no benefit.

**Output file per chunk:** `call_{sessionId}_chunk_{n}.aac`

### 5.2 iOS Configuration

**`Info.plist` additions:**
```xml
<key>NSMicrophoneUsageDescription</key>
<string>Kova records service calls to help you track performance and earn more.</string>

<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>
```

**AVAudioSession behavior:**
- Category: `.record` during recording; `.playback` during clip review
- The session must be explicitly set to `.record` before `react-native-audio-api` starts, and released (`.notSet`) after stopping
- Mix with others: enable so an incoming call pauses recording gracefully rather than crashing
- Interruption handling: `AVAudioSessionInterruptionNotification` — on interruption (phone call), transition recording state to `PAUSED`; on interruption end, auto-resume if the tech had not manually stopped

**iOS permission request:** `NSMicrophoneUsageDescription` string above. Clerk phone OTP may trigger additional permissions (notifications). Request microphone permission at first launch before showing the Home screen, not just-in-time before the first recording — this avoids permission prompt interrupting the consent flow.

### 5.3 Android Configuration

**`AndroidManifest.xml` additions:**
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

<service
  android:name=".RecordingService"
  android:foregroundServiceType="microphone"
  android:exported="false" />
```

**Foreground service requirement:** Android 10+ requires a visible persistent notification when a foreground service with `foregroundServiceType="microphone"` is active. This cannot be hidden. The notification must be shown immediately when recording starts — Android will kill the service if the notification is not presented within 5 seconds of `startForeground()` being called.

**`@notifee` notification config:**
```typescript
// features/recording/hooks/useRecordingEngine.ts

const RECORDING_CHANNEL_ID = 'kova-recording'

async function showRecordingNotification() {
  await notifee.createChannel({
    id: RECORDING_CHANNEL_ID,
    name: 'Recording Status',
    importance: AndroidImportance.LOW,    // Low: no sound, no heads-up
  })

  await notifee.displayNotification({
    id: 'recording-active',
    title: 'Kova — Recording Active',
    body: 'Recording in progress. Tap to return to the app.',
    android: {
      channelId: RECORDING_CHANNEL_ID,
      asForegroundService: true,
      ongoing: true,                     // Cannot be dismissed by the tech
      smallIcon: 'ic_notification',      // Monochrome 24dp icon in drawable/
      pressAction: { id: 'open-app', launchActivity: 'default' },
    },
  })
}

async function dismissRecordingNotification() {
  await notifee.stopForegroundService()
  await notifee.cancelNotification('recording-active')
}
```

**Android battery optimization:** Many Android OEMs (Samsung, Xiaomi, Oppo, OnePlus) have aggressive battery optimization that kills background processes. Starting in Week 1, build a device compatibility list from the Drain Right phone audit. For problematic OEMs, prompt the tech once to disable battery optimization for Kova: `Settings → Battery → Kova → Don't Optimize`. The onboarding intro screen (IntroScreen3) includes a platform-detected prompt for Android users.

### 5.4 Recording Session State Machine

```
IDLE
  │ (tech taps Record button)
  ▼
CONSENT_SHOWN
  │ (tech taps "Customer Declined")     │ (tech taps "Customer Consented")
  ▼                                     ▼
IDLE (decline logged)           → API: POST /api/calls/consent (synchronous)
                                  → if API fails: stay in CONSENT_SHOWN, show error
                                  → if API success: play tone → start audio session
                                  ▼
                              RECORDING
                                  │ (every 5 minutes)
                                  ├─ rotate chunk: write to FS, add to queue
                                  │ (battery reaches 15%)
                                  ├─ auto-pause → PAUSED
                                  │ (phone call interrupts — iOS)
                                  ├─ pause → PAUSED (auto-resume when call ends)
                                  │ (tech taps Pause)
                                  ├─ → PAUSED
                                  │ (tech taps Stop)
                                  ▼
PAUSED ◄──────────────────── RECORDING
  │ (tech taps Resume)
  └──────────────────────────► RECORDING

RECORDING → (tech taps Stop)
  ▼
STOPPED
  → show JobTaggingScreen
  → write final chunk to FS queue
  ▼
UPLOADING
  → upload manager picks up queue (see §6)
  → if all chunks uploaded: POST /api/calls/upload-complete
  ▼
PENDING_ANALYSIS
  → poll for status change or wait for push notification
  ▼
COMPLETE
  → deep link to CallSummaryScreen

Upload failure branch:
UPLOADING → UPLOAD_RETRY (exponential backoff, max 5 attempts per chunk)
          → if max attempts reached: UPLOAD_FAILED
          → user notified: "Call failed to upload. Retry?"
          → manual retry button shown in queue widget on HomeScreen
```

### 5.5 Battery Management

**Battery level source:** `react-native-device-info` `getBatteryLevel()` polled every 30 seconds during active recording.

| Battery Level | Action |
|---|---|
| > 30% | No action |
| 20–30% | Show in-app warning overlay: "Low battery (20%) — recording may be affected. Plug in if possible." |
| 15–20% | Warning persists; recording indicator changes color to amber |
| < 15% | Auto-pause recording. Show overlay: "Recording paused — battery critical." Push notification: "Kova recording paused — low battery." |

**Wired earphone mic detection:**
- iOS: `AVAudioSession.currentRoute.outputs` — detect if wired output is present → prefer input from wired mic if detected
- Android: `AudioManager.isWiredHeadsetOn()` — detect wired headset → prefer external mic input
- On detection: subtle indicator "External mic active" in `RecordingScreen`
- No tech action required — preference is automatic

### 5.6 Recording Rotation (Chunking)

`react-native-audio-api` v0.12 supports recording rotation — chunking the recording into separate files at configurable intervals.

**Configuration:** 5-minute chunks. A 30-minute call produces 6 chunk files.

**Purpose:** Crash resilience. If the app crashes or is force-killed by the OS mid-recording, only the current (partial) chunk is lost. All prior complete chunks are already written to the filesystem queue and will upload on next app open.

**Chunk file naming:** `call_{sessionId}_chunk_{n}_{timestamp}.aac`

**Chunk metadata (in MMKV queue entry):**
```typescript
interface PendingChunk {
  chunkId: string
  sessionId: string
  chunkIndex: number
  filePath: string
  sizeBytes: number
  durationSec: number
  createdAt: string           // ISO8601
  uploadAttempts: number
  lastAttemptAt: string | null
  status: 'pending' | 'uploading' | 'uploaded' | 'failed'
}
```

**Server assembly:** The backend receives individual chunks and assembles them in order (by `chunkIndex`) into a single audio file for transcription. Alternatively, each chunk can be transcribed independently and transcripts merged — this is a backend decision deferred to dev-plan-v2 §7.1.

---

## 6. Offline-First Architecture

### 6.1 Design Principle

The offline queue is not a fallback — it is the primary data flow. Audio is always written locally first. Upload is always async. This means:

- A tech in a basement with no signal can record all day. Everything uploads when they drive back to the shop.
- A server outage does not lose call data. Chunks are queued and retry when the server is available.
- An app crash mid-recording loses at most one 5-minute chunk.

### 6.2 Upload Manager

The upload manager is a background process that runs independently of the UI. It watches the MMKV queue and uploads pending chunks as connectivity allows.

```
Upload Manager (runs on app open, on connectivity change, on job completion)

1. Read pending chunks from MMKV queue
2. Check network connectivity (react-native-netinfo)
   → If offline: exit, subscribe to connectivity change event
   → If online: proceed
3. For each pending chunk (in order by chunkIndex):
   a. GET /api/calls/presign → Vercel returns S3 presigned URL
   b. Upload chunk to S3 via react-native-background-upload
      → Chunked multipart for files > 5MB
      → Single PUT for files ≤ 5MB (5-min AAC chunk ≈ 1.2MB)
   c. On success: update chunk status to 'uploaded' in MMKV
   d. On failure: increment uploadAttempts, set lastAttemptAt
      → if attempts < 5: schedule retry (exponential backoff: 30s, 2m, 10m, 30m, 2h)
      → if attempts == 5: set status to 'failed', surface in UI
4. If all chunks for a session are 'uploaded':
   a. POST /api/calls/upload-complete { sessionId, chunkCount, totalDurationSec, jobMetadata }
   b. Remove chunks from MMKV queue
   c. Delete local chunk files from filesystem
   d. Set session status to 'PENDING_ANALYSIS' in Zustand store
```

**Connectivity detection:**
- `@react-native-community/netinfo` provides `useNetInfo()` hook and `addEventListener`
- On connectivity restored: upload manager runs immediately
- No polling — event-driven

**Background upload persistence:**
- `react-native-background-upload` handles uploads in a background thread
- Survives app backgrounding during upload
- Progress callbacks update `uploadProgress` in Zustand (reflected in HomeScreen queue widget)

### 6.3 MMKV Queue Schema

The queue is the source of truth for all pending audio data. It must be correct even after a crash.

```typescript
// Queue stored in MMKV under key: 'upload_queue'
interface UploadQueue {
  sessions: Record<string, QueuedSession>
}

interface QueuedSession {
  sessionId: string
  techId: string
  companyId: string
  consentLoggedAt: string        // ISO8601 — required
  recordingStartedAt: string
  recordingStoppedAt: string | null
  jobMetadata: JobMetadata | null
  chunks: PendingChunk[]         // ordered by chunkIndex
  overallStatus: 'recording' | 'stopped' | 'uploading' | 'complete' | 'failed'
}
```

**Write discipline:** MMKV writes are synchronous and happen immediately on chunk creation. Never buffer MMKV writes. If the app crashes between a chunk write to the filesystem and the MMKV queue update, the chunk file exists but has no queue entry — orphaned file. The upload manager runs a reconciliation pass on startup: scan the filesystem for `.aac` files, cross-reference with MMKV queue, re-add any orphaned chunks to the queue.

### 6.4 Failure Modes and Recovery

| Failure | Detection | Recovery |
|---|---|---|
| App crash during recording | MMKV queue shows `status: 'recording'` session with no `recordingStoppedAt` | On next open: show "You have an incomplete recording — resume or discard?" |
| Upload failure (all 5 retries exhausted) | `status: 'failed'` in MMKV | Show "Upload failed" in queue widget with manual "Retry" button |
| Server returns 5xx | Upload manager treats as transient failure | Retry with exponential backoff |
| Chunk file missing from filesystem (deleted by OS low-storage cleanup) | File read fails during upload | Mark chunk as `failed`, note "file missing" in metadata, continue with remaining chunks. Notify tech: "One recording section was lost — call was partially recorded." |
| MMKV corruption | Queue read throws | Fall back to empty queue, attempt filesystem reconciliation |
| S3 presign request fails (Vercel down) | HTTP error on presign | Queue stays, retry on next connectivity event |

**Low-storage handling:** Android may delete cache files under extreme storage pressure. Chunk files are stored in the app's documents directory (not cache) to reduce risk. iOS never auto-deletes documents directory files.

---

## 7. API Contract (Mobile Perspective)

The mobile app calls a subset of the full API defined in dev-plan-v2 §7.4. This section specifies exactly what the mobile app calls, with request/response shapes from the mobile client's perspective.

### 7.1 Auth (Clerk-managed)

Auth flows are handled by `@clerk/clerk-expo`. The mobile app does not call auth endpoints directly — Clerk SDK manages OTP, session establishment, and token refresh. The mobile app calls `useAuth()` to get the current session token, which is injected into all API requests via the `apiRequest` client.

### 7.2 Audio Upload Flow

**`GET /api/calls/presign`**
```typescript
// Request
// Query params: sessionId, chunkIndex, contentType='audio/aac'

// Response
interface PresignResponse {
  uploadUrl: string       // S3 presigned PUT URL
  s3Key: string           // e.g., 'audio/{companyId}/{sessionId}/chunk_{n}.aac'
  expiresAt: string       // ISO8601 — presigned URLs expire in 15 minutes
}
```

**`POST /api/calls/consent`** ← Synchronous. Must succeed before recording starts.
```typescript
// Request
interface ConsentRequest {
  sessionId: string         // generated client-side (UUID)
  techId: string            // from Clerk session
  companyId: string
  consentedAt: string       // ISO8601 — client timestamp
  devicePlatform: 'ios' | 'android'
}

// Response
interface ConsentResponse {
  callId: string            // created in Neon, returned to client
  consentLoggedAt: string   // server-confirmed timestamp
}
```

**`POST /api/calls/decline`**
```typescript
// Request
interface DeclineRequest {
  sessionId: string
  techId: string
  companyId: string
  declinedAt: string        // ISO8601
  reason: 'customer_declined'
}

// Response: 204 No Content
```

**`POST /api/calls/upload-complete`**
```typescript
// Request
interface UploadCompleteRequest {
  callId: string              // from ConsentResponse
  sessionId: string
  s3Keys: string[]            // all chunk keys, ordered
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

// Response
interface UploadCompleteResponse {
  callId: string
  status: 'processing'
  estimatedCompletionSec: number    // hint for UI ("results in ~4 minutes")
}
```

### 7.3 Calls

**`GET /api/calls`**
```typescript
// Query params: page, limit (default 20), status?

// Response
interface CallListResponse {
  calls: CallSummary[]
  nextPage: number | null
}

interface CallSummary {
  id: string
  recordedAt: string
  durationSec: number
  jobType: 'drain' | 'plumbing' | 'both'
  status: CallStatus
  overallScore: number | null
  opportunityTotalLow: number | null
  opportunityTotalHigh: number | null
  audioQuality: 'high' | 'medium' | 'low' | 'failed' | null
  language: 'en' | 'es' | 'bilingual' | null
}
```

**`GET /api/calls/:id`**
```typescript
// Response
interface CallDetailResponse {
  call: Call
  transcript: TranscriptSegment[] | null
  score: Score | null
  opportunities: Opportunity[]
  coachingPoints: CoachingPoint[]
}
```

**`GET /api/calls/:id/audio`**
```typescript
// Response
interface AudioUrlResponse {
  url: string           // presigned S3 GET URL, expires in 1 hour
  durationSec: number
}
```

### 7.4 Opportunities

**`POST /api/opportunities/:id/dispute`**
```typescript
// Request
interface DisputeRequest {
  reason: DisputeReason   // enum: existing_service | offered_declined | not_relevant | affordability | other
  notes?: string          // required if reason = 'other'
}

// Response: 204 No Content
```

### 7.5 Notifications

**`POST /api/notifications/register`**
```typescript
// Request
interface FCMRegistrationRequest {
  token: string           // FCM device token
  platform: 'ios' | 'android'
}

// Response: 204 No Content
```

**`GET /api/notifications`**
```typescript
// Response
interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

interface Notification {
  id: string
  type: 'call_ready' | 'badge_earned' | 'streak_milestone' | 'weekly_stats' | 'payment_failed'
  payload: Record<string, unknown>    // type-specific payload
  sentAt: string
  readAt: string | null
}
```

### 7.6 Job Tagging

**`POST /api/calls/:id/tag`**
```typescript
// Request
interface JobTagRequest {
  customerName?: string
  jobType: 'drain' | 'plumbing' | 'both'
  notes?: string
}

// Response: 204 No Content
```

**`POST /api/calls/:id/no-recording-reason`**
```typescript
// Request
interface NoRecordingReasonRequest {
  reason: 'customer_declined' | 'technical_issue' | 'emergency' | 'duplicate_dispatch' | 'other'
  notes?: string
}

// Response: 204 No Content
```

### 7.7 User & Team

**`GET /api/team/me`**
```typescript
// Response
interface MeResponse {
  id: string
  name: string
  role: 'technician' | 'field_manager' | 'owner'
  companyId: string
  company: {
    name: string
    plan: 'starter' | 'pro' | 'team'
    paymentFailed: boolean    // drives payment failed banner
  }
  badges: Badge[]
  streak: StreakData
  personalBests: PersonalBests
}
```

### 7.8 Health (Internal)

The mobile app does not call admin or dashboard endpoints. If the app needs to check its own upload queue health, it reads MMKV locally. No health endpoint is called from the mobile app.

---

## 8. Push Notifications and Deep Linking

### 8.1 FCM Registration Flow

```
1. App opens for the first time (or after FCM token refresh)
2. @react-native-firebase/messaging → requestPermission()
   → iOS: system permission dialog
   → Android 13+: POST_NOTIFICATIONS permission dialog
3. On permission granted: getToken() → FCM token string
4. POST /api/notifications/register { token, platform }
5. Token stored server-side in notifications table per user
6. On token refresh (FCM regenerates): re-register automatically
   → messaging().onTokenRefresh(token => register(token))
```

**iOS APNs bridge:** Firebase handles the APNs registration automatically. The app must include the APNs push notification entitlement in the provisioning profile and a push notification background mode.

### 8.2 Notification Types and Payload Shapes

| Type | Trigger | Priority | Payload |
|---|---|---|---|
| `call_ready` | Worker completes scoring | High | `{ callId, overallScore, opportunityTotal }` |
| `badge_earned` | Badge award logic fires | Normal | `{ badgeType, badgeName, earnedAt }` |
| `streak_milestone` | Streak count hits 3, 7, or 14 | Normal | `{ streakCount }` |
| `weekly_stats` | Monday 8am tech's timezone (Vercel cron) | Normal | `{ avgScore, topOpportunity, callCount }` |
| `payment_failed` | Stripe webhook → company payment_failed = true | High | `{ companyName }` |
| `low_battery_paused` | Auto-pause at 15% | High | `{ sessionId }` (local notification, not FCM) |

**`call_ready` notification copy:** *"Your call summary is ready — Score: {overallScore}/100"*

### 8.3 Deep Link Routing on Notification Tap

| Notification Type | Deep Link | Destination |
|---|---|---|
| `call_ready` | `kova://summary/{callId}` | `CallSummaryScreen` |
| `badge_earned` | `kova://badge/{badgeType}` | `ProfileScreen` with badge highlighted |
| `streak_milestone` | `kova://home` | `HomeScreen` with streak card prominent |
| `weekly_stats` | `kova://history` | `CallHistoryScreen` |
| `payment_failed` | `kova://settings/billing` | `SettingsScreen` billing section |

**`linking.ts` config for React Navigation:**
```typescript
const linking: LinkingOptions<RootParamList> = {
  prefixes: ['kova://'],
  config: {
    screens: {
      AppStack: {
        screens: {
          Home: 'home',
          History: 'history',
          Profile: 'profile',
          CallSummary: 'summary/:callId',
          CallDetail: 'call/:callId',
          Settings: 'settings/:section?',
        },
      },
    },
  },
}
```

### 8.4 Foreground Notification Handling

When a push notification arrives while the app is in the foreground:
- `call_ready`: Show an in-app banner at the top of the screen with the score. Tap → navigate to `CallSummaryScreen`.
- `badge_earned`: Show an animated badge grant overlay on the current screen. Tap → `ProfileScreen`.
- `payment_failed`: Show persistent in-app banner on `HomeScreen` (same as the banner driven by `company.paymentFailed` from the API).
- All other types: Show standard in-app toast.

**`react-native-firebase` handler:**
```typescript
messaging().onMessage(async remoteMessage => {
  handleForegroundNotification(remoteMessage)
})
```

---

## 9. Auth Flow

### 9.1 Clerk Phone OTP Sequence

```
1. Tech enters phone number on PhoneScreen
2. Clerk SDK: signIn.create({ identifier: phoneNumber, strategy: 'phone_code' })
   → SMS sent by Clerk
3. Tech enters 6-digit code on OTPScreen
4. Clerk SDK: signIn.attemptFirstFactor({ strategy: 'phone_code', code })
5. On success: Clerk stores session; useAuth().isSignedIn = true
6. RootNavigator re-renders: AuthStack → AppStack
7. First launch flag checked in MMKV:
   → If first_launch not set: show IntroStack
   → If first_launch = true: go directly to BottomTabNavigator
```

### 9.2 Session Token Lifecycle

- Clerk session tokens expire and refresh automatically via the Clerk SDK
- `getToken()` in `apiRequest` always retrieves the current valid token — expired tokens are refreshed transparently
- No manual token management in the app code
- If Clerk session is invalid (revoked, account deleted): `useAuth().isSignedIn = false` → RootNavigator shows AuthStack

### 9.3 Role-Aware UI

Technicians (`role: 'technician'`) see only technician screens. The mobile app is technician-facing only in Phase 1 — owners and managers use the web dashboard.

A `field_manager` with the mobile app installed sees the technician view. Manager-specific mobile features (call review, coaching notes from mobile) are Phase 2.

Role is stored in the Clerk session metadata (`publicMetadata.role`) and accessible via `useUser()`. No separate role fetch is required.

### 9.4 Multi-Company Membership

Phase 1: A technician belongs to exactly one company (one Clerk Organization). The `companyId` is read from `useOrganization().organization.id`. No company switching UI in Phase 1.

---

## 10. Weekly Sprint Plan (Mobile Deliverables)

This section mirrors the 12-week sprint plan in dev-plan-v2 but is mobile-specific. Each week shows only mobile deliverables, with acceptance criteria (the specific test that proves the work is done) and dependencies (what must exist from the backend before mobile work can proceed).

---

### Week 1 — Mobile Project Scaffolding

**Goal:** The mobile app compiles, runs on both iOS simulator and real Android device, and connects to the backend. Zero features.

**Mobile deliverables:**
- Expo custom dev client initialized OR React Native CLI bare project created (decision documented)
- `@clerk/clerk-expo` integrated — phone OTP sign-in works end-to-end
- React Navigation wired up with RootNavigator (AuthStack + AppStack stub)
- `packages/shared` dependency linked in mobile `package.json` via pnpm workspace
- `apiRequest` client skeleton written with Clerk token injection
- Folder structure created per §3.1
- All native modules in §2.2 installed and linked (pod install + gradle sync)
- App runs on iOS 15 real device and Android 10 real device (not simulators only)
- EAS project initialized — `eas build --platform ios --profile development` succeeds

**Acceptance criteria:**
- Tech can sign in via phone OTP on both platforms
- `apiRequest` makes an authenticated request to the backend health endpoint and returns 200
- No TypeScript errors: `pnpm typecheck` passes

**Dependencies from backend:**
- Clerk: phone OTP enabled, Organizations enabled, custom roles defined
- `/api/admin/health` endpoint returns 200

**Action items (not code):**
- Begin Drain Right phone audit — exactly which iOS and Android models does the fleet use? Report by end of week.
- CA privacy attorney consultation scheduled (target: Week 3)

---

### Week 2 — Auth, Navigation, and Data Layer

**Goal:** Full auth flow works. Navigation structure complete. React Query wired to backend. MMKV initialized.

**Mobile deliverables:**
- Full auth flow: `PhoneScreen` → `OTPScreen` → `AppStack` — all edge cases handled (wrong OTP, expired OTP, rate limit)
- Sign-out implemented in `SettingsScreen`
- Bottom tab navigator with all 3 tabs: Home, History, Profile
- All screen stubs created (screens exist but show placeholder content)
- React Query `QueryClientProvider` wired in `App.tsx`
- `GET /api/team/me` called on app open; `MeResponse` available via `useCurrentUser()` hook
- MMKV initialized with queue store and first_launch flag
- Deep link config in `linking.ts` — `kova://` scheme registered in `app.json`
- Intro screens complete (all 3 screens, skip logic, first_launch flag written)

**Acceptance criteria:**
- Sign out → sign back in → user data correct on both platforms
- First launch shows intro screens; subsequent launches skip directly to HomeScreen
- `useCurrentUser()` returns correct name, role, and company name on both platforms
- Deep link `kova://home` navigates to HomeScreen on both platforms

**Dependencies from backend:**
- `GET /api/team/me` endpoint returns `MeResponse`
- Clerk webhook syncing users/orgs to Neon

---

### Week 3 — Recording Engine ← CRITICAL GATE

**Goal:** A tech can record a call in the background with consent logged. The recording survives being backgrounded and the phone being locked. Background recording validation gate must pass before Week 4 begins.

**Mobile deliverables:**
- `ConsentModal` — full-screen, non-dismissable, state machine correctly transitions based on button tap
- `POST /api/calls/consent` called synchronously on "Customer Consented" — recording does not start if this fails
- `POST /api/calls/decline` called on "Customer Declined"
- `react-native-audio-api` recording session starts on successful consent log — AAC-LC 32kbps mono
- `RecordingScreen` shows live timer and animated recording indicator
- Recording rotation every 5 minutes — chunks written to filesystem with correct naming
- MMKV queue updated on each chunk write
- Pause/resume implemented
- Stop recording → `JobTaggingScreen` shown
- Battery monitor: warning at 20%, auto-pause at 15% with notification
- Wired mic detection and preference
- `NotifeeRecordingNotification` shown on Android during recording — foreground service active
- `NonRecordingReasonScreen` shown when starting a new session without completing prior session
- `RecordButton` on `HomeScreen` correctly shows queue status (pending chunks count)
- iOS `Info.plist` background mode and microphone permission configured
- Android manifest foreground service configured

**⚠️ Background Recording Validation Gate (must pass before Week 4):**

Protocol (on real hardware — not simulator):

*iOS:*
1. Start recording on real iPhone (iOS 15+)
2. Press Home button — app goes to background
3. Lock the phone with the side button
4. Wait 20 minutes without touching the phone
5. Unlock and open Kova
6. Stop recording
7. Verify: (a) duration timer reflects 20+ minutes, (b) chunk files exist in filesystem for each 5-minute rotation, (c) no chunk is corrupt

*Android:*
1. Start recording on real Android (API 29+)
2. Press Home button — app goes to background
3. Lock the phone
4. Wait 20 minutes
5. Unlock and open Kova
6. Verify foreground service notification was present in notification shade throughout
7. Stop recording
8. Verify: (a) duration timer correct, (b) chunk files intact, (c) notification dismissed

**If either platform fails:** Stop all other work. Debug `react-native-audio-api` configuration before proceeding. Contingency: if Android cannot be stabilized within Week 3, escalate immediately. Consider Drain Right iOS-only soft launch for 2 weeks while Android is fixed — do not delay the pilot for Android, but do not launch Android with unreliable background recording.

**Acceptance criteria:**
- Background recording validation gate passes on both platforms
- Consent timestamp appears in Neon before any audio chunk is written
- Recording continues uninterrupted for 30 minutes in background on iOS
- Recording continues uninterrupted for 30 minutes in background on Android
- MMKV queue has correct chunk entries after stop

**Dependencies from backend:**
- `POST /api/calls/consent` endpoint (returns `callId`)
- `POST /api/calls/decline` endpoint

---

### Week 4 — Offline Queue and Upload Pipeline

**Goal:** Chunks upload to S3 reliably. The upload-complete call is made after all chunks upload. Queue survives app restarts and network interruptions.

**Mobile deliverables:**
- Upload manager implemented — reads MMKV queue, uploads chunks in order
- `GET /api/calls/presign` called per chunk — presigned URL used for S3 PUT
- `react-native-background-upload` used for upload — survives app backgrounding
- Exponential backoff retry: 30s, 2m, 10m, 30m, 2h — max 5 attempts
- `POST /api/calls/upload-complete` called after all chunks uploaded
- Queue status widget on `HomeScreen`: "N calls pending upload" / "All caught up"
- Startup reconciliation: scan filesystem for orphaned `.aac` files, re-add to queue
- Network event listener: upload manager fires on connectivity restored

**Acceptance criteria:**
- Record in airplane mode → enable wifi → call uploads and `upload-complete` fires without manual intervention
- Force-close app mid-upload → reopen → upload resumes from where it left off (no duplicate uploads)
- Max retry queue state shown in UI: "Upload failed — Retry?" button functional
- `pnpm typecheck` passes — no TypeScript errors in upload manager

**Dependencies from backend:**
- `GET /api/calls/presign` endpoint
- `POST /api/calls/upload-complete` endpoint (enqueues BullMQ job)

---

### Week 5 — No Mobile Sprint

Backend-heavy week (rules engine). Mobile is dependency-free this week.

**Mobile tasks (supporting):**
- Drain Right device audit results processed — build device compatibility matrix
- Test recording on every real device model identified in the audit
- Document any OEM-specific battery optimization issues found (Samsung, Xiaomi, etc.)
- Fix any Week 3/4 bugs surfaced on non-primary test devices
- Finalize `react-native-track-player` integration plan for clip playback in Week 7

---

### Week 6 — No Mobile Sprint

Backend-heavy week (LLM layer + score assembly). Mobile is dependency-free this week.

**Mobile tasks (supporting):**
- Build synthetic call notification test: manually trigger a `call_ready` FCM notification and verify deep link routing to `CallSummaryScreen`
- Wire up `CallSummaryScreen` shell with static mock data — layout, color coding, opportunity card structure
- Complete `DisputeModal` component (all 5 reason options, free text for "Other", submit wired to `POST /api/opportunities/:id/dispute`)
- Fix any backlog from Weeks 3–4

---

### Week 7 — Push Notifications, Post-Call Summary, Clip Playback

**Goal:** The full tech loop closes. Record → process → push notification → open app → see score. This is the moment the product becomes real.

**Mobile deliverables:**
- FCM integration: `@react-native-firebase/messaging` permission request on app open, token registration via `POST /api/notifications/register`
- `call_ready` push notification received → tapping opens `CallSummaryScreen` with correct `callId`
- `CallSummaryScreen` fully implemented:
  - Overall score (color-coded)
  - Estimated opportunity total + footnote
  - Job context (customer name, job type, date)
  - Opportunity cards (trigger description, clip play button, dollar value, "Not Applicable" button)
  - Coaching points with "Mark as reviewed"
  - Confidence gating: < 0.85 confidence items not shown
- `ClipPlayer` component: load audio from presigned URL, seek to `clip_start_sec`, play 60-second window, waveform or progress bar
- `DisputeModal` connected to `POST /api/opportunities/:id/dispute`
- Personal call history (`CallHistoryScreen`): list of tech's calls, tap → `CallDetailScreen`
- `CallDetailScreen`: full score breakdown, audio player (full call), synchronized transcript (tap segment → seek)
- Foreground notification handling: in-app banner for `call_ready` while app is open

**Acceptance criteria:**
- End-to-end: record a real call → upload completes → within 5 minutes → push notification received → tap → `CallSummaryScreen` shows correct score and opportunities
- `ClipPlayer` plays the correct 60-second audio window from S3 without downloading the full file (range request or seek)
- Dispute submitted → confirmed by server → card greyed out in UI
- `pnpm typecheck` passes

**Dependencies from backend:**
- Full scoring pipeline complete (worker: transcription → scoring → write to Neon → FCM push)
- `GET /api/calls/:id` returning transcript + score + opportunities
- `GET /api/calls/:id/audio` returning presigned URL
- `POST /api/opportunities/:id/dispute` endpoint

---

### Week 8 — Call History Completion, Notification Polish

**Goal:** Call history is fully usable. All notification types wired. Foreground and background notification handling solid.

**Mobile deliverables:**
- `CallHistoryScreen` date filter: this week / last week / this month
- `CallDetailScreen` complete: waveform audio player, synchronized transcript (segment tap → seek), opportunity markers on waveform at trigger timestamps
- All notification types handled: `badge_earned`, `streak_milestone`, `weekly_stats`, `payment_failed`
- Deep links for all notification types validated
- In-app notification list: `GET /api/notifications`, unread count badge on tab
- Payment failed in-app banner: shown on `HomeScreen` when `company.paymentFailed = true`
- App backgrounding during scoring (PENDING_ANALYSIS state): app polls for status change or receives push — either path navigates to `CallSummaryScreen` correctly

**Acceptance criteria:**
- All 6 notification types received and routed correctly in both foreground and background states
- Deep link from killed app state (cold start) navigates to correct screen
- Date filter on `CallHistoryScreen` works correctly for all 3 options

**Dependencies from backend:**
- `GET /api/notifications` endpoint
- `POST /api/notifications/register` endpoint
- Stripe webhook → `company.payment_failed` flag (available from `GET /api/team/me`)

---

### Week 9 — No Mobile Sprint (Pricebook & Admin — Backend)

**Mobile tasks (supporting):**
- `JobTaggingScreen` — verify job type selection correctly flows to scoring model on backend
- Test pricebook changes in owner web dashboard → verify dollar figures update in `CallSummaryScreen` opportunity values
- Regression test full recording → upload → score → summary flow on all Drain Right device models
- Begin TestFlight distribution: `eas build --platform ios --profile preview` → upload to TestFlight → invite internal testers (you + one test tech)

---

### Week 10 — Gamification, Payment Failed Banner, and Billing Integration

**Goal:** All gamification features live. Billing integration reflected in mobile UI.

**Mobile deliverables:**
- Streak tracking display: `ProfileScreen` shows current streak count, milestone badge at 3/7/14
- Personal bests display: highest score, longest streak, best 7-day average
- Badge shelf: `ProfileScreen` shows all 4 Phase 1 badges — earned (full color) vs. locked (greyed out with criteria shown on tap)
- Badge earned notification: `badge_earned` push → animated badge grant overlay on current screen
- Streak milestone notification: `streak_milestone` push → in-app prompt
- Payment failed in-app banner (persistent on HomeScreen, dismissable only by resolving payment):
  - Copy: "Payment failed — update your payment method to keep recording. [Tap to resolve]"
  - Link: opens `kova://settings/billing` or external Stripe portal URL

**Gamification acceptance criteria:**
- Tech records 3 calls in Week 1 → Pioneer badge awarded → notification received → badge shown on `ProfileScreen`
- 5-call streak → in-app toast on 5th call summary: "5-call streak!"
- Personal bests update correctly after each scored call

**Dependencies from backend:**
- Badge award logic in worker (post-scoring)
- Streak calculation in worker (post-scoring)
- `MeResponse` includes badges, streak, personal bests
- Stripe webhook → `company.payment_failed` flag

---

### Week 11 — Onboarding, Activation, End-to-End Polish

**Goal:** A brand-new tech receives an SMS invite, downloads the app, completes onboarding, and records their first call — in < 35 minutes from the invite being sent.

**Mobile deliverables:**
- Full tech onboarding from SMS invite to first recording:
  - SMS contains App Store / Play Store link
  - App install → open → `PhoneScreen` (number pre-populated from SMS if deep link supports it)
  - `OTPScreen` → authenticated → intro screens (3 screens, skippable)
  - `HomeScreen` with Pioneer badge prompt front and center
- Empty states for every screen: `CallHistoryScreen` empty, `ProfileScreen` no badges yet, HomeScreen first launch
- Error handling across all API calls: network errors, server errors, timeout errors — each handled gracefully with user-appropriate messaging
- Loading states for all async operations (skeleton screens or spinners)
- Payment failed banner shows correctly in staging environment with a Stripe test failed payment

**Cross-language score parity display:** If a call is detected as Spanish-primary (`language = 'es'`), the `CallSummaryScreen` shows coaching point language as detected (English only in Phase 1 — Spanish coaching card Phase 2). Verify Spanish-detected calls display correctly.

**End-to-end onboarding test:**
1. Founder creates a Drain Right tech account in the owner web dashboard
2. Tech receives SMS invite
3. Tech downloads app (TestFlight for iOS / Play Store internal track for Android)
4. Tech signs in via phone OTP
5. Tech completes intro screens
6. Tech records a 2-minute test call with consent
7. Tech sees scored summary within 5 minutes
8. Total elapsed time: < 35 minutes

**Acceptance criteria:**
- Onboarding test passes end-to-end in < 35 minutes on both iOS and Android
- All screens have appropriate empty states
- All network errors show user-friendly messages (not stack traces)
- `pnpm typecheck` passes with zero errors

---

### Week 12 — Drain Right Pilot Prep and Launch

**Goal:** All 16+ Drain Right techs onboarded. First calls scored. Monitoring active.

**Mobile deliverables:**
- Production builds submitted:
  - iOS: `eas build --platform ios --profile production` → submitted to App Store review (submit early — allow 1–3 days for review)
  - Android: `eas build --platform android --profile production` → uploaded to Play Store internal track
- All 16+ techs invited via SMS from the owner dashboard
- Confirmed: all 16+ techs have downloaded the app, signed in, and completed intro screens before go-live date
- First call scored together with Drain Right owner and a tech in the room
- Android OEM battery optimization prompts confirmed working on all Drain Right Android devices

**Monitoring during launch:**
- BullMQ Bull Board visible (Railway internal URL): confirm jobs processing
- FCM delivery rate visible in Firebase console
- Upload failures visible in Neon `calls` table (status = `upload_failed`)
- If any tech reports recording issues: reproduce on their specific device model before dismissing

**App Store / Play Store notes:**
- App Store review can take 1–7 days. Submit the production iOS build no later than end of Week 11.
- Play Store internal track approvals are same-day. Play Store production track requires a few days and a privacy policy URL.
- Phase 1: distribute via TestFlight (iOS) and Play Store internal track (Android). Full public store listing in Phase 2.

---

## 11. Testing Strategy

### 11.1 Unit Tests

**What to unit test in mobile:**
- Zustand stores: recording state machine transitions — every valid and invalid transition
- MMKV queue operations: add chunk, remove chunk, orphan detection, MMKV read failure
- Upload manager: retry logic, exponential backoff timing, chunk ordering
- `apiRequest` client: auth header injection, error handling, Zod validation
- Display formatting utilities: score color coding, opportunity dollar formatting, duration formatting

**What NOT to unit test in mobile:**
- Screen rendering — use acceptance criteria on real devices instead
- Native module behavior — unit tests can't run native code
- Navigation — integration tested via real device flows

**Framework:** Jest + `@testing-library/react-native`. Run in CI on every PR.

**Target:** 80% coverage on the queue and state machine logic. These are the most critical and most unit-testable pieces.

### 11.2 Device Testing Matrix

Minimum device matrix for Phase 1 validation:

| Device | OS | Priority | Notes |
|---|---|---|---|
| iPhone 14 or 15 | iOS 17 | P0 | Primary development device |
| iPhone SE (3rd gen) | iOS 15 | P0 | Minimum iOS target |
| Samsung Galaxy S-series | Android 13+ | P0 | Drain Right fleet likely includes |
| Samsung Galaxy A-series (mid-range) | Android 11-12 | P0 | Highest risk for battery optimization issues |
| Pixel 6 or 7 | Android 13 | P1 | Clean Android baseline |
| Device from Drain Right audit | Varies | P0 | Must test on their specific models |

**P0 = must pass before launch. P1 = test but not a launch blocker.**

Background recording must pass on all P0 devices. Battery drain test on Samsung Galaxy A-series is the highest-risk validation.

### 11.3 Background Recording Validation Protocol

This protocol runs in Week 3 and again in Week 11 (regression before launch). Steps documented in §10 Week 3 above. Additional checks:

- Record while receiving an incoming phone call (iOS: does AVAudioSession interruption handling pause/resume correctly?)
- Record while walking through a cellular dead zone and returning (Android: does foreground service survive momentary connectivity loss?)
- Record while receiving a high-priority push notification (does the notification interrupt the recording?)
- Force-kill the app from the task switcher mid-recording (do chunks written so far survive?)

### 11.4 Battery Impact Testing Protocol

**Target:** < 30% battery consumed per hour of active recording on a mid-range Android device.

**Protocol:**
1. Fully charge device
2. Disable wifi (cellular only) to simulate field conditions
3. Start recording
4. At 30 minutes: note battery percentage
5. At 60 minutes: note battery percentage
6. Calculate % per hour
7. Document device model and OS version

**Pass criteria:** < 30% per hour on the P0 Android devices.

**If test fails:** Profile CPU usage during recording. Primary suspect: polling in the battery monitor or recording indicator animation. Reduce polling frequency (battery check every 60s not 10s). Disable waveform animation on low-end devices.

### 11.5 Offline Queue Stress Test Protocol

Run before Week 12 launch:

1. **No-connectivity upload:** Record 3 calls in airplane mode. Enable wifi. Verify all 3 upload without manual intervention.
2. **Mid-upload kill:** Start upload. Kill app from task switcher at 50% progress. Reopen. Verify upload resumes.
3. **Server 500 during upload:** Mock server 500 on presign endpoint. Verify retry kicks in, backoff works, eventual success when server recovers.
4. **MMKV queue with 20 chunks:** Record 4 × 30-minute calls without uploading. Verify queue handles 20+ chunk entries correctly. Upload all.
5. **Low storage simulation:** Fill device to < 200MB free. Attempt recording. Verify error handling if file write fails.

### 11.6 CI Integration

```yaml
# .github/workflows/ci.yml (mobile-specific steps)
- name: TypeScript check
  run: pnpm --filter mobile typecheck

- name: Unit tests
  run: pnpm --filter mobile test

- name: Lint
  run: pnpm --filter mobile lint
```

EAS Build runs on manual trigger (not every PR — builds take 10–20 minutes and are cost-limited).

---

## 12. Build and Distribution

### 12.1 EAS Build Profiles

```json
// eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": false },
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false },
      "android": { "buildType": "apk" },
      "env": { "APP_ENV": "staging" }
    },
    "production": {
      "ios": { "simulator": false },
      "android": { "buildType": "app-bundle" },
      "env": { "APP_ENV": "production" }
    }
  }
}
```

| Profile | Purpose | Distribution |
|---|---|---|
| `development` | Daily development with hot reload | Shared link (EAS internal) |
| `preview` | Staging builds for QA and design partner testing | TestFlight (iOS), Play Store internal (Android) |
| `production` | Drain Right launch and beyond | App Store (iOS), Play Store (Android) |

### 12.2 iOS Distribution

- **Development:** EAS custom dev client installed via `eas build --profile development`
- **TestFlight:** `preview` builds uploaded to TestFlight via `eas submit -p ios`. Invite internal testers (founders + Drain Right test tech) in Week 9.
- **App Store:** `production` build submitted no later than end of Week 11. App Store review average: 1–3 days, can be up to 7 days.
- **App Store listing requirements:** Privacy policy URL (required before submission), screenshot set for 6.7" and 5.5" displays, app description.

**App Store Review preparation:**
- Microphone usage description must match actual use — "Kova records service calls to help technicians track performance."
- Background audio mode must be declared in the submission
- Reviewers will check: does the app present a consent prompt before recording? Yes — `ConsentModal` satisfies this.

### 12.3 Android Distribution

- **Development:** APK installed directly via `adb install` or EAS internal distribution
- **Play Store internal track:** `preview` builds uploaded via `eas submit -p android`. No review required — available immediately to internal testers.
- **Play Store production:** `production` app bundle submitted after Phase 1 launch. Requires: privacy policy URL, data safety form completion, content rating questionnaire.

**Data safety form fields for Android:**
- Data collected: name, phone number, audio recordings — collected yes, encrypted in transit yes, encrypted at rest yes
- Data shared: with third-party service providers (Deepgram, OpenAI, AWS) — yes, for core functionality
- Data deletion: user can request deletion via email to privacy@kovahq.com (Phase 1 manual; Phase 2 in-app)

### 12.4 OTA Updates (EAS Update)

EAS Update allows pushing JavaScript bundle updates (UI changes, bug fixes) without going through App Store review.

**When OTA is appropriate:**
- UI copy changes
- Bug fixes that don't require native code changes
- New feature flags or configuration changes

**When a native build is required:**
- Any change to native modules (adding/updating a library with native linking)
- Changes to `Info.plist`, `AndroidManifest.xml`, or `app.json` native fields
- React Native version bumps

**OTA channel strategy:**
```
eas update --branch production --message "Fix: queue widget count"
```
- `production` branch → Drain Right production installs
- `staging` branch → preview builds

### 12.5 Version Strategy

Format: `MAJOR.MINOR.PATCH`
- **MAJOR:** Breaking changes (new native build required for all users)
- **MINOR:** New features (may or may not require native build)
- **PATCH:** Bug fixes (OTA if no native changes)

Phase 1 starts at `1.0.0`. First public launch = `1.0.0`.

---

## 13. Risk Register (Mobile-Specific)

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Background recording unreliable on Android** | High | Critical | Week 3 hard gate. Contingency: iOS-only soft launch for 2 weeks while Android is debugged. Do not launch Android with unreliable background recording under any circumstances. |
| **OEM battery optimization kills foreground service** | High | High | Prompt affected OEM users (Samsung, Xiaomi, Oppo) to disable battery optimization for Kova during onboarding (IntroScreen3, Android-only). Test on each Drain Right Android device model before launch. |
| **react-native-audio-api instability** | Medium | Critical | Library is actively maintained by Software Mansion (who also maintains react-native-reanimated and react-native-gesture-handler — high-quality team). Pin version at Week 1. Do not update unless a critical bug is fixed. Have a contingency plan: `react-native-audio-recorder-player` as a fallback (more established, less feature-rich). |
| **Android fragmentation (audio quality on specific devices)** | Medium | Medium | Week 1 phone audit determines specific Drain Right device models. Test on each before launch. Samsung MediaCodec has known quirks with AAC-LC at certain sample rates — confirm 44.1kHz works on all fleet devices. |
| **Offline queue MMKV corruption** | Low | High | MMKV is extremely fast and stable (used in production by many large apps). Risk is low but consequence is high (lost call data). Startup reconciliation pass (§6.3) recovers from most corruption scenarios. Test explicitly in §11.5 protocol. |
| **App Store review rejection** | Low | Medium | Submit to App Store no later than end of Week 11. Common rejection reasons: missing privacy policy, unclear microphone usage description, recording without explicit consent UI. All three are addressed. If rejected, typical turnaround with fixes is 2–3 days. |
| **FCM delivery failure on iOS** | Low | Medium | FCM requires APNs auth key configured in Firebase. Validate FCM delivery on real iOS device in Week 7 before assuming it works. Fallback: if FCM delivery is unreliable on iOS, fall back to direct APNs integration. |
| **Consent log API unavailable when tech tries to start recording** | Low | High | Consent log must succeed before recording starts (§5.4). If the API is down: show error "Could not start recording — please check your connection." Do not start recording without a confirmed consent timestamp. This is non-negotiable. |
| **Clip playback causes excessive S3 bandwidth cost** | Low | Low | Clip playback uses presigned URLs with range requests (seek to `clip_start_sec`). Full audio download only occurs in `CallDetailScreen`. Monitor S3 bandwidth in Neon `processing_costs` table. Phase 2: implement clip extraction server-side to serve only the relevant 60-second window. |
| **Tech loses phone mid-recording** | Very Low | High | Chunks already written to filesystem before phone loss are unrecoverable (device is gone). Mitigation: recording rotation means at most 5 minutes of audio is lost. Queue in MMKV is also gone. No further mitigation is practical — this is an acceptable edge case. |

---

## 14. Phase 2 Mobile Preview

Not sprint-planned in this document. Listed here for reference so Phase 2 work can be anticipated in Phase 1 architecture decisions. None of these should be built in Phase 1.

| Feature | Trigger | Notes |
|---|---|---|
| **Auto-record on arrival (geofence)** | Phase 2 kickoff (Month 3) | GPS geofence primes the app; tech still taps ConsentModal. Eliminates "forgot to record." Requires significant testing on low-battery devices. |
| **Pre-call intelligence card** | Phase 2 — requires ST integration | Brief pushed to tech on dispatch. Shown as a card on `HomeScreen` before recording starts. Requires `GET /api/jobs/:id/brief` endpoint. |
| **Spanish mobile UI** | Phase 2 | Full i18n via `react-i18next`. English strings extracted to `en.json`; `es.json` added. Language preference stored per user. |
| **Full badge set** | Phase 2 | Expanded badge criteria (consistency, improvement, language parity). Badge detail screens with progress tracking. |
| **Leaderboard (team-facing)** | Phase 2 | Owner-toggleable. Personal bests first; team comparison second. |
| **Clip sharing** | Phase 2 | Expiring secure links generated server-side. Tech can share a clip with manager or owner via message. |
| **Field manager mobile view** | Phase 2 | `field_manager` role sees a manager tab: team recording compliance, call review queue. Currently manager-role users see the tech view. |
| **Real-time in-call coaching** | Year 2 | Live streaming audio → real-time transcript → alert to tech's phone during the call. High technical complexity, high distraction risk. Do not design Phase 1 architecture to constrain this. |

---

## 15. Open Decisions (Mobile-Specific)

Items that must be resolved before or during Phase 1 that are not yet decided.

### Before Phase 1 Kickoff

| Decision | Options | Deadline | Owner |
|---|---|---|---|
| **Expo custom dev client vs. React Native CLI bare** | Expo gives EAS tooling and OTA updates out-of-the-box. RN CLI gives maximum control. If any native module is incompatible with Expo's custom dev client, RN CLI is the fallback. | Week 1, Day 1 | Engineering |
| **Clip playback implementation** | Option A: `react-native-track-player` (full-featured, background playback). Option B: `react-native-audio-api` playback mode. Option C: Expo AV (if using Expo). Option A is recommended — track-player is battle-tested for gapless playback and lock screen controls. | Week 6 | Engineering |

### Before Week 7

| Decision | Options | Deadline | Owner |
|---|---|---|---|
| **App Store listing for Phase 1** | Option A: Full public App Store listing (anyone can download). Option B: TestFlight only for Phase 1 (invite-only). TestFlight is simpler and avoids App Store review complexity for the pilot. | Week 7 | Founder |
| **Android distribution for Phase 1** | Option A: Play Store internal track (invite-only). Option B: Direct APK install. Play Store internal track is cleaner for 16+ techs. | Week 7 | Founder |

### External Dependencies to Track

| Item | Status | Follow-up |
|---|---|---|
| Drain Right device audit | Action in Week 1 — confirm exact iOS and Android models in fleet | Determines Android testing urgency |
| CA privacy attorney — consent modal validation | Schedule Week 1, consultation Week 3 | Required before first recording from Drain Right tech |
| APNs push certificate for Firebase | Requires Apple Developer account and APNs key created | Needed before Week 7 FCM integration |
| Firebase project creation | Create before Week 7 | `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) needed |

---

*Document version: v1*
*Status: Living document — update prior to each week's mobile sprint kickoff*
*Date: May 2026*
*Parent: `docs/development/development-plan-v2.md`*
*Phase 2 kickoff: update this document at Month 3 to incorporate geofence, Spanish UI, pre-call intelligence, and manager mobile view*
*See `docs/product/product-brief-v1.md` for full product requirements*
*See `docs/product/product-strategy-v1.md` for legal compliance and risk details*
