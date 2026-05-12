# Kova — Mobile Development Plan v2

*Document scope: React Native mobile app, Phase 1 only (Weeks 1–12). Covers the technician-facing iOS and Android application — recording engine, offline queue, post-call summary, gamification, auth, and push notifications.*

*Document version: v2*
*Status: Living document — update prior to each sprint kickoff*
*Date: May 2026*
*Supersedes: `docs/development/development-plan-mobile-v1.md`*
*Parent document: `docs/development/development-plan-v2.md` — all unresolved questions defer to v2*
*Product requirements: `docs/product/product-brief-v1.md`*
*Legal/compliance: `docs/product/product-strategy-v1.md`*

> **Relationship to dev-plan-v2:** This document expands the mobile-specific sections of dev-plan-v2 into a standalone reference. Where the two documents conflict, dev-plan-v2 wins. Where this document adds detail not present in dev-plan-v2, this document is authoritative for mobile. Do not make mobile architecture decisions from dev-plan-v2 alone — always cross-reference here.

---

## 0. What Changed from v1 — Change Log

This section documents every material change from v1, why it changed, and what it means for execution. If v1 and v2 say different things, v2 wins.

### 0.1 SDK Upgrade: Expo SDK 52 → SDK 55

| Item | v1 | v2 | Reason |
|---|---|---|---|
| Expo SDK | 52 | **55** | Greenfield project — zero migration cost. SDK 52 is 3 versions behind as of May 2026. SDK 55 is the current stable release. |
| React Native | 0.76 | **0.83** | Ships with SDK 55 |
| React | 18 | **19.2** | Ships with SDK 55 |
| expo-router | v4.0.0 | **v55.0.14** | SDK 55 adopted SDK-aligned versioning |
| New Architecture | Optional | **Mandatory** | SDK 55 removes the legacy arch flag entirely |
| Min iOS | 15.0 | **15.1** | SDK 55 minimum |

### 0.2 Library Replacements

| Removed | Replacement | Reason |
|---|---|---|
| `@notifee/react-native` | `expo-notifications` v55.0.22 | @notifee was archived by Invertase in April 2026 — no further maintenance or security patches. |
| `react-native-background-upload` | `tus-js-client` v4.3.1 | react-native-background-upload has been abandoned since October 2022 — last commit 2.5 years before launch. |
| `react-native-track-player` | `react-native-audio-api` built-in playback | react-native-track-player v5 changed to a commercial license. react-native-audio-api provides playback natively in the same library already used for recording. No additional dependency required. |
| `@react-native-firebase/app` + `@react-native-firebase/messaging` | `expo-notifications` (FCM integration built in) | expo-notifications handles FCM registration and message receipt natively in SDK 55. The full Firebase SDK is no longer needed on the mobile side. Backend continues to use `firebase-admin` — no change there. |

**New dependency added:** `react-native-nitro-modules` — required as a peer dependency of `react-native-mmkv` v4. Not present in v1 because v1 targeted mmkv v2.x.

### 0.3 Factual Corrections from v1

| v1 Error | Correction | Impact |
|---|---|---|
| §5.1 shows W3C `getUserMedia()` + `AudioContext` + `MediaRecorder` as the recording API | `react-native-audio-api` uses its own `AudioRecorder` class. `MediaRecorder` is a W3C Web API that does not exist in React Native. The `AudioContext` graph IS correct — the recording interface is not. | Architecture diagram corrected in §6.1. |
| §1.2 + §5.3: "FOREGROUND_SERVICE_MICROPHONE permission is unavailable below API 29" | `FOREGROUND_SERVICE_MICROPHONE` is a **runtime permission** added in API 34 (Android 14). API 29 (Android 10) only introduced the `foregroundServiceType="microphone"` **manifest attribute** — a different mechanism. The manifest attribute requires API 29+; the runtime permission requires API 34+. | §6.3 and §2.4 corrected. |
| §2.2: `@react-navigation` version listed as "≥ 6.x" | `@react-navigation` v7 has been the correct version since expo-router v4 (SDK 52). v6 is not used. | Library table corrected. |

**Cross-document error (dev-plan-v2 §3.1):** dev-plan-v2 states "~2 MB/hr" for the AAC-LC 32kbps recording format. This is wrong by a factor of 7. The correct figure is ~14 MB/hr (32kbps × 3600s ÷ 8 bits/byte = 14.4 MB). The mobile-v1 document has this correct at "~14 MB/hour." See Appendix B.

### 0.4 Architectural Changes

| Change | Detail |
|---|---|
| **Offline-first consent logging** | v1 required the `POST /api/calls/consent` server call to succeed before recording could start — this blocked recording in basements and areas with no signal. v2 logs consent to MMKV immediately with a device timestamp, then syncs to the server when connectivity is available. Recording starts immediately after the local MMKV write. The device timestamp is the legally relevant timestamp. |
| **Sentry from Week 1** | v1 deferred Sentry to Phase 2. For a recording engine running in the background, crash data and background errors are invisible without Sentry. `@sentry/react-native` v8.11.0 is installed in Week 1, not Phase 2. |
| **Concurrent recording guard** | v1 does not address what happens if a tech somehow starts two recording sessions. v2 adds an explicit guard — if a recording session is already active (MMKV queue has a session in `recording` status), attempting to start a new one shows an error and requires the existing session to be stopped first. |
| **Disk space check** | v1 does not check available storage before recording. v2 checks for at least 200 MB of free space before allowing recording to start. If storage is insufficient, the tech sees a clear error. |
| **Audio level meter** | RecordingScreen in v2 includes a real-time audio level meter (VU meter) using `AudioContext` AnalyserNode. Gives the tech immediate feedback that the microphone is picking up audio. |
| **Bluetooth audio routing** | v2 adds Bluetooth headset detection and microphone routing. If a Bluetooth headset is connected, the recording engine prefers the Bluetooth mic input. |
| **Multi-org Clerk guard** | Phase 1 techs belong to exactly one Clerk Organization. On app open, if the authenticated user has multiple org memberships, the app shows an error screen and prompts them to contact their administrator. Prevents cross-tenant data confusion. |
| **Streak timezone handling** | v2 explicitly documents that streak resets happen at midnight in the tech's local device timezone, not UTC. The streak calculation uses the tech's `language_pref` timezone (or device timezone as fallback). |
| **App version forcing** | v2 adds a hard update check: on app open, if the running app version is below `minimum_app_version` (returned from `GET /api/team/me`), show a non-dismissable "Update Required" screen with a link to the store. |

### 0.5 Open Decisions Resolved from v1

| v1 Open Decision | v2 Resolution |
|---|---|
| Expo custom dev client vs. React Native CLI bare | **Expo development build** (Expo SDK 55 replaces "custom dev client" terminology with "development build"). EAS Build, EAS Update, and the Expo toolchain. If any native module causes incompatibility, fall back to bare React Native CLI. Decide Week 1, document it, do not revisit. |
| Clip playback implementation | **react-native-audio-api built-in playback.** react-native-track-player eliminated (commercial license). `react-native-audio-api` supports both recording and playback — no additional library needed. |

---

## 1. Summary

The mobile app is the primary product surface for Kova's end users — the technicians. Owners interact with a web dashboard; techs live in the mobile app. The mobile app must do three things well:

1. **Record service calls reliably** in the background, with no data loss, on both iOS and Android.
2. **Deliver a scored summary within 5 minutes** of the call ending so the tech sees feedback before leaving the job site.
3. **Make recording feel worth doing** — through feedback, streaks, badges, and scores that make the experience rewarding rather than surveillance-like.

Everything else in the mobile app is secondary. If background recording is unreliable, nothing else matters.

**Phase 1 success condition (mobile):**
> 16+ Drain Right techs recording ≥ 65% of dispatched jobs with zero call data loss and < 5 minute time-to-summary.

**Week 3 is the critical gate.** Background recording must be validated on real hardware before Week 4 begins. If it fails, all subsequent work stops until it is fixed.

---

## 2. Constraints

These are non-negotiable. Every architecture decision is made inside these boundaries.

### 2.1 Pilot Constraints

| Constraint | Detail |
|---|---|
| **iOS + Android parity on Day 1** | Drain Right has a mixed iOS/Android fleet. "Android later" is not an option. Both platforms must work on launch day. |
| **16+ technicians** | Phase 1 must handle 16 concurrent users. Not a scaling challenge — a reliability challenge. Each tech needs to independently record, queue, and upload without affecting others. |
| **~640 calls/month** | ~4 calls/tech/day, ~30-minute average duration. This is the load model. |
| **California two-party consent** | Cal. Penal Code §632. Consent must be logged with a timestamp before a single byte of audio is written to disk. In v2, this log is written to MMKV on the device immediately and synced to the server when connectivity allows. The device timestamp is the legally relevant record. |
| **Mixed connectivity** | Techs work in basements, crawl spaces, and areas with poor signal. The app must record and queue locally when offline and upload when connectivity returns. This constraint is the direct reason v2 moved to offline-first consent logging. |
| **Android foreground service** | Android requires a visible persistent notification while background audio recording is active. This is an OS requirement — it cannot be bypassed or hidden. |

### 2.2 Engineering Constraints

| Constraint | Detail |
|---|---|
| **Solo founder** | No dedicated mobile engineer. Architecture must be straightforward enough to debug alone at 11pm when a tech calls to say recordings aren't uploading. |
| **Expo development build (not Expo Go)** | `react-native-audio-api` requires native modules that are incompatible with Expo Go. The app uses a custom Expo development build from Week 1. Expo managed workflow is explicitly excluded. |
| **TypeScript everywhere** | Mobile, web, and backend share types from `packages/shared`. The mobile app uses TypeScript throughout — no JavaScript files. |
| **New Architecture mandatory** | SDK 55 removes the option to use the legacy React Native architecture. The app uses the New Architecture (Fabric + TurboModules) exclusively. All native modules must be New Architecture-compatible. |
| **Minimum OS targets** | iOS 15.1+ (SDK 55 minimum; covers 99%+ of active devices). Android API 29+ (Android 10+). See §2.4 for the Android permission API level distinction. |
| **AAC-LC 32kbps mono** | Recording format. Natively supported on iOS (AVFoundation) and Android (MediaCodec). Accepted directly by Deepgram and AssemblyAI without server-side transcode. **~14 MB/hour.** No codec server overhead. |

### 2.3 What the Mobile App Does NOT Do in Phase 1

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

## 3. Tech Stack

### 3.1 Framework

**React Native with Expo SDK 55 (development build) — confirmed.**

The framework decision is settled in dev-plan-v2 §3.1. Key points for SDK 55:

- `react-native-audio-api` v0.12.1 provides background recording to file, recording rotation (chunking), and playback. These are confirmed shipped features in the v0.12 release.
- SDK 55 mandates the New Architecture. All native modules in the library table have been validated against React Native 0.83 / New Architecture.
- Full-stack TypeScript: shared types with web dashboard and backend. One language, one linter config, one mental model for a solo founder.
- Expo Go cannot be used — native modules require a custom development build. Use `eas build --profile development` from Day 1.

