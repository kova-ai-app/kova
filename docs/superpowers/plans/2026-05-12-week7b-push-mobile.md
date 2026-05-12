# Week 7b — Push Notifications + Mobile Screens

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the end-to-end scored-call notification flow (worker → Expo push → mobile), add real functional mobile screens (HomeScreen call list + CallDetailScreen), add the five web API routes they depend on, and apply role-based auth guards to all new routes.

**Architecture:** `worker/src/lib/push.ts` queries `push_tokens`, sends via Expo SDK, and is called at the end of `processTranscription()`. Five new Next.js App Router routes serve mobile data: `GET /api/calls`, `GET /api/calls/:id`, `GET /api/calls/:id/audio` (presigned S3), `POST /api/notifications/register`, `POST /api/opportunities/:id/dispute`. All new routes use `requireRole()` / `getAuthContext()` from `apps/web/src/lib/auth.ts`. Mobile ships a standalone fetch-based API client and uses React Query for server state; `expo-notifications` handles push token registration and foreground/background handling.

**Tech Stack:** `expo-server-sdk ^3.10.0` (worker), `expo-notifications ~0.29.0` (mobile), `@tanstack/react-query ^5.0.0` (mobile), `@aws-sdk/s3-request-presigner` (web), Vitest 2 (TDD), Clerk (auth in both web and mobile).

**Prerequisite:** Plan A (week7a-rules-backfill) should be complete — or run this plan against the `main` branch at commit `65cf976` if running Plans A and B in parallel. In either case `pnpm test` must already be green before starting.

---

## Key Context (read before any task)

- **`worker/` is ESM** (`"type": "module"`). All imports must use `.js` extensions.
- **Web routes use `@/` alias** → `apps/web/src`. Vitest config has this alias pre-configured.
- **`requireRole(allowedRoles)`** returns `AuthContext | NextResponse`. Pattern: `const result = await requireRole([...]); if (result instanceof NextResponse) return result`. Defined in `apps/web/src/lib/auth.ts`.
- **`getAuthContext()`** returns `{ clerkUserId, orgId, role }`. Throws if not authenticated.
- **`push_tokens` table**: `userId` (fk users.id), `token` (unique), `platform` (ios|android).
- **`notifications` table**: `userId`, `type` ('call_scored'|'call_failed'|'system'), `payload` (jsonb), `sentAt`, `readAt`, `channel` ('push').
- **Expo push**: `new Expo()` → `expo.sendPushNotificationsAsync([{ to, sound, title, body, data }])`. Always filter tokens with `Expo.isExpoPushToken(token)` before sending.
- **Mobile API base URL**: `process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'`.
- **Clerk token on mobile**: `const { getToken } = useAuth(); const token = await getToken()` — `Bearer ${token}` header.
- **React Query**: `useQuery({ queryKey: ['calls', page], queryFn: () => fetchCalls(token, page) })`. Query key must include all dependencies (token, id, page).
- **Run `source ~/.nvm/nvm.sh && nvm use 22`** before every bash command.

---

## File Map

```
apps/mobile/app.json                                    MODIFY — add 'remote-notification' to NSBackgroundModes
worker/src/lib/push.ts                                  CREATE — sendCallScoredNotification()
worker/src/__tests__/push.test.ts                       CREATE — 5 scenarios
worker/src/workers/scoring.ts                           MODIFY — replace TODO push stub with real call
worker/src/__tests__/scoring.test.ts                    MODIFY — add push notification assertion
apps/web/src/app/api/calls/route.ts                     CREATE — GET /api/calls (list, paginated)
apps/web/src/app/api/calls/__tests__/calls-list.test.ts CREATE — 3 scenarios
apps/web/src/app/api/calls/[id]/route.ts                CREATE — GET /api/calls/:id (detail)
apps/web/src/app/api/calls/[id]/audio/route.ts          CREATE — GET /api/calls/:id/audio (presigned URL)
apps/web/src/app/api/notifications/register/route.ts    CREATE — POST /api/notifications/register
apps/web/src/app/api/notifications/__tests__/register.test.ts  CREATE — 3 scenarios
apps/web/src/app/api/opportunities/[id]/dispute/route.ts       CREATE — POST /api/opportunities/:id/dispute
apps/web/src/app/api/opportunities/__tests__/dispute.test.ts   CREATE — 2 scenarios
apps/mobile/src/services/api.ts                         CREATE — fetch-based API client
apps/mobile/src/services/__tests__/api.test.ts          CREATE — 5 scenarios
apps/mobile/src/services/notifications.ts               CREATE — push registration + handler
apps/mobile/src/navigation/types.ts                     MODIFY — add CallDetail route
apps/mobile/src/navigation/RootNavigator.tsx            MODIFY — add CallDetailScreen
apps/mobile/src/screens/HomeScreen.tsx                  MODIFY — real call list with React Query
apps/mobile/src/screens/CallDetailScreen.tsx            CREATE — call detail + audio + opportunities
```

---

## Task 1: Fix app.json NSBackgroundModes

**Files:**
- Modify: `apps/mobile/app.json`

iOS requires `remote-notification` in `NSBackgroundModes` to wake the app and process incoming push notifications in the background.

- [ ] **Step 1: Add remote-notification to NSBackgroundModes**

In `apps/mobile/app.json`, find the `"NSBackgroundModes": ["audio"]` line and change it to:

```json
"NSBackgroundModes": ["audio", "remote-notification"]
```

The full `ios` block should look like:

```json
"ios": {
  "supportsTablet": false,
  "bundleIdentifier": "com.kovaapp.mobile",
  "infoPlist": {
    "NSMicrophoneUsageDescription": "Kova records service calls to help your team improve revenue.",
    "NSBackgroundModes": ["audio", "remote-notification"]
  },
  "buildNumber": "1"
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app.json
git commit -m "fix: add remote-notification to iOS NSBackgroundModes for push support"
```

---

## Task 2: Push Notification Library (worker)

**Files:**
- Create: `worker/src/__tests__/push.test.ts`
- Create: `worker/src/lib/push.ts`

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/push.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('expo-server-sdk', () => {
  const mockSend = vi.fn().mockResolvedValue([{ status: 'ok' }])
  const mockChunk = vi.fn().mockImplementation((msgs: unknown[]) => [msgs])
  return {
    Expo: Object.assign(
      vi.fn().mockImplementation(() => ({
        sendPushNotificationsAsync: mockSend,
        chunkPushNotifications: mockChunk,
      })),
      {
        isExpoPushToken: vi.fn().mockReturnValue(true),
      }
    ),
  }
})

