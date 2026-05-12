# Kova — Product Brief v1
## Internal Reference Document

*Synthesizes product-plan-v3.md and product-strategy-v1.md into a single coherent picture.*
*All strategic amendments are presented as settled decisions.*

---

## 1. Executive Summary

Kova is a mobile-first revenue intelligence platform built for drain and plumbing businesses. It records every service call, analyzes technician behavior using trade-specific AI, and delivers a precise, dollar-denominated account of what each call was worth and what estimated opportunity was left on the table — priced at the owner's actual rates, not industry averages.

**The core value proposition:** "We show you exactly where your team is leaving money on the table — per call, per tech, every day."

No competitor does all six things Kova does: records field calls, applies trade-specific scoring logic for plumbing and drain, uses the owner's actual pricebook to calculate estimated opportunity, integrates with FSMs for invoice verification, is priced for a 3-tech shop, and proves its own ROI every month.

**What Kova is not:** a coaching tool, a conversation intelligence platform, or a CRM add-on. It is a revenue intelligence system — one that informs how well a profitable service call was run and quantifies, in dollars at the owner's own prices, what was potentially available on every call.

### Settled Strategic Decisions

- **Cross-platform from Day 1.** iOS and Android ship simultaneously via a cross-platform framework. There is no "Android later."
- **Standalone is primary.** Kova delivers full value with no FSM connected. FSM integration unlocks enhancements — it does not gate core functionality.
- **Consent-first by design.** Every recording requires a pre-recording consent popup that prompts the tech to verbally disclose to the customer. Consent is logged with a timestamp on every call.
- **Estimated Opportunity, not Missed Revenue.** All dollar figures are presented as estimates with explicit context. The language is honest and legally defensible.
- **Annual billing is the default offer.** Monthly is available as an opt-in. This is not a upsell — it is the primary pricing structure.
- **8-15 tech shops are the primary outbound target.** These accounts have lower churn, higher ARPU, and longer relationships than 2-5 tech shops.
- **Rilla has a 6-12 month response window.** Not 18. Speed and depth of deployment are the answer.
- **Recording rate target is 65-75%.** 80% is the ceiling for exceptional performance with mandatory policy and auto-recording. 65-75% is the realistic strong-performance target accounting for consent declines and technical gaps.

**Current stage:** Pre-launch. Primary design partner is Drain Right (California). Phase 1 goal is proving the estimated opportunity number is real — using Drain Right's actual prices — within 30 days of going live.

---

## 2. Market Opportunity

### The Markets Kova Sits In

**Field Service Management:** $6.1B globally in 2025, projected to reach $13.9B by 2033 at 11% CAGR. ServiceTitan alone generates ~$700M ARR. Housecall Pro serves 150,000+ contractors. Jobber has 350,000+ users across 50+ industries. The FSM category is large, growing, and deeply penetrated — but the *intelligence layer on top of field calls* is nearly entirely unoccupied.

**Conversation Intelligence:** ~$1.5B globally in 2024, projected $7-10B by 2030 (25-30% CAGR). This is the fastest-growing SaaS category in B2B sales. But every product in this market — Gong, Chorus, Rilla, Siro — is built for either inside sales reps on Zoom calls or in-home estimate/close visits. Zero products are purpose-built for field technicians performing repairs with opportunistic upsell in a customer's home.

### Kova's Addressable Market

- **TAM:** $3-5B (all home services software — FSM, coaching, CRM, analytics)
- **SAM:** ~100,000 drain and plumbing shops actively running 2-60 techs in the US
- **SOM (Year 1-2):** 500-2,000 businesses at $89-$149/seat/month
- ~400,000 plumbing and drain businesses in the US exist; the actively-managed addressable segment is ~100K

### The Unserved Gap

ServiceTitan's Field Pro — the only product with any trade-specific coaching capability — requires a $1,500-$3,000/month base FSM commitment before you can access the coaching layer at all. The 300,000+ shops on Jobber, Housecall Pro, or no FSM at all are completely unserved by any coaching or revenue intelligence product. Kova owns this segment from Day 1.

### Market Readiness

The psychological barrier to AI adoption in the trades has crossed its tipping point as of 2026:
- 74% of residential contractors now see AI as key to operational efficiency (ServiceTitan State of the Trades Report, April 2026)
- AI adoption among commercial contractors more than doubled year-over-year (2025 → 2026)
- Rilla and Siro have already proven the category works — 20-45% close rate lifts and 17%+ ticket increases are documented across HVAC and home improvement
- The market question is no longer "does this work?" — it is "which product fits my shop?"

### PE Consolidation Tailwind

Private equity firms are aggressively rolling up residential plumbing, HVAC, and drain companies. ServiceTitan explicitly maintains a dedicated "Private Equity" solution category. PE-backed portfolios need standardized performance data across 10-50 acquired companies — an institutional buyer profile with budget, urgency, and scale requirements that map directly to Kova's value proposition. PE deals are moved into Phase 3 GTM timing, not Phase 5.

---

## 3. Target Customer

### Primary: Owner-Operators — 8 to 15 Technicians

- Drain and plumbing companies with 8-15 technicians (preferred) — lower churn, higher ARPU, longer relationships
- Revenue: $1M-$5M/year
- FSM: Jobber, Housecall Pro, ServiceTitan, or nothing
- Core pain: No visibility into what techs say in the field; performance variance they cannot explain or address

*Why 8-15, not 2-15:* 2-5 tech shops carry brutal churn risk — business failure rates, cash flow variability, single-person decision-making with no manager layer. 8-15 tech shops have multiple people whose jobs depend on the product, higher average ARPU, and a meaningful population of techs to generate data. Phase 1 will engage 2-7 tech shops through design partner relationships, but outbound sales prioritizes 8-15.

### Secondary: Field Operations Managers

- Companies with 10-50 techs, dedicated manager reviewing performance
- Currently using: manual spot-checks, ride-alongs, or nothing
- Core pain: Cannot review 200+ calls per week manually; no insight into why top techs outperform by 2-3x

### Tertiary: Large Multi-Team Operators

- 30-60+ technicians across one or more locations
- Dedicated VP of Operations or Field Operations Manager
- Revenue: $10M-$50M/year; typically on ServiceTitan
- Core pain: Scale has made consistent performance enforcement impossible
- Budget authority: Can justify $3,000-$8,000/month if the revenue recovery case is clear
- PE-backed operators in this tier become the Phase 3 outbound focus

### Design Partner Strategy

**Drain Right** (California) is the primary pilot partner for Phase 1. Beyond Drain Right, 5-10 additional design partners should be recruited in the first 60 days — not after Phase 1 proves out. Every additional design partner compresses the data accumulation timeline, deepens the product before Rilla can respond, and expands the pool of credible early case studies.

---

### Persona A: "Mike" — The Owner-Operator

- Runs a 10-tech drain/plumbing company in the Southwest
- Knows his techs vary wildly in ticket size — top tech runs $1,100 average, bottom runs $320 — but cannot diagnose why
- Spends $1,000-$2,000/month on a coaching program and still doesn't know what's happening on job sites
- Wants a dashboard that tells him Monday morning what the previous week cost him
- Does not have time to listen to recordings; wants the AI to tell him what matters

### Persona B: "Sarah" — The Growing Operator

- 12-tech plumbing company on ServiceTitan
- Recently hired a field manager who can review ~5 calls per week at best
- Wants every call scored automatically so coaching sessions focus on what actually matters
- Would pay for pre-call briefings that prep techs on high-value repeat accounts

### Persona C: "Dave" — The Large Multi-Team Operator

