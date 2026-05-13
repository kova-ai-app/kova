# Fix Recording Crash — AudioRecorder API Mismatch

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the recording crash that causes the app to silently return to "Start Recording" after ~1 second, by rewriting the recording service to use the correct `react-native-audio-api` `AudioRecorder` API.

**Architecture:** The existing `recording.ts` calls `audioContext.createAudioRecorder()` which doesn't exist — `AudioRecorder` is a standalone class. The `as any` cast hid this from TypeScript; at runtime it throws a TypeError. The catch block in `recording-store.ts` silently resets state to `idle`, and `RecordScreen.tsx` never displays the error. Fix involves: (1) rewriting `recording.ts` to use `new AudioRecorder()` + `enableFileOutput()` + `start()`, (2) showing errors in the UI.

**Tech Stack:** React Native (Expo SDK 54), `react-native-audio-api` v0.12.2, Zustand, TypeScript

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/mobile/src/services/recording.ts` | Rewrite | Core recording engine — permission checks, consent tone, recorder lifecycle |
| `apps/mobile/src/screens/RecordScreen.tsx` | Modify | Add error state display via Alert |
| `apps/mobile/src/stores/recording-store.ts` | No change | State machine is correct; error field already exists |
| `apps/mobile/src/stores/upload-queue.ts` | No change | Chunk registration API is correct |

---

### Task 1: Rewrite `recording.ts` to use the correct AudioRecorder API

**Files:**
- Modify: `apps/mobile/src/services/recording.ts` (entire file)

**Root cause:** Line 95 calls `(audioContext as any).createAudioRecorder({...})`. The `AudioRecorder` class is a standalone export from `react-native-audio-api`, not a method on `AudioContext`. The options passed (`rotationInterval`, `onFileRotation`, etc.) also don't match the real API.

**Correct API (from node_modules type definitions):**
- `new AudioRecorder()` — standalone constructor, no args
- `recorder.enableFileOutput(options)` — configure file output before starting
- `recorder.start()` — begin recording; returns `Result<{}>`
- `recorder.stop()` — stop recording; returns `Result<FileInfo>` where `FileInfo = { paths: string[], size: number, duration: number }`
- `recorder.pause()` / `recorder.resume()` — sync void methods
- `Result<T> = { status: 'success', ...T } | { status: 'error', message: string }`

- [ ] **Step 1: Replace imports and module-level variables**

Replace the top of the file. Remove the `AudioContext`-only import and `CHUNK_DURATION_MS`. Add `AudioRecorder` and enum imports. Change the `recorder` variable type from `any` to `AudioRecorder | null`. Remove `audioContext` variable (not needed for recording; consent tone uses a local one).

```ts
import { Platform, PermissionsAndroid } from 'react-native'
import {
  AudioContext,
  AudioRecorder,
  FileFormat,
  FileDirectory,
  BitDepth,
  IOSAudioQuality,
  FlacCompressionLevel,
} from 'react-native-audio-api'
import RNFS from 'react-native-fs'
import { startRecordingForegroundService, stopRecordingForegroundService } from './foreground-service'
import { v4 as uuidv4 } from 'uuid'
import { addChunk } from '../stores/upload-queue'

// ---------------------------------------------------------------------------
// Recording service — wraps react-native-audio-api AudioRecorder
// ---------------------------------------------------------------------------

const MIN_FREE_BYTES = 200 * 1024 * 1024  // 200 MB
// ~5 min of 32kbps mono AAC ≈ 1.2 MB
const ROTATION_BYTES = 1_200_000