vi.mock('@kova/db', () => ({
  db: { select: vi.fn() },
  users: {},
  calls: {},
  scores: {},
  pushTokens: {},
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn() }))

import { db } from '@kova/db'
import { Expo } from 'expo-server-sdk'
import { sendCallScoredNotification } from '../lib/push.js'

function mockDbSelectChain(firstResult: object[], secondResult: object[]) {
  let callCount = 0
  ;(db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(callCount++ === 0 ? firstResult : secondResult),
    }),
  }))
}

describe('sendCallScoredNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(Expo.isExpoPushToken as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)
  })

  it('1. sends push notification when tech has a valid token', async () => {
    const tokens = [{ token: 'ExponentPushToken[xxxxxx]' }]
    const scoreData = [{ overallScore: 72, opportunityTotalLow: 425 }]
    let callCount = 0
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) return Promise.resolve(tokens)
          return Promise.resolve(scoreData)
        }),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(scoreData),
        }),
      }),
    }))

    await sendCallScoredNotification('call-1', 'tech-1')

    const expoInstance = (Expo as unknown as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(expoInstance.sendPushNotificationsAsync).toHaveBeenCalled()
    const sentMessages = expoInstance.sendPushNotificationsAsync.mock.calls[0][0]
    expect(sentMessages[0].to).toBe('ExponentPushToken[xxxxxx]')
    expect(sentMessages[0].data).toMatchObject({ callId: 'call-1', screen: 'CallDetail' })
  })

  it('2. skips send when tech has no push tokens', async () => {
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }))

    await sendCallScoredNotification('call-1', 'tech-1')

    const ExpoClass = Expo as unknown as ReturnType<typeof vi.fn>
    // Expo constructor should not even be called (or send was not called)
    if (ExpoClass.mock.results.length > 0) {
      const instance = ExpoClass.mock.results[0].value
      expect(instance.sendPushNotificationsAsync).not.toHaveBeenCalled()
    }
    // No assertion needed beyond no throw — function exits early
  })

  it('3. filters out invalid Expo tokens before sending', async () => {
    const tokens = [
      { token: 'ExponentPushToken[valid]' },
      { token: 'not-a-valid-expo-token' },
    ]
    ;(Expo.isExpoPushToken as unknown as ReturnType<typeof vi.fn>)
      .mockImplementation((t: string) => t.startsWith('ExponentPushToken'))

    let callCount = 0
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) return Promise.resolve(tokens)
          return Promise.resolve([{ overallScore: 60, opportunityTotalLow: 0 }])
        }),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ overallScore: 60, opportunityTotalLow: 0 }]),
        }),
      }),
    }))

    await sendCallScoredNotification('call-1', 'tech-1')

    const expoInstance = (Expo as unknown as ReturnType<typeof vi.fn>).mock.results[0].value
    const sentMessages = expoInstance.sendPushNotificationsAsync.mock.calls[0][0]
    expect(sentMessages).toHaveLength(1)
    expect(sentMessages[0].to).toBe('ExponentPushToken[valid]')
  })

  it('4. does not throw when sendPushNotificationsAsync rejects (non-fatal)', async () => {
    const tokens = [{ token: 'ExponentPushToken[xxxxxx]' }]
    let callCount = 0
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) return Promise.resolve(tokens)
          return Promise.resolve([{ overallScore: 80, opportunityTotalLow: 750 }])
        }),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ overallScore: 80, opportunityTotalLow: 750 }]),
        }),
      }),
    }))

    const ExpoClass = Expo as unknown as ReturnType<typeof vi.fn>
    ExpoClass.mockImplementation(() => ({
      sendPushNotificationsAsync: vi.fn().mockRejectedValue(new Error('Expo push service down')),
      chunkPushNotifications: vi.fn().mockImplementation((msgs: unknown[]) => [msgs]),
    }))

    await expect(sendCallScoredNotification('call-1', 'tech-1')).resolves.not.toThrow()
  })

  it('5. notification body includes overallScore and opportunityTotalLow', async () => {
    const tokens = [{ token: 'ExponentPushToken[xxxxxx]' }]
    let callCount = 0
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) return Promise.resolve(tokens)
          return Promise.resolve([{ overallScore: 85, opportunityTotalLow: 1275 }])
        }),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ overallScore: 85, opportunityTotalLow: 1275 }]),
        }),
      }),
    }))

    await sendCallScoredNotification('call-1', 'tech-1')

    const expoInstance = (Expo as unknown as ReturnType<typeof vi.fn>).mock.results[0].value
    const sentMessages = expoInstance.sendPushNotificationsAsync.mock.calls[0][0]
    expect(sentMessages[0].body).toContain('85')
    expect(sentMessages[0].body).toContain('1275')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../lib/push.js'"

- [ ] **Step 3: Create worker/src/lib/push.ts**

```typescript
import { Expo } from 'expo-server-sdk'
import type { ExpoPushMessage } from 'expo-server-sdk'
import { db, calls, scores, pushTokens } from '@kova/db'
import { eq } from 'drizzle-orm'
import { createLogger } from './logger.js'

const logger = createLogger('push')

/**
 * Send a "call scored" push notification to all push tokens registered for a technician.
 * Non-fatal: errors are logged and swallowed; a failed push never fails the scoring job.
 */
export async function sendCallScoredNotification(
  callId: string,
  techId: string,
): Promise<void> {
  // 1. Look up push tokens for this tech
  const tokenRows = await db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .where(eq(pushTokens.userId, techId))

  if (tokenRows.length === 0) {
    logger.info({ techId }, 'No push tokens registered — skipping notification')
    return
  }

  // 2. Look up call + score for the notification body
  const [callData] = await db
    .select({
      overallScore: scores.overallScore,
      opportunityTotalLow: scores.opportunityTotalLow,
    })
    .from(calls)
    .leftJoin(scores, eq(scores.id, calls.scoreId))
    .where(eq(calls.id, callId))

  const overallScore = callData?.overallScore ?? 0
  const missed = callData?.opportunityTotalLow ?? 0

  // 3. Build and validate push messages
  const expo = new Expo()
  const messages: ExpoPushMessage[] = tokenRows
    .filter((t) => Expo.isExpoPushToken(t.token))
    .map((t) => ({
      to: t.token,
      sound: 'default' as const,
      title: 'Call Scored',
      body: `Score: ${overallScore}% · Missed revenue: $${missed.toFixed(0)}`,
      data: { callId, screen: 'CallDetail' },
    }))

  if (messages.length === 0) {
    logger.warn({ techId }, 'All push tokens are invalid — skipping notification')
    return
  }

  // 4. Send in chunks (Expo recommends max 100 per request)
  const chunks = expo.chunkPushNotifications(messages)
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk)
    } catch (err) {
      logger.error({ err, techId, callId }, 'Push notification chunk send failed — continuing')
    }
  }

  logger.info({ callId, techId, tokenCount: messages.length }, 'Push notifications sent')
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -15
```