- Runs a 40-tech plumbing and drain company across 2-3 locations
- Has a VP of Operations and 2 field managers; on ServiceTitan
- Top 10 techs average $1,100 tickets; bottom 10 average $320 — no systematic explanation
- Evaluating ST Field Pro but balks at lock-in and cost
- Wants multi-location dashboard, per-location benchmarking, structured coaching workflow
- Willing to pay Team tier; needs the ROI case to be airtight

---

## 4. The Problem

Home service businesses lose an estimated 15-35% of potential call revenue to technician behavior gaps. The core problems:

1. **No visibility.** Owners have no idea what their techs say on the job. Options today: ride-alongs (expensive, covers one tech at a time) or manually spot-checking recordings (covers maybe 5 of 200 calls per week). Neither is scalable.

2. **Performance variance with no cause.** Some techs run $800 average tickets; others run $250. Without conversation context, owners fire good techs, keep bad ones, or just accept the variance without understanding it.

3. **Coaching is manual and expensive.** Programs like BDR, Service Excellence Training, and The Successful Contractor charge $500-$2,000/month for human coaches who review a fraction of calls and can't scale with the team.

4. **The data exists and goes unused.** Service calls are already recorded by law in many states. That audio sits in a folder, and nobody ever listens to it.

5. **Existing tools don't understand the trades.** Gong and Chorus are built for B2B SaaS reps on Zoom calls. They have zero understanding of why a plumber should offer a camera inspection after diagnosing a recurring blockage, or why a hydrojet option matters when a snake-only diagnosis is presented.

6. **Revenue numbers aren't grounded in reality.** Even where coaching tools exist, "missed revenue" is a generic industry estimate — not tied to what that specific company actually charges. Owners dismiss numbers they don't trust.

---

## 5. Product Vision & Positioning

### Vision

Kova is a revenue intelligence system for field technicians — the only product that tells a drain and plumbing owner what their technicians' calls were worth, what estimated opportunity was available, and what coaching will recover it. Powered by the owner's own prices. Built for the way plumbers and drain techs actually work.

### Core Promise

> "Every call is worth more than you think. Kova shows you exactly what your team left on the table — per call, per tech, every day."

### What Makes Kova Different from Every Competitor

| Competitor frame | Kova frame |
|---|---|
| Coaching tool | Revenue intelligence system |
| Behavior score | Dollar-denominated estimated opportunity |
| Sales rep tool | Technician-first |
| Generic AI | Trade-specific (plumbing + drain) |
| Industry-average estimates | Your actual pricebook |
| FSM-locked | Works with any FSM or none |
| Enterprise pricing | SMB accessible ($178/month floor) |
| Surveillance (secret recording) | Transparent consent — techs and customers both know |
| "You're being watched" | "Here's what you left on the table" |

### "Estimated Opportunity Per Call" Is a Novel Concept

After thorough competitive research, no competitor outputs a per-call dollar figure for estimated missed opportunity. This is not an incremental improvement — it is a genuinely different thing:

| What everyone else does | What Kova does |
|---|---|
| "Your close rate improved 12%" | "Your tech left an estimated $850 on this call" |
| "Your average ticket is up 17%" | "Camera inspection not offered after customer said 'this keeps happening' — that's $425 at your price" |
| "Rep scored 71/100" | "Estimated opportunity: $2,890 — here are the 3 moments and the clips" |

Owners already think in dollars-per-truck-roll. A score or a percentage requires a translation step. A dollar amount tied to a specific call at their actual prices eliminates that translation entirely.

### Consent as Competitive Advantage

Rilla's documented technician backlash reveals a structural problem in how most companies deploy these tools: secretly, under management pressure, with techs told not to disclose recording to customers. In California and 10 other two-party consent states, secret recording is a felony. In every state, it destroys tech morale and trust.

Kova is built differently from the ground up. Consent is captured on-screen before every recording — enforced in the app, logged with a timestamp. Techs understand the tool helps *them* earn more and document their own work. Customers are aware they're being recorded. This is not just a compliance decision. It is a positioning decision in a market where the top tech complaint about competitors is "it feels wrong."

> **Transparency-first recording is Kova's answer to Rilla's biggest vulnerability.**

---

## 6. Competitive Landscape

### Rilla — Primary Direct Competitor

Rilla is the dominant in-person field sales coaching platform in home services. It records face-to-face conversations via mobile app, transcribes them, scores reps against a custom-trained AI model, and enables managers to conduct virtual ridealongs asynchronously.

**Company profile (2026):** Founded 2019, ~123 employees, estimated $20-50M+ ARR, 1,300+ customers, no publicly disclosed funding. Strong brand recognition in the contractor community.

**Published results:** 10→40% close rate in 30 days (HVAC), +45% revenue in 4 months, $5M+ annual revenue attributed to Rilla for one customer.

**Rilla's structural weaknesses:**
- No per-call dollar-denominated estimated opportunity output. Rilla shows behavioral scores and aggregate trends — not "this call left $X at your actual prices."
- No FSM integration. Zero connections to ServiceTitan, Jobber, or Housecall Pro. Cannot correlate a recorded conversation with an actual invoice.
- No pricebook integration. Revenue impact is manager-estimated, not driven by real company prices.
- Zero plumbing/drain-specific case studies published. Neighborly (Mr. Rooter, Benjamin Franklin Plumbing) is a customer, but no drain/plumbing result has been demonstrated.
- Horizontal product. The same AI scores dental case acceptance, auto repair, and drain calls. No trade-specific logic.
- Demo-gated pricing, likely $150-300+/seat/month. Inaccessible to sub-10-tech shops.
- Designed for dedicated in-home sales reps doing estimate/close visits — not service techs performing repairs with opportunistic upsell.

**The technician backlash problem:**
> *Reddit, r/cincinnati, May 2024 (389 upvotes):* "Apollo Home has a new software called Rilla... we're told not to tell the customer that it is even a thing."
> *Reddit, r/legaladvice, January 2025:* "My boss is forcing us to use this app called Rilla... he said no and not to tell them." — Top reply: "California is a two-party consent state. What your boss is making you do is most likely illegal."

This backlash is Rilla's structural vulnerability and Kova's sharpest positioning advantage.

**Competitive timeline:** Rilla will likely notice Kova when it begins appearing in industry conversations (Month 4-6). Their response window is **6-12 months** — not 18. Neighborly already processes plumbing/drain recordings (Mr. Rooter, Benjamin Franklin). A pricebook integration is a settings screen and a database table — a 4-person team can ship it in 6-8 weeks. The stealth window exists; use it aggressively.

### ServiceTitan Field Pro (powered by Siro)

AI field intelligence embedded inside ServiceTitan. Auto-records calls on arrival, scores behavior, surfaces rehash opportunities. **Real cost for a 5-tech shop: $2,000-$2,500+/month** (ST base at $259-$350/tech/month + Field Pro add-on). Described by Reddit users as "a full-time employee's salary every year" and "insane for a small shop."

**Weaknesses:** Locked to ServiceTitan entirely. Total cost excludes any shop under 10 techs. No per-call dollar output. Weeks-to-months onboarding.

**Kova's edge:** FSM-agnostic. $178/month floor. Dollar-denominated output. 30-minute onboarding.

### Siro (standalone)

The AI engine behind ST Field Pro, also sold independently. Used by Culligan, Jacuzzi, Bath Fitter. Strong "Halftime" live in-call coaching. But: no FSM integrations, no trade-specific logic, no dollar output, enterprise pricing, built for estimate/close visits not tech repairs.

### Others (brief)

- **Hatch:** Follow-up automation for unsold estimates. CSR/booking layer only. No field recording.
- **CallRail:** Marketing attribution with AI conversation layer on inbound CSR calls only. No in-person recording.
- **HCP AI Team:** Native to 150K HCP users but no field call recording. High-level analytics only.
- **Manual coaching programs (BDR, Nexstar, SET):** $500-$2,000/month for human coaches covering ~10% of calls. Kova competes directly for this budget line at 100% coverage for 20% of the cost.

