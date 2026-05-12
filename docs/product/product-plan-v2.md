# Kova — Product Plan v2
## Revenue Intelligence Platform for Drain & Plumbing

---

## What Changed from v1

| Area | v1 | v2 |
|---|---|---|
| AI Engine | Rules-based only | LLM + rules hybrid |
| Competitive context | None | Full landscape + positioning matrix |
| Feature specs | Light / high-level | Detailed per-module |
| FSM integration | Vague "not yet" | FSM-agnostic + ServiceTitan priority |
| Coaching loop | Post-call only | Post-call + pre-call (FSM or manual) + real-time on roadmap |
| Call library | Basic | Full archive + search + clip highlights |
| Pricing | Per-seat 3 tiers | Per-seat (refined, $178/mo floor) |
| GTM | Pilot-only | Full expansion strategy with integration channels |

---

## 1. Product Vision

**Kova** is a mobile-first revenue intelligence platform for drain and plumbing businesses.

It records every service call, analyzes technician behavior using trade-specific AI, and delivers a precise, dollar-denominated account of what each call was worth — and what was left on the table.

> **Core Promise:**
> "We show you exactly where your team is losing money — per call, per tech, every day."

Kova is not a coaching tool. It is not conversation intelligence. It is a **revenue enforcement system** — the only product that tells a plumbing or drain owner what their technicians cost them today.

---

## 2. Market Opportunity

### Field Service Management Market
- **2025 global FSM market:** $6.1B → projected $13.9B by 2033 (11% CAGR)
- **US home services total revenue:** ~$600B annually
- **ServiceTitan alone:** ~$700M ARR (2024)
- **Housecall Pro:** 150,000+ contractors on platform
- **Jobber:** 350,000+ users across 50+ industries

### Conversation Intelligence Market
- **2024:** ~$1.5B globally → projected $7–10B by 2030 (25–30% CAGR)
- Zero products in this market are purpose-built for field technician behavior in the trades

### Kova's Addressable Market
- ~400,000 plumbing and drain businesses in the US
- **TAM:** $3–5B (all home services software)
- **SAM:** ~100,000 drain/plumbing shops actively running 2–60 techs
- **SOM (Year 1–2):** 500–2,000 businesses at $89–$149/seat/month

### The Unserved Gap
ServiceTitan's Field Pro — their AI coaching product — requires a $1,500–$3,000/month base FSM commitment before you can even access it. The 300,000+ shops on Jobber, Housecall Pro, or no FSM at all are completely unserved by any coaching or revenue intelligence product. Kova owns this segment.

---

## 3. Target Customer

### Primary: Owner-Operators
- Drain and plumbing companies, 2–15 technicians
- Revenue: $500K–$5M/year
- FSM: Jobber, Housecall Pro, ServiceTitan, or nothing
- **Core pain:** No visibility into what techs say in the field; performance variance they cannot explain

### Secondary: Field Operations Managers
- Companies with 10–50 techs, dedicated manager reviewing performance
- Currently using: manual spot-checks, ride-alongs, or nothing
- **Core pain:** Cannot review 200+ calls/week manually; no insight into why top techs outperform

### Tertiary: Large Multi-Team Operators
- Companies with 30–60+ technicians across one or more locations
- Dedicated operations manager or VP of Field Operations
- Revenue: $10M–$50M/year; typically on ServiceTitan
- **Core pain:** Scale has made consistent performance enforcement impossible — top techs average 2–3x the ticket of bottom techs with no systematic way to close the gap
- **Budget authority:** Can justify $3,000–$8,000/month in tooling if the revenue recovery story is clear

### Design Partner
- **Drain Right** (California) — primary pilot partner

---

### Persona A: "Mike" — The Owner-Operator
- Runs a 5-tech drain/plumbing company
- Knows his techs vary wildly in ticket size but cannot diagnose why
- Currently spends $500–$1,500/month on a coaching program or ride-alongs
- Wants a dashboard that tells him Monday morning what the previous week cost him
- Does not have time to listen to recordings

### Persona B: "Sarah" — The Growing Operator
- 12-tech plumbing company on ServiceTitan
- Recently hired a field manager who can review ~5 calls/week maximum
- Wants every call scored automatically so coaching sessions are prioritized
- Would pay for pre-call briefings to prep techs on high-value repeat accounts

