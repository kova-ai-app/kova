# Kova — Web Dashboard Development Plan v2

*Document scope: Next.js web dashboard, Phase 1 only (Weeks 1–12). Covers the owner/manager-facing application — onboarding, dashboard home, team performance, call review, pricebook management, billing, activation sprint, and design partner instrumentation.*

*Document version: v2*
*Status: Living document — update prior to each sprint kickoff*
*Date: May 2026*
*Parent document: `docs/development/development-plan-v2.md` — all unresolved questions defer to v2*
*Product requirements: `docs/product/product-brief-v1.md`*
*Legal/compliance: `docs/product/product-strategy-v1.md`*

> **Relationship to dev-plan-v2:** This document expands the web-specific sections of dev-plan-v2 into a standalone reference. Where the two documents conflict, dev-plan-v2 wins. Where this document adds detail not present in dev-plan-v2, this document is authoritative for web. Do not make web architecture decisions from dev-plan-v2 alone — always cross-reference here.

---

## Change Log — v1 → v2

The following corrections and decisions were resolved in the v1 gap analysis session (May 2026). Every change below is traceable to a specific finding.

### Factual Corrections Applied
| Item | v1 | v2 | Source |
|---|---|---|---|
| shadcn/ui CLI | `npx shadcn-ui@latest add` | `npx shadcn@latest add` | CLI package renamed; `shadcn-ui` is deprecated |
| Tailwind CSS | `≥ 3.x`, JS config | Tailwind 4, CSS-based config | Tailwind 4 is current stable for new projects |
| Drizzle ORM | `≥ 0.30` | `≥ 0.45` | Current stable is 0.45.x |
| Recharts | `≥ 2.x` | Removed | Recharts dropped entirely; text-based stats for Phase 1 |
| Next.js | "15" (ambiguous) | 15 (pinned, LTS) — acknowledge 16 exists | Decision: stay on 15 for ecosystem stability |
| Rilla funding | "no publicly disclosed funding" | "raised $12.5M Series A (Craft Ventures, late 2023)" | Publicly reported |

### Architecture Decisions Applied
| Decision | Choice | Rationale |
|---|---|---|
| Repo structure | Two repos: `web` (contains Next.js dashboard + Railway worker) and `mobile` | Monorepo overhead not warranted for solo founder; separate CI/CD for Vercel vs EAS; no shared package needed |
| Vercel cron | Vercel Pro ($20/mo) | Hobby plan crons limited to once-per-day minimum; Pro removes this |
| Clerk plan | Free tier, upgrade when hitting limit | 100 MRO free limit; Drain Right alone is ~18-20 users; monitor and upgrade reactively |
| Audio player | Simple `<audio>` + progress bar + seek buttons | Waveform visualization is 2-3 days; simple player is 1 day and delivers 80% of value |
| Dashboard stats | Text-based hero numbers + directional arrows | Recharts charts are sparse at 1-customer, 2-4 weeks of data |
| Pricebook onboarding | Quick guided form (5 key prices) | CSV import requires data prep owner doesn't have; guided form takes 3 minutes |
| Error monitoring | Sentry from Day 1 | Mobile plan already uses Sentry; web must match |
| Worker communication | Upstash Redis HTTP client on Vercel side | `ioredis` creates TCP connection per cold start; Upstash HTTP is serverless-native |
| Webhook deduplication | `processed_webhook_events` table | Stripe and Clerk can replay; idempotency must be explicit |
| Pre-dunning trigger | Diff `previous_attributes` on `customer.updated` | `customer.updated` fires on any update; must check if payment method actually changed |
| Rate limiting | `@upstash/ratelimit` middleware | 35+ API routes with no rate protection; authenticated user could exhaust function invocations |
| Caching | `unstable_cache` on dashboard queries | Hero number doesn't change between requests; re-querying on every page load is wasteful |
| Compliance dashboard | Recording-count-based (Phase 1) | Dispatch-linked compliance requires FSM data that doesn't exist in Phase 1 |
| CSV pricebook import | Deferred to Phase 2 | Replaced by quick guided form; owners don't have clean CSVs ready at onboarding |

### Cost Estimate Corrected
See §14.4 for updated infrastructure cost table. Total revised upward from ~$165-190/mo to ~$210-250/mo (~30% increase). Still <17% of Drain Right revenue at $1,513/mo.

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

**Timeline note:** The 12-week timeline for web + mobile + backend + worker is extremely ambitious for a solo founder. The web plan alone is 4-6 weeks of focused work for an experienced engineer. This timeline is aspirational. If scope must be cut, cut in this order: (1) admin/case-study export, (2) detailed compliance dashboard, (3) coaching note form. The number, the call review queue, and the audio player are non-negotiable.

---

## 1. Constraints

These are non-negotiable. Every architecture decision is made inside these boundaries.

### 1.1 Pilot Constraints

| Constraint | Detail |
|---|---|
| **Owner/manager audience only** | Technicians do not use the web dashboard. The web app is built for Drain Right's owner and any managers they designate. |
| **Single company, Phase 1** | Drain Right is the only company at launch. Multi-tenant support must be architecturally correct from Day 1, but no multi-company UI is needed. |
| **Owner is the decision-maker** | Every UX decision should be optimized for an owner who logs in Monday morning, looks at the number, and decides what to do about it. They are not a data analyst. |
| **Pricebook is required for the number to be real** | Without owner-configured pricebook prices, opportunity values default to industry averages and are explicitly tagged as such. Pricebook setup is a first-week priority. The guided form collects 5 key prices in ~3 minutes. |
| **California two-party consent** | Compliance dashboard surfaces any recording that lacks a consent timestamp. Owners need visibility into this — it is both a legal and product integrity concern. |

### 1.2 Engineering Constraints

| Constraint | Detail |
|---|---|
| **Solo founder** | No dedicated frontend engineer. Architecture must be maintainable alone. Use shadcn/ui components rather than building from scratch. Prefer Server Components where possible — less client-side state to manage. |
| **Two repos** | `web` and `mobile` are separate git repositories. The `web` repo contains both the Next.js dashboard (`src/`) and the Railway worker (`worker/`). Shared types between web and mobile (API response shapes) are defined in `web/src/types/api.ts` and manually copied into `mobile/src/types/api.ts` when they change. The Drizzle schema and BullMQ job types live in the `web` repo and are imported by the worker via relative paths — no shared package needed. |
| **Vercel deployment** | Zero-config deployment for Next.js. Requires Vercel Pro ($20/mo) for cron job functionality. All long-running work runs on Railway — Vercel handles only lightweight API routes (< 10s execution). |
| **TypeScript everywhere** | No JavaScript files. `pnpm typecheck` must pass before any merge. |
| **No App Router client components by default** | Default to React Server Components. Promote to `'use client'` only when interactivity is needed (forms, audio player). Document the reason at the top of any client component file. |
| **Next.js 15 (pinned)** | Staying on Next.js 15 for ecosystem stability and community resources. Next.js 16 (requiring React 19 and Node ≥ 20.9.0) is current stable but will be adopted in Phase 2. |
| **Tailwind 4** | New project; CSS-based config (`@import "tailwindcss"` replaces `@tailwind` directives). No `tailwind.config.js` — configuration lives in CSS. shadcn/ui supports Tailwind 4. |

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
| Waveform audio player | Simple `<audio>` player is sufficient for Phase 1; WaveSurfer deferred | Phase 2 |
| CSV pricebook import | Replaced by quick guided form at onboarding; CSV import deferred | Phase 2 |
| Dispatch-linked compliance | Requires FSM data; Phase 1 compliance is recording-count-based | Phase 2 |
| Recharts / chart visualizations | Text-based hero numbers are sufficient at 1-customer, 0-8 weeks of data | Phase 2 |

---

## 2. Tech Stack

### 2.1 Framework

**Next.js 15 (App Router) deployed on Vercel Pro — confirmed.**

The framework decision is settled in dev-plan-v2 §3.2. Summary:

- App Router with React Server Components keeps data fetching on the server — fewer round trips, less client-side state.
- SSR means owners see real data on first paint, not a skeleton.
- Vercel deployment is zero-config for Next.js — no Docker, no reverse proxy.
- TypeScript throughout; Drizzle schema and job types defined in `web/src/db/schema.ts` and `web/src/types/jobs.ts`; API types in `web/src/types/api.ts` (manually synced to mobile when changed).
- **Next.js 16 note:** Next.js 16 is current stable (as of May 2026) and requires React 19 and Node ≥ 20.9.0. The decision is to stay on Next.js 15 for Phase 1 due to ecosystem maturity and community resources. Upgrade to 16 is planned for Phase 2 kickoff.

### 2.2 Library Table

| Library | Version Target | Purpose |
|---|---|---|
| `@clerk/nextjs` | latest stable | Auth — owner/manager web sessions, Organization middleware |
| `drizzle-orm` | ≥ 0.45 | Type-safe database queries against Neon |
| `@neondatabase/serverless` | latest | HTTP-based Postgres connection for Vercel serverless functions |
| `@tanstack/react-query` | ≥ 5.x | Client-side data fetching and cache (used in client components only) |
| `zod` | ≥ 3.x | Request/response schema validation — defined in `web`, copied into `mobile` when API shapes change |
| `tailwindcss` | 4.x | Styling — CSS-based configuration (see §2.4) |
| `shadcn/ui` | component-by-component install | Component library (Radix-based, fully composable) |
| `react-email` | latest | Email template components |
| `resend` | latest | Email sending SDK |
| `stripe` | ≥ 14.x | Stripe Billing — checkout sessions, portal, webhook handler |
| `@aws-sdk/client-s3` | v3 | S3 presigned URL generation (server-side only) |
| `@upstash/redis` | latest | Redis HTTP client for Vercel-side job enqueue (serverless-safe; no TCP connection per cold start) |
| `@upstash/ratelimit` | latest | Per-user rate limiting on API routes |
| `bullmq` | ≥ 5.x | Job queue type definitions (enqueue only — processing runs on Railway) |
| `@sentry/nextjs` | latest | Error monitoring and performance tracing — configured from Day 1 |

**Removed from v1:**
- `recharts` — dropped; text-based stats are sufficient for Phase 1
- `ioredis` — replaced by `@upstash/redis` on the Vercel side (Upstash uses HTTP, no connection overhead per cold start). The Railway worker continues using `ioredis` for BullMQ processing.

### 2.3 Component Library — shadcn/ui

shadcn/ui components are installed individually into `src/components/ui/`. They are not a package dependency — they are source files that are modified directly.

**Install command (updated — `shadcn-ui` package is deprecated):**
```bash
npx shadcn@latest add button
```