### Positioning Matrix

| Capability | **Kova** | Rilla | ST Field Pro | Siro |
|---|---|---|---|---|
| Records field / in-person calls | ✅ | ✅ | ✅ | ✅ |
| Trade-specific logic (plumbing/drain) | ✅ | ❌ | Partial | ❌ |
| Dollar-denominated estimated opportunity | ✅ | ❌ | ❌ | ❌ |
| Pricebook-driven accuracy | ✅ | ❌ | ❌ | ❌ |
| FSM-agnostic | ✅ | ✅ | ❌ ST only | ✅ |
| FSM integration (job data + invoice) | ✅ | ❌ | Native (ST) | ❌ |
| Pre-call intelligence | ✅ | ❌ | ✅ ST data | ❌ |
| Accessible pricing (<$300/seat/mo) | ✅ | ❌ | ❌ | ❌ |
| Bilingual (EN + ES) | ✅ | ❌ | ❌ | ❌ |
| Transparent consent UX | ✅ | ❌ | Partial | ❌ |
| Self-proving ROI report | ✅ | ❌ | ❌ | ❌ |

### Competitive Defense

**Speed + Depth + Lock-In** is the three-part defense against a Rilla response:

1. **Compress the stealth window.** Recruit 5-10 design partners in the first 60 days (not just Drain Right). Publish the first case study at Month 3 — not Month 6. Own "plumbing revenue intelligence" and "drain tech coaching" in search and community before Rilla notices the niche.

2. **Build moats Rilla won't copy.** Trade-specific scoring logic (camera inspection triggers tied to recurrence timing, hydrojet vs. snake logic based on drain symptoms) doesn't translate to dental or senior living. Pricebook + FSM invoice matching requires active FSM integrations Rilla doesn't have. Join PHCC, sponsor Nexstar content — become "the product the plumbing community built."

3. **Create lock-in through data accumulation.** After 6 months, a customer has a scored archive of hundreds of calls, a configured pricebook, tech performance history, manager coaching annotations, and FSM write-backs. That archive isn't portable to Rilla. Aggressively encourage data accumulation from Week 1.

---

## 7. Core Product

### The Workflow

```
Dispatch → [Pre-Call Brief] → Record (with Consent) → Transcribe + Analyze
         → Estimated Opportunity Report → Tech Coaching View → Manager Review
         → Dashboard + ROI Report
```

---

### Phase A: Pre-Call Intelligence

**FSM Connected:** On dispatch, Kova pulls job data (customer name, job type, history, prior notes). AI generates a pre-call brief pushed to the tech's phone: customer history highlights, job-type-specific things to look for, top 2-3 upsell angles based on job type and customer history. One-tap dismissal.

**Standalone (No FSM):** Owner creates pre-call checklists per job type. Tech or dispatcher enters customer notes manually. Delivered as a reminder card when the tech starts recording.

---

### Phase B: Record

Recording begins only after the consent popup is completed (see Section 9 for full consent spec). Core recording features:

- One-tap record with prominent button accessible from lock screen shortcut
- Background recording — app does not need to remain foregrounded
- Recording indicator always visible during active session
- Pause/resume for interruptions (running equipment, phone calls)
- Offline capable — records locally, queues upload when connectivity resumes
- Auto-upload on job completion or wi-fi connection
- Job tagging: manual entry or auto-matched via FSM
- Audio compression: Opus codec at 16kbps mono (~7MB/hour) for battery and bandwidth efficiency

**Battery management:** Continuous audio recording drains battery 3-5x faster than normal use. Mitigations: in-app battery level indicator with pre-job warning, auto-pause at 15% battery with tech notification, wired earphone mic support (better audio quality, reduces screen power draw).

---

### Phase C: Transcribe + Analyze

- Audio → transcription pipeline, target <5 minute turnaround
- Language detection: English and Spanish supported from launch; bilingual (code-switching) calls handled per-sentence
- **Rules layer (deterministic):** explicit trigger detection — keywords, phrases, timing, sequences. Predictable and auditable. Example: "Did tech offer camera inspection after customer mentioned recurrence?"
- **LLM layer (contextual):** understands implied meaning, multi-turn flow, and nuance. Catches misses rules cannot detect from keywords alone. Scores qualitative dimensions.
- **Hybrid output:** both layers contribute independently. LLM can surface items rules missed; rules constrain LLM on high-stakes scoring items.
- Audio quality assessed at ingestion — calls flagged High / Medium / Low / Failed with handling appropriate to each level

---

### Phase D: Estimated Opportunity Report (Pricebook-Powered)

The core product output. Every dollar figure is calculated from the owner's actual pricebook — not industry averages.

**Sample output:**

```
CALL SUMMARY — Mike Chen | Drain Job | May 5, 2026
Language: English  |  Audio Quality: High  |  Duration: 28 min

Overall Score: 61 / 100
Estimated Opportunity: $2,890*

ESTIMATED OPPORTUNITIES

  • No camera inspection offered                        +$425
    (Your price: $425)
    Customer said "this keeps happening" at 4:22
    [▶ Play clip — 0:23]  [Not Applicable ▾]

  • Hydrojet upgrade not presented                      +$750–$950
    (Your price range: $750–$950)
    Snaking diagnosed, long-term option not offered
    [▶ Play clip — 0:18]  [Not Applicable ▾]

  • No maintenance plan mentioned at close              +$1,500 LTV
    (Your annual plan: $299/yr → avg 5yr LTV $1,500)
    No service agreement discussed at close
    [▶ Play clip — 0:31]  [Not Applicable ▾]

WHAT WENT WELL
  ✓ Root cause explained clearly before pricing
  ✓ Options-based close attempted

*Estimated opportunity reflects your pricebook prices. Actual revenue
 potential depends on customer need, timing, and context — not every
 flagged opportunity would have been accepted.
```

#### Opportunity Rollout — Phased by Confidence

Not all opportunity types launch simultaneously. High-confidence, low-ambiguity types launch first.

| Phase | Opportunity Types | Why High Confidence |
|---|---|---|
| Launch | Camera inspection after recurrence signal; Maintenance plan not offered at close | Binary detection: recurrence + no camera = clear. No close discussion = binary. |
| Phase 2 (Month 3+) | Hydrojet not presented when snake-only diagnosed | Requires understanding of diagnosis — higher confidence after model tuning |
| Phase 3 (Month 6+) | Water heater, whole-home walkthrough, filtration, service agreement framing | More contextual; require annotated data to be accurate |

#### Confidence Thresholds

| Confidence | Display |
|---|---|
| 85%+ | Shown in tech-facing coaching view as primary feedback |
| 60-85% | Shown in manager view with "Review recommended" — not surfaced to tech unless manager promotes it |
| <60% | Shown in manager view only with "Uncertain — verify manually" — never shown to tech |

#### Tech Dispute Mechanism

Every flagged opportunity in the tech-facing view includes a **"Not Applicable" button** with required reason:
- "Customer already has this service"
- "I offered it — customer declined (not captured in audio)"
- "Not relevant to this job type"
- "Customer said they couldn't afford more today"
- "Other"

When a tech disputes a flag: the flag is hidden from their coaching view, the dispute data feeds model refinement, the manager still sees the flag with the dispute reason attached, and dispute patterns across all techs are surfaced as retraining signal.

**Product health gate:** If the dispute rate on any specific opportunity type exceeds 40% across all techs, that type is pulled from auto-scoring and reviewed by the Kova model team before re-enabling.

