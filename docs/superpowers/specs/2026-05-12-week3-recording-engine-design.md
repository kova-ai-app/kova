# Week 3 — Recording Engine Design Spec

**Date:** 2026-05-12
**Status:** Approved

## Goal

A technician can record a service call on iOS and Android. Audio chunks land in S3 and a BullMQ scoring job is enqueued. Background recording survives 20 minutes with the app backgrounded and phone locked. No analysis yet — just the recording and upload pipeline end-to-end.

## Architecture

Two workstreams: mobile recording engine + server upload pipeline. The mobile side uses `react-native-audio-api` v0.12.1 (AudioRecorder with built-in rotating file writer) for recording, MMKV for offline-first queue persistence, and direct-to-S3 presigned URL uploads. The server side provides four lightweight Next.js API routes for consent logging, presigned URL generation, and upload finalization with BullMQ job enqueue.

## Deviations from Original Spec

| Original spec | This design | Rationale |
|---|---|---|
| Tus resumable uploads via `tus-js-client` + `@tus/server` on Vercel | S3 presigned URLs + `fetch()` | 5-min chunks are ~1.2 MB — byte-level resume adds complexity without benefit. MMKV chunk queue provides chunk-level resumability. Direct-to-S3 avoids Vercel body size/timeout limits. |
| `tus-js-client` in mobile dependencies | Remove from `package.json` | No longer needed |
| Consent tone from audio file | `OscillatorNode` from `react-native-audio-api` | 440Hz sine wave for 1s — no asset file needed |
| `companyId` from request body | Derived from Clerk JWT org claim | Prevents cross-tenant writes |

---

## 1. Recording Engine (Mobile)

### Library

`react-native-audio-api` v0.12.1 by Software Mansion. Key features used:
- **AudioRecorder**: record to file with configurable format/quality (v0.11.0)
- **Rotating file writer**: automatic chunk splitting at configured intervals (v0.12.0)
- **Notification system**: lock screen / notification center controls (v0.11.0)
- **Background mode support**: configurable iOS/Android background audio (v0.6.0)
- **OscillatorNode**: consent tone generation (440Hz sine, 1 second)

### Audio Format

AAC-LC, 32kbps, mono, 44.1kHz. ~1.2 MB per 5-minute chunk. ~14 MB per hour.

### Chunk Naming

`call_{sessionId}_chunk_{N}_{timestamp}.aac`

### Platform Configuration

**iOS** (already in `app.json`):
- `NSMicrophoneUsageDescription` set
- `NSBackgroundModes: ["audio"]` set
- AVAudioSession: category `.record`, interruption handling (phone call → pause, call ends → auto-resume)

**Android** (already in `app.json`):
- `RECORD_AUDIO`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MICROPHONE` permissions set
- API 34+ runtime `FOREGROUND_SERVICE_MICROPHONE` permission check before starting
- Foreground service notification via `expo-notifications` (channel: `kova-recording`, sticky, low priority)

### Permissions

Requested at first app launch, not just-in-time. Both platforms: microphone permission. Android API 34+: additional runtime `FOREGROUND_SERVICE_MICROPHONE` check.

---

## 2. State Machine

```
IDLE
  │ tap Record
  │ ├── concurrent guard: abort if MMKV has active session
  │ └── disk space check: abort if < 200 MB free (react-native-fs)
  ▼
CONSENT_SHOWN (full-screen modal, non-dismissable)
  │ "Customer Declined" → POST /api/calls/decline (queued if offline), return IDLE
  │ "Customer Consented" ↓
  ▼
RECORDING
  │ ├── write consent to MMKV (device timestamp) — primary consent record
  │ ├── generate callId (UUID v4, client-side)
  │ ├── play 440Hz tone for 1 second (OscillatorNode)
  │ ├── start AudioRecorder with rotating file writer (5-min interval)
  │ ├── POST /api/calls/consent (background, non-blocking)
  │ ├── show Android foreground service notification
  │ ├── poll battery every 60s; warning overlay at 20%
  │ ├── on chunk rotation: register completed chunk in MMKV queue
  │ ├── phone call interruption → PAUSED (auto-resume when call ends)
  │ └── tap Pause → PAUSED / tap Stop → STOPPED
  ▼