**Phase 1 component set (install on first use):**
```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add table
npx shadcn@latest add dialog
npx shadcn@latest add form
npx shadcn@latest add input
npx shadcn@latest add select
npx shadcn@latest add badge
npx shadcn@latest add tabs
npx shadcn@latest add toast
npx shadcn@latest add progress
npx shadcn@latest add tooltip
npx shadcn@latest add dropdown-menu
npx shadcn@latest add avatar
npx shadcn@latest add separator
npx shadcn@latest add skeleton
npx shadcn@latest add alert
npx shadcn@latest add sheet
```

Do not install components you haven't needed yet. Add on first use.

### 2.4 Tailwind 4 Configuration

Tailwind 4 replaces `tailwind.config.js` with CSS-based configuration. There is no `tailwind.config.ts` in this project.

**`src/app/globals.css`:**
```css
@import "tailwindcss";

/* Theme customizations go here using @theme */
@theme {
  --color-brand-500: oklch(0.62 0.19 250);
  --color-brand-600: oklch(0.54 0.21 250);
  --font-sans: "Inter", system-ui, sans-serif;
  --radius: 0.5rem;
}
```

**`package.json` dev dependency:**
```json
{
  "devDependencies": {
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0"
  }
}
```

**Tailwind 4 syntax changes from v3:**
- `@tailwind base; @tailwind components; @tailwind utilities;` → `@import "tailwindcss";`
- `tailwind.config.js` → CSS `@theme` block
- Content detection is automatic in v4 (no `content` array needed)

### 2.5 Data Fetching Strategy

The web app uses two data fetching modes. The decision between them is made per-page, not per-feature:

| Mode | When to Use | Implementation |
|---|---|---|
| **React Server Component (RSC) + cache** | Data needed on first paint; changes at most when a new call is scored (not on every page load) | `async` Server Component calls Drizzle via `unstable_cache` with TTL |
| **React Query (client)** | Data that refreshes automatically; data driven by user interaction (filters, search); optimistic updates | `'use client'` component + `useQuery` / `useMutation` |

**Caching pattern for dashboard queries:**
```typescript
import { unstable_cache } from 'next/cache'

export const getWeeklyOpportunity = unstable_cache(
  async (companyId: string) => {
    // Drizzle query...
  },
  ['weekly-opportunity'],
  {
    revalidate: 300,  // 5 minutes — opportunity total doesn't change on every request
    tags: ['dashboard', 'opportunities'],
  }
)
```

Invalidate the cache when a new call is scored by calling `revalidateTag('opportunities')` in the webhook handler or cron.

**Rule:** Default to RSC + `unstable_cache`. Promote to React Query only when there is a concrete reason. The majority of the dashboard (home, team table, call library) is RSC. The audio player and any polling component is client.

---

## 3. Architecture

### 3.1 Folder Structure

```
web/                                  ← Standalone git repo (not a monorepo)
├── src/
│   ├── app/                          ← Next.js App Router
│   │   ├── layout.tsx                ← Root layout (ClerkProvider, SentryProvider, fonts)
│   │   ├── page.tsx                  ← Marketing/landing (or redirect to /dashboard)
│   │   ├── sign-in/[[...sign-in]]/
│   │   │   └── page.tsx              ← Clerk SignIn component
│   │   ├── sign-up/[[...sign-up]]/
│   │   │   └── page.tsx              ← Clerk SignUp component
│   │   ├── onboarding/
│   │   │   ├── layout.tsx            ← Onboarding shell (no sidebar)
│   │   │   ├── team/page.tsx         ← Step 1: Add techs
│   │   │   └── pricebook/page.tsx    ← Step 2: Quick pricebook setup (guided form)
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
│   │       │   └── [id]/route.ts
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
│   │       ├── cron/
│   │       │   ├── weekly-digest/route.ts
│   │       │   ├── activation-check/route.ts
│   │       │   ├── design-partner-snapshot/route.ts
│   │       │   └── dispute-rate-check/route.ts
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
│   │   │   ├── OpportunityHero.tsx   ← Large weekly opportunity number (server)
│   │   │   ├── TeamTable.tsx         ← Per-tech stats table (server)
│   │   │   ├── ReviewQueue.tsx       ← Call review queue (server)
│   │   │   ├── ComplianceWidget.tsx  ← Recording rate summary (server)
│   │   │   └── PricebookCompletionBanner.tsx
│   │   ├── calls/
│   │   │   ├── CallRow.tsx
│   │   │   ├── AudioPlayer.tsx       ← Simple audio player (client)
│   │   │   ├── TranscriptPanel.tsx   ← Synchronized transcript (client)
│   │   │   ├── ScoreBreakdown.tsx
│   │   │   ├── OpportunityList.tsx
│   │   │   └── CoachingNoteForm.tsx  ← (client, form)
│   │   ├── pricebook/
│   │   │   ├── PricebookTable.tsx
│   │   │   └── PricebookItemForm.tsx ← (client, form)
│   │   ├── onboarding/
│   │   │   ├── TeamSetupForm.tsx     ← (client, form)
│   │   │   └── QuickPricebookForm.tsx ← (client, guided 5-price form — replaces v1 PricebookSetupChoice)
│   │   └── billing/
│   │       ├── PlanCard.tsx
│   │       └── SeatManager.tsx       ← (client)
│   ├── lib/
│   │   ├── db.ts                     ← Drizzle client (Neon serverless)
│   │   ├── auth.ts                   ← Clerk server-side helpers
│   │   ├── s3.ts                     ← S3 presign helpers
│   │   ├── stripe.ts                 ← Stripe client instance
│   │   ├── queue.ts                  ← BullMQ enqueue via Upstash Redis HTTP
│   │   ├── upstash.ts                ← Upstash Redis HTTP client
│   │   ├── ratelimit.ts              ← Upstash rate limiter configuration
│   │   ├── resend.ts                 ← Resend client instance
│   │   ├── sentry.ts                 ← Sentry configuration helpers
│   │   └── constants.ts              ← Shared constants (thresholds, defaults)
│   ├── lib/queries/
│   │   ├── dashboard.ts              ← getWeeklyOpportunity, getTeamPerformance, etc.
│   │   ├── calls.ts                  ← getCallList, getCallDetail
│   │   └── compliance.ts             ← getComplianceData
│   └── middleware.ts                 ← Clerk auth middleware + rate limiting
├── emails/
│   ├── WeeklyDigest.tsx
│   ├── ActivationDay1.tsx
│   ├── ActivationDay7.tsx
│   ├── ActivationDay14.tsx
│   ├── PreDunning.tsx
│   └── PaymentFailed.tsx
├── public/
├── next.config.ts
├── sentry.client.config.ts
├── sentry.server.config.ts
├── vercel.json
└── package.json
```

**Removed from v1:**
- `TrendChart.tsx` — dropped (no Recharts)
- `CSVImport.tsx` — dropped (no CSV import in Phase 1)
- `OpportunityMarkers.tsx` — merged into `AudioPlayer.tsx` (simplified)
- `tailwind.config.ts` — Tailwind 4 uses CSS config; no `tailwind.config.ts`

### 3.2 App Router Page Structure

Every route under `/dashboard` requires a valid Clerk session with `role: owner | field_manager`. Every route under `/admin` additionally requires `role: owner` and a `ADMIN_USER_ID` check.

```
/                         → redirect to /dashboard (if authed) or /sign-in
/sign-in                  → Clerk SignIn
/sign-up                  → Clerk SignUp (owner creates account)
/onboarding/team          → Step 1: Add techs
/onboarding/pricebook     → Step 2: Quick guided pricebook form (5 key prices)
/dashboard                → Home: weekly opportunity, review queue, team summary
/dashboard/team           → Per-tech performance table + week-over-week
/dashboard/calls          → Call library (list view, filters)
/dashboard/calls/:callId  → Call detail (player, transcript, score, coaching)
/dashboard/compliance     → Recording compliance rates (recording-count-based in Phase 1)
/dashboard/pricebook      → Pricebook management (CRUD)
/dashboard/settings       → Company settings, consent language, alert thresholds
/dashboard/billing        → Subscription plan, seat count, portal link
/admin                    → Internal activation health overview (founder only)
/admin/case-study/:id     → Design partner case study data export
```

### 3.3 Server vs. Client Component Boundaries

Default to server; promote to client only for the reasons listed.

| Component | Type | Reason |
|---|---|---|
| Dashboard layout (sidebar, topbar) | Server | Static structure; reads auth from Clerk server-side |
| `OpportunityHero` | Server | Read from DB on first paint; no interaction |
| `TeamTable` | Server | Server-rendered table; no client interaction in Phase 1 |
| `ReviewQueue` | Server | Static list; mark-as-reviewed is a form POST (Server Action) |
| `CallRow` | Server | Static row |
| `AudioPlayer` | **Client** | Web Audio API, seek interaction, playback state |
| `TranscriptPanel` | **Client** | Synchronized scroll + seek on segment tap |
| `ScoreBreakdown` | Server | Static score display |
| `CoachingNoteForm` | **Client** | Form with optimistic update |
| `PricebookTable` | Server | Table render; edit actions are Server Actions |
| `PricebookItemForm` | **Client** | Controlled form fields, pricing model switching |
| `TeamSetupForm` | **Client** | Live invite management during onboarding |
| `QuickPricebookForm` | **Client** | Guided 5-price input form |
| `SeatManager` | **Client** | Add/remove seats with optimistic count |

### 3.4 Clerk Middleware Configuration (with Rate Limiting)

```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '60 s'),  // 100 req/min per user
  analytics: false,
})

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)',    // Clerk + Stripe webhooks must be unauthenticated
  '/api/cron/(.*)',        // Vercel cron routes — secured by CRON_SECRET in handler
])

const isAdminRoute = createRouteMatcher(['/admin(.*)'])
const isApiRoute = createRouteMatcher(['/api/(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return

  const { userId, orgId, orgRole } = await auth()

  // Unauthenticated: redirect to sign-in
  if (!userId) {
    return auth.redirectToSignIn()
  }

  // Rate limit authenticated API routes
  if (isApiRoute(req) && userId) {
    const { success } = await ratelimit.limit(userId)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests', code: 'RATE_LIMITED' }, { status: 429 })
    }
  }

  // No org attached yet: redirect to onboarding
  if (!orgId && !req.nextUrl.pathname.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/onboarding/team', req.url))
  }

  // Admin routes: owner role required
  if (isAdminRoute(req) && orgRole !== 'org:owner') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
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
import * as schema from '@/db/schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

**Rule:** `db` is imported only in Server Components, API route handlers, and server actions. Never in `'use client'` components. If client code needs data, it fetches via an API route.

**Schema location:** `src/db/schema.ts` lives in the `web` repo. The worker (`worker/`) imports it via a relative path since it shares the same repo. Mobile never imports the schema directly — it talks to the web API only.

### 3.6 Upstash Redis — Serverless-Safe Queue Enqueue

The Vercel-side queue enqueue uses Upstash Redis HTTP client — no TCP connection overhead per cold start.

```typescript
// src/lib/upstash.ts
import { Redis } from '@upstash/redis'