#### Contextual Suppression Signals

The scoring engine auto-suppresses opportunity flags in specific contexts:
- **"I can't afford more right now"** (or equivalent) detected → suppress all upsell flags for the remainder of that call
- **Emergency context detected** (flooding, burst pipe, no heat/hot water) → switch to "emergency mode" — no opportunity flags, score focuses on speed and safety
- **First-time caller with no service history** → reduce recurrence trigger sensitivity
- **Short call (<8 minutes)** → flag as "Short call — limited scoring" and score only dimensions that plausibly had time to be addressed

#### Invoice Calibration (When FSM Connected)

When ST or Jobber is connected and invoice data is available, track the ratio of "estimated opportunity" to actual invoice amount per job type over time. If Kova consistently shows $3,000 estimated opportunity on drain jobs that invoice for $250, the model is miscalibrated. Display calibration confidence to the owner: *"Estimates are based on X calls matched to invoices — accuracy improves over time."*

---

### Phase E: Scoring Systems

#### Drain Scoring Dimensions

**Diagnosis Quality (0-3 pts):** Root cause explained in plain language; recurrence risk discussed explicitly. LLM-evaluated + timing check (time spent on diagnosis before pricing).

**Camera Inspection (0-3 pts):** Trigger: recurrence signal, older home (pre-1980), prior visit. Scored: offered and accepted (3) / offered and declined (2) / not offered after trigger (0). Not offered after trigger = automatic estimated opportunity flag.

**Hydrojet vs. Snaking (0-3 pts):** Long-term vs. short-term solution explained (yes/no). Hydrojet presented as an option even if snaking ultimately selected (yes/no). Full score requires both.

**Maintenance Plan (0-3 pts):** Mentioned at all (1pt) / tied to customer's stated pain (1pt) / offered with specifics — price and coverage (1pt).

**Customer Education (0-3 pts):** Time spent building trust before pricing. Price mentioned within first 2 minutes = flag.

**Close Quality (0-3 pts):** Options presented (good/better/best) vs. single quote; objection handling present; close language quality (LLM-evaluated).

**Customer Experience Quality (0-3 pts) — New Dimension:**
A fourth layer not present in most competitors. Detects whether recommendations were contextually appropriate:

| Signal | Detection | Scoring |
|---|---|---|
| Primary complaint addressed before upsell discussion | Timing analysis | Full primary diagnosis before any upsell mention = 3 |
| Upsell connected to stated customer pain | LLM contextual match | Direct connection to what customer said they're worried about = 3 |
| Customer expressed discomfort or pressure | Sentiment + keywords | "I really can't afford more," "I feel pressured" → flag |
| Recommendations tied to observable evidence | LLM analysis | Tech explains what they saw/tested before recommending = better score |

A call where a tech pushed three upsells to a customer who said twice "I can't afford more today" should score **lower overall** — not higher because all opportunities were offered.

#### Plumbing Scoring Dimensions

**Whole-Home Walkthrough (0-3 pts):** Checked additional fixtures: full (3) / verbal offer (2) / no mention (0).

**Water Heater Opportunity (0-3 pts):** Trigger: age >10yr, rust, slow recovery, customer hot water complaint. Trigger + qualified offer (3) / trigger + mentioned only (2) / trigger missed (0).

**Filtration / Softener (0-3 pts):** Water quality triggered + solution offered.

**Fix vs. Improve Framing (0-3 pts):** Upgrade or improvement path offered alongside repair: LLM-evaluated.

**Service Agreement (0-3 pts):** Offered at close (2pts) / connected to customer's specific pain (1pt).

#### Over-Recommendation Detection

Flag calls where the tech's offer pattern is inappropriate for context:
- Multiple high-cost upsells on an emergency call → flag as "poor timing"
- Upsell offer before diagnosis is complete (price mentioned in first 2 minutes) → flag as "premature offer"
- Same upsell offered twice after customer declined once → flag as "pressure indicator"

These flags route to manager review as coaching opportunities — they do not automatically penalize the tech's score.

---

### Phase F: Coaching

- 1-3 actionable coaching insights per call
- Linked to timestamped audio clips (±30 seconds around trigger moment)
- **Tech view:** simplified summary with clips, "mark as reviewed" per point, coaching insights in the tech's call language (Spanish-primary techs receive Spanish-language coaching cards)
- **Manager view:** full scored breakdown, clip access, written coaching notes, flag for 1:1
- Manager can share clips via secure expiring link

---

### Phase G: Track

- Owner/manager dashboard updates in real time after each processed call
- Metrics roll up: per call → per tech → per week/month
- Gamification stats updated
- Daily "yesterday's highlight" push notification to owners
- Weekly digest email to owner and all managers every Monday

---

### Call Library & Search

Full archive of every recorded call with metadata: date, tech, job type, duration, score, estimated opportunity total, language, confidence level, FSM job # if connected. Audio player with synchronized transcript. Search by keyword, tech, job type, date range, score range, estimated opportunity amount, language, confidence. Saved searches for recurring review workflows.

---

### Multi-Language Support

English and Spanish supported from launch — no manual selection required. Language is auto-detected per call. Bilingual (code-switching) calls handled sentence-by-sentence. Scoring trigger phrases defined in both languages. Tech-facing coaching insights delivered in the tech's call language. Manager/owner interface remains English in v1.

---

## 8. Platform & Technical Strategy

### Cross-Platform from Day 1

iOS and Android ship simultaneously. A cross-platform framework — React Native or Flutter — is the approach. Two fully native codebases (Swift + Kotlin) are inadvisable for an early-stage team: every feature ships at 2x development cost, every bug must be found and fixed twice, QA doubles. The target demographic (plumbers, drain techs) skews 50-60% Android based on income band demographics (CIRP data) and rugged phone market data (95%+ Android: CAT, Samsung XCover, Kyocera DuraForce). Android parity is a hard launch requirement.

**Framework decision (required before Phase 1 kickoff):** React Native (preferred if team is JS/TS-proficient) or Flutter (preferred if audio library maturity is a priority). Kotlin Multiplatform (KMP) offers the best audio fidelity but carries a steeper learning curve. The choice should be validated against the one non-negotiable native requirement: background audio recording must use native bridges — `AVAudioSession` on iOS, Foreground Service on Android.

### Audio Architecture

- Background recording validated for battery and reliability before framework commitment
- Opus codec at 16kbps mono: excellent voice quality at ~7MB/hour vs. ~100MB/hour uncompressed
- Offline-first: local recording with auto-upload queue; no call data lost on connectivity interruption
- Wired earphone mic support: removes phone-in-pocket muffling and reduces screen power drain

### Transcription Pipeline

- Provider: Deepgram (Nova-3, optimized for background noise) or AssemblyAI (Universal-2, best-in-class diarization) — validate against plumbing vocabulary and Spanish accuracy before committing
- Target latency: <5 minutes for a 30-minute call
- Per-language Word Error Rate (WER) tracked separately for English, Spanish, and bilingual calls
- If Spanish WER exceeds English WER by more than 15 percentage points: all Spanish call scores automatically flagged "lower confidence — transcription accuracy may be affected" in the manager view

### AI Architecture Evolution

| Phase | Timeline | Approach |
|---|---|---|
| Phase 1 | Now | Rules-based triggers + GPT-4o / Claude for contextual analysis |
| Phase 2 | 12-18 months | Fine-tune on annotated call data from real Kova users |
| Phase 3 | 24+ months | Proprietary model trained on a plumbing/drain call corpus |

### FSM Integration Architecture

**Standalone mode is the primary experience.** Connecting an FSM unlocks enhancements — it is never a requirement.

