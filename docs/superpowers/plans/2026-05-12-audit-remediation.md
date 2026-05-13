# Audit Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 15 gaps identified in the Weeks 1–11 audit — prioritizing the 5 mobile issues that would block Drain Right pilot.

**Architecture:** Fixes are organized by priority (P0→P3). P0 fixes are critical for the app to function on real devices. P1 fixes complete the mobile UX. P2 implements deferred integration test orchestration. P3 adds missing unit test coverage.

**Tech Stack:** @notifee/react-native (foreground service), expo-av (audio playback), existing Vitest + mocks

**Starting SHA:** `fba50cc`

---

## File Structure

| New/Modified | Path | Responsibility |
|---|---|---|
| Modify | `apps/mobile/package.json` | Add @notifee/react-native, expo-av |
| Modify | `apps/mobile/app.json` | Add @notifee plugin |
| Create | `apps/mobile/src/services/foreground-service.ts` | Android foreground service start/stop |
| Modify | `apps/mobile/src/services/recording.ts` | Replace expo-notifications with notifee foreground service |
| Modify | `apps/mobile/src/App.tsx` | Wire push notifications + deep link listener |
| Modify | `apps/mobile/src/navigation/RootNavigator.tsx` | Export navigationRef for deep linking |
| Modify | `apps/mobile/src/screens/CallDetailScreen.tsx` | Add transcript viewer + real audio player |
| Modify | `apps/mobile/src/screens/HomeScreen.tsx` | Add upload queue status widget |
| Modify | `scripts/cross-language-parity.integration.test.ts` | Implement processCallAndGetScore |
| Modify | `scripts/performance-benchmark.integration.test.ts` | Implement processAndTime |
| Modify | `worker/src/lib/rules/__tests__/drain-cleaning-upsell.test.ts` | Add 10 tests |
| Modify | `worker/src/lib/rules/__tests__/hydro-jetting.test.ts` | Add 10 tests |
| Modify | `worker/src/lib/rules/__tests__/grease-trap.test.ts` | Add 10 tests |
| Modify | `worker/src/lib/rules/__tests__/pipe-repair.test.ts` | Add 10 tests |
| Modify | `worker/src/lib/rules/__tests__/water-heater.test.ts` | Add 10 tests |
| Modify | `worker/src/lib/rules/__tests__/fixture-upgrade.test.ts` | Add 10 tests |
| Modify | `worker/src/lib/rules/__tests__/water-filtration.test.ts` | Add 10 tests |
| Modify | `worker/src/lib/rules/__tests__/pressure-regulator.test.ts` | Add 10 tests |
| Modify | `worker/src/lib/rules/__tests__/whole-home-repiping.test.ts` | Add 10 tests |

---

### Task 1: Android Foreground Service with @notifee (P0)

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/app.json`
- Create: `apps/mobile/src/services/foreground-service.ts`
- Modify: `apps/mobile/src/services/recording.ts`

**Why:** Without a true Android foreground service, the OS kills the app after ~1 min in background on Android 14+. The current `expo-notifications` sticky notification is cosmetic — it doesn't bind to a service.

- [ ] **Step 1: Install @notifee/react-native**

```bash
pnpm --filter mobile add @notifee/react-native
```

- [ ] **Step 2: Add notifee to app.json plugins**

In `apps/mobile/app.json`, add `"@notifee/react-native"` as the FIRST entry in the plugins array (before expo-notifications):

```json
"plugins": [
  "@notifee/react-native",
  [
    "expo-notifications",
    {
      "icon": "./assets/notification-icon.png",
      "color": "#2563EB",
      "androidMode": "default",
      "androidCollapsedTitle": "Kova",
      "iosDisplayInForeground": true
    }
  ],
  [
    "@sentry/react-native/expo",
    {
      "url": "https://sentry.io/",
      "project": "kova-mobile",
      "organization": "kova"
    }
  ]
]
```

- [ ] **Step 3: Create foreground-service.ts**

Create `apps/mobile/src/services/foreground-service.ts`:

```typescript
import { Platform } from 'react-native'
import notifee, { AndroidImportance, AndroidCategory } from '@notifee/react-native'