export const redis = Redis.fromEnv()
// Requires: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
```

```typescript
// src/lib/queue.ts
import { redis } from '@/lib/upstash'

// Enqueue a call processing job using Upstash Redis (HTTP-based, serverless-safe)
// The Railway worker uses ioredis + BullMQ to process these jobs
export async function enqueueCallProcessing(payload: {
  callId: string
  s3Keys: string[]
  jobMetadata: object | null
}) {
  // BullMQ uses a specific Redis key structure for its queues
  // Push to the BullMQ list key directly via Upstash HTTP
  const jobData = JSON.stringify({
    name: 'process-call',
    data: payload,
    opts: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    timestamp: Date.now(),
  })
  await redis.lpush('bull:call-processing:wait', jobData)
}
```

> **Note:** If the BullMQ key structure changes between versions, switch to Upstash QStash (`@upstash/qstash`) as an alternative HTTP-based job queue that doesn't require Redis key awareness. QStash free tier: 500 messages/day.

### 3.7 Error Monitoring — Sentry

Sentry is configured from Day 1 (Week 1). Free tier: 5,000 errors/month, 10,000 performance transactions/month — sufficient for Phase 1.

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,   // 10% of requests traced
  environment: process.env.NODE_ENV,
})
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.05,  // 5% of client-side requests
  environment: process.env.NODE_ENV,
  replaysOnErrorSampleRate: 0,  // No session replay in Phase 1
})
```

Wrap cron handlers and webhook handlers in `Sentry.withSentry` for automatic error capture. Do not log PII (owner name, company name, phone numbers) to Sentry — log `companyId`, `callId`, and error type only.

### 3.8 Database Index Definitions

These indexes are required for dashboard query performance. Define them in `src/db/schema.ts` alongside the table definitions. The queries below depend on these indexes existing.

```typescript
// src/db/schema.ts — indexes defined alongside table schemas
import { index, uniqueIndex } from 'drizzle-orm/pg-core'

// calls table indexes
export const callsCompanyRecordedAtIdx = index('calls_company_recorded_at_idx')
  .on(calls.companyId, calls.recordedAt)

export const callsTechIdIdx = index('calls_tech_id_idx')
  .on(calls.techId)

export const callsStatusIdx = index('calls_status_idx')
  .on(calls.status)

// opportunities table indexes
export const opportunitiesScoreIdIdx = index('opportunities_score_id_idx')
  .on(opportunities.scoreId)

export const opportunitiesDisputedAtIdx = index('opportunities_disputed_at_idx')
  .on(opportunities.disputedAt)

// processed_webhook_events table (deduplication)
export const webhookEventsEventIdIdx = uniqueIndex('webhook_events_event_id_idx')
  .on(processedWebhookEvents.eventId)
```

### 3.9 Webhook Event Deduplication

Stripe and Clerk can replay webhook events. Without deduplication, replayed events can send duplicate emails, create duplicate records, or double-fire activation events.

**Table definition (in `src/db/schema.ts`):**
```typescript
export const processedWebhookEvents = pgTable('processed_webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: text('event_id').notNull().unique(),   // Stripe or Clerk event.id
  source: text('source').notNull(),               // 'stripe' | 'clerk'
  processedAt: timestamp('processed_at').notNull().defaultNow(),
})
```

**Usage in webhook handlers:**
```typescript
// Before processing any webhook event:
async function isAlreadyProcessed(eventId: string, source: 'stripe' | 'clerk'): Promise<boolean> {
  const existing = await db.select()
    .from(processedWebhookEvents)
    .where(eq(processedWebhookEvents.eventId, eventId))
    .limit(1)
  return existing.length > 0
}

async function markProcessed(eventId: string, source: 'stripe' | 'clerk'): Promise<void> {
  await db.insert(processedWebhookEvents)
    .values({ eventId, source })
    .onConflictDoNothing()
}
```

**Pattern for every webhook handler:**
```typescript
export async function POST(req: Request) {
  // ... signature verification ...
  const event = stripe.webhooks.constructEvent(body, sig, secret)

  if (await isAlreadyProcessed(event.id, 'stripe')) {
    return Response.json({ received: true, duplicate: true })
  }

  // ... handle event ...

  await markProcessed(event.id, 'stripe')
  return Response.json({ received: true })
}
```

### 3.10 Error Handling Strategy

- **API routes:** All API routes return consistent error shapes:
  ```typescript
  interface APIError { error: string; code: string; status: number }
  ```
- **Server Components:** Wrap data fetches in try/catch; render error UI inline. Use Next.js `error.tsx` as a last resort.
- **Client Components:** React Query `isError` / `error` states are handled per component. Display user-appropriate messages — never raw error objects.
- **Unhandled errors:** Caught by Sentry and by Next.js root `error.tsx`. Shows "Something went wrong — refresh the page."

---

## 4. Page Inventory

### 4.1 Sign-In / Sign-Up

**`/sign-in`** and **`/sign-up`**
- Clerk's hosted components embedded in a centered card layout
- Sign-up collects: email (or Google SSO), company name, state (used for consent language defaults)
- On sign-up: Clerk webhook fires `organization.created` → Neon `companies` record created, `activation_events` Day 1 trigger fires
- On sign-in: redirect to `/dashboard` if org exists; redirect to `/onboarding/team` if no org

### 4.2 Onboarding — Team Setup (`/onboarding/team`)

**Purpose:** Owner adds their technicians so Kova can send SMS invites and link calls to specific techs.

**Layout:** Full-page, no sidebar. Progress indicator: Step 1 of 2.

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
- Owner can skip: "Skip for now — I'll add my team later" link → `/onboarding/pricebook`

### 4.3 Onboarding — Pricebook Setup (`/onboarding/pricebook`)

**Purpose:** Owner configures their prices so opportunity values reflect their actual revenue, not industry averages. Replaces the three-option card picker from v1 (start with defaults / CSV import / configure later). CSV import is deferred to Phase 2.

**Layout:** Full-page, no sidebar. Progress indicator: Step 2 of 2.

**Quick guided pricebook form (`QuickPricebookForm` — client component):**

```
Set your prices — takes about 3 minutes
Your prices make the numbers real. We'll use California defaults for anything you skip.

┌─────────────────────────────────────────────────────────────────────┐
│  Drain Snaking (standard)          $  [  325  ]   or skip →        │
│  Camera Inspection                 $  [  425  ]   or skip →        │
│  Hydrojetting                      $  [ 800  ]   or skip →         │
│  Maintenance Plan (annual)         $  [ 299  ]   or skip →         │
│  Water Heater Replacement          $  [ 1,800 ]   or skip →        │
└─────────────────────────────────────────────────────────────────────┘

California defaults pre-filled above. Update any price — skip the rest.

                               [ Save & Go to Dashboard → ]
```

**Behavior:**
- Pre-filled with California drain + plumbing defaults
- Owner edits prices for services they know; skips the rest
- "or skip →" clears the field and marks the item as using industry default
- Submit: `POST /api/pricebook` for each non-skipped price → redirect to `/dashboard`
- Skipped items remain in the pricebook as `is_default: true` — tagged `(default)` in opportunity lists
- The `PricebookCompletionBanner` is suppressed for 48 hours after completing this form, even if < 70% configured — owner already engaged; don't nag immediately

**Edge cases:**
- Owner skips all: redirect to `/dashboard`, completion banner shown, banner includes "Add your prices →" CTA
- Price below $0: inline validation error
- Price above $50,000: inline warning "Unusually high — confirm this is correct"

**Note on industry defaults:** The defaults pre-filled in this form are sourced from California drain + plumbing market data (see dev-plan-v2 §5.5). When a price is owner-configured, it overrides the default and the `is_default` flag is set to `false`. This flag propagates to all opportunity calculations immediately — no cache invalidation needed for future calls (scores read pricebook at scoring time).

### 4.4 Dashboard Home (`/dashboard`)

**Purpose:** The owner's Monday morning view. Show the number, show the context, show what needs attention.

**Data fetched (server-side, Drizzle + `unstable_cache` with 5-minute TTL):**
- Weekly opportunity total (sum of `opportunities.value_high` where `disputed_at IS NULL` and `created_at > 7 days ago`)
- Week-over-week change (compare to prior 7 days)
- Top 3 opportunity types this week (by dollar value)
- Call review queue: calls where `opportunity_total_high > 1500 OR overall_score < 50 OR (last_reviewed_at IS NULL AND created_at > 5 days ago)`, limit 5
- Recording rate this week
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
  Drain Snaking        $4,050

Since you started: $312,000 identified