| Standalone Mode | FSM-Connected Mode |
|---|---|
| Manual job tagging | Pre-call brief (AI pulls customer history on dispatch) |
| All recording, scoring, estimated opportunity, dashboard | Auto job-matching |
| Manual pre-call notes via job-type templates | Invoice matching |
| Industry-default or manually configured pricebook | Push results to FSM job record |
| No invoice matching | Pricebook sync |

**Adapter architecture (required — no one-off integrations):**

```
[Kova Core] ←→ [FSM Adapter Interface]
                    ↓             ↓             ↓
             [ST Connector]  [Jobber Connector]  [HCP Connector]
```

Standardized data model: `Job { id, customer_name, address, job_type, tech_id, dispatch_time, invoice_amount }`. Each FSM connector translates to this model. Adding Jobber or HCP is a new connector, not a new architecture.

**FSM Integration Tiers:**

| Tier | FSM | Timeline | Why |
|---|---|---|---|
| 1A | ServiceTitan | Phase 1 (minimum viable) | Required for Drain Right pilot. Narrow scope only. Read job data on dispatch + write call score as job note. |
| 1B | Jobber | Phase 2 parallel | Largest unserved SMB pool (100K+ shops). No competing first-party product. Open GraphQL API, no approval gating. |
| 2 | Housecall Pro | Phase 3 | 150K+ users. API maturity to be assessed during Phase 2. |
| 3 | FieldEdge, ServiceFusion, others | Phase 4+ | Community-requested. |

**ServiceTitan risk note:** ST has built 9+ "Pro" products that compete with their own marketplace partners (including acquiring Schedule Engine, a successful partner, and rebranding it as Scheduling Pro). Their API requires a multi-month partner approval process. Phase 1 ST integration scope is intentionally narrow — job data read + call score write. It can begin with manual job tagging at Drain Right while the API connection is built in weeks 4-8.

---

## 9. Consent & Legal Compliance

### The Legal Reality

Recording a customer in their home triggers the highest constitutional expectation of privacy under *Katz v. United States* (1967). Eleven states require all-party consent, with penalties ranging from civil fines to felonies:

| State | Maximum Penalty |
|---|---|
| California (Cal. Penal Code §632) | $2,500 + 1 year jail; civil: $5,000 or 3x damages |
| Florida (Fla. Stat. §934.03) | 3rd degree felony, up to 5 years |
| Pennsylvania (18 Pa.C.S. §5703) | 3rd degree felony, up to 7 years |
| Maryland, Massachusetts, Connecticut, Washington, New Hampshire, Montana, Illinois, Hawaii | Felony or misdemeanor charges |

California CCPA (Cal. Civ. Code §1798.100): voice recordings are "personal information." $2,500/violation unintentional, $7,500/violation intentional. Notice must be given to the customer — not just the tech.

Illinois BIPA (740 ILCS 14): if Kova's AI creates any voice profile or speaker identification model, BIPA applies. $1,000-$5,000 per occurrence with each collection a separate violation (*Cothron v. White Castle*, 2023). Determine before launch whether Kova's AI creates anything that qualifies as a voiceprint.

### The Consent Mechanism

When the tech taps "Start Recording," a modal appears **before** recording begins:

```
Before Recording Starts

Please verbally inform your customer:
"I'll be recording this appointment for quality
purposes — is that okay with you?"

Once they agree, tap Start.

[ Customer Consented — Start Recording ]    [ Cancel ]
```

**Three functions of the popup:**
1. Reminds the tech of their verbal disclosure obligation on every call (not just during onboarding)
2. Creates a timestamped log entry: "Tech [name] confirmed customer consent at [time]" — the company's compliance record
3. Prevents accidental recording before the customer has been told

**Audible recording tone:** When recording begins, the app plays a brief audible tone. This provides ambient secondary notice verifiable in the recording itself.

**State-configurable consent language:** Admin settings allow owners to select their state(s) of operation. In two-party consent states, the reminder text and recording tone are mandatory. In one-party states, they are optional but default to on.

### The "Customer Declined" Workflow

When a customer declines, the tech taps "Customer Declined" instead of "Start Recording." This:
- Does not record the call
- Logs the decline with timestamp and tech ID
- Counts the job as a dispatched job not recorded for a legitimate reason
- Excludes the job from the compliance recording rate denominator
- Prevents managers from penalizing techs for customer-initiated declines

### Recording Rate Target: 65-75%

The 80% target in earlier planning assumed no meaningful customer decline rate and near-perfect technical conditions. The revised, realistic target:

| Recording Rate | What It Means |
|---|---|
| 80%+ | Exceptional — likely only with geofence auto-recording + mandatory policy |
| 65-75% | Strong — realistic target accounting for ~10% customer declines, ~5-8% technical issues |
| 50-60% | Acceptable — minimum viable for meaningful data volume |
| Below 50% | Failure state — product cannot score reliably; owner will churn |

### AI Scoring Legal Compliance

**Informs decisions, does not make them.** Kova scores are performance insights that inform coaching conversations and development planning. They are not automated employment decision tools (AEDTs) that substantially assist or replace discretionary employment decisions. This distinction matters legally — NYC Local Law 144 requires annual independent bias audits, public disclosure, and 10-day advance employee notice for AEDTs, with penalties of $500-$1,500 per violation per day.

Concrete language across all product surfaces: *"Performance insights to inform coaching conversations and development planning. Employment decisions should incorporate multiple inputs and human judgment."*

**Score explainability:** Every score is decomposable into specific, human-readable reasons with timestamps and clip links. Techs can understand and contest any score. This satisfies due process requirements and is the product's defense against discrimination claims.

**Cross-language bias testing:** Before the first paying customer goes live, run a structured bias test: 20 English calls, 20 Spanish calls, 10 bilingual calls through the full pipeline. If Spanish calls score more than 10 points lower than equivalent English calls, the model has a bias requiring correction before deployment. Repeat quarterly.

**Audit trail retention:** Raw transcript segments, detected triggers with timestamps, confidence scores per trigger, final score per dimension with reasoning, and dispute history are retained separately from the standard call retention policy for a minimum of 3 years.

### Pre-Launch Legal Checklist

- [ ] Consult with California privacy attorney to validate consent popup flow against Cal. Penal Code §632 and CCPA — before any recordings are made (~$300-500 for 1-hour consultation)
- [ ] Determine if Kova's NLP creates anything qualifying as a voiceprint under Illinois BIPA — if yes, BIPA compliance required for Illinois customers before launch
- [ ] Audit Drain Right's existing recording/consent policy — they may already have customer disclosure in place
- [ ] Audit Drain Right tech team Android vs. iOS split to validate platform timeline
- [ ] Run cross-language score parity test before first paying customer

---

## 10. Technician Adoption Strategy

### Why Adoption Is Mission-Critical

The biggest execution risk for Kova is not technology — it is technician behavior. If recording rates are low, the product has no data and delivers no value. Gamification alone fails for this demographic: research consistently shows voluntary recording compliance settles at 30-40% without structural enforcement. Gamification is retained as a secondary layer but the primary architecture shifts to structural and motivational.

### Five-Layer Adoption Architecture

**Layer 1 — Mandatory Recording as Job Policy (Owner-Enforced)**

The product supports enforcement, not just motivation:

- **Dispatch-linked compliance:** When FSM is connected, Kova knows when a tech was dispatched. Every dispatched job without a corresponding recording is automatically flagged in the manager's review queue as a "compliance gap" — equal visual weight to coaching scores.
- **Non-recording reason capture:** When a job ends without a recording, the tech is prompted to log a reason before starting the next job: "Customer declined" / "Technical issue (battery/signal)" / "Emergency call — no time" / "Other." This creates accountability without punishing legitimate skips and gives managers real visibility into why recordings are missing.
- **Recording compliance as a primary KPI:** Shown on the manager dashboard alongside coaching scores. "Did they record?" is as important as "how did they score?"