**Preferred approach:** Expo development build. This gives EAS Build (iOS/Android cloud builds), EAS Update (OTA JS bundle updates), and the Expo dev tools. If any native module is incompatible with the Expo development build, fall back to React Native CLI bare workflow. Make this call in Week 1 and document it — do not revisit after that.

**Note on `expo-audio` as an alternative:** SDK 55 introduced background recording support and foreground service management in `expo-audio`. This is a viable alternative to `react-native-audio-api` for basic recording use cases. `react-native-audio-api` is chosen as the primary library because it provides the full Web Audio API graph (AudioContext, nodes, filters, worklets) needed for the real-time audio level meter and future audio processing. If `react-native-audio-api` causes integration issues during Week 3, `expo-audio` is the first fallback to evaluate.

### 3.2 Library Table

| Library | Version | Purpose | Native Link |
|---|---|---|---|
| `react-native-audio-api` | 0.12.1 | Background audio recording, recording rotation, playback, AudioContext graph | Yes |
| `@clerk/clerk-expo` | 2.19.31 | Auth — phone OTP, session management, JWT | No |
| `react-native-fs` | ≥ 2.20 | Filesystem access for local chunk storage | Yes |
| `react-native-mmkv` | 4.3.1 | Queue state persistence — survives app restarts | Yes |
| `react-native-nitro-modules` | ≥ 0.20 | Peer dependency of react-native-mmkv v4 | Yes |
| `tus-js-client` | 4.3.1 | Resumable chunked upload to the upload endpoint with retry | No |
| `expo-notifications` | 55.0.22 | Android foreground service notification; iOS + Android push notification receipt; local notifications | Yes (config plugin) |
| `zustand` | 5.0.13 | Local UI state management | No |
| `@tanstack/react-query` | ≥ 5.x | Server state, API data fetching, cache | No |
| `zod` | ≥ 3.x | Runtime schema validation (shared with backend from `packages/shared`) | No |
| `@react-navigation/native` | 7.x | Navigation container | Yes (peer deps) |
| `@react-navigation/native-stack` | 7.x | Stack navigator | No |
| `@react-navigation/bottom-tabs` | 7.x | Tab navigator | No |
| `react-native-safe-area-context` | ≥ 4.x | Safe area insets | Yes |
| `react-native-screens` | ≥ 3.x | Native screen optimization | Yes |
| `react-native-reanimated` | ≥ 3.x | Smooth recording indicator animation | Yes |
| `react-native-device-info` | 15.0.2 | Battery level, device model, OS version | Yes |
| `@react-native-community/netinfo` | 12.0.1 | Network connectivity detection | Yes |
| `@sentry/react-native` | 8.11.0 | Crash reporting, background error capture | Yes |

**Removed from v1 (see Appendix A):** `@notifee/react-native`, `@react-native-firebase/app`, `@react-native-firebase/messaging`, `react-native-background-upload`, `react-native-track-player`.

> **Version pins:** Lock all library versions in `package.json` (exact, not ranges) and commit `pnpm-lock.yaml`. `react-native-audio-api` is actively developed — do not auto-update without testing on both platforms. Pin it at Week 1, update intentionally.

### 3.3 Native Module Dependency Summary

Native modules requiring Xcode/Gradle changes or pod install:

```
react-native-audio-api         → Info.plist (NSMicrophoneUsageDescription, UIBackgroundModes:audio)
                                  AndroidManifest.xml (RECORD_AUDIO, FOREGROUND_SERVICE permissions + service declaration)
react-native-fs                → Standard auto-link
react-native-mmkv              → Standard auto-link (New Architecture compatible in v4)
react-native-nitro-modules     → Standard auto-link (peer dep of mmkv v4)
expo-notifications             → app.json config plugin (handles AndroidManifest, entitlements, google-services.json)
                                  google-services.json (Android), GoogleService-Info.plist (iOS) still required
react-native-reanimated        → babel.config.js plugin, Hermes required
react-native-screens           → Standard auto-link; MainActivity.kt extends ReactActivity
@sentry/react-native           → app.json config plugin (Sentry SDK)
react-native-device-info       → Standard auto-link
@react-native-community/netinfo → Standard auto-link
```

All native modules must be validated on real devices (not simulators) in Week 1 as part of initial scaffolding. A native module that works on simulator only is equivalent to not working.

### 3.4 Minimum OS Targets

| Platform | Minimum Version | Notes |
|---|---|---|
| iOS | 15.1 | SDK 55 hard minimum. Covers 99%+ of active iOS devices. AVAudioSession background recording API stable from iOS 13. |
| Android | 10 (API 29) | `foregroundServiceType="microphone"` manifest attribute requires API 29+. |
| Android (API 34 note) | 14 (API 34) | `FOREGROUND_SERVICE_MICROPHONE` **runtime permission** requires API 34+. For API 29–33, the manifest attribute alone is sufficient — the runtime permission does not exist. Handle this with a platform version check: request the permission only on API 34+ devices. |

---

## 4. Architecture

### 4.1 Folder Structure

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
│   │   │   ├── components/       RecordButton, RecordingIndicator, AudioLevelMeter, BatteryWarning
│   │   │   ├── hooks/            useRecordingEngine.ts, useOfflineQueue.ts, useBattery.ts, useAudioLevel.ts
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
│   │   ├── notifications.ts      Push token registration
│   │   └── types.ts              Re-export from packages/shared
│   ├── lib/
│   │   ├── constants.ts          Chunk duration, battery thresholds, upload retry config
│   │   ├── audio.ts              Audio format config, keyterms list
│   │   ├── device.ts             Platform utilities (iOS vs. Android branches)
│   │   ├── sentry.ts             Sentry initialization and error capture helpers
│   │   └── mmkv-url-storage.ts   Custom tus-js-client urlStorage backed by MMKV
│   └── App.tsx                   Root component, ClerkProvider, QueryClientProvider
├── android/
├── ios/
├── app.json                      Expo app config (SDK 55)
└── package.json
```

### 4.2 State Management Strategy

Three distinct state layers. Each layer owns a specific domain:

| Layer | Tool | What Lives Here | Persistence |
|---|---|---|---|
| **Local UI state** | Zustand | Recording session state, consent modal open/closed, current upload progress, battery level, audio level | In-memory (reset on app restart) |
| **Queue state** | Zustand + MMKV | Ordered list of pending chunks and their metadata, upload retry counts, unsynced consent events | MMKV — survives restarts and crashes |
| **Server state** | React Query | Call list, call detail/score, pricebook items, notifications, user profile | React Query cache (in-memory + optional persistence) |

**Rule:** Server data is never stored in Zustand. Local ephemeral UI state is never put in React Query. Queue state (which must survive crashes) is always backed by MMKV. This boundary is maintained strictly — crossing it creates debugging nightmares.

```typescript
// Zustand store — recording feature
// features/recording/stores/recordingStore.ts

interface RecordingState {
  sessionStatus: RecordingSessionStatus  // IDLE | CONSENT_SHOWN | RECORDING | PAUSED | STOPPED | UPLOADING | COMPLETE
  activeSessionId: string | null         // client-generated UUID
  currentChunkPath: string | null
  chunkStartedAt: Date | null
  batteryLevel: number
  isExternalMicConnected: boolean
  isBluetoothMicConnected: boolean
  uploadProgress: Record<string, UploadProgress>  // keyed by chunk filename
  audioLevelDb: number                   // current input level in dB, updated ~10x/sec
}

// MMKV-backed queue state — separate store
interface QueueState {
  pendingChunks: PendingChunk[]          // ordered, persisted
  failedChunks: FailedChunk[]            // retry eligible
  unsyncedConsentEvents: ConsentEvent[]  // consent logs awaiting server sync
}
```

### 4.3 Navigation Structure

```
RootNavigator
├── UpdateRequiredScreen (shown if app version < minimum_app_version)
├── AuthStack (shown if no Clerk session)
│   ├── PhoneScreen
│   └── OTPScreen
└── AppStack (shown if authenticated + single org membership)
    ├── MultiOrgErrorScreen (shown if user has > 1 org membership)
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

### 4.4 API Layer Pattern

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

### 4.5 Error Boundary Strategy

- Root-level `ErrorBoundary` catches unhandled render errors — shows a "Something went wrong — restart the app" screen with a restart button. All render errors are sent to Sentry.
- Recording-critical code paths (consent logging, chunk write, queue persistence) have explicit try/catch with `Sentry.captureException()`. A crash in the recording engine must be caught, reported, and never silently swallowed.
- Upload failures are not errors from the user's perspective — they are queue states. The upload manager handles retries; the user sees "Pending upload," not an error.
- Network errors in API calls surface as React Query error states in the UI. Each hook exposes `isError` and `error` for the screen to handle appropriately.

---

## 5. Screen Inventory

Complete list of Phase 1 screens with purpose and key interactions.

### 5.1 Auth Screens

**`PhoneScreen`**
- Purpose: Collect tech's phone number for Clerk OTP
- Input: Phone number (formatted, country-aware)
- Action: Clerk SDK `signIn.create()` → sends SMS OTP
- Edge cases: Invalid number format; Clerk rate limit (too many OTPs)
- No back button — this is the entry point

**`OTPScreen`**
- Purpose: Enter 6-digit SMS code
- Input: 6-digit OTP (auto-focus, auto-submit on 6th digit)
- Action: Clerk `signIn.attemptFirstFactor()` → session established
- Edge cases: Expired OTP, wrong code (3 attempts → re-send prompt), no SMS received
- On success: RootNavigator switches to AppStack

### 5.2 Intro Screens (First Launch Only)

**`IntroScreen1` — "What is Kova"**
- One illustration, 2-sentence explanation
- "Next" button; skippable via "Skip" in top right

**`IntroScreen2` — "How it helps you earn more"**
- One illustration: post-call summary with score and estimated opportunity highlighted
- "Next" button

**`IntroScreen3` — "How to record"**
- Animated illustration: tap Record → consent popup → recording indicator
- **Android-only:** Platform-detected prompt to disable battery optimization for Kova
- "Get Started" → sets `first_launch = false` in MMKV → navigates to HomeScreen
- Pioneer badge prompt: "Complete 3 recordings this week to earn the Pioneer badge"

### 5.3 Home Screen

**`HomeScreen`**
- Purpose: Primary daily surface. Must answer "did my last call get processed?" and "am I ready to record my next call?" at a glance.

**Top section:**
- Queue status widget: `2 calls pending upload`, `All caught up`
- Active badge/streak summary: current streak count, most recent badge
- Payment failed banner (if `company.paymentFailed = true`)
- Version update banner (if soft update available — new version but above minimum)

**Middle section (dominant):**
- Large `RecordButton` (120pt diameter, brand color)
- State-aware label: `Record`, `Recording...`, `Uploading...`
- Tap → shows `ConsentModal` if IDLE; shows error if another session is already active (concurrent recording guard)

**Bottom section:**
- Recent calls list: last 3 calls with score and opportunity total
- "View all" → `CallHistoryScreen`

### 5.4 Recording Screen

**`RecordingScreen`** (full-screen modal, shown while recording is active)

