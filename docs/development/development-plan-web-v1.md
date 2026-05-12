# Kova — Web Dashboard Development Plan v1

*Document scope: Next.js web dashboard, Phase 1 only (Weeks 1–12). Covers the owner/manager-facing application — onboarding, dashboard home, team performance, call review, pricebook management, billing, activation sprint, and design partner instrumentation.*

*Document version: v1*
*Status: Living document — update prior to each sprint kickoff*
*Date: May 2026*
*Parent document: `docs/development/development-plan-v2.md` — all unresolved questions defer to v2*
*Product requirements: `docs/product/product-brief-v1.md`*
*Legal/compliance: `docs/product/product-strategy-v1.md`*

> **Relationship to dev-plan-v2:** This document expands the web-specific sections of dev-plan-v2 into a standalone reference. Where the two documents conflict, dev-plan-v2 wins. Where this document adds detail not present in dev-plan-v2, this document is authoritative for web. Do not make web architecture decisions from dev-plan-v2 alone — always cross-reference here.

---

## 0. Summary

The web dashboard is the owner's and manager's primary product surface. Technicians live in the mobile app; owners and managers live here. The web dashboard must do three things well:

1. **Show the number** — estimated opportunity identified this week, priced at the owner's actual rates, front and center on every login.
2. **Make the number credible** — call review queue, audio playback, transcript, and score breakdown so the owner can verify any flagged opportunity in under two minutes.
3. **Keep the team recording** — compliance dashboard, activation triggers, and pricebook health indicators so the owner knows when the system is working and when it isn't.

Everything else in the web dashboard is secondary to these three. If the owner can't see the number, verify it, and act on it, nothing else matters.

**Phase 1 success condition (web):**
> Owner logs in on Day 30 and sees $20K–$50K in estimated opportunity identified for Drain Right, priced at their pricebook rates, with enough call evidence to trust it.

**Web onboarding target:** Account created → first scored call delivered in < 35 minutes.

---

## 1. Constraints

These are non-negotiable. Every architecture decision is made inside these boundaries.

### 1.1 Pilot Constraints

| Constraint | Detail |
|---|---|
| **Owner/manager audience only** | Technicians do not use the web dashboard. The web app is built for Drain Right's owner and any managers they designate. |
| **Single company, Phase 1** | Drain Right is the only company at launch. Multi-tenant support must be architecturally correct from Day 1, but no multi-company UI is needed. |
| **Owner is the decision-maker** | Every UX decision should be optimized for an owner who logs in Monday morning, looks at the number, and decides what to do about it. They are not a data analyst. |
| **Pricebook is required for the number to be real** | Without owner-configured pricebook prices, opportunity values default to industry averages and are explicitly tagged as such. Pricebook setup is a first-week priority. |
| **California two-party consent** | Compliance dashboard surfaces any recording that lacks a consent timestamp. Owners need visibility into this — it is both a legal and product integrity concern. |

### 1.2 Engineering Constraints

| Constraint | Detail |
|---|---|
| **Solo founder** | No dedicated frontend engineer. Architecture must be maintainable alone. Use shadcn/ui components rather than building from scratch. Prefer Server Components where possible — less client-side state to manage. |
| **Vercel deployment** | Zero-config deployment for Next.js. All long-running work runs on Railway — Vercel handles only lightweight API routes (< 10s execution). |
| **Shared types with backend** | All API response types come from `packages/shared`. Never define a type in `apps/web` that also exists elsewhere in the monorepo. |
| **TypeScript everywhere** | No JavaScript files. `pnpm typecheck` must pass before any merge. |
| **No App Router client components by default** | Default to React Server Components. Promote to `'use client'` only when interactivity is needed (charts, forms, audio player). Document the reason at the top of any client component file. |

### 1.3 What the Web Dashboard Does NOT Do in Phase 1

| Excluded | Reason | When |
|---|---|---|
| Full-text call search | Requires search index; basic date + tech filter sufficient for pilot | Phase 2 |
| Clip sharing (expiring links) | Email is sufficient for Phase 1 coaching workflows | Phase 2 |
| Kova ROI report | Requires 30+ days of baseline data | Phase 2 |
| Multi-location support | Drain Right is single-location | Phase 3 |
| Custom scoring weights | Team tier feature; not needed at pilot scale | Phase 3 |
| In-app invoice matching | Requires FSM invoice data; no FSM in Phase 1 | Phase 2 |
| Public API access | Not needed until Phase 3+ customers | Phase 3 |
| ServiceTitan dashboard integration | Manual job tagging sufficient to prove the number | Phase 2 |
| Spanish dashboard UI | English only for Phase 1 | Phase 2+ |
| PE portfolio dashboard | Multi-company rollup view; not needed at pilot scale | Phase 3 |
| SOC 2 compliance portal | Process begins Month 9–12 | Phase 2+ |

---

## 2. Tech Stack

### 2.1 Framework

**Next.js 15 (App Router) deployed on Vercel — confirmed.**

The framework decision is settled in dev-plan-v2 §3.2. Summary:

- App Router with React Server Components keeps data fetching on the server — fewer round trips, less client-side state.
- SSR means owners see real data on first paint, not a skeleton.
- Vercel deployment is zero-config for Next.js — no Docker, no reverse proxy.
- TypeScript throughout; shared types from `packages/shared`.

### 2.2 Library Table

| Library | Version Target | Purpose |
|---|---|---|
| `@clerk/nextjs` | latest stable | Auth — owner/manager web sessions, Organization middleware |
| `drizzle-orm` | ≥ 0.30 | Type-safe database queries against Neon |
| `@neondatabase/serverless` | latest | HTTP-based Postgres connection for Vercel serverless functions |
| `@tanstack/react-query` | ≥ 5.x | Client-side data fetching and cache (used in client components only) |
| `zod` | ≥ 3.x | Shared schema validation (imported from `packages/shared`) |
| `recharts` | ≥ 2.x | Dashboard charts — trend lines, bar charts, score distributions |
| `tailwindcss` | ≥ 3.x | Styling |
| `shadcn/ui` | component-by-component install | Component library (Radix-based, fully composable) |
| `react-email` | latest | Email template components (weekly digest, activation emails) |
| `resend` | latest | Email sending SDK |
| `stripe` | ≥ 14.x | Stripe Billing — checkout sessions, portal, webhook handler |
| `@aws-sdk/client-s3` | v3 | S3 presigned URL generation (server-side only) |
| `ioredis` | ≥ 5.x | BullMQ job enqueue from Vercel API routes |
| `bullmq` | ≥ 5.x | Job queue client (enqueue only — processing runs on Railway) |

### 2.3 Component Library — shadcn/ui

shadcn/ui components are installed individually into `apps/web/src/components/ui/`. They are not a package dependency — they are source files that are modified directly.

**Phase 1 component set (install on first use):**

```
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
npx shadcn-ui@latest add input
npx shadcn-ui@latest add select
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add tooltip
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add sheet
```

Do not install components you haven't needed yet. Add on first use.

### 2.4 Data Fetching Strategy

The web app uses two data fetching modes. The decision between them is made per-page, not per-feature:

| Mode | When to Use | Implementation |
|---|---|---|
| **React Server Component (RSC)** | Data needed on first paint; no real-time updates; no user interaction drives the fetch | `async` Server Component calls Drizzle directly |
| **React Query (client)** | Data that refreshes automatically; data driven by user interaction (filters, search); optimistic updates | `'use client'` component + `useQuery` / `useMutation` |

**Rule:** Default to RSC. Promote to React Query only when there is a concrete reason. The majority of the dashboard (home, team table, call library) is RSC. The audio player, waveform, and any polling component is client.

---

## 3. Architecture

### 3.1 Folder Structure