STOPPED
  │ ├── finalize current chunk, register in MMKV queue
  │ ├── dismiss foreground notification (Android)
  │ └── navigate to JobTaggingScreen
  ▼
UPLOADING
  │ ├── upload manager processes MMKV chunk queue
  │ ├── all chunks uploaded → POST /api/calls/upload-complete
  │ └── 5 consecutive failures → UPLOAD_FAILED (manual Retry button in UI)
  ▼
COMPLETE
```

### Crash Recovery

On app startup: check MMKV for sessions with `overallStatus: 'recording'` and no `recordingStoppedAt`. Show alert: "Incomplete recording — resume or discard?"

---

## 3. Offline Queue & Upload Pipeline

### MMKV Store

`react-native-mmkv`, id: `kova-upload-queue`

```typescript
interface UploadQueue {
  sessions: Record<string, QueuedSession>
}

interface QueuedSession {
  sessionId: string
  callId: string              // client-generated UUID v4
  techId: string
  companyId: string
  consentLoggedAt: string     // device ISO timestamp — never null
  consentSyncedAt: string | null
  recordingStartedAt: string
  recordingStoppedAt: string | null
  jobMetadata: {
    customerName?: string
    jobType: 'drain' | 'plumbing' | 'both'
    notes?: string
  } | null
  chunks: PendingChunk[]
  overallStatus: 'recording' | 'stopped' | 'uploading' | 'complete' | 'failed'
}

interface PendingChunk {
  chunkId: string             // uuid v4
  chunkIndex: number          // 0-based
  filePath: string            // absolute FS path
  sizeBytes: number
  durationSec: number
  createdAt: string
  uploadAttempts: number
  lastAttemptAt: string | null
  s3Key: string | null        // set after successful upload
  status: 'pending' | 'uploading' | 'uploaded' | 'failed'
}
```

### Upload Manager

Triggered on: app open, connectivity change (`@react-native-community/netinfo`), recording stop.

1. Read pending sessions from MMKV
2. Check connectivity — offline: subscribe and exit; online: proceed
3. Sync unsynced consent events first (`POST /api/calls/consent`)
4. Per pending chunk, ordered by `chunkIndex`:
   - `GET /api/calls/upload-url?sessionId=X&chunkIndex=N&contentType=audio/aac`
   - `fetch(presignedUrl, { method: 'PUT', body: chunkFileContents, headers: { 'Content-Type': 'audio/aac' } })`
   - Success: mark `'uploaded'`, store `s3Key` in MMKV
   - Failure: increment `uploadAttempts`, schedule retry (30s → 2m → 10m → 30m → 2h)
   - After 5 failures: set `'failed'`, surface error in UI
5. All chunks uploaded for session:
   - `POST /api/calls/upload-complete`
   - Delete local chunk files from filesystem (`react-native-fs`)
   - Set session `overallStatus: 'complete'`

### Failure Modes

| Failure | Recovery |
|---|---|
| App crash during recording | MMKV active session on startup → "Resume or discard?" |
| Consent sync fails (offline) | Retry on next connectivity event |
| Upload retries exhausted | "Upload failed" + manual Retry button |
| Chunk file missing from FS | Mark `'failed'`, continue remaining chunks |
| Low storage mid-recording | Pause recording, show "Out of storage" alert |

---

## 4. Server-Side API

All routes in `apps/web/src/app/api/calls/`. Auth via Clerk JWT (middleware already configured).

### `POST /api/calls/consent`

```
Body: {
  sessionId: string
  callId: string
  consentedAt: string        // ISO8601 device timestamp
  devicePlatform: 'ios' | 'android'
}
Response 200: { callId, consentLoggedAt }
Action: INSERT/UPSERT calls row with status='uploading', consentLoggedAt set.
        Uses callId from body (client-generated). companyId + techId from JWT.
