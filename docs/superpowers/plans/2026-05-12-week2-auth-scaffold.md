# Week 1 Completion + Week 2 Database & Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix CI, write README, implement Clerk auth flows (web webhook + mobile OTP), add role-based access middleware, generate first Drizzle migration.

**Architecture:** Clerk handles all authentication. Webhook events sync users/orgs/memberships to Neon DB via `@clerk/nextjs/webhooks`. Mobile uses `useSignIn()` phone OTP two-step flow. API routes use a `getAuthContext()` helper that extracts Clerk session data and maps org roles to Kova roles.

**Tech Stack:** Clerk v7 (web) / Expo v2 (mobile), Drizzle ORM, Neon Postgres, Next.js 15, Expo SDK 55, pnpm 11, Turborepo

**Base SHA:** efb574619416ca10103dff06f12e4745b5319b44

---

### Task 1: Fix CI Pipeline

**Files:**
- Modify: `.github/workflows/ci.yml:62`

The CI fails at `pnpm install --frozen-lockfile` with `[ERR_PNPM_IGNORED_BUILDS]` (exit code 1). In pnpm 11, packages with build scripts that aren't explicitly approved via `pnpm approve-builds` cause a fatal error under `--frozen-lockfile`. CI only needs typecheck/lint/test — native build scripts aren't needed.

- [ ] **Step 1: Add `--ignore-scripts` to the install step in `.github/workflows/ci.yml`**

Change line 62 from:
```yaml
        run: pnpm install --frozen-lockfile
```
to:
```yaml
        run: pnpm install --frozen-lockfile --ignore-scripts
```

- [ ] **Step 2: Verify locally**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm install --frozen-lockfile --ignore-scripts`
Expected: exits 0, no `[ERR_PNPM_IGNORED_BUILDS]` error

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "fix: CI pnpm install with --ignore-scripts to suppress build script errors"
```

---

### Task 2: Write README.md

**Files:**
- Create: `README.md` (in repo root)

- [ ] **Step 1: Write README with the following sections**

1. **Project name + badge line** — "Kova — Revenue Intelligence" with CI badge
2. **One-liner** — What it is
3. **Architecture overview** — ASCII diagram of the monorepo structure showing all workspaces
4. **Prerequisites** — Node 22 (nvm), pnpm 11, Expo CLI, EAS CLI
5. **Quick start** — `nvm use`, `pnpm install`, `cp .env.example .env.local`, `pnpm dev`
6. **Project structure** — table of workspaces + what each does
7. **Available scripts** — table: script → what it does
8. **Tech stack** — table: layer → technology
9. **Environment variables** — brief note pointing to `.env.example` for all vars
10. **External services setup** — one subsection per service with step-by-step setup instructions:
    - **Clerk**: create app at dashboard.clerk.com → API Keys → enable Phone OTP (User & Authentication → Phone number) → enable Organizations → create custom `org:manager` role → add webhook endpoint `https://<domain>/api/webhooks/clerk` → subscribe to: `user.created`, `organization.created`, `organizationMembership.created` → copy Signing Secret to `CLERK_WEBHOOK_SECRET`
    - **Neon**: console.neon.tech → New project → copy pooled URL to `DATABASE_URL`, direct URL to `DATABASE_URL_UNPOOLED` → create branches: `staging`, `dev`, `test`
    - **Railway**: railway.app → New project → Add Redis → Connect tab → copy `REDIS_URL`
    - **AWS S3**: Create bucket `kova-audio-dev` (us-east-1, private) → IAM → create user `kova-app-user` → attach inline policy with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on the bucket → copy access key ID + secret
    - **Sentry**: sentry.io → New project: Next.js (name: `kova-web`) + React Native (name: `kova-mobile`) → copy DSNs → create auth token for source maps
    - **Vercel**: vercel.com → Add New Project → import `kova-ai-app/kova` → Root Directory: `.` → Framework: Next.js → set all env vars from `.env.example` → deploy
