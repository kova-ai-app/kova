# Week 3 — Recording Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A technician can record a service call on iOS and Android, with audio chunks uploaded directly to S3 and a BullMQ scoring job enqueued — background recording survives 20 minutes with phone locked.

**Architecture:** Mobile uses `react-native-audio-api` v0.12.1 `AudioRecorder` with built-in rotating file writer for 5-minute AAC-LC chunks, MMKV for offline-first queue persistence, and direct-to-S3 presigned URL uploads via plain `fetch()`. Server provides four Next.js API routes (consent, decline, upload-url, upload-complete). State machine lives in Zustand. All external services (S3, Neon, Redis) must be provisioned as prerequisites.

**Tech Stack:** react-native-audio-api, react-native-mmkv, react-native-fs, react-native-device-info, @react-native-community/netinfo, expo-notifications, zustand, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, drizzle-orm, bullmq

**Design spec:** `docs/superpowers/specs/2026-05-12-week3-recording-engine-design.md`

---

## Prerequisites (Manual — Do Before Any Code)

These require browser/console work, not code. Complete all before Task 1.

### Pre-1: AWS S3 Setup

- [ ] Sign in to AWS Console → S3 → Create bucket
  - Name: `kova-audio-dev`
  - Region: `us-east-1`
  - Block all public access: ON
  - Versioning: OFF

- [ ] Add CORS configuration to the bucket (Permissions tab → CORS):
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