Expected: all tests PASS (existing + 5 new push tests)

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/push.ts worker/src/__tests__/push.test.ts
git commit -m "feat: push notification library — sendCallScoredNotification with Expo SDK"
```

---

## Task 3: Wire Push into scoring.ts

**Files:**
- Modify: `worker/src/workers/scoring.ts`
- Modify: `worker/src/__tests__/scoring.test.ts`

Replace the `// TODO Week 7: Send push notification` stub with a real call to `sendCallScoredNotification`. The push call is non-fatal: errors are logged, not re-thrown.

- [ ] **Step 1: Update worker/src/workers/scoring.ts**

At the top of the file, add the push import after the existing imports:

```typescript
import { sendCallScoredNotification } from '../lib/push.js'
```

Then find this block (after the `db.update` call that marks status `scored`):

```typescript
    // TODO Week 7: Send push notification
    logger.info({ callId: payload.callId }, 'Push notification (TODO Week 7)')
```

Replace it with:

```typescript
    // Send push notification to the technician (non-fatal)
    try {
      const [callRecord] = await db
        .select({ techId: calls.techId })
        .from(calls)
        .where(eq(calls.id, payload.callId))
      if (callRecord?.techId) {
        await sendCallScoredNotification(payload.callId, callRecord.techId)
      }
    } catch (err) {
      logger.warn({ err, callId: payload.callId }, 'Push notification failed — non-fatal')
    }
```

- [ ] **Step 2: Update worker/src/__tests__/scoring.test.ts**

Add the push mock to the existing `vi.mock` block at the top of the file (after `vi.mock('../lib/score-assembly.js', ...)`):

```typescript
vi.mock('../lib/push.js', () => ({ sendCallScoredNotification: vi.fn().mockResolvedValue(undefined) }))
```

Then add the push import alongside the other imports:

```typescript
import { sendCallScoredNotification } from '../lib/push.js'
```

Then add the beforeEach setup line (after the `assembleScore` mock line):

```typescript
    ;(sendCallScoredNotification as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
```

And add one new test at the end of the `describe('processTranscription')` block:

```typescript
  it('sends push notification after scoring completes', async () => {
    await processTranscription({
      callId: 'call-1',
      s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
      totalDurationSec: 600,
    })
    expect(sendCallScoredNotification).toHaveBeenCalled()
  })
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -15
```

Expected: all tests PASS (previous count + 1 new scoring test)

- [ ] **Step 4: Commit**

```bash
git add worker/src/workers/scoring.ts worker/src/__tests__/scoring.test.ts
git commit -m "feat: wire push notification into scoring worker — calls sendCallScoredNotification post-scoring"
```

---

## Task 4: GET /api/calls Route

**Files:**
- Create: `apps/web/src/app/api/calls/route.ts`
- Create: `apps/web/src/app/api/calls/__tests__/calls-list.test.ts`

Returns a paginated list of calls for the company. Owners and managers see all calls; technicians see only their own.

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/app/api/calls/__tests__/calls-list.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(),
}))
vi.mock('@kova/db', () => ({
  db: { select: vi.fn() },
  calls: {},
  scores: {},
  users: {},
  companies: {},
}))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  sql: vi.fn().mockReturnValue('count(*)'),
}))

import { requireRole } from '@/lib/auth'
import { db } from '@kova/db'
import { GET } from '../route'
import { NextResponse } from 'next/server'

const OWNER_CTX = { clerkUserId: 'user-clerk-1', orgId: 'org-1', role: 'owner' as const }
const TECH_CTX = { clerkUserId: 'user-clerk-2', orgId: 'org-1', role: 'technician' as const }

const MOCK_CALLS = [
  {
    id: 'call-1',
    techId: 'tech-1',
    recordedAt: new Date('2026-05-12T10:00:00Z'),
    durationSec: 600,
    status: 'scored',
    jobType: 'drain',
    customerName: 'Jane Smith',
    overallScore: 72,
    opportunityTotalLow: 425,
    opportunityTotalHigh: 425,
  },
]

function mockSelectChain(result: object[]) {
  ;(db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(result),
            }),
          }),
        }),
      }),
      where: vi.fn().mockResolvedValue([{ count: result.length }]),
    }),
  })
}