const CHANNEL_ID = 'kova-recording'
const NOTIFICATION_ID = 'kova-foreground-recording'

/**
 * Starts an Android foreground service with a persistent notification.
 * On iOS this is a no-op — the AVAudioSession background mode handles it.
 */
export async function startRecordingForegroundService(): Promise<void> {
  if (Platform.OS !== 'android') return

  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Recording Status',
    importance: AndroidImportance.LOW,
  })

  await notifee.displayNotification({
    id: NOTIFICATION_ID,
    title: 'Kova — Recording Active',
    body: 'Tap to return to the app.',
    android: {
      channelId: CHANNEL_ID,
      asForegroundService: true,
      category: AndroidCategory.SERVICE,
      ongoing: true,
      pressAction: { id: 'default' },
      smallIcon: 'ic_notification',
    },
  })
}

/**
 * Stops the Android foreground service and dismisses its notification.
 */
export async function stopRecordingForegroundService(): Promise<void> {
  if (Platform.OS !== 'android') return
  await notifee.stopForegroundService()
}
```

- [ ] **Step 4: Replace expo-notifications in recording.ts**

In `apps/mobile/src/services/recording.ts`:

1. Remove the `import * as Notifications from 'expo-notifications'` line (line 3).
2. Remove the functions `showRecordingNotification` and `dismissRecordingNotification` (lines 84-106).
3. Add import at top:

```typescript
import { startRecordingForegroundService, stopRecordingForegroundService } from './foreground-service'
```

4. In `startRecorder`, replace `await showRecordingNotification()` with:
```typescript
await startRecordingForegroundService()
```

5. In `stopRecorder`, replace `await dismissRecordingNotification()` with:
```typescript
await stopRecordingForegroundService()
```

- [ ] **Step 5: Verify typecheck passes**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter mobile typecheck
```

Expected: No errors.

- [ ] **Step 6: Verify existing tests still pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter mobile test
```

Expected: 37 tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/package.json apps/mobile/app.json apps/mobile/src/services/foreground-service.ts apps/mobile/src/services/recording.ts
git commit -m "feat(mobile): replace notification with real Android foreground service via @notifee"
```

---

### Task 2: Wire Push Notifications in App.tsx (P0)

**Files:**
- Modify: `apps/mobile/src/App.tsx`

**Context:** `registerForPushNotifications` (in `services/notifications.ts`) obtains the Expo push token and `POST /api/notifications/register` saves it. Currently neither is called anywhere — the token is never registered so push notifications never reach the tech's device.

**Why:** Techs never receive "call scored" push notifications.

- [ ] **Step 1: Add push registration to AppInner**

In `apps/mobile/src/App.tsx`:

1. Add import:
```typescript
import { Platform } from 'react-native'
import { registerForPushNotifications } from './services/notifications'
```

2. Add a new `useEffect` inside `AppInner` (after the existing upload manager useEffect):

```typescript
useEffect(() => {
  async function registerPush() {
    const token = await registerForPushNotifications()
    if (!token) return
    const authToken = await getToken()
    if (!authToken) return
    try {
      await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? 'https://kova.vercel.app'}/api/notifications/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ token, platform: Platform.OS }),
        }
      )
    } catch {
      // Silent — will retry on next app open
    }
  }
  registerPush()
}, [])
```

- [ ] **Step 2: Verify typecheck + tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter mobile typecheck && pnpm --filter mobile test
```

Expected: typecheck clean, 37 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/App.tsx
git commit -m "feat(mobile): register push token with server on app open"
```

---

### Task 3: Wire Deep Link Listener to Navigation (P1)

**Files:**
- Modify: `apps/mobile/src/App.tsx`
- Modify: `apps/mobile/src/navigation/RootNavigator.tsx`