let recorder: AudioRecorder | null = null
let currentSessionId: string | null = null
let chunkIndex = 0
```

The old code to replace (lines 1–18):
```ts
import { Platform, PermissionsAndroid } from 'react-native'
import { AudioContext } from 'react-native-audio-api'
// ... (see existing file)
let audioContext: InstanceType<typeof AudioContext> | null = null
let recorder: any = null
let currentSessionId: string | null = null
let chunkIndex = 0
```

- [ ] **Step 2: Leave permissions and consent tone functions unchanged**

`requestRecordingPermissions()` (lines 24–52) and `playConsentTone()` (lines 58–77) are correct — no changes needed. The consent tone creates its own local `AudioContext` for playback, which is unrelated to recording.

- [ ] **Step 3: Rewrite `startRecorder()`**

Replace the existing `startRecorder` function (lines 83–110) with:

```ts
export async function startRecorder(sessionId: string): Promise<void> {
  if (recorder !== null) {
    throw new Error('Recorder already active')
  }
  currentSessionId = sessionId
  chunkIndex = 0

  recorder = new AudioRecorder()

  const fileResult = recorder.enableFileOutput({
    format: FileFormat.M4A,
    preset: {
      bitRate: 32000,
      sampleRate: 44100,
      bitDepth: BitDepth.Bit16,
      iosQuality: IOSAudioQuality.Low,
      flacCompressionLevel: FlacCompressionLevel.L0,
    },
    channelCount: 1,
    directory: FileDirectory.Document,
    subDirectory: 'Kova',
    fileNamePrefix: `call_${sessionId}_chunk_`,
    rotateIntervalBytes: ROTATION_BYTES,
  })

  if (fileResult.status === 'error') {
    recorder = null
    throw new Error(fileResult.message)
  }

  const startResult = recorder.start()
  if (startResult.status === 'error') {
    recorder = null
    throw new Error(startResult.message)
  }

  await startRecordingForegroundService()
}
```

- [ ] **Step 4: Remove `handleChunkRotation` helper**

Delete the `handleChunkRotation` function (lines 112–133). The new API doesn't have a rotation callback — chunks are retrieved at stop time from `FileInfo.paths`.

- [ ] **Step 5: Rewrite `stopRecorder()`**

Replace the existing `stopRecorder` function (lines 135–151) with:

```ts
export async function stopRecorder(): Promise<{ durationSec: number }> {
  if (!recorder || !currentSessionId) return { durationSec: 0 }

  const result = recorder.stop()
  await stopRecordingForegroundService()

  if (result.status === 'success' && result.paths.length > 0) {
    const durationPerChunk = result.duration / result.paths.length
    // size is in MB, convert to bytes
    const sizePerChunk = Math.round((result.size * 1024 * 1024) / result.paths.length)

    for (const filePath of result.paths) {
      addChunk(currentSessionId!, {
        chunkId: uuidv4(),
        chunkIndex: chunkIndex++,
        filePath,
        sizeBytes: sizePerChunk,
        durationSec: durationPerChunk,
      })
    }
  }

  const totalDuration = result.status === 'success' ? result.duration : 0
  recorder = null
  currentSessionId = null
  return { durationSec: totalDuration }
}
```

- [ ] **Step 6: Rewrite `pauseRecorder()` and `resumeRecorder()`**

Replace lines 153–161 with:

```ts
export async function pauseRecorder(): Promise<void> {
  if (!recorder) return
  recorder.pause()
}

export async function resumeRecorder(): Promise<void> {
  if (!recorder) return
  recorder.resume()
}
```

The old code used `audioContext.suspend()` / `audioContext.resume()` which controlled the AudioContext, not the recorder. The new code calls `recorder.pause()` / `recorder.resume()` directly.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/services/recording.ts
git commit -m "fix(mobile): rewrite recording service to use correct AudioRecorder API

The recording.ts service was calling audioContext.createAudioRecorder()
which doesn't exist — AudioRecorder is a standalone class exported by
react-native-audio-api. The 'as any' cast hid this from TypeScript,
causing a silent runtime crash ~1s after tapping record (after the
consent tone finishes). Now uses new AudioRecorder() with
enableFileOutput() and proper Result<T> error handling."
```

---

### Task 2: Show recording errors in RecordScreen.tsx

**Files:**
- Modify: `apps/mobile/src/screens/RecordScreen.tsx`

The catch block in `recording-store.ts:91-95` already stores errors in `state.error`, but `RecordScreen` never reads or displays this field. Failures are completely silent to the user.

- [ ] **Step 1: Add `error` to the destructured store fields**

In `RecordScreen.tsx`, add `error` to the destructured fields from `useRecordingStore()` (line 19–32):

```tsx
const {
    status,
    elapsedSec,
    chunkCount,
    batteryLevel,
    error,           // <-- add this
    startRecording,
    consentGranted,
    consentDeclined,
    pauseRecording,
    resumeRecording,
    stopRecording,
    setBatteryLevel,
    incrementElapsed,
  } = useRecordingStore()
```

- [ ] **Step 2: Add useEffect to display errors via Alert**

Add a new `useEffect` after the existing ones (after line 63) to show an Alert when an error occurs:

```tsx
useEffect(() => {
  if (error) {
    Alert.alert('Recording Error', error)
  }
}, [error])
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/RecordScreen.tsx
git commit -m "fix(mobile): display recording errors to user instead of failing silently"
```

---

### Task 3: Run typecheck to verify

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: No type errors related to `recording.ts` or `RecordScreen.tsx`. There may be pre-existing type errors in other files — focus only on the changed files.

- [ ] **Step 2: If type errors in changed files, fix them and re-run**

Common potential issues:
- Import names not matching actual exports from `react-native-audio-api` — check against `node_modules/react-native-audio-api/src/index.ts`
- `FileInfo` type might need to be accessed differently if `Result<FileInfo>` doesn't spread properly — check with `if (result.status === 'success')` narrowing

- [ ] **Step 3: Run existing tests**

```bash
cd apps/mobile && npx vitest run
```

Check that existing recording store tests still pass. The tests mock `startRecorder`/`stopRecorder` so they should be unaffected.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(mobile): resolve type errors from recording service rewrite"
```