describe('GET /api/calls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. owner gets paginated call list for their company', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(OWNER_CTX)
    mockSelectChain(MOCK_CALLS)

    const req = new Request('http://localhost/api/calls?page=0')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].id).toBe('call-1')
    expect(typeof body.nextPage).toBe('number') || expect(body.nextPage).toBeNull()
  })

  it('2. unauthenticated request returns 401', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const req = new Request('http://localhost/api/calls')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('3. technician role is accepted (route allows all roles)', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(TECH_CTX)
    mockSelectChain([])

    const req = new Request('http://localhost/api/calls?page=0')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/web test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../route'" (or route not found)

- [ ] **Step 3: Create apps/web/src/app/api/calls/route.ts**

```typescript
import { NextResponse } from 'next/server'
import { db, calls, scores, users, companies } from '@kova/db'
import { and, desc, eq, sql } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'

const PAGE_SIZE = 20

export async function GET(request: Request) {
  const authResult = await requireRole(['owner', 'manager', 'technician'])
  if (authResult instanceof NextResponse) return authResult
  const { clerkUserId, orgId, role } = authResult

  // Look up company
  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.clerkOrgId, orgId))
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))

  // Technicians only see their own calls — resolve their DB user record
  let whereClause = eq(calls.companyId, company.id)
  if (role === 'technician') {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    whereClause = and(eq(calls.companyId, company.id), eq(calls.techId, user.id))!
  }

  const [callsList, countResult] = await Promise.all([
    db
      .select({
        id: calls.id,
        techId: calls.techId,
        recordedAt: calls.recordedAt,
        durationSec: calls.durationSec,
        status: calls.status,
        jobType: calls.jobType,
        customerName: calls.customerName,
        overallScore: scores.overallScore,
        opportunityTotalLow: scores.opportunityTotalLow,
        opportunityTotalHigh: scores.opportunityTotalHigh,
      })
      .from(calls)
      .leftJoin(scores, eq(scores.id, calls.scoreId))
      .where(whereClause)
      .orderBy(desc(calls.recordedAt))
      .limit(PAGE_SIZE)
      .offset(page * PAGE_SIZE),
    db
      .select({ count: sql<number>`count(*)` })
      .from(calls)
      .where(whereClause),
  ])

  const total = Number(countResult[0]?.count ?? 0)

  return NextResponse.json({
    data: callsList,
    nextPage: (page + 1) * PAGE_SIZE < total ? page + 1 : null,
    total,
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/web test 2>&1 | tail -15
```

Expected: all web tests PASS (existing 6 + 3 new)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/calls/route.ts apps/web/src/app/api/calls/__tests__/calls-list.test.ts
git commit -m "feat: GET /api/calls — paginated call list with role-based company scoping"
```

---

## Task 5: GET /api/calls/[id] and GET /api/calls/[id]/audio Routes

**Files:**
- Create: `apps/web/src/app/api/calls/[id]/route.ts`
- Create: `apps/web/src/app/api/calls/[id]/audio/route.ts`

No separate test files — these are thin routes and tested via integration in the mobile layer. The pattern is identical to Task 4 so it doesn't need full TDD coverage here.

- [ ] **Step 1: Create apps/web/src/app/api/calls/[id]/route.ts**

```typescript
import { NextResponse } from 'next/server'
import { db, calls, scores, transcripts, opportunities, coachingPoints } from '@kova/db'
import { eq } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['owner', 'manager', 'technician'])
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params

  const [call] = await db
    .select()
    .from(calls)
    .where(eq(calls.id, id))

  if (!call) {
    return NextResponse.json({ error: 'Call not found' }, { status: 404 })
  }

  // Fetch related records in parallel
  const [scoreRows, transcriptRows, opportunityRows, coachingRows] = await Promise.all([
    call.scoreId
      ? db.select().from(scores).where(eq(scores.id, call.scoreId))
      : Promise.resolve([]),
    call.transcriptId
      ? db.select().from(transcripts).where(eq(transcripts.id, call.transcriptId))
      : Promise.resolve([]),
    call.scoreId
      ? db.select().from(opportunities).where(eq(opportunities.scoreId, call.scoreId))
      : Promise.resolve([]),
    db.select().from(coachingPoints).where(eq(coachingPoints.callId, id)),
  ])

  return NextResponse.json({
    call,
    score: scoreRows[0] ?? null,
    transcript: transcriptRows[0] ?? null,
    opportunities: opportunityRows,
    coachingPoints: coachingRows,
  })
}
```

- [ ] **Step 2: Create apps/web/src/app/api/calls/[id]/audio/route.ts**

```typescript
import { NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { db, calls } from '@kova/db'
import { eq } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'
import { getS3Client, S3_BUCKET } from '@/lib/s3'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['owner', 'manager', 'technician'])
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params

  const [call] = await db
    .select({ s3Key: calls.s3Key })
    .from(calls)
    .where(eq(calls.id, id))

  if (!call) {
    return NextResponse.json({ error: 'Call not found' }, { status: 404 })
  }

  if (!call.s3Key) {
    return NextResponse.json({ error: 'Audio not available' }, { status: 404 })
  }

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: call.s3Key,
  })

  const url = await getSignedUrl(getS3Client(), command, { expiresIn: 3600 })

  return NextResponse.json({ url, expiresInSec: 3600 })
}
```

- [ ] **Step 3: Typecheck web**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/web typecheck 2>&1 | tail -10
```

Expected: passes (or fix any import issues)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/calls/[id]/route.ts apps/web/src/app/api/calls/[id]/audio/route.ts
git commit -m "feat: GET /api/calls/:id and GET /api/calls/:id/audio — call detail + presigned S3 URL"
```

---

## Task 6: POST /api/notifications/register Route

**Files:**
- Create: `apps/web/src/app/api/notifications/register/route.ts`
- Create: `apps/web/src/app/api/notifications/__tests__/register.test.ts`

Upserts a push token for the authenticated user. Uses `INSERT ... ON CONFLICT (token) DO UPDATE SET userId = excluded.userId`.

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/app/api/notifications/__tests__/register.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(),
}))
vi.mock('@kova/db', () => ({
  db: { select: vi.fn(), insert: vi.fn() },
  users: {},
  pushTokens: {},
}))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  sql: vi.fn(),
}))

import { requireRole } from '@/lib/auth'
import { db } from '@kova/db'
import { POST } from '../register/route'
import { NextResponse } from 'next/server'

const AUTH_CTX = { clerkUserId: 'user-clerk-1', orgId: 'org-1', role: 'technician' as const }

function makeRequest(body: object) {
  return new Request('http://localhost/api/notifications/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/notifications/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(AUTH_CTX)

    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'user-db-1' }]),
      }),
    })
    ;(db.insert as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    })
  })

  it('1. registers a push token and returns 201', async () => {
    const req = makeRequest({ token: 'ExponentPushToken[abc123]', platform: 'ios' })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.registered).toBe(true)
  })

  it('2. returns 400 when token is missing', async () => {
    const req = makeRequest({ platform: 'ios' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('3. returns 401 when not authenticated', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
    const req = makeRequest({ token: 'ExponentPushToken[abc123]', platform: 'ios' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/web test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../register/route'"

- [ ] **Step 3: Create apps/web/src/app/api/notifications/register/route.ts**

```typescript
import { NextResponse } from 'next/server'
import { db, users, pushTokens } from '@kova/db'
import { eq, sql } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'