**Context:** `addCallScoredListener` extracts `callId` from notification taps and is defined in `notifications.ts`, but is never called. Additionally, the `navRef` is defined inside `StackNav` so App.tsx can't access it. Fix: export a `navigationRef` from RootNavigator and use it in both the deep link listener and the existing recording-stop navigation.

**Why:** Tapping a "call scored" push notification currently does nothing.

- [ ] **Step 1: Export navigationRef from RootNavigator**

In `apps/mobile/src/navigation/RootNavigator.tsx`:

1. Add import:
```typescript
import { createNavigationContainerRef } from '@react-navigation/native'
```

2. Before the `Stack` definition, add:
```typescript
export const navigationRef = createNavigationContainerRef<RootStackParamList>()
```

3. In `StackNav`, remove the `const navRef = useRef<...>(null)` line.

4. Update the `useEffect` to use `navigationRef` instead of `navRef.current`:
```typescript
useEffect(() => {
  if (status === 'stopped' && sessionId && callId && navigationRef.isReady()) {
    navigationRef.navigate('CallDetail', { callId })
  }
}, [status, sessionId, callId])
```

5. Update `<NavigationContainer ref={navRef}>` to `<NavigationContainer ref={navigationRef}>`.

6. Remove unused `useRef` import if it's no longer needed.

- [ ] **Step 2: Add deep link listener in App.tsx**

In `apps/mobile/src/App.tsx`:

1. Add imports:
```typescript
import { addCallScoredListener } from './services/notifications'
import { navigationRef } from './navigation/RootNavigator'
```

2. Add a new `useEffect` inside `AppInner`:
```typescript
useEffect(() => {
  const subscription = addCallScoredListener((callId) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('CallDetail', { callId })
    }
  })
  return () => subscription.remove()
}, [])
```

- [ ] **Step 3: Verify typecheck + tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter mobile typecheck && pnpm --filter mobile test
```

Expected: typecheck clean, 37 tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/App.tsx apps/mobile/src/navigation/RootNavigator.tsx
git commit -m "feat(mobile): wire deep link listener — notification tap navigates to CallDetail"
```

---

### Task 4: Add Transcript Section to CallDetailScreen (P1)

**Files:**
- Modify: `apps/mobile/src/screens/CallDetailScreen.tsx`

**Context:** The `fetchCall` API returns `transcript: Record<string, unknown> | null` which has a `segments` field (JSONB array with shape `{ speaker: number, text: string, start: number, end: number, language?: string }`). The screen already fetches this data but never renders it. Techs can't review what was said on a call.

- [ ] **Step 1: Add transcript variable and section**

In `apps/mobile/src/screens/CallDetailScreen.tsx`:

1. After line 161 (where `coachingPoints` is defined), add:
```typescript
const transcript = data.transcript as { segments?: Array<{ speaker: number; text: string; start: number; language?: string }> } | null
```

2. After the Coaching Notes section (after the closing `</View>` of coachingPoints, before the Audio playback section), add:

```tsx
{/* Transcript */}
{transcript?.segments && transcript.segments.length > 0 ? (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Transcript</Text>
    {transcript.segments.map((seg, idx) => (
      <View key={idx} style={styles.transcriptRow}>
        <Text style={styles.speakerLabel}>
          {`Speaker ${seg.speaker}${seg.language === 'es' ? '  (ES)' : ''}`}
        </Text>
        <Text style={styles.transcriptText}>{seg.text}</Text>
      </View>
    ))}
  </View>
) : null}
```

3. Add styles to `StyleSheet.create`:
```typescript
transcriptRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
speakerLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
transcriptText: { fontSize: 14, color: '#374151', lineHeight: 20 },
```

- [ ] **Step 2: Verify typecheck + tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter mobile typecheck && pnpm --filter mobile test
```

Expected: typecheck clean, 37 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/CallDetailScreen.tsx
git commit -m "feat(mobile): render transcript segments on CallDetailScreen"
```