**Layout:**
- `AudioLevelMeter` component: real-time VU bar showing microphone input level — gives immediate confirmation that audio is being captured
- Recording indicator: pulsing circle (react-native-reanimated)
- Duration timer: live elapsed time counter
- Battery level indicator (prominent if < 30%)
- `Pause` / `Resume` button
- `Stop Recording` button (requires single intentional tap)
- Chunk status: subtle "Chunk saved" on each 5-minute rotation

**Battery warning overlay** (at 20%):
```
Low Battery (20%)
Recording quality may be affected.
Plug in if possible.
                [OK]
```

**Auto-pause at 15%** — recording pauses, local notification sent, overlay shown:
```
Recording Paused — Battery Critical
Plug in your phone and tap Resume.

[Resume]
```

### 5.5 Consent Modal

**`ConsentModal`** (full-screen, non-dismissable by back button or swipe)

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

**"Customer Consented" tap (v2 offline-first flow):**
1. Generate `callId` (UUID v4, client-side)
2. **Write consent event to MMKV immediately:** `{ callId, sessionId, techId, companyId, consentedAt: Date.now(), devicePlatform }`
3. Play 1-second audible tone
4. Start `react-native-audio-api` recording session
5. Transition `RecordingSession` state to `RECORDING`
6. Navigate to `RecordingScreen`
7. **In background:** attempt `POST /api/calls/consent` — if successful, mark consent event as synced in MMKV; if it fails, add to `unsyncedConsentEvents` queue for retry alongside audio upload

**"Customer Declined" tap:**
1. Attempt `POST /api/calls/decline`; if offline, queue for sync
2. `calls.decline_reason = 'customer_declined'`
3. Dismiss modal, return to `HomeScreen`

**Critical change from v1:** Recording no longer waits for server confirmation of consent before starting. The local MMKV write with device timestamp is the primary consent record. Server sync is required but non-blocking. This enables recording in offline conditions. See §0.4.

### 5.6 Job Tagging Screen

**`JobTaggingScreen`** (shown after "Stop Recording" tapped)

**Fields:**
- Customer name (free text, optional)
- Job type: `Drain`, `Plumbing`, `Both` (required)
- Notes (free text, optional, max 280 chars)
- "Submit" → creates job tag record, transitions queue to UPLOADING

**Dismissal:** "Do Later" dismisses without tagging. Reminder shown on next app open.

### 5.7 Non-Recording Reason Screen

**`NonRecordingReasonScreen`** (modal, shown when tech starts a new job without prior recording)

**Reason options:**
- "Customer declined recording"
- "Technical issue (battery or signal)"
- "Emergency call — no time"
- "Duplicate or incorrect dispatch"
- "Other (please describe)"

Logged to `calls.decline_reason`. Skipped reasons appear as "No reason logged" in manager view.

### 5.8 Call Summary Screen

**`CallSummaryScreen`** (pushed from deep link after push notification)

**Header:**
- Overall score: large number (0–100), color-coded (green ≥ 70, yellow 50–69, red < 50)
- Estimated opportunity total in large type
- Footnote: *"Estimated opportunity reflects your pricebook prices. Actual revenue potential depends on customer need, timing, and context."*
- Job context: customer name (if tagged), job type, date/time

**Opportunity list (per card):**
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
On submit: `POST /api/opportunities/:id/dispute`; card grayed out and marked "Reviewed"

**Coaching section (per point):**
```
Diagnosis Quality — 2/3
Strong: You identified the root cause clearly.
Improve: Consider explaining the long-term risk of not addressing it.

[Mark as Reviewed]
```

**Confidence gating:** Items with confidence < 0.85 not shown in tech view. Tech does not see a count of hidden items.

### 5.9 Call History Screen

**`CallHistoryScreen`**
- List of all tech's calls, most recent first
- Per-row: date, job type, duration, overall score (color-coded), estimated opportunity total, audio quality indicator
- Date filter: this week / last week / this month

**`CallDetailScreen`**
- Full score breakdown by dimension
- Audio player (waveform visualization, using react-native-audio-api playback)
- Synchronized transcript (tap a segment → audio seeks to that position)
- Opportunity markers on waveform at trigger timestamps
- Coaching points list with "Mark as reviewed" per item

### 5.10 Profile Screen

**`ProfileScreen`**
- Tech's name and phone number
- Active streak: "5-call streak — keep it going"
- Personal bests: highest score, longest streak, best 7-day average
- Badge shelf: earned badges (full color) vs. locked badges (greyed out with criteria)
- "View Settings" link

**`SettingsScreen`**
- Notification preferences toggle
- App version and build number
- "Sign Out" (Clerk sign-out)

### 5.11 Phase 1 Badge Set

| Badge | Criteria | Award Trigger |
|---|---|---|
| Pioneer | Complete 3 recordings in the first 7 days | Automatic after 3rd call processed in first week |
| First Call | Complete first scored call | Automatic after first `scored` call status |
| Perfect Score | 100/100 on any single call | Automatic after score written with `overall_score = 100` |
| Consistent | 7-day rolling average above 80 | Cron check or post-call calculation |

---

## 6. Recording Engine

The highest-risk, most critical subsystem. Everything else depends on this working.

### 6.1 Audio Pipeline Architecture

`react-native-audio-api` uses its own `AudioRecorder` class for recording. This is **not** the W3C `MediaRecorder` interface — it is a proprietary class specific to the library. The Web Audio API graph (`AudioContext`, audio nodes) is used separately for real-time audio level analysis during recording.

```
Microphone input (hardware)
      │
      ▼
react-native-audio-api
  ├── AudioRecorder                         → proprietary recording class
  │     ├── configure({ bitRate: 32000, sampleRate: 44100, channels: 1 })
  │     ├── startRecording(outputPath)      → begins writing AAC-LC to file
  │     ├── Recording rotation (v0.12)
  │     │     ├── Every 5 minutes → stop current chunk file
  │     │     ├── Write chunk → local filesystem (react-native-fs)
  │     │     ├── Add chunk metadata to MMKV queue
  │     │     └── startRecording(nextChunkPath)
  │     └── stopRecording()                 → finalizes current chunk file
  │
  └── AudioContext + AnalyserNode           → real-time audio level for VU meter
        ├── getUserMedia({ audio: true })   → MediaStream (separate from recording)
        ├── createMediaStreamSource(stream) → AudioNode
        └── createAnalyser()               → FFT data → AudioLevelMeter component

OS-level session management:
  iOS:  AVAudioSession.setCategory(.record, mode: .default)
                                   + .setActive(true)
        UIBackgroundModes: ['audio']

  Android: RecordingService (ForegroundService)
           foregroundServiceType: microphone
           Persistent notification via expo-notifications
```

**Audio format:** AAC-LC, 32kbps, mono, 44.1kHz sample rate.

- **AAC-LC:** Native codec on both iOS (AVFoundation) and Android (MediaCodec). No transcoding overhead.
- **32kbps mono:** Sufficient for speech intelligibility. Accepted directly by Deepgram and AssemblyAI.
- **44.1kHz:** Standard sample rate; avoids resampling artifacts.
- **File size:** ~14 MB/hour (32,000 bits/sec × 3600 sec ÷ 8 bits/byte = 14.4 MB/hr).

**Output file per chunk:** `call_{sessionId}_chunk_{n}_{timestamp}.aac`

### 6.2 iOS Configuration

**`Info.plist` additions (via Expo config plugin or manual):**
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
- Mix with others: enabled so an incoming phone call pauses recording gracefully rather than crashing
- Interruption handling: `AVAudioSessionInterruptionNotification` — on interruption (phone call), transition recording state to `PAUSED`; on interruption end, auto-resume if the tech had not manually stopped

**iOS microphone permission:** Request at first app launch, before showing the Home screen — not just-in-time before first recording. This avoids the permission dialog interrupting the consent flow.

**Wired earphone mic detection:**
- `AVAudioSession.currentRoute.inputs` — detect wired headset → prefer wired mic input automatically
- On Bluetooth headset connected: prefer Bluetooth mic (see §6.10)
- Indicator: "External mic active" shown in RecordingScreen

### 6.3 Android Configuration

**`AndroidManifest.xml` additions (via expo-notifications config plugin + manual entries):**
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />

<!-- FOREGROUND_SERVICE_MICROPHONE is a RUNTIME permission on API 34+ (Android 14+).
     On API 29–33, the manifest attribute alone is sufficient — this permission does not exist.
     Request it at runtime only on devices running API 34+. -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />

<service
  android:name=".RecordingService"
  android:foregroundServiceType="microphone"
  android:exported="false" />
```

**Runtime permission handling (API 34+):**
```typescript
// lib/device.ts
import { Platform } from 'react-native'
import * as Permissions from 'expo-permissions'  // or react-native built-in

async function requestRecordingPermissions() {
  if (Platform.OS === 'android' && Platform.Version >= 34) {
    // Request FOREGROUND_SERVICE_MICROPHONE only on Android 14+
    const { status } = await requestPermission('android.permission.FOREGROUND_SERVICE_MICROPHONE')
    if (status !== 'granted') {
      throw new PermissionError('FOREGROUND_SERVICE_MICROPHONE denied on API 34+')
    }
  }
  // RECORD_AUDIO is required on all Android versions
  const { status } = await requestPermission('android.permission.RECORD_AUDIO')
  if (status !== 'granted') {
    throw new PermissionError('RECORD_AUDIO permission denied')
  }
}
```

**Foreground service notification via expo-notifications:**

```typescript
// features/recording/hooks/useRecordingEngine.ts
import * as Notifications from 'expo-notifications'

const RECORDING_CHANNEL_ID = 'kova-recording'

async function showRecordingNotification() {
  await Notifications.setNotificationChannelAsync(RECORDING_CHANNEL_ID, {
    name: 'Recording Status',
    importance: Notifications.AndroidImportance.LOW,  // No sound, no heads-up
  })

  await Notifications.scheduleNotificationAsync({
    identifier: 'recording-active',
    content: {
      title: 'Kova — Recording Active',
      body: 'Recording in progress. Tap to return to the app.',
      sticky: true,           // Cannot be dismissed by the tech
      priority: 'low',
    },
    trigger: null,            // Immediate
  })
}

async function dismissRecordingNotification() {
  await Notifications.dismissNotificationAsync('recording-active')
}
```

**Foreground service integration note:** `react-native-audio-api` manages the Android foreground service for audio recording internally. `expo-notifications` creates the visible notification associated with that service. The integration between react-native-audio-api's foreground service and expo-notifications' sticky notification must be validated in Week 3. This is an explicit risk item — see §14.

**Android battery optimization:** Many Android OEMs (Samsung, Xiaomi, Oppo, OnePlus) aggressively kill background processes. In Week 1, build a device compatibility list from the Drain Right phone audit. For problematic OEMs, prompt the tech once during IntroScreen3 (Android-only) to disable battery optimization for Kova: `Settings → Battery → Kova → Don't Optimize`.

**Edge-to-edge (Android 16+):** SDK 55 makes edge-to-edge layouts mandatory for Android 16+. Ensure all screens account for system bar insets using `react-native-safe-area-context` — this is non-optional on Android 16+.

### 6.4 Recording Session State Machine