### Persona C: "Dave" — The Large Multi-Team Operator
- Runs a 40-tech plumbing and drain company across 2–3 locations
- On ServiceTitan; has a VP of Operations and 2 field managers
- Top 10 techs average $1,100 tickets; bottom 10 average $320 — no one knows why
- Has tried ride-alongs and manual call reviews; neither scales past 5% of calls
- Actively evaluating ST Field Pro but balks at lock-in and cost of full ST upgrade
- Wants a multi-location dashboard, per-location benchmarking, and coaching workflow for managers
- Willing to pay Team tier pricing; ROI case just needs to be airtight

---

## 4. The Problem

Home service businesses lose an estimated **15–35% of potential call revenue** to technician behavior gaps. The core problems:

1. **No visibility.** Owners have no idea what their techs are saying on the job. Options today: ride-alongs (expensive, 1 person at a time) or manually spot-checking recordings (covers maybe 5 of 200 calls/week).

2. **Performance variance with no cause.** Some techs run $800 average tickets; others run $250. Without conversation context, owners fire good techs and keep bad ones — or just shrug.

3. **Coaching is manual and expensive.** Programs like BDR, Service Excellence Training, and The Successful Contractor charge $500–$2,000/month for human coaches who review a fraction of calls.

4. **The data exists but isn't being used.** Service calls are already recorded by law in many states. That audio sits in a folder and no one ever listens to it.

5. **Existing tools don't understand trades.** Gong and Chorus are built for B2B SaaS reps on Zoom calls. They have zero understanding of why a plumber should offer a camera inspection after diagnosing a recurring blockage.

---

## 5. Competitive Landscape

### 5.1 Direct Competitors

#### ServiceTitan Field Pro (powered by Siro)
**What it is:** AI field intelligence embedded into ServiceTitan. Auto-records calls on tech arrival, scores behavior against custom scorecards, surfaces rehash (upsell) opportunities, and gives managers a performance dashboard.

**Strengths:**
- Auto-recording triggers on job arrival via mobile app
- Deep integration with ServiceTitan job data (ticket amounts, close rates, booking rates)
- Published results: +20% average ticket, +15% total sales per tech
- "Smart Rehash" surfaces missed upsells from past jobs

**Critical weaknesses:**
- **Locked to ServiceTitan.** Requires $1,500–$3,000/month FSM commitment before you can access it
- Additional add-on cost on top of base ServiceTitan pricing
- Inaccessible to any shop on Jobber, HCP, or no FSM
- No dollar-denominated "missed revenue" output — behavioral scores only
- Famously complex onboarding (weeks to months)
- Long-term contracts; no flexibility for small shops

**Kova's edge:** FSM-agnostic. Accessible pricing. Dollar-denominated output. Trade-specific scoring.

---

#### Siro (standalone)
**What it is:** The AI engine that now powers ServiceTitan Field Pro. Also available standalone. Records in-person conversations via mobile app, provides AI coaching ("Halftime" for live tips), surfaces rehash leads, manager dashboards. Used by Culligan, Jacuzzi, Bath Fitter, Window World.

**Strengths:**
- Purpose-built for in-person / field sales (not Zoom calls)
- Quantified results: 17% increase in units sold (Culligan), 21% close rate increase (American Standard)
- "Halftime" live in-call coaching is differentiated
- FSM-agnostic (can run without ServiceTitan)

**Critical weaknesses:**
- Designed for **in-home sales reps** doing estimate/close visits — not service technicians doing repairs with opportunistic upsell
- Generic scoring with no plumbing/drain-specific trade logic
- No "missed revenue" dollar output — coaching scores and lead flags only
- Enterprise pricing and demo-required sales motion; excludes small shops
- UI built for large sales organizations, not 3–5 tech owner-operators

**Kova's edge:** Technician-first (not just closers). Trade-specific models. Revenue quantification per call.

---

#### Hatch
**What it is:** Follow-up automation and re-engagement for home services — contacts unsold estimates, missed calls, and declined jobs via SMS/email automation. Integrates with ServiceTitan and Jobber.

**Strengths:** Focused "revenue leakage" story at the lead/CSR layer. Measurable ROI, ~$250–$500/month.

**Critical weaknesses:** Not a field call tool at all. Operates at the CSR/booking layer, not at the technician-in-home layer. No recording, no scoring, no behavioral analysis.

**Kova's edge:** Different layer of the revenue problem entirely.

---

#### CallRail
**What it is:** Call tracking and recording for marketing attribution. AI "Conversation Intelligence" add-on can transcribe and surface keywords/sentiment.

**Strengths:** Strong marketing ROI attribution. Wide integrations (Google Ads, ServiceTitan). ~$45–$200/month.

**Critical weaknesses:** Designed for inbound phone calls to CSRs. Cannot capture in-person conversations. Generic AI with no trades logic. No missed revenue calculation.