---

### Task 5: Add Real Audio Player with expo-av (P1)

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/src/screens/CallDetailScreen.tsx`

**Context:** The current "Play Recording" button calls `audioMutation` which fetches the presigned URL and then shows it in an `Alert`. Replace with a real inline player using `expo-av` that shows play/pause and a progress bar.

**Why:** Techs need to listen to their calls, not copy URLs from alerts.

- [ ] **Step 1: Install expo-av**

```bash
pnpm --filter mobile add expo-av
```

- [ ] **Step 2: Replace Alert-based audio with expo-av player**

In `apps/mobile/src/screens/CallDetailScreen.tsx`:

1. Add import:
```typescript
import { Audio } from 'expo-av'
```

2. Add state variables (after line 81, after the disputeReason state):
```typescript
const soundRef = React.useRef<Audio.Sound | null>(null)
const [isPlaying, setIsPlaying] = useState(false)
const [positionMs, setPositionMs] = useState(0)
const [durationMs, setDurationMs] = useState(0)
```

3. Add a time formatter helper (before the component's return statement):
```typescript
function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}
```

4. Add cleanup effect (after the existing query hooks):
```typescript
React.useEffect(() => {
  return () => {
    soundRef.current?.unloadAsync()
  }
}, [])
```

5. Replace the `audioMutation` (the entire `const audioMutation = useMutation(...)` block) with:
```typescript
async function togglePlayback() {
  if (soundRef.current && isPlaying) {
    await soundRef.current.pauseAsync()
    setIsPlaying(false)
    return
  }

  if (soundRef.current) {
    await soundRef.current.playAsync()
    setIsPlaying(true)
    return
  }

  // First play — fetch presigned URL and load audio
  try {
    const token = await getToken()
    if (!token) return
    const { url } = await fetchCallAudioUrl(token, callId)
    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true },
      (status) => {
        if (status.isLoaded) {
          setPositionMs(status.positionMillis)
          setDurationMs(status.durationMillis ?? 0)
          setIsPlaying(status.isPlaying)
          if (status.didJustFinish) {
            setIsPlaying(false)
            setPositionMs(0)
          }
        }
      }
    )
    soundRef.current = sound
    setIsPlaying(true)
  } catch {
    Alert.alert('Error', 'Could not load audio. Try again.')
  }
}
```

6. Replace the audio button JSX (the entire `{call.s3Key ? ( ... ) : null}` audio section) with:
```tsx
{call.s3Key ? (
  <View style={styles.section}>
    <TouchableOpacity
      style={styles.audioBtn}
      onPress={() => void togglePlayback()}
    >
      <Text style={styles.audioBtnText}>
        {isPlaying ? '⏸  Pause' : '▶  Play Recording'}
      </Text>
    </TouchableOpacity>
    {durationMs > 0 ? (
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${Math.min((positionMs / durationMs) * 100, 100)}%` as any },
          ]}
        />
      </View>
    ) : null}
    {durationMs > 0 ? (
      <Text style={styles.timeText}>
        {formatTime(positionMs)} / {formatTime(durationMs)}
      </Text>
    ) : null}
  </View>
) : null}
```

7. Add styles:
```typescript
progressContainer: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginTop: 12, overflow: 'hidden' },
progressBar: { height: 4, backgroundColor: '#2563EB', borderRadius: 2 },
timeText: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 6 },
```

- [ ] **Step 3: Verify typecheck + tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter mobile typecheck && pnpm --filter mobile test
```

Expected: typecheck clean, 37 tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/package.json apps/mobile/src/screens/CallDetailScreen.tsx
git commit -m "feat(mobile): real audio player with expo-av — play/pause + progress bar"
```

---

### Task 6: Upload Queue Status Widget on HomeScreen (P2)

**Files:**
- Modify: `apps/mobile/src/screens/HomeScreen.tsx`

**Context:** `getPendingSessions()` is available from `stores/upload-queue`. It returns sessions with status `stopped | uploading | failed` (i.e. not yet complete). The `QueuedSession` type has `sessionId`, `overallStatus`, and `chunks` array with per-chunk statuses.

**Why:** Techs have no visibility into upload progress. No way to tell if recordings are stuck.

- [ ] **Step 1: Add upload queue widget to HomeScreen**

In `apps/mobile/src/screens/HomeScreen.tsx`:

1. Add import:
```typescript
import { getPendingSessions } from '../stores/upload-queue'
import type { QueuedSession } from '../stores/upload-queue'
```

2. Inside the `HomeScreen` component, add state and polling effect (before the query):
```typescript
const [queuedSessions, setQueuedSessions] = React.useState<QueuedSession[]>([])

React.useEffect(() => {
  setQueuedSessions(getPendingSessions())
  const interval = setInterval(() => {
    setQueuedSessions(getPendingSessions())
  }, 5000)
  return () => clearInterval(interval)
}, [])
```

3. Add the widget inside the main return's `<View style={styles.container}>`, just before `<FlatList`:
```tsx
{queuedSessions.length > 0 ? (
  <View style={styles.queueWidget}>
    <Text style={styles.queueTitle}>Upload Queue</Text>
    {queuedSessions.map((session) => {
      const uploaded = session.chunks.filter((c) => c.status === 'uploaded').length
      const total = session.chunks.length
      return (
        <View key={session.sessionId} style={styles.queueRow}>
          <View
            style={[
              styles.queueDot,
              {
                backgroundColor:
                  session.overallStatus === 'uploading' ? '#D97706' :
                  session.overallStatus === 'failed' ? '#DC2626' :
                  '#6B7280',
              },
            ]}
          />
          <Text style={styles.queueText}>
            {session.overallStatus === 'uploading'
              ? `Uploading — ${uploaded}/${total} chunks`
              : session.overallStatus === 'failed'
              ? 'Upload failed — will retry when connected'
              : `Queued — ${total} chunk${total !== 1 ? 's' : ''}`}
          </Text>
        </View>
      )
    })}
  </View>
) : null}
```

Note: the widget is only shown in the non-empty state (when `calls.length > 0`). The existing empty state and loading/error states are unchanged. Also add the widget at the top of the empty state too (before the "No calls yet" text), so techs can see uploads even before they have any scored calls:

For the empty-state block, wrap it:
```tsx
if (calls.length === 0) {
  return (
    <View style={styles.center}>
      {queuedSessions.length > 0 ? (
        <View style={[styles.queueWidget, { alignSelf: 'stretch', marginHorizontal: 16, marginBottom: 16 }]}>
          <Text style={styles.queueTitle}>Upload Queue</Text>
          {queuedSessions.map((session) => {
            const uploaded = session.chunks.filter((c) => c.status === 'uploaded').length
            const total = session.chunks.length
            return (
              <View key={session.sessionId} style={styles.queueRow}>
                <View
                  style={[
                    styles.queueDot,
                    {
                      backgroundColor:
                        session.overallStatus === 'uploading' ? '#D97706' :
                        session.overallStatus === 'failed' ? '#DC2626' :
                        '#6B7280',
                    },
                  ]}
                />
                <Text style={styles.queueText}>
                  {session.overallStatus === 'uploading'
                    ? `Uploading — ${uploaded}/${total} chunks`
                    : session.overallStatus === 'failed'
                    ? 'Upload failed — will retry when connected'
                    : `Queued — ${total} chunk${total !== 1 ? 's' : ''}`}
                </Text>
              </View>
            )
          })}
        </View>
      ) : null}
      <Text style={styles.emptyTitle}>No calls yet</Text>
      <Text style={styles.emptyBody}>Tap Record to start your first call.</Text>
    </View>
  )
}
```

4. Add styles:
```typescript
queueWidget: { backgroundColor: '#FFFBEB', marginHorizontal: 16, marginTop: 12, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FDE68A' },
queueTitle: { fontSize: 12, fontWeight: '700', color: '#92400E', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
queueRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
queueDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
queueText: { fontSize: 13, color: '#78350F' },
```

- [ ] **Step 2: Verify typecheck + tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter mobile typecheck && pnpm --filter mobile test
```

Expected: typecheck clean, 37 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/HomeScreen.tsx
git commit -m "feat(mobile): add upload queue status widget to HomeScreen"
```

---

### Task 7: Implement processCallAndGetScore Orchestration (P2)

**Files:**
- Modify: `scripts/cross-language-parity.integration.test.ts`

**Context:** The test scaffold exists at `scripts/cross-language-parity.integration.test.ts`. It uses `describe.skipIf(missingEnv.length > 0)` so it won't run without env vars — that's correct and intentional. The stub throws "Not yet implemented". Replace it with real orchestration: upload audio to S3, call upload-complete API, poll for scored status.

**Note:** The Vercel AI SDK replaced the openai package in `ac70b20`, but this test doesn't use the LLM directly — it just polls the API for a scored result.

- [ ] **Step 1: Read the existing stub**

Before editing, read the full current file:
```bash
cat scripts/cross-language-parity.integration.test.ts
```

- [ ] **Step 2: Implement processCallAndGetScore**

Replace the stub function body (the `throw new Error('Not yet implemented')` block) with this implementation. Keep the function signature exactly as-is:

```typescript
async function processCallAndGetScore(fixturePath: string): Promise<number> {
  const fs = await import('fs')
  const path = await import('path')
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')

  // 1. Read audio fixture
  const audioBuffer = fs.readFileSync(path.resolve(fixturePath))

  // 2. Upload to S3
  const s3 = new S3Client({
    region: process.env.AWS_REGION ?? 'us-east-1',
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: !!process.env.S3_ENDPOINT,
  })

  const sessionId = `parity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const companyId = 'test-company'
  const s3Key = `audio/${companyId}/${sessionId}/chunk_0.aac`

  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME ?? 'kova-audio',
    Key: s3Key,
    Body: audioBuffer,
    ContentType: 'audio/aac',
  }))

  // 3. Trigger upload-complete
  const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3000'
  const createRes = await fetch(`${apiBase}/api/calls/upload-complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      callId: sessionId,
      companyId,
      techId: 'test-tech',
      s3Key,
      durationSec: 600,
      chunkCount: 1,
      jobType: 'drain',
      consentLoggedAt: new Date().toISOString(),
    }),
  })

  if (!createRes.ok) {
    throw new Error(`upload-complete failed: ${createRes.status} ${await createRes.text()}`)
  }

  const callId = ((await createRes.json()) as { callId: string }).callId

  // 4. Poll for scored status (up to 5 minutes)
  const deadline = Date.now() + 5 * 60 * 1000
  while (Date.now() < deadline) {
    const statusRes = await fetch(`${apiBase}/api/calls/${callId}`)
    if (statusRes.ok) {
      const data = (await statusRes.json()) as {
        call: { status: string }
        score: { overallScore: number } | null
      }
      if (data.call?.status === 'scored' && data.score?.overallScore != null) {
        return data.score.overallScore
      }
      if (data.call?.status === 'failed') {
        throw new Error(`Call processing failed: ${callId}`)
      }
    }
    await new Promise((r) => setTimeout(r, 5000))
  }

  throw new Error(`Timed out waiting for score: ${callId}`)
}
```

- [ ] **Step 3: Verify the test file is syntactically valid**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npx tsc --noEmit --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext scripts/cross-language-parity.integration.test.ts 2>&1 | head -20
```

(Type errors about missing packages are expected since scripts/ isn't a full package — focus on syntax errors only.)

- [ ] **Step 4: Commit**

```bash
git add scripts/cross-language-parity.integration.test.ts
git commit -m "feat(scripts): implement processCallAndGetScore orchestration for cross-language parity test"
```

---

### Task 8: Implement processAndTime Orchestration (P2)

**Files:**
- Modify: `scripts/performance-benchmark.integration.test.ts`

**Context:** Same pattern as Task 7. Replace stub with real orchestration. The key difference: `processAndTime` returns elapsed milliseconds (not a score), and the test asserts `elapsedMs < 5 * 60 * 1000`.

- [ ] **Step 1: Read the existing stub**

```bash
cat scripts/performance-benchmark.integration.test.ts
```

- [ ] **Step 2: Implement processAndTime**

Replace the stub body with:

```typescript
async function processAndTime(fixturePath: string): Promise<number> {
  const fs = await import('fs')
  const path = await import('path')
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')

  const startMs = Date.now()

  // 1. Read audio fixture
  const audioBuffer = fs.readFileSync(path.resolve(fixturePath))

  // 2. Upload to S3
  const s3 = new S3Client({
    region: process.env.AWS_REGION ?? 'us-east-1',
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: !!process.env.S3_ENDPOINT,
  })

  const sessionId = `perf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const companyId = 'test-company'
  const s3Key = `audio/${companyId}/${sessionId}/chunk_0.aac`

  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME ?? 'kova-audio',
    Key: s3Key,
    Body: audioBuffer,
    ContentType: 'audio/aac',
  }))

  // 3. Trigger upload-complete
  const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3000'
  const createRes = await fetch(`${apiBase}/api/calls/upload-complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      callId: sessionId,
      companyId,
      techId: 'test-tech',
      s3Key,
      durationSec: 600,
      chunkCount: 1,
      jobType: 'drain',
      consentLoggedAt: new Date().toISOString(),
    }),
  })

  if (!createRes.ok) {
    throw new Error(`upload-complete failed: ${createRes.status}`)
  }

  const callId = ((await createRes.json()) as { callId: string }).callId

  // 4. Poll for scored status (up to 5 minutes)
  const deadline = Date.now() + 5 * 60 * 1000
  while (Date.now() < deadline) {
    const statusRes = await fetch(`${apiBase}/api/calls/${callId}`)
    if (statusRes.ok) {
      const data = (await statusRes.json()) as { call: { status: string } }
      if (data.call?.status === 'scored') {
        return Date.now() - startMs
      }
      if (data.call?.status === 'failed') {
        throw new Error(`Call processing failed: ${callId}`)
      }
    }
    await new Promise((r) => setTimeout(r, 3000))
  }

  throw new Error(`Timed out waiting for score: ${callId}`)
}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/performance-benchmark.integration.test.ts
git commit -m "feat(scripts): implement processAndTime orchestration for performance benchmark"
```

---

### Task 9: Add 10 Tests Per Rule for 9 Rules (P3)

**Files:**
- Modify: 9 test files in `worker/src/lib/rules/__tests__/`

**Why:** Plan requires 20 tests per rule. Currently 9/11 rules have ~10. Total: 137 tests today, target 220+ (adding 90).

**Pattern — 10 additional tests for each rule:**

Look at `camera-inspection.test.ts` as the gold standard (20 tests). For each of the 9 rules below, add these categories adapted to that rule's keywords:

1. Multiple triggers in one call (strengthens evidence)
2. Partial word false-positive guard (e.g. "hydrating" shouldn't trigger "hydro")
3. Mixed bilingual call (EN trigger in mostly-ES transcript)
4. Alternate offer phrase variant 1
5. Alternate offer phrase variant 2
6. `jobType: null` — should still evaluate (both trades handle null)
7. `jobType: 'both'` — should apply to both-trade calls
8. Clip timestamp at start of call (start: 0)
9. Clip timestamp at end of call (late in recording)
10. Spanish-only trigger, no offer (ES missed opportunity)

**Rules to expand (9 files):**
1. `drain-cleaning-upsell.test.ts` — triggers: "backed up", "tapado", "drain is slow"; offers: "drain treatment", "preventative cleaning"
2. `hydro-jetting.test.ts` — triggers: "grease buildup", "acumulación de grasa"; offers: "hydro jet", "alta presión"
3. `grease-trap.test.ts` — triggers: "grease trap", "trampa de grasa"; offers: "grease trap service", "servicio de trampa"
4. `pipe-repair.test.ts` — triggers: "pipe is cracked", "tubería rota"; offers: "pipe repair", "reparación"
5. `water-heater.test.ts` — triggers: "water heater is old", "calentador viejo"; offers: "water heater replacement", "nuevo calentador"
6. `fixture-upgrade.test.ts` — triggers: "faucet is dripping", "llave gotea"; offers: "fixture upgrade", "cambio de llaves"
7. `water-filtration.test.ts` — triggers: "water tastes off", "agua sabe rara"; offers: "water filtration", "filtro de agua"
8. `pressure-regulator.test.ts` — triggers: "water pressure is high", "presión alta"; offers: "pressure regulator", "regulador"
9. `whole-home-repiping.test.ts` — triggers: "pipes are corroded", "tuberías corroídas"; offers: "whole home repipe", "retubería"

For each rule file:
- Read the existing 10 tests to understand the exact function signature and import path
- Add 10 new `it(...)` blocks at the end of the existing `describe` block
- Keep the same `describe` wrapper and import pattern
- Run the individual test file to confirm 20/20 pass

**Verification per rule:**
```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter worker test -- --reporter=verbose worker/src/lib/rules/__tests__/<rule-name>.test.ts
```

**Final verification:**
```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter worker test -- --reporter=verbose
```

Expected: worker tests increase from 183 to **273** (183 + 90 new rule tests).

- [ ] **Step 1: Add 10 tests to drain-cleaning-upsell.test.ts, run file to confirm 20/20**
- [ ] **Step 2: Add 10 tests to hydro-jetting.test.ts, run file to confirm 20/20**
- [ ] **Step 3: Add 10 tests to grease-trap.test.ts, run file to confirm 20/20**
- [ ] **Step 4: Add 10 tests to pipe-repair.test.ts, run file to confirm 20/20**
- [ ] **Step 5: Add 10 tests to water-heater.test.ts, run file to confirm 20/20**
- [ ] **Step 6: Add 10 tests to fixture-upgrade.test.ts, run file to confirm 20/20**
- [ ] **Step 7: Add 10 tests to water-filtration.test.ts, run file to confirm 20/20**
- [ ] **Step 8: Add 10 tests to pressure-regulator.test.ts, run file to confirm 20/20**
- [ ] **Step 9: Add 10 tests to whole-home-repiping.test.ts, run file to confirm 20/20**
- [ ] **Step 10: Run all worker tests, verify 273 pass**
- [ ] **Step 11: Commit**

```bash
git add worker/src/lib/rules/__tests__/
git commit -m "test: add 10 additional tests per rule for 9 rules — all rules at 20 tests (90 new)"
```

---

## Final Verification

- [ ] **Run full CI gate**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm test && pnpm typecheck && pnpm lint
```

Expected counts: worker **273** + mobile **37** + web **42** = **352 total tests**.

---

## Summary

| Task | Priority | What | New Tests |
|------|----------|------|-----------|
| 1 | P0 | Android foreground service via @notifee | 0 |
| 2 | P0 | Wire push token registration | 0 |
| 3 | P1 | Deep link listener → navigation | 0 |
| 4 | P1 | Transcript rendering on mobile | 0 |
| 5 | P1 | Real audio player with expo-av | 0 |
| 6 | P2 | Upload queue widget on HomeScreen | 0 |
| 7 | P2 | Cross-language test orchestration | 0 |
| 8 | P2 | Performance benchmark orchestration | 0 |
| 9 | P3 | 10 more tests × 9 rules | +90 |

**Total new tests: +90** → 352 total (from 262).