```
IDLE
  │ (tech taps Record button — concurrent recording guard: fail if another session is active)
  │ (disk space check: fail if < 200 MB free)
  ▼
CONSENT_SHOWN
  │ (tech taps "Customer Declined")     │ (tech taps "Customer Consented")
  ▼                                     ▼
IDLE (decline logged)           → Write consent to MMKV immediately (device timestamp)
                                  → Play tone
                                  → Start AudioRecorder session
                                  → POST /api/calls/consent (background, non-blocking)
                                  ▼
                              RECORDING
                                  │ (every 5 minutes)
                                  ├─ rotate chunk: write to FS, add to MMKV queue
                                  │ (battery reaches 15%)
                                  ├─ auto-pause → PAUSED
                                  │ (phone call interrupts — iOS AVAudioSession)
                                  ├─ pause → PAUSED (auto-resume when call ends)
                                  │ (Android phone call — AudioFocus loss)
                                  ├─ pause → PAUSED
                                  │ (Bluetooth headset disconnected mid-recording)
                                  ├─ pause → PAUSED, show "Mic disconnected" alert
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
  → write final chunk to FS queue
  → show JobTaggingScreen
  ▼
UPLOADING
  → upload manager picks up queue (see §7)
  → sync unsynced consent event if not yet confirmed
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

### 6.5 Battery Management

**Battery level source:** `react-native-device-info` `getBatteryLevel()` polled every 60 seconds during active recording (reduced from 30s to save battery).

| Battery Level | Action |
|---|---|
| > 30% | No action |
| 20–30% | Show in-app warning overlay: "Low battery (20%) — recording may be affected. Plug in if possible." |
| 15–20% | Warning persists; recording indicator changes color to amber |
| < 15% | Auto-pause recording. Show overlay. Send local push notification (expo-notifications local): "Kova recording paused — low battery." |

### 6.6 Recording Rotation (Chunking)

`react-native-audio-api` v0.12 supports recording rotation — chunking the recording into separate files at configurable intervals.

**Configuration:** 5-minute chunks. A 30-minute call produces 6 chunk files (~2.4 MB each at 32kbps AAC-LC).

**Purpose:** Crash resilience. If the app crashes or is force-killed mid-recording, only the current (partial) chunk is lost. All prior complete chunks are already written to the filesystem queue.

**Chunk file naming:** `call_{sessionId}_chunk_{n}_{timestamp}.aac`

**Chunk metadata (MMKV queue entry):**
```typescript
interface PendingChunk {
  chunkId: string
  sessionId: string
  chunkIndex: number
  filePath: string
  sizeBytes: number
  durationSec: number
  createdAt: string           // ISO8601 device timestamp
  uploadAttempts: number
  lastAttemptAt: string | null
  tusUploadUrl: string | null  // stored by MMKV urlStorage after first tus upload attempt
  status: 'pending' | 'uploading' | 'uploaded' | 'failed'
}
```

The `tusUploadUrl` field is new in v2 — it stores the tus upload URL for resuming interrupted uploads across app restarts. See §7.2.

### 6.7 Audio Level Meter

The `AudioLevelMeter` component gives the tech real-time confirmation that their microphone is picking up audio. Without this, techs have no way to know whether the mic is working until they see the transcription.

**Implementation:** Uses `AudioContext` and `AnalyserNode` (separate from `AudioRecorder`) to analyze the microphone input in real time.

```typescript
// features/recording/hooks/useAudioLevel.ts

// AudioContext is used for analysis only — not for recording.
// AudioRecorder handles the actual file write.
// Both operate on the same microphone source.

function useAudioLevel(isRecording: boolean) {
  const [levelDb, setLevelDb] = useState(-60)

  useEffect(() => {
    if (!isRecording) return
    // Attach AnalyserNode to mic stream
    // Poll FFT data ~10x/sec
    // Convert to dB and update levelDb
    const interval = setInterval(updateLevel, 100)
    return () => clearInterval(interval)
  }, [isRecording])

  return levelDb
}
```

The VU bar animates between -60 dB (silence) and 0 dB (clipping). Color coding: green for normal speech levels (-30 to -10 dB), amber for near-clipping (-10 to -3 dB), red for clipping above -3 dB.

### 6.8 Concurrent Recording Guard

Only one recording session can be active at a time. If a tech somehow attempts to start a second recording while one is already active (e.g., two taps, or an incomplete session in MMKV from a previous crash), the guard fires.

**Check on RecordButton tap:**
```typescript
// In useRecordingEngine.ts, before showing ConsentModal:
const existingSession = mmkvQueue.sessions.find(s => s.overallStatus === 'recording')
if (existingSession) {
  Alert.alert(
    'Recording Already Active',
    'You have an active recording session. Stop the current recording before starting a new one.',
    [{ text: 'OK' }]
  )
  return  // Do not proceed to ConsentModal
}
```

**On app startup reconciliation:** If MMKV contains a session with `overallStatus: 'recording'` and no `recordingStoppedAt`, show: "You have an incomplete recording — resume or discard?"

### 6.9 Disk Space Check

Check available storage before allowing recording to start. If storage is insufficient, inform the tech clearly before they begin a call.

**Threshold:** 200 MB minimum free space.

**Check timing:** On RecordButton tap, before showing ConsentModal.

**If insufficient:**
```
Not Enough Storage

Kova needs at least 200 MB of free space to record.
Your device currently has [X] MB available.

Free up space in your device settings, then try again.

[OK]
```

**Implementation:** `react-native-fs` provides `RNFS.getFSInfo()` which returns `{ freeSpace: number, totalSpace: number }`.

### 6.10 Bluetooth Audio Routing

**Bluetooth headset detection:**
- iOS: `AVAudioSession.currentRoute.inputs` — detect Bluetooth HFP input
- Android: `AudioManager.getDevices(GET_DEVICES_INPUTS)` — detect Bluetooth SCO input

**Behavior:**
- On Bluetooth headset connected: prefer Bluetooth mic input automatically; show "Bluetooth mic active" indicator in RecordingScreen
- On Bluetooth headset disconnected mid-recording: pause recording, show alert "Microphone disconnected — reconnect your headset or use your phone's mic"; offer "Continue with phone mic" option
- On "Continue with phone mic": switch audio source and resume recording

---

## 7. Offline-First Architecture

### 7.1 Design Principle

The offline queue is not a fallback — it is the primary data flow. Audio is always written locally first. Upload is always async. Consent is logged locally first and synced async. This means:

- A tech in a basement with no signal can record all day and obtain consent from every customer. Everything — audio and consent records — uploads when they drive back to the shop.
- A server outage does not lose call data or consent records. Everything is queued and retried.
- An app crash mid-recording loses at most one 5-minute chunk.

### 7.2 Upload Manager

The upload manager runs independently of the UI. It watches the MMKV queue and uploads pending chunks using `tus-js-client` as connectivity allows.

```
Upload Manager (runs on app open, on connectivity change, on job completion)

1. Read pending chunks and unsynced consent events from MMKV queue
2. Check network connectivity (@react-native-community/netinfo)
   → If offline: exit, subscribe to connectivity change event
   → If online: proceed
3. Sync any unsynced consent events first:
   → POST /api/calls/consent for each unsyncedConsentEvent
   → On success: mark as synced in MMKV
   → On failure: retry on next upload manager run
4. For each pending chunk (in order by chunkIndex):
   a. Create or resume tus upload:
      - Check MMKV urlStorage for existing tusUploadUrl for this chunk
      - If found: tus-js-client resumes from last byte
      - If not found: tus-js-client creates new upload to POST /api/calls/upload
   b. tus-js-client handles retry and progress tracking internally
   c. On success: update chunk status to 'uploaded' in MMKV
   d. On failure (after tus exhausts retries):
      → increment uploadAttempts, set lastAttemptAt
      → if attempts < 5: schedule retry (exponential backoff: 30s, 2m, 10m, 30m, 2h)
      → if attempts == 5: set status to 'failed', surface in UI
5. If all chunks for a session are 'uploaded':
   a. POST /api/calls/upload-complete { sessionId, chunkCount, totalDurationSec, jobMetadata }
   b. Remove chunks from MMKV queue
   c. Delete local chunk files from filesystem
   d. Set session status to 'PENDING_ANALYSIS' in Zustand store
```

**tus-js-client configuration:**
```typescript
// lib/mmkv-url-storage.ts
// Custom urlStorage backed by MMKV — required for upload resumability across app restarts.
// Without this, tus-js-client cannot resume uploads after the app is killed and reopened.
// (React Native has no Web Storage API, so the default tus urlStorage does not work.)

import { MMKV } from 'react-native-mmkv'

const mmkv = new MMKV({ id: 'tus-url-storage' })

export const mmkvUrlStorage = {
  getItem: async (key: string) => mmkv.getString(key) ?? null,
  setItem: async (key: string, value: string) => mmkv.set(key, value),
  removeItem: async (key: string) => mmkv.delete(key),
  getAllItems: async () => {
    const keys = mmkv.getAllKeys()
    return keys.map(key => [key, mmkv.getString(key)] as [string, string])
  },
}

// In the upload manager:
import { Upload } from 'tus-js-client'

function createChunkUpload(chunk: PendingChunk, authToken: string): Upload {
  return new Upload(chunk.filePath, {
    endpoint: `${API_BASE_URL}/api/calls/upload`,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    urlStorage: mmkvUrlStorage,    // persists upload URL across app restarts
    metadata: {
      chunkId: chunk.chunkId,
      sessionId: chunk.sessionId,
      chunkIndex: String(chunk.chunkIndex),
      contentType: 'audio/aac',
    },
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    onProgress: (bytesUploaded, bytesTotal) => {
      updateUploadProgress(chunk.chunkId, bytesUploaded / bytesTotal)
    },
    onSuccess: () => {
      markChunkUploaded(chunk.chunkId)
    },
    onError: (error) => {
      Sentry.captureException(error, { extra: { chunkId: chunk.chunkId } })
      incrementUploadAttempts(chunk.chunkId)
    },
  })
}
```

**Connectivity detection:** `@react-native-community/netinfo` `addEventListener` — event-driven, no polling. On connectivity restored, upload manager runs immediately.

### 7.3 MMKV Queue Schema

```typescript
// Queue stored in MMKV under key: 'upload_queue'
interface UploadQueue {
  sessions: Record<string, QueuedSession>
  unsyncedConsentEvents: ConsentEvent[]
}

interface QueuedSession {
  sessionId: string
  callId: string                 // client-generated UUID v4 — not server-assigned
  techId: string
  companyId: string
  consentLoggedAt: string        // ISO8601 device timestamp — never null
  consentSyncedAt: string | null // ISO8601 — null until POST /api/calls/consent succeeds
  recordingStartedAt: string
  recordingStoppedAt: string | null
  jobMetadata: JobMetadata | null
  chunks: PendingChunk[]
  overallStatus: 'recording' | 'stopped' | 'uploading' | 'complete' | 'failed'
}