**Layer 2 — Eliminate Friction to Zero**

- **Auto-record on arrival (Phase 2):** When the tech's GPS enters the customer's address radius, the app is already running and primed. Tech still taps the consent popup, but "forgot to record" is structurally eliminated. This moves from Phase 3 to Phase 2.
- **Lock screen shortcut + widget:** Record button accessible without unlocking the phone.
- **Wired earphone mic support:** Better audio quality without touching the phone.

**Layer 3 — Self-Defense Framing**

The most universally motivating frame for experienced tradespeople — more effective than "earn more" for veterans:

> "Kova protects you. When a customer claims you damaged something or said something you didn't say, the recording is your proof."

Supporting messages:
- "You have documentation that you offered the camera inspection and the customer declined — no one can blame you for missed revenue you actually offered"
- "If a customer disputes the scope of work, you have the conversation on record"

One story from a seasoned tech about a wrongful damage claim does more for adoption than 100 "earn more" messages.

**Layer 4 — Connect to Money Directly**

For techs motivated by compensation, abstract badges are weak:
- **Bonus structure integration:** If the owner ties a bonus ($25-50/week) to recording compliance AND a score threshold, adoption will be near-universal. Kova provides the performance export that feeds directly into bonus calculations.
- **Cash leaderboard:** A $100 gift card for the month's top scorer is more effective than any badge. Kova makes it easy for owners to run this.

**Layer 5 — Gamification (Secondary Layer)**

Retained but repositioned: it is an engagement layer for techs who are already recording at compliant rates. It rewards consistency, not initial compliance. Specific mechanics that work better for experienced tradespeople:
- **Streaks and personal bests** (compete against yourself) over competitive leaderboards
- Leaderboard visibility is owner-toggleable — some cultures prefer private scoring
- Badges earned for consistency over time, not just participation

### Tech-Facing Messaging Principles

**Lead with:** "This is your performance coach. It shows you how to make more money and documents your work so you're protected."

**Avoid:** Any framing that suggests management surveillance ("your boss is listening to every call"). Even if technically true, it destroys trust and tanked Rilla.

**Owner kickoff script:** Kova provides a suggested team meeting script for introducing the product — framed entirely around earning potential and documentation, not monitoring.

---

## 11. Go-To-Market

### Channel Strategy

**Phase 1 — Design Partner → Case Study (Months 1-3)**
- Drain Right as primary pilot, 5-10 additional design partners recruited in parallel
- Document: calls recorded, estimated opportunity identified, ticket change after coaching
- Target output: "$X in estimated opportunity identified in the first 30 days"
- Publish case study at Month 3 — not Month 6. First credible ROI story is the primary sales asset for all outbound
- Begin community presence in plumbing Facebook groups, PHCC forums, LinkedIn: claim "plumbing revenue intelligence" positioning before Rilla notices

**Phase 2 — ServiceTitan Users Without Field Pro (Months 2-6)**
- Target plumbing/drain companies on ServiceTitan who haven't purchased Field Pro (~90% of ST customers)
- Positioning: "You're already paying for the FSM. Here's the coaching layer at a fraction of Field Pro's cost — and it shows you the dollar amount at your actual prices."
- Channels: Titan Exchange (ST community forums), owner Facebook groups, LinkedIn direct outreach

**Phase 3 — FSM-Agnostic Expansion + PE Portfolio Companies (Months 4-9)**
- Jobber and HCP users — larger SMB pool, completely unserved
- Positioning: "No need to switch FSMs. Kova works with what you have."
- PE-backed home services platforms: identify firms active in plumbing/drain M&A (Apex Service Partners, Wrench Group, Five Star, Authority Brands). One PE portfolio deal could add 200+ seats at once. Sales conversation begins at Month 4 — product must be stable by Month 6 to support this.
- Trade associations: PHCC, NAPHCC
- Industry events: Service World Expo, Nexstar Super Meeting

**Phase 4 — Coaching Program Displacement (Months 6-12)**
- Target owners currently spending $500-$2,000/month on BDR, SET, Nexstar coaching
- Positioning: "100% call coverage for 20% of the cost of your current coaching program"
- ROI comparison content; direct outreach to known coaching program customers

### GTM Milestones

| Milestone | Target |
|---|---|
| Month 1 | Drain Right live, baseline metrics captured |
| Month 2 | 5+ additional design partners onboarded |
| Month 3 | First case study published; 5 paying customers |
| Month 6 | 10 paying companies, ~$15K MRR |
| Month 12 | 50 paying companies, ~$75K MRR |
| Month 18 | 150 companies, ~$225K MRR |

---

## 12. Pricing & Unit Economics

### Pricing Tiers

| Tier | Price/Seat/Month | Who It's For | Key Features |
|---|---|---|---|
| **Starter** | $89 | Owner-operators, 2-5 techs | Recording, transcription, post-call scoring, pricebook (manual + CSV + defaults), estimated opportunity output, basic coaching, gamification, EN + ES, 90-day archive, owner dashboard, weekly digest |
| **Pro** | $129 | Growing teams, 5-15 techs | Everything in Starter + pre-call intelligence, full call library (search + clips), manager dashboard, leaderboard, 12-month archive, FSM integrations (ST, HCP, Jobber), pricebook FSM sync, invoice matching, threshold alerts, Kova ROI Report |
| **Team** | $149 | Multi-manager, 15+ techs | Everything in Pro + multi-location, per-location pricebooks, custom scoring weights, team comparison, advanced reporting + export, API access, SOC2 docs, priority support |

**Floor:** Owner seat + 1 tech = 2 seats minimum ($178/month on Starter).

### Annual Billing — Default Offer

Annual billing is the primary offer. Monthly is available as an opt-in, not the default.

- **Default offer:** Annual plan — 2 months free (16% discount)
- **Concrete savings message:** A 5-tech Pro shop saves $1,290/year vs. monthly billing ($6,450/year vs. $7,740)
- Annual customers churn 20-30% less than monthly customers (ProfitWell data)
- Frame: "Most owners go annual and save significantly. Monthly billing is available if you need flexibility."

### ROI Positioning

A 5-tech shop on Pro = **$645/month**. Compared against:
- ServiceTitan + Field Pro: $2,000-$3,500/month
- Manual coaching programs (BDR, etc.): $500-$2,000/month
- Ride-along manager: $4,000-$8,000/month salary equivalent

One recovered maintenance plan offer per week pays for the entire Kova subscription.