11. **Development workflow** — pnpm dev, migration commands, seed command
12. **License** — MIT

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add comprehensive README with setup guide and architecture overview"
```

---

### Task 3: Generate Drizzle Migration Files

**Files:**
- Creates: `packages/db/src/migrations/0000_*.sql` + `packages/db/src/migrations/meta/_journal.json`

- [ ] **Step 1: Run drizzle-kit generate**

```bash
source ~/.nvm/nvm.sh && nvm use 22
pnpm --filter @kova/db exec drizzle-kit generate
```

Expected: Creates `packages/db/src/migrations/0000_<name>.sql`

- [ ] **Step 2: Verify output**

```bash
ls packages/db/src/migrations/
grep -c "CREATE TABLE" packages/db/src/migrations/0000_*.sql
```

Expected: 13 CREATE TABLE statements (companies, users, calls, transcripts, scores, opportunities, pricebook_items, coaching_points, notifications, jobs, processing_costs, audit_logs, push_tokens)

- [ ] **Step 3: Add turbo pipeline entry for `db:generate` if not already present**

Check `turbo.json` — ensure `"db:generate"` task is configured. If not, add:
```json
"db:generate": {
  "cache": false
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/migrations/ turbo.json
git commit -m "feat: generate initial Drizzle migration (13 tables)"
```

---

### Task 4: Implement Clerk Webhook Handler

**Files:**
- Modify: `apps/web/src/app/api/webhooks/clerk/route.ts`

**Context:** The current handler manually verifies Svix headers and has TODO stubs for all 3 events. Clerk now ships `verifyWebhook` from `@clerk/nextjs/webhooks` which handles Svix internally and returns a typed `WebhookEvent`. Use that instead.

**Event handling strategy (chicken-and-egg solved):**
- `user.created` → log only (user has no org yet, can't determine companyId)
- `organization.created` → upsert company in DB (use org `id` and `name`; set `created_by_clerk_id` in metadata for linking)
- `organizationMembership.created` → upsert user record with companyId + role

**Role mapping:**
- `org:admin` → `'owner'`
- `org:manager` (custom) → `'manager'`
- `org:member` → `'technician'`

**Key types available from `@clerk/nextjs/webhooks`:**
- `WebhookEvent` (union type, narrowed by `.type`)
- `UserJSON` has: `id`, `first_name`, `last_name`, `phone_numbers[].phone_number`
- `OrganizationJSON` has: `id`, `name`
- `OrganizationMembershipJSON` has: `public_user_data.user_id`, `public_user_data.first_name`, `public_user_data.last_name`, `organization.id`, `role`

**Drizzle upsert pattern:**
```typescript
import { db, companies, users } from '@kova/db'
import { eq } from 'drizzle-orm'

// upsert company:
await db.insert(companies)
  .values({ id: orgId, name: orgName, plan: 'pilot', state: 'CA' })
  .onConflictDoUpdate({ target: companies.id, set: { name: orgName } })

// upsert user:
await db.insert(users)
  .values({ companyId, clerkUserId, role, name, phone })
  .onConflictDoUpdate({ target: users.clerkUserId, set: { companyId, role, name } })
```

Note: `companies.id` is defined as `uuid().defaultRandom()` in the schema. For the webhook, we want to use Clerk's org ID as the record ID. Since Clerk org IDs are strings like `org_xxx`, not UUIDs, we need to store the Clerk org ID separately. The schema has `companies.id` as the primary key UUID — there's no `clerk_org_id` column. We need to either: (a) add a `clerk_org_id` column to companies, or (b) use a separate lookup. Option A is cleaner. Add `clerkOrgId: text('clerk_org_id').unique()` to the companies table and regenerate the migration.

- [ ] **Step 1: Add `clerk_org_id` to companies table in schema**

In `packages/db/src/schema.ts`, add to the companies table:
```typescript
clerkOrgId: text('clerk_org_id').unique(),
```

- [ ] **Step 2: Regenerate migration**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/db exec drizzle-kit generate
```

This creates a new migration file `0001_*.sql`.

- [ ] **Step 3: Rewrite webhook handler**

Full implementation:

```typescript
import { NextResponse } from 'next/server'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import type { WebhookEvent } from '@clerk/nextjs/webhooks'
import { db, companies, users } from '@kova/db'
import type { UserRole } from '@kova/shared'

function clerkRoleToKovaRole(clerkRole: string): UserRole {
  if (clerkRole === 'org:admin') return 'owner'
  if (clerkRole === 'org:manager') return 'manager'
  return 'technician'
}

export async function POST(request: Request) {
  let evt: WebhookEvent
  try {
    evt = await verifyWebhook(request)
  } catch (err) {
    console.error('Clerk webhook verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (evt.type) {
      case 'user.created': {
        // Log only — user has no org yet; membership event handles upsert
        console.log(`[webhook] user.created: ${evt.data.id}`)
        break
      }

      case 'organization.created': {
        const org = evt.data
        await db.insert(companies)
          .values({
            clerkOrgId: org.id,
            name: org.name,
            plan: 'pilot',
            state: 'CA',
          })
          .onConflictDoUpdate({
            target: companies.clerkOrgId,
            set: { name: org.name },
          })
        console.log(`[webhook] organization.created: ${org.id} (${org.name})`)
        break
      }

      case 'organizationMembership.created': {
        const membership = evt.data
        const clerkUserId = membership.public_user_data.user_id
        const clerkOrgId = membership.organization.id
        const firstName = membership.public_user_data.first_name ?? ''
        const lastName = membership.public_user_data.last_name ?? ''
        const name = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown'
        const role = clerkRoleToKovaRole(membership.role)

        // Look up the company by clerk org ID
        const company = await db.query.companies.findFirst({
          where: (c, { eq }) => eq(c.clerkOrgId, clerkOrgId),
        })

        if (!company) {
          console.error(`[webhook] organizationMembership.created: company not found for org ${clerkOrgId}`)
          // Return 200 to prevent Clerk retrying — the org.created webhook may arrive out of order
          return NextResponse.json({ received: true, warning: 'company not found' })
        }

        await db.insert(users)
          .values({
            companyId: company.id,
            clerkUserId,
            role,
            name,
            languagePref: 'en',
          })
          .onConflictDoUpdate({
            target: users.clerkUserId,
            set: { companyId: company.id, role, name },
          })
        console.log(`[webhook] organizationMembership.created: ${clerkUserId} → ${role}`)
        break
      }

      default:
        // Unhandled event type — acknowledge without error
        break
    }
  } catch (err) {
    console.error('[webhook] handler error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
```

- [ ] **Step 4: Typecheck**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/web typecheck && pnpm --filter @kova/db typecheck
```

Expected: clean

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema.ts packages/db/src/migrations/ apps/web/src/app/api/webhooks/clerk/route.ts
git commit -m "feat: implement Clerk webhook handler (org+user sync) + add clerk_org_id to companies"
```

---

### Task 5: Create Auth Guard Utility

**Files:**
- Create: `apps/web/src/lib/auth.ts`

**Context:** API routes need to check Clerk session context and enforce role requirements. This utility wraps `auth()` from `@clerk/nextjs/server` and maps Clerk org roles to Kova `UserRole`.

- [ ] **Step 1: Write `apps/web/src/lib/auth.ts`**

```typescript
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { UserRole } from '@kova/shared'

// Maps Clerk organization role slugs to Kova roles
const CLERK_ROLE_MAP: Record<string, UserRole> = {
  'org:admin': 'owner',
  'org:manager': 'manager',
  'org:member': 'technician',
}

export interface AuthContext {
  clerkUserId: string   // Clerk user ID (e.g. "user_xxx")
  orgId: string         // Clerk org ID (e.g. "org_xxx")
  role: UserRole        // Mapped Kova role
}

/**
 * Extract and map auth context from current Clerk session.
 * Throws if user is not authenticated or not in an organization.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const { userId, orgId, orgRole } = await auth()

  if (!userId || !orgId || !orgRole) {
    throw new Error('Unauthorized: no active session or organization')
  }

  const role = CLERK_ROLE_MAP[orgRole] ?? 'technician'

  return { clerkUserId: userId, orgId, role }
}

/**
 * Guard an API route to require specific Kova role(s).
 * Returns AuthContext if authorized, or a NextResponse error if not.
 *
 * Usage:
 *   const result = await requireRole(['owner', 'manager'])
 *   if (result instanceof NextResponse) return result
 *   const { clerkUserId, orgId, role } = result
 */
export async function requireRole(
  allowedRoles: UserRole[],
): Promise<AuthContext | NextResponse> {
  try {
    const ctx = await getAuthContext()
    if (!allowedRoles.includes(ctx.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return ctx
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/web typecheck
```

Expected: clean

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/auth.ts
git commit -m "feat: add auth guard utility with Clerk org role → Kova role mapping"
```

---

### Task 6: Implement Mobile Phone OTP Sign-In

**Files:**
- Modify: `apps/mobile/src/screens/SignInScreen.tsx`

**Context:** Current SignInScreen is a disabled placeholder. Needs real two-phase OTP flow using `useSignIn` from `@clerk/clerk-expo`. If Clerk is not configured (no `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`), show the placeholder and don't call hooks.

**Two-phase UX:**
- Phase 1: Phone number input → "Send Code" button → `signIn.create({ identifier: phoneNumber, strategy: 'phone_code' })` → switches to Phase 2
- Phase 2: 6-digit code input + "Verify" button → `signIn.attemptFirstFactor({ strategy: 'phone_code', code })` → on success, `setActive({ session: createdSessionId })` → navigation updates automatically via `useAuth().isSignedIn`

**Phone number format:** Accept E.164 ("+15551234567") — show hint text. The app is US-focused for the Drain Right pilot.

**Error handling:** Display Clerk API error messages inline below the form. Loading states: disable button + show "Sending..." / "Verifying..." text.

**When Clerk not configured:** Check `process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — if falsy, render the original placeholder (disabled input + "Send Code (Config Required)" button) without calling `useSignIn`.

- [ ] **Step 1: Rewrite SignInScreen**

```typescript
import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useSignIn } from '@clerk/clerk-expo'
import { useAuth } from '@clerk/clerk-expo'

// ---- Placeholder shown when Clerk is not configured ----
function SignInPlaceholder() {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.logo}>Kova</Text>
        <Text style={styles.tagline}>Revenue Intelligence</Text>
        <View style={styles.form}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+1 (555) 000-0000"
            keyboardType="phone-pad"
            editable={false}
          />
          <TouchableOpacity style={[styles.button, styles.buttonDisabled]} disabled>
            <Text style={styles.buttonText}>Sign In (Clerk not configured)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

// ---- Real OTP sign-in ----
function OTPSignIn() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const [phase, setPhase] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSendCode() {
    if (!isLoaded || !signIn) return
    setLoading(true)
    setError(null)
    try {
      await signIn.create({ identifier: phone })
      setPhase('code')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send code'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode() {
    if (!isLoaded || !signIn) return
    setLoading(true)
    setError(null)
    try {
      const result = await signIn.attemptFirstFactor({ strategy: 'phone_code', code })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
      } else {
        setError('Verification incomplete. Please try again.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid code'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.logo}>Kova</Text>
        <Text style={styles.tagline}>Revenue Intelligence</Text>

        <View style={styles.form}>
          {phase === 'phone' ? (
            <>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="+15551234567"
                keyboardType="phone-pad"
                autoComplete="tel"
                value={phone}
                onChangeText={setPhone}
                editable={!loading}
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendCode}
                disabled={loading || !phone}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Send Code</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>Enter 6-digit code</Text>
              <Text style={styles.hint}>Sent to {phone}</Text>
              <TextInput
                style={styles.input}
                placeholder="000000"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                value={code}
                onChangeText={setCode}
                maxLength={6}
                editable={!loading}
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleVerifyCode}
                disabled={loading || code.length < 6}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Verify</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setPhase('phone'); setCode(''); setError(null) }}>
                <Text style={styles.back}>← Back</Text>
              </TouchableOpacity>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </View>
    </View>
  )
}

const IS_CLERK_CONFIGURED = !!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

export default function SignInScreen() {
  if (!IS_CLERK_CONFIGURED) return <SignInPlaceholder />
  return <OTPSignIn />
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  logo: { fontSize: 40, fontWeight: '800', color: '#2563EB', marginBottom: 4 },
  tagline: { fontSize: 14, color: '#6B7280', marginBottom: 48 },
  form: { width: '100%', gap: 12 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151' },
  hint: { fontSize: 12, color: '#6B7280', marginTop: -4 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#93C5FD' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  back: { color: '#2563EB', textAlign: 'center', marginTop: 8 },
  error: { color: '#DC2626', fontSize: 14, textAlign: 'center' },
})
```

- [ ] **Step 2: Typecheck**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/mobile typecheck
```

Expected: clean

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/SignInScreen.tsx
git commit -m "feat: implement mobile phone OTP sign-in (useSignIn + phone_code strategy)"
```

---

### Task 7: Update Profile Screen

**Files:**
- Modify: `apps/mobile/src/screens/ProfileScreen.tsx`

**Context:** Current ProfileScreen is a placeholder. Add user info from `useUser()` and `useOrganization()`, and a sign-out button. When Clerk is not configured, show a non-crashing placeholder.

- [ ] **Step 1: Rewrite ProfileScreen**

```typescript
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useUser, useOrganization, useAuth } from '@clerk/clerk-expo'

function ProfilePlaceholder() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.placeholder}>Sign-in not configured.</Text>
    </View>
  )
}

function ProfileContent() {
  const { user } = useUser()
  const { organization } = useOrganization()
  const { signOut } = useAuth()

  const name = user?.fullName ?? user?.firstName ?? 'Unknown'
  const phone = user?.primaryPhoneNumber?.phoneNumber ?? '—'
  const orgName = organization?.name ?? '—'

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Row label="Name" value={name} />
        <Row label="Phone" value={phone} />
        <Row label="Company" value={orgName} />
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={() => signOut()}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

const IS_CLERK_CONFIGURED = !!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

export default function ProfileScreen() {
  if (!IS_CLERK_CONFIGURED) return <ProfilePlaceholder />
  return <ProfileContent />
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 24, marginTop: 16 },
  placeholder: { color: '#6B7280' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLabel: { fontSize: 14, color: '#6B7280' },
  rowValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  signOutButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: '#DC2626', fontSize: 16, fontWeight: '600' },
})
```

- [ ] **Step 2: Typecheck**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/mobile typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/ProfileScreen.tsx
git commit -m "feat: profile screen with user info and sign-out"
```

---

### Task 8: Update Web Dashboard

**Files:**
- Modify: `apps/web/src/app/dashboard/page.tsx`

**Context:** Current dashboard has placeholder text. Show real user/org context from Clerk. Still a scaffold (full dashboard Week 8), but confirms auth is wired.

- [ ] **Step 1: Update DashboardPage**

```typescript
import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const name = user?.firstName ?? 'there'

  const roleLabel =
    orgRole === 'org:admin' ? 'Owner'
    : orgRole === 'org:manager' ? 'Manager'
    : 'Technician'

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Welcome back, {name}</h1>
      <p className="text-gray-500 mb-6">Role: {roleLabel}</p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        Dashboard coming in Week 8. Auth is wired — you are signed in.
      </div>
      {!orgId && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          No organization selected. Please join or create an organization.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/dashboard/page.tsx
git commit -m "feat: dashboard shows real auth context (name, role)"
```

---

### Task 9: Add Migration Drift Check to CI

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add migration drift check after typecheck step**

Add after the `Typecheck` step:
```yaml
      - name: Check migration drift
        run: |
          pnpm --filter @kova/db exec drizzle-kit generate
          git diff --exit-code packages/db/src/migrations/
```

This catches cases where schema was changed but `drizzle-kit generate` wasn't run (the generated files should already be committed; if they differ, CI fails).

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add migration drift check — fail if schema changes aren't regenerated"
```

---

### Task 10: Full Verification + Push

- [ ] **Step 1: Run full turbo typecheck**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && turbo typecheck
```
Expected: 5/5 packages clean

- [ ] **Step 2: Run pnpm install with frozen lockfile + ignore-scripts (CI simulation)**

```bash
pnpm install --frozen-lockfile --ignore-scripts
```
Expected: exit 0

- [ ] **Step 3: Push to origin/main**

```bash
git push origin main
```