interface ConsentEvent {
  callId: string
  sessionId: string
  techId: string
  companyId: string
  consentedAt: string            // ISO8601 device timestamp
  devicePlatform: 'ios' | 'android'
  synced: boolean
}
```

**Write discipline:** MMKV writes are synchronous and happen immediately. Never buffer MMKV writes. On app startup, run a reconciliation pass: scan the filesystem for `.aac` files, cross-reference with MMKV queue, re-add any orphaned chunks. Check for sessions in `recording` status with no `recordingStoppedAt` — prompt for resume or discard.

### 7.4 Failure Modes and Recovery

| Failure | Detection | Recovery |
|---|---|---|
| App crash during recording | MMKV queue shows `status: 'recording'` session with no `recordingStoppedAt` | On next open: "You have an incomplete recording — resume or discard?" |
| Consent sync fails (offline) | `consentSyncedAt` is null, `synced: false` in `unsyncedConsentEvents` | Retry on next connectivity event; upload manager syncs consent before uploading audio |
| tus upload failure (all retries exhausted) | `status: 'failed'` in MMKV | "Upload failed" in queue widget with manual "Retry" button |
| Server returns 5xx | tus-js-client treats as transient failure | Automatic retry per `retryDelays` config |
| Chunk file missing from filesystem | File read fails during upload | Mark chunk `failed`, note "file missing", continue with remaining chunks. Notify tech: "One recording section was lost." |
| MMKV corruption | Queue read throws | Fall back to empty queue, attempt filesystem reconciliation; capture to Sentry |
| tus upload URL expired | tus-js-client receives 410 Gone | Create new upload (start from beginning of that chunk) |
| Low storage mid-recording | RNFS write fails | Pause recording, show alert: "Your device is out of storage. Free up space to resume." |

---

## 8. API Contract (Mobile Perspective)

The mobile app calls a subset of the full API defined in dev-plan-v2 §7.4.

### 8.1 Auth (Clerk-managed)

Auth flows are handled by `@clerk/clerk-expo`. The mobile app does not call auth endpoints directly. `useAuth()` provides the current session token, injected into all API requests via `apiRequest`.

### 8.2 Audio Upload Flow

**`POST /api/calls/upload`** — tus-compatible endpoint

The tus protocol handles the full upload lifecycle. The mobile app does not call presign or manage S3 directly; the server-side tus endpoint manages S3 writes. See dev-plan-v2 §7.4 for the server-side implementation.

**`POST /api/calls/consent`** — best-effort sync (non-blocking in v2)
```typescript
interface ConsentRequest {
  callId: string            // client-generated UUID — used as the primary identifier
  sessionId: string
  techId: string
  companyId: string
  consentedAt: string       // ISO8601 device timestamp
  devicePlatform: 'ios' | 'android'
}