**Kova's edge:** Field-first, in-person recording, trade-specific behavioral scoring.

---

#### Housecall Pro — "AI Team"
**What it is:** HCP's AI layer across their FSM. Includes CSR AI (books jobs 24/7), Analyst AI (business insights), and Coach AI (generic guidance).

**Strengths:** Native to HCP's 150,000+ users. Affordable add-on pricing.

**Critical weaknesses:** No recording for field calls at all. Coaching is high-level business analytics (revenue totals, booking rates) — not per-call technician behavioral scoring. No "here's what your tech missed on this call and it cost $400." Locked to HCP.

**Kova's edge:** Call-level scoring, not aggregate analytics. FSM-agnostic.

---

#### General Conversation Intelligence (Gong, Chorus, Jiminny)
**What they are:** Best-in-class for B2B inside sales on Zoom/phone. $100–$200/user/month with $5,000+/year platform minimums. No in-person recording capability. Zero trades knowledge.

**Kova's edge:** Completely different product category. Useful positioning shortcut: **"Gong for field technicians."**

---

### 5.2 Manual Coaching Programs (Non-Software Competitors)
BDR, Service Excellence Training, The Successful Contractor, and similar programs charge $500–$2,000/month to manually review calls and coach technicians. Human reviewers cover ~10% of calls at best.

**Kova's edge:** 100% call coverage at 20% of the cost. Kova competes directly for this budget.

---

### 5.3 Competitive Positioning Matrix

| Capability | **Kova** | ST Field Pro | Siro | Hatch | CallRail | HCP AI |
|---|---|---|---|---|---|---|
| Records field / in-person calls | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Trade-specific scoring (plumbing/drain) | ✅ | Partial | ❌ | ❌ | ❌ | ❌ |
| Dollar-denominated missed revenue output | ✅ | ❌ | ❌ | Partial | ❌ | ❌ |
| FSM-agnostic (no FSM lock-in) | ✅ | ❌ (ST only) | ✅ | Partial | ✅ | ❌ (HCP only) |
| ServiceTitan integration | ✅ | Native | N/A | ✅ | ✅ | ❌ |
| Pre-call intelligence | ✅ | ✅ (ST data) | ❌ | ❌ | ❌ | ❌ |
| Real-time coaching | Roadmap | Partial | ✅ | ❌ | ❌ | ❌ |
| Accessible pricing (< $300/seat/mo) | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Clip-based coaching | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

**Kova is the only product that checks all five core boxes:** records field calls + trade-specific logic + missed revenue dollar output + FSM-agnostic + accessible pricing.

---

## 6. Core Differentiation

| Competitor frame | Kova frame |
|---|---|
| Coaching tool | Revenue recovery engine |
| Behavior score | Dollar-denominated missed revenue |
| Sales rep tool | Technician-first |
| Generic AI | Trade-specific (plumbing + drain) |
| FSM-locked | Works with any FSM or none |
| Enterprise pricing | SMB accessible |

### Positioning
**Headline:** "Every call is worth more than you think."
**Sub:** Kova shows you exactly what your techs left on the table — per call, per tech, every day.

### Not a coaching tool. Not conversation intelligence.
> **Kova = Revenue Intelligence Engine for service calls.**

---

## 7. Core Workflow (v2)

### Phase A: Pre-Call Intelligence

**Mode 1 — FSM Connected (full intelligence):**
- When tech is dispatched, Kova pulls job data from the FSM (customer name, job type, history, prior notes)
- AI generates a pre-call brief delivered as a push notification before tech arrives:
  - Customer history highlights ("Last visit: 18 months ago — recurring drain issue")
  - Job-type-specific things to look for on this call
  - Top 2–3 upsell angles relevant to the job type
- One-tap dismissal: "Got it"

**Mode 2 — No FSM (manual notes):**
- Tech or admin can enter pre-call notes manually in the app
- Owner can create templated pre-call checklists per job type
- Delivered to tech as a reminder card before they start recording

---