- [ ] Create IAM user `kova-dev` → attach inline policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::kova-audio-dev/*"
    }
  ]
}
```

- [ ] Generate access key for `kova-dev` → copy `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

- [ ] Add to `apps/web/.env.local` (create if missing):
```
AWS_ACCESS_KEY_ID=<your key>
AWS_SECRET_ACCESS_KEY=<your secret>
AWS_REGION=us-east-1
S3_BUCKET_NAME=kova-audio-dev
```

### Pre-2: Neon Database Setup

- [ ] Go to neon.tech → Create project → name: `kova`
- [ ] Create branches: `main`, `staging`, `dev`, `test`
- [ ] Copy the **pooled** connection string for `dev` branch → `DATABASE_URL`
- [ ] Copy the **direct** connection string for `dev` branch → `DATABASE_URL_UNPOOLED`
- [ ] Add to `apps/web/.env.local` and `packages/db/.env.local`:
```
DATABASE_URL=<pooled connection string>
DATABASE_URL_UNPOOLED=<direct connection string>
```
- [ ] Run migrations:
```bash
source ~/.nvm/nvm.sh && nvm use 22
pnpm --filter @kova/db db:migrate
```
  Expected output: `Running migrations... Done.`

- [ ] Add `NEON_API_KEY` and `NEON_PROJECT_ID` to GitHub Actions secrets (Settings → Secrets → Actions) for CI Neon branch-per-run to activate.

### Pre-3: Railway Redis Setup

- [ ] Go to railway.app → New project → Add Redis service
- [ ] Copy `REDIS_URL` from the Redis service connection tab
- [ ] Add to `apps/web/.env.local` and `worker/.env.local`:
```
REDIS_URL=<your redis url>
```

### Pre-4: EAS Dev Build Setup

This gives you a custom dev client with native modules (react-native-audio-api, react-native-mmkv, react-native-fs). Expo Go does NOT support these.

- [ ] Install EAS CLI if not installed:
```bash
npm install -g eas-cli
eas login
```

- [ ] Configure EAS project ID in `apps/mobile/app.json` — replace `YOUR_EAS_PROJECT_ID`:
```bash
cd apps/mobile && eas init
```
  This updates `app.json` with the real project ID.

- [ ] Build iOS dev client:
```bash
eas build --profile development --platform ios
```
  Takes ~15 minutes. Install on device when done.

- [ ] Build Android dev client:
```bash
eas build --profile development --platform android
```
  Takes ~15 minutes. Install APK on device when done.

---

## Task 1: Remove tus-js-client, Add AWS SDK

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Remove tus-js-client from mobile, add AWS SDK to web**

In `apps/mobile/package.json`, remove `"tus-js-client": "^4.3.1"` from dependencies.

In `apps/web/package.json`, add to dependencies:
```json
"@aws-sdk/client-s3": "^3.600.0",
"@aws-sdk/s3-request-presigner": "^3.600.0"
```

- [ ] **Step 2: Install and verify**

```bash
source ~/.nvm/nvm.sh && nvm use 22
pnpm install
```
Expected: `Done in Xs using pnpm v11.1.0`

- [ ] **Step 3: Typecheck passes**

```bash
pnpm typecheck
```
Expected: `Tasks: 5 successful, 5 total`

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/package.json apps/web/package.json pnpm-lock.yaml
git commit -m "chore: remove tus-js-client, add @aws-sdk to web"
```

---

## Task 2: MMKV Upload Queue Store

**Files:**
- Create: `apps/mobile/src/stores/upload-queue.ts`
- Create: `apps/mobile/src/stores/__tests__/upload-queue.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/mobile/src/stores/__tests__/upload-queue.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock react-native-mmkv before importing the module under test
vi.mock('react-native-mmkv', () => {
  const store: Record<string, string> = {}
  return {
    MMKV: vi.fn().mockImplementation(() => ({
      getString: (key: string) => store[key] ?? undefined,
      set: (key: string, value: string) => { store[key] = value },
      delete: (key: string) => { delete store[key] },
      getAllKeys: () => Object.keys(store),
      clearAll: () => { for (const k of Object.keys(store)) delete store[k] },
    })),
  }
})

import {
  createSession,
  getSession,
  addChunk,
  markChunkUploaded,
  markChunkFailed,
  setSessionStatus,
  getIncompleteSession,
  deleteSession,
} from '../upload-queue'

beforeEach(() => {
  const { MMKV } = require('react-native-mmkv')
  new MMKV().clearAll()
})

describe('createSession', () => {
  it('creates a session and retrieves it', () => {
    createSession({
      sessionId: 'sess-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    const session = getSession('sess-1')
    expect(session).not.toBeNull()
    expect(session?.callId).toBe('call-1')
    expect(session?.overallStatus).toBe('recording')
    expect(session?.chunks).toHaveLength(0)
  })
})

describe('addChunk', () => {
  it('adds a chunk to an existing session', () => {
    createSession({
      sessionId: 'sess-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    addChunk('sess-1', {
      chunkId: 'chunk-1',
      chunkIndex: 0,
      filePath: '/tmp/chunk_0.aac',
      sizeBytes: 1200000,
      durationSec: 300,
    })
    const session = getSession('sess-1')
    expect(session?.chunks).toHaveLength(1)
    expect(session?.chunks[0]?.status).toBe('pending')
    expect(session?.chunks[0]?.uploadAttempts).toBe(0)
    expect(session?.chunks[0]?.s3Key).toBeNull()
  })
})

describe('markChunkUploaded', () => {
  it('marks a chunk as uploaded and stores s3Key', () => {
    createSession({
      sessionId: 'sess-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    addChunk('sess-1', {
      chunkId: 'chunk-1',
      chunkIndex: 0,
      filePath: '/tmp/chunk_0.aac',
      sizeBytes: 1200000,
      durationSec: 300,
    })
    markChunkUploaded('sess-1', 'chunk-1', 'audio/co-1/sess-1/chunk_0.aac')
    const session = getSession('sess-1')
    expect(session?.chunks[0]?.status).toBe('uploaded')
    expect(session?.chunks[0]?.s3Key).toBe('audio/co-1/sess-1/chunk_0.aac')
  })
})

describe('markChunkFailed', () => {
  it('increments attempt count and marks failed after 5 attempts', () => {
    createSession({
      sessionId: 'sess-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    addChunk('sess-1', {
      chunkId: 'chunk-1',
      chunkIndex: 0,
      filePath: '/tmp/chunk_0.aac',
      sizeBytes: 1200000,
      durationSec: 300,
    })
    for (let i = 0; i < 4; i++) {
      markChunkFailed('sess-1', 'chunk-1')
      const s = getSession('sess-1')
      expect(s?.chunks[0]?.status).toBe('pending')
      expect(s?.chunks[0]?.uploadAttempts).toBe(i + 1)
    }
    markChunkFailed('sess-1', 'chunk-1')
    const session = getSession('sess-1')
    expect(session?.chunks[0]?.status).toBe('failed')
    expect(session?.chunks[0]?.uploadAttempts).toBe(5)
  })
})

describe('setSessionStatus', () => {
  it('updates session overallStatus', () => {
    createSession({
      sessionId: 'sess-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    setSessionStatus('sess-1', 'uploading')
    expect(getSession('sess-1')?.overallStatus).toBe('uploading')
  })
})

describe('getIncompleteSession', () => {
  it('returns a session still in recording state', () => {
    createSession({
      sessionId: 'sess-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    const incomplete = getIncompleteSession()
    expect(incomplete?.sessionId).toBe('sess-1')
  })

  it('returns null when all sessions are complete', () => {
    createSession({
      sessionId: 'sess-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    setSessionStatus('sess-1', 'complete')
    expect(getIncompleteSession()).toBeNull()
  })
})

describe('deleteSession', () => {
  it('removes a session from the store', () => {
    createSession({
      sessionId: 'sess-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    deleteSession('sess-1')
    expect(getSession('sess-1')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @kova/mobile test
```
Expected: FAIL with "Cannot find module '../upload-queue'"

- [ ] **Step 3: Create the upload queue module**

Create `apps/mobile/src/stores/upload-queue.ts`:

```typescript
import { MMKV } from 'react-native-mmkv'

// ---------------------------------------------------------------------------
// MMKV-backed upload queue
// Stores all recording sessions and their chunks across app restarts.
// ---------------------------------------------------------------------------

const mmkv = new MMKV({ id: 'kova-upload-queue' })
const QUEUE_KEY = 'sessions'

export interface QueuedSession {
  sessionId: string
  callId: string
  techId: string
  companyId: string
  consentLoggedAt: string
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

export interface PendingChunk {
  chunkId: string
  chunkIndex: number
  filePath: string
  sizeBytes: number
  durationSec: number
  createdAt: string
  uploadAttempts: number
  lastAttemptAt: string | null
  s3Key: string | null
  status: 'pending' | 'uploading' | 'uploaded' | 'failed'
}

const MAX_UPLOAD_ATTEMPTS = 5

function readAll(): Record<string, QueuedSession> {
  const raw = mmkv.getString(QUEUE_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, QueuedSession>
  } catch {
    return {}
  }
}

function writeAll(sessions: Record<string, QueuedSession>): void {
  mmkv.set(QUEUE_KEY, JSON.stringify(sessions))
}

export function createSession(params: {
  sessionId: string
  callId: string
  techId: string
  companyId: string
  consentLoggedAt: string
}): QueuedSession {
  const sessions = readAll()
  const session: QueuedSession = {
    ...params,
    consentSyncedAt: null,
    recordingStartedAt: new Date().toISOString(),
    recordingStoppedAt: null,
    jobMetadata: null,
    chunks: [],
    overallStatus: 'recording',
  }
  sessions[params.sessionId] = session
  writeAll(sessions)
  return session
}

export function getSession(sessionId: string): QueuedSession | null {
  return readAll()[sessionId] ?? null
}

export function addChunk(
  sessionId: string,
  chunk: {
    chunkId: string
    chunkIndex: number
    filePath: string
    sizeBytes: number
    durationSec: number
  }
): void {
  const sessions = readAll()
  const session = sessions[sessionId]
  if (!session) return
  const pendingChunk: PendingChunk = {
    ...chunk,
    createdAt: new Date().toISOString(),
    uploadAttempts: 0,
    lastAttemptAt: null,
    s3Key: null,
    status: 'pending',
  }
  session.chunks.push(pendingChunk)
  writeAll(sessions)
}

export function markChunkUploaded(
  sessionId: string,
  chunkId: string,
  s3Key: string
): void {
  const sessions = readAll()
  const session = sessions[sessionId]
  if (!session) return
  const chunk = session.chunks.find((c) => c.chunkId === chunkId)
  if (!chunk) return
  chunk.status = 'uploaded'
  chunk.s3Key = s3Key
  writeAll(sessions)
}

export function markChunkFailed(sessionId: string, chunkId: string): void {
  const sessions = readAll()
  const session = sessions[sessionId]
  if (!session) return
  const chunk = session.chunks.find((c) => c.chunkId === chunkId)
  if (!chunk) return
  chunk.uploadAttempts += 1
  chunk.lastAttemptAt = new Date().toISOString()
  if (chunk.uploadAttempts >= MAX_UPLOAD_ATTEMPTS) {
    chunk.status = 'failed'
  }
  writeAll(sessions)
}

export function setSessionStatus(
  sessionId: string,
  status: QueuedSession['overallStatus']
): void {
  const sessions = readAll()
  const session = sessions[sessionId]
  if (!session) return
  session.overallStatus = status
  writeAll(sessions)
}

export function setSessionStopped(sessionId: string): void {
  const sessions = readAll()
  const session = sessions[sessionId]
  if (!session) return
  session.recordingStoppedAt = new Date().toISOString()
  session.overallStatus = 'stopped'
  writeAll(sessions)
}

export function setJobMetadata(
  sessionId: string,
  metadata: QueuedSession['jobMetadata']
): void {
  const sessions = readAll()
  const session = sessions[sessionId]
  if (!session) return
  session.jobMetadata = metadata
  writeAll(sessions)
}

export function markConsentSynced(sessionId: string): void {
  const sessions = readAll()
  const session = sessions[sessionId]
  if (!session) return
  session.consentSyncedAt = new Date().toISOString()
  writeAll(sessions)
}

export function getIncompleteSession(): QueuedSession | null {
  const sessions = readAll()
  return (
    Object.values(sessions).find(
      (s) => s.overallStatus === 'recording' && !s.recordingStoppedAt
    ) ?? null
  )
}

export function getPendingSessions(): QueuedSession[] {
  return Object.values(readAll()).filter(
    (s) => s.overallStatus === 'stopped' || s.overallStatus === 'uploading' || s.overallStatus === 'failed'
  )
}

export function deleteSession(sessionId: string): void {
  const sessions = readAll()
  delete sessions[sessionId]
  writeAll(sessions)
}
```

- [ ] **Step 4: Add vitest config to mobile package**

Check if `apps/mobile/package.json` has a `test` script. If it says `"test": "echo 'no tests'"`, replace with vitest. First add vitest to mobile devDeps:

In `apps/mobile/package.json`, add to `devDependencies`:
```json
"vitest": "^2.0.0"
```

Add to `scripts`:
```json
"test": "vitest run"
```

Create `apps/mobile/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
  },
})
```

- [ ] **Step 5: Run tests and verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22
pnpm install
pnpm --filter @kova/mobile test
```
Expected: all 7 test suites PASS

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/stores/upload-queue.ts \
        apps/mobile/src/stores/__tests__/upload-queue.test.ts \
        apps/mobile/vitest.config.ts \
        apps/mobile/package.json \
        pnpm-lock.yaml
git commit -m "feat: MMKV upload queue store with full test coverage"
```

---

## Task 3: Zustand Recording State Machine

**Files:**
- Create: `apps/mobile/src/stores/recording-store.ts`
- Create: `apps/mobile/src/stores/__tests__/recording-store.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/mobile/src/stores/__tests__/recording-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock all native modules before importing the store
vi.mock('react-native-mmkv', () => {
  const store: Record<string, string> = {}
  return {
    MMKV: vi.fn().mockImplementation(() => ({
      getString: (key: string) => store[key] ?? undefined,
      set: (key: string, value: string) => { store[key] = value },
      delete: (key: string) => { delete store[key] },
      getAllKeys: () => Object.keys(store),
      clearAll: () => { for (const k of Object.keys(store)) delete store[k] },
    })),
  }
})
vi.mock('react-native-fs', () => ({
  default: { getFSInfo: vi.fn().mockResolvedValue({ freeSpace: 500 * 1024 * 1024 }) },
}))
vi.mock('react-native-audio-api', () => ({
  AudioContext: vi.fn(),
}))
vi.mock('react-native-device-info', () => ({
  default: { getBatteryLevel: vi.fn().mockResolvedValue(0.8) },
}))
vi.mock('expo-notifications', () => ({
  setNotificationChannelAsync: vi.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: vi.fn().mockResolvedValue(undefined),
  dismissNotificationAsync: vi.fn().mockResolvedValue(undefined),
  AndroidImportance: { LOW: 2 },
}))
vi.mock('../../services/recording', () => ({
  requestRecordingPermissions: vi.fn().mockResolvedValue(undefined),
  startRecorder: vi.fn().mockResolvedValue(undefined),
  stopRecorder: vi.fn().mockResolvedValue({ durationSec: 300 }),
  pauseRecorder: vi.fn().mockResolvedValue(undefined),
  resumeRecorder: vi.fn().mockResolvedValue(undefined),
  playConsentTone: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../upload-queue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../upload-queue')>()
  return { ...actual }
})

import { useRecordingStore } from '../recording-store'

beforeEach(() => {
  useRecordingStore.setState({
    status: 'idle',
    sessionId: null,
    callId: null,
    batteryLevel: null,
    elapsedSec: 0,
    chunkCount: 0,
    error: null,
  })
})

describe('initial state', () => {
  it('starts idle', () => {
    expect(useRecordingStore.getState().status).toBe('idle')
  })
})

describe('startRecording', () => {
  it('transitions from idle to consent_shown', async () => {
    await useRecordingStore.getState().startRecording({ techId: 'tech-1', companyId: 'co-1' })
    expect(useRecordingStore.getState().status).toBe('consent_shown')
  })
})

describe('consentGranted', () => {
  it('transitions from consent_shown to recording', async () => {
    await useRecordingStore.getState().startRecording({ techId: 'tech-1', companyId: 'co-1' })
    await useRecordingStore.getState().consentGranted()
    expect(useRecordingStore.getState().status).toBe('recording')
    expect(useRecordingStore.getState().sessionId).not.toBeNull()
    expect(useRecordingStore.getState().callId).not.toBeNull()
  })
})

describe('consentDeclined', () => {
  it('transitions from consent_shown back to idle', async () => {
    await useRecordingStore.getState().startRecording({ techId: 'tech-1', companyId: 'co-1' })
    await useRecordingStore.getState().consentDeclined()
    expect(useRecordingStore.getState().status).toBe('idle')
    expect(useRecordingStore.getState().sessionId).toBeNull()
  })
})

describe('stopRecording', () => {
  it('transitions from recording to stopped', async () => {
    await useRecordingStore.getState().startRecording({ techId: 'tech-1', companyId: 'co-1' })
    await useRecordingStore.getState().consentGranted()
    await useRecordingStore.getState().stopRecording()
    expect(useRecordingStore.getState().status).toBe('stopped')
  })
})

describe('concurrent guard', () => {
  it('throws if startRecording called while already recording', async () => {
    await useRecordingStore.getState().startRecording({ techId: 'tech-1', companyId: 'co-1' })
    await useRecordingStore.getState().consentGranted()
    await expect(
      useRecordingStore.getState().startRecording({ techId: 'tech-1', companyId: 'co-1' })
    ).rejects.toThrow('Recording already active')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @kova/mobile test
```
Expected: FAIL with "Cannot find module '../recording-store'"

- [ ] **Step 3: Create the recording store**

Create `apps/mobile/src/stores/recording-store.ts`:

```typescript
import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import {
  requestRecordingPermissions,
  startRecorder,
  stopRecorder,
  pauseRecorder,
  resumeRecorder,
  playConsentTone,
} from '../services/recording'
import {
  createSession,
  setSessionStopped,
  setSessionStatus,
} from './upload-queue'

// ---------------------------------------------------------------------------
// Recording state machine
// ---------------------------------------------------------------------------

export type RecordingStatus =
  | 'idle'
  | 'consent_shown'
  | 'recording'
  | 'paused'
  | 'stopped'
  | 'uploading'
  | 'complete'
  | 'upload_failed'

interface RecordingState {
  status: RecordingStatus
  sessionId: string | null
  callId: string | null
  techId: string | null
  companyId: string | null
  batteryLevel: number | null
  elapsedSec: number
  chunkCount: number
  error: string | null
  // Actions
  startRecording: (params: { techId: string; companyId: string }) => Promise<void>
  consentGranted: () => Promise<void>
  consentDeclined: () => Promise<void>
  pauseRecording: () => Promise<void>
  resumeRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  onChunkRotated: (chunkPath: string, durationSec: number) => void
  setStatus: (status: RecordingStatus) => void
  setBatteryLevel: (level: number) => void
  incrementElapsed: () => void
  reset: () => void
}

export const useRecordingStore = create<RecordingState>((set, get) => ({
  status: 'idle',
  sessionId: null,
  callId: null,
  techId: null,
  companyId: null,
  batteryLevel: null,
  elapsedSec: 0,
  chunkCount: 0,
  error: null,

  startRecording: async ({ techId, companyId }) => {
    const { status } = get()
    if (status !== 'idle') {
      throw new Error('Recording already active')
    }
    await requestRecordingPermissions()
    set({ status: 'consent_shown', techId, companyId })
  },

  consentGranted: async () => {
    const { techId, companyId } = get()
    if (!techId || !companyId) return
    const sessionId = uuidv4()
    const callId = uuidv4()
    createSession({
      sessionId,
      callId,
      techId,
      companyId,
      consentLoggedAt: new Date().toISOString(),
    })
    set({ status: 'recording', sessionId, callId, elapsedSec: 0, chunkCount: 0 })
    await playConsentTone()
    await startRecorder(sessionId)
  },

  consentDeclined: async () => {
    set({ status: 'idle', sessionId: null, callId: null, techId: null, companyId: null })
  },

  pauseRecording: async () => {
    await pauseRecorder()
    set({ status: 'paused' })
  },

  resumeRecording: async () => {
    await resumeRecorder()
    set({ status: 'recording' })
  },

  stopRecording: async () => {
    const { sessionId } = get()
    if (!sessionId) return
    await stopRecorder()
    setSessionStopped(sessionId)
    set({ status: 'stopped' })
  },

  onChunkRotated: (chunkPath: string, durationSec: number) => {
    set((state) => ({ chunkCount: state.chunkCount + 1 }))
    // chunk registration handled in recording.ts via addChunk
  },

  setStatus: (status) => set({ status }),
  setBatteryLevel: (level) => set({ batteryLevel: level }),
  incrementElapsed: () => set((state) => ({ elapsedSec: state.elapsedSec + 1 })),

  reset: () =>
    set({
      status: 'idle',
      sessionId: null,
      callId: null,
      techId: null,
      companyId: null,
      batteryLevel: null,
      elapsedSec: 0,
      chunkCount: 0,
      error: null,
    }),
}))
```

- [ ] **Step 4: Add uuid dependency to mobile**

In `apps/mobile/package.json` dependencies add:
```json
"uuid": "^11.0.0"
```
And in devDependencies:
```json
"@types/uuid": "^10.0.0"
```

```bash
pnpm install
```

- [ ] **Step 5: Run tests and verify they pass**

```bash
pnpm --filter @kova/mobile test
```
Expected: all tests PASS (the recording service is mocked)

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/stores/recording-store.ts \
        apps/mobile/src/stores/__tests__/recording-store.test.ts \
        apps/mobile/package.json \
        pnpm-lock.yaml
git commit -m "feat: Zustand recording state machine with state transition tests"
```

---

## Task 4: Recording Service (AudioRecorder Wrapper)

**Files:**
- Create: `apps/mobile/src/services/recording.ts`

This is a native module wrapper — it cannot be unit tested without a real device. We write it for correctness and test it manually in Pre-4.

- [ ] **Step 1: Create the recording service**

Create `apps/mobile/src/services/recording.ts`:

```typescript
import { Platform } from 'react-native'
import { AudioContext } from 'react-native-audio-api'
import * as Notifications from 'expo-notifications'
import RNFS from 'react-native-fs'
import { addChunk } from '../stores/upload-queue'

// ---------------------------------------------------------------------------
// Recording service — wraps react-native-audio-api AudioRecorder
// ---------------------------------------------------------------------------

const CHUNK_DURATION_MS = 5 * 60 * 1000 // 5 minutes
const MIN_FREE_BYTES = 200 * 1024 * 1024  // 200 MB
const RECORDING_NOTIFICATION_ID = 'kova-recording-active'

let audioContext: InstanceType<typeof AudioContext> | null = null
let currentSessionId: string | null = null
let chunkIndex = 0

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export async function requestRecordingPermissions(): Promise<void> {
  // Disk space check
  const fsInfo = await RNFS.getFSInfo()
  if (fsInfo.freeSpace < MIN_FREE_BYTES) {
    throw new Error('INSUFFICIENT_DISK_SPACE')
  }

  if (Platform.OS === 'android') {
    const { PermissionsAndroid } = require('react-native')
    // API 34+ requires FOREGROUND_SERVICE_MICROPHONE at runtime
    if (Platform.Version >= 34) {
      const fsmStatus = await PermissionsAndroid.request(
        'android.permission.FOREGROUND_SERVICE_MICROPHONE'
      )
      if (fsmStatus !== 'granted') {
        throw new Error('FOREGROUND_SERVICE_MICROPHONE_DENIED')
      }
    }
    const audioStatus = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    )
    if (audioStatus !== 'granted') {
      throw new Error('RECORD_AUDIO_DENIED')
    }
  }

  if (Platform.OS === 'ios') {
    // react-native-audio-api handles AVAudioSession permission internally
    // when AudioContext is created with input enabled
  }
}

// ---------------------------------------------------------------------------
// Consent tone — 440Hz sine wave for 1 second
// ---------------------------------------------------------------------------

export async function playConsentTone(): Promise<void> {
  const ctx = new AudioContext()
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = 440

  gain.gain.setValueAtTime(0.3, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1)

  oscillator.connect(gain)
  gain.connect(ctx.destination)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + 1)

  await new Promise<void>((resolve) => setTimeout(resolve, 1100))
  await ctx.close()
}

// ---------------------------------------------------------------------------
// Android foreground service notification
// ---------------------------------------------------------------------------

async function showRecordingNotification(): Promise<void> {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('kova-recording', {
    name: 'Recording Status',
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
  })
  await Notifications.scheduleNotificationAsync({
    identifier: RECORDING_NOTIFICATION_ID,
    content: {
      title: 'Kova — Recording Active',
      body: 'Tap to return to the app.',
      sticky: true,
      priority: 'low',
    },
    trigger: null,
  })
}

async function dismissRecordingNotification(): Promise<void> {
  if (Platform.OS !== 'android') return
  await Notifications.dismissNotificationAsync(RECORDING_NOTIFICATION_ID)
}

// ---------------------------------------------------------------------------
// Recorder lifecycle
// ---------------------------------------------------------------------------

export async function startRecorder(sessionId: string): Promise<void> {
  currentSessionId = sessionId
  chunkIndex = 0

  // AudioContext with microphone input and background audio mode
  audioContext = new AudioContext({
    sampleRate: 44100,
    latencyHint: 'balanced',
  })

  const recorder = (audioContext as any).createAudioRecorder({
    bitRate: 32000,
    sampleRate: 44100,
    channels: 1,
    format: 'aac',
    // Rotating file writer — new file every 5 minutes
    rotationInterval: CHUNK_DURATION_MS,
    outputDirectory: RNFS.DocumentDirectoryPath,
    fileNamePrefix: `call_${sessionId}_chunk_`,
    onFileRotation: (filePath: string, durationSec: number) => {
      handleChunkRotation(filePath, durationSec)
    },
  })

  await recorder.start()
  await showRecordingNotification()
}

function handleChunkRotation(filePath: string, durationSec: number): void {
  if (!currentSessionId) return
  const { v4: uuidv4 } = require('uuid')
  const stats = { size: 0 } // Will be read async but chunk is registered immediately
  RNFS.stat(filePath)
    .then((stat) => {
      addChunk(currentSessionId!, {
        chunkId: uuidv4(),
        chunkIndex: chunkIndex++,
        filePath,
        sizeBytes: stat.size,
        durationSec,
      })
    })
    .catch(() => {
      // If stat fails, register with estimated size
      addChunk(currentSessionId!, {
        chunkId: uuidv4(),
        chunkIndex: chunkIndex++,
        filePath,
        sizeBytes: Math.round(durationSec * 4000), // ~32kbps estimate
        durationSec,
      })
    })
}

export async function stopRecorder(): Promise<{ durationSec: number }> {
  if (!audioContext || !currentSessionId) return { durationSec: 0 }

  const recorder = (audioContext as any).recorder
  const result = await recorder?.stop()
  await dismissRecordingNotification()

  // Register the final partial chunk if one exists
  if (result?.filePath && result?.durationSec > 0) {
    handleChunkRotation(result.filePath, result.durationSec)
  }

  await audioContext.close()
  audioContext = null
  const totalDuration = result?.totalDurationSec ?? 0
  currentSessionId = null
  return { durationSec: totalDuration }
}

export async function pauseRecorder(): Promise<void> {
  if (!audioContext) return
  await audioContext.suspend()
}

export async function resumeRecorder(): Promise<void> {
  if (!audioContext) return
  await audioContext.resume()
}
```

- [ ] **Step 2: Typecheck passes**

```bash
pnpm --filter @kova/mobile typecheck
```
Expected: PASS (native module types from react-native-audio-api)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/services/recording.ts
git commit -m "feat: AudioRecorder wrapper with chunk rotation, permissions, consent tone"
```

---

## Task 5: Upload Manager Service

**Files:**
- Create: `apps/mobile/src/services/upload-manager.ts`
- Create: `apps/mobile/src/services/__tests__/upload-manager.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/mobile/src/services/__tests__/upload-manager.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest'

vi.mock('react-native-mmkv', () => {
  const store: Record<string, string> = {}
  return {
    MMKV: vi.fn().mockImplementation(() => ({
      getString: (key: string) => store[key] ?? undefined,
      set: (key: string, value: string) => { store[key] = value },
      delete: (key: string) => { delete store[key] },
      getAllKeys: () => Object.keys(store),
      clearAll: () => { for (const k of Object.keys(store)) delete store[k] },
    })),
  }
})
vi.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: vi.fn().mockResolvedValue({ isConnected: true }),
    addEventListener: vi.fn().mockReturnValue(() => {}),
  },
}))
vi.mock('react-native-fs', () => ({
  default: { unlink: vi.fn().mockResolvedValue(undefined), readFile: vi.fn().mockResolvedValue('binary') },
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

import NetInfo from '@react-native-community/netinfo'
import {
  createSession,
  addChunk,
  getSession,
  markConsentSynced,
} from '../../stores/upload-queue'
import { runUploadManager } from '../upload-manager'

const API_BASE = 'http://localhost:3000'
const AUTH_TOKEN = 'test-token'

beforeEach(() => {
  const { MMKV } = require('react-native-mmkv')
  new MMKV().clearAll()
  vi.clearAllMocks()
  ;(NetInfo.fetch as MockedFunction<typeof NetInfo.fetch>).mockResolvedValue({
    isConnected: true,
  } as any)
})

describe('runUploadManager — offline', () => {
  it('does nothing when offline', async () => {
    ;(NetInfo.fetch as MockedFunction<typeof NetInfo.fetch>).mockResolvedValue({
      isConnected: false,
    } as any)
    createSession({
      sessionId: 'sess-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    addChunk('sess-1', {
      chunkId: 'chunk-1',
      chunkIndex: 0,
      filePath: '/tmp/chunk_0.aac',
      sizeBytes: 1200000,
      durationSec: 300,
    })
    await runUploadManager({ apiBaseUrl: API_BASE, authToken: AUTH_TOKEN })
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('runUploadManager — successful upload', () => {
  it('uploads all chunks and calls upload-complete', async () => {
    createSession({
      sessionId: 'sess-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    addChunk('sess-1', {
      chunkId: 'chunk-1',
      chunkIndex: 0,
      filePath: '/tmp/chunk_0.aac',
      sizeBytes: 1200000,
      durationSec: 300,
    })
    // Mark session as stopped so upload manager picks it up
    const { setSessionStopped } = await import('../../stores/upload-queue')
    setSessionStopped('sess-1')

    // Mock: GET upload-url → presigned URL
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          presignedUrl: 'https://s3.amazonaws.com/kova-audio-dev/audio/co-1/sess-1/chunk_0.aac?sig=abc',
          s3Key: 'audio/co-1/sess-1/chunk_0.aac',
          expiresIn: 900,
        }),
      })
      // Mock: PUT to S3 (presigned URL)
      .mockResolvedValueOnce({ ok: true })
      // Mock: POST upload-complete
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ callId: 'call-1', status: 'pending' }),
      })

    await runUploadManager({ apiBaseUrl: API_BASE, authToken: AUTH_TOKEN })

    const session = getSession('sess-1')
    expect(session?.overallStatus).toBe('complete')
    expect(session?.chunks[0]?.status).toBe('uploaded')
    expect(session?.chunks[0]?.s3Key).toBe('audio/co-1/sess-1/chunk_0.aac')
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })
})

describe('runUploadManager — retry on failure', () => {
  it('increments attempts on upload failure', async () => {
    createSession({
      sessionId: 'sess-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    addChunk('sess-1', {
      chunkId: 'chunk-1',
      chunkIndex: 0,
      filePath: '/tmp/chunk_0.aac',
      sizeBytes: 1200000,
      durationSec: 300,
    })
    const { setSessionStopped } = await import('../../stores/upload-queue')
    setSessionStopped('sess-1')

    // Mock: GET upload-url succeeds, PUT to S3 fails
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          presignedUrl: 'https://s3.amazonaws.com/bucket/key?sig=abc',
          s3Key: 'audio/co-1/sess-1/chunk_0.aac',
          expiresIn: 900,
        }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 })

    await runUploadManager({ apiBaseUrl: API_BASE, authToken: AUTH_TOKEN })

    const session = getSession('sess-1')
    expect(session?.chunks[0]?.uploadAttempts).toBe(1)
    expect(session?.chunks[0]?.status).toBe('pending')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @kova/mobile test
```
Expected: FAIL with "Cannot find module '../upload-manager'"

- [ ] **Step 3: Create the upload manager**

Create `apps/mobile/src/services/upload-manager.ts`:

```typescript
import NetInfo from '@react-native-community/netinfo'
import RNFS from 'react-native-fs'
import {
  getPendingSessions,
  markChunkUploaded,
  markChunkFailed,
  markConsentSynced,
  setSessionStatus,
  getSession,
  type QueuedSession,
  type PendingChunk,
} from '../stores/upload-queue'

// ---------------------------------------------------------------------------
// Upload manager — processes MMKV chunk queue
// Called on: app open, connectivity change, recording stop
// ---------------------------------------------------------------------------

interface UploadManagerParams {
  apiBaseUrl: string
  authToken: string
}

export async function runUploadManager({
  apiBaseUrl,
  authToken,
}: UploadManagerParams): Promise<void> {
  const netState = await NetInfo.fetch()
  if (!netState.isConnected) return

  const sessions = getPendingSessions()
  if (sessions.length === 0) return

  for (const session of sessions) {
    await processSession(session, apiBaseUrl, authToken)
  }
}

async function processSession(
  session: QueuedSession,
  apiBaseUrl: string,
  authToken: string
): Promise<void> {
  setSessionStatus(session.sessionId, 'uploading')

  // Sync consent event if not yet synced
  if (!session.consentSyncedAt) {
    try {
      await fetch(`${apiBaseUrl}/api/calls/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sessionId: session.sessionId,
          callId: session.callId,
          consentedAt: session.consentLoggedAt,
          devicePlatform: require('react-native').Platform.OS,
        }),
      })
      markConsentSynced(session.sessionId)
    } catch {
      // Non-blocking — continue with upload
    }
  }

  // Upload chunks in order
  const pendingChunks = session.chunks
    .filter((c) => c.status === 'pending' || c.status === 'uploading')
    .sort((a, b) => a.chunkIndex - b.chunkIndex)

  for (const chunk of pendingChunks) {
    await uploadChunk(session, chunk, apiBaseUrl, authToken)
  }

  // Check if all chunks are now uploaded
  const refreshed = getSession(session.sessionId)
  if (!refreshed) return

  const allUploaded = refreshed.chunks.every((c) => c.status === 'uploaded')
  if (!allUploaded) {
    const anyFailed = refreshed.chunks.some((c) => c.status === 'failed')
    if (anyFailed) {
      setSessionStatus(session.sessionId, 'failed')
    }
    return
  }

  // All uploaded — call upload-complete
  try {
    const s3Keys = refreshed.chunks.map((c) => c.s3Key).filter(Boolean) as string[]
    const totalDurationSec = refreshed.chunks.reduce((acc, c) => acc + c.durationSec, 0)

    const res = await fetch(`${apiBaseUrl}/api/calls/upload-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        callId: refreshed.callId,
        sessionId: refreshed.sessionId,
        s3Keys,
        totalDurationSec,
        chunkCount: refreshed.chunks.length,
        jobMetadata: refreshed.jobMetadata,
        devicePlatform: require('react-native').Platform.OS,
        audioFormat: 'aac-lc',
        audioBitrateKbps: 32,
      }),
    })

    if (res.ok) {
      // Delete local chunk files
      for (const chunk of refreshed.chunks) {
        try {
          await RNFS.unlink(chunk.filePath)
        } catch {
          // File may already be gone
        }
      }
      setSessionStatus(session.sessionId, 'complete')
    }
  } catch {
    // upload-complete failed — will retry on next run
  }
}

async function uploadChunk(
  session: QueuedSession,
  chunk: PendingChunk,
  apiBaseUrl: string,
  authToken: string
): Promise<void> {
  try {
    // Step 1: Get presigned URL
    const urlRes = await fetch(
      `${apiBaseUrl}/api/calls/upload-url?sessionId=${session.sessionId}&chunkIndex=${chunk.chunkIndex}&contentType=audio/aac`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    )
    if (!urlRes.ok) {
      markChunkFailed(session.sessionId, chunk.chunkId)
      return
    }
    const { presignedUrl, s3Key } = (await urlRes.json()) as {
      presignedUrl: string
      s3Key: string
      expiresIn: number
    }

    // Step 2: Read file and PUT to S3
    const fileContents = await RNFS.readFile(chunk.filePath, 'base64')
    const binaryStr = Buffer.from(fileContents, 'base64')

    const putRes = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'audio/aac' },
      body: binaryStr,
    })

    if (putRes.ok) {
      markChunkUploaded(session.sessionId, chunk.chunkId, s3Key)
    } else {
      markChunkFailed(session.sessionId, chunk.chunkId)
    }
  } catch {
    markChunkFailed(session.sessionId, chunk.chunkId)
  }
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
pnpm --filter @kova/mobile test
```
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/services/upload-manager.ts \
        apps/mobile/src/services/__tests__/upload-manager.test.ts
git commit -m "feat: upload manager with presigned URL upload, retry logic, and tests"
```

---

## Task 6: Server — Presigned URL Endpoint

**Files:**
- Create: `apps/web/src/app/api/calls/upload-url/route.ts`
- Create: `apps/web/src/app/api/calls/__tests__/upload-url.test.ts`
- Create: `apps/web/src/lib/s3.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/app/api/calls/__tests__/upload-url.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  PutObjectCommand: vi.fn().mockImplementation((params) => ({ input: params })),
}))
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.amazonaws.com/kova-audio-dev/audio/co-1/sess-1/chunk_0.aac?X-Amz-Signature=abc'),
}))
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({
    userId: 'user-1',
    orgId: 'org-1',
    sessionClaims: { org_id: 'org-1' },
  }),
}))
vi.mock('@kova/db', () => ({
  db: {},
  companies: {},
}))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

import { GET } from '../upload-url/route'

// Helper to create a NextRequest mock
function makeRequest(searchParams: Record<string, string>) {
  const url = new URL('http://localhost/api/calls/upload-url')
  for (const [k, v] of Object.entries(searchParams)) {
    url.searchParams.set(k, v)
  }
  return new Request(url.toString()) as any
}

describe('GET /api/calls/upload-url', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.S3_BUCKET_NAME = 'kova-audio-dev'
    process.env.AWS_REGION = 'us-east-1'
    process.env.AWS_ACCESS_KEY_ID = 'test-key'
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret'

    // Mock DB lookup for companyId from orgId
    const { db } = require('@kova/db')
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'co-1' }]),
      }),
    })
  })

  it('returns a presigned URL and s3Key', async () => {
    const req = makeRequest({
      sessionId: 'sess-1',
      chunkIndex: '0',
      contentType: 'audio/aac',
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.presignedUrl).toContain('s3.amazonaws.com')
    expect(body.s3Key).toBe('audio/co-1/sess-1/chunk_0.aac')
    expect(body.expiresIn).toBe(900)
  })

  it('returns 400 when sessionId is missing', async () => {
    const req = makeRequest({ chunkIndex: '0', contentType: 'audio/aac' })
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    const { auth } = require('@clerk/nextjs/server')
    auth.mockResolvedValueOnce({ userId: null, orgId: null })
    const req = makeRequest({ sessionId: 'sess-1', chunkIndex: '0', contentType: 'audio/aac' })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @kova/web test
```
Expected: FAIL with "Cannot find module '../upload-url/route'"

Note: if `@kova/web` has no test script yet, add to `apps/web/package.json` scripts:
```json
"test": "vitest run"
```
And add to devDependencies:
```json
"vitest": "^2.0.0"
```
Then `pnpm install`.

- [ ] **Step 3: Create the S3 client helper**

Create `apps/web/src/lib/s3.ts`:

```typescript
import { S3Client } from '@aws-sdk/client-s3'

// ---------------------------------------------------------------------------
// Singleton S3 client — re-used across invocations in the same warm function
// ---------------------------------------------------------------------------

let s3Client: S3Client | null = null

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION ?? 'us-east-1',
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

- [ ] **Step 4: Create the upload-url route**

Create `apps/web/src/app/api/calls/upload-url/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { db, companies } from '@kova/db'
import { eq } from 'drizzle-orm'
import { getS3Client, S3_BUCKET } from '@/lib/s3'

const PRESIGNED_URL_EXPIRES_SEC = 900 // 15 minutes

export async function GET(request: Request) {
  // Auth
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Params
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const chunkIndex = searchParams.get('chunkIndex')
  const contentType = searchParams.get('contentType') ?? 'audio/aac'

  if (!sessionId || chunkIndex === null) {
    return NextResponse.json(
      { error: 'sessionId and chunkIndex are required' },
      { status: 400 }
    )
  }

  // Resolve companyId from Clerk org — prevents cross-tenant writes
  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.clerkOrgId, orgId))

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const s3Key = `audio/${company.id}/${sessionId}/chunk_${chunkIndex}.aac`

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    ContentType: contentType,
  })

  const presignedUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: PRESIGNED_URL_EXPIRES_SEC,
  })

  return NextResponse.json({ presignedUrl, s3Key, expiresIn: PRESIGNED_URL_EXPIRES_SEC })
}
```

- [ ] **Step 5: Run tests and verify they pass**

```bash
pnpm --filter @kova/web test
```
Expected: PASS

- [ ] **Step 6: Typecheck**

```bash
pnpm typecheck
```
Expected: `Tasks: 5 successful, 5 total`

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/s3.ts \
        apps/web/src/app/api/calls/upload-url/route.ts \
        apps/web/src/app/api/calls/__tests__/upload-url.test.ts \
        apps/web/package.json \
        pnpm-lock.yaml
git commit -m "feat: S3 presigned URL endpoint with auth and cross-tenant guard"
```

---

## Task 7: Server — Consent, Decline, and Upload-Complete Endpoints

**Files:**
- Create: `apps/web/src/app/api/calls/consent/route.ts`
- Create: `apps/web/src/app/api/calls/decline/route.ts`
- Create: `apps/web/src/app/api/calls/upload-complete/route.ts`
- Modify: `apps/web/src/app/api/calls/__tests__/upload-url.test.ts` → add new test file

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/app/api/calls/__tests__/consent.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'user-1', orgId: 'org-1' }),
}))
vi.mock('@kova/db', () => ({
  db: {},
  calls: {},
  users: {},
  companies: {},
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))

import { POST } from '../consent/route'

function makeRequest(body: object) {
  return new Request('http://localhost/api/calls/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

describe('POST /api/calls/consent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const { db } = require('@kova/db')

    // Mock company lookup
    db.select = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'co-1' }]),
        }),
      })
      // Mock user lookup
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'user-db-1' }]),
        }),
      })

    db.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'call-db-1',
            consentLoggedAt: '2026-05-12T10:00:00.000Z',
          }]),
        }),
      }),
    })
  })

  it('creates a call record and returns 200', async () => {
    const req = makeRequest({
      sessionId: 'sess-1',
      callId: 'call-1',
      consentedAt: '2026-05-12T10:00:00.000Z',
      devicePlatform: 'ios',
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.callId).toBeDefined()
    expect(body.consentLoggedAt).toBeDefined()
  })

  it('returns 401 when unauthenticated', async () => {
    const { auth } = require('@clerk/nextjs/server')
    auth.mockResolvedValueOnce({ userId: null, orgId: null })
    const res = await POST(makeRequest({ sessionId: 'sess-1', callId: 'call-1' }))
    expect(res.status).toBe(401)
  })
})
```

Create `apps/web/src/app/api/calls/__tests__/upload-complete.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'user-1', orgId: 'org-1' }),
}))
vi.mock('@kova/db', () => ({ db: {}, calls: {}, companies: {}, users: {} }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
  })),
}))

import { POST } from '../upload-complete/route'

function makeRequest(body: object) {
  return new Request('http://localhost/api/calls/upload-complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

describe('POST /api/calls/upload-complete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.REDIS_URL = 'redis://localhost:6379'

    const { db } = require('@kova/db')
    db.select = vi.fn()
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ id: 'co-1' }]) }) })
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ id: 'user-db-1' }]) }) })

    db.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })
  })

  it('enqueues a BullMQ job and returns 202', async () => {
    const req = makeRequest({
      callId: 'call-1',
      sessionId: 'sess-1',
      s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
      totalDurationSec: 300,
      chunkCount: 1,
      jobMetadata: { jobType: 'drain' },
      devicePlatform: 'ios',
      audioFormat: 'aac-lc',
      audioBitrateKbps: 32,
    })
    const res = await POST(req)
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body.callId).toBe('call-1')
    expect(body.status).toBe('pending')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @kova/web test
```
Expected: FAIL with "Cannot find module '../consent/route'" etc.

- [ ] **Step 3: Create consent route**

Create `apps/web/src/app/api/calls/consent/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, calls, companies, users } from '@kova/db'
import { eq } from 'drizzle-orm'

export async function POST(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    sessionId: string
    callId: string
    consentedAt: string
    devicePlatform: 'ios' | 'android'
  }

  if (!body.sessionId || !body.callId || !body.consentedAt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Resolve company and user from JWT — never trust client-provided IDs
  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.clerkOrgId, orgId))
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, userId))
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const consentLoggedAt = new Date(body.consentedAt)

  // Upsert call record — safe to retry
  const [call] = await db
    .insert(calls)
    .values({
      id: body.callId,
      sessionId: body.sessionId,
      companyId: company.id,
      techId: user.id,
      recordedAt: consentLoggedAt,
      consentLoggedAt,
      status: 'uploading',
      language: 'unknown',
    })
    .onConflictDoUpdate({
      target: calls.sessionId,
      set: { consentLoggedAt, status: 'uploading' },
    })
    .returning({ id: calls.id, consentLoggedAt: calls.consentLoggedAt })

  return NextResponse.json({
    callId: call!.id,
    consentLoggedAt: call!.consentLoggedAt,
  })
}
```

- [ ] **Step 4: Create decline route**

Create `apps/web/src/app/api/calls/decline/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, auditLogs, companies, users } from '@kova/db'
import { eq } from 'drizzle-orm'

export async function POST(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    sessionId: string
    declinedAt: string
    reason: string
  }

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.clerkOrgId, orgId))

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, userId))

  await db.insert(auditLogs).values({
    companyId: company?.id ?? 'unknown',
    userId: user?.id,
    action: 'recording_declined',
    targetType: 'session',
  })

  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 5: Create upload-complete route**

Create `apps/web/src/app/api/calls/upload-complete/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Queue } from 'bullmq'
import { db, calls, companies, users } from '@kova/db'
import { eq } from 'drizzle-orm'
import { QUEUE_NAMES, JOB_NAMES } from '@kova/shared'

let scoringQueue: Queue | null = null

function getScoringQueue(): Queue {
  if (!scoringQueue) {
    scoringQueue = new Queue(QUEUE_NAMES.SCORING, {
      connection: { url: process.env.REDIS_URL },
    })
  }
  return scoringQueue
}

export async function POST(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    callId: string
    sessionId: string
    s3Keys: string[]
    totalDurationSec: number
    chunkCount: number
    jobMetadata: {
      customerName?: string
      jobType?: 'drain' | 'plumbing' | 'both'
      notes?: string
    } | null
    devicePlatform: 'ios' | 'android'
    audioFormat: string
    audioBitrateKbps: number
  }

  if (!body.callId || !body.sessionId || !body.s3Keys?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.clerkOrgId, orgId))
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  // Update call record
  await db
    .update(calls)
    .set({
      s3Key: body.s3Keys[0],
      durationSec: Math.round(body.totalDurationSec),
      status: 'pending',
      customerName: body.jobMetadata?.customerName ?? null,
      jobType: body.jobMetadata?.jobType ?? null,
      notes: body.jobMetadata?.notes ?? null,
    })
    .where(eq(calls.id, body.callId))

  // Enqueue scoring job
  await getScoringQueue().add(
    JOB_NAMES.SCORE_CALL,
    { callId: body.callId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    }
  )

  return NextResponse.json({ callId: body.callId, status: 'pending' }, { status: 202 })
}
```

- [ ] **Step 6: Run tests and verify they pass**

```bash
pnpm --filter @kova/web test
```
Expected: all tests PASS

- [ ] **Step 7: Full typecheck**

```bash
pnpm typecheck
```
Expected: `Tasks: 5 successful, 5 total`

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/api/calls/consent/route.ts \
        apps/web/src/app/api/calls/decline/route.ts \
        apps/web/src/app/api/calls/upload-complete/route.ts \
        apps/web/src/app/api/calls/__tests__/consent.test.ts \
        apps/web/src/app/api/calls/__tests__/upload-complete.test.ts
git commit -m "feat: consent, decline, and upload-complete API endpoints with tests"
```

---

## Task 8: RecordScreen UI

**Files:**
- Modify: `apps/mobile/src/screens/RecordScreen.tsx`
- Create: `apps/mobile/src/components/ConsentModal.tsx`
- Create: `apps/mobile/src/screens/JobTaggingScreen.tsx`
- Modify: `apps/mobile/src/navigation/types.ts`
- Modify: `apps/mobile/src/navigation/RootNavigator.tsx`

- [ ] **Step 1: Update navigation types**

Replace `apps/mobile/src/navigation/types.ts` with:

```typescript
export type RootStackParamList = {
  Main: undefined
  SignIn: undefined
  JobTagging: { sessionId: string; callId: string }
}

export type TabParamList = {
  Home: undefined
  Record: undefined
  Profile: undefined
}
```

- [ ] **Step 2: Register JobTagging screen in RootNavigator**

In `apps/mobile/src/navigation/RootNavigator.tsx`, add the import and screen:

```typescript
import JobTaggingScreen from '../screens/JobTaggingScreen'
```

Inside `StackNav` component, add after the existing screens:

```tsx
<Stack.Screen name="JobTagging" component={JobTaggingScreen} options={{ title: 'Tag This Call' }} />
```

- [ ] **Step 3: Create ConsentModal**

Create `apps/mobile/src/components/ConsentModal.tsx`:

```typescript
import React from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native'

interface ConsentModalProps {
  visible: boolean
  onConsent: () => void
  onDecline: () => void
}

export default function ConsentModal({ visible, onConsent, onDecline }: ConsentModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Before You Record</Text>
          <Text style={styles.instruction}>
            Please inform your customer:
          </Text>
          <View style={styles.scriptBox}>
            <Text style={styles.script}>
              "I'll be recording this appointment for quality
              purposes — is that okay with you?"
            </Text>
          </View>
          <TouchableOpacity style={styles.consentButton} onPress={onConsent}>
            <Text style={styles.consentButtonText}>
              Customer Consented — Start Recording
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
            <Text style={styles.declineButtonText}>Customer Declined</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  content: { flex: 1, padding: 32, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 24, textAlign: 'center' },
  instruction: { fontSize: 16, color: '#9CA3AF', marginBottom: 16, textAlign: 'center' },
  scriptBox: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  script: { fontSize: 18, color: '#F3F4F6', lineHeight: 28, fontStyle: 'italic' },
  consentButton: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  consentButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  declineButton: { padding: 16, alignItems: 'center' },
  declineButtonText: { fontSize: 16, color: '#9CA3AF' },
})
```

- [ ] **Step 4: Create JobTaggingScreen**

Create `apps/mobile/src/screens/JobTaggingScreen.tsx`:

```typescript
import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import { setJobMetadata, setSessionStatus } from '../stores/upload-queue'
import { useRecordingStore } from '../stores/recording-store'

type Props = NativeStackScreenProps<RootStackParamList, 'JobTagging'>

export default function JobTaggingScreen({ navigation, route }: Props) {
  const { sessionId } = route.params
  const [customerName, setCustomerName] = useState('')
  const [jobType, setJobType] = useState<'drain' | 'plumbing' | 'both'>('drain')
  const [notes, setNotes] = useState('')
  const setStatus = useRecordingStore((s) => s.setStatus)

  const handleSubmit = () => {
    setJobMetadata(sessionId, {
      customerName: customerName.trim() || undefined,
      jobType,
      notes: notes.trim() || undefined,
    })
    setSessionStatus(sessionId, 'uploading')
    setStatus('uploading')
    navigation.navigate('Main')
  }

  const handleSkip = () => {
    setSessionStatus(sessionId, 'uploading')
    setStatus('uploading')
    navigation.navigate('Main')
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Tag This Call</Text>
        <Text style={styles.subtitle}>Optional — helps track revenue per job type</Text>

        <Text style={styles.label}>Customer Name</Text>
        <TextInput
          style={styles.input}
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="e.g. John Smith"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Job Type</Text>
        <View style={styles.segmented}>
          {(['drain', 'plumbing', 'both'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.segment, jobType === type && styles.segmentActive]}
              onPress={() => setJobType(type)}
            >
              <Text style={[styles.segmentText, jobType === type && styles.segmentTextActive]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any notes about this call..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Done — Start Upload</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 24,
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  segmented: { flexDirection: 'row', marginBottom: 24, gap: 8 },
  segment: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  segmentActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  segmentText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  segmentTextActive: { color: '#FFFFFF' },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  skipButton: { padding: 16, alignItems: 'center' },
  skipButtonText: { fontSize: 16, color: '#6B7280' },
})
```

- [ ] **Step 5: Replace RecordScreen**

Replace `apps/mobile/src/screens/RecordScreen.tsx` entirely:

```typescript
import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Animated,
} from 'react-native'
import DeviceInfo from 'react-native-device-info'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useRecordingStore } from '../stores/recording-store'
import ConsentModal from '../components/ConsentModal'
import type { RootStackParamList } from '../navigation/types'

// RecordScreen is nested inside TabNavigator but needs to push JobTagging
// onto the Root stack. Pass navigation as a prop from TabNavigator or use
// a ref — for simplicity we rely on the tab navigator passing it via context.
// Navigation to JobTagging is triggered from the store's stopRecording action.

export default function RecordScreen() {
  const {
    status,
    elapsedSec,
    chunkCount,
    batteryLevel,
    sessionId,
    callId,
    startRecording,
    consentGranted,
    consentDeclined,
    pauseRecording,
    resumeRecording,
    stopRecording,
    setBatteryLevel,
    incrementElapsed,
  } = useRecordingStore()

  const pulseAnim = useRef(new Animated.Value(1)).current
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const batteryRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Pulsing dot animation while recording
  useEffect(() => {
    if (status === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start()
      timerRef.current = setInterval(incrementElapsed, 1000)
      batteryRef.current = setInterval(async () => {
        const level = await DeviceInfo.getBatteryLevel()
        setBatteryLevel(Math.round(level * 100))
      }, 60000)
      DeviceInfo.getBatteryLevel().then((l) => setBatteryLevel(Math.round(l * 100)))
    } else {
      pulseAnim.stopAnimation()
      pulseAnim.setValue(1)
      if (timerRef.current) clearInterval(timerRef.current)
      if (batteryRef.current) clearInterval(batteryRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (batteryRef.current) clearInterval(batteryRef.current)
    }
  }, [status])

  const handlePressRecord = async () => {
    try {
      await startRecording({
        techId: 'tech-placeholder', // replaced with real Clerk userId in Task 10
        companyId: 'co-placeholder',
      })
    } catch (e: any) {
      if (e.message === 'Recording already active') {
        Alert.alert('Recording Already Active', 'Stop the current recording before starting a new one.')
      } else if (e.message === 'INSUFFICIENT_DISK_SPACE') {
        Alert.alert('Not Enough Storage', 'You need at least 200 MB free to record.')
      } else {
        Alert.alert('Permission Required', 'Microphone access is required to record calls.')
      }
    }
  }

  const handleStop = async () => {
    await stopRecording()
    // Navigation to JobTagging happens in the parent navigator
    // via a useEffect watching status === 'stopped' in RootNavigator
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const isRecording = status === 'recording'
  const isPaused = status === 'paused'
  const isActive = isRecording || isPaused

  return (
    <SafeAreaView style={styles.container}>
      <ConsentModal
        visible={status === 'consent_shown'}
        onConsent={consentGranted}
        onDecline={consentDeclined}
      />

      <View style={styles.center}>
        {/* Pulsing dot */}
        {isRecording && (
          <Animated.View style={[styles.dot, { transform: [{ scale: pulseAnim }] }]} />
        )}

        {/* Timer */}
        {isActive && (
          <Text style={styles.timer}>{formatTime(elapsedSec)}</Text>
        )}

        {/* Chunk counter */}
        {isActive && chunkCount > 0 && (
          <Text style={styles.chunkInfo}>{chunkCount} chunk{chunkCount !== 1 ? 's' : ''} saved</Text>
        )}

        {/* Battery warning */}
        {batteryLevel !== null && batteryLevel <= 20 && isActive && (
          <View style={styles.batteryWarning}>
            <Text style={styles.batteryWarningText}>⚠️ Battery at {batteryLevel}%</Text>
          </View>
        )}

        {/* Main record button */}
        {!isActive && (
          <TouchableOpacity style={styles.recordButton} onPress={handlePressRecord}>
            <Text style={styles.recordButtonText}>Start Recording</Text>
          </TouchableOpacity>
        )}

        {/* Controls when recording */}
        {isActive && (
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={isRecording ? pauseRecording : resumeRecording}
            >
              <Text style={styles.pauseButtonText}>{isRecording ? 'Pause' : 'Resume'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#EF4444', marginBottom: 24 },
  timer: { fontSize: 48, fontWeight: '200', color: '#FFFFFF', marginBottom: 8, fontVariant: ['tabular-nums'] },
  chunkInfo: { fontSize: 14, color: '#6B7280', marginBottom: 32 },
  batteryWarning: {
    backgroundColor: '#7C2D12',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  batteryWarningText: { color: '#FEF2F2', fontSize: 14, fontWeight: '600' },
  recordButton: {
    backgroundColor: '#EF4444',
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  recordButtonText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  controls: { flexDirection: 'row', gap: 16, marginTop: 32 },
  pauseButton: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  pauseButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  stopButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  stopButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
})
```

- [ ] **Step 6: Handle navigation to JobTagging when stopped**

In `apps/mobile/src/navigation/RootNavigator.tsx`, add a `useEffect` inside `AuthenticatedRoot` (and in the `StackNav` fallback for scaffold) that watches `recording status === 'stopped'` and navigates to `JobTagging`. This requires access to the navigation ref.

Add at the top of `RootNavigator.tsx`:
```typescript
import { useEffect, useRef } from 'react'
import { NavigationContainerRef } from '@react-navigation/native'
import { useRecordingStore } from '../stores/recording-store'
import type { RootStackParamList } from './types'
```

Inside the `StackNav` component, add before the return:
```typescript
const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null)
const status = useRecordingStore((s) => s.status)
const sessionId = useRecordingStore((s) => s.sessionId)
const callId = useRecordingStore((s) => s.callId)

useEffect(() => {
  if (status === 'stopped' && sessionId && callId && navRef.current) {
    navRef.current.navigate('JobTagging', { sessionId, callId })
  }
}, [status, sessionId, callId])
```

Pass `ref={navRef}` to `<NavigationContainer>`.

- [ ] **Step 7: Typecheck**

```bash
pnpm --filter @kova/mobile typecheck
```
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/screens/RecordScreen.tsx \
        apps/mobile/src/screens/JobTaggingScreen.tsx \
        apps/mobile/src/components/ConsentModal.tsx \
        apps/mobile/src/navigation/types.ts \
        apps/mobile/src/navigation/RootNavigator.tsx
git commit -m "feat: RecordScreen with consent modal, pulsing dot, battery warning, and job tagging screen"
```

---

## Task 9: Crash Recovery on App Startup

**Files:**
- Modify: `apps/mobile/src/App.tsx`

- [ ] **Step 1: Add crash recovery check to App.tsx**

In `apps/mobile/src/App.tsx`, add after the Sentry init block:

```typescript
import { Alert } from 'react-native'
import { getIncompleteSession, setSessionStatus } from './stores/upload-queue'
import { useRecordingStore } from './stores/recording-store'
```

Add a `useEffect` inside `AppInner`:

```typescript
function AppInner() {
  useEffect(() => {
    const incomplete = getIncompleteSession()
    if (incomplete) {
      Alert.alert(
        'Incomplete Recording',
        'An recording session was interrupted. What would you like to do?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setSessionStatus(incomplete.sessionId, 'failed')
              useRecordingStore.getState().reset()
            },
          },
          {
            text: 'Upload What Was Recorded',
            onPress: () => {
              // Mark as stopped so upload manager picks it up
              setSessionStatus(incomplete.sessionId, 'uploading')
              useRecordingStore.getState().setStatus('uploading')
            },
          },
        ]
      )
    }
  }, [])

  return (
    <>
      <StatusBar style="auto" />
      <RootNavigator />
    </>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @kova/mobile typecheck
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/App.tsx
git commit -m "feat: crash recovery — detect incomplete recording sessions on startup"
```

---

## Task 10: Wire Clerk Auth into RecordScreen

**Files:**
- Modify: `apps/mobile/src/screens/RecordScreen.tsx`

The `techId` and `companyId` placeholders need real values from Clerk.

- [ ] **Step 1: Update RecordScreen to use Clerk**

In `apps/mobile/src/screens/RecordScreen.tsx`, add the import:
```typescript
import { useAuth, useOrganization } from '@clerk/clerk-expo'
```

Replace the `handlePressRecord` function:
```typescript
const { userId } = useAuth()
const { organization } = useOrganization()

const handlePressRecord = async () => {
  if (!userId || !organization?.id) {
    Alert.alert('Not signed in', 'Please sign in before recording.')
    return
  }
  try {
    await startRecording({ techId: userId, companyId: organization.id })
  } catch (e: any) {
    if (e.message === 'Recording already active') {
      Alert.alert('Recording Already Active', 'Stop the current recording before starting a new one.')
    } else if (e.message === 'INSUFFICIENT_DISK_SPACE') {
      Alert.alert('Not Enough Storage', 'You need at least 200 MB free to record.')
    } else {
      Alert.alert('Permission Required', 'Microphone access is required to record calls.')
    }
  }
}
```

Note: When Clerk is not configured (`IS_CLERK_CONFIGURED` is false), `useAuth()` and `useOrganization()` won't be available outside ClerkProvider. Add a guard:

```typescript
const IS_CLERK_CONFIGURED = !!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

// Inside component:
const { userId } = IS_CLERK_CONFIGURED ? useAuth() : { userId: 'dev-tech-1' }
const { organization } = IS_CLERK_CONFIGURED ? useOrganization() : { organization: { id: 'dev-org-1' } }
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @kova/mobile typecheck
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/RecordScreen.tsx
git commit -m "feat: wire Clerk auth into RecordScreen — real techId and companyId"
```

---

## Task 11: Upload Manager Wiring (App-Level Triggers)

**Files:**
- Modify: `apps/mobile/src/App.tsx`

The upload manager needs to run on: app open, connectivity change, and recording stop. Wire it at the App level.

- [ ] **Step 1: Add upload manager triggers to AppInner**

In `apps/mobile/src/App.tsx`, add:

```typescript
import NetInfo from '@react-native-community/netinfo'
import { runUploadManager } from './services/upload-manager'
import { useAuth } from '@clerk/clerk-expo'
```

Update `AppInner` to add upload triggers:

```typescript
function AppInner() {
  const { getToken } = useAuth()

  const triggerUpload = async () => {
    try {
      const token = await getToken()
      if (!token) return
      await runUploadManager({
        apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://kova.vercel.app',
        authToken: token,
      })
    } catch {
      // Silent — will retry on next trigger
    }
  }

  useEffect(() => {
    // Check for incomplete recording session on startup
    const incomplete = getIncompleteSession()
    if (incomplete) {
      Alert.alert(
        'Incomplete Recording',
        'A recording session was interrupted. What would you like to do?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setSessionStatus(incomplete.sessionId, 'failed')
              useRecordingStore.getState().reset()
            },
          },
          {
            text: 'Upload What Was Recorded',
            onPress: () => {
              setSessionStatus(incomplete.sessionId, 'uploading')
              useRecordingStore.getState().setStatus('uploading')
              triggerUpload()
            },
          },
        ]
      )
    }

    // Run upload manager on app open
    triggerUpload()

    // Run upload manager on connectivity restored
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) triggerUpload()
    })
    return () => unsubscribe()
  }, [])

  return (
    <>
      <StatusBar style="auto" />
      <RootNavigator />
    </>
  )
}
```

Also add `EXPO_PUBLIC_API_URL` to `apps/mobile/.env` (create if missing):
```
EXPO_PUBLIC_API_URL=http://localhost:3000
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @kova/mobile typecheck
```
Expected: PASS

- [ ] **Step 3: Full lint and typecheck**

```bash
pnpm lint && pnpm typecheck
```
Expected: `Tasks: 5 successful, 5 total` for both

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/App.tsx apps/mobile/.env
git commit -m "feat: wire upload manager triggers — app open, connectivity restore, recording stop"
```

---

## Task 12: CI and Final Push

**Files:**
- Modify: `.env.example`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Update .env.example with new env vars**

Add to `.env.example` (the S3 vars are already there — verify they are, and add the new mobile one):
```
# Mobile app base URL (set in apps/mobile/.env)
EXPO_PUBLIC_API_URL=http://localhost:3000
```

- [ ] **Step 2: Ensure all tests pass in CI config**

The CI `pnpm test` step currently has `continue-on-error: true`. Now that we have real tests, remove that flag:

In `.github/workflows/ci.yml`, change:
```yaml
- name: Test
  run: pnpm test
  continue-on-error: true  # No tests yet in Week 1; remove when Week 4+ tests are added
```
To:
```yaml
- name: Test
  run: pnpm test
```

- [ ] **Step 3: Run full local CI simulation**

```bash
source ~/.nvm/nvm.sh && nvm use 22
pnpm install --frozen-lockfile --ignore-scripts
pnpm typecheck
pnpm lint
pnpm test
```
Expected: all pass

- [ ] **Step 4: Commit and push**

```bash
git add .env.example .github/workflows/ci.yml
git commit -m "chore: remove continue-on-error from CI test step — tests now exist"
git push origin main
```

- [ ] **Step 5: Verify CI passes**

```bash
sleep 30 && gh run list --repo kova-ai-app/kova --limit 1
```
Then:
```bash
gh run view <run-id> --repo kova-ai-app/kova
```
Expected: `✓ Lint, Typecheck & Test`

---

## Task 13: Background Recording Validation Gate (Manual — Real Device)

This is the critical gate for Week 3. It cannot be automated. Must pass on both iOS and Android before proceeding to Week 4.

### Prerequisites

- [ ] EAS dev builds installed on physical iOS and Android devices (from Pre-4)
- [ ] External services configured (S3, Neon, Redis) and env vars in place (from Pre-1 to Pre-3)
- [ ] Vercel deployment updated with real env vars

### iOS Validation

- [ ] Open app on iPhone → sign in (or use scaffold mode)
- [ ] Tap "Start Recording" → consent modal appears
- [ ] Tap "Customer Consented — Start Recording"
- [ ] Hear the 440Hz tone, see pulsing dot and timer
- [ ] Press Home button (background the app)
- [ ] Lock screen
- [ ] Wait **20 minutes**
- [ ] Unlock phone, return to app
- [ ] Verify timer is still counting (no gap in elapsed time beyond ~1 second)
- [ ] Tap Stop
- [ ] Navigate through JobTagging screen → tap "Done — Start Upload"
- [ ] Go to Neon console → verify a call record exists with `status = 'pending'`
- [ ] Go to Redis console (Railway) → verify a BullMQ job is queued

**iOS: PASS / FAIL** ___________

### Android Validation

- [ ] Open app on Android device
- [ ] Same steps as iOS above
- [ ] Additionally verify: a persistent notification "Kova — Recording Active" is visible in the notification shade while recording
- [ ] Verify notification dismisses when recording stops

**Android: PASS / FAIL** ___________

### If Either Fails

Stop. Do not proceed to Week 4. Debug the background recording issue:
- iOS: check `UIBackgroundModes: ['audio']` in `Info.plist`, AVAudioSession category
- Android: check `foregroundServiceType="microphone"` in manifest, confirm notification is shown before recording starts

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| react-native-audio-api integrated | Task 4 |
| Background recording validation gate | Task 13 |
| Consent modal with offline-first MMKV write | Tasks 2, 3, 8 |
| Audible tone on recording start | Task 4 |
| 5-minute chunk rotation stored in FS queue | Tasks 2, 4 |
| Disk space check (200 MB min) | Task 4 |
| Concurrent recording guard | Task 3 |
| Offline queue: MMKV persistence | Task 2 |
| Upload on connectivity | Task 11 |
| Presigned URL upload endpoint | Task 6 |
| `POST /api/calls/upload-complete` → BullMQ | Task 7 |
| Call record created in Neon with status `pending` | Task 7 |
| Manual job tagging screen | Task 8 |
| Android foreground service notification | Task 4 |
| Crash recovery on startup | Task 9 |
| Battery display + 20% warning | Task 8 |
| External services setup | Prerequisites |
| EAS dev build | Pre-4 |
| Remove tus-js-client | Task 1 |
| Clerk auth wired into recording | Task 10 |
| CI tests pass | Task 12 |