interface ConsentResponse {
  callId: string            // confirmed by server
  consentLoggedAt: string   // server timestamp (for audit log, not the primary record)
}
```

**`POST /api/calls/decline`**
```typescript
interface DeclineRequest {
  sessionId: string
  techId: string
  companyId: string
  declinedAt: string
  reason: 'customer_declined'
}
// Response: 204 No Content
```

**`POST /api/calls/upload-complete`**
```typescript
interface UploadCompleteRequest {
  callId: string
  sessionId: string
  chunkCount: number
  totalDurationSec: number
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

interface UploadCompleteResponse {
  callId: string
  status: 'processing'
  estimatedCompletionSec: number
}
```

### 8.3 Calls

**`GET /api/calls`**
```typescript
// Query params: page, limit (default 20), status?

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
interface AudioUrlResponse {
  url: string       // presigned S3 GET URL, expires in 1 hour
  durationSec: number
}
```

### 8.4 Opportunities

**`POST /api/opportunities/:id/dispute`**
```typescript
interface DisputeRequest {
  reason: DisputeReason
  notes?: string
}
// Response: 204 No Content
```

### 8.5 Notifications

**`POST /api/notifications/register`**
```typescript
interface PushTokenRegistrationRequest {
  token: string           // FCM token (Android) or APNs token (iOS) — obtained via expo-notifications
  platform: 'ios' | 'android'
}
// Response: 204 No Content
```

**`GET /api/notifications`**
```typescript
interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

interface Notification {
  id: string
  type: 'call_ready' | 'badge_earned' | 'streak_milestone' | 'weekly_stats' | 'payment_failed'
  payload: Record<string, unknown>
  sentAt: string
  readAt: string | null
}
```

### 8.6 Job Tagging

**`POST /api/calls/:id/tag`**
```typescript
interface JobTagRequest {
  customerName?: string
  jobType: 'drain' | 'plumbing' | 'both'
  notes?: string
}
// Response: 204 No Content
```

**`POST /api/calls/:id/no-recording-reason`**
```typescript
interface NoRecordingReasonRequest {
  reason: 'customer_declined' | 'technical_issue' | 'emergency' | 'duplicate_dispatch' | 'other'
  notes?: string
}
// Response: 204 No Content
```

### 8.7 User & Team

**`GET /api/team/me`**
```typescript
interface MeResponse {
  id: string
  name: string
  role: 'technician' | 'field_manager' | 'owner'
  companyId: string
  company: {
    name: string
    plan: 'starter' | 'pro' | 'team'
    paymentFailed: boolean
    minimumAppVersion: string    // e.g. "1.0.0" — enforced by app version guard
  }
  badges: Badge[]
  streak: StreakData             // counts and resets in tech's local device timezone
  personalBests: PersonalBests
}
```

---

## 9. Push Notifications and Deep Linking

### 9.1 Push Notification Setup (expo-notifications)

`expo-notifications` v55.0.22 replaces both `@react-native-firebase/messaging` and `@notifee/react-native`. It handles:
- FCM push notification receipt on Android (via google-services.json in config plugin)
- APNs push notification receipt on iOS (via push notification entitlement)
- Local notifications (battery warnings, foreground recording indicator)
- Permission request flow on both platforms

The backend (`firebase-admin` in the Railway worker) sends FCM push notifications to the FCM token obtained from expo-notifications. No backend change is required.

**Config plugin in `app.json`:**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#FFFFFF",
          "googleServicesFile": "./google-services.json"
        }
      ]
    ]
  }
}
```

**Registration flow:**
```
1. App opens for first time (or token refresh)
2. Notifications.requestPermissionsAsync()
   → iOS: system permission dialog
   → Android 13+ (API 33+): POST_NOTIFICATIONS permission dialog
3. On granted: Notifications.getDevicePushTokenAsync()
   → returns { type: 'android' | 'ios', data: string }
   → data is the FCM registration token (Android) or APNs device token (iOS)
4. POST /api/notifications/register { token: data, platform: type }
5. Token stored server-side per user
6. On token refresh: Notifications.addPushTokenListener → re-register
```

### 9.2 Notification Types and Payload Shapes

| Type | Trigger | Priority | Payload |
|---|---|---|---|
| `call_ready` | Worker completes scoring | High | `{ callId, overallScore, opportunityTotal }` |
| `badge_earned` | Badge award logic fires | Normal | `{ badgeType, badgeName, earnedAt }` |
| `streak_milestone` | Streak count hits 3, 7, or 14 | Normal | `{ streakCount }` |
| `weekly_stats` | Monday 8am tech's timezone (Vercel cron) | Normal | `{ avgScore, topOpportunity, callCount }` |
| `payment_failed` | Stripe webhook → company.paymentFailed = true | High | `{ companyName }` |
| `low_battery_paused` | Auto-pause at 15% | High | `{ sessionId }` — local notification via expo-notifications, not FCM |

### 9.3 Deep Link Routing on Notification Tap

| Notification Type | Deep Link | Destination |
|---|---|---|
| `call_ready` | `kova://summary/{callId}` | `CallSummaryScreen` |
| `badge_earned` | `kova://badge/{badgeType}` | `ProfileScreen` with badge highlighted |
| `streak_milestone` | `kova://home` | `HomeScreen` with streak card prominent |
| `weekly_stats` | `kova://history` | `CallHistoryScreen` |
| `payment_failed` | `kova://settings/billing` | `SettingsScreen` billing section |

**`linking.ts` config:**
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

### 9.4 Foreground Notification Handling

When a push notification arrives while the app is in the foreground:

```typescript
// App.tsx
Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldShowAlert: true,
    shouldPlaySound: notification.request.content.data?.type === 'call_ready',
    shouldSetBadge: false,
  }),
})

Notifications.addNotificationResponseReceivedListener((response) => {
  const { type, callId, badgeType } = response.notification.request.content.data ?? {}
  handleNotificationNavigation(type, { callId, badgeType })
})
```

- `call_ready`: Show in-app banner at top of screen with score. Tap → `CallSummaryScreen`.
- `badge_earned`: Show animated badge grant overlay. Tap → `ProfileScreen`.
- `payment_failed`: Persistent in-app banner on `HomeScreen`.
- All other types: Standard in-app toast.

---

## 10. Auth Flow

### 10.1 Clerk Phone OTP Sequence

```
1. Tech enters phone number on PhoneScreen
2. Clerk SDK: signIn.create({ identifier: phoneNumber, strategy: 'phone_code' })
3. SMS sent by Clerk
4. Tech enters 6-digit code on OTPScreen
5. Clerk SDK: signIn.attemptFirstFactor({ strategy: 'phone_code', code })
6. On success: Clerk stores session; useAuth().isSignedIn = true
7. RootNavigator re-renders: AuthStack → AppStack
8. Multi-org guard (see §10.4)
9. First launch flag checked in MMKV:
   → If first_launch not set: show IntroStack
   → If first_launch = true: go directly to BottomTabNavigator
```

### 10.2 Session Token Lifecycle

- Clerk session tokens expire and refresh automatically via the Clerk SDK
- `getToken()` in `apiRequest` always retrieves the current valid token — expired tokens are refreshed transparently
- If Clerk session is invalid (revoked, account deleted): `useAuth().isSignedIn = false` → RootNavigator shows AuthStack

### 10.3 Role-Aware UI

Technicians (`role: 'technician'`) see only technician screens. The mobile app is technician-facing only in Phase 1 — owners and managers use the web dashboard.

`field_manager` users with the mobile app see the technician view. Manager-specific mobile features are Phase 2.

Role is stored in Clerk session metadata (`publicMetadata.role`) and accessible via `useUser()`.

### 10.4 Multi-Org Guard

Phase 1 techs belong to exactly one Clerk Organization. On app open, after authentication, check organization membership count:

```typescript
const { organizationMemberships } = useOrganizationList()

if (organizationMemberships && organizationMemberships.length > 1) {
  // Show MultiOrgErrorScreen — non-dismissable
  // "You appear to be a member of multiple companies.
  //  Contact your administrator to resolve this."
}
```

This prevents cross-tenant data confusion in Phase 1. Multi-company support is Phase 3.

### 10.5 App Version Forcing

On app open, after `GET /api/team/me` returns, compare `company.minimumAppVersion` against the running app version (`expo-constants` provides `Constants.expoConfig.version`):

```typescript
const runningVersion = Constants.expoConfig?.version ?? '0.0.0'
if (semverLt(runningVersion, me.company.minimumAppVersion)) {
  // Show UpdateRequiredScreen — non-dismissable
  // Contains App Store / Play Store link
  // Cannot proceed until app is updated
}
```

This is the hard update path. A soft update banner (in-app notification, dismissable) is shown for versions above `minimumAppVersion` but below the latest available.

---

## 11. Weekly Sprint Plan (Mobile Deliverables)

This section mirrors the 12-week sprint plan in dev-plan-v2 §8 but is mobile-specific. Each week shows mobile deliverables, acceptance criteria, and backend dependencies.

---

### Week 1 — Mobile Project Scaffolding

**Goal:** The mobile app compiles, runs on both iOS simulator and real Android device, and connects to the backend. Zero features. Sentry active.

**Mobile deliverables:**
- Expo SDK 55 project initialized with development build (`eas build --profile development`)
- Decision documented: Expo development build vs. bare React Native CLI (make the call, commit to it)
- `@clerk/clerk-expo` v2.19.31 integrated — phone OTP sign-in works end-to-end
- `@react-navigation` v7 wired up with RootNavigator (AuthStack + AppStack stub)
- `packages/shared` dependency linked via pnpm workspace
- `apiRequest` client skeleton with Clerk token injection
- `react-native-mmkv` v4.3.1 + `react-native-nitro-modules` installed and linked
- `@sentry/react-native` v8.11.0 installed, DSN configured, root ErrorBoundary active
- All native modules in §3.2 installed and linked (pod install + gradle sync)
- New Architecture confirmed active (no legacy bridge warnings on startup)
- App runs on iOS 15.1 real device and Android API 29 real device (not simulators only)
- EAS project initialized — `eas build --platform ios --profile development` succeeds

**Acceptance criteria:**
- Tech can sign in via phone OTP on both platforms
- `apiRequest` makes an authenticated request to `/api/admin/health` and returns 200
- Sentry receives a test event confirming the DSN is configured correctly
- `pnpm typecheck` passes with zero errors
- No New Architecture deprecation warnings on startup

**Dependencies from backend:**
- Clerk: phone OTP enabled, Organizations enabled, custom roles defined
- `/api/admin/health` returns 200

**Action items (not code):**
- Begin Drain Right phone audit — exact iOS and Android device models in the fleet
- Schedule CA privacy attorney consultation (target: Week 3)
- Create Firebase project, download `google-services.json` and `GoogleService-Info.plist`

---

### Week 2 — Auth, Navigation, and Data Layer

**Goal:** Full auth flow works. Navigation complete. React Query wired to backend. MMKV initialized. Multi-org guard and version forcing active.

**Mobile deliverables:**
- Full auth flow: `PhoneScreen` → `OTPScreen` → `AppStack` — all edge cases handled
- Sign-out implemented in `SettingsScreen`
- Multi-org guard: `MultiOrgErrorScreen` shown if user has > 1 org membership
- Bottom tab navigator with all 3 tabs: Home, History, Profile
- All screen stubs created (screens exist but show placeholder content)
- React Query `QueryClientProvider` wired in `App.tsx`
- `GET /api/team/me` called on app open; `MeResponse` available via `useCurrentUser()`
- App version forcing: `UpdateRequiredScreen` shown if running version < `minimumAppVersion`
- MMKV initialized: queue store, `first_launch` flag, `tus-url-storage`
- Deep link config in `linking.ts` — `kova://` scheme registered
- Intro screens complete (all 3 screens, skip logic, `first_launch` flag, Android battery optimization prompt)

**Acceptance criteria:**
- Sign out → sign back in → user data correct on both platforms
- First launch shows intro screens; subsequent launches skip to HomeScreen
- `useCurrentUser()` returns correct name, role, and company name
- Deep link `kova://home` navigates to HomeScreen on both platforms

**Dependencies from backend:**
- `GET /api/team/me` returning `MeResponse` with `minimumAppVersion`
- Clerk webhook syncing users/orgs to Neon

---

### Week 3 — Recording Engine ← CRITICAL GATE

**Goal:** A tech can record a call in the background with consent logged locally. The recording survives being backgrounded and the phone being locked. Background recording validation gate must pass before Week 4 begins.

**Mobile deliverables:**
- `ConsentModal` — full-screen, non-dismissable, state machine transitions correctly
- Consent written to MMKV immediately on "Customer Consented" tap — recording starts without waiting for server
- `POST /api/calls/consent` attempted in background after recording starts; queued if offline
- `POST /api/calls/decline` called on "Customer Declined" (queued if offline)
- `react-native-audio-api` v0.12.1 `AudioRecorder` starts on consent — AAC-LC 32kbps mono
- Concurrent recording guard: error shown if a session is already active
- Disk space check: error shown if < 200 MB free before showing ConsentModal
- `RecordingScreen` with live timer, `AudioLevelMeter` (real-time VU bar), and animated recording indicator
- Recording rotation every 5 minutes — chunks written to filesystem with correct naming
- `tusUploadUrl` field initialized in MMKV chunk entries
- Pause/resume implemented (including iOS AVAudioSession interruption handling, Android AudioFocus loss)
- Stop recording → `JobTaggingScreen`
- Battery monitor: warning at 20%, auto-pause at 15% with local notification
- Bluetooth headset detection and microphone routing (§6.10)
- Wired mic detection and preference
- `expo-notifications` persistent notification on Android during recording — foreground service active
- `NonRecordingReasonScreen` shown when starting a new session without completing prior session
- iOS `Info.plist` background mode and microphone permission configured
- Android manifest foreground service configured with correct API 34 runtime permission handling
- Edge-to-edge safe area insets applied to all new screens

**⚠️ Background Recording Validation Gate (must pass before Week 4):**

*iOS (real device, iOS 15.1+):*
1. Start recording on a real iPhone
2. Press Home button — app goes to background
3. Lock phone with side button
4. Wait 20 minutes without touching the phone
5. Unlock and open Kova
6. Stop recording
7. Verify: (a) timer reflects 20+ minutes, (b) chunk files exist for each 5-minute rotation, (c) no chunk is corrupt

*Android (real device, API 29+):*
1. Start recording on real Android device
2. Press Home — app goes to background
3. Lock phone
4. Wait 20 minutes
5. Verify foreground service notification was present in notification shade throughout
6. Unlock and open Kova, stop recording
7. Verify: (a) timer correct, (b) chunks intact, (c) notification dismissed

*Additional validation:*
- Validate `expo-notifications` sticky notification is properly bound to the recording foreground service on Android — this is the primary unknown in the @notifee → expo-notifications migration and must be confirmed before Week 4

**If any platform fails:** Stop all other work. Debug before proceeding. Contingency: iOS-only soft launch for 2 weeks while Android is resolved.

**Acceptance criteria:**
- Background recording validation gate passes on both platforms
- Consent timestamp written to MMKV before any audio chunk is written to disk
- Concurrent recording guard fires correctly
- Disk space check fires correctly when storage is simulated at < 200 MB
- `pnpm typecheck` passes

**Dependencies from backend:**
- `POST /api/calls/consent` endpoint (receives callId from client, confirms)
- `POST /api/calls/decline` endpoint
- CA privacy attorney consultation this week

---

### Week 4 — Offline Queue and Upload Pipeline

**Goal:** Chunks upload to the tus endpoint reliably. Upload-complete fires after all chunks upload. Queue survives restarts and network interruptions.

**Mobile deliverables:**
- Upload manager implemented — reads MMKV queue, uploads chunks via `tus-js-client`
- `mmkvUrlStorage` custom urlStorage implemented — upload URLs persist across app restarts
- `tus-js-client` upload with retry delays configured (`[0, 3000, 5000, 10000, 20000]`)
- Unsynced consent events synced before audio upload (upload manager priority order)
- `POST /api/calls/upload-complete` called after all chunks uploaded
- Queue status widget on `HomeScreen`: "N calls pending upload" / "All caught up"
- Startup reconciliation: scan filesystem for orphaned `.aac` files, re-add to MMKV queue
- Network event listener: upload manager fires on connectivity restored

**Acceptance criteria:**
- Record in airplane mode → enable wifi → call uploads and `upload-complete` fires without manual intervention
- Force-close app mid-upload → reopen → upload resumes from last tus checkpoint (not from start of chunk)
- Max retry state shown in UI: "Upload failed — Retry?" button functional
- Offline consent sync: consent event written to MMKV while offline → syncs to server before audio uploads on reconnect
- `pnpm typecheck` passes

**Dependencies from backend:**
- `POST /api/calls/upload` tus-compatible endpoint
- `POST /api/calls/upload-complete` endpoint

---

### Week 5 — No Mobile Sprint (Backend: Rules Engine)

**Mobile tasks (supporting):**
- Drain Right device audit results processed — build device compatibility matrix
- Test recording on every real device model from the audit
- Document OEM-specific battery optimization issues (Samsung, Xiaomi, etc.)
- Fix any Week 3/4 bugs surfaced on non-primary test devices
- Plan `ClipPlayer` component using `react-native-audio-api` playback mode (replacing react-native-track-player from v1)

---

### Week 6 — No Mobile Sprint (Backend: LLM Layer + Score Assembly)

**Mobile tasks (supporting):**
- Build synthetic call notification test: manually trigger a `call_ready` push notification via expo-notifications and verify deep link routing to `CallSummaryScreen`
- Wire up `CallSummaryScreen` shell with static mock data — layout, color coding, opportunity card structure
- Complete `DisputeModal` component (all 5 reason options, free text for "Other", wired to `POST /api/opportunities/:id/dispute`)
- Implement `ClipPlayer` component using `react-native-audio-api` playback: load presigned URL, seek to `clip_start_sec`, play 60-second window
- Fix any backlog from Weeks 3–4

---

### Week 7 — Push Notifications, Post-Call Summary, Clip Playback

**Goal:** The full tech loop closes. Record → process → push notification → open app → see score.

**Mobile deliverables:**
- `expo-notifications` permission request on app open, push token registration via `POST /api/notifications/register`
- `call_ready` push notification received → tapping opens `CallSummaryScreen` with correct `callId`
- `CallSummaryScreen` fully implemented with all components from §5.8
- `ClipPlayer` using `react-native-audio-api` playback: seek to `clip_start_sec`, 60-second window
- `DisputeModal` connected to `POST /api/opportunities/:id/dispute`
- Personal call history (`CallHistoryScreen`): list of tech's calls, tap → `CallDetailScreen`
- `CallDetailScreen`: full score breakdown, audio player (full call via `react-native-audio-api` playback), synchronized transcript
- Foreground notification handling: in-app banner for `call_ready` while app is open

**Acceptance criteria:**
- End-to-end: record a real call → upload completes → within 5 minutes → push notification received → tap → `CallSummaryScreen` shows correct score and opportunities
- `ClipPlayer` plays correct 60-second window (range request or seek — no full file download)
- Dispute submitted → server confirmed → card greyed out in UI
- `pnpm typecheck` passes

---

### Week 8 — Call History Completion, Notification Polish

**Goal:** Call history fully usable. All notification types wired. Foreground and background handling solid.

**Mobile deliverables:**
- `CallHistoryScreen` date filter: this week / last week / this month
- `CallDetailScreen`: waveform visualization, synchronized transcript (segment tap → seek), opportunity markers at trigger timestamps
- All notification types handled: `badge_earned`, `streak_milestone`, `weekly_stats`, `payment_failed`
- Deep links for all notification types validated
- In-app notification list: `GET /api/notifications`, unread count badge on tab
- Payment failed in-app banner on `HomeScreen`
- App backgrounding during `PENDING_ANALYSIS`: poll or push → navigate to `CallSummaryScreen`
- Cold start from killed app via notification deep link validated on both platforms

**Acceptance criteria:**
- All 6 notification types received and routed correctly in foreground, background, and killed-app states
- Date filter works correctly for all 3 options

---

### Week 9 — No Mobile Sprint (Backend: Pricebook & Admin Controls)

**Mobile tasks (supporting):**
- `JobTaggingScreen` — verify job type selection flows correctly to scoring model
- Test pricebook changes in owner web dashboard → verify dollar figures update in opportunity values
- Regression test full recording → upload → score → summary on all Drain Right device models
- Begin TestFlight distribution: `eas build --platform ios --profile preview` → TestFlight → invite internal testers

---

### Week 10 — Gamification, Payment Failed Banner, and Billing Integration

**Goal:** All gamification features live. Billing integration reflected in mobile UI.

**Mobile deliverables:**
- Streak display on `ProfileScreen`: current streak count, milestone badge at 3/7/14
- Personal bests: highest score, longest streak, best 7-day average
- Badge shelf: 4 Phase 1 badges — earned (full color) vs. locked (greyed, criteria on tap)
- Badge earned notification: `badge_earned` push → animated badge grant overlay
- Streak milestone notification: `streak_milestone` push → in-app prompt
- Payment failed banner (persistent on HomeScreen, links to Stripe portal)
- Soft update banner (dismissable, shown when new version available above minimum)

**Acceptance criteria:**
- Tech records 3 calls in Week 1 → Pioneer badge awarded → notification → badge on ProfileScreen
- 5-call streak → in-app toast on 5th call summary
- Personal bests update correctly after each scored call

---

### Week 11 — Onboarding, Activation, End-to-End Polish

**Goal:** Brand-new tech receives SMS invite, downloads app, completes onboarding, and records first call in < 35 minutes.

**Mobile deliverables:**
- Full tech onboarding from SMS invite through first recording
- Empty states for every screen
- Error handling across all API calls: network errors, server errors, timeouts — all handled with user-appropriate messaging and Sentry capture
- Loading states for all async operations (skeleton screens or spinners)
- Payment failed banner validated in staging with Stripe test payment failure
- Multi-org guard validated
- Version force-update validated with a simulated version mismatch

**End-to-end onboarding test:**
1. Founder creates Drain Right tech account in owner dashboard
2. Tech receives SMS invite
3. Tech downloads app (TestFlight for iOS / Play Store internal track for Android)
4. Tech signs in via phone OTP
5. Tech completes intro screens
6. Tech records 2-minute test call with consent
7. Tech sees scored summary within 5 minutes
8. Total elapsed time: < 35 minutes

**Acceptance criteria:**
- Onboarding test passes end-to-end in < 35 minutes on both iOS and Android
- All screens have appropriate empty states
- All network errors show user-friendly messages
- `pnpm typecheck` passes with zero errors
- iOS production build submitted to App Store (submit no later than end of Week 11)

---

### Week 12 — Drain Right Pilot Prep and Launch

**Goal:** All 16+ Drain Right techs onboarded. First calls scored. Monitoring active.

**Mobile deliverables:**
- Production builds:
  - iOS: `eas build --platform ios --profile production` → App Store (submitted Week 11, approved this week)
  - Android: `eas build --platform android --profile production` → Play Store internal track
- All 16+ techs invited, downloaded, signed in, and completed intro screens
- Android OEM battery optimization prompts confirmed on all Drain Right Android devices
- First call scored together with Drain Right owner and a tech in the room

**Monitoring during launch:**
- Sentry: real-time error alerts for recording engine and upload manager
- FCM delivery rate in Firebase console
- Upload failures in Neon `calls` table (status = `upload_failed`)
- Unsynced consent events monitored in admin view

---

## 12. Testing Strategy

### 12.1 Unit Tests

**What to unit test:**
- Zustand stores: recording state machine transitions — every valid and invalid transition including concurrent recording guard
- MMKV queue operations: add chunk, remove chunk, orphan detection, MMKV read failure
- Upload manager: retry logic, exponential backoff timing, chunk ordering, tus urlStorage
- `mmkvUrlStorage`: read/write/delete/getAllItems against real MMKV instance
- Consent queue: write-before-record ordering, sync retry behavior
- `apiRequest` client: auth header injection, error handling, Zod validation
- Display formatting utilities: score color coding, opportunity dollar formatting, duration

**What NOT to unit test:**
- Screen rendering — acceptance criteria on real devices
- Native module behavior — unit tests can't run native code
- Navigation — integration tested via real device flows

**Framework:** Jest + `@testing-library/react-native`. Run in CI on every PR.

**Target:** 80% coverage on queue, consent, and state machine logic.

### 12.2 Device Testing Matrix

| Device | OS | Priority | Notes |
|---|---|---|---|
| iPhone 14 or 15 | iOS 17 | P0 | Primary development device |
| iPhone SE (3rd gen) | iOS 15.1 | P0 | SDK 55 minimum iOS target |
| Samsung Galaxy S-series | Android 14 (API 34) | P0 | Tests FOREGROUND_SERVICE_MICROPHONE runtime permission path |
| Samsung Galaxy A-series (mid-range) | Android 11–12 | P0 | Highest risk for battery optimization; tests API 29–33 manifest-attribute-only path |
| Pixel 6 or 7 | Android 13 | P1 | Clean Android baseline |
| Device from Drain Right audit | Varies | P0 | Must test on their specific models |

**P0 = must pass before launch. P1 = test but not a launch blocker.**

### 12.3 Background Recording Validation Protocol

Protocol runs in Week 3 and again in Week 11 (regression before launch). Additional checks:

- Record while receiving incoming phone call (does AVAudioSession / AudioFocus pause/resume correctly?)
- Record while walking through a cellular dead zone and returning
- Record while receiving a high-priority push notification
- Force-kill the app mid-recording (do chunks written so far survive?)
- Record in offline mode (consent logged to MMKV; confirm no server call blocks recording start)

### 12.4 Battery Impact Testing Protocol

**Target:** < 30% battery consumed per hour of active recording on a mid-range Android device.

1. Fully charge device
2. Disable wifi (cellular only)
3. Start recording
4. At 30 and 60 minutes: note battery percentage
5. Calculate % per hour
6. Document device model and OS version

**If test fails:** Profile CPU. Primary suspects: AudioLevelMeter polling frequency (reduce update interval), recording indicator animation (disable on low-end devices). The audio level meter is new in v2 — test its battery impact specifically.

### 12.5 Offline Queue Stress Test Protocol

Run before Week 12:

1. **No-connectivity upload:** Record 3 calls in airplane mode. Enable wifi. Verify all 3 upload without intervention.
2. **Mid-upload kill:** Start upload. Kill app at 50% progress. Reopen. Verify tus resumes from last checkpoint, not from chunk start.
3. **Consent sync:** Record in airplane mode. Enable wifi. Verify consent events sync before audio chunks.
4. **Server 500 during upload:** Mock server 500. Verify tus retries, eventual success.
5. **20-chunk queue:** Record 4 × 30-minute calls without uploading. Verify queue handles 20+ chunk entries.
6. **Low storage simulation:** Fill device to < 200 MB. Verify disk space check fires correctly.

### 12.6 Concurrent Recording Test Protocol

1. Start a recording session (get to RecordingScreen)
2. Background app; tap the record button from a notification shortcut or widget
3. Verify concurrent recording guard fires: error shown, no second session created
4. Simulate a crash-interrupted session in MMKV (set `overallStatus: 'recording'` with no `recordingStoppedAt`)
5. Reopen app. Verify resume/discard prompt shown. Verify guard prevents new recording until resolved.

### 12.7 CI Integration

```yaml
# .github/workflows/ci.yml (mobile-specific steps)
- name: TypeScript check
  run: pnpm --filter mobile typecheck

- name: Unit tests
  run: pnpm --filter mobile test

- name: Lint
  run: pnpm --filter mobile lint
```

EAS Build runs on manual trigger. Sentry source maps uploaded automatically on production build via `@sentry/react-native` Expo config plugin.

---

## 13. Build and Distribution

### 13.1 EAS Build Profiles

```json
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

### 13.2 iOS Distribution

- **Development:** `eas build --profile development`
- **TestFlight:** `eas submit -p ios` from `preview` build. Invite internal testers in Week 9.
- **App Store:** `production` build submitted no later than end of Week 11. Review average: 1–3 days, up to 7.

**App Store review notes:**
- Microphone usage description must match actual use
- Background audio mode declared in submission
- Reviewers will check for consent UI — `ConsentModal` satisfies this
- Privacy policy URL required

**SDK 55 iOS build requirement:** Minimum Xcode 26 is required to build for SDK 55. Confirm EAS Build environment uses Xcode 26 or later.

### 13.3 Android Distribution

- **Development:** APK via EAS internal distribution or `adb install`
- **Play Store internal track:** `eas submit -p android` from `preview` build. No review — available immediately.
- **Play Store production:** `production` app bundle after Phase 1 launch. Requires privacy policy URL, data safety form, content rating.

**Data safety form fields (updated from v1 — add all third-party processors):**
- Data collected: name, phone number, audio recordings, device identifiers
- Data shared: AWS S3, Deepgram, OpenAI, **Clerk** (auth), **Firebase** (push notifications), **Neon/PostgreSQL** (data storage) — all for core functionality
- Data deletion: user can request deletion via privacy@kovahq.com (Phase 1 manual; Phase 2 in-app)

**Note:** v1 omitted Clerk, Firebase, and Neon from the data safety form third-party processors section. All three process user data and must be disclosed.

### 13.4 OTA Updates (EAS Update)

**Appropriate for OTA:**
- UI copy changes
- Bug fixes without native code changes
- Feature flag or configuration changes

**Requires native build:**
- Any change to native modules
- Changes to `Info.plist`, `AndroidManifest.xml`, or `app.json` native fields
- React Native version bumps
- SDK upgrades

**OTA channel strategy:**
```
eas update --branch production --message "Fix: queue widget count"
```

### 13.5 Version Strategy

Format: `MAJOR.MINOR.PATCH`
- **MAJOR:** Breaking native changes
- **MINOR:** New features
- **PATCH:** Bug fixes (OTA if no native changes)

Phase 1 launches at `1.0.0`. The `minimumAppVersion` field in the API starts at `1.0.0`.

---

## 14. Risk Register (Mobile-Specific)

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Background recording unreliable on Android** | High | Critical | Week 3 hard gate. Contingency: iOS-only soft launch for 2 weeks while Android is debugged. Never launch Android with unreliable background recording. |
| **expo-notifications + react-native-audio-api foreground service integration fails on Android** | Medium | Critical | This is the highest unknown in v2 — replacing @notifee with expo-notifications for the foreground service notification has not been validated. Validate explicitly in Week 3. If it fails, contingency: install @notifee alongside expo-notifications (use expo-notifications for push, @notifee for foreground service only), accepting the archive risk temporarily. |
| **OEM battery optimization kills foreground service** | High | High | Prompt affected OEM users (Samsung, Xiaomi, Oppo) to disable battery optimization during onboarding. Test on each Drain Right Android device model. |
| **tus-js-client compatibility with the server upload endpoint** | Medium | High | tus-js-client is standard and widely deployed. Risk is primarily on the server-side tus endpoint implementation, not the client library. Client side is low risk. Integration test end-to-end in Week 4 before proceeding. |
| **react-native-audio-api instability on SDK 55 / RN 0.83** | Medium | Critical | Pin to v0.12.1 in Week 1. Validate New Architecture compatibility explicitly. Software Mansion maintains the library — escalate any issues directly to their GitHub. Contingency: `expo-audio` (SDK 55 supports background recording + foreground service) as a fallback if react-native-audio-api cannot be stabilized. |
| **react-native-mmkv v4 New Architecture peer dep issues** | Low | Medium | mmkv v4 is explicitly New Architecture-compatible. `react-native-nitro-modules` as peer dep is new — validate auto-link in Week 1 before any queue code is written. |
| **Offline consent logging — device timestamp reliability** | Low | Medium | Tech's device clock could be wrong. Mitigation: log both device timestamp and server-confirmed timestamp when sync occurs. The device timestamp is the primary record; server timestamp is stored for audit comparison. Flag calls where the two timestamps differ by > 5 minutes for legal review. |
| **CCPA deletion has no mobile path** | Low | Medium | Phase 1 mobile has no in-app delete account flow. Deletion is handled via email (privacy@kovahq.com) — web-only path. This is an accepted Phase 1 gap, documented here for Phase 2 resolution. |
| **App Store review rejection** | Low | Medium | Submit no later than end of Week 11. Common rejection reasons — missing privacy policy, unclear microphone usage, recording without explicit consent UI — all addressed. |
| **Xcode 26 not available in EAS Build environment** | Low | High | Confirm EAS Build runner image supports Xcode 26 before the first iOS build. If not, EAS Build environment must be updated — contact Expo support if the default image is below Xcode 26. |
| **AudioLevelMeter battery drain (new in v2)** | Medium | Low | The `AnalyserNode` polling at ~10x/sec adds a small CPU overhead. Test battery impact specifically in §12.4. If it fails the < 30% per hour threshold, reduce polling to 4–5x/sec or disable the level meter on low-battery devices (< 30%). |

---

## 15. Phase 2 Mobile Preview

Not sprint-planned here. Listed for reference so Phase 1 architecture anticipates these.

| Feature | Trigger | Notes |
|---|---|---|
| **Auto-record on arrival (geofence)** | Phase 2 kickoff (Month 3) | GPS geofence primes the app; tech still taps ConsentModal. Requires testing on low-battery devices. |
| **Pre-call intelligence card** | Phase 2 — requires ST integration | Brief pushed to tech on dispatch. Requires `GET /api/jobs/:id/brief`. |
| **Spanish mobile UI** | Phase 2 | Full i18n via `react-i18next`. English strings extracted to `en.json`; `es.json` added. |
| **Full badge set** | Phase 2 | Expanded criteria; badge detail screens with progress tracking. |
| **Leaderboard (team-facing)** | Phase 2 | Owner-toggleable. Personal bests first; team comparison second. |
| **Clip sharing** | Phase 2 | Expiring secure links server-side. |
| **Field manager mobile view** | Phase 2 | Manager tab: team recording compliance, call review queue. |
| **CCPA in-app delete** | Phase 2 | Replace email-only deletion path with in-app flow. |
| **Real-time in-call coaching** | Year 2 | Live streaming audio → real-time transcript → alert during call. High complexity, high distraction risk. |

---

## 16. Open Decisions

### Resolved from v1

| v1 Decision | v2 Resolution |
|---|---|
| Expo custom dev client vs. React Native CLI bare | Expo development build (SDK 55 terminology). Document the decision in Week 1. |
| Clip playback implementation | `react-native-audio-api` built-in playback. No additional library needed. |
| App Store listing for Phase 1 | TestFlight (iOS), Play Store internal track (Android). Full public listing Phase 2. |
| Android distribution for Phase 1 | Play Store internal track. |

### Still Open — Decide Before Phase 1 Kickoff

| Decision | Options | Deadline | Owner |
|---|---|---|---|
| Score dispute authority | Option A: manager can override tech dispute. Option B: tech dispute accepted; manager adds coaching note but override is not possible. | Week 5 | Product |
| Over-recommendation flag consequences | Surface to owner, manager-only, or both? Affect overall score or route to manager review only? | Week 6 | Product |

### Still Open — Before Week 7

| Decision | Options | Deadline | Owner |
|---|---|---|---|
| Streak timezone source | Option A: device timezone at time of call. Option B: user-configured timezone in profile. Device timezone is simpler; user-configured is more accurate for techs who cross timezone boundaries. | Week 7 | Engineering |

### External Dependencies to Track

| Item | Status | Follow-up |
|---|---|---|
| Drain Right device audit | Week 1 action — confirm exact iOS and Android models | Determines Android testing urgency |
| CA privacy attorney — consent modal validation | Schedule Week 1, consultation Week 3 | Required before first recording from Drain Right tech |
| APNs push key for Firebase | Apple Developer account; APNs key created and uploaded to Firebase project | Needed before Week 7 expo-notifications integration |
| Firebase project (`google-services.json`, `GoogleService-Info.plist`) | Create before Week 1 build | Required for expo-notifications config plugin |
| Xcode 26 in EAS Build environment | Verify EAS supports Xcode 26 for SDK 55 | Required before first iOS build |

---

## Appendix A: Library Replacement Rationale

### A.1 `@notifee/react-native` → `expo-notifications` v55.0.22

**Why replaced:** `@notifee/react-native` was archived by Invertase in April 2026. The repository is read-only. There will be no further security patches or SDK compatibility updates. Using an archived library in a production app is unacceptable.

**Why expo-notifications:** It is the Expo-supported, actively maintained notification library for SDK 55. It handles both push notification receipt (FCM/APNs) and local notifications (including the Android foreground service sticky notification). Using it consolidates two v1 libraries (`@notifee` + `@react-native-firebase/messaging`) into one.

**Risk:** The integration of expo-notifications with react-native-audio-api's foreground service on Android is an unknown. @notifee had an explicit `asForegroundService: true` flag. expo-notifications' equivalent path must be validated in Week 3. The contingency (reinstating @notifee for the foreground service notification only) is documented in the risk register.

**Firebase on the backend:** No change. `firebase-admin` in the Railway worker continues to send FCM push notifications to the FCM token obtained by expo-notifications on the mobile side.

### A.2 `react-native-background-upload` → `tus-js-client` v4.3.1

**Why replaced:** `react-native-background-upload` was abandoned in October 2022. The last commit is over 2.5 years before the Drain Right launch. It has unresolved issues with React Native 0.73+ and has not been tested against the New Architecture. Using it is a reliability risk that compounds over time.

**Why tus-js-client:** The Tus resumable upload protocol is an open standard (RFC-based). `tus-js-client` v4.3.1 is actively maintained (MIT license), compatible with React Native, and provides resumable upload semantics (handles retry, progress, and resume from last byte). It is used in production by large-scale applications.

**Key implementation requirement:** React Native has no `Web Storage` API. The default `tus-js-client` `urlStorage` uses `localStorage`, which does not exist in React Native. A custom `urlStorage` backed by MMKV (`lib/mmkv-url-storage.ts`) is required for uploads to be resumable across app restarts. This is a one-time implementation — see §7.2.

**Backend requirement:** A TUS-compatible upload endpoint must be implemented on the server side (`POST /api/calls/upload`). This replaces the v1 S3 presigned PUT flow. Implementation is documented in dev-plan-v2.

### A.3 `react-native-track-player` → `react-native-audio-api` built-in playback

**Why replaced:** `react-native-track-player` v5 changed from MIT to a commercial license. The library is no longer free for commercial use.

**Why react-native-audio-api playback:** `react-native-audio-api` v0.12.1 supports both recording and playback using the Web Audio API. The same library already installed for recording provides playback via `AudioContext`, `AudioBufferSourceNode`, and a standard audio graph. No additional dependency is needed. The `ClipPlayer` component uses `react-native-audio-api` playback to load a presigned S3 URL and play the audio with seek support.

**Trade-off:** `react-native-track-player` provided advanced features (gapless playback, lock screen media controls, audio queue). For Kova's use case (play a 60-second clip from a specific timestamp), these are unnecessary. `react-native-audio-api` playback is sufficient.

### A.4 New Dependency: `react-native-nitro-modules`

`react-native-mmkv` v4 introduced `react-native-nitro-modules` as a required peer dependency. This is a JSI-based native module engine that mmkv uses for its New Architecture-compatible bindings.

**Installation:** Standard auto-link. Add to `package.json` and run `pod install` (iOS) + `gradle sync` (Android). No manual configuration required beyond adding it to `package.json`.

---

## Appendix B: Cross-Document Errata

The following factual errors were identified during the v2 research process. They are documented here so they can be corrected in the source documents.

| Source Document | Section | Incorrect Claim | Correct Information |
|---|---|---|---|
| `development-plan-v2.md` | §3.1 | "~2 MB/hr" for AAC-LC 32kbps recording format | **~14 MB/hr.** Calculation: 32,000 bits/sec × 3600 sec ÷ 8 bits/byte = 14.4 MB/hr. The factor-of-7 error likely comes from confusing 32 kbps with 32 KB/s. `development-plan-mobile-v1.md` has this correct at "~14 MB/hour." |
| `development-plan-mobile-v1.md` | §5.3 | "Below API 29, `FOREGROUND_SERVICE_MICROPHONE` permission is unavailable" (implied as the API 29 requirement) | `FOREGROUND_SERVICE_MICROPHONE` is a **runtime permission** introduced in API 34 (Android 14). API 29 (Android 10) introduced the `foregroundServiceType="microphone"` **manifest attribute** — a separate mechanism. The manifest attribute requires API 29+. The runtime permission requires API 34+. Apps running on API 29–33 use only the manifest attribute and do not need to request the runtime permission. |
| `development-plan-mobile-v1.md` | §5.1 (audio pipeline diagram) | Shows W3C `getUserMedia()`, `AudioContext`, and `MediaRecorder` as the `react-native-audio-api` recording API | `react-native-audio-api` uses its own `AudioRecorder` class for recording, not the W3C `MediaRecorder`. `MediaRecorder` is a browser Web API that does not exist in React Native. The `AudioContext` graph is correctly shown — the recording interface is not. Corrected in v2 §6.1. |
| `development-plan-mobile-v1.md` | §2.2 (library table) | `@react-navigation/native` listed as "≥ 6.x" | `@react-navigation` v7 has been current since at least expo-router v4 (SDK 52). v6 is not the correct target version. Corrected to v7 throughout this document. |

---

*Document version: v2*
*Status: Living document — update prior to each sprint kickoff*
*Date: May 2026*
*Supersedes: `docs/development/development-plan-mobile-v1.md`*
*Parent: `docs/development/development-plan-v2.md`*
*Phase 2 kickoff: update this document at Month 3 to incorporate geofence, Spanish UI, pre-call intelligence, and manager mobile view*
*See `docs/product/product-brief-v1.md` for full product requirements*
*See `docs/product/product-strategy-v1.md` for legal compliance and risk details*