**Real math:** If Kova moves average ticket by 17% (Rilla's published average lift):
- New average ticket on a $856 base: $1,001/call
- Per tech per year (12 calls/week × 50 weeks): $87,000 incremental
- 5-tech shop incremental revenue: ~$435,000/year
- Kova cost: $7,740/year
- **ROI: 56x**

### Unit Economics

**Per-call COGS (at scale):**

| Component | Estimated Cost |
|---|---|
| Transcription (Deepgram/AssemblyAI) | $0.008-$0.015/min |
| LLM analysis (GPT-4o/Claude) | $0.02-$0.08/call |
| Audio storage (S3-equivalent) | $0.001-$0.003/call/month |
| **Total per call** | **~$0.30-$0.60** |

**Gross margin:** 84-95% per seat depending on tier. At scale (10K+ calls/month), negotiate volume pricing on transcription APIs. Tier audio storage to cold storage for calls older than 90 days (~80% cost reduction).

---

## 13. Retention & Revenue Strategy

### The Churn Problem

SMB SaaS monthly logo churn runs 3-5% for this segment. At the plan's ARPU, the LTV math is tight. Four specific churn patterns require active defense:

1. **Early-stage drop-off:** 20-30% of new SMB customers churn in the first 90 days
2. **Involuntary churn:** 20-40% of all SMB churn is failed payments — fixable with dunning and ACH
3. **Seasonal churn:** Home services slow season (November-January) drives elevated cancellations
4. **Success-triggered churn:** As techs improve, the estimated opportunity number declines — owners may interpret declining numbers as declining value

### Layer 1 — Annual Billing Default

Already covered in Section 12. Annual customers churn at 1/3 the rate of monthly on an equivalent cohort.

### Layer 2 — Involuntary Churn Prevention

- Pre-dunning email at card expiry minus 7 days
- Smart retry logic: retry failed payments on the 1st and 15th of the month (typical payday dates for business accounts)
- In-app "payment failed" banner with one-tap update
- ACH/bank debit option (lower failure rate than debit cards)
- Visa/Mastercard Account Updater service: automatically refreshes expired card numbers, recovering ~30% of expiring card failures passively
- 7-day grace period before any service interruption after failed payment

### Layer 3 — Month 1-3 Activation Sprint

50% of first-year churn happens in the first 90 days. High-touch onboarding prevents it:

| Day | Trigger | Action |
|---|---|---|
| 1 | Account created | Founder/CS call within 24 hours: "Got you set up — want to walk through anything?" |
| 7 | Check-in | Text: "How's the first week going? How many calls recorded?" |
| 14 | If <10 calls recorded | Urgent outreach: "Let's troubleshoot together" |
| 21 | Usage review | Call with owner: review first scored calls, adjust pricebook if needed |
| 30 | First baseline | Deliver "Month 1 performance baseline" — this becomes the ROI benchmark |
| 60 | Progress review | "Here's how your team has improved vs. Month 1" |

**Activation gate:** If an account hasn't recorded 10 calls in 14 days, it's classified "at-risk" and receives urgent outreach. This is the single most predictive churn indicator.

### Layer 4 — Daily Workflow Integration

Products used daily churn at 1/3 the rate of products used weekly. Prevent Kova from becoming a "Monday morning dashboard":

- **Pre-call notification makes Kova daily for techs:** Every dispatched job generates a Kova notification
- **Post-call summary within 5 minutes:** Tech feedback arrives before they're in the truck
- **Daily morning push for owners:** "Yesterday's highlight: Marcus had your best call of the week — $1,200 captured. Carlos has a coaching point ready." 60-second daily touchpoint.
- **Manager call queue with daily urgency:** "3 calls need your review before Marcus's coaching session Friday"

### Layer 5 — Self-Proving ROI That Doesn't Backfire

Standard ROI reports create a specific churn risk: as techs improve, estimated opportunity per month declines. At some point an owner opens the report and thinks "we're paying $645 for a product that found $800 in value last month." The solution is cumulative framing and narrative evolution.

**Lead with cumulative, not monthly:**

```
KOVA PERFORMANCE REPORT — April 2026
Drain Right | 12 Months Active

SINCE YOU STARTED KOVA
  Total estimated opportunity identified:  $387,000
  Estimated recovered through coaching:   +$112,400
  Team improvement since Month 1:         +31% avg score

YOUR TEAM THIS MONTH
  April avg score: 79/100  (↑ from 61/100 in Month 1)
  April improvement vs. March: +4 points
  Top performer: Marcus (91 avg)
```

Cumulative numbers only go up. Monthly numbers go down when techs improve.

**Reframe declining estimated opportunity as victory:** When monthly opportunity drops >30% month-over-month, the report celebrates it explicitly: *"Your team's estimated opportunity dropped from $47K to $14K/month. That means they're capturing approximately $33,000 more in service value every month than when you started."*

**Narrative evolution by tenure:**

| Tenure | Primary Value Narrative | Key Metrics |
|---|---|---|
| Months 1-3 | Discovery: "Here's what's available" | Estimated opportunity per week, first call scores |
| Months 4-9 | Progress: "Here's how much has improved" | Score improvement, estimated recovery trend |
| Months 10+ | Maintenance: "Here's what we're protecting" | Regression prevention, new hire ramp speed, score consistency |

**Regression detection as Month 10+ value:** *"Marcus has held an 87+ avg score for 12 consecutive weeks. Research shows unmonitored performance typically regresses to baseline within 4-6 weeks without ongoing coaching accountability. Kova keeps the gains."*

**CS trigger for low-value months:** If monthly estimated opportunity falls below 3x subscription cost, do NOT auto-send the report. Trigger CS outreach to understand context first (slow season? tech turnover?). Schedule a call before the owner sees the numbers without framing.

### Seasonal Preparation

Model a 20-30% churn spike in November-January. Mitigations:
- October retention campaign: send owners their cumulative ROI since signup before year-end budget reviews
- "Slow season" quarterly payment option (Q4 at 25% of annual rate) rather than losing the account entirely

### Moving Upmarket

Primary outbound targets 8-15 tech shops — but move upmarket faster:
- Team tier ($149/seat, 15+ techs) should be actively sold from Month 4
- PE-backed companies are the lowest-churn, highest-LTV customers. One portfolio deal could add 200+ seats at once. Sales conversation begins at Month 4; the product must be stable enough to support this by Month 6.

---

## 14. Product Roadmap

### Phase 1 — Foundation (Months 1-3)
**Goal: Prove the estimated opportunity number is real — with the owner's own prices.**

- [ ] Mobile app: cross-platform (iOS + Android), consent popup, offline recording, auto-upload
- [ ] Battery management: Opus compression, low-battery warning at 15%, auto-pause
- [ ] Transcription pipeline (cloud, <5 min), EN + ES, per-language WER tracking
- [ ] Audio quality detection and confidence flagging
- [ ] Rules-based scoring engine — drain dimensions
- [ ] LLM integration (GPT-4o or Claude) for contextual analysis
- [ ] Estimated Opportunity Engine — 2 high-confidence opportunity types at launch (camera inspection, maintenance plan)
- [ ] **Pricebook: manual entry + CSV/Excel import + industry defaults**
- [ ] Tech dispute / "Not Applicable" mechanism on all flagged opportunities
- [ ] Contextual suppression signals (can't afford, emergency, short call)
- [ ] Confidence threshold display (85%+ in tech view, 60-85% manager only)
- [ ] Customer Experience Quality scoring dimension
- [ ] Over-recommendation detection
- [ ] Dispatch-linked compliance tracking (no recording = flagged gap in manager dashboard)
- [ ] Non-recording reason capture (tech logs reason before next job)
- [ ] Post-call summary: tech view (5 min turnaround) + manager view
- [ ] Owner dashboard: per-call, per-tech, weekly aggregate
- [ ] Basic call library: list view + audio playback
- [ ] Manual job tagging
- [ ] Gamification: streaks, personal bests, basic badges
- [ ] Onboarding: account → team → pricebook → first recording (<30 min)
- [ ] Weekly digest email
- [ ] Cross-language score parity bias test (pre-launch)
- [ ] Pre-launch CA privacy attorney consultation

**Phase 1 Success Gate:**
> Show Drain Right $20-50K in identified estimated opportunity within 30 days.
> Numbers powered by Drain Right's actual prices.
> Owner says the numbers feel accurate. Techs are recording and reviewing feedback.
> Recording rate ≥ 65%.

---

### Phase 2 — Intelligence (Months 3-6)
**Goal: Build the product owners will pay for and refer.**

- [ ] Full call library: search + clips + clip sharing + "Best Calls" library
- [ ] ServiceTitan integration (Tier 1A): job data read, call score write, pricebook sync
- [ ] Pre-call intelligence: FSM mode (AI brief) + manual mode (checklists)
- [ ] Full plumbing scoring model (all dimensions)
- [ ] Invoice matching: Kova estimate vs. actual ST invoice, calibration confidence display
- [ ] **Auto-record on arrival (geofence trigger)** — moved from Phase 3
- [ ] Real-time threshold alerts (high estimated opportunity push notification)
- [ ] Kova ROI Report (monthly, cumulative framing, narrative evolution, CS trigger for low-value months)
- [ ] Tech coaching points in Spanish
- [ ] Full badge set + personal bests
- [ ] Manager adoption dashboard (recording rate, review rate per tech)
- [ ] Compensation export (monthly PDF/CSV per tech) with coaching framing disclaimer
- [ ] Opportunity type Phase 2 rollout: hydrojet not presented
- [ ] Jobber API integration begins (Tier 1B)
- [ ] SOC 2 Type I process begins

---

### Phase 3 — Expansion (Months 6-12)
**Goal: Open the SMB market beyond ST users. Begin upmarket move.**

- [ ] Housecall Pro + Jobber integrations complete (read/write + pricebook sync)
- [ ] Multi-location dashboard + per-location pricebooks (Team tier)
- [ ] Team comparison views (any two techs, side-by-side)
- [ ] Custom scoring weight configuration
- [ ] API access (Team tier)
- [ ] Coaching completion metrics and trend tracking
- [ ] Spanish-language mobile app UI
- [ ] SOC 2 Type I certification
- [ ] Opportunity type Phase 3 rollout: water heater, whole-home walkthrough, filtration, service agreement framing
- [ ] PE-backed portfolio company sales motion begins
- [ ] Invoice calibration model maturity (meaningful accuracy signal)

---

### Phase 4 — Real-Time (Year 2)
**Goal: Become the operating layer for every field call.**

- [ ] Real-time in-call coaching (live alert to tech's phone during call)
- [ ] AI-generated pre-call scripts per job type
- [ ] ML model fine-tuned on annotated Kova call data
- [ ] HVAC trade scoring model (new vertical)
- [ ] Rehash/reactivation lead engine (near-miss flagging from past calls)
- [ ] SOC 2 Type II + enterprise SSO (SAML/SCIM)

---

### What NOT to Build

| Category | Why Not |
|---|---|
| CRM / customer management | FSMs own this — don't compete |
| Booking and scheduling | FSMs own this |
| Payment processing | Stripe + FSMs handle it |
| Marketing / ad attribution | CallRail's domain |
| HVAC scoring model (Year 1) | Nail plumbing/drain first |
| Real-time coaching (Phase 1) | High latency risk; distraction risk for techs |
| Proprietary ML model (Phase 1) | Need annotated training data — earn it in Phase 1+2 |
| Multi-trade expansion (Year 1) | Trade specificity is the moat — don't dilute it |
| Full pricebook / CPQ tool | Kova uses prices, it doesn't manage them |
| Auto-translation of transcripts | Phase 3+ — not needed for CA pilot market |

---

## 15. Success Metrics

### North Star Metric

> **Do owners believe the estimated opportunity numbers are real — and does seeing them change technician behavior?**

If yes: product sticks. Customers convert. Referrals happen.
If no: nothing else matters.

---

### Phase 1 Targets

| Metric | Target |
|---|---|
| Estimated opportunity identified (Drain Right, 30 days) | $20K-$50K |
| Owner credibility rating | ≥ 8/10 ("this feels accurate") |
| Tech coaching review rate | ≥ 60% of coaching points reviewed |
| Post-call summary open rate | ≥ 70% |
| Recording rate (recorded / dispatched jobs) | ≥ 65% |
| Time to first scored call (from signup) | < 35 minutes |

### Product Health Metrics (Post-Launch)

| Metric | Target |
|---|---|
| Recording rate per active account | ≥ 65-75% of dispatched jobs |
| Post-call summary open rate (techs) | ≥ 65% |
| Coaching point review rate | ≥ 60% |
| Owner dashboard WAU | ≥ 3x/week |
| Opportunity dispute rate per type | < 40% (health gate — types above 40% pulled for review) |
| Pricebook completion rate | ≥ 70% owner-configured (not default) |
| Gamification engagement | ≥ 50% of techs have active streak by Week 4 |
| At-risk activation flag resolution | < 14 days to 10 calls recorded |

### Business Metrics (Month 6+)

| Metric | Target |
|---|---|
| MRR growth | 20%+ month-over-month |
| Monthly logo churn | < 5% |
| NPS | > 50 |
| LTV / CAC ratio | > 5x |
| Average seats per account | 4-7 |
| Gross margin | > 85% |
| Annual billing mix | > 50% of new customers on annual |

---

## 16. Open Decisions & Pre-Launch Checklist

### Decisions Required Before Phase 1 Kickoff

| Decision | Options | Owner |
|---|---|---|
| Cross-platform framework | React Native vs. Flutter vs. Kotlin Multiplatform — must validate background audio recording on both platforms | Engineering / Founder |
| Score dispute authority | When a tech disputes a flag and manager disagrees, who has final authority? | Product |
| "Over-recommendation" flag consequences | Surfaced to owner, manager only, or both? Does it affect overall score? | Product |
| Geofence auto-record timing | Phase 2 confirmed — but is there a path to Phase 1 as the primary consent trigger? | Product / Legal |

### Decisions Required Before Phase 2

| Decision | Options | Owner |
|---|---|---|
| Annual billing default launch timing | Phase 1 (at launch) vs. Phase 2 | Founder / Business |
| ST API partnership application | Apply now — 2-6 month approval process. Scope carefully to avoid competitive positioning as Field Pro replacement | Product / Founder |

### External Inputs Required

| Item | Action | Timeline |
|---|---|---|
| CA consent compliance | Consult CA privacy attorney; validate popup consent flow against Cal. Penal Code §632 and CCPA | Before first pilot recording |
| Illinois BIPA | Determine if Kova's NLP creates voice profiles or speaker identification — if yes, BIPA compliance required for IL customers | Before Phase 1 launch |
| NYC LL 144 | Determine if any Phase 1 customers are in NYC; if yes, assess bias audit requirements | Month 3 |
| Drain Right phone audit | Confirm Android vs. iOS split among Drain Right's existing tech team | Month 1 |
| Drain Right FSM Field Pro status | If Drain Right has Field Pro active, integration narrative and competitive positioning change | Month 1 |
| Jobber API | Jobber API is publicly documented (GraphQL); begin scoping Tier 1B integration | Month 2 |

### Top 5 Risks to Monitor

| Risk | Probability | Current Mitigation Status |
|---|---|---|
| Tech adoption settles at 30-40% without enforcement | High (75%) | Mitigated by dispatch-linked compliance + non-recording reason capture + self-defense framing. Monitor recording rate weekly. |
| Rilla ships pricebook scoring for plumbing in 6-12 months | High (70%) | Design partner acceleration (5-10 Day 60), Month 3 case study, FSM integration depth (Rilla has zero). |
| Opportunity dispute rate >40% on any type → false positive collapse | Medium (60%) | Phased rollout (2 types at launch), confidence thresholds, tech dispute mechanism. Monitor dispute rate per type weekly. |
| SMB monthly churn hits 4-5%, LTV math breaks | High (70%) | Annual billing default, 90-day activation sprint, daily workflow integration, move upmarket faster. |
| iOS-only launch excludes 40-55% of target techs | **Resolved** | Cross-platform from Day 1. |

---

*Document version: v1*
*Status: Living document — update prior to each phase kickoff*
*Date: May 2026*
*See product-plan-v3.md and product-strategy-v1.md for full feature specs, competitive research citations, and amendment history*