```

### `POST /api/calls/decline`

```
Body: {
  sessionId: string
  declinedAt: string
  reason: 'customer_declined'
}
Response 204
Action: INSERT into audit_logs. No call record created.
        techId + companyId from JWT.
```

### `GET /api/calls/upload-url`

```
Query: ?sessionId=X&chunkIndex=N&contentType=audio/aac
Response 200: { presignedUrl, s3Key, expiresIn: 900 }
Action:
  - companyId from JWT org claim (NOT from query params)
  - s3Key: audio/{companyId}/{sessionId}/chunk_{chunkIndex}.aac
  - Sign PUT URL with @aws-sdk/s3-request-presigner, 15-min expiry
```

### `POST /api/calls/upload-complete`

```
Body: {
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
}
Response 202: { callId, status: 'pending' }
Action:
  - UPDATE calls: durationSec, s3Key (first key), status='pending',
    customerName, jobType, notes from jobMetadata
  - enqueue BullMQ job { callId } on 'scoring' queue
```

### Dependencies to add to `apps/web`

- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`

### S3 Bucket Configuration

- Bucket name: `kova-audio-dev`
- Region: `us-east-1`
- CORS: allow PUT from `*` (mobile uploads directly)
- IAM: `s3:PutObject` + `s3:GetObject` scoped to `arn:aws:s3:::kova-audio-dev/*`
- Block all public access: ON

---

## 5. Testing Strategy

### Critical Gate — Manual, Real Devices (BLOCKING)

Background recording validation procedure:
1. Start recording on device
2. Press home button (background app)
3. Lock screen
4. Wait 20 minutes
5. Unlock, return to app
6. Stop recording
7. Verify: all 4 chunks present, no gaps, audio plays back continuously

**Must pass on both one iOS and one Android device. If either fails, halt Week 4.**

### CI-Testable (Automated)

- State machine transitions: unit test Zustand store in isolation
- MMKV queue CRUD: unit test queue module with in-memory MMKV mock
- Upload manager retry logic: unit test with mocked `fetch` and `NetInfo`
- Server endpoints: integration test against Neon test branch (CI already wired)
- Presigned URL generation: unit test with mocked `@aws-sdk/s3-request-presigner`

### Manual Device Tests (Non-blocking, pre-gate)

- Permissions flow (mic grant, foreground service)
- Consent modal → recording start → chunk appears
- Stop → JobTaggingScreen → submit → upload → call record in Neon
- BullMQ job visible in Redis

### Expo Dev Build Required

Native modules (`react-native-audio-api`, `react-native-mmkv`, `react-native-fs`) do not work in Expo Go. Must build a custom dev client before any device testing:
```
eas build --profile development --platform ios
eas build --profile development --platform android
```

---

## File Structure

### Mobile (`apps/mobile/src/`)

| File | Responsibility |
|---|---|
| `services/recording.ts` | AudioRecorder wrapper, chunk rotation, permissions, tone |
| `services/upload-manager.ts` | Presigned URL upload, retry, connectivity gating |
| `stores/recording-store.ts` | Zustand state machine (IDLE → COMPLETE) |
| `stores/upload-queue.ts` | MMKV queue CRUD — sessions and chunks |
| `screens/RecordScreen.tsx` | Record button, pulsing dot, battery, consent trigger |
| `screens/JobTaggingScreen.tsx` | Post-recording metadata entry (customer, job type, notes) |
| `components/ConsentModal.tsx` | Full-screen consent capture, non-dismissable |

### Server (`apps/web/src/app/api/calls/`)

| File | Responsibility |
|---|---|
| `consent/route.ts` | Log consent, create/upsert call record in Neon |
| `decline/route.ts` | Log decline to audit_logs |
| `upload-url/route.ts` | Generate S3 presigned PUT URL |
| `upload-complete/route.ts` | Finalize call record, enqueue BullMQ scoring job |

### Navigation Updates

| File | Change |
|---|---|
| `navigation/types.ts` | Add `JobTagging` to `RootStackParamList` |
| `navigation/RootNavigator.tsx` | Register `JobTagging` screen |