┌─────────────────────────────────┐  ┌──────────────────────────────────┐
│  CALL REVIEW QUEUE              │  │  TEAM THIS WEEK                  │
│  5 calls need attention         │  │  12 / 16 techs recorded          │
│  ┌────────────────────────┐     │  │  Recording rate: 75%             │
│  │ M. Reyes · $2,100 opp  │     │  │  [View Team →]                   │
│  │ J. Santos · Score 42   │     │  └──────────────────────────────────┘
│  │ ...                    │     │
│  └────────────────────────┘     │
│  [View All Calls →]             │
└─────────────────────────────────┘
```

**No chart component on this page.** The weekly trend is communicated through the text arrow and percentage: `↑ 23% vs last week`. This is sufficient at Phase 1 data volumes and is faster to build and read.

**Cumulative total:** Always shown below the weekly number: *Since you started: $312,000 identified*. This anchors the owner to long-term value even when a given week is down.

**Opportunity footnote** (always visible):
> *Estimated opportunity reflects your pricebook prices. Actual revenue depends on customer need, timing, and context — not every flagged opportunity would have been accepted.*

**Empty state (no calls yet):**
```
No calls recorded yet.
Ask your team to record their first call — results appear here within 5 minutes.
[View Team Setup →]
```

**Week 1-2 expectation note (shown inline when < 20 total calls exist):**
```
You're in the early days — your first two weeks of data build the baseline.
The numbers become more meaningful as your team records more calls.
```

### 4.5 Team Performance (`/dashboard/team`)

**Purpose:** Per-tech view of performance over the past 7 days.

**Data fetched (server-side, cached 5 minutes):**
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

- Clicking a tech row → `/dashboard/calls?techId={id}`
- Score color: green ≥ 70, yellow 50–69, red < 50
- Recording rate color: green ≥ 65%, yellow 40–64%, red < 40%
- Week-over-week improvement: top 3 most-improved techs by score delta shown below table

### 4.6 Call Library (`/dashboard/calls`)

**Purpose:** Browse and filter all calls across the team.

**Filters (client-side state, URL query params):**
- Tech (select)
- Date range: this week / last week / this month / custom
- Job type: drain / plumbing / both / all
- Status: scored / processing / failed / all

**List view — per row:**
```
M. Reyes  ·  Tue May 5  ·  Drain  ·  32 min  ·  Score: 78  ·  $1,400–$1,700  ·  EN  ·  ◉ High quality
```

- Processing calls: spinner, "Processing..." — no score shown
- Failed calls: red badge "Processing failed"
- Pagination: 20 calls per page, "Load more" button

### 4.7 Call Detail (`/dashboard/calls/:callId`)

**Purpose:** Full call review — audio, transcript, score, coaching. This is where the number becomes credible.

**Data fetched (server-side, parallelized, no caching — must be fresh):**
- `Call` record
- `Transcript` segments (JSONB)
- `Score` with `dimensions` JSONB
- `Opportunities[]`
- `CoachingPoints[]`
- Presigned S3 audio URL (15-minute expiry, generated at render time)

**Layout — three panels:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  AUDIO PLAYER (client component)                                          │
│  [▶]  ████████████░░░░░░░░░░░░░░░░░  18:24 / 31:12                      │
│  Rewind 15s  Forward 15s  Speed 1×  0.75×  1.25×  1.5×  2×             │
│  Camera Inspection [4:12] ●  Maintenance Plan [22:45] ●                 │
└──────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────┐  ┌────────────────────────────────────────┐
│  TRANSCRIPT (client)        │  │  SCORE BREAKDOWN                       │
│  Tech  0:00                 │  │  Overall: 78 / 100                     │
│  "Hey there, I'm Marcus..." │  │  ┌────────────────────────────────┐     │
│  Customer  0:12             │  │  │ Diagnosis Quality       2/3   │     │
│  "Thanks for coming out..." │  │  │ Camera Inspection       3/3   │     │
│  ...                        │  │  │ Maintenance Plan        1/3   │     │
│  [segments highlighted as  │  │  │ Customer Education      2/3   │     │
│   audio plays]              │  │  │ Close Quality           2/3   │     │
│  Tap segment → seek audio   │  │  │ Customer Experience     3/3   │     │
│                             │  │  └────────────────────────────────┘     │
│                             │  │                                          │
│                             │  │  OPPORTUNITIES                          │
│                             │  │  ● Camera Inspection  $425  [4:12] →   │
│                             │  │  ● Maintenance Plan   $1,495 LTV        │
│                             │  │                                          │
│                             │  │  COACHING NOTES                         │
│                             │  │  [Add a coaching note...]               │
└────────────────────────────┘  └────────────────────────────────────────┘
```

**Audio player implementation (`AudioPlayer.tsx` — client component):**

The Phase 1 audio player is a simple, functional player. No waveform visualization — that is Phase 2.

```tsx
// 'use client'
// AudioPlayer.tsx — simple HTML5 audio player with opportunity seek buttons
// Phase 2: replace progress bar with WaveSurfer.js waveform visualization

interface AudioPlayerProps {
  audioUrl: string               // presigned S3 URL
  durationSec: number
  opportunities: Array<{
    id: string
    type: string
    clipStartSec: number
    label: string
  }>
}
```

Features:
- `<audio>` element with presigned URL `src`
- Play/pause, rewind 15s, forward 15s buttons
- `<progress>` element showing playback position; clickable to seek
- Speed controls: 0.75×, 1×, 1.25×, 1.5×, 2× — set via `audio.playbackRate`
- Opportunity seek buttons listed below the progress bar (not overlaid): clicking seeks to `clipStartSec`
- Dispatches `seek` custom event that `TranscriptPanel` listens to

**No waveform in Phase 1.** The waveform visualization (WaveSurfer.js or canvas-based) is Phase 2. The progress bar is sufficient for call navigation.

**Synchronized transcript (`TranscriptPanel.tsx` — client component):**
- Segment auto-scrolls and highlights as audio plays (keyed to `start_sec` / `end_sec`)
- Tap any segment → audio seeks to `start_sec`
- Speaker labels: "Tech" / "Customer" — inferred from diarization
- Language badges: `[ES]` prefix on Spanish-detected segments

**Coaching note form:**
- Textarea; submit via `POST /api/coaching/:callId/notes`
- Optimistic: note appears immediately, confirmed or rolled back

**Low-confidence overlay:** If `score.confidence_level = 'low'` → yellow banner: "This call scored with lower confidence — audio quality may have affected accuracy."

### 4.8 Pricebook Management (`/dashboard/pricebook`)

**Purpose:** Owner configures their service prices. No CSV import in Phase 1 — manual entry and edit only.

**Completion indicator:**
```
Pricebook completion: 6 / 11 services configured with your prices    ██████░░░░░  54%
```

**Table view:**
```
┌──────────────────────────────┬──────────────┬───────────────┬─────────┬────────┐
│  Service Name                │  Type        │  Your Price   │  Active │        │
├──────────────────────────────┼──────────────┼───────────────┼─────────┼────────┤
│  Camera Inspection           │  Fixed       │  $425         │  ✓      │  Edit  │
│  Maintenance Plan (annual)   │  Recurring   │  $299/yr ×5   │  ✓      │  Edit  │
│  Water Heater Replacement    │  Range       │  (default) ↑  │  ✓      │  Edit  │
└──────────────────────────────┴──────────────┴───────────────┴─────────┴────────┘

[+ Add Service]
```

Items using industry defaults tagged with `(default)` badge.

**CSV import:** Deferred to Phase 2. The `[Import CSV]` button from v1 is removed.

**Edit modal (`PricebookItemForm` — client):**
- Fixed: single price field
- Range: price low + price high
- Recurring: annual price + years → LTV displayed live

### 4.9 Admin Settings (`/dashboard/settings`)

**Sections:**
- Company profile (name, trade, state)
- Consent language (custom script override)
- Notification thresholds (opportunity alert, non-recording alert)
- Recording target (calls per tech per week)
- Team members (list + invite + remove)

### 4.10 Compliance Dashboard (`/dashboard/compliance`)

**Purpose:** Show the owner which techs are recording and which aren't.

**Phase 1 scope (recording-count-based):** Without FSM data, "Dispatched" jobs are unknown. Phase 1 compliance is: calls recorded this week vs. the recording target configured in settings. Dispatch-linked compliance (recording vs. dispatched jobs) is Phase 2.

**Banner (always shown in Phase 1):**
```
Compliance tracking is based on your recording target (5 calls/tech/week).
Connect your dispatch system for exact job-by-job tracking. [Learn More →]
```

**Layout:**

```
Recording Compliance — This Week
Target: 5 calls per tech per week

┌──────────────────┬──────────────┬──────────────┬─────────────┐
│  Technician      │  Target      │  Recorded    │  Rate       │
├──────────────────┼──────────────┼──────────────┼─────────────┤
│  M. Reyes        │  5           │  5           │  100% ●     │
│  J. Santos       │  5           │  3           │  60%  ●     │
│  A. Hernandez    │  5           │  5           │  100% ●     │
│  ...             │              │              │             │
└──────────────────┴──────────────┴──────────────┴─────────────┘

● green ≥ 65%  ● yellow 40–64%  ● red < 40%

TECHS BELOW TARGET THIS WEEK
  J. Santos — 3 of 5 target calls recorded
  R. Castillo — 2 of 5 target calls recorded
```

**Non-recording reasons logged (from mobile):**
```
"Customer declined"   ×3
"Technical issue"     ×2
"Emergency"           ×1
```

**Phase 2 upgrade path:** When the owner connects their FSM (ServiceTitan or other), the "Target" column becomes "Dispatched" and the "Rate" reflects actual job coverage. The UI spec for dispatch-linked compliance is in Phase 2 planning.

### 4.11 Billing & Subscription (`/dashboard/billing`)

**Sections:**

**Current Plan**
```
Plan: Starter · 17 seats · Annual billing
$89/seat/year  ·  10 months remaining
Next invoice: $1,513 on April 2027
```

**Seat Management (`SeatManager` — client)**
- Current seat count; active techs count
- "+ Add seats" / "- Remove seats" buttons → `PUT /api/billing/seats` → Stripe quantity update
- Confirmation before reducing seats

**Billing portal**
- "Manage billing, update card, download invoices →" → `POST /api/billing/portal` → Stripe Customer Portal

**Trial / payment failed states** — see §8.3.

### 4.12 Internal Admin (`/admin`)

**Access:** Clerk `orgRole = 'org:owner'` AND `userId === process.env.ADMIN_USER_ID`. Not linked from any product UI.

**Activation health table — same as v1.** Server Component, refresh to update.

---

## 5. API Routes

All routes are implemented as Next.js App Router route handlers. All routes except `/api/webhooks/*` and `/api/cron/*` require a valid Clerk session.

### 5.1 Audio Upload Flow

**`GET /api/calls/presign`**
```typescript
interface PresignResponse {
  uploadUrl: string       // S3 presigned PUT URL (15-min expiry)
  s3Key: string           // 'audio/{companyId}/{sessionId}/chunk_{n}.aac'
  expiresAt: string
}
```

**`POST /api/calls/consent`**
```typescript
interface ConsentRequest {
  sessionId: string; techId: string; companyId: string
  consentedAt: string; devicePlatform: 'ios' | 'android'
}
interface ConsentResponse {
  callId: string; consentLoggedAt: string
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

**`POST /api/calls/upload-complete`** — Enqueues job via Upstash Redis HTTP. Returns 202.
```typescript
interface UploadCompleteRequest {
  callId: string; sessionId: string
  s3Keys: string[]
  totalDurationSec: number; chunkCount: number
  jobMetadata: { customerName?: string; jobType: 'drain' | 'plumbing' | 'both'; notes?: string } | null
  devicePlatform: 'ios' | 'android'
  audioFormat: 'aac-lc'; audioBitrateKbps: 32; audioChannels: 1
}
interface UploadCompleteResponse {
  callId: string; status: 'processing'; estimatedCompletionSec: number
}
```

Implementation:
```typescript
// upload-complete/route.ts
import { enqueueCallProcessing } from '@/lib/queue'  // Upstash HTTP — no TCP overhead