### Phase B: Record
- Tech opens Kova mobile app
- **One-tap to start recording** — prominent button, accessible from lock screen shortcut
- Consent capture: single on-screen acknowledgment before recording begins
- Recording indicator visible at all times during active session
- Pause/resume capability for interruptions
- **Offline capable** — records locally and queues upload when connectivity resumes
- Auto-upload on job completion or when wifi connects
- Manual job tag (enter job # or customer name); auto-matched when FSM connected

---

### Phase C: Transcribe + Analyze
- Audio → transcription pipeline (cloud-based, <5 minute turnaround target)
- **Rules layer:** deterministic trigger detection — keywords, phrases, timing, sequences
- **LLM layer:** contextual understanding of what was said and what it means in trade context
- **Hybrid output:** LLM flags nuanced opportunities rules would miss; rules enforce deterministic scoring on high-stakes items and prevent hallucinations

---

### Phase D: Missed Revenue Report

Per-call output delivered to both tech and manager:

```
CALL SUMMARY — Mike Chen | Drain Job | May 5, 2026

Overall Score: 61 / 100
Missed Revenue: $2,750

MISSED OPPORTUNITIES

  • No camera inspection offered                              +$350–$550
    Customer said "this keeps happening" at 4:22
    [▶ Play clip — 0:23]

  • Hydrojet upgrade not presented                           +$450–$900
    Snaking was diagnosed but no long-term alternative offered
    [▶ Play clip — 0:18]

  • No maintenance plan mentioned                            +$1,500 LTV
    No service agreement discussed at close
    [▶ Play clip — 0:31]

WHAT WENT WELL
  ✓ Root cause explained clearly
  ✓ Options-based close attempted
```

---

### Phase E: Coaching
- 1–3 specific, actionable coaching insights per call
- Linked to timestamped audio clips (± 30 seconds around trigger moment)
- **Tech view:** simplified summary with clips; mark each coaching point as reviewed
- **Manager view:** full scored breakdown, clip access, notes, and ability to flag for 1:1 discussion
- Manager can add written coaching notes to any call

---

### Phase F: Track
- Owner/manager dashboard updates in real time after each processed call
- Metrics roll up: per call → per tech → per week/month
- Leaderboard, trend lines, missed revenue aggregate visible every morning

---

## 8. Feature Specifications

### 8.1 Mobile App (iOS + Android)

#### Recording
- One-tap record with prominent button accessible from lock screen shortcut
- Consent flow: single on-screen acknowledgment before recording begins
- Recording indicator always visible during active session
- Pause/resume for interruptions
- Offline recording with local storage and auto-upload queue
- Background recording (app does not need to remain foregrounded)
- Job tagging: manual entry or auto-matched via FSM integration
- Auto-upload on job completion or wi-fi connection

#### Pre-Call Brief Card
- Push notification on dispatch: "Job arriving in X min — view brief"
- Brief card: customer name, address, job type, last service date, prior notes
- AI-generated "things to look for on this job type" (FSM) or manual checklist (no FSM)
- Dismissible; one-tap acknowledgment
- Accessible from call record after the fact

#### Post-Call Summary (Tech View)
- Delivered within 5 minutes of upload completing
- Summary card: overall score, missed revenue total, top 2 coaching points
- Expandable detail: full breakdown by scoring dimension
- Clip player: tap any missed item to hear the relevant 20–30 second moment
- "Mark as reviewed" per coaching point
- Share a clip with manager via expiring secure link

#### Tech Performance Hub
- Personal rolling 7-day and 30-day stats
- Average score, average missed revenue, trending direction (up/down)
- Comparison to team average (anonymized — "you vs. team avg")
- Full personal call history (list view, searchable by date/job type)

---

### 8.2 AI Scoring Engine — LLM + Rules Hybrid

#### Architecture
**Rules Layer (deterministic)**
- Explicit trigger detection: keywords, phrases, timing, conversation sequences
- Predictable, auditable, and explainable — no black box
- Example: "Did tech offer camera inspection after customer mentioned recurrence?"
- Misses = auto-flagged as specific missed revenue line items

**LLM Layer (contextual)**
- Understands implied meaning, multi-turn conversation flow, and nuance
- Catches missed opportunities that rules cannot detect from keywords alone
- Example: "Tech rushed to pricing without explaining root cause" — no single keyword triggers this, but the conversational pattern is clear
- Scores qualitative dimensions: customer education quality, trust-building, close quality

**Hybrid Output**
- Both layers contribute independently to the final score
- LLM can surface items rules missed; rules constrain LLM on high-stakes scoring items
- Confidence scores on LLM-flagged items; low-confidence flags for manager review

#### Model Evolution Path
| Phase | Timeline | Approach |
|---|---|---|
| Phase 1 | Now | Rules-based triggers + GPT-4o / Claude for contextual analysis |
| Phase 2 | 12–18 months | Fine-tune on annotated call data from real Kova users |
| Phase 3 | 24+ months | Proprietary model trained on a plumbing/drain call corpus |

---

### 8.3 Missed Revenue Engine

#### Step 1 — Signal Detection
- **Trigger phrases (keyword-level):** "keeps happening," "third time this year," "rusty water," "old water heater," "slow recovery," "prior service," "had someone out before"
- **Contextual signals (LLM):** rushed diagnosis, price presented before root cause explained, no recurrence discussion, single quote vs. options, no close language
- **Sequence signals:** trigger fired (recurrence detected) but offer never followed → missed opportunity

#### Step 2 — Opportunity Mapping

**Drain Opportunities:**
| Opportunity | Trigger Signal | Estimated Value |
|---|---|---|
| Camera inspection | Recurrence signal, older home, prior visit mention | $350–$550 |
| Hydrojet upgrade | Snake-only diagnosis, no long-term solution offered | $450–$1,000 |
| Maintenance / service plan | Customer recurrence concern, no agreement offered at close | $2,000–$3,500 LTV |
| Root cause explanation | Rushed diagnosis (trust + rebooking value) | Qualitative |

**Plumbing Opportunities:**
| Opportunity | Trigger Signal | Estimated Value |
|---|---|---|
| Whole-home walkthrough | Single-fixture job, no walkthrough mentioned | $300–$2,000 |
| Water heater replacement | Age >10yr, rust/discoloration mention, slow recovery | $2,000–$6,000 |
| Water filtration / softener | Water quality discussion, hard water mention | $800–$2,500 |
| Service agreement | No mention at close | $150–$300/yr recurring |
| Fix vs. improve framing | Repair-only quote, no upgrade path presented | Varies |

#### Step 3 — Dollar Output
- Conservative (low) and aggressive (high) estimate range per opportunity
- Default display: conservative range for owner credibility
- **Owner-configurable:** opportunity values can be adjusted to match local market and pricebook
- Call-level total, tech-level aggregate, company-level weekly/monthly total

---

### 8.4 Drain Scoring System

#### Phase Model
1. Arrival & Rapport
2. Problem Intake
3. Diagnosis
4. Root Cause Explanation
5. Solution Presentation
6. Upsell Opportunities
7. Close
8. Follow-through (service agreement offer)

#### Scoring Dimensions

**Diagnosis Quality** (0–3 pts)
- Root cause explained in plain language — not just "your drain is clogged"
- Recurrence risk discussed explicitly
- Scored: LLM-evaluated (qualitative) + timing check (time spent before pricing)

**Camera Inspection** (0–3 pts)
- Required trigger: any recurrence signal, older home (pre-1980), or mention of prior visit
- Scored: offered and accepted (3) / offered and declined (2) / not offered (0)
- Not offered after trigger = automatic missed revenue flag

**Hydrojet vs. Snaking** (0–3 pts)
- Long-term vs. short-term solution explained: yes/no
- Hydrojet presented as an option even if snaking ultimately selected: yes/no
- Full score requires both

**Maintenance Plan** (0–3 pts)
- Mentioned at all: yes/no (1 pt)
- Tied to customer's stated pain: yes/no (1 pt)
- Offered with specifics (price, coverage, what it includes): yes/no (1 pt)
- Full score requires all three

**Customer Education** (0–3 pts)
- Time spent building trust before pricing
- "Why" explained before "how much"
- LLM-evaluated + rules-based timing check: price mentioned within first 2 minutes = flag

**Close Quality** (0–3 pts)
- Good/better/best options presented vs. single quote
- Customer objection handling present: yes/no
- Close language quality: LLM-evaluated

---

### 8.5 Plumbing Scoring System

#### Phase Model
1. Arrival & Rapport
2. Problem Intake
3. Diagnosis
4. Whole-Home Assessment
5. Solution Presentation
6. Upsell / Upgrade Discussion
7. Close
8. Follow-through

#### Scoring Dimensions

**Whole-Home Walkthrough** (0–3 pts)
- Did tech check additional fixtures beyond the immediate issue?
- Scored: full check (3) / verbal offer to check (2) / no mention (0)
- Note: even "while I'm here, mind if I take a quick look at..." qualifies at minimum

**Water Heater Opportunity** (0–3 pts)
- Trigger: age >10 years mentioned, rust/discoloration, slow recovery, customer complaint about hot water
- Scored: trigger fired + qualified offer made (3) / trigger fired + mentioned only (2) / trigger fired + missed (0)

**Filtration / Softener** (0–3 pts)
- Water quality or hard water discussion triggered: yes/no
- Product or solution offered: yes/no
- Scored accordingly

**Fix vs. Improve Framing** (0–3 pts)
- Was repair-only the only option presented?
- Was a longer-term upgrade or improvement path offered?
- LLM-evaluated

**Service Agreement** (0–3 pts)
- Offered at close: yes/no (2 pts)
- Connected to customer's specific pain or problem: yes/no (1 pt)

---

### 8.6 Call Library

#### Full Archive
- Every recorded call stored with: date, tech name, job type, duration, overall score, missed revenue total
- Retention: 12 months default (configurable by owner)
- Audio player with synchronized transcript — tap any transcript line to jump to that position in the audio
- Full call metadata: FSM job # (if connected), customer type, score breakdown

#### Search
- Search by: keyword, tech name, job type, date range, score range, missed revenue amount
- Example query: "all calls where hydrojet was not offered in the last 30 days"
- Saved searches and filters for recurring review workflows

#### Clip Highlights
- Auto-generated clips for each missed opportunity (±30 seconds around trigger moment)
- Manager can manually clip any section
- Clips shareable via secure expiring links
- **"Best Calls" library:** manager can flag exemplary calls for team training use
- **"Moments" feed:** top missed moments across all techs this week — one-stop review for managers
- Downloadable audio clips for in-person coaching sessions

---

### 8.7 Owner / Manager Dashboard

#### Home Screen
- **Weekly missed revenue total — big number, front and center**
- Trend: this week vs. last week (arrow + percentage change)
- Top 3 missed opportunity types this week (ranked by dollar value)
- Quick-access call review queue (high-miss-revenue calls flagged)

#### Team Performance
- Per-tech leaderboard: avg score, avg missed revenue per call, call count, trend arrow
- Drill into any tech for full call history and coaching activity
- Comparison view: any two techs side-by-side across all scoring dimensions
- Team average benchmarks per dimension

#### Revenue Intelligence
- Rolling 30-day total estimated missed revenue
- **Recovery trend:** as coaching takes effect, this number should decline — track it
- Breakdown by opportunity type: camera inspection / hydrojet / maintenance plan / walkthrough / water heater / etc.
- Highest-value individual missed moments (top 10 this month)

#### Call Review Queue
- Calls automatically flagged for manager review: high missed revenue, low score, new techs, calls below threshold
- One-click to full call + transcript + clips
- Mark as reviewed / add note / flag for 1:1

#### Coaching Activity
- Coaching points delivered vs. reviewed (per tech)
- Coaching completion rate per tech
- Manager annotation log on each call
- Week-over-week improvement tracking per tech per dimension

---

## 9. FSM Integration Architecture

### Design Principle: FSM-Agnostic Core
Kova works fully standalone with zero FSM required. Connecting an FSM unlocks additional intelligence features — it is never a requirement to use the product.

### Standalone Mode (No FSM)
- Manual job tagging (tech enters job # or customer name)
- All recording, scoring, missed revenue, and dashboard features available
- Manual pre-call notes via owner-created job-type templates
- No invoice matching

### FSM-Connected Mode

**Features unlocked when FSM is connected:**
- **Pre-call brief:** AI pulls customer history, job type, dispatch notes automatically
- **Auto job-matching:** recorded call linked to job record without manual entry
- **Invoice matching:** compare Kova's estimated ticket value against actual invoice → shows recovery rate over time
- **Push results:** scored call summary written back to FSM job record as a note
- **Ticket delta view:** for each tech, chart their Kova-estimated potential vs. actual invoiced amount

### Integration Tiers

**Tier 1 — ServiceTitan (Priority)**
- ST has a public API and webhook system
- Bidirectional: read job/customer data on dispatch → write call score summary to job notes
- Invoice matching via ST invoice API
- Kova insights surfaced inside ST job timeline via native notes
- Target: first integration shipped, aligned with pilot expansion

**Tier 2 — Housecall Pro + Jobber (Phase 2)**
- Both have public APIs
- Read dispatch data + write call summary to job record
- Priority after ServiceTitan; opens the 400,000+ SMB market

**Tier 3 — FieldEdge, ServiceFusion, others (Phase 3+)**
- Community-requested; shipped based on customer demand

---

## 10. User Roles

### Technician
Mobile-primary. Records calls, receives feedback, tracks personal performance.

**Permissions:**
- Record calls
- View own call history and scores
- View and action own coaching insights
- Mark coaching points as reviewed
- View personal stats vs. anonymized team average
- Cannot view other technicians' individual performance data

---

### Field Manager / Sales Manager
Mobile + web. Reviews team calls, delivers coaching, monitors performance.

**Permissions:** All of Technician +
- View all team calls and scores
- Create and share clips
- Add coaching notes to any call
- Flag calls for escalation
- View full team leaderboard (non-anonymized)
- Export call reports

---

### Owner / Admin
Web-primary. Full dashboard, configuration, billing.

**Permissions:** All of above +
- Configure opportunity values (customize missed revenue dollar estimates)
- Manage team (add, remove, role-assign users)
- Connect and manage FSM integrations
- Set and adjust scoring weights per trade
- View all analytics
- Manage billing and subscription
- Export all data (CSV/PDF)
- API access (Team tier)

---

## 11. Pricing

### Model
- Per seat / per month
- Monthly billing, no contracts, no minimums
- 14-day free trial (no credit card required)
- **Minimum:** owner seat + 1 tech = 2 seats ($178/month on Starter)

### Tiers

| Tier | Price / Seat / Month | Who It's For | Features |
|---|---|---|---|
| **Starter** | $89 | Owner-operators, 2–5 techs | Recording, transcription, post-call scoring, missed revenue output, basic coaching insights, 90-day call archive, owner dashboard |
| **Pro** | $129 | Growing teams, 5–15 techs | Everything in Starter + pre-call intelligence (FSM or manual), full call library with search + clips, manager dashboard, leaderboard, 12-month archive, FSM integrations (ST, HCP, Jobber), invoice matching |
| **Team** | $149 | Multi-manager operations, 15+ techs | Everything in Pro + multi-location support, custom scoring weights, advanced reporting + data export, API access, "Best Calls" training library, priority support |

### ROI Positioning
A 5-tech shop on Pro = **$645/month**.

Alternatives:
- ServiceTitan + Field Pro: $2,000–$3,500/month
- Manual coaching programs (BDR, etc.): $500–$2,000/month
- Ride-along manager: $4,000–$8,000/month salary equivalent

One recovered maintenance plan offer per week pays for Kova. The ROI case writes itself.

---

## 12. Go-To-Market (v2)

### Channel Strategy

#### Phase 1 — Design Partner → Case Study (Months 1–3)
- Drain Right as primary pilot
- Document: calls recorded, missed revenue identified, ticket size change after coaching begins
- Target output: "$X in missed revenue identified in the first 30 days"
- Use case study as the primary sales asset for all outbound

#### Phase 2 — ServiceTitan Users Without Field Pro (Months 2–6)
- Target plumbing/drain companies on ServiceTitan who have not purchased Field Pro
- Positioning: "You're already paying for the FSM. Here's the coaching layer at a fraction of Field Pro's cost — and it actually shows you the dollar amount."
- Channels: Titan Exchange (ST community forums), owner Facebook groups, LinkedIn direct outreach to ST operators

#### Phase 3 — FSM-Agnostic Expansion (Months 4–9)
- Jobber and HCP users — much larger SMB pool; no coaching or revenue intelligence product serves them
- Positioning: "No need to switch FSMs. Kova works with what you have."
- Partner with trade associations: PHCC (Plumbing-Heating-Cooling Contractors), NAPHCC
- Attend industry events: Service World Expo, Nexstar Super Meeting

#### Phase 4 — Coaching Program Alternative (Months 6–12)
- Target owners currently spending budget on BDR, Service Excellence Training, Tom Howard, etc.
- Positioning: "100% call coverage for 20% of the cost of your current coaching program."
- Direct outreach to known coaching program customers; content on ROI comparison

### GTM Milestones
| Milestone | Target |
|---|---|
| Month 1 | Drain Right live, baseline metrics captured |
| Month 3 | Case study published, "$X in missed revenue" proof point |
| Month 6 | 10 paying companies, ~$15K MRR |
| Month 12 | 50 paying companies, ~$75K MRR |
| Month 18 | 150 companies, ~$225K MRR |

---

## 13. Product Roadmap

### Phase 1 — Foundation (Months 1–3)
**Goal: Prove the missed revenue number is real.**

- [ ] Mobile app: recording, consent, offline, auto-upload (iOS first)
- [ ] Transcription pipeline (cloud, <5 min turnaround)
- [ ] Rules-based scoring engine — drain + plumbing dimensions
- [ ] LLM integration for contextual analysis (GPT-4o or Claude)
- [ ] Missed revenue engine — drain opportunity model (4 dimensions)
- [ ] Post-call summary: tech view + manager view
- [ ] Owner dashboard: per-call, per-tech, weekly aggregate
- [ ] Basic call library: list view + audio playback
- [ ] Manual job tagging

**Phase 1 Success Gate:**
> Show Drain Right "$20K–$50K in identified missed revenue" within the first 30 days.
> Owner says the numbers feel accurate. Techs receive and read their feedback.

---

### Phase 2 — Intelligence (Months 3–6)
**Goal: Build the product owners will pay for and refer.**

- [ ] Full call library: search + clips + clip sharing
- [ ] ServiceTitan integration (read job data, write call score to ST job notes)
- [ ] Pre-call intelligence: FSM-connected mode (full brief) + manual notes mode
- [ ] Full plumbing scoring model (all dimensions)
- [ ] Opportunity value configurability (owner sets market prices)
- [ ] Leaderboard + coaching activity tracking
- [ ] Invoice matching: Kova estimate vs. actual invoiced amount (ST)
- [ ] Android app

---

### Phase 3 — Expansion (Months 6–12)
**Goal: Open the SMB market beyond ST users.**

- [ ] Housecall Pro + Jobber integrations
- [ ] Multi-location dashboard
- [ ] Team comparison views (any two techs, side-by-side)
- [ ] Custom scoring weight configuration (owner controls what dimensions matter most)
- [ ] API access for Team tier
- [ ] "Best Calls" training library
- [ ] Coaching completion metrics and trend tracking
- [ ] Auto-record on arrival (geofence trigger — roadmap)

---

### Phase 4 — Real-Time (Year 2)
**Goal: Become the operating layer for every field call.**

- [ ] Real-time in-call coaching (live alert to tech's phone during call)
- [ ] AI-generated pre-call scripts per job type
- [ ] ML model fine-tuned on annotated Kova call data
- [ ] HVAC trade scoring model (new vertical)
- [ ] Rehash / reactivation lead engine (near-miss flagging from past calls)
- [ ] Call center / CSR intelligence layer

---

## 14. What NOT to Build

| Category | Why Not |
|---|---|
| CRM / customer management | FSMs own this — don't compete |
| Booking and scheduling | FSMs own this |
| Payment processing | Stripe + FSMs handle it |
| Marketing / ad attribution | CallRail's domain |
| HVAC scoring model | Year 2 — nail plumbing/drain first |
| Real-time coaching (Phase 1) | Complex, high latency risk, distraction risk for techs |
| Proprietary ML model (Phase 1) | Need training data first — earn it with Phase 1 + 2 |
| Multi-trade expansion (Year 1) | Trade specificity is the moat — don't dilute it |

---

## 15. Success Metrics

### North Star Metric
> **Do owners believe the missed revenue numbers are real — and does seeing them change technician behavior?**

If yes: product sticks. Customers convert. Referrals happen.
If no: nothing else matters.

---

### Phase 1 Metrics
| Metric | Target |
|---|---|
| Missed revenue identified (Drain Right, 30 days) | $20K–$50K |
| Owner credibility rating | ≥ 8/10 ("this feels accurate") |
| Tech coaching review rate | ≥ 60% of coaching points reviewed |
| Post-call summary open rate | ≥ 70% |

### Product Health Metrics (Post-Launch)
| Metric | Target |
|---|---|
| Calls recorded per active account per week | ≥ 80% of dispatched jobs |
| Post-call summary open rate (techs) | ≥ 65% |
| Coaching point review rate | ≥ 60% |
| Owner dashboard WAU | ≥ 3x/week |
| Missed revenue recovery trend | Declining week-over-week per tech (coaching is working) |

### Business Metrics (Month 6+)
| Metric | Target |
|---|---|
| MRR growth | 20%+ month-over-month |
| Monthly churn | < 5% |
| NPS | > 50 |
| LTV / CAC ratio | > 5x |
| Average seats per account | 3–6 |

---

## 16. Long-Term Vision

- **Year 2:** HVAC trade model. Real-time in-call coaching. Rehash lead engine from past call data.
- **Year 3:** Multi-trade platform (plumbing, drain, HVAC, electrical). Call center intelligence layer. Proprietary AI model trained on tens of thousands of annotated trades calls.
- **Year 4+:** The operating standard for how a profitable service call is run — and the system that enforces it at scale across every trade.

> Kova becomes the benchmark for what a great service call looks like. Every technician. Every trade. Every call, measured and coached.

---

## Final Summary

Kova is not a coaching tool. It is not conversation intelligence. It is not a CRM add-on.

It is a **system that enforces how a profitable plumbing and drain service call should be run — and quantifies in dollars when it isn't.**

No competitor does all five things: records field calls, applies trade-specific scoring logic, outputs a dollar-denominated missed revenue figure, works FSM-agnostic, and is priced for a 3-tech shop. Kova does.

The moat is the trade-specific logic. The growth engine is the ROI story. The market is wide open.