```
apps/web/
├── src/
│   ├── app/                          ← Next.js App Router
│   │   ├── layout.tsx                ← Root layout (ClerkProvider, fonts)
│   │   ├── page.tsx                  ← Marketing/landing (or redirect to /dashboard)
│   │   ├── sign-in/[[...sign-in]]/
│   │   │   └── page.tsx              ← Clerk SignIn component
│   │   ├── sign-up/[[...sign-up]]/
│   │   │   └── page.tsx              ← Clerk SignUp component
│   │   ├── onboarding/
│   │   │   ├── layout.tsx            ← Onboarding shell (no sidebar)
│   │   │   ├── team/page.tsx         ← Step 2: Add techs
│   │   │   └── pricebook/page.tsx    ← Step 3: Pricebook setup
│   │   ├── dashboard/
│   │   │   ├── layout.tsx            ← Dashboard shell (sidebar + topbar)
│   │   │   ├── page.tsx              ← Home: weekly opportunity, team summary
│   │   │   ├── team/
│   │   │   │   └── page.tsx          ← Team performance table
│   │   │   ├── calls/
│   │   │   │   ├── page.tsx          ← Call library (list + filters)
│   │   │   │   └── [callId]/
│   │   │   │       └── page.tsx      ← Call detail (player, transcript, score)
│   │   │   ├── compliance/
│   │   │   │   └── page.tsx          ← Recording compliance dashboard
│   │   │   ├── pricebook/
│   │   │   │   └── page.tsx          ← Pricebook management
│   │   │   ├── settings/
│   │   │   │   └── page.tsx          ← Admin settings (company, consent, thresholds)
│   │   │   └── billing/
│   │   │       └── page.tsx          ← Subscription, portal link, seat management
│   │   ├── admin/
│   │   │   ├── layout.tsx            ← Internal admin shell (founder-only)
│   │   │   ├── page.tsx              ← Activation health overview
│   │   │   └── case-study/[id]/
│   │   │       └── page.tsx          ← Design partner case study export view
│   │   └── api/
│   │       ├── webhooks/
│   │       │   ├── clerk/route.ts
│   │       │   └── stripe/route.ts
│   │       ├── calls/
│   │       │   ├── presign/route.ts
│   │       │   ├── upload-complete/route.ts
│   │       │   ├── consent/route.ts
│   │       │   ├── decline/route.ts
│   │       │   └── [callId]/
│   │       │       ├── route.ts
│   │       │       ├── audio/route.ts
│   │       │       └── tag/route.ts
│   │       ├── opportunities/
│   │       │   └── [id]/
│   │       │       └── dispute/route.ts
│   │       ├── pricebook/
│   │       │   ├── route.ts
│   │       │   ├── [id]/route.ts
│   │       │   └── import/route.ts
│   │       ├── dashboard/
│   │       │   ├── summary/route.ts
│   │       │   ├── team/route.ts
│   │       │   └── compliance/route.ts
│   │       ├── billing/
│   │       │   ├── checkout/route.ts
│   │       │   └── portal/route.ts
│   │       ├── team/
│   │       │   ├── route.ts
│   │       │   ├── invite/route.ts
│   │       │   └── [userId]/route.ts
│   │       ├── notifications/
│   │       │   ├── register/route.ts
│   │       │   └── route.ts
│   │       ├── coaching/
│   │       │   ├── [callId]/notes/route.ts
│   │       │   └── [pointId]/review/route.ts
│   │       └── admin/
│   │           ├── health/route.ts
│   │           ├── activation/route.ts
│   │           └── case-study/[companyId]/route.ts
│   ├── components/
│   │   ├── ui/                       ← shadcn/ui installed components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   └── OnboardingShell.tsx
│   │   ├── dashboard/
│   │   │   ├── OpportunityHero.tsx   ← Large weekly opportunity number
│   │   │   ├── TrendChart.tsx        ← Recharts wrapper (client)
│   │   │   ├── TeamTable.tsx
│   │   │   ├── ReviewQueue.tsx
│   │   │   ├── ComplianceWidget.tsx
│   │   │   └── PricebookCompletionBanner.tsx
│   │   ├── calls/
│   │   │   ├── CallRow.tsx
│   │   │   ├── AudioPlayer.tsx       ← Waveform player (client)
│   │   │   ├── TranscriptPanel.tsx   ← Synchronized transcript (client)
│   │   │   ├── ScoreBreakdown.tsx
│   │   │   ├── OpportunityMarkers.tsx
│   │   │   └── CoachingNoteForm.tsx  ← (client, form)
│   │   ├── pricebook/
│   │   │   ├── PricebookTable.tsx
│   │   │   ├── PricebookItemForm.tsx ← (client, form)
│   │   │   └── CSVImport.tsx         ← (client, file upload)
│   │   ├── onboarding/
│   │   │   ├── TeamSetupForm.tsx     ← (client, form)
│   │   │   └── PricebookSetupChoice.tsx
│   │   └── billing/
│   │       ├── PlanCard.tsx
│   │       └── SeatManager.tsx       ← (client)
│   ├── lib/
│   │   ├── db.ts                     ← Drizzle client (Neon serverless)
│   │   ├── auth.ts                   ← Clerk server-side helpers
│   │   ├── s3.ts                     ← S3 presign helpers
│   │   ├── stripe.ts                 ← Stripe client instance
│   │   ├── queue.ts                  ← BullMQ enqueue helper (ioredis)
│   │   ├── resend.ts                 ← Resend client instance
│   │   └── constants.ts              ← Shared constants (thresholds, defaults)
│   └── middleware.ts                 ← Clerk auth middleware
├── emails/
│   ├── WeeklyDigest.tsx              ← React Email template
│   ├── ActivationDay1.tsx
│   ├── ActivationDay7.tsx
│   ├── ActivationDay14.tsx
│   ├── PreDunning.tsx
│   └── PaymentFailed.tsx
├── public/
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

### 3.2 App Router Page Structure

Every route under `/dashboard` requires a valid Clerk session with `role: owner | field_manager`. Every route under `/admin` additionally requires `role: owner` and a `ADMIN_SECRET` check (internal use only — not exposed in product UI).

```
/                         → redirect to /dashboard (if authed) or /sign-in
/sign-in                  → Clerk SignIn
/sign-up                  → Clerk SignUp (owner creates account)
/onboarding/team          → Step 2 of onboarding (add techs)
/onboarding/pricebook     → Step 3 of onboarding (configure prices)
/dashboard                → Home: weekly opportunity, review queue, team summary
/dashboard/team           → Per-tech performance table + week-over-week
/dashboard/calls          → Call library (list view, filters)
/dashboard/calls/:callId  → Call detail (player, transcript, score, coaching)
/dashboard/compliance     → Recording compliance rates + gaps
/dashboard/pricebook      → Pricebook management (CRUD, CSV import)
/dashboard/settings       → Company settings, consent language, alert thresholds
/dashboard/billing        → Subscription plan, seat count, portal link
/admin                    → Internal activation health overview (founder only)
/admin/case-study/:id     → Design partner case study data export
```

### 3.3 Server vs. Client Component Boundaries

The most important architectural decision per page. Default to server; promote to client only for the reasons listed.

| Component | Type | Reason |
|---|---|---|
| Dashboard layout (sidebar, topbar) | Server | Static structure; reads auth from Clerk server-side |
| `OpportunityHero` | Server | Read from DB on first paint; no interaction |
| `TrendChart` | **Client** | Recharts requires browser DOM |
| `TeamTable` | Server | Server-rendered table; no client interaction in Phase 1 |
| `ReviewQueue` | Server | Static list; mark-as-reviewed is a form POST (Server Action) |
| `CallRow` | Server | Static row |
| `AudioPlayer` | **Client** | Web Audio API, waveform rendering, seek interaction |
| `TranscriptPanel` | **Client** | Synchronized scroll + seek on segment tap |
| `ScoreBreakdown` | Server | Static score display |
| `CoachingNoteForm` | **Client** | Form with optimistic update |
| `PricebookTable` | Server | Table render; edit actions are Server Actions |
| `PricebookItemForm` | **Client** | Controlled form fields, pricing model switching |
| `CSVImport` | **Client** | File input, preview, confirm flow |
| `TeamSetupForm` | **Client** | Live invite management during onboarding |
| `SeatManager` | **Client** | Add/remove seats with optimistic count |

### 3.4 Clerk Middleware Configuration

```typescript
// src/middleware.ts

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)',    // Clerk + Stripe webhooks must be unauthenticated
])