await enqueueCallProcessing({ callId, s3Keys, jobMetadata })
```

### 5.2 Calls & Dashboard

**`GET /api/calls`** — paginated, company-scoped
```typescript
interface CallListResponse {
  calls: CallSummary[]; nextPage: number | null; total: number
}
```

**`GET /api/calls/:id`** — full detail
```typescript
interface CallDetailResponse {
  call: Call; transcript: TranscriptSegment[] | null
  score: Score | null; opportunities: Opportunity[]
  coachingPoints: CoachingPoint[]
}
```

**`GET /api/calls/:id/audio`** — presigned S3 GET URL (1-hour expiry)
```typescript
interface AudioUrlResponse { url: string; durationSec: number }
```

**`GET /api/dashboard/summary`** — weekly numbers (cached 5 min)
```typescript
interface DashboardSummaryResponse {
  opportunityTotalLow: number; opportunityTotalHigh: number
  opportunityChangePct: number
  cumulativeTotal: number
  topOpportunityTypes: Array<{ type: string; totalValue: number }>
  reviewQueueCount: number
  complianceRate: number
  pricebookCompletionPct: number
}
```

**`GET /api/dashboard/team`** — per-tech performance (cached 5 min)
```typescript
interface TeamPerformanceResponse {
  techs: Array<{
    id: string; name: string; avgScore7d: number
    avgOpportunityPerCall: number; callsThisWeek: number
    recordingRate: number; scoreTrendPct: number
  }>
}
```

**`GET /api/dashboard/compliance`** — compliance data (cached 5 min)
```typescript
interface ComplianceResponse {
  overallRate: number; recordedCount: number; targetCount: number
  // Phase 1: target-based (no dispatchedCount)
  techCompliance: Array<{
    techId: string; name: string; target: number
    recorded: number; rate: number
  }>
  nonRecordingReasons: Record<string, number>
}
```

### 5.3 Pricebook

**`GET /api/pricebook`** — list all items
**`POST /api/pricebook`** — create item
**`PUT /api/pricebook/:id`** — update item
**`DELETE /api/pricebook/:id`** — soft delete (`active = false`)

```typescript
interface PricebookItemInput {
  name: string; trade: 'drain' | 'plumbing' | 'both'
  opportunityType: OpportunityType
  pricingModel: 'fixed' | 'range' | 'recurring'
  priceFixed?: number; priceLow?: number; priceHigh?: number
  isRecurring?: boolean; ltvAnnual?: number; ltvYears?: number
  active: boolean
}
```

**Note:** `POST /api/pricebook/import` (CSV import) is removed from Phase 1.

### 5.4 Coaching

**`POST /api/coaching/:callId/notes`**
```typescript
interface CoachingNoteRequest { text: string }
// Response: { id: string; createdAt: string }
```

**`PUT /api/coaching/:pointId/review`** — mark reviewed
```typescript
// Response: 204 No Content
```

**`POST /api/opportunities/:id/dispute`**
```typescript
interface DisputeRequest {
  reason: 'existing_service' | 'offered_declined' | 'not_relevant' | 'affordability' | 'other'
  notes?: string
}
// Response: 204 No Content
```

### 5.5 Billing (Stripe)

**`POST /api/billing/checkout`**
```typescript
interface CheckoutRequest {
  plan: 'starter' | 'pro' | 'team'
  billingInterval: 'annual' | 'monthly'
  seatCount: number
}
interface CheckoutResponse { url: string }