export async function POST(request: Request) {
  const authResult = await requireRole(['owner', 'manager', 'technician'])
  if (authResult instanceof NextResponse) return authResult
  const { clerkUserId } = authResult

  const body = (await request.json()) as { token?: string; platform?: 'ios' | 'android' }

  if (!body.token || !body.platform) {
    return NextResponse.json({ error: 'token and platform are required' }, { status: 400 })
  }

  // Look up DB user by Clerk user ID
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Upsert: if the token already exists, update userId (device may be re-registered)
  await db
    .insert(pushTokens)
    .values({
      userId: user.id,
      token: body.token,
      platform: body.platform,
    })
    .onConflictDoUpdate({
      target: pushTokens.token,
      set: { userId: sql`excluded.user_id` },
    })

  return NextResponse.json({ registered: true }, { status: 201 })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/web test 2>&1 | tail -15
```

Expected: all web tests PASS (existing + 3 new)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/notifications/register/route.ts apps/web/src/app/api/notifications/__tests__/register.test.ts
git commit -m "feat: POST /api/notifications/register — push token upsert with conflict resolution"
```

---

## Task 7: POST /api/opportunities/[id]/dispute Route

**Files:**
- Create: `apps/web/src/app/api/opportunities/[id]/dispute/route.ts`
- Create: `apps/web/src/app/api/opportunities/__tests__/dispute.test.ts`

Allows managers and owners to flag an opportunity as disputed with a reason. Technicians are forbidden (403).

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/app/api/opportunities/__tests__/dispute.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(),
}))
vi.mock('@kova/db', () => ({
  db: { update: vi.fn() },
  opportunities: {},
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))

import { requireRole } from '@/lib/auth'
import { db } from '@kova/db'
import { POST } from '../[id]/dispute/route'
import { NextResponse } from 'next/server'

const MANAGER_CTX = { clerkUserId: 'user-1', orgId: 'org-1', role: 'manager' as const }

function makeRequest(body: object) {
  return new Request('http://localhost/api/opportunities/opp-1/dispute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/opportunities/:id/dispute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(MANAGER_CTX)
    ;(db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })
  })

  it('1. manager can dispute an opportunity — returns 200', async () => {
    const req = makeRequest({ reason: 'Customer confirmed they did request this service' })
    const res = await POST(req, { params: Promise.resolve({ id: 'opp-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.disputed).toBe(true)
  })

  it('2. technician is forbidden — returns 403', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    )
    const req = makeRequest({ reason: 'some reason' })
    const res = await POST(req, { params: Promise.resolve({ id: 'opp-1' }) })
    expect(res.status).toBe(403)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/web test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../[id]/dispute/route'"

- [ ] **Step 3: Create apps/web/src/app/api/opportunities/[id]/dispute/route.ts**

```typescript
import { NextResponse } from 'next/server'
import { db, opportunities } from '@kova/db'
import { eq } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Only owners and managers may dispute opportunities
  const authResult = await requireRole(['owner', 'manager'])
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params
  const body = (await request.json()) as { reason?: string }

  if (!body.reason?.trim()) {
    return NextResponse.json({ error: 'reason is required' }, { status: 400 })
  }

  await db
    .update(opportunities)
    .set({
      disputeReason: body.reason.trim(),
      disputedAt: new Date(),
    })
    .where(eq(opportunities.id, id))

  return NextResponse.json({ disputed: true })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/web test 2>&1 | tail -15
```

Expected: all web tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/opportunities/[id]/dispute/route.ts apps/web/src/app/api/opportunities/__tests__/dispute.test.ts
git commit -m "feat: POST /api/opportunities/:id/dispute — manager/owner only dispute endpoint"
```

---

## Task 8: Mobile API Client

**Files:**
- Create: `apps/mobile/src/services/api.ts`
- Create: `apps/mobile/src/services/__tests__/api.test.ts`

Standalone fetch-based client — no hooks, no side effects. Components call these functions with the Clerk token they get from `useAuth().getToken()`.

- [ ] **Step 1: Write the failing tests**

Create `apps/mobile/src/services/__tests__/api.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

import {
  fetchCalls,
  fetchCall,
  fetchCallAudioUrl,
  disputeOpportunity,
  registerPushToken,
} from '../api'

const TOKEN = 'clerk-token-abc'

function mockOkResponse(data: unknown) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => data,
  })
}

function mockErrorResponse(status: number) {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ message: `HTTP ${status}` }),
  })
}