const isAdminRoute = createRouteMatcher(['/admin(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return

  const { userId, orgId, orgRole } = await auth()

  // Unauthenticated: redirect to sign-in
  if (!userId) {
    return auth.redirectToSignIn()
  }

  // No org attached yet: redirect to onboarding
  if (!orgId && !req.nextUrl.pathname.startsWith('/onboarding')) {
    return Response.redirect(new URL('/onboarding/team', req.url))
  }

  // Admin routes: owner role required
  if (isAdminRoute(req) && orgRole !== 'org:owner') {
    return Response.redirect(new URL('/dashboard', req.url))
  }
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
```

**Role mapping:**
- Clerk Organization roles → Kova roles:
  - `org:owner` → `owner`
  - `org:admin` → `field_manager`
  - `org:member` → `technician` (mobile-only; cannot access web dashboard)

### 3.5 Drizzle Client Setup

```typescript
// src/lib/db.ts
// Used in Server Components and API routes only — never imported in 'use client' files

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from '@kova/db/schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

**Rule:** `db` is imported only in Server Components, API route handlers, and server actions. It is never imported in `'use client'` components. If client code needs data, it fetches via an API route.

### 3.6 Error Handling Strategy

- **API routes:** All API routes return consistent error shapes:
  ```typescript
  interface APIError { error: string; code: string; status: number }
  ```
- **Server Components:** Wrap data fetches in try/catch; render error UI inline (not a global error boundary). Use Next.js `error.tsx` as a last resort.
- **Client Components:** React Query `isError` / `error` states are handled per component. Display user-appropriate messages — never raw error objects.
- **Unhandled errors:** Next.js root `error.tsx` catches unhandled render errors. Shows "Something went wrong — refresh the page."

---

## 4. Page Inventory

Complete specification of every Phase 1 page: purpose, data sources, key components, and edge cases.

### 4.1 Sign-In / Sign-Up

**`/sign-in`** and **`/sign-up`**
- Clerk's hosted components embedded in a centered card layout
- Sign-up collects: email (or Google SSO), company name, state (used for consent language defaults)
- On sign-up: Clerk webhook fires `organization.created` → Neon `companies` record created, `activation_events` Day 1 trigger fires
- On sign-in: redirect to `/dashboard` if org exists; redirect to `/onboarding/team` if no org

### 4.2 Onboarding — Team Setup (`/onboarding/team`)

**Purpose:** Owner adds their technicians so Kova can send SMS invites and link calls to specific techs.

**Layout:** Full-page, no sidebar (onboarding shell). Progress indicator: Step 1 of 2.

**Form fields:**
- Tech name (text)
- Phone number (formatted input, US)
- "Add Another Tech" link adds a new row
- "Send Invites" button

**On submit:**
1. `POST /api/team/invite` for each tech
2. Kova sends SMS: *"[Owner Name] invited you to Kova — download the app and start recording your calls. [App Store link]"*
3. Redirect to `/onboarding/pricebook`

**Edge cases:**
- Duplicate phone number: inline error "This number is already on your team"
- Invalid phone format: inline validation before submit
- Owner can skip: "Skip for now — I'll add my team later" link. Skip navigates directly to `/onboarding/pricebook`. Techs can be added later from `/dashboard/settings`.

### 4.3 Onboarding — Pricebook Setup (`/onboarding/pricebook`)

**Purpose:** Owner configures their prices so opportunity values reflect their actual revenue, not industry averages.

**Layout:** Full-page, no sidebar. Progress indicator: Step 2 of 2. "Just a few minutes — your prices make the numbers real."

**Three options presented as cards:**
```
┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────────┐
│   Start with defaults        │  │   Import CSV                 │  │   Configure later            │
│   (California drain +        │  │   Upload your service        │  │   We'll use industry         │
│    plumbing defaults)        │  │   price list                 │  │   averages until you're      │
│                              │  │                              │  │   ready                      │
│   Recommended ✓              │  │                              │  │                              │
└──────────────────────────────┘  └──────────────────────────────┘  └──────────────────────────────┘
```

- **Start with defaults:** Pre-loads California drain + plumbing pricebook (from dev-plan-v2 §5.5). Redirects to `/dashboard` with "Prices loaded — you can update them anytime in Settings."
- **Import CSV:** Opens CSV import flow (same component as `/dashboard/pricebook`). Template download available. After confirm → `/dashboard`.
- **Configure later:** Redirects to `/dashboard`. `PricebookCompletionBanner` will be shown until ≥ 70% of items are owner-configured.

**On completion:** Redirect to `/dashboard`. Empty state CTA: "Ask a tech to record their first call."

### 4.4 Dashboard Home (`/dashboard`)

**Purpose:** The owner's Monday morning view. Show the number, show the context, show what needs attention.

**Data fetched (server-side, Drizzle):**
- Weekly opportunity total (sum of `opportunities.value_high` where `disputed_at IS NULL` and `created_at > 7 days ago`)
- Week-over-week change (compare to prior 7 days)
- Top 3 opportunity types this week (by dollar value)
- Call review queue: calls where `opportunity_total_high > 1500 OR overall_score < 50 OR (last_reviewed_at IS NULL AND created_at > 5 days ago)`, limit 5
- Recording compliance rate this week
- Pricebook completion percentage

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  PAYMENT FAILED BANNER (shown if company.payment_failed = true)      │
│  "Payment failed — update your payment method to keep recording."   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  PRICEBOOK COMPLETION BANNER (shown if completion < 70%)             │
│  "Your pricebook uses industry defaults — update your prices for    │
│   accurate opportunity values.  [Update Pricebook →]"               │
└─────────────────────────────────────────────────────────────────────┘

Estimated Opportunity This Week
$34,750 – $41,200                        ↑ 23% vs last week

Top this week:
  Camera Inspection    $18,500
  Maintenance Plan     $12,200
  [Drain Snaking]      $4,050

┌─────────────────────────────────┐  ┌──────────────────────────────────┐
│  CALL REVIEW QUEUE              │  │  TEAM COMPLIANCE THIS WEEK       │
│  5 calls need attention         │  │  12 / 16 techs recorded          │
│  ┌────────────────────────┐     │  │  ████████████░░░░  75%           │
│  │ M. Reyes · $2,100 opp  │     │  │  4 techs haven't recorded       │
│  │ J. Santos · Score 42   │     │  │  [View Compliance →]             │
│  │ ...                    │     │  └──────────────────────────────────┘
│  └────────────────────────┘     │
│  [View All Calls →]             │
└─────────────────────────────────┘
```

**Opportunity footnote** (always visible below the number):
> *Estimated opportunity reflects your pricebook prices. Actual revenue depends on customer need, timing, and context — not every flagged opportunity would have been accepted.*

**Empty state (no calls yet):**
```
No calls recorded yet.
Ask your team to record their first call — results appear here within 5 minutes.
[View Team Setup →]
```

### 4.5 Team Performance (`/dashboard/team`)

**Purpose:** Per-tech view of performance over the past 7 days.

**Data fetched (server-side):**
- Per-tech: avg score (7-day), avg opportunity/call (7-day), calls recorded this week, recording rate this week, score trend (arrow + % vs prior 7 days)

**Layout:** Sortable table (client-side sort, no re-fetch).

```
┌──────────────────┬──────────────┬────────────────┬───────────┬─────────────┬────────┐
│  Technician      │  Avg Score   │  Opp / Call    │  Calls    │  Rec. Rate  │  Trend │
├──────────────────┼──────────────┼────────────────┼───────────┼─────────────┼────────┤
│  M. Reyes        │  78 / 100    │  $1,840        │  14       │  88%        │  ↑ 12% │
│  J. Santos       │  61 / 100    │  $920          │  10       │  63%        │  ↓ 8%  │
│  ...             │              │                │           │             │        │
└──────────────────┴──────────────┴────────────────┴───────────┴─────────────┴────────┘
```

- Clicking a tech row navigates to `/dashboard/calls?techId={id}` — the call library filtered to that tech.
- Score color coding: green ≥ 70, yellow 50–69, red < 50.
- Recording rate color coding: green ≥ 65%, yellow 40–64%, red < 40%.

**Week-over-week improvement panel:** Shown below the table — top 3 most-improved techs by score delta.

### 4.6 Call Library (`/dashboard/calls`)

**Purpose:** Browse and filter all calls across the team.

**Filters (client-side state, URL query params):**
- Tech (select — all techs or specific)
- Date range: this week / last week / this month / custom
- Job type: drain / plumbing / both / all
- Status: scored / processing / failed / all

**List view — per row:**
```
M. Reyes  ·  Tue May 5  ·  Drain  ·  32 min  ·  Score: 78  ·  $1,400–$1,700  ·  EN  ·  ◉ High quality
```

- Clicking a row → `/dashboard/calls/:callId`
- Audio quality indicator: green circle (high), yellow (medium), red (low), gray (failed)
- Language indicator: `EN`, `ES`, `EN/ES` (bilingual)
- Processing calls: spinner, "Processing..." label — no score shown
- Failed calls: red badge "Processing failed" with tooltip explanation

**Pagination:** 20 calls per page. "Load more" button.

**Empty state:** "No calls match your filters." with a reset filters link.

### 4.7 Call Detail (`/dashboard/calls/:callId`)

**Purpose:** Full call review — owner can hear what the tech said, read the transcript, see the score, and add a coaching note. This is where the number becomes credible.

**Data fetched (server-side, parallelized):**
- `Call` record (status, duration, language, audio quality, job type, recorded_at)
- `Transcript` segments (JSONB array from Neon)
- `Score` with `dimensions` JSONB
- `Opportunities[]` with pricebook item names and dollar values
- `CoachingPoints[]` with `manager_note` and `reviewed_at`
- Presigned S3 audio URL (15-minute expiry, generated at render time)

**Layout — three panels:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  AUDIO PLAYER (client component)                                          │
│  ████████████████████████████████████░░░░░░░░░░░░░░░░░  18:24 / 31:12  │
│  ▶  Rewind 15s  Forward 15s  Speed 1×  [opportunity markers on waveform]│
└──────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────┐  ┌────────────────────────────────────────┐
│  TRANSCRIPT (client)        │  │  SCORE BREAKDOWN                       │
│  Speaker 1  0:00            │  │  Overall: 78 / 100                     │
│  "Hey there, I'm Marcus..."│  │  ┌────────────────────────────────┐     │
│  Speaker 2  0:12            │  │  │ Diagnosis Quality       2/3   │     │
│  "Thanks for coming out..." │  │  │ Camera Inspection       3/3   │     │
│  ...                        │  │  │ Maintenance Plan        1/3   │     │
│  [segments highlighted as  │  │  │ Customer Education      2/3   │     │
│   audio plays]              │  │  │ Close Quality           2/3   │     │
│  Tap segment → seek audio   │  │  │ Customer Experience     3/3   │     │
│                             │  │  └────────────────────────────────┘     │
│                             │  │                                          │
│                             │  │  OPPORTUNITIES                          │
│                             │  │  ● Camera Inspection   $425  [4:12]     │
│                             │  │    Trigger heard at 4:12                │
│                             │  │    Customer mentioned "third time"      │
│                             │  │    [Disputed: not relevant] (greyed)   │
│                             │  │  ● Maintenance Plan    $1,495 LTV       │
│                             │  │    Not mentioned at close               │
│                             │  │                                          │
│                             │  │  COACHING NOTES                         │
│                             │  │  [Add a coaching note for this call...] │
│                             │  │  ───────────────────────────────────── │
│                             │  │  M. Torres — May 6                      │
│                             │  │  "Great diagnosis — ask about the plan  │
│                             │  │   next time before packing up"          │
└────────────────────────────┘  └────────────────────────────────────────┘
```

**Audio player implementation (`AudioPlayer.tsx` — client component):**
- Waveform visualization: rendered once on load using `AnalyserNode` or a pre-computed amplitude array from the server
- Playback via `<audio>` element with presigned URL src
- Opportunity markers: colored pins at `opportunity.clip_start_sec` on the waveform timeline; clicking a pin seeks to that position
- Seek on transcript segment tap: dispatches a custom event that `AudioPlayer` listens to
- Speed control: 0.75×, 1×, 1.25×, 1.5×, 2×

**Synchronized transcript (`TranscriptPanel.tsx` — client component):**
- Segment auto-scrolls and highlights as audio plays (keyed to `start_sec` / `end_sec`)
- Tap any segment → audio seeks to `start_sec`
- Speaker labels: "Tech" (speaker 0) / "Customer" (speaker 1) — inferred from diarization
- Language badges: `[ES]` prefix on Spanish-detected segments

**Coaching note form:**
- Markdown-light textarea (bold, italic only)
- Submit via `POST /api/coaching/:callId/notes` — Server Action or client fetch
- Optimistic: note appears immediately, confirmed or rolled back on response

**Low-confidence overlay:** If `score.confidence_level = 'low'` → yellow banner: "This call scored with lower confidence — audio quality may have affected accuracy. Review the transcript before coaching."

### 4.8 Pricebook Management (`/dashboard/pricebook`)

**Purpose:** Owner configures their service prices. The accuracy of all opportunity values depends on this.

**Completion indicator (top of page):**
```
Pricebook completion: 6 / 11 services configured with your prices    ██████░░░░░  54%
Calls using industry defaults are tagged "(default)" — update your prices for accurate estimates.
```

**Table view — per row:**
```
┌──────────────────────────────┬──────────────┬───────────────┬─────────┬────────┐
│  Service Name                │  Type        │  Your Price   │  Active │        │
├──────────────────────────────┼──────────────┼───────────────┼─────────┼────────┤
│  Camera Inspection           │  Fixed       │  $425         │  ✓      │  Edit  │
│  Maintenance Plan (annual)   │  Recurring   │  $299/yr ×5   │  ✓      │  Edit  │
│  Hydrojetting                │  Range       │  $750–$950    │  ✓      │  Edit  │
│  Water Heater Replacement    │  Range       │  (default) ↑  │  ✓      │  Edit  │
└──────────────────────────────┴──────────────┴───────────────┴─────────┴────────┘

[+ Add Service]   [Import CSV]
```

Items using industry defaults are tagged with `(default)` badge to prompt owner action.

**Edit modal (`PricebookItemForm` — client component):**
Fields vary by pricing model selection:
- **Fixed:** Price (single number)
- **Range:** Price low, Price high
- **Recurring:** Annual price, Number of years → LTV = annual × years displayed live

**CSV import flow:**
1. "Download template" — pre-filled with current pricebook items
2. File input → preview table showing parsed rows with validation errors highlighted
3. "Confirm import" → `POST /api/pricebook/import` with multipart form data
4. Success: toast "12 items imported, 3 updated"

**Active/inactive toggle:** Inactive items are not used in scoring. Shown greyed in table.

### 4.9 Admin Settings (`/dashboard/settings`)

**Purpose:** Company-level configuration that affects scoring, compliance, and notifications.

**Sections:**

**Company Profile**
- Company name, primary trade (drain / plumbing / both), state
- State selection drives consent language defaults

**Consent Language**
- Two-party consent states: default to full-disclosure language
- Custom consent script override (owner can adjust wording; CA attorney must approve any changes)
- Preview: shows exactly what the tech sees in the ConsentModal

**Notification Thresholds**
- High opportunity alert threshold: default $1,500 (editable, minimum $500)
- "Tech hasn't recorded" alert: default 3 days (editable)
- Weekly digest: toggle on/off, day and time (default Monday 7am)

**Recording Target**
- Target calls per tech per week (default 5): used for compliance % calculation
- Owner sees "12/16 techs hit their target this week" on dashboard home

**Team Members** (read-only list; management via `/dashboard/settings/team`)
- Name, role, phone, status (active / invited / inactive)
- "Invite new tech" button → same flow as onboarding
- Remove tech: confirmation dialog → `DELETE /api/team/:userId` → Stripe seat removed

### 4.10 Compliance Dashboard (`/dashboard/compliance`)

**Purpose:** Show the owner exactly which jobs weren't recorded and why — so they can act on real compliance gaps rather than guessing.

**Data fetched (server-side):**
- Per-tech: calls recorded this week, dispatched jobs this week, recording rate, compliance gaps (dispatched but not recorded with no reason), decline rate (customer-initiated vs. tech-initiated)

**Layout:**

```
Recording Compliance — This Week
Overall: 78%  (62 / 80 dispatched jobs recorded)

┌──────────────────┬─────────────┬──────────────┬─────────────┬────────────────────┐
│  Technician      │  Dispatched │  Recorded    │  Rate       │  Compliance Gaps   │
├──────────────────┼─────────────┼──────────────┼─────────────┼────────────────────┤
│  M. Reyes        │  18         │  16          │  89% ●      │  0                 │
│  J. Santos       │  16         │  9           │  56% ●      │  4 (no reason)     │
│  A. Hernandez    │  15         │  15          │  100% ●     │  0                 │
│  ...             │             │              │             │                    │
└──────────────────┴─────────────┴──────────────┴─────────────┴────────────────────┘

● green ≥ 65%  ● yellow 40–64%  ● red < 40%

COMPLIANCE GAPS (jobs with no recording and no logged reason)
  J. Santos — Mon May 4 — Drain job — 9am     [Contact Tech]
  J. Santos — Tue May 5 — Plumbing job — 2pm  [Contact Tech]
  ...

NON-RECORDING REASONS LOGGED
  "Customer declined"  ×3
  "Technical issue"    ×2
  "Emergency"          ×1
```

**Dispatch-linked mode:** When the owner has uploaded the week's job schedule (`POST /api/jobs/schedule` — CSV or manual entry), Kova cross-references dispatched jobs against recorded calls. The "Dispatched" column becomes accurate; gaps are identified precisely.

**Without dispatch data:** Compliance is shown as "calls recorded" vs. "target" rather than vs. dispatched. The banner reads: "Upload your job schedule for accurate compliance tracking. [Upload Schedule →]"

### 4.11 Billing & Subscription (`/dashboard/billing`)

**Purpose:** Owner manages their Stripe subscription — plan, seats, payment method, invoices.

**Sections:**

**Current Plan**
```
Plan: Starter · 17 seats · Annual billing
$89/seat/year  ·  10 months remaining
Next invoice: $1,513 on April 2027
```

**Seat Management (`SeatManager` — client component)**
- Current seat count; active techs count
- "+ Add seats" / "- Remove seats" buttons
- Each change calls `PUT /api/billing/seats` → Stripe subscription item quantity updated
- Confirmation dialog before reducing seats (warns if active techs exceed new count)

**Payment method + billing portal**
- "Manage billing, update card, download invoices →" button → `POST /api/billing/portal` → redirect to Stripe Customer Portal
- Stripe Portal handles: card update, invoice download, plan change, cancel

**Payment failed banner (if applicable)**
```
⚠️ Payment failed on [date].
Update your payment method to avoid service interruption.
[Update Payment Method →]
```

**Trial state (if in trial)**
```
Free trial — 8 days remaining
Add your payment method to continue after the trial.
[Add Payment Method →]
```

### 4.12 Internal Admin (`/admin`)

**Purpose:** Founder-only view for monitoring activation health across all design partner companies. At pilot scale (1 company) this is a single-row table. Scales automatically as more companies are added.

**Access control:** Clerk `orgRole = 'org:owner'` AND request originates from founder's account (checked via `userId` hardcoded in `ADMIN_USER_ID` env var). Not linked from any product UI — accessed directly by URL.

**Activation health table:**
```
┌──────────────────┬──────────┬──────────┬────────────┬─────────────┬──────────┐
│  Company         │  Created │  Calls   │  Rec. Rate │  Last Call  │  Health  │
├──────────────────┼──────────┼──────────┼────────────┼─────────────┼──────────┤
│  Drain Right     │  Day 7   │  48      │  72%       │  Today      │  🟢      │
└──────────────────┴──────────┴──────────┴────────────┴─────────────┴──────────┘
```

Health scoring:
- 🟢 Green: ≥ 10 calls in first 7 days, recording rate ≥ 50%
- 🟡 Yellow: 5–9 calls in first 7 days, or recording rate 30–49%
- 🔴 Red: < 5 calls in first 7 days, or recording rate < 30%

**Triggered activation events panel:**
Shows all `activation_events` records: which day trigger fired, whether it was actioned (email sent / CS contacted), and timestamp.

---

## 5. API Routes

All routes are implemented as Next.js App Router route handlers in `apps/web/src/app/api/`. All routes except `/api/webhooks/*` require a valid Clerk session.

### 5.1 Audio Upload Flow

**`GET /api/calls/presign`**
```typescript
// Protected: any authenticated user (tech or owner)
// Query: sessionId, chunkIndex, contentType='audio/aac'

// Response
interface PresignResponse {
  uploadUrl: string       // S3 presigned PUT URL (15-min expiry)
  s3Key: string           // 'audio/{companyId}/{sessionId}/chunk_{n}.aac'
  expiresAt: string
}
```

Implementation:
```typescript
// app/api/calls/presign/route.ts
import { auth } from '@clerk/nextjs/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export async function GET(req: Request) {
  const { orgId } = await auth()
  if (!orgId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')
  const chunkIndex = searchParams.get('chunkIndex')

  const s3Key = `audio/${orgId}/${sessionId}/chunk_${chunkIndex}.aac`
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_AUDIO,
    Key: s3Key,
    ContentType: 'audio/aac',
  })
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 })
  return Response.json({ uploadUrl, s3Key, expiresAt: new Date(Date.now() + 900_000).toISOString() })
}
```

**`POST /api/calls/consent`** — Synchronous. Returns `callId`. Tech waits for this before recording starts.
```typescript
interface ConsentRequest {
  sessionId: string
  techId: string
  companyId: string
  consentedAt: string       // client ISO8601 timestamp
  devicePlatform: 'ios' | 'android'
}
interface ConsentResponse {
  callId: string
  consentLoggedAt: string   // server-confirmed timestamp
}
```

**`POST /api/calls/decline`**
```typescript
interface DeclineRequest {
  sessionId: string; techId: string; companyId: string
  declinedAt: string; reason: 'customer_declined'
}
// Response: 204 No Content
```

**`POST /api/calls/upload-complete`** — Enqueues BullMQ job. Returns 202.
```typescript
interface UploadCompleteRequest {
  callId: string; sessionId: string
  s3Keys: string[]           // ordered chunk keys
  totalDurationSec: number; chunkCount: number
  jobMetadata: { customerName?: string; jobType: 'drain' | 'plumbing' | 'both'; notes?: string } | null
  devicePlatform: 'ios' | 'android'
  audioFormat: 'aac-lc'; audioBitrateKbps: 32; audioChannels: 1
}
interface UploadCompleteResponse {
  callId: string; status: 'processing'; estimatedCompletionSec: number
}
```

Implementation (BullMQ enqueue):
```typescript
// lib/queue.ts
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null })
export const processingQueue = new Queue('call-processing', { connection })

// In upload-complete route handler:
await processingQueue.add('process-call', { callId, s3Keys, jobMetadata }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
})
```

### 5.2 Calls & Dashboard

**`GET /api/calls`** — List calls (company-scoped, paginated)
```typescript
// Query: page, limit(20), techId?, status?, jobType?, dateFrom?, dateTo?
interface CallListResponse {
  calls: CallSummary[]; nextPage: number | null; total: number
}
```

**`GET /api/calls/:id`** — Full call detail
```typescript
interface CallDetailResponse {
  call: Call; transcript: TranscriptSegment[] | null
  score: Score | null; opportunities: Opportunity[]
  coachingPoints: CoachingPoint[]
}
```

**`GET /api/calls/:id/audio`** — Presigned S3 GET URL
```typescript
interface AudioUrlResponse { url: string; durationSec: number }
// URL expires in 1 hour (3600s). Generated server-side only.
```

**`GET /api/dashboard/summary`** — Weekly numbers for dashboard home
```typescript
interface DashboardSummaryResponse {
  opportunityTotalLow: number; opportunityTotalHigh: number
  opportunityChangePct: number  // vs prior 7 days
  topOpportunityTypes: Array<{ type: string; totalValue: number }>
  reviewQueueCount: number
  complianceRate: number        // 0–1
  pricebookCompletionPct: number
}
```

**`GET /api/dashboard/team`** — Per-tech performance
```typescript
interface TeamPerformanceResponse {
  techs: Array<{
    id: string; name: string; avgScore7d: number
    avgOpportunityPerCall: number; callsThisWeek: number
    recordingRate: number; scoreTrendPct: number
  }>
}
```

**`GET /api/dashboard/compliance`** — Compliance dashboard data
```typescript
interface ComplianceResponse {
  overallRate: number; recordedCount: number; dispatchedCount: number
  techCompliance: Array<{
    techId: string; name: string; dispatched: number
    recorded: number; rate: number; complianceGaps: number
  }>
  gaps: Array<{ techId: string; date: string; jobType: string; time: string }>
  nonRecordingReasons: Record<string, number>
}
```

### 5.3 Pricebook

**`GET /api/pricebook`** — List all pricebook items for the company
**`POST /api/pricebook`** — Create item
**`PUT /api/pricebook/:id`** — Update item
**`DELETE /api/pricebook/:id`** — Deactivate (soft delete — sets `active = false`)
**`POST /api/pricebook/import`** — CSV import (multipart/form-data)

```typescript
interface PricebookItemInput {
  name: string; trade: 'drain' | 'plumbing' | 'both'
  opportunityType: OpportunityType
  pricingModel: 'fixed' | 'range' | 'tiered' | 'recurring'
  priceFixed?: number; priceLow?: number; priceHigh?: number
  isRecurring?: boolean; ltvAnnual?: number; ltvYears?: number
  active: boolean
}
```

### 5.4 Coaching

**`POST /api/coaching/:callId/notes`** — Add manager note
```typescript
interface CoachingNoteRequest { text: string }
// Response: { id: string; createdAt: string }
```

**`PUT /api/coaching/:pointId/review`** — Mark coaching point reviewed
```typescript
// Response: 204 No Content
// Sets coaching_points.reviewed_at = now()
```

**`POST /api/opportunities/:id/dispute`** — Tech dispute
```typescript
interface DisputeRequest {
  reason: 'existing_service' | 'offered_declined' | 'not_relevant' | 'affordability' | 'other'
  notes?: string
}
// Response: 204 No Content
```

### 5.5 Billing (Stripe)

**`POST /api/billing/checkout`** — Start trial or subscription
```typescript
interface CheckoutRequest {
  plan: 'starter' | 'pro' | 'team'
  billingInterval: 'annual' | 'monthly'  // default: 'annual'
  seatCount: number
}
interface CheckoutResponse { url: string }  // Stripe Checkout Session URL

// Implementation:
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: STRIPE_PRICE_IDS[plan][billingInterval], quantity: seatCount }],
  subscription_data: { trial_period_days: 14 },
  success_url: `${APP_URL}/dashboard?checkout=success`,
  cancel_url: `${APP_URL}/dashboard/billing`,
  customer_email: ownerEmail,
  metadata: { companyId: orgId, plan, billingInterval },
})
return Response.json({ url: session.url })
```

**`POST /api/billing/portal`** — Stripe Customer Portal session
```typescript
// Response: { url: string }
const session = await stripe.billingPortal.sessions.create({
  customer: company.stripeCustomerId,
  return_url: `${APP_URL}/dashboard/billing`,
})
```

### 5.6 Webhooks

**`POST /api/webhooks/stripe`** — Stripe lifecycle events
```typescript
// Signature verified with STRIPE_WEBHOOK_SECRET
// Handles:
//   checkout.session.completed     → create/update subscription record, set company.stripeSubscriptionId
//   customer.subscription.updated  → update plan/seats in companies table
//   customer.subscription.deleted  → set company.plan = 'cancelled'
//   invoice.payment_failed         → set company.payment_failed = true → triggers in-app banner
//   invoice.payment_succeeded      → clear company.payment_failed
//   customer.updated               → check card expiry, trigger pre-dunning email if within 7 days
```

**`POST /api/webhooks/clerk`** — Clerk user/org events
```typescript
// Signature verified with CLERK_WEBHOOK_SECRET
// Handles:
//   organization.created           → create companies record in Neon; fire Day 1 activation email
//   organizationMembership.created → create/update users record, set role
//   organizationMembership.deleted → deactivate user in Neon
//   user.updated                   → sync name/phone changes
```

### 5.7 Admin (Internal)

**`GET /api/admin/health`** — Pipeline health metrics
```typescript
interface HealthResponse {
  queueDepth: number; processingErrors24h: number
  avgProcessingTimeSec: number; companyHealth: Array<{
    companyId: string; name: string; callsThisWeek: number
    recordingRate: number; activationHealth: 'green' | 'yellow' | 'red'
  }>
}
```

**`GET /api/admin/case-study/:companyId?from=&to=`** — Case study data export
```typescript
interface CaseStudyResponse {
  companyName: string; periodDays: number
  totalCallsRecorded: number; totalOpportunityIdentified: number
  avgScoreFirstWeek: number; avgScoreLastWeek: number; scoreImprovement: number
  recordingRateTrend: Array<{ week: string; rate: number }>
  topOpportunityTypes: Array<{ type: string; totalValue: number; callCount: number }>
  disputeRatePerType: Record<string, number>
}
```

**`GET /api/admin/activation`** — Activation health per company
```typescript
interface ActivationResponse {
  companies: Array<{
    companyId: string; name: string; createdAt: string
    daysActive: number; callCount: number; recordingRate: number
    activationEvents: Array<{ eventType: string; triggeredAt: string; actioned: boolean }>
    health: 'green' | 'yellow' | 'red'
  }>
}
```

### 5.8 Team & Users

**`GET /api/team`** — List company members
**`POST /api/team/invite`** — Invite tech (sends SMS via Clerk or Twilio)
**`PUT /api/team/:userId/role`** — Change role
**`DELETE /api/team/:userId`** — Remove from company (Clerk org remove + Neon deactivate + Stripe seat decrement)

**`GET /api/team/me`** — Current user context
```typescript
interface MeResponse {
  id: string; name: string; role: 'technician' | 'field_manager' | 'owner'
  companyId: string; company: {
    name: string; plan: string; paymentFailed: boolean
    pricebookCompletionPct: number
  }
}
```

---

## 6. Key Drizzle Query Patterns

These are the most important queries for the web dashboard. Written here as reference to avoid divergent implementations.

### 6.1 Weekly Opportunity Total

```typescript
// lib/queries/dashboard.ts
import { db } from '@/lib/db'
import { opportunities, scores, calls } from '@kova/db/schema'
import { and, eq, gte, isNull, sum } from 'drizzle-orm'

export async function getWeeklyOpportunity(companyId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const result = await db
    .select({
      totalLow: sum(opportunities.valueLow),
      totalHigh: sum(opportunities.valueHigh),
    })
    .from(opportunities)
    .innerJoin(scores, eq(opportunities.scoreId, scores.id))
    .innerJoin(calls, eq(scores.callId, calls.id))
    .where(
      and(
        eq(calls.companyId, companyId),
        gte(calls.recordedAt, sevenDaysAgo),
        isNull(opportunities.disputedAt),
      )
    )

  return result[0]
}
```

### 6.2 Per-Tech Performance

```typescript
export async function getTeamPerformance(companyId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  return db
    .select({
      techId: calls.techId,
      techName: users.name,
      avgScore: avg(scores.overallScore),
      avgOpportunity: avg(scores.opportunityTotalHigh),
      callCount: count(calls.id),
    })
    .from(calls)
    .innerJoin(scores, eq(calls.scoreId, scores.id))
    .innerJoin(users, eq(calls.techId, users.id))
    .where(and(eq(calls.companyId, companyId), gte(calls.recordedAt, sevenDaysAgo)))
    .groupBy(calls.techId, users.name)
    .orderBy(desc(avg(scores.overallScore)))
}
```

### 6.3 Call Review Queue

```typescript
export async function getCallReviewQueue(companyId: string, limit = 10) {
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)

  return db
    .select({ call: calls, score: scores, tech: users })
    .from(calls)
    .innerJoin(scores, eq(calls.scoreId, scores.id))
    .innerJoin(users, eq(calls.techId, users.id))
    .where(
      and(
        eq(calls.companyId, companyId),
        eq(calls.status, 'scored'),
        or(
          gt(scores.opportunityTotalHigh, 1500),
          lt(scores.overallScore, 50),
          and(isNull(scores.reviewedAt), lt(calls.recordedAt, fiveDaysAgo))
        )
      )
    )
    .orderBy(desc(scores.opportunityTotalHigh))
    .limit(limit)
}
```

### 6.4 Dispute Rate per Opportunity Type

```typescript
// Used for the 40% gate check — run weekly as a cron job or on-demand
export async function getDisputeRates(companyId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  return db
    .select({
      type: opportunities.type,
      total: count(opportunities.id),
      disputed: countDistinct(opportunities.id).filter(isNotNull(opportunities.disputedAt)),
    })
    .from(opportunities)
    .innerJoin(scores, eq(opportunities.scoreId, scores.id))
    .innerJoin(calls, eq(scores.callId, calls.id))
    .where(and(eq(calls.companyId, companyId), gte(calls.recordedAt, thirtyDaysAgo)))
    .groupBy(opportunities.type)
}
```

---

## 7. Email System

### 7.1 Weekly Digest Email

Sent every Monday at 7am in the owner's timezone via Vercel Cron + Resend.

**Template: `emails/WeeklyDigest.tsx`**

```tsx
// emails/WeeklyDigest.tsx
import { Html, Head, Body, Container, Text, Link, Section, Row, Column } from '@react-email/components'

interface WeeklyDigestProps {
  ownerName: string; companyName: string
  weekOpportunityLow: number; weekOpportunityHigh: number
  weekChangePct: number; topOpportunityTypes: Array<{ type: string; value: number }>
  topPerformer: { name: string; avgScore: number }
  mostImproved: { name: string; scoreDelta: number }
  highlightClips: Array<{ callId: string; techName: string; opportunityValue: number; clipUrl: string }>
  pricebookComplete: boolean; cumOpportunityTotal: number
  dashboardUrl: string
}

export function WeeklyDigest({ ownerName, weekOpportunityHigh, weekChangePct, ... }: WeeklyDigestProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', padding: '24px 0' }}>
          <Text style={{ fontSize: 14, color: '#6b7280' }}>{companyName} · Week of {weekLabel}</Text>

          {/* THE NUMBER — front and center */}
          <Section style={{ background: '#fff', borderRadius: 12, padding: 32, marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Estimated opportunity this week</Text>
            <Text style={{ fontSize: 48, fontWeight: 700, color: '#111827', margin: '8px 0' }}>
              ${weekOpportunityHigh.toLocaleString()}
            </Text>
            <Text style={{ fontSize: 16, color: weekChangePct >= 0 ? '#059669' : '#dc2626' }}>
              {weekChangePct >= 0 ? '↑' : '↓'} {Math.abs(weekChangePct)}% vs last week
            </Text>
          </Section>

          {/* Top opportunity types */}
          {/* Top performer + most improved */}
          {/* 1–2 clip highlights with direct links */}
          {/* Pricebook reminder if incomplete */}
          {/* Cumulative total */}

          <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 32 }}>
            Estimated opportunity reflects your pricebook prices. Actual revenue potential depends on customer need, timing, and context.
          </Text>
          <Link href={dashboardUrl}>View full dashboard →</Link>
        </Container>
      </Body>
    </Html>
  )
}
```

**Key design principle:** All key numbers visible without clicking through. The digest is a self-contained summary — clicking to the dashboard is optional, not required to understand the week's performance.

**Clip links in the digest:** Direct links to `/dashboard/calls/:callId` — no login required if the owner is already signed into Clerk in their browser. Login redirect preserves the destination URL.

**Cumulative ROI framing:**
- Always shows cumulative opportunity total since account creation below the weekly number
- If weekly opportunity dropped > 30% vs. prior week: show the "your team is improving" message:
  > *Your team's estimated opportunity dropped from $X to $Y this week — that means they're capturing more of what they find. Cumulative total since you started: $Z.*

### 7.2 Activation Sprint Emails

Four automated emails tied to `activation_events` triggers. Sent via Resend, logged in `activation_events` table.

**Day 1 Welcome (`emails/ActivationDay1.tsx`)**
- Triggered by: `POST /api/webhooks/clerk` on `organization.created`
- Subject: *"You're in — here's what to do first"*
- Content: 3-step checklist (add techs, configure pricebook, record first call), dashboard link, founder's direct email

**Day 7 Check-in (`emails/ActivationDay7.tsx`)**
- Triggered by: cron job checks `activation_events` — if company was created 7 days ago and `calls` count < 10
- Subject: *"How's Kova working for your team?"*
- Content: current call count, link to dashboard, "reply to this email and I'll help" — founder sends personally

**Day 14 Urgency (`emails/ActivationDay14.tsx`)**
- Triggered by: cron job, 14 days since creation, < 10 calls total
- Subject: *"Let's troubleshoot together — 15 minutes"*
- Content: specific likely issues (app not installed, consent confusion, connectivity), calendar link for founder call

**Day 30 Escalation**
- Triggered by: cron job, 30 days since creation, < 30 calls OR recording rate < 40%
- No automated email — creates a high-priority flag in `/admin` activation dashboard
- Founder does personal outreach: call or text to owner

**Pre-dunning (`emails/PreDunning.tsx`)**
- Triggered by: Stripe `customer.updated` webhook — check if card expires within 7 days
- Subject: *"Your card on file is expiring soon"*
- Content: expiry date, direct link to billing portal to update card

### 7.3 Vercel Cron Configuration

```typescript
// next.config.ts
// Cron jobs are configured in vercel.json, not next.config.ts

// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/weekly-digest",
      "schedule": "0 7 * * 1"    // Monday 7am UTC (adjust per timezone logic in handler)
    },
    {
      "path": "/api/cron/activation-check",
      "schedule": "0 9 * * *"    // Daily 9am UTC
    },
    {
      "path": "/api/cron/design-partner-snapshot",
      "schedule": "0 2 * * *"    // Daily 2am UTC
    },
    {
      "path": "/api/cron/dispute-rate-check",
      "schedule": "0 8 * * 1"    // Monday 8am UTC
    }
  ]
}
```

**`/api/cron/weekly-digest`:**
```typescript
// For each active company:
// 1. Compute weekly digest data (getWeeklyOpportunity, getTeamPerformance, getHighlightClips)
// 2. Render WeeklyDigest React Email template
// 3. Send via Resend to company owner email
// 4. Log to activation_events (type: 'weekly_digest_sent')
// Owner timezone: stored in companies table; convert 7am local to UTC for delivery
```

**`/api/cron/activation-check`:**
```typescript
// For each company created 7, 14, or 30 days ago:
// 1. Check call count and recording rate
// 2. If below thresholds: create activation_events record
// 3. Send activation email if Day 7 or Day 14
// 4. Flag for founder review if Day 30
// Idempotent: check activation_events for existing trigger before creating
```

**`/api/cron/design-partner-snapshot`:**
```typescript
// For each active company:
// 1. Compute daily snapshot: calls_recorded, opportunity_total, avg_score, recording_rate, top_opportunity_type
// 2. Insert into design_partner_snapshots
```

**`/api/cron/dispute-rate-check`:**
```typescript
// For each company:
// 1. Run getDisputeRates() for past 30 days
// 2. If any type has dispute rate > 40%: log to audit_logs, flag in admin dashboard
// 3. Do NOT automatically pull the type — flag it for founder review
```

---

## 8. Notifications & Alerts

### 8.1 High-Opportunity Alert

Triggered in the Railway worker after scoring, when `opportunity_total_high > threshold` (default $1,500, owner-configurable).

**Delivery channels:**
- Push notification to owner's devices (FCM)
- Email to owner (Resend, immediate send — not batched)

**Email subject:** *"High opportunity call — $2,100 estimated"*

**Email content:**
```
Marcus Reyes completed a call with $1,900–$2,100 in estimated opportunity.

Camera Inspection    $425    (not offered after customer mentioned recurring issue)
Maintenance Plan     $1,495 LTV  (not mentioned at close)

[Review Call →]
```

**Push notification:** *"$2,100 opportunity — M. Reyes, just now"* → tapping opens `/dashboard/calls/:callId`

### 8.2 Tech Not Recorded Alert

Triggered by Railway worker or cron: if a tech has `last_call_date < 3 days ago` (default threshold, owner-configurable).

- Push to owner: *"J. Santos hasn't recorded in 4 days"*
- Shown as a compliance note in `/dashboard/compliance`

### 8.3 Payment Failed In-App Banner

Triggered by Stripe `invoice.payment_failed` webhook → `company.payment_failed = true` in Neon.

**Banner shown on every dashboard page:**
```
⚠️ Payment failed — update your payment method to keep recording.
[Update Payment Method →]
```

Banner dismisses only when `invoice.payment_succeeded` fires → `company.payment_failed = false`.

**The same flag is read by the mobile app** via `GET /api/team/me → company.paymentFailed`. Mobile shows the same banner in the tech HomeScreen.

---

## 9. Onboarding Flow (Detailed)

### 9.1 Owner Onboarding Sequence

Target: < 35 minutes from account creation to first scored call delivered.

```
1. Owner visits kovahq.com / landing page → "Start Free Trial"
2. /sign-up: email + password (or Google SSO)
   → Clerk creates user + Organization
   → Clerk webhook fires: organization.created
   → Neon: companies record created (name from org, plan='trial', state='CA' default)
   → activation_events Day 1 created; welcome email queued
3. Redirect to /onboarding/team
4. Owner enters tech names + phone numbers (or skips)
   → POST /api/team/invite per tech
   → Kova sends SMS to each tech
5. Redirect to /onboarding/pricebook
6. Owner selects: Start with defaults / Import CSV / Configure later
   → pricebook seeded or configured
7. Redirect to /dashboard (empty state)
8. Owner shares with techs: "Kova is ready — record your first call"
9. Tech receives SMS, downloads app, records first call
10. Call processed (< 5 min) → push notification to tech + owner
11. Owner logs back in → sees first call in review queue + first dollar figure
```

### 9.2 Empty State Strategy

Every page in the dashboard has a well-designed empty state that communicates the value of filling it, not just "nothing here yet."

| Page | Empty State Copy | CTA |
|---|---|---|
| Dashboard Home | "No calls recorded yet. Ask your team to record their first call — results appear here within 5 minutes." | "View Team Setup →" |
| Call Library | "No calls match your filters." | Reset filters / or if zero calls total: same as home empty state |
| Team Performance | "No scored calls this week. Recording rate picks up after the first few days." | "Check Compliance →" |
| Compliance | "No dispatched jobs uploaded yet. Upload your schedule to track recording compliance accurately." | "Upload Schedule →" |
| Pricebook | (Never empty — industry defaults always loaded) | N/A |

---

## 10. Churn Prevention

### 10.1 Involuntary Churn — All 6 Measures

All 6 measures must be live before Drain Right launch (Week 10). Implementation notes:

| Measure | Implementation | Week |
|---|---|---|
| **Smart Retries** | Enable in Stripe Dashboard → Billing → Settings → Automatic retries. Zero code. | 10 setup |
| **7-day grace period** | On `invoice.payment_failed`: webhook sets `company.payment_failed = true`. Do NOT immediately restrict access. Restrict at `company.grace_period_end` (7 days from failure). | 10 |
| **Pre-dunning email** | Stripe `customer.updated` webhook → check `card.exp_month`/`exp_year` against current date. If expiring within 7 days: send `PreDunning` email via Resend. | 10 |
| **In-app payment failed banner** | `invoice.payment_failed` → `companies.payment_failed = true` → banner shown on all dashboard pages + mobile HomeScreen via `MeResponse.company.paymentFailed`. | 10 |
| **ACH/bank debit** | Enable ACH Direct Debit in Stripe Dashboard. Presented as a payment method option in the Stripe Customer Portal automatically once enabled. Zero code beyond dashboard setup. | 10 setup |
| **Account Updater** | Enable in Stripe Dashboard → Settings → Card updates. Visa/Mastercard automatically updated on card replacement. Zero code. | 10 setup |

### 10.2 Voluntary Churn Defense

The cumulative ROI framing prevents "success-triggered churn" — owners churning when opportunity numbers drop as the team improves.

**Implementation:**
- Dashboard home always shows both: *This week: $34,750* AND *Since you started: $312,000*
- When monthly opportunity drops > 30% month-over-month (checked weekly by cron): show improvement framing:
  > *Your team's estimated opportunity dropped from $42K to $34K this week — that means they're capturing more of what they find. Cumulative total: $312K identified since you started.*
- This logic is in the `WeeklyDigest` email template in Phase 1; a dedicated "ROI Timeline" chart is Phase 2.

### 10.3 Stripe Webhook Handler

```typescript
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { companies } from '@kova/db/schema'
import { resend } from '@/lib/resend'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = (await headers()).get('stripe-signature')!
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession
      await db.update(companies)
        .set({ stripeCustomerId: session.customer as string, stripeSubscriptionId: session.subscription as string, plan: session.metadata!.plan })
        .where(eq(companies.id, session.metadata!.companyId))
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const gracePeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      await db.update(companies)
        .set({ paymentFailed: true, gracePeriodEnd })
        .where(eq(companies.stripeCustomerId, invoice.customer as string))
      // Mobile and web banners driven by company.paymentFailed flag in MeResponse
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      await db.update(companies)
        .set({ paymentFailed: false, gracePeriodEnd: null })
        .where(eq(companies.stripeCustomerId, invoice.customer as string))
      break
    }

    case 'customer.updated': {
      const customer = event.data.object as Stripe.Customer
      const card = customer.invoice_settings?.default_payment_method
      // Check expiry — if card expires within 7 days: send PreDunning email
      // Implementation: fetch payment method, check exp_month/exp_year vs today
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await db.update(companies)
        .set({ plan: 'cancelled' })
        .where(eq(companies.stripeSubscriptionId, sub.id))
      break
    }
  }

  return Response.json({ received: true })
}
```

---

## 11. Activation Sprint

### 11.1 Trigger Logic

`activation_events` is the append-only log of all activation lifecycle events. The cron job is idempotent — it checks for existing records before creating new ones.

```typescript
// app/api/cron/activation-check/route.ts

export async function GET(req: Request) {
  // Security: Vercel Cron adds Authorization header with CRON_SECRET
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const companies = await db.select().from(companiesTable).where(eq(companiesTable.plan, 'active'))

  for (const company of companies) {
    const daysActive = Math.floor((Date.now() - company.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    const callCount = await getCallCount(company.id)
    const recordingRate = await getRecordingRate(company.id)

    // Day 7 check
    if (daysActive >= 7 && daysActive < 8) {
      const alreadyTriggered = await getActivationEvent(company.id, 'day_7_check')
      if (!alreadyTriggered && callCount < 10) {
        await createActivationEvent(company.id, 'day_7_check')
        await sendActivationEmail(company, 'day_7')
      }
    }

    // Day 14 check
    if (daysActive >= 14 && daysActive < 15) {
      const alreadyTriggered = await getActivationEvent(company.id, 'day_14_check')
      if (!alreadyTriggered && callCount < 10) {
        await createActivationEvent(company.id, 'day_14_check')
        await sendActivationEmail(company, 'day_14')
      }
    }

    // Day 30 check
    if (daysActive >= 30 && daysActive < 31) {
      const alreadyTriggered = await getActivationEvent(company.id, 'day_30_escalation')
      if (!alreadyTriggered && (callCount < 30 || recordingRate < 0.4)) {
        await createActivationEvent(company.id, 'day_30_escalation')
        // No email — flag in /admin for founder review
      }
    }
  }

  return Response.json({ ok: true })
}
```

### 11.2 Internal CS Dashboard (`/admin`)

At Drain Right pilot scale, this is a single row in the table. Engineering it as a proper data model means it scales to 5–10 design partners without code changes.

**Activation health score algorithm:**
- **Green:** ≥ 10 calls in first 7 days AND recording rate ≥ 50% this week
- **Yellow:** 5–9 calls in first 7 days, OR recording rate 30–49%
- **Red:** < 5 calls in first 7 days, OR recording rate < 30%, OR no calls in past 5 days

The `/admin` page is a Server Component — reads directly from Neon via Drizzle. No client-side state. Refresh the page to see updates.

---

## 12. Design Partner Instrumentation

### 12.1 Per-Company Daily Snapshots

The `design_partner_snapshots` table is populated by the daily cron job (`/api/cron/design-partner-snapshot`). Every row is a point-in-time snapshot of a company's key metrics.

```typescript
// Snapshot computed daily for each active company:
interface DailySnapshot {
  companyId: string
  snapshotDate: Date                  // midnight UTC
  callsRecorded: number               // cumulative
  callsRecordedThisWeek: number
  opportunityTotal: number            // cumulative, value_high
  opportunityThisWeek: number
  avgScore: number                    // 7-day rolling average
  recordingRate: number               // this week (calls / dispatched or calls / target)
  topOpportunityType: string          // by total dollar value this week
}
```

This data powers the case study export without requiring any additional computation at export time.

### 12.2 Case Study Export Endpoint

The `$X in estimated opportunity in 30 days` number that powers every sales conversation and case study is a single API call:

```
GET /api/admin/case-study/drain-right?from=2026-05-01&to=2026-05-31
```

Returns:
```json
{
  "companyName": "Drain Right",
  "periodDays": 30,
  "totalCallsRecorded": 512,
  "totalOpportunityIdentified": 43820,
  "avgScoreFirstWeek": 62.4,
  "avgScoreLastWeek": 74.1,
  "scoreImprovement": 11.7,
  "recordingRateTrend": [
    { "week": "Week 1", "rate": 0.58 },
    { "week": "Week 2", "rate": 0.68 },
    { "week": "Week 3", "rate": 0.74 },
    { "week": "Week 4", "rate": 0.79 }
  ],
  "topOpportunityTypes": [
    { "type": "Camera Inspection", "totalValue": 21760, "callCount": 51 },
    { "type": "Maintenance Plan",  "totalValue": 14925, "callCount": 10 },
    { "type": "Drain Snaking",     "totalValue": 7135,  "callCount": 28 }
  ],
  "disputeRatePerType": {
    "camera_inspection": 0.12,
    "maintenance_plan": 0.08
  }
}
```

The web endpoint at `/admin/case-study/:id` renders this data as a formatted page (not raw JSON) so the founder can screenshot or copy it directly into a case study document.

---

## 13. Weekly Sprint Plan (Web Deliverables)

This section mirrors the 12-week sprint plan in dev-plan-v2 §8 but covers web-only deliverables with acceptance criteria and backend dependencies.

---

### Week 1 — Web Scaffolding

**Goal:** `apps/web` compiles, deploys to Vercel, and returns a 200 from every route. Zero features.

**Web deliverables:**
- Next.js 15 project initialized in `apps/web`
- Tailwind CSS and shadcn/ui configured (base components installed: `button`, `card`, `input`)
- Clerk middleware configured — `/sign-in` and `/sign-up` work
- `src/lib/db.ts` — Drizzle + Neon HTTP client connected to `dev` branch
- `src/lib/stripe.ts`, `src/lib/resend.ts`, `src/lib/queue.ts` — client instances (not yet called)
- Deployed to Vercel (main branch → production, dev branch → preview)
- `/api/admin/health` route returns `{ status: 'ok' }` (used by mobile CI in Week 1)
- `.env.example` — every variable named and described

**Acceptance criteria:**
- `pnpm typecheck` passes with zero errors
- `vercel --prod` deploys successfully
- Clerk sign-in renders at `/sign-in`
- Drizzle connects to Neon `dev` branch without error

**Dependencies from backend:**
- Neon project created, `main` / `staging` / `dev` / `test` branches provisioned
- Clerk: Organizations enabled, custom roles defined
- `design_partner_snapshots`, `activation_events`, `processing_costs` tables in schema from Day 1

---

### Week 2 — Auth, Webhooks, and Data Layer

**Goal:** Owners can create accounts. Clerk events sync to Neon. Role-based access works.

**Web deliverables:**
- Owner sign-up: email/password + Google SSO → Neon `companies` record created
- Clerk webhook handler (`/api/webhooks/clerk`): `organization.created` → company record, `organizationMembership.created` → user record
- Role-based middleware: `owner` and `field_manager` can access `/dashboard`; `technician` role redirected
- Onboarding redirect: new owner with no org → `/onboarding/team`
- Seed script: test company + owner + 2 techs (verify Clerk org creation end-to-end)
- Neon migrations run in CI before tests

**Acceptance criteria:**
- New owner signs up → `companies` and `users` records appear in Neon `dev` database
- `field_manager` role can access `/dashboard`; authenticated user without org gets redirected to `/onboarding/team`
- `pnpm typecheck` passes

---

### Week 3 — No Web Sprint (Recording Engine — Mobile Critical Gate)

**Web tasks (supporting):**
- Implement `POST /api/calls/consent` and `POST /api/calls/decline` — mobile needs these for the Week 3 recording gate
- Implement `GET /api/calls/presign` — mobile needs this in Week 4 but start now
- These three endpoints are the minimum API surface mobile needs; prioritize above all other web work this week

**Acceptance criteria:**
- `POST /api/calls/consent` creates a `calls` record in Neon with `consent_logged_at` set and returns `{ callId }`
- `GET /api/calls/presign` generates a valid S3 presigned URL (test with curl)
- Mobile background recording gate is unblocked from the web API side

---

### Week 4 — Upload Pipeline & Call Storage

**Goal:** Audio arrives in S3, call records exist in Neon, BullMQ job is enqueued. Dashboard reads real data.

**Web deliverables:**
- `POST /api/calls/upload-complete` — enqueues BullMQ job, updates call record status to `uploaded`
- `GET /api/calls` — paginated list, company-scoped, returns real data from Neon
- `GET /api/calls/:id` — call detail (status, metadata — no score yet)
- Basic call library page (`/dashboard/calls`) — renders server-side from Drizzle
- Queue depth visible in Bull Board (Railway) — verify jobs are enqueuing correctly

**Acceptance criteria:**
- Record a call on mobile → upload completes → call appears in `/dashboard/calls` with status "Processing"
- BullMQ job visible in Bull Board with `call-processing` queue
- `pnpm typecheck` passes

---

### Week 5 — No Web Sprint (Rules Engine — Backend)

**Web tasks (supporting):**
- Stub all remaining API routes (return 501 Not Implemented) so mobile can code against correct shapes
- Write Drizzle queries for dashboard home, team performance, compliance — stub data for now
- Begin onboarding page layout (static HTML/CSS only)

---

### Week 6 — No Web Sprint (LLM Layer — Backend)

**Web tasks (supporting):**
- Wire up `GET /api/dashboard/summary` with real Drizzle queries (no scores yet — returns zeros)
- Dashboard home page renders with real call count and empty opportunity total
- Begin call detail page layout — audio player shell (client component, no audio yet)

---

### Week 7 — Owner Dashboard, Team View, Compliance

**Goal:** Owner can log in and see real data. Call list shows scored results. Dashboard home shows the number.

**Web deliverables:**
- Dashboard home (`/dashboard`): weekly opportunity total, trend, top 3 types, review queue, compliance rate — all live data from Drizzle
- Team performance table (`/dashboard/team`): per-tech data from `GET /api/dashboard/team`
- Call library (`/dashboard/calls`): list with score + opportunity columns, date/tech filter
- Compliance dashboard (`/dashboard/compliance`): recording rates per tech, gap list
- `GET /api/dashboard/summary`, `GET /api/dashboard/team`, `GET /api/dashboard/compliance` all implemented with real queries
- Pricebook completion indicator shown on dashboard home if < 70% configured

**Acceptance criteria:**
- Owner logs in after a scored call exists → sees correct opportunity total on dashboard home
- Team table shows correct per-tech avg score and opportunity/call
- Compliance gaps appear for any dispatched job with no recording and no reason
- `pnpm typecheck` passes; `pnpm lint` passes

---

### Week 8 — Call Detail, Audio Player, Weekly Digest

**Goal:** Owner can review any call in full — audio, transcript, score. Weekly digest email sends correctly.

**Web deliverables:**
- Call detail page (`/dashboard/calls/:callId`): three-panel layout — audio player, transcript, score breakdown + opportunities + coaching
- `AudioPlayer` client component: `<audio>` element with presigned URL, progress bar, opportunity markers, seek on transcript tap
- `TranscriptPanel` client component: segments with speaker labels, auto-scroll, tap-to-seek
- `ScoreBreakdown` component: per-dimension scores, reasoning text from `dimensions` JSONB
- Coaching note form: `POST /api/coaching/:callId/notes` — optimistic update
- `GET /api/calls/:id/audio` — presigned S3 GET URL (1-hour expiry)
- Weekly digest email template (`emails/WeeklyDigest.tsx`) — rendered correctly in React Email preview
- Vercel cron configured (`vercel.json`) — digest cron registered but set to dry-run until Week 11 validation
- **STT bakeoff:** Run in Railway worker (not web work) — web deliverable: ensure `processing_costs` data is visible in Neon for cost analysis

**Acceptance criteria:**
- Open a scored call in the browser → audio plays, transcript segment highlights as audio plays, tapping a segment seeks audio
- Opportunity markers visible on the audio timeline at correct positions
- Coaching note submitted → appears immediately below the form
- `emails/WeeklyDigest.tsx` renders correctly in `react-email` dev server (`pnpm email dev`)

---

### Week 9 — Pricebook Management & Admin Settings

**Goal:** Owner can fully configure their pricebook. All 11 default services are configurable. Pricebook changes immediately affect opportunity values on new calls.

**Web deliverables:**
- Pricebook page (`/dashboard/pricebook`): full CRUD table, completion indicator
- Pricebook item edit modal: all three pricing models (fixed, range, recurring), LTV calculation preview
- Active/inactive toggle: `PUT /api/pricebook/:id` with `{ active: false }`
- CSV import: file upload, preview table, confirm → `POST /api/pricebook/import`
- Industry defaults pre-seeded for California drain + plumbing on new company creation
- Default price tagging: `is_default: true` items show `(default)` badge in opportunity lists
- Admin settings page (`/dashboard/settings`): company name, state, consent language preview, notification thresholds, recording target
- Pricebook completion banner on dashboard home driven by real completion query

**Acceptance criteria:**
- Change camera inspection price to $450 → next scored call shows $450 not $425
- CSV import: upload template, import 5 rows, verify in table
- Completion indicator updates correctly: 7/11 configured → 64%, banner shown; 8/11 → 73%, banner hidden
- `pnpm typecheck` passes

---

### Week 10 — Billing, Churn Prevention, High-Opportunity Alerts

**Goal:** Full billing live. All 6 churn prevention measures active. Real-time alerts work.

**Web deliverables:**
- Billing page (`/dashboard/billing`): plan display, seat manager, portal link, trial/payment failed states
- Stripe Checkout: `POST /api/billing/checkout` → Stripe session with annual pricing as default, 14-day trial
- Stripe Customer Portal: `POST /api/billing/portal` → Stripe portal session URL
- Stripe webhook handler: all 5 event types (see §10.3)
- Annual pricing default confirmed: checkout flow presents annual first; monthly billing is a secondary "or pay monthly" option shown below the annual offer
- Payment failed in-app banner: `company.payment_failed = true` → banner renders on all dashboard pages
- Pre-dunning email: `customer.updated` webhook checks card expiry → `PreDunning` email via Resend
- ACH and Account Updater: confirmed enabled in Stripe Dashboard
- High opportunity alert email template and send logic in Railway worker (web receives Stripe events; worker sends opportunity alerts)
- `/api/admin/health` endpoint returns real data: queue depth, error counts, per-company recording rates

**Acceptance criteria:**
- Create a Stripe test checkout session → complete with test card → company plan updated in Neon
- Stripe test `invoice.payment_failed` event → payment failed banner appears on dashboard within 30 seconds of event
- Pre-dunning: manually trigger `customer.updated` with expiring card → `PreDunning` email preview correct (send to test address)
- `pnpm typecheck` passes

---

### Week 11 — Onboarding, Activation Sprint, Design Partner Instrumentation

**Goal:** A brand-new owner can sign up, add techs, configure their pricebook, and have their first scored call reviewed — all in under 35 minutes. Activation sprint automation is live.

**Web deliverables:**
- Full onboarding flow: `/sign-up` → `/onboarding/team` → `/onboarding/pricebook` → `/dashboard` (empty state with CTA)
- `TeamSetupForm`: multi-row tech invite form, `POST /api/team/invite`, SMS confirmation
- `PricebookSetupChoice`: three-option card picker → defaults / CSV / later
- Empty states: every dashboard page has a designed empty state (see §9.2)
- Activation sprint: Day 1 welcome email live (triggered by `organization.created` webhook), Day 7 and Day 14 cron checks active
- `ActivationDay1`, `ActivationDay7`, `ActivationDay14` email templates finalized and rendering correctly
- Design partner case study export: `/api/admin/case-study/:companyId` returning correct data
- `/admin` activation dashboard: activation health table showing real company data
- Daily snapshot cron: `design_partner_snapshots` populated with daily data
- Dispute rate cron: weekly check with > 40% flag logic

**End-to-end onboarding test (must pass before Week 12):**
1. Founder creates a new owner account at `/sign-up`
2. Adds 2 test techs by phone number
3. Selects "Start with defaults" for pricebook
4. Records a 2-minute call from the mobile test device
5. Call is scored and appears in the dashboard call review queue
6. Founder reviews the call, adds a coaching note
7. Total elapsed time: < 35 minutes

**Acceptance criteria:**
- End-to-end onboarding test passes in < 35 minutes
- Day 1 welcome email arrives in inbox within 60 seconds of account creation
- `/api/admin/case-study/drain-right` returns correct JSON structure
- `pnpm typecheck` passes; `pnpm lint` passes; all cron routes return 200 in Vercel preview

---

### Week 12 — Drain Right Pilot Prep & Launch

**Goal:** Drain Right is live. All 16+ techs onboarded from the owner's dashboard. First calls reviewed together with the owner.

**Web deliverables:**
- Drain Right company account created, owner signed in, profile complete
- All 16+ techs invited via `POST /api/team/invite` from the owner dashboard
- Drain Right pricebook configured at their actual prices (no industry defaults for core services)
- Production Stripe checkout: Drain Right on Starter plan, annual billing, 17 seats
- Weekly digest cron switched from dry-run to live send
- Monitoring confirmed active: recording rate visible in `/api/admin/health`, activation dashboard showing green
- First scored call reviewed together with Drain Right owner: score explained, opportunity confirmed, coaching note added

**Actions (not code):**
- Manager walkthrough: 1-hour session with Drain Right owner covering dashboard, call review queue, pricebook, weekly digest, high-opportunity alert
- Confirm Drain Right's email for weekly digest is correct and test digest received
- Pilot success criteria co-confirmed: what dollar range in 30 days = success? What check-in cadence?

---

## 14. Infrastructure & Deployment

### 14.1 Vercel Configuration

```
Project: kova-web
Framework: Next.js
Root directory: apps/web
Build command: pnpm turbo build --filter=web
Output directory: .next

Environment:
  Production: main branch → production domain (kovahq.com)
  Preview: all other branches → auto-generated preview URLs

Functions:
  Max duration: 10 seconds (Vercel Hobby/Pro default)
  Long-running work (> 10s): runs on Railway worker, never in Vercel

Crons: configured in vercel.json (see §7.3)
```

**API route execution time targets:**
- Presign, consent, decline: < 500ms
- Dashboard queries (summary, team, compliance): < 2s (Drizzle + Neon HTTP)
- Pricebook CRUD: < 1s
- Stripe checkout/portal: < 2s (Stripe API latency)

**If a Vercel function approaches 10s:** it is doing too much work — offload to Railway.

### 14.2 Environment Variables

All variables documented in `.env.example`. Web-specific additions beyond dev-plan-v2 §9.2:

```bash
# App URL (used in email links, Stripe redirect URLs)
NEXT_PUBLIC_APP_URL=https://kovahq.com

# Cron security
CRON_SECRET=                        # Random secret; verified in all /api/cron/* routes

# Admin
ADMIN_USER_ID=                      # Clerk userId of the founder; gates /admin routes

# Feature flags (simple env vars in Phase 1 — no feature flag service)
WEEKLY_DIGEST_LIVE=false            # Set to true in Week 11 to enable live sends
ACTIVATION_EMAILS_LIVE=false        # Set to true in Week 11
```

### 14.3 CI/CD

```yaml
# .github/workflows/ci.yml (web-specific steps)
- name: TypeScript check
  run: pnpm --filter web typecheck

- name: Lint
  run: pnpm --filter web lint

- name: Unit tests
  run: pnpm --filter web test

- name: Drizzle migration check
  run: pnpm --filter db migrate:check   # Verifies pending migrations don't break schema
```

Vercel auto-deploys on every push via the Vercel GitHub integration — no manual deploy step needed for web.

---

## 15. Testing Strategy

### 15.1 Unit Tests

**What to unit test in web:**
- Drizzle query helper functions (`getWeeklyOpportunity`, `getTeamPerformance`, `getDisputeRates`) — test with Neon `test` branch
- Stripe webhook handler: all 5 event types → correct Neon updates (mock Stripe events)
- Activation cron logic: day threshold calculations, idempotency check
- Email templates: render `WeeklyDigest` with edge-case data (zero calls, negative week-over-week, missing clip data)
- Pricebook completion calculation
- Opportunity total calculation (sum with dispute filter)

**Framework:** Jest + `@testing-library/react` for component tests. Neon `test` branch for database tests.

**What NOT to unit test in web:**
- Full page rendering — verify with acceptance criteria on real data instead
- Recharts components — visual output is not unit-testable meaningfully
- Stripe API responses — mock the Stripe client, test the handler logic

### 15.2 API Route Testing

Test each API route against the Neon `test` branch with a seeded test company:

| Route | Test Cases |
|---|---|
| `POST /api/calls/consent` | Happy path, missing sessionId, no org in session |
| `GET /api/calls/presign` | Happy path, expired session, invalid sessionId format |
| `POST /api/calls/upload-complete` | Happy path, BullMQ enqueue failure (mock), duplicate callId |
| `POST /api/webhooks/stripe` | Each of 5 event types, invalid signature |
| `POST /api/pricebook/import` | Valid CSV, malformed CSV, duplicate items, missing required columns |

### 15.3 End-to-End Validation Protocol

Run before each weekly sprint sign-off (the same test the mobile plan uses for the full stack):

1. New owner account created → `companies` record in Neon
2. Pricebook loaded with defaults → completion indicator at 0% (no owner-configured prices)
3. Tech invited → SMS sent (verify in Clerk or Twilio logs)
4. Call recorded on mobile → appears in `/dashboard/calls` with status "Processing"
5. Call scored → appears in review queue if opportunity > $1,500
6. Owner adds coaching note → appears in call detail
7. Weekly digest cron triggered manually → email received with correct numbers

---

## 16. Risk Register (Web-Specific)

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Vercel function timeout on dashboard queries** | Low | Medium | All Drizzle queries use indexed columns (`company_id`, `recorded_at`, `tech_id`). Verify query plans in Neon console before Week 7. If a query approaches 5s: add index or restructure. |
| **Recharts renders blank on first paint** | Medium | Low | Recharts requires browser DOM — ensure `TrendChart` is `'use client'` with a loading skeleton. Server-render the number; client-render the chart. |
| **Weekly digest email lands in spam** | Medium | High | Use a subdomain for transactional email (`notifications@kovahq.com`), configure SPF + DKIM in Resend, send first digest to owner and check deliverability before Drain Right launch. |
| **Stripe webhook replays causing duplicate activation emails** | Medium | Medium | Activation cron and webhook handlers are idempotent — check `activation_events` for existing record before creating. Log all webhook `event.id` values; reject duplicates. |
| **Owner disputes that the number is wrong (pricebook defaults)** | High | High | Pricebook completion banner is prominent until 70%+ configured. Every opportunity value tagged `(default)` while using industry averages. This framing must be correct before any owner sees the first number. |
| **`/admin` route accidentally exposed in product nav** | Low | Medium | Admin routes are server-gated by `ADMIN_USER_ID` env var check. Not linked from any product page. Access by URL only. |
| **Neon `dev` branch diverges from `main` schema** | Medium | Medium | Drizzle migration check runs in CI against `test` branch on every PR. Never run raw SQL on `dev` without a migration. `main` branch is always migrated before `dev`. |
| **Audio player waveform too slow to load for long calls** | Medium | Low | Pre-compute amplitude array server-side during call processing; store in `calls` table as JSONB. Client loads pre-computed array, not raw audio. Phase 2 optimization — Phase 1 fallback: simple `<progress>` bar. |

---

## 17. Phase 2 Web Preview

Not sprint-planned in this document. Listed for reference so Phase 1 architecture anticipates these without building them.

| Feature | Trigger | Notes |
|---|---|---|
| **Kova ROI Report** | Month 3 — after 30+ days of baseline data | Monthly report with cumulative opportunity framing, score improvement trend, tech-by-tech ROI |
| **Invoice matching dashboard** | Phase 2 ST integration | Estimated opportunity vs. actual invoice side-by-side; "capture rate" metric |
| **Full-text call search** | Phase 2 | Elasticsearch or Postgres full-text on transcript segments |
| **Clip sharing (expiring links)** | Phase 2 | Secure time-limited URLs for sharing individual coaching clips via email/SMS |
| **ServiceTitan integration UI** | Phase 2 | Settings page section for ST credentials, sync status, last sync time |
| **Pre-call context panel** | Phase 2 — ST integration | Job brief shown to manager alongside call record |
| **Spanish dashboard UI** | Phase 2+ | Full i18n via `next-intl`; Spanish strings as a second locale |
| **Leaderboard (team-facing)** | Phase 2 | Owner-toggleable; team comparison view on team performance page |
| **PE portfolio dashboard** | Phase 3 | Multi-company rollup for PE-owned groups |
| **Custom scoring weight editor** | Phase 3 | Team tier: owner configures dimension weights for their trade |

---

## 18. Open Decisions (Web-Specific)

Items that must be resolved before or during Phase 1.

### Before Phase 1 Kickoff

| Decision | Options | Deadline | Owner |
|---|---|---|---|
| **Annual billing as default — checkout UI** | Option A: Present annual first, monthly below it as "or pay monthly (higher rate)." Option B: Toggle between annual/monthly with annual pre-selected. Option A is recommended — monthly should feel like an opt-down, not an equal choice. | Week 10 | Founder |
| **Score dispute authority (web side)** | When tech disputes and manager adds a note — does the manager have authority to override the dispute (restore the opportunity to coaching view)? Product decision with legal implications. | Week 5 | Founder |

### Before Phase 2 Kickoff

| Decision | Options | Deadline | Owner |
|---|---|---|---|
| **Weekly digest timezone handling** | Simple: send all digests at Monday 7am UTC. Correct: store owner timezone in `companies` table and compute per-company UTC send time. Correct is better — implement it. | Week 11 | Engineering |
| **Clip sharing implementation** | Option A: Presigned S3 URL shared directly (short-lived, not trackable). Option B: Server-generated short URL that proxies the S3 audio (trackable, can be revoked). Option B is better for compliance. | Phase 2 planning | Engineering |

### External Dependencies to Track

| Item | Status | Follow-up |
|---|---|---|
| Drain Right owner email for weekly digest | Collect Week 11 | Required for live digest send |
| Drain Right pricebook prices | Collect Week 11 | Required before launch — no industry defaults for their core services on Day 1 |
| SPF/DKIM configuration for `kovahq.com` | Configure Week 10 in Resend | Required for email deliverability |
| Custom domain setup on Vercel | Configure Week 11 | `kovahq.com` → production deployment |
| Stripe production API keys (vs. test keys) | Switch Week 12 | Use test keys through Week 11; production keys only when Drain Right signs up |

---

*Document version: v1*
*Status: Living document — update prior to each sprint kickoff*
*Date: May 2026*
*Parent: `docs/development/development-plan-v2.md`*
*Phase 2 kickoff: update this document at Month 3 to incorporate ST integration UI, invoice matching dashboard, ROI report, and full-text search*
*See `docs/product/product-brief-v1.md` for full product requirements*
*See `docs/product/product-strategy-v1.md` for legal compliance and risk details*