const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: STRIPE_PRICE_IDS[plan][billingInterval], quantity: seatCount }],
  subscription_data: { trial_period_days: 14 },
  success_url: `${APP_URL}/dashboard?checkout=success`,
  cancel_url: `${APP_URL}/dashboard/billing`,
  customer_email: ownerEmail,
  metadata: { companyId: orgId, plan, billingInterval },
})
```

**`POST /api/billing/portal`**
```typescript
// Response: { url: string }
const session = await stripe.billingPortal.sessions.create({
  customer: company.stripeCustomerId,
  return_url: `${APP_URL}/dashboard/billing`,
})
```

### 5.6 Webhooks

**`POST /api/webhooks/stripe`** — all events deduplicated via `processedWebhookEvents` table.

Events handled:
- `checkout.session.completed` → update subscription record
- `customer.subscription.updated` → update plan/seats
- `customer.subscription.deleted` → set `plan = 'cancelled'`
- `invoice.payment_failed` → set `paymentFailed = true`, `gracePeriodEnd = +7 days`
- `invoice.payment_succeeded` → clear `paymentFailed`
- `customer.updated` → pre-dunning check (see below)

**Fixed pre-dunning logic (v1 bug corrected):**

`customer.updated` fires on ANY customer update — name changes, metadata writes, email updates. The v1 implementation would trigger pre-dunning emails on any update. The correct implementation diffs `previous_attributes`:

```typescript
case 'customer.updated': {
  const customer = event.data.object as Stripe.Customer
  const prevAttrs = event.data.previous_attributes as Partial<Stripe.Customer>

  // Only check expiry if the default payment method actually changed
  if (!prevAttrs.invoice_settings?.default_payment_method) break

  const pmId = customer.invoice_settings?.default_payment_method
  if (!pmId || typeof pmId !== 'string') break

  const pm = await stripe.paymentMethods.retrieve(pmId)
  if (pm.type !== 'card' || !pm.card) break

  const { exp_month, exp_year } = pm.card
  const expiry = new Date(exp_year, exp_month - 1, 1)
  const daysUntilExpiry = Math.floor((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
    // Send pre-dunning email
    const company = await getCompanyByStripeCustomerId(customer.id as string)
    if (company) {
      await resend.emails.send({
        from: 'notifications@kovahq.com',
        to: company.ownerEmail,
        subject: 'Your card on file is expiring soon',
        react: PreDunning({ expiryDate: expiry.toDateString(), billingPortalUrl: '...' }),
      })
    }
  }
  break
}
```

**`POST /api/webhooks/clerk`** — all events deduplicated.

Events handled:
- `organization.created` → create `companies` record; fire Day 1 activation email
- `organizationMembership.created` → create/update `users` record, set role
- `organizationMembership.deleted` → deactivate user in Neon
- `user.updated` → sync name/phone changes

### 5.7 Admin (Internal)

**`GET /api/admin/health`**
```typescript
interface HealthResponse {
  queueDepth: number; processingErrors24h: number
  avgProcessingTimeSec: number; companyHealth: Array<{
    companyId: string; name: string; callsThisWeek: number
    recordingRate: number; activationHealth: 'green' | 'yellow' | 'red'
  }>
}
```

**`GET /api/admin/case-study/:companyId?from=&to=`**
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

**`GET /api/admin/activation`** — activation health per company (same as v1).

### 5.8 Team & Users

**`GET /api/team`**, **`POST /api/team/invite`**, **`PUT /api/team/:userId/role`**, **`DELETE /api/team/:userId`**, **`GET /api/team/me`** — same as v1.

---

## 6. Key Drizzle Query Patterns

### 6.1 Weekly Opportunity Total (with cache)

```typescript
// lib/queries/dashboard.ts
import { db } from '@/lib/db'
  import { opportunities, scores, calls } from '@/db/schema'
import { and, eq, gte, isNull, sum } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'

export const getWeeklyOpportunity = unstable_cache(
  async (companyId: string) => {
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
  },
  ['weekly-opportunity'],
  { revalidate: 300, tags: ['opportunities'] }
)
```

### 6.2 Cumulative Opportunity Total

```typescript
export const getCumulativeOpportunity = unstable_cache(
  async (companyId: string) => {
    const result = await db
      .select({ total: sum(opportunities.valueHigh) })
      .from(opportunities)
      .innerJoin(scores, eq(opportunities.scoreId, scores.id))
      .innerJoin(calls, eq(scores.callId, calls.id))
      .where(
        and(
          eq(calls.companyId, companyId),
          isNull(opportunities.disputedAt),
        )
      )
    return result[0]?.total ?? 0
  },
  ['cumulative-opportunity'],
  { revalidate: 600, tags: ['opportunities'] }
)
```

### 6.3 Per-Tech Performance

```typescript
export const getTeamPerformance = unstable_cache(
  async (companyId: string) => {
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
  },
  ['team-performance'],
  { revalidate: 300, tags: ['dashboard'] }
)
```

### 6.4 Call Review Queue

```typescript
export async function getCallReviewQueue(companyId: string, limit = 10) {
  // No cache — must be fresh (owner actions should reflect immediately)
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

### 6.5 Dispute Rate per Opportunity Type

```typescript
export async function getDisputeRates(companyId: string) {
  // Used by weekly cron job — no cache needed
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

Sent every Monday at 7am UTC via Vercel Cron (Pro plan) + Resend.

**Timezone note:** Vercel crons run in UTC only. The cron fires at `0 7 * * 1` (Monday 7am UTC). This is Monday at 11pm Pacific Sunday / 7am UTC — acceptable for Phase 1. Phase 2: store owner timezone in `companies` table and offset per company.

**Template: `emails/WeeklyDigest.tsx`** — same as v1. Key design principles:
- All numbers visible without clicking through
- Cumulative total always shown
- Directional arrow + percentage for week-over-week trend (no chart in email)

```tsx
// Core structure (same as v1 — no changes needed)
export function WeeklyDigest({ ownerName, weekOpportunityHigh, weekChangePct, cumulativeTotal, ... }) {
  return (
    <Html>
      <Body>
        <Container>
          <Text>Estimated opportunity this week</Text>
          <Text style={{ fontSize: 48, fontWeight: 700 }}>
            ${weekOpportunityHigh.toLocaleString()}
          </Text>
          <Text>
            {weekChangePct >= 0 ? '↑' : '↓'} {Math.abs(weekChangePct)}% vs last week
          </Text>
          <Text>Since you started: ${cumulativeTotal.toLocaleString()} identified</Text>
          {/* Top types, top performer, highlight clips, footnote */}
        </Container>
      </Body>
    </Html>
  )
}
```

### 7.2 Activation Sprint Emails

Four automated emails — same triggers as v1. Templates: `ActivationDay1`, `ActivationDay7`, `ActivationDay14` (automated email), Day 30 (flag for founder, no automated email).

### 7.3 Vercel Cron Configuration

**Requires Vercel Pro.** Hobby plan crons have a minimum interval of once per day and lack precise scheduling — Pro removes this restriction.

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/weekly-digest",
      "schedule": "0 7 * * 1"
    },
    {
      "path": "/api/cron/activation-check",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/design-partner-snapshot",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/dispute-rate-check",
      "schedule": "0 8 * * 1"
    }
  ]
}
```

**All cron routes require `CRON_SECRET` verification:**
```typescript
export async function GET(req: Request) {
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... handler ...
}
```

**Cron handlers:**
- **`/api/cron/weekly-digest`:** For each active company: compute data → render `WeeklyDigest` → send via Resend → log `activation_events`.
- **`/api/cron/activation-check`:** Idempotent Day 7, 14, 30 checks — see §11.1.
- **`/api/cron/design-partner-snapshot`:** Daily snapshot per company → `design_partner_snapshots`.
- **`/api/cron/dispute-rate-check`:** Check dispute rates; flag > 40% in `/admin`.

---

## 8. Notifications & Alerts

### 8.1 High-Opportunity Alert

Triggered by Railway worker after scoring, when `opportunity_total_high > threshold`.

- Push notification to owner (FCM): *"$2,100 opportunity — M. Reyes, just now"*
- Email via Resend (immediate, not batched)

### 8.2 Tech Not Recorded Alert

Triggered by Railway worker if tech has `last_call_date < 3 days ago`.

- Push to owner: *"J. Santos hasn't recorded in 4 days"*
- Shown in `/dashboard/compliance`

### 8.3 Payment Failed In-App Banner

Triggered by `invoice.payment_failed` webhook → `company.payment_failed = true`.

```
⚠️ Payment failed — update your payment method to keep recording.
[Update Payment Method →]
```

Banner clears when `invoice.payment_succeeded` fires. Same flag read by mobile via `GET /api/team/me → company.paymentFailed`.

---

## 9. Onboarding Flow (Detailed)

### 9.1 Owner Onboarding Sequence

Target: < 35 minutes from account creation to first scored call delivered.

```
1. Owner visits kovahq.com → "Start Free Trial"
2. /sign-up: email + password (or Google SSO)
   → Clerk creates user + Organization
   → Clerk webhook: organization.created
   → Neon: companies record created (plan='trial', state='CA' default)
   → activation_events Day 1 created; welcome email queued
3. Redirect to /onboarding/team
4. Owner enters tech names + phone numbers (or skips)
   → POST /api/team/invite per tech → SMS sent to each tech
5. Redirect to /onboarding/pricebook
6. Owner completes QuickPricebookForm (5 key prices, ~3 minutes)
   → POST /api/pricebook for each non-skipped price
7. Redirect to /dashboard (empty state with CTA)
8. Owner shares with techs: "Kova is ready — record your first call"
9. Tech receives SMS, downloads app, records first call
10. Call processed (< 5 min) → push notification to tech + owner
11. Owner logs back in → sees first call + first dollar figure
```

### 9.2 Empty State Strategy

| Page | Empty State Copy | CTA |
|---|---|---|
| Dashboard Home | "No calls recorded yet. Ask your team to record their first call — results appear here within 5 minutes." | "View Team Setup →" |
| Call Library | "No calls match your filters." | Reset filters / same as home empty if zero calls total |
| Team Performance | "No scored calls this week. Recording rate picks up after the first few days." | "Check Compliance →" |
| Compliance | "Set your recording target in Settings to track compliance here." | "Go to Settings →" |
| Pricebook | (Never empty — defaults always loaded) | N/A |

---

## 10. Churn Prevention

### 10.1 Involuntary Churn — All 6 Measures

| Measure | Implementation | Week |
|---|---|---|
| **Smart Retries** | Enable in Stripe Dashboard → Billing → Automatic retries. Zero code. | 10 |
| **7-day grace period** | `invoice.payment_failed` → `paymentFailed = true`, `gracePeriodEnd = +7 days`. Access restricted at `gracePeriodEnd`. | 10 |
| **Pre-dunning email** | `customer.updated` → diff `previous_attributes` → check card expiry → `PreDunning` email. Fixed from v1. | 10 |
| **In-app payment failed banner** | `paymentFailed = true` → banner on all dashboard pages + mobile. | 10 |
| **ACH/bank debit** | Enable ACH Direct Debit in Stripe Dashboard. Zero code. | 10 |
| **Account Updater** | Enable in Stripe Dashboard → Card updates. Zero code. | 10 |

### 10.2 Voluntary Churn Defense

Cumulative ROI framing — always show both weekly and cumulative totals. If weekly opportunity drops > 30% vs. prior week: show improvement framing:
> *Your team's estimated opportunity dropped from $X to $Y — that means they're capturing more of what they find. Cumulative total: $Z identified since you started.*

### 10.3 Stripe Webhook Handler

See §5.6 for full implementation. Key changes from v1:
1. All events deduplicated via `processedWebhookEvents` table
2. Pre-dunning logic uses `previous_attributes` diff (fixes v1 false-positive bug)

---

## 11. Activation Sprint

### 11.1 Trigger Logic

```typescript
// app/api/cron/activation-check/route.ts
// Idempotent — checks existing activation_events before creating

export async function GET(req: Request) {
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const activeCompanies = await db.select().from(companiesTable).where(eq(companiesTable.plan, 'active'))

  for (const company of activeCompanies) {
    const daysActive = Math.floor((Date.now() - company.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    const callCount = await getCallCount(company.id)
    const recordingRate = await getRecordingRate(company.id)

    if (daysActive >= 7 && daysActive < 8) {
      const alreadyTriggered = await getActivationEvent(company.id, 'day_7_check')
      if (!alreadyTriggered && callCount < 10) {
        await createActivationEvent(company.id, 'day_7_check')
        await sendActivationEmail(company, 'day_7')
      }
    }

    if (daysActive >= 14 && daysActive < 15) {
      const alreadyTriggered = await getActivationEvent(company.id, 'day_14_check')
      if (!alreadyTriggered && callCount < 10) {
        await createActivationEvent(company.id, 'day_14_check')
        await sendActivationEmail(company, 'day_14')
      }
    }

    if (daysActive >= 30 && daysActive < 31) {
      const alreadyTriggered = await getActivationEvent(company.id, 'day_30_escalation')
      if (!alreadyTriggered && (callCount < 30 || recordingRate < 0.4)) {
        await createActivationEvent(company.id, 'day_30_escalation')
        // No email — flag in /admin for founder personal outreach
      }
    }
  }

  return Response.json({ ok: true })
}
```

### 11.2 Internal CS Dashboard (`/admin`)

Activation health algorithm — same as v1:
- **Green:** ≥ 10 calls in first 7 days AND recording rate ≥ 50%
- **Yellow:** 5–9 calls, OR rate 30–49%
- **Red:** < 5 calls, OR rate < 30%, OR no calls in past 5 days

---

## 12. Design Partner Instrumentation

### 12.1 Per-Company Daily Snapshots

Same as v1. `design_partner_snapshots` table populated by daily cron.

### 12.2 Case Study Export Endpoint

```
GET /api/admin/case-study/drain-right?from=2026-05-01&to=2026-05-31
```

Returns same shape as v1 (see §12.2 v1). The `/admin/case-study/:id` page renders this as a formatted page for screenshot / copy.

---

## 13. Weekly Sprint Plan (Web Deliverables)

### Week 1 — Web Scaffolding

**Goal:** `web/` compiles, deploys to Vercel, returns 200 from every route. Zero features.

**Web deliverables:**
- Next.js 15 project initialized in `web/` (standalone repo)
- Tailwind 4 configured (`@import "tailwindcss"` in `globals.css`, no `tailwind.config.ts`)
- shadcn/ui init: `npx shadcn@latest init` — select CSS variables, Tailwind 4
- Base components installed: `button`, `card`, `input`
- Clerk middleware configured — `/sign-in` and `/sign-up` work
- `src/lib/db.ts` — Drizzle + Neon HTTP connected to `dev` branch
- `src/lib/upstash.ts` — Upstash Redis HTTP client initialized
- `src/lib/sentry.ts` + `sentry.client.config.ts` + `sentry.server.config.ts` — Sentry configured
- `src/lib/ratelimit.ts` — Upstash rate limiter configured
- `src/db/schema.ts` created — Drizzle table definitions, indexes, and `processed_webhook_events` table
- `src/types/api.ts` created — API request/response types (source of truth; manually synced to mobile)
- `src/types/jobs.ts` created — BullMQ job payload types (imported by `worker/` via relative path)
- `src/lib/stripe.ts`, `src/lib/resend.ts`, `src/lib/queue.ts` — client instances (not yet called)
- Deployed to Vercel Pro (main branch → production, dev branch → preview)
- `/api/admin/health` route returns `{ status: 'ok' }` (used by mobile CI)
- `.env.example` — every variable named and described
- `vercel.json` — cron routes registered (all in dry-run initially)

**Acceptance criteria:**
- `pnpm typecheck` passes with zero errors
- Vercel Pro deployment succeeds (confirm Pro plan active before deploying crons)
- Clerk sign-in renders at `/sign-in`
- Drizzle connects to Neon `dev` branch without error
- Sentry test event appears in Sentry dashboard

**Dependencies from backend:**
- Neon project created with `main`, `staging`, `dev`, `test` branches
- Clerk: Organizations enabled, custom roles defined
- Upstash Redis instance created (used by web rate limiter + queue enqueue, and by the worker)

---

### Week 2 — Auth, Webhooks, and Data Layer

**Goal:** Owners can create accounts. Clerk events sync to Neon. Role-based access works.

**Web deliverables:**
- Owner sign-up: email/password + Google SSO → Neon `companies` record created
- Clerk webhook handler with deduplication: `organization.created` → company record, `organizationMembership.created` → user record
- `processed_webhook_events` table integrated into webhook flow
- Role-based middleware: `owner` and `field_manager` access `/dashboard`; `technician` role redirected
- Onboarding redirect: new owner with no org → `/onboarding/team`
- Seed script: test company + owner + 2 techs

**Acceptance criteria:**
- New owner signs up → `companies` and `users` records in Neon `dev`
- `field_manager` can access `/dashboard`; unauthenticated user redirects to sign-in
- Replaying the same Clerk webhook event is idempotent (no duplicate company record)
- `pnpm typecheck` passes

---

### Week 3 — No Web Sprint (Recording Engine — Mobile Critical Gate)

**Web tasks (supporting):**
- `POST /api/calls/consent` and `POST /api/calls/decline` — mobile gate dependency
- `GET /api/calls/presign` — mobile needs in Week 4; start now
- These three endpoints are the minimum API surface mobile needs this week

**Acceptance criteria:**
- `POST /api/calls/consent` creates `calls` record with `consent_logged_at`, returns `{ callId }`
- `GET /api/calls/presign` generates valid S3 presigned URL
- Mobile recording gate unblocked

---

### Week 4 — Upload Pipeline & Call Storage

**Goal:** Audio arrives in S3, call record exists in Neon, job enqueued via Upstash.

**Web deliverables:**
- `POST /api/calls/upload-complete` — enqueues via `@upstash/redis` HTTP (not `ioredis`)
- `GET /api/calls` — paginated list, company-scoped
- `GET /api/calls/:id` — call detail (status, metadata — no score yet)
- Basic call library page (`/dashboard/calls`) — server-rendered from Drizzle
- Verify jobs appear in Railway Bull Board

**Acceptance criteria:**
- Record a call on mobile → upload completes → call appears in `/dashboard/calls` with status "Processing"
- BullMQ job visible in Bull Board in `call-processing` queue
- Upstash HTTP client used (no `ioredis` import on Vercel side)
- `pnpm typecheck` passes

---

### Week 5 — No Web Sprint (Rules Engine — Backend)

**Web tasks:**
- Stub all remaining API routes (return 501 Not Implemented)
- Write Drizzle queries for dashboard home, team, compliance — stub data for now
- Begin onboarding page layout (static HTML/CSS)

---

### Week 6 — No Web Sprint (LLM Layer — Backend)

**Web tasks:**
- Wire `GET /api/dashboard/summary` with real Drizzle queries (no scores yet — returns zeros)
- Dashboard home renders with real call count, empty opportunity total
- Begin call detail page layout — audio player shell (client component, no audio yet)

---

### Week 7 — Owner Dashboard, Team View, Compliance

**Goal:** Owner can log in and see real data. Dashboard home shows the number.

**Web deliverables:**
- Dashboard home: weekly opportunity total (with `unstable_cache`), cumulative total, trend arrow + %, top 3 types, review queue, team compliance rate
- Team performance table: per-tech data from Drizzle
- Call library: list with score + opportunity columns, date/tech filter
- Compliance dashboard: recording-rate-based (Phase 1), target vs. recorded per tech
- All three dashboard API routes implemented with real queries and 5-minute cache
- Pricebook completion indicator shown if < 70% configured

**Acceptance criteria:**
- Owner logs in after a scored call exists → sees correct opportunity total on dashboard home
- Team table shows correct per-tech avg score and opportunity/call
- Compliance shows recording rate vs. target per tech
- Page loads < 2s on Vercel preview (verify with browser DevTools)
- `pnpm typecheck` passes; `pnpm lint` passes

---

### Week 8 — Call Detail, Audio Player, Weekly Digest

**Goal:** Owner can review any call in full. Weekly digest email sends correctly.

**Web deliverables:**
- Call detail page: three-panel layout
- `AudioPlayer` client component: `<audio>` + progress bar + seek buttons + speed controls (no waveform)
- `TranscriptPanel` client component: segments with speaker labels, auto-scroll, tap-to-seek
- `ScoreBreakdown`: per-dimension scores, reasoning text
- Coaching note form: `POST /api/coaching/:callId/notes` — optimistic update
- `GET /api/calls/:id/audio` — presigned S3 GET URL (1-hour expiry)
- `emails/WeeklyDigest.tsx` — renders correctly in React Email preview
- Vercel cron registered in `vercel.json` — all in dry-run until Week 11

**Acceptance criteria:**
- Open a scored call → audio plays, transcript highlights as audio plays, tapping segment seeks audio
- Opportunity seek buttons visible below progress bar; clicking seeks to correct timestamp
- Coaching note submitted → appears immediately
- `emails/WeeklyDigest.tsx` renders correctly in `pnpm email dev`

---

### Week 9 — Pricebook Management & Admin Settings

**Goal:** Owner can configure their pricebook. All services configurable via edit modal.

**Web deliverables:**
- Pricebook page: CRUD table, completion indicator
- Pricebook item edit modal: fixed, range, recurring pricing models, LTV preview
- Active/inactive toggle
- Industry defaults pre-seeded on new company creation
- Default price tagging: `is_default: true` items show `(default)` badge
- Admin settings page: company name, state, consent language, notification thresholds, recording target
- Pricebook completion banner driven by real completion query

**No CSV import.** Removed from Phase 1.

**Acceptance criteria:**
- Change camera inspection price to $450 → next scored call shows $450
- Completion indicator: 7/11 configured → 64%, banner shown; 8/11 → 73%, banner hidden
- `pnpm typecheck` passes

---

### Week 10 — Billing, Churn Prevention, High-Opportunity Alerts

**Goal:** Full billing live. All 6 churn prevention measures active. Real-time alerts work.

**Web deliverables:**
- Billing page: plan display, seat manager, portal link, trial/failed states
- Stripe Checkout: `POST /api/billing/checkout` with annual default, 14-day trial
- Stripe Customer Portal: `POST /api/billing/portal`
- Stripe webhook handler: all 5 event types with deduplication + fixed pre-dunning logic
- Payment failed in-app banner: `paymentFailed = true` → banner on all dashboard pages
- Pre-dunning email: `customer.updated` webhook diffs `previous_attributes` (see §5.6)
- ACH and Account Updater: enabled in Stripe Dashboard
- `/api/admin/health` returns real data

**Acceptance criteria:**
- Stripe test checkout session → complete → company plan updated in Neon
- Test `invoice.payment_failed` event → payment failed banner appears < 30s
- Replay same Stripe event → no duplicate processing (deduplication confirmed)
- Pre-dunning: `customer.updated` with different payment method → email previewed; `customer.updated` with name change → no email sent (regression test)
- `pnpm typecheck` passes

---

### Week 11 — Onboarding, Activation Sprint, Design Partner Instrumentation

**Goal:** New owner → first scored call < 35 minutes. Activation automation live.

**Web deliverables:**
- Full onboarding: `/sign-up` → `/onboarding/team` → `/onboarding/pricebook` (QuickPricebookForm) → `/dashboard`
- `TeamSetupForm`: multi-row invite form
- `QuickPricebookForm`: 5-price guided form with pre-filled California defaults
- Empty states: every dashboard page has a designed empty state
- Week 1-2 partial data message shown when < 20 total calls
- Activation sprint: Day 1 welcome email live (triggered by `organization.created`)
- Day 7 and Day 14 cron checks active
- `ActivationDay1`, `ActivationDay7`, `ActivationDay14` templates finalized
- Design partner case study export: `/api/admin/case-study/:companyId` returning correct data
- `/admin` activation dashboard: real company data
- Daily snapshot cron active
- Dispute rate cron active

**End-to-end onboarding test (must pass before Week 12):**
1. Founder creates a new owner account at `/sign-up`
2. Adds 2 test techs by phone number
3. Completes QuickPricebookForm with 3 custom prices
4. Records a 2-minute call from the mobile test device
5. Call scored → appears in dashboard call review queue
6. Founder reviews the call, adds a coaching note
7. Total elapsed time: < 35 minutes

**Acceptance criteria:**
- End-to-end onboarding test passes in < 35 minutes
- Day 1 welcome email arrives in inbox within 60s of account creation
- `/api/admin/case-study/drain-right` returns correct JSON structure
- Cron routes return 200 in Vercel preview (dry-run still)
- `pnpm typecheck` passes; `pnpm lint` passes

---

### Week 12 — Drain Right Pilot Prep & Launch

**Goal:** Drain Right is live. All 16+ techs onboarded. First calls reviewed with the owner.

**Web deliverables:**
- Drain Right company account created, owner signed in
- All 16+ techs invited via `POST /api/team/invite`
- Drain Right pricebook at actual prices (no defaults for core services)
- Production Stripe checkout: Starter plan, annual billing, 17 seats
- Weekly digest cron switched from dry-run to live (`WEEKLY_DIGEST_LIVE=true`)
- Activation emails switched to live (`ACTIVATION_EMAILS_LIVE=true`)
- Sentry: verify production errors appear correctly
- `/api/admin/health` showing green for Drain Right

**Actions (not code):**
- Manager walkthrough: 1-hour session with Drain Right owner
- Confirm digest email address and test send received
- Co-confirm pilot success criteria with Drain Right owner
- Monitor Sentry for any production errors in first 48 hours

---

## 14. Infrastructure & Deployment

### 14.1 Vercel Configuration

```
Project: kova-web
Framework: Next.js 15
Root directory: /            (standalone repo — no monorepo root)
Build command: pnpm build
Output directory: .next

Plan: Vercel Pro ($20/mo) — required for cron job functionality

Environment:
  Production: main branch → production domain (kovahq.com)
  Preview: all other branches → auto-generated preview URLs

Functions:
  Max duration: 10 seconds (Vercel Pro default)
  Long-running work (> 10s): runs on Railway worker, never on Vercel

Crons: configured in vercel.json (see §7.3)
```

**API route execution time targets:**
- Presign, consent, decline: < 500ms
- Dashboard queries (summary, team, compliance): < 2s with Neon HTTP + `unstable_cache`
- Pricebook CRUD: < 1s
- Stripe checkout/portal: < 2s

### 14.2 Environment Variables

```bash
# Database
DATABASE_URL=                       # Neon connection string

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET_AUDIO=

# Queue (Upstash Redis HTTP — not ioredis)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER_ANNUAL=
STRIPE_PRICE_STARTER_MONTHLY=

# Email
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://kovahq.com

# Cron security
CRON_SECRET=                        # Random secret; verified in all /api/cron/* routes

# Admin
ADMIN_USER_ID=                      # Clerk userId of the founder

# Error monitoring
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# Feature flags
WEEKLY_DIGEST_LIVE=false
ACTIVATION_EMAILS_LIVE=false
```

### 14.3 CI/CD

```yaml
# .github/workflows/ci.yml
- name: TypeScript check
  run: pnpm typecheck

- name: Lint
  run: pnpm lint

- name: Unit tests
  run: pnpm test

- name: Drizzle migration check
  run: pnpm drizzle-kit:check   # Verify pending migrations don't break schema
```

Vercel auto-deploys on every push via Vercel GitHub integration.

### 14.4 Infrastructure Cost Estimate (Corrected)

| Service | Plan | Monthly Est. | Notes |
|---|---|---|---|
| Deepgram | Pay-as-you-go | ~$150 | Nova-3 $0.0058/min + diarization $0.002/min; 640 calls × avg 32 min |
| OpenAI | Pay-as-you-go | ~$8–10 | GPT-4o-mini for scoring; at pilot volume |
| Railway | Hobby $5/mo + usage | ~$8–12 | Worker + Redis; $5 credit included; usage varies with call volume |
| AWS S3 | Pay-as-you-go | ~$0.50 | Audio storage at pilot volume |
| Vercel | **Pro** | **$20** | Required for cron jobs |
| Neon | Free (→ Launch $19 by Month 3) | **$0–19** | Free tier: 0.5GB; transcripts fill this in 3-4 months |
| Clerk | Free (→ Pro $20 when limit hit) | **$0–20** | Free: 100 MRO/month; Drain Right at the edge |
| Firebase | Spark (free) | $0 | FCM push notifications |
| Resend | Free (3,000 emails/mo) | $0 | Sufficient for pilot |
| Upstash | Free (10K commands/day) | $0 | Rate limiting + Redis HTTP; pilot volume within free tier |
| Sentry | Free (5K errors/mo) | $0 | Sufficient for Phase 1 |
| **Total** | | **~$187–232/mo** | vs. v1 estimate of ~$165-190/mo |

**Neon migration trigger:** Upgrade to Neon Launch ($19/mo) when storage approaches 400MB — expected around Month 2-3 given JSONB transcript storage.

**Clerk migration trigger:** Upgrade to Clerk Pro ($20/mo) when monthly retained organization members approach 90 (buffer before the 100 MRO limit). At 1 company with ~18 users, this is the Day 1 state — monitor and upgrade proactively if adding a second design partner.

**Real vs. estimate note:** Infrastructure is ~13-15% of Drain Right revenue ($1,513/mo) at the high end — manageable but higher than the ~11% claimed in v1.

---

## 15. Testing Strategy

### 15.1 Unit Tests

**What to unit test:**
- Drizzle query helpers — test with Neon `test` branch
- Stripe webhook handler: all 5 event types + deduplication + pre-dunning `previous_attributes` diff
- Activation cron logic: day thresholds, idempotency
- Email templates: render with edge-case data (zero calls, negative week-over-week)
- Pricebook completion calculation
- Rate limiter: verify 429 returned after limit exceeded
- Webhook deduplication: same event ID twice → processed only once

**Framework:** Jest + `@testing-library/react` for component tests.

**What NOT to unit test:**
- Full page rendering — verify with acceptance criteria on real data
- Stripe API responses — mock the client, test the handler logic

### 15.2 API Route Testing

| Route | Test Cases |
|---|---|
| `POST /api/calls/consent` | Happy path, missing sessionId, no org in session |
| `GET /api/calls/presign` | Happy path, expired session |
| `POST /api/calls/upload-complete` | Happy path, Upstash enqueue failure (mock), duplicate callId |
| `POST /api/webhooks/stripe` | Each of 5 event types, invalid signature, duplicate event ID |
| `POST /api/webhooks/clerk` | organization.created, duplicate event ID |
| `GET /api/dashboard/summary` | Happy path, empty company (zero calls) |

### 15.3 End-to-End Validation Protocol

Run before each weekly sprint sign-off:

1. New owner account → `companies` record in Neon
2. QuickPricebookForm → 3 custom prices saved, 2 skipped → completion shows correctly
3. Tech invited → SMS sent
4. Call recorded on mobile → appears in `/dashboard/calls` with status "Processing"
5. Call scored → appears in review queue if opportunity > $1,500
6. Owner adds coaching note → appears in call detail
7. Weekly digest cron triggered manually → email received with correct numbers
8. Stripe test event replayed → deduplication confirmed (no duplicate processing)

---

## 16. Risk Register (Web-Specific)

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Vercel function timeout on dashboard queries** | Low | Medium | Queries use indexed columns (`company_id`, `recorded_at`). Verify query plans in Neon console before Week 7. Add `EXPLAIN ANALYZE` check if any query exceeds 3s on `dev`. |
| **Weekly digest email lands in spam** | Medium | High | Use subdomain `notifications@kovahq.com`, configure SPF + DKIM in Resend, test deliverability before launch. |
| **Stripe webhook replays causing duplicate emails** | Low (mitigated) | Medium | `processedWebhookEvents` deduplication table in place from Week 2. Test replay in Week 10 acceptance criteria. |
| **Owner disputes that the number is wrong (pricebook defaults)** | High | High | Pricebook completion banner prominent until 70%+ configured. Every opportunity value tagged `(default)` while using industry averages. QuickPricebookForm gets 5 real prices on Day 1. |
| **Clerk free tier MRO limit hit** | High | Medium | Monitor monthly retained org members in Clerk dashboard. At 90 MRO: upgrade to Pro ($20/mo). Drain Right alone is ~18-20 users — may hit limit on Day 1. |
| **Neon storage fills up** | Medium | Medium | Free tier: 0.5GB. Upgrade to Launch ($19/mo) by Month 2-3. JSONB transcripts: ~100KB/call × 640 calls/month = ~64MB/month of transcript data alone. |
| **Upstash Redis HTTP key structure diverges from BullMQ** | Medium | Medium | Test end-to-end enqueue from Vercel → job visible in Bull Board on Railway before Week 4 sign-off. If BullMQ key structure is incompatible, switch to Upstash QStash (HTTP job queue, no key structure dependency). |
| **`/admin` route accidentally exposed in product nav** | Low | Medium | Server-gated by `ADMIN_USER_ID` check. Not linked from any product page. |
| **Neon `dev` branch schema diverges from `main`** | Medium | Medium | Drizzle migration check in CI on every PR. Never run raw SQL on `dev` without a migration. |
| **Rate limiter blocks legitimate owner actions** | Low | Low | 100 req/min per user is generous for a dashboard. If an owner triggers it, they'll see a 429 with a clear message. Adjust limit if needed. |
| **Audio player browser compatibility** | Low | Low | HTML5 `<audio>` + `<progress>` with AAC audio is supported in all modern browsers. Test Chrome, Safari, Firefox, and iOS Safari before Week 8 sign-off. |
| **QuickPricebookForm defaults are wrong for non-CA companies** | Low | Medium | Phase 1 is Drain Right (CA). Defaults are CA drain + plumbing market data. If a second design partner is in a different state: update defaults or add state-based default sets before onboarding them. |
| **12-week timeline is too aggressive** | High | High | Aspirational timeline accepted. Cut in this order if needed: (1) admin/case-study export, (2) detailed compliance, (3) coaching note form. Core (number + call review + audio player) is non-negotiable. |

---

## 17. Phase 2 Web Preview

| Feature | Trigger | Notes |
|---|---|---|
| **Waveform audio player** | Month 3 | Replace `<progress>` bar with WaveSurfer.js; add visual opportunity markers |
| **CSV pricebook import** | Phase 2 | Already specced in v1; deferred because QuickPricebookForm covers Day 1 needs |
| **Dispatch-linked compliance** | FSM integration | Requires ServiceTitan or other FSM; "Dispatched" column becomes real |
| **Recharts dashboard charts** | Month 3–4 | Meaningful at 2+ months of data; trend lines become legible |
| **Kova ROI Report** | Month 3 | Monthly cumulative opportunity report, score trend, tech ROI |
| **Invoice matching dashboard** | Phase 2 ST integration | Estimated vs. actual side-by-side; "capture rate" metric |
| **Full-text call search** | Phase 2 | Postgres full-text on transcript segments |
| **Clip sharing (expiring links)** | Phase 2 | Server-generated short URLs proxying S3 audio |
| **ServiceTitan integration UI** | Phase 2 | Settings page section for ST credentials, sync status |
| **Spanish dashboard UI** | Phase 2+ | Full i18n via `next-intl` |
| **Leaderboard** | Phase 2 | Owner-toggleable team comparison view |
| **PE portfolio dashboard** | Phase 3 | Multi-company rollup |
| **Custom scoring weight editor** | Phase 3 | Owner configures dimension weights for their trade |

---

## 18. Open Decisions (Web-Specific)

### Before Phase 1 Kickoff — Resolved in v2

| Decision | Resolution |
|---|---|
| Annual billing default | Option A: Present annual first, monthly below as "or pay monthly (higher rate)". |
| Repo structure | Two repos: `web` (Next.js dashboard + Railway worker in `worker/` subdirectory) and `mobile`. No shared package. |
| Pricebook onboarding | QuickPricebookForm (5 key prices guided form). |
| Audio player | Simple HTML5 player; no waveform in Phase 1. |
| Dashboard charts | Text-based hero numbers + directional arrows; no Recharts in Phase 1. |
| Cron strategy | Vercel Pro ($20/mo). |

### Still Open

| Decision | Options | Deadline | Owner |
|---|---|---|---|
| **Score dispute authority** | When tech disputes: does the manager have authority to override and restore the opportunity? Product + legal decision. | Week 5 | Founder |
| **Clerk upgrade timing** | Upgrade to Pro proactively (before Drain Right launch) or reactively (when MRO hits 90)? Proactive is safer — $20/mo and avoids a mid-pilot outage. | Week 11 | Founder |
| **Neon upgrade timing** | Same question: upgrade to Launch before launch or wait? Given storage fills in 3-4 months, upgrading before launch ($19/mo) removes one operational concern. | Week 11 | Founder |
| **Weekly digest timezone** | Send Monday 7am UTC (Sunday night Pacific) or store per-company timezone and compute UTC send time? Phase 1: accept UTC approximation. Phase 2: implement per-company timezone. | Week 11 | Engineering |

### External Dependencies to Track

| Item | Status | Follow-up |
|---|---|---|
| Drain Right owner email for weekly digest | Collect Week 11 | Required for live digest send |
| Drain Right pricebook prices | Collect Week 11 | Required before launch — configure during pilot prep |
| SPF/DKIM configuration for `kovahq.com` | Configure Week 10 in Resend | Required for email deliverability |
| Custom domain setup on Vercel | Configure Week 11 | `kovahq.com` → production deployment |
| Stripe production API keys | Switch Week 12 | Test keys through Week 11; production when Drain Right signs |
| Upstash Redis instance | Create Week 1 | Used by web (rate limiting + HTTP enqueue) and worker |

---

## 19. Competitive Landscape — Corrected Claims

This section corrects factual errors from the competitive analysis in prior planning documents.

### Rilla
- **Funding:** Raised **$12.5M Series A** (Craft Ventures, late 2023). Prior documents stated "no publicly disclosed funding" — incorrect. Update all sales materials and competitive positioning.
- All other Rilla claims (AI conversation intelligence, in-person sales focus, pricing) remain unchanged.

### ServiceTitan
- **Revenue:** ServiceTitan IPO'd on NASDAQ (ticker: TTAN) in late 2024. Prior estimates of "~$700M ARR" should be replaced with data from their SEC filings (10-K/10-Q). Use actual reported revenue figures in all investor and sales materials.

### Siro
- Acquired by ServiceTitan. Verify current status — Siro may be integrated into ServiceTitan Field Pro or wound down as a standalone product. Do not cite Siro as a standalone competitor until verified.

### Market Size Claims
- Verify the "State of the Trades" citation referenced in product strategy: confirm publication date, source, and whether the cited statistics are primary research or survey-based estimates.

---

*Document version: v2*
*Status: Living document — update prior to each sprint kickoff*
*Date: May 2026*
*Previous version: `docs/development/development-plan-web-v1.md`*
*Parent: `docs/development/development-plan-v2.md`*
*Phase 2 kickoff: update this document at Month 3 to incorporate waveform player, CSV import, Recharts charts, dispatch-linked compliance, and ST integration UI*
*See `docs/product/product-brief-v1.md` for full product requirements*
*See `docs/product/product-strategy-v1.md` for legal compliance and risk details*