describe('API client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000'
  })

  it('1. fetchCalls sends Authorization header and returns data', async () => {
    mockOkResponse({ data: [{ id: 'call-1' }], nextPage: null, total: 1 })

    const result = await fetchCalls(TOKEN, 0)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/calls?page=0',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      })
    )
    expect(result.data[0].id).toBe('call-1')
  })

  it('2. fetchCall fetches a single call by id', async () => {
    mockOkResponse({ call: { id: 'call-1' }, score: null, opportunities: [] })

    const result = await fetchCall(TOKEN, 'call-1')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/calls/call-1',
      expect.anything()
    )
    expect(result.call.id).toBe('call-1')
  })

  it('3. fetchCallAudioUrl returns presigned URL', async () => {
    mockOkResponse({ url: 'https://s3.example.com/audio.aac?signed=1', expiresInSec: 3600 })

    const result = await fetchCallAudioUrl(TOKEN, 'call-1')

    expect(result.url).toContain('s3.example.com')
  })

  it('4. disputeOpportunity sends POST with reason', async () => {
    mockOkResponse({ disputed: true })

    await disputeOpportunity(TOKEN, 'opp-1', 'Customer never requested this')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/opportunities/opp-1/dispute',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'Customer never requested this' }),
      })
    )
  })

  it('5. throws an error when response is not ok', async () => {
    mockErrorResponse(401)

    await expect(fetchCalls(TOKEN, 0)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/mobile test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../api'"

- [ ] **Step 3: Create apps/mobile/src/services/api.ts**

```typescript
// ---------------------------------------------------------------------------
// Kova API Client — standalone fetch functions, no React hooks
// Pass the Clerk JWT token from useAuth().getToken() to each call.
// ---------------------------------------------------------------------------

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

async function authFetch(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string> | undefined),
    },
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    throw new Error((errBody as { message?: string }).message ?? `HTTP ${res.status}`)
  }

  return res.json()
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

export interface CallsListResponse {
  data: CallSummaryItem[]
  nextPage: number | null
  total: number
}

export interface CallSummaryItem {
  id: string
  techId: string
  recordedAt: string
  durationSec: number
  status: string
  jobType: string | null
  customerName: string | null
  overallScore: number | null
  opportunityTotalLow: number | null
  opportunityTotalHigh: number | null
}

export interface CallDetailResponse {
  call: Record<string, unknown>
  score: Record<string, unknown> | null
  transcript: Record<string, unknown> | null
  opportunities: Record<string, unknown>[]
  coachingPoints: Record<string, unknown>[]
}

export interface AudioUrlResponse {
  url: string
  expiresInSec: number
}

export function fetchCalls(token: string, page = 0): Promise<CallsListResponse> {
  return authFetch(`/api/calls?page=${page}`, token) as Promise<CallsListResponse>
}

export function fetchCall(token: string, callId: string): Promise<CallDetailResponse> {
  return authFetch(`/api/calls/${callId}`, token) as Promise<CallDetailResponse>
}

export function fetchCallAudioUrl(token: string, callId: string): Promise<AudioUrlResponse> {
  return authFetch(`/api/calls/${callId}/audio`, token) as Promise<AudioUrlResponse>
}

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------

export function disputeOpportunity(
  token: string,
  opportunityId: string,
  reason: string,
): Promise<{ disputed: boolean }> {
  return authFetch(`/api/opportunities/${opportunityId}/dispute`, token, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }) as Promise<{ disputed: boolean }>
}

// ---------------------------------------------------------------------------
// Push tokens
// ---------------------------------------------------------------------------

export function registerPushToken(
  token: string,
  pushToken: string,
  platform: 'ios' | 'android',
): Promise<{ registered: boolean }> {
  return authFetch('/api/notifications/register', token, {
    method: 'POST',
    body: JSON.stringify({ token: pushToken, platform }),
  }) as Promise<{ registered: boolean }>
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/mobile test 2>&1 | tail -15
```

Expected: all mobile tests PASS (existing 17 + 5 new)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/services/api.ts apps/mobile/src/services/__tests__/api.test.ts
git commit -m "feat: mobile API client — fetch-based calls, audio URL, dispute, and push token registration"
```

---

## Task 9: Mobile Push Notification Service

**Files:**
- Create: `apps/mobile/src/services/notifications.ts`

No unit tests for this file — it calls native Expo APIs (permissions, getExpoPushTokenAsync) that require a real device or `@expo/jest-expo` environment not configured here. Tested manually via EAS dev build.

- [ ] **Step 1: Create apps/mobile/src/services/notifications.ts**

```typescript
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import Constants from 'expo-constants'

// ---------------------------------------------------------------------------
// Foreground notification behavior — show alert + badge + sound
// ---------------------------------------------------------------------------

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// ---------------------------------------------------------------------------
// registerForPushNotifications
// Returns the Expo push token string, or null if permission denied / not supported.
// ---------------------------------------------------------------------------

export async function registerForPushNotifications(): Promise<string | null> {
  // Expo Go / Simulator: getExpoPushTokenAsync requires a physical device
  if (!Constants.isDevice) {
    console.warn('[Notifications] Push notifications require a physical device')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Push notification permissions denied')
    return null
  }

  // Android requires a notification channel for Expo SDK 55+
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
    })
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
  if (!projectId) {
    console.warn('[Notifications] EAS projectId not configured in app.json extra.eas.projectId')
    return null
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
  return tokenData.data
}

// ---------------------------------------------------------------------------
// Notification data payload type — matches what the worker sends
// ---------------------------------------------------------------------------

export interface CallScoredNotificationData {
  callId: string
  screen: 'CallDetail'
}

// ---------------------------------------------------------------------------
// addNotificationResponseListener
// Call this in the root component to handle taps on scored-call notifications.
// The callback receives the callId so the app can navigate to CallDetailScreen.
// ---------------------------------------------------------------------------

export function addCallScoredListener(
  onCallScored: (callId: string) => void,
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Partial<CallScoredNotificationData>
    if (data?.screen === 'CallDetail' && data?.callId) {
      onCallScored(data.callId)
    }
  })
}
```

- [ ] **Step 2: Typecheck mobile**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/mobile typecheck 2>&1 | tail -10
```

Expected: passes. If `expo-constants` or `expo-notifications` types are not found, they are already in `apps/mobile/package.json` — ensure `pnpm install` has been run.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/services/notifications.ts
git commit -m "feat: mobile push notification service — registration, foreground handler, and response listener"
```

---

## Task 10: Navigation Updates (types + RootNavigator)

**Files:**
- Modify: `apps/mobile/src/navigation/types.ts`
- Modify: `apps/mobile/src/navigation/RootNavigator.tsx`

Add `CallDetail` to the stack. Navigation is triggered from HomeScreen item taps and push notification taps.

- [ ] **Step 1: Update apps/mobile/src/navigation/types.ts**

Replace the file contents with:

```typescript
export type RootStackParamList = {
  Main: undefined
  SignIn: undefined
  JobTagging: { sessionId: string; callId: string }
  CallDetail: { callId: string }
}

export type TabParamList = {
  Home: undefined
  Record: undefined
  Profile: undefined
}
```

- [ ] **Step 2: Update apps/mobile/src/navigation/RootNavigator.tsx**

Add the `CallDetailScreen` import at the top of the file (after the existing screen imports):

```typescript
import CallDetailScreen from '../screens/CallDetailScreen'
```

Inside the `<Stack.Navigator>` block, add the `CallDetail` screen after the existing `JobTagging` screen:

```tsx
        <Stack.Screen
          name="CallDetail"
          component={CallDetailScreen}
          options={{ title: 'Call Detail', headerShown: true }}
        />
```

The full updated `StackNav` function return should be:

```tsx
  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isSignedIn ? (
          <Stack.Screen name="Main" component={TabNavigator} />
        ) : (
          <Stack.Screen name="SignIn" component={SignInScreen} />
        )}
        <Stack.Screen
          name="JobTagging"
          component={JobTaggingScreen}
          options={{ title: 'Tag This Call' }}
        />
        <Stack.Screen
          name="CallDetail"
          component={CallDetailScreen}
          options={{ title: 'Call Detail', headerShown: true }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
```

- [ ] **Step 3: Typecheck mobile**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/mobile typecheck 2>&1 | tail -10
```

Expected: passes. `CallDetailScreen` will be a stub at this point — create the empty file in Step 4 first if typecheck fails.

Create a temporary stub `apps/mobile/src/screens/CallDetailScreen.tsx` containing only:

```tsx
import React from 'react'
import { View } from 'react-native'
export default function CallDetailScreen() { return <View /> }
```

Then re-run typecheck.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/navigation/types.ts apps/mobile/src/navigation/RootNavigator.tsx
git commit -m "feat: add CallDetail route to navigation stack"
```

---

## Task 11: HomeScreen — Real Call List

**Files:**
- Modify: `apps/mobile/src/screens/HomeScreen.tsx`

Replace the stub with a real `FlatList` that fetches from `GET /api/calls` using React Query and navigates to `CallDetailScreen` on tap.

- [ ] **Step 1: Replace apps/mobile/src/screens/HomeScreen.tsx entirely**

```tsx
import React from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { useAuth } from '@clerk/clerk-expo'
import { useQuery } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { fetchCalls } from '../services/api'
import type { CallSummaryItem } from '../services/api'
import type { RootStackParamList } from '../navigation/types'

type HomeNav = NativeStackNavigationProp<RootStackParamList>

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'scored' ? '#16A34A' :
    status === 'failed' ? '#DC2626' :
    status === 'processing' ? '#D97706' :
    '#6B7280'
  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Call row
// ---------------------------------------------------------------------------

function CallRow({ item, onPress }: { item: CallSummaryItem; onPress: () => void }) {
  const date = new Date(item.recordedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const durationMin = Math.round(item.durationSec / 60)

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowDate}>{date}</Text>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.rowBody}>
        {item.customerName ? (
          <Text style={styles.customerName}>{item.customerName}</Text>
        ) : null}
        <Text style={styles.meta}>{durationMin} min · {item.jobType ?? 'unknown'}</Text>
      </View>
      {item.status === 'scored' && item.overallScore != null ? (
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{item.overallScore}%</Text>
          {item.opportunityTotalLow != null && item.opportunityTotalLow > 0 ? (
            <>
              <Text style={styles.scoreLabel}>  Missed</Text>
              <Text style={[styles.scoreValue, styles.missed]}>
                ${item.opportunityTotalLow.toFixed(0)}
              </Text>
            </>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const { getToken } = useAuth()
  const navigation = useNavigation<HomeNav>()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['calls', 0],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return fetchCalls(token, 0)
    },
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not load calls.</Text>
        <TouchableOpacity onPress={() => void refetch()}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const calls = data?.data ?? []

  if (calls.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No calls yet</Text>
        <Text style={styles.emptyBody}>Tap Record to start your first call.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={calls}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CallRow
            item={item}
            onPress={() => navigation.navigate('CallDetail', { callId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  list: { paddingVertical: 8 },
  row: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBody: { marginTop: 4 },
  rowDate: { fontSize: 13, color: '#6B7280' },
  customerName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  scoreLabel: { fontSize: 12, color: '#6B7280' },
  scoreValue: { fontSize: 14, fontWeight: '700', color: '#16A34A', marginLeft: 4 },
  missed: { color: '#DC2626' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  errorText: { fontSize: 15, color: '#DC2626', marginBottom: 12 },
  retryText: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
})
```

- [ ] **Step 2: Typecheck mobile**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/mobile typecheck 2>&1 | tail -10
```

Expected: passes. If `@tanstack/react-query` types are missing, ensure `pnpm install` has been run.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/HomeScreen.tsx
git commit -m "feat: HomeScreen — real call list with React Query, status badges, and score summary"
```

---

## Task 12: CallDetailScreen

**Files:**
- Modify/Replace: `apps/mobile/src/screens/CallDetailScreen.tsx`

Shows full call detail: score, opportunities with dispute button (modal), coaching notes (read-only), and audio playback button (opens presigned S3 URL via `react-native-audio-api` or native share).

- [ ] **Step 1: Create/replace apps/mobile/src/screens/CallDetailScreen.tsx**

```tsx
import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native'
import { useAuth } from '@clerk/clerk-expo'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { fetchCall, fetchCallAudioUrl, disputeOpportunity } from '../services/api'
import type { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'CallDetail'>

// ---------------------------------------------------------------------------
// Opportunity row with dispute button
// ---------------------------------------------------------------------------

function OpportunityRow({
  opp,
  onDispute,
}: {
  opp: Record<string, unknown>
  onDispute: (oppId: string) => void
}) {
  const triggered = opp.triggered as boolean
  const offered = opp.offered as boolean
  const type = (opp.type as string).replace(/_/g, ' ')
  const valueLow = opp.valueLow as number
  const valueHigh = opp.valueHigh as number
  const disputed = !!(opp.disputedAt as string | null)

  const isMissed = triggered && !offered && !opp.suppressedReason

  return (
    <View style={styles.oppRow}>
      <View style={styles.oppMain}>
        <Text style={styles.oppType}>{type}</Text>
        <Text style={[styles.oppStatus, isMissed && styles.missedText]}>
          {disputed ? 'Disputed' : isMissed ? 'Missed' : offered ? 'Offered' : 'Not triggered'}
        </Text>
      </View>
      {triggered ? (
        <View style={styles.oppRight}>
          {valueLow > 0 ? (
            <Text style={styles.oppValue}>
              ${valueLow.toFixed(0)}{valueHigh !== valueLow ? `–$${valueHigh.toFixed(0)}` : ''}
            </Text>
          ) : null}
          {isMissed && !disputed ? (
            <TouchableOpacity
              style={styles.disputeBtn}
              onPress={() => onDispute(opp.id as string)}
            >
              <Text style={styles.disputeBtnText}>Dispute</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------------------
// CallDetailScreen
// ---------------------------------------------------------------------------

export default function CallDetailScreen({ route }: Props) {
  const { callId } = route.params
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  const [disputeModalVisible, setDisputeModalVisible] = useState(false)
  const [disputeTargetId, setDisputeTargetId] = useState<string | null>(null)
  const [disputeReason, setDisputeReason] = useState('')

  // Fetch call detail
  const { data, isLoading, isError } = useQuery({
    queryKey: ['call', callId],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return fetchCall(token, callId)
    },
  })

  // Fetch audio URL on demand
  const audioMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return fetchCallAudioUrl(token, callId)
    },
    onSuccess: (result) => {
      Alert.alert('Audio URL', result.url.substring(0, 80) + '…')
    },
    onError: () => {
      Alert.alert('Error', 'Could not load audio. Try again.')
    },
  })

  // Dispute mutation
  const disputeMutation = useMutation({
    mutationFn: async ({ oppId, reason }: { oppId: string; reason: string }) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return disputeOpportunity(token, oppId, reason)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['call', callId] })
      setDisputeModalVisible(false)
      setDisputeReason('')
      setDisputeTargetId(null)
    },
    onError: () => {
      Alert.alert('Error', 'Could not submit dispute. Try again.')
    },
  })

  function openDisputeModal(oppId: string) {
    setDisputeTargetId(oppId)
    setDisputeModalVisible(true)
  }

  function submitDispute() {
    if (!disputeTargetId || !disputeReason.trim()) {
      Alert.alert('Required', 'Please enter a dispute reason.')
      return
    }
    disputeMutation.mutate({ oppId: disputeTargetId, reason: disputeReason })
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  if (isError || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not load call detail.</Text>
      </View>
    )
  }

  const call = data.call as Record<string, unknown>
  const score = data.score as Record<string, unknown> | null
  const opportunities = data.opportunities as Record<string, unknown>[]
  const coachingPoints = data.coachingPoints as Record<string, unknown>[]
  const durationMin = Math.round((call.durationSec as number) / 60)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Call Info</Text>
        <Text style={styles.metaRow}>
          {new Date(call.recordedAt as string).toLocaleString()} · {durationMin} min
        </Text>
        {call.customerName ? (
          <Text style={styles.metaRow}>Customer: {call.customerName as string}</Text>
        ) : null}
        <Text style={styles.metaRow}>Type: {(call.jobType as string) ?? 'Unknown'}</Text>
        <Text style={styles.metaRow}>Status: {call.status as string}</Text>
      </View>

      {/* Score */}
      {score ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Score</Text>
          <View style={styles.scoreBox}>
            <Text style={styles.bigScore}>{score.overallScore as number}%</Text>
            <Text style={styles.confidenceText}>
              {score.modelUsed as string} · {score.confidenceLevel as string} confidence
            </Text>
          </View>
          {(score.opportunityTotalLow as number) > 0 ? (
            <Text style={styles.missedRevenue}>
              Missed revenue: ${(score.opportunityTotalLow as number).toFixed(0)}
              –${(score.opportunityTotalHigh as number).toFixed(0)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Opportunities */}
      {opportunities.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opportunities</Text>
          {opportunities.map((opp) => (
            <OpportunityRow
              key={opp.id as string}
              opp={opp}
              onDispute={openDisputeModal}
            />
          ))}
        </View>
      ) : null}

      {/* Coaching notes (read-only) */}
      {coachingPoints.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coaching Notes</Text>
          {coachingPoints.map((cp) => (
            <View key={cp.id as string} style={styles.coachingRow}>
              <Text style={styles.coachingText}>{cp.text as string}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Audio playback */}
      {call.s3Key ? (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.audioBtn}
            onPress={() => audioMutation.mutate()}
            disabled={audioMutation.isPending}
          >
            {audioMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.audioBtnText}>▶  Play Recording</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Dispute modal */}
      <Modal
        visible={disputeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDisputeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Dispute Opportunity</Text>
            <Text style={styles.modalBody}>
              Explain why this opportunity should not have been flagged as missed:
            </Text>
            <TextInput
              style={styles.reasonInput}
              multiline
              numberOfLines={4}
              placeholder="Enter reason..."
              value={disputeReason}
              onChangeText={setDisputeReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setDisputeModalVisible(false)
                  setDisputeReason('')
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={submitDispute}
                disabled={disputeMutation.isPending}
              >
                {disputeMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 15, color: '#DC2626' },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaRow: { fontSize: 14, color: '#374151', marginBottom: 4 },
  scoreBox: { alignItems: 'center', paddingVertical: 8 },
  bigScore: { fontSize: 56, fontWeight: '800', color: '#2563EB' },
  confidenceText: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  missedRevenue: { fontSize: 14, color: '#DC2626', fontWeight: '600', textAlign: 'center', marginTop: 8 },
  oppRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  oppMain: { flex: 1 },
  oppType: { fontSize: 14, fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  oppStatus: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  missedText: { color: '#DC2626' },
  oppRight: { alignItems: 'flex-end' },
  oppValue: { fontSize: 13, fontWeight: '700', color: '#16A34A' },
  disputeBtn: { marginTop: 4, backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  disputeBtnText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  coachingRow: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  coachingText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  audioBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  audioBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  modalBody: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  reasonInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 14, color: '#111827', minHeight: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  cancelBtnText: { fontSize: 15, color: '#6B7280' },
  submitBtn: { backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  submitBtnText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
})
```

- [ ] **Step 2: Typecheck mobile**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/mobile typecheck 2>&1 | tail -10
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/CallDetailScreen.tsx
git commit -m "feat: CallDetailScreen — score, opportunities with dispute modal, coaching notes, audio playback"
```

---

## Task 13: Full CI Simulation

- [ ] **Step 1: Run full test suite**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm test 2>&1 | tail -30
```

Expected: all packages PASS. After Plan A + Plan B, worker tests = 198+ and web tests = 6 + 3 + 3 + 2 = 14+. Mobile = 17 + 5 = 22+.

If Plan B is run without Plan A (from commit `65cf976`), worker tests = 108 + 6 = 114+ (push + scoring push test).

- [ ] **Step 2: Typecheck all packages**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm typecheck 2>&1 | tail -10
```

Expected: `Tasks: 5 successful, 5 total`

Common issues:
- `@aws-sdk/s3-request-presigner` not available → already in `apps/web/package.json`
- `expo-server-sdk` named exports → import `{ Expo }` from `'expo-server-sdk'` (not default)
- `params` in Next.js 15 route handlers is `Promise<{ id: string }>` → always `await params`

- [ ] **Step 3: Lint**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm lint 2>&1 | tail -10
```

Expected: `Tasks: 5 successful, 5 total` (warnings OK)

- [ ] **Step 4: Final commit if adjustments needed**

```bash
git add -A
git commit -m "fix: CI lint/typecheck cleanup for week 7b push and mobile"
```

---

## Self-Review

Spec coverage:
- ✅ `NSBackgroundModes` includes `remote-notification` (Task 1)
- ✅ `worker/src/lib/push.ts` — `sendCallScoredNotification()` with Expo SDK (Task 2)
- ✅ Push wired into `scoring.ts` replacing TODO stub (Task 3)
- ✅ `GET /api/calls` — paginated, role-scoped (Task 4)
- ✅ `GET /api/calls/:id` — full detail (Task 5)
- ✅ `GET /api/calls/:id/audio` — presigned S3 GET URL (Task 5)
- ✅ `POST /api/notifications/register` — push token upsert (Task 6)
- ✅ `POST /api/opportunities/:id/dispute` — manager/owner only (Task 7)
- ✅ `apps/mobile/src/services/api.ts` — fetch client (Task 8)
- ✅ `apps/mobile/src/services/notifications.ts` — registration + listener (Task 9)
- ✅ `CallDetail` route in navigation (Task 10)
- ✅ HomeScreen — real call list (Task 11)
- ✅ CallDetailScreen — score + opportunities + dispute + audio (Task 12)
- ✅ CI green (Task 13)

Type consistency:
- `params` in Next.js 15 App Router handlers is typed as `Promise<{ id: string }>` — all handlers `await params` before destructuring.
- `requireRole` return is `AuthContext | NextResponse` — all routes check `instanceof NextResponse` before destructuring.
- `CallSummaryItem` in `api.ts` matches the fields selected in `GET /api/calls`.
