# Kova — Product Plan v3
## Revenue Intelligence Platform for Drain & Plumbing
### The Definitive Product Document

---

## What Changed from v2 → v3

| Area | v2 | v3 |
|---|---|---|
| Pricebook | One-line mention only | Full feature spec: fixed / range / tiers, manual + CSV/Excel + ST sync + defaults |
| Missed Revenue Engine | Generic industry price ranges | Powered by owner's actual pricebook |
| Onboarding | Not addressed | Full first-time setup flow spec'd |
| Tech adoption | Not addressed | Gamification: leaderboard, streaks, badges, personal bests |
| Notifications | Not addressed | Weekly digest + real-time threshold alerts |
| Audio quality | Not addressed | Confidence-flagged scoring + edge case handling |
| Multi-language | Not addressed | English + Spanish day one |
| Unit economics | Not addressed | Per-call COGS model + gross margin targets |
| Data security | Not addressed | Encryption, SOC2 target, retention, access controls |
| ROI attribution | Not addressed | Monthly "Kova ROI Report" — product proves itself |
| Admin controls | Partial | Full configurable settings defined |
| Competitive landscape | v2 missing Rilla | Rilla added as primary direct competitor with full profile |
| Rilla profile | Basic v3 entry | Full company profile: 123 employees, $20–50M ARR est., technician backlash Reddit data, zero plumbing/drain customers |
| Siro profile | Vague "powers ST" | Confirmed standalone, no FSM integrations on their page, OEM deal with ST clarified |
| ST pricing | Estimated range | Reddit-confirmed $259–$350/tech/month; 5-tech shop real cost documented |
| Consent positioning | Compliance checkbox | Elevated to competitive advantage vs. Rilla's surveillance backlash |
| "Missed revenue per call" framing | Not called out | Confirmed as genuinely novel vs. all competitors; added to differentiation section |
| ROI math | Hypothetical numbers | Real $856 avg ticket data + verified lift math (17% = $435K/yr for 5-tech shop) |
| GTM | 4 channels | Added Phase 5: PE-backed home services portfolio companies |
| Market readiness | Market size only | Added 74% AI adoption stat + PE consolidation tailwind |
| Adjacent competitors | Not addressed | New table: Zuper, FieldPulse, WEX FSM, Salesforce Agentforce, Podium, Durable |
| Nexstar Network | Listed as event only | Identified as both budget competitor and potential distribution partner |
| Competitive defense | Not addressed | What-if playbook for Rilla, ST, Siro, Jobber/HCP, new entrants |
| Billing guardrails | Not addressed | Fair-use policy + overage handling |
| Core data entities | Not addressed | Product-level entity overview |

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
ServiceTitan's Field Pro requires a $1,500–$3,000/month base FSM commitment before you can access their coaching layer. The 300,000+ shops on Jobber, Housecall Pro, or no FSM at all are completely unserved by any coaching or revenue intelligence product. Kova owns this segment.

### Market Readiness (2026)
The psychological barrier to AI adoption in the trades has crossed its tipping point:
- **74% of residential contractors** now see AI as key to efficiency (ServiceTitan State of the Trades Report, April 2026)
- AI adoption among commercial contractors **more than doubled** year-over-year (2025 → 2026)
- Rilla and Siro have proven the model works — 20–45% close rate lifts and 17%+ ticket increases are documented across HVAC and home improvement
- The question is no longer "does this work?" — it is "which product fits my shop?"

### PE Consolidation Tailwind
Private equity firms are aggressively rolling up residential plumbing, HVAC, and drain companies. ServiceTitan explicitly maintains a dedicated "Private Equity" solution category. PE-backed portfolios need standardized performance data across 10–50 acquired companies — this is an institutional buyer profile with budget, urgency, and scale requirements that map directly to Kova's value proposition.

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
- Dedicated VP of Operations or Field Operations Manager
- Revenue: $10M–$50M/year; typically on ServiceTitan
- **Core pain:** Scale has made consistent performance enforcement impossible — top techs average 2–3x the ticket of bottom techs with no systematic way to close the gap
- **Budget authority:** Can justify $3,000–$8,000/month if the revenue recovery ROI is clear

### Design Partner
- **Drain Right** (California) — primary pilot partner

---

### Persona A: "Mike" — The Owner-Operator
- Runs a 5-tech drain/plumbing company
- Knows his techs vary wildly in ticket size but cannot diagnose why
- Spends $500–$1,500/month on a coaching program or ride-alongs
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
- Actively evaluating ST Field Pro but balks at lock-in and the cost of a full ST upgrade
- Wants multi-location dashboard, per-location benchmarking, and a structured coaching workflow
- Willing to pay Team tier pricing; the ROI case just needs to be airtight

---

## 4. The Problem

Home service businesses lose an estimated **15–35% of potential call revenue** to technician behavior gaps. The core problems:

1. **No visibility.** Owners have no idea what their techs are saying on the job. Options today: ride-alongs (expensive, 1 person at a time) or manually spot-checking recordings (covers maybe 5 of 200 calls/week).

2. **Performance variance with no cause.** Some techs run $800 average tickets; others run $250. Without conversation context, owners fire good techs and keep bad ones — or just shrug.

3. **Coaching is manual and expensive.** Programs like BDR, Service Excellence Training, and The Successful Contractor charge $500–$2,000/month for human coaches who review a fraction of calls.

4. **The data exists but isn't being used.** Service calls are already recorded by law in many states. That audio sits in a folder and no one ever listens to it.

5. **Existing tools don't understand trades.** Gong and Chorus are built for B2B SaaS reps on Zoom calls. They have zero understanding of why a plumber should offer a camera inspection after diagnosing a recurring blockage.

6. **Revenue numbers aren't grounded in reality.** Even where coaching tools exist, "missed revenue" is shown as a generic industry estimate — not tied to what that specific company actually charges. Owners dismiss numbers they don't trust.

---

## 5. Competitive Landscape

### 5.1 Direct Competitors

#### Rilla
**What it is:** Rilla is the most direct competitor to Kova and the dominant in-person sales coaching platform in home services. It records face-to-face field conversations via a mobile app, transcribes them, scores reps against a custom-trained AI model, and enables managers to conduct "virtual ridealongs" — reviewing and coaching calls asynchronously in minutes rather than hours. It also supports real-time monitoring, allowing managers to listen to a live appointment and send the rep in-field messages mid-pitch.

**Company profile (as of 2026):**
- Founded 2019, HQ in Long Island City, New York
- CEO: Sebastian Jimenez (very active on LinkedIn)
- ~123 employees (LinkedIn-confirmed)
- Estimated **$20–50M+ ARR** based on employee count, 1,300+ customer base, and events spend (hosted "Rilla Masters 2026" in Miami with Bruce Buffer as announcer and a 200-ft LED screen)
- No publicly disclosed funding rounds; likely profitable or has taken undisclosed capital
- Graduated from Entrepreneurs Roundtable Accelerator (ERA) in May 2020; reportedly hit $1M ARR before buying an office

**Published customer results:**
- Climate Experts (HVAC): 10%→40% close rate in 30 days; avg ticket $550→$950
- Red Door Homes: +45% increase in sales in 4 months
- Windows USA: $5M+ annual revenue attributed to Rilla
- Abby Windows: one rep $70K→$236K/month
- GatorGuard: 32%→50% close rate
- Cardinal HVAC: manager ridealongs 6–7/week → 25–30/week
- Neighborly: 5,000 virtual ridealongs with 130 techs in 30 days

**Strengths:**
- Purpose-built for in-person / field conversations — not Zoom or phone
- Real-time monitoring + live in-call messaging is a genuine differentiator
- "Rick Copilot" — AI learns a specific manager's coaching style, language, and priorities; after enough ridealongs, it auto-generates comments the manager would have left (confirmed operational in 2026)
- Per-company customization: AI trained on the company's own sales process and top performers
- "Rilla Intelligence" — aggregate benchmark data across 1,300+ clients
- Fast setup advertised at 1 hour 45 minutes
- Strong brand recognition in the contractor community; customer referral loop is active

**Critical weaknesses:**
- **No per-call dollar-denominated "missed revenue" output.** Rilla shows behavioral coaching scores and aggregate trend metrics (close rate %, ticket size %) — it does not output "this call left $X on the table at your actual prices." That is the entire GTM wedge for Kova.
- **No FSM integration.** Rilla has no documented integration with ServiceTitan, Housecall Pro, Jobber, or any FSM. It cannot correlate a recorded conversation with the actual invoice amount — making true per-job revenue attribution structurally impossible in the current product.
- **No pricebook integration.** Revenue impact is manager-estimated or extrapolated from aggregate trends, not driven by the company's actual service prices.
- **Zero plumbing/drain-specific customers in their public case studies.** Their proven verticals are HVAC, windows/remodeling, home building, automotive, dental, and senior living. Neighborly (who owns Mr. Rooter and Benjamin Franklin Plumbing) is a customer, but no plumbing-specific case study has been published. Rilla has never demonstrated results in drain/plumbing call economics.
- **Horizontal, not vertical.** The same AI scores dental case acceptance, auto repair, apartment leasing, and service calls. It has no understanding that a recurrence signal on a drain job should trigger a camera inspection offer.
- **Pricing opaque / enterprise sales motion.** No public pricing; demo-gated. Likely $150–$300+/seat/month based on market positioning. Inaccessible to sub-10-tech shops without a dedicated sales manager.
- **Designed for dedicated in-home sales reps** doing estimate/close visits — not service technicians performing repairs with opportunistic upsell.

**The technician backlash problem (critical for Kova's positioning):**
Rilla has a documented and serious technician resistance issue. Real posts from Reddit and public forums in 2024–2025:

> *r/cincinnati, May 2024 (389 upvotes):* "As an employee it feels wrong but as a human it feels even more wrong... Apollo Home has a new software called Rilla. Rilla is designed to listen in and critique your customer interactions... **we're told not to tell the customer that it is even a thing.**"

> *r/legaladvice, January 2025:* "My boss is forcing us to use this app called Rilla... if we don't activate it we will be written up. I asked him if we have to let the customer know and **he said no and not to tell them.**" — Top response (18 upvotes): "California is a two-party consent state. **What your boss is making you do is most likely illegal.**"

> *r/HVAC, May 2024:* "Rilla sucks and that company stopped using it as well."

> *r/cincinnati, May 2025 (former Apollo employee):* "They also had the Rilla exposé last year. Techs don't even have privacy in the vehicle cab. **Please don't use these private equity companies anymore.** Abandon them with haste."

This backlash is Rilla's structural vulnerability and Kova's single sharpest positioning advantage. Techs associate Rilla with surveillance, PE-driven upsell culture, and secret recording. A product that is transparently consent-first, framed around helping techs earn more, and not associated with corporate surveillance practices has a clear path to adoption where Rilla struggles.

**Kova's edge:** Dollar-denominated missed revenue at the call level. Pricebook-driven accuracy (the owner's actual prices). Trade-specific drain/plumbing logic. FSM integration for provable invoice matching. Transparent consent UX (techs know and customers know). Technician-first framing (helps techs earn more, not surveils them for management). SMB-accessible pricing.

**The key narrative distinction:**
> Rilla tells techs they're being watched. Kova tells techs they're leaving money on the table.
> Rilla tells a manager *how* a rep performed. Kova tells an owner *what it cost them in dollars — on that specific call, at their actual prices.*

---

#### ServiceTitan Field Pro (powered by Siro)
**What it is:** AI field intelligence embedded into ServiceTitan. Auto-records calls on tech arrival, scores behavior against custom scorecards, surfaces rehash upsell opportunities, manager dashboard. Powered by Siro's AI engine under a white-label OEM deal. IPO'd on Nasdaq (TTAN) in late 2024; also launched "Atlas" AI assistant across their platform in 2026.

**Real pricing (Reddit-confirmed, 2024–2026):**
- Base ServiceTitan: **$259–$350/tech/month** (multiple verified reports)
- 5-tech shop = **$1,500–$1,750/month base** before add-ons
- Field Pro is an additional cost on top — not publicly priced
- Total estimated cost for a 5-tech shop with Field Pro: **$2,000–$2,500+/month**
- Annual cost: **$24,000–$30,000+/year** — Reddit consensus: *"insane for a small shop," "a full-time employee's salary every year"*
- Typical contract: annual or multi-year; no public cancellation terms

**Strengths:**
- Auto-recording triggers on job arrival via mobile app — no manual start
- Deep integration with ServiceTitan job data (ticket amounts, close rates, booking rates)
- Published results: +20% average ticket, +15% total sales per tech
- "Smart Rehash" surfaces missed upsells from past jobs (currently Early Access)
- "Atlas" AI assistant across the full platform (2026)
- 100,000+ service professionals on the platform; deep brand trust in the industry

**Critical weaknesses:**
- **Locked to ServiceTitan.** Field Pro is inaccessible to any shop not on ST
- Total cost puts it out of reach for shops under 10 techs
- No dollar-denominated "missed revenue" per call — behavioral scores only
- Famously complex onboarding (weeks to months); described as overkill for small operations
- Field Pro adoption appears early-stage — most ST customers don't yet have it
- Annual contracts with limited flexibility

**Kova's edge:** FSM-agnostic. Accessible pricing ($178/month floor vs. $2,000+/month). Dollar-denominated output. Pricebook-driven accuracy. 30-minute onboarding vs. weeks.

---

#### Siro (standalone)
**What it is:** The AI engine that powers ServiceTitan Field Pro under a white-label OEM deal — but also still available as a fully independent standalone product at siro.ai. Records in-person conversations via mobile app, provides AI coaching ("Halftime" for live tips), surfaces rehash leads, manager dashboards. Used by Culligan, Jacuzzi, Bath Fitter, Window World, Pella, and American Standard.

**Important clarification:** Siro is NOT exclusive to ServiceTitan. The ST partnership is a licensing/OEM deal. Siro continues to sell directly across auto, home improvement, home services, telecom, multifamily, senior living, and medical aesthetics. The two products coexist independently.

**Siro's actual integrations (2026):** Salesforce, HubSpot, Pipedrive, Microsoft Dynamics, LeadPerfection, Improveit360, SalesRabbit, CompanyCam. Notably — **no ServiceTitan, Jobber, or Housecall Pro FSM integrations are listed on their integrations page**, despite powering ST's Field Pro product. Siro cannot do FSM job-matching or invoice correlation independently.

**Strengths:**
- Purpose-built for in-person / field sales (not Zoom calls)
- Quantified results: 17% increase in units sold (Culligan), 21% close rate increase (American Standard), $500K revenue increase, 80% of reps using AI coach daily (Jacuzzi)
- "Halftime" live in-call coaching is differentiated
- FSM-agnostic — works across industries and platforms
- 100% faster new hire ramp time (published result)

**Critical weaknesses:**
- Designed for **in-home sales reps** on estimate/close visits — not service technicians doing repairs with opportunistic upsell
- Generic scoring with no plumbing/drain-specific trade logic
- No "missed revenue" dollar output — coaching scores and lead flags only
- No FSM-native integration — cannot pull job data, match invoices, or sync pricebook
- Enterprise pricing and demo-required sales motion; excludes small shops
- UI built for large sales organizations, not 3–5 tech owner-operators

**Kova's edge:** Technician-first. Trade-specific models. Revenue quantification per call. FSM integration for invoice matching. SMB-priced.

---

#### Hatch
**What it is:** Follow-up automation for home services — contacts unsold estimates and missed calls via SMS/email. Integrates with ServiceTitan and Jobber.

**Strengths:** Clear ROI story at the lead layer. ~$250–$500/month.

**Critical weaknesses:** Not a field call tool at all. CSR/booking layer only. No recording, no scoring.

**Kova's edge:** Different layer of the problem.

---

#### CallRail
**What it is:** Call tracking + marketing attribution with an AI "Conversation Intelligence" add-on.

**Strengths:** Strong marketing ROI. Wide integrations. ~$45–$200/month.

**Critical weaknesses:** Inbound phone calls to CSRs only. No in-person recording. No trades logic.

**Kova's edge:** Field-first, in-person, trade-specific.

---

#### Housecall Pro — "AI Team"
**What it is:** HCP's AI layer — CSR AI, Analyst AI, Coach AI across their FSM.

**Strengths:** Native to 150,000+ users. Affordable add-on.

**Critical weaknesses:** No recording for field calls. High-level business analytics only, not per-call behavioral scoring. Locked to HCP.

**Kova's edge:** Call-level scoring. FSM-agnostic.

---

#### General Conversation Intelligence (Gong, Chorus, Jiminny)
Best-in-class for B2B inside sales on Zoom/phone. $100–$200/user/month with platform minimums. No in-person recording. Zero trades knowledge.

**Kova's positioning shortcut:** "Gong for field technicians."

---

### 5.2 Manual Coaching Programs (Non-Software)
BDR, Service Excellence Training, The Successful Contractor, Nexstar Network — $500–$2,000/month for human coaches reviewing ~10% of calls at best.

**Kova's edge:** 100% call coverage for 20% of the cost. Kova competes directly for this budget line.

**Strategic note on Nexstar:** Nexstar Network is a major trade coaching and training organization with deep penetration in home services. They push average ticket improvement, call center optimization, and service manager training — all of which map directly to AI coaching use cases. Nexstar is both a potential **partner** (their members are ideal Kova customers) and a potential **distribution channel** (official vendor or recommended tool status within their network).

---

### 5.3 Emerging and Adjacent Competitors to Watch

These are not current direct threats but should be monitored:

| Company | What They Do | Why It Matters |
|---|---|---|
| **Zuper** | AI-powered FSM + "CSR Agent" (AI receptionist that answers calls and books jobs) | Approaching from the FSM layer; if they add field coaching it becomes a bundled threat |
| **FieldPulse** | FSM with "ClearPath" — guided tech workflows ensuring consistent job execution steps | Process enforcement at the job level, not conversation coaching; different angle on the same problem |
| **WEX FSM** (fmr. Payzerware) | Payments + FSM integration, launched Sept 2025 | Targeting small service companies; could add AI features |
| **Salesforce Agentforce for Field Service** | AI agents automating scheduling, troubleshooting, and job management (April 2025) | Enterprise-only today; eventual downstream pressure in 3–5 years |
| **Podium** | AI-powered messaging and reputation management for local businesses | Different layer (customer-facing, not tech coaching); no overlap today |
| **Durable** | AI tools for small service businesses (website, CRM, invoicing) | $14M raised Dec 2023; different layer but signals VC appetite for trades tech |

---

### 5.3 Competitive Positioning Matrix

| Capability | **Kova** | Rilla | ST Field Pro | Siro | Hatch | CallRail | HCP AI |
|---|---|---|---|---|---|---|---|
| Records field / in-person calls | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Trade-specific scoring (plumbing/drain) | ✅ | ❌ | Partial | ❌ | ❌ | ❌ | ❌ |
| Dollar-denominated missed revenue output | ✅ | ❌ | ❌ | ❌ | Partial | ❌ | ❌ |
| Pricebook-driven revenue accuracy | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| FSM-agnostic (no lock-in) | ✅ | ✅ | ❌ ST only | ✅ | Partial | ✅ | ❌ HCP only |
| FSM integration (job data + invoice) | ✅ | ❌ | Native (ST) | ❌ | ✅ | ✅ | ❌ |
| Pre-call intelligence | ✅ | ❌ | ✅ ST data | ❌ | ❌ | ❌ | ❌ |
| Real-time coaching | Roadmap | ✅ | Partial | ✅ | ❌ | ❌ | ❌ |
| Accessible pricing (< $300/seat/mo) | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Technician gamification | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Bilingual (EN + ES) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Self-proving ROI report | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Kova is the only product that checks all six core boxes:** records field calls + trade-specific logic + pricebook-driven missed revenue output + FSM integration for invoice matching + accessible pricing + self-proving ROI.

---

## 6. Competitive Defense Strategy

### Scenario 1: Rilla adds per-call dollar revenue attribution and targets drain/plumbing specifically
**Probability:** Medium (18–24 month horizon). Rilla has the recording infrastructure and customer base — dollar attribution is a product decision, not a technical impossibility.

**Kova's response:**
- Kova's pricebook integration is a structural advantage — Rilla has no FSM connection to pull real invoice data, making their revenue attribution an estimate at best
- Kova's drain/plumbing-specific scoring logic (triggered by job type, customer signals, and trade-specific upsell paths) takes 12–18 months of real call data to build credibly — Rilla starts from zero
- Accelerate the proprietary data moat: every Kova call scored is training data Rilla doesn't have
- Position Kova as "built for technicians, not sales reps" — Rilla's identity is tied to the in-home salesperson model (estimate/close visits); pivoting to service tech coaching is a brand and product rebuild
- Win on FSM integration depth: Rilla has no ServiceTitan, Jobber, or HCP integration — Kova's invoice matching makes the revenue number provably real

### Scenario 2: ServiceTitan makes Field Pro free (or heavily discounts it)
**Probability:** Medium (12–18 month horizon). ST may bundle Field Pro to compete with Housecall Pro's growth.

**Kova's response:**
- ST Field Pro still requires ST at $1,500–$3,000/month base — that moat doesn't disappear
- Lean harder into the 400,000 non-ST shops: Jobber, HCP, no FSM
- Accelerate pricebook-driven accuracy as a feature ST cannot match (they don't own the pricing layer)
- Publish ROI data showing Kova outperforms generic scoring because it uses real company prices

### Scenario 3: Siro goes downmarket (sub-$100/seat, self-serve)
**Probability:** Medium. Siro's institutional path runs through ST; a standalone SMB move would require a full pivot.

**Kova's response:**
- Siro has no trade-specific scoring logic — their model is generic sales coaching. Building drain/plumbing-specific models takes 12–18 months minimum with real data
- Push Kova's bilingual support and pricebook integration as differentiators Siro lacks
- Compete on ease of setup: Kova should be live in < 30 minutes; Siro requires an implementation process

### Scenario 4: Jobber or HCP adds native call recording + coaching
**Probability:** Low (24+ months). Both have announced AI roadmaps focused on booking and scheduling, not field coaching.

**Kova's response:**
- Being FSM-agnostic becomes the moat — work with all FSMs, not locked to one
- The trade-specific scoring logic and pricebook engine cannot be replicated by an FSM overnight
- By the time they ship it, Kova has 18+ months of annotated call data and a proprietary model

### Scenario 5: A well-funded startup specifically targets this niche
**Probability:** Low but real. This is a clear market gap.

**Kova's response:**
- First-mover advantage: proprietary training data from real plumbing/drain calls is the moat
- Design partner relationships (Drain Right + referrals) create a distribution advantage
- Trade-specific domain knowledge takes time — not just engineering

### Defensive Moat Summary
1. **Trade-specific call data** — proprietary and compound; competitors start from zero
2. **Pricebook integration** — credibility of the missed revenue number is irreplaceable
3. **FSM-agnostic distribution** — the widest addressable market, no single platform dependency
4. **Brand in the niche** — home service owners talk to each other; a trusted referral loop is durable

---

## 7. Core Differentiation

| Competitor frame | Kova frame |
|---|---|
| Coaching tool | Revenue recovery engine |
| Behavior score | Dollar-denominated missed revenue |
| Sales rep tool | Technician-first |
| Generic AI | Trade-specific (plumbing + drain) |
| Industry-average estimates | Your actual pricebook |
| FSM-locked | Works with any FSM or none |
| Enterprise pricing | SMB accessible |
| Surveillance (secret recording) | Transparent consent — techs and customers both know |
| "You're being watched" | "Here's what you left on the table" |

### Consent Is a Competitive Advantage
Rilla's backlash on Reddit reveals a structural flaw in how most companies deploy these tools: secretly, under management pressure, with techs told not to disclose recording to customers. In California and 10 other two-party consent states, this is illegal. In every state, it destroys tech morale and trust.

Kova is built differently from the ground up:
- Consent is captured on-screen before every recording — enforced in the app, logged with a timestamp
- Techs understand the tool helps *them* earn more — it is not a management surveillance device
- Customers are aware they are being recorded — this is the legally compliant and ethical default

This is not just a compliance decision. It is a product positioning decision. In a market where the #1 tech complaint about competitors is "it feels wrong," Kova can be the brand that home service companies trust to deploy without a revolt.

> **Transparency-first recording is Kova's answer to Rilla's biggest vulnerability.**

### Positioning
**Headline:** "Every call is worth more than you think."
**Sub:** Kova shows you exactly what your techs left on the table — per call, per tech, every day.

### "Missed Revenue Per Call" Is a Novel Concept in This Market
After thorough competitive research across every tool in the home services and field sales coaching space, **no competitor outputs a per-call dollar figure for missed revenue.** This is not an incremental improvement — it is a genuinely different thing:

| What everyone else does | What Kova does |
|---|---|
| "Your close rate improved 12%" | "Your tech left $850 on this call" |
| "Your average ticket is up 17%" | "Camera inspection not offered after customer said 'this keeps happening' — that's $425 at your price" |
| "Rep scored 71/100" | "Missed revenue: $2,890 — here are the 3 moments, here are the clips" |

The framing matters enormously for the home services buyer. Owners already think in dollars-per-truck-roll. Showing them a score or a percentage requires a translation step. Showing them a dollar amount tied to a specific call eliminates that translation entirely. It is visceral, specific, and actionable in a way that no competitor has built.

> **Kova = Revenue Intelligence Engine for service calls.**
> Not a coaching tool. Not conversation intelligence.

---

## 8. Core Workflow

### Phase A: Pre-Call Intelligence

**Mode 1 — FSM Connected:**
- On dispatch, Kova pulls job data from FSM (customer name, job type, history, prior notes)
- AI generates a pre-call brief pushed to the tech's phone:
  - Customer history highlights ("Last visit: 18 months ago — recurring drain issue")
  - Job-type-specific things to look for
  - Top 2–3 upsell angles based on job type and customer history
- One-tap dismissal: "Got it"

**Mode 2 — No FSM (manual):**
- Owner creates pre-call checklists per job type in admin settings
- Tech or dispatcher enters customer notes manually before the call
- Delivered as a reminder card when tech starts recording

---

### Phase B: Record
- One-tap to start recording — prominent button, accessible from lock screen shortcut
- Consent capture: single on-screen acknowledgment before recording begins
- Recording indicator visible at all times
- Pause/resume for interruptions
- **Offline capable** — records locally, queues upload when connectivity resumes
- Auto-upload on job completion or wi-fi connection
- Job tagging: manual entry or auto-matched via FSM

---

### Phase C: Transcribe + Analyze
- Audio → transcription pipeline (< 5 minute turnaround target)
- **Language detection:** English and Spanish supported day one
- **Rules layer:** deterministic trigger detection — keywords, phrases, timing, sequences
- **LLM layer:** contextual understanding of what was said and what it means in trade context
- **Hybrid output:** LLM surfaces nuanced misses; rules enforce deterministic scoring on high-stakes items
- **Audio quality check:** confidence score assigned at the start of processing — low-quality calls flagged, not discarded

---

### Phase D: Missed Revenue Report (Pricebook-Powered)

Per-call output — dollar amounts driven by the owner's actual pricebook, not generic estimates:

```
CALL SUMMARY — Mike Chen | Drain Job | May 5, 2026
Language: English  |  Audio Quality: High  |  Duration: 28 min

Overall Score: 61 / 100
Missed Revenue: $2,890

MISSED OPPORTUNITIES

  • No camera inspection offered                           +$425
    (Your price: $425)
    Customer said "this keeps happening" at 4:22
    [▶ Play clip — 0:23]

  • Hydrojet upgrade not presented                        +$750–$950
    (Your price range: $750–$950)
    Snaking diagnosed, long-term alternative not offered
    [▶ Play clip — 0:18]

  • No maintenance plan mentioned                         +$1,500 LTV
    (Your annual plan price: $299/yr → avg 5yr LTV $1,500)
    No service agreement discussed at close
    [▶ Play clip — 0:31]

WHAT WENT WELL
  ✓ Root cause explained clearly
  ✓ Options-based close attempted
```

---

### Phase E: Coaching
- 1–3 actionable coaching insights per call
- Linked to timestamped audio clips (± 30 seconds around trigger moment)
- **Tech view:** simplified summary with clips; mark each point as reviewed
- **Manager view:** full scored breakdown, clip access, notes, flag for 1:1
- Manager can add written coaching notes to any call

---

### Phase F: Track
- Owner/manager dashboard updates in real time after each processed call
- Metrics roll up: per call → per tech → per week/month
- Leaderboard and gamification stats updated
- Weekly digest email sent to owner and managers every Monday morning

---

## 9. Pricebook & Service Catalog

### Overview
The Pricebook is the foundation of Kova's missed revenue accuracy. Instead of showing owners generic industry estimates, Kova uses the company's actual service prices to calculate what was specifically left on the table. This is the feature that makes the missed revenue number undeniable.

Every missed opportunity in the analysis output is labeled with the owner's price — not an industry average.

---

### 9.1 Pricing Structure Options

Each service item supports three pricing models — owners choose what matches how they actually price:

**Fixed Price**
A single price for the service.
```
Camera Inspection     $425
```

**Price Range**
A low/high range for the service — useful when job complexity varies.
```
Hydrojet Service      $750 – $950
```

**Tiered Pricing (Good / Better / Best)**
Multiple named options for the same service category.
```
Drain Cleaning:
  Basic (snake only)          $189
  Standard (snake + flush)    $289
  Premium (hydro + camera)    $649
```

Owners can mix and match. One item can have a fixed price; another can have a range; another can be tiered. Kova handles all three in the missed revenue calculation (using the midpoint of ranges, and flagging which tier was missed when tier context is available from the call).

---

### 9.2 Service Catalog Structure

Each pricebook item contains:
- **Service name** (e.g., "Camera Inspection," "Water Heater Replacement")
- **Trade category** (Drain / Plumbing — maps to the scoring model)
- **Opportunity type** (maps to a scoring dimension: camera inspection, hydrojet, maintenance plan, water heater, etc.)
- **Pricing model** (fixed / range / tiered)
- **Price(s)**
- **LTV flag** — mark a service as recurring (e.g., maintenance plan) to unlock LTV-based revenue calculation
- **LTV inputs** (if LTV flag on): average contract duration + annual price → Kova calculates total LTV
- **Active / inactive toggle**

---

### 9.3 Adding and Managing the Pricebook

#### Method 1 — Manual Entry
- Owner navigates to **Settings → Pricebook**
- Clicks "Add Service"
- Fills in: name, category, opportunity type, pricing model, price(s)
- Saves — immediately active in the missed revenue engine

#### Method 2 — CSV / Excel Import
- Download Kova's template (pre-formatted with column headers)
- Fill in services and prices in the spreadsheet
- Upload via drag-and-drop on the Pricebook settings page
- Kova validates the file, shows a preview of all items being imported
- Owner confirms → all items imported in bulk
- Errors shown inline (missing required field, unrecognized category, etc.)

**CSV template columns:**
```
service_name | trade_category | opportunity_type | pricing_model | price_low | price_high | tier_name_1 | tier_price_1 | tier_name_2 | tier_price_2 | tier_name_3 | tier_price_3 | is_recurring | ltv_annual_price | ltv_avg_years
```

#### Method 3 — ServiceTitan Pricebook Sync
- When ServiceTitan is connected, owner can initiate a pricebook import from ST
- Kova fetches all ST pricebook items via ST API
- Maps them to Kova's opportunity types (owner confirms mappings for any ambiguous items)
- Owner reviews and approves the import
- Sync can be run again at any time to pick up price updates from ST

#### Method 4 — Pre-Loaded Industry Defaults
- On first setup, Kova pre-populates the pricebook with **default industry ranges** for California drain and plumbing markets (sourced from trade data)
- Owner sees a note on every item: "This is an industry default — update it with your actual price."
- Defaults can be used immediately to get started; owners override items as they go
- A "Pricebook Completion" indicator shows how many items still use defaults vs. owner-configured prices
- Dashboard shows a soft warning when missed revenue calculations are still using defaults: "Update your pricebook for more accurate numbers →"

---

### 9.4 How the Pricebook Powers the Missed Revenue Engine

When an opportunity is detected on a call:

1. Kova looks up the opportunity type in the pricebook
2. If owner has a fixed price → use exact price
3. If owner has a range → use midpoint for the display number, show the range in detail
4. If owner has tiers → use the mid-tier as the primary number; flag if context suggests a higher tier was available
5. If item is marked recurring (LTV) → calculate LTV: annual price × avg years
6. If no owner price exists → fall back to industry default, tag the number with "(default — update your pricebook for accuracy)"

This means missed revenue numbers evolve and become more precise as the owner completes their pricebook. The product gives owners an active reason to configure it.

---

### 9.5 Pricebook Across Locations (Team Tier)
- Multi-location companies can maintain a **shared pricebook** or **per-location pricebooks**
- Shared: one master pricebook applies company-wide
- Per-location: each location has its own prices (useful when pricing varies by market)
- Analysis always uses the pricebook of the location the tech is assigned to

---

## 10. Feature Specifications

### 10.1 Mobile App (iOS + Android)

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

#### Tech Performance Hub (Gamification-Enabled)
- Personal rolling 7-day and 30-day stats
- Average score, average missed revenue, trending direction
- **Streak counter:** consecutive calls above a score threshold
- **Personal best:** highest score ever, highest single-call value captured
- **Badges:** earned automatically (see Section 11)
- Comparison to team average (anonymized — "you vs. team avg")
- Full personal call history (list view, searchable)

---

### 10.2 AI Scoring Engine — LLM + Rules Hybrid

#### Architecture

**Rules Layer (deterministic)**
- Explicit trigger detection: keywords, phrases, timing, conversation sequences
- Predictable, auditable, explainable — no black box
- Example: "Did tech offer camera inspection after customer mentioned recurrence?"
- Misses = auto-flagged as specific missed revenue line items

**LLM Layer (contextual)**
- Understands implied meaning, multi-turn conversation flow, and nuance
- Catches missed opportunities that rules cannot detect from keywords alone
- Example: "Tech rushed to pricing without explaining root cause" — pattern-level detection
- Scores qualitative dimensions: customer education quality, trust-building, close quality

**Hybrid Output**
- Both layers contribute independently to the final score
- LLM can surface items rules missed; rules constrain LLM on high-stakes scoring items
- Confidence scores on all LLM-flagged items
- Low-confidence items are surfaced separately in the manager view for human review

#### Model Evolution Path
| Phase | Timeline | Approach |
|---|---|---|
| Phase 1 | Now | Rules-based triggers + GPT-4o / Claude for contextual analysis |
| Phase 2 | 12–18 months | Fine-tune on annotated call data from real Kova users |
| Phase 3 | 24+ months | Proprietary model trained on a plumbing/drain call corpus |

---

### 10.3 Missed Revenue Engine

#### Step 1 — Signal Detection
- **Trigger phrases (keyword-level):** "keeps happening," "third time this year," "rusty water," "old water heater," "slow recovery," "prior service," "had someone out before"
- **Contextual signals (LLM):** rushed diagnosis, price presented before root cause, no recurrence discussion, single quote vs. options, no close language
- **Sequence signals:** trigger detected (recurrence flagged) but offer never detected in the conversation → missed

#### Step 2 — Opportunity Mapping

**Drain Opportunities:**
| Opportunity | Trigger Signal | Pricebook Type |
|---|---|---|
| Camera inspection | Recurrence signal, older home, prior visit | Fixed or range |
| Hydrojet upgrade | Snake-only diagnosis, no long-term option offered | Range or tiered |
| Maintenance / service plan | Customer recurrence concern, no agreement at close | Recurring (LTV) |
| Root cause explanation | Rushed diagnosis | Qualitative (no dollar) |

**Plumbing Opportunities:**
| Opportunity | Trigger Signal | Pricebook Type |
|---|---|---|
| Whole-home walkthrough | Single-fixture job, no walkthrough offered | Range |
| Water heater replacement | Age >10yr, rust, slow recovery | Range or tiered |
| Water filtration / softener | Water quality discussion | Range |
| Service agreement | No mention at close | Recurring (LTV) |
| Fix vs. improve framing | Repair-only quote, no upgrade path | Varies |

#### Step 3 — Dollar Output
- Pull price from owner's pricebook for each detected missed opportunity
- Fall back to industry default if no owner price exists (clearly labeled)
- Conservative / aggressive range displayed when range pricing is configured
- LTV-flagged items show LTV calculation, not just price
- Call total, tech aggregate, company weekly/monthly total

---

### 10.4 Drain Scoring System

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
- LLM-evaluated (qualitative) + timing check (time spent before pricing)

**Camera Inspection** (0–3 pts)
- Trigger: recurrence signal, older home (pre-1980), mention of prior visit
- Scored: offered and accepted (3) / offered and declined (2) / not offered (0)
- Not offered after trigger = automatic missed revenue flag

**Hydrojet vs. Snaking** (0–3 pts)
- Long-term vs. short-term solution explained: yes/no
- Hydrojet presented as an option even if snaking ultimately selected: yes/no
- Full score requires both

**Maintenance Plan** (0–3 pts)
- Mentioned at all: yes/no (1 pt)
- Tied to customer's stated pain: yes/no (1 pt)
- Offered with specifics (price, coverage): yes/no (1 pt)

**Customer Education** (0–3 pts)
- Time spent building trust before pricing
- LLM-evaluated + rules-based timing check: price mentioned within first 2 minutes = flag

**Close Quality** (0–3 pts)
- Options presented (good/better/best) vs. single quote
- Objection handling present: yes/no
- Close language quality: LLM-evaluated

---

### 10.5 Plumbing Scoring System

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
- Checked additional fixtures: full (3) / verbal offer (2) / no mention (0)

**Water Heater Opportunity** (0–3 pts)
- Trigger: age >10yr, rust, slow recovery, customer hot water complaint
- Trigger + qualified offer (3) / trigger + mentioned only (2) / trigger missed (0)

**Filtration / Softener** (0–3 pts)
- Water quality triggered: yes/no
- Solution offered: yes/no

**Fix vs. Improve Framing** (0–3 pts)
- Upgrade or improvement path offered alongside repair: LLM-evaluated

**Service Agreement** (0–3 pts)
- Offered at close: yes/no (2 pts)
- Connected to customer's specific pain: yes/no (1 pt)

---

### 10.6 Call Library

#### Full Archive
- Every recorded call stored with: date, tech name, job type, duration, overall score, missed revenue total, language
- Retention: 12 months default (configurable)
- Audio player with synchronized transcript — tap any transcript line to jump to that position
- Full call metadata: FSM job # (if connected), customer type, score breakdown, confidence level

#### Search
- Search by: keyword, tech name, job type, date range, score range, missed revenue amount, language, confidence level
- Example: "all calls where hydrojet was not offered in the last 30 days"
- Saved searches and filters for recurring review workflows

#### Clip Highlights
- Auto-generated clips for each missed opportunity (±30 seconds)
- Manager can manually clip any section
- Clips shareable via secure expiring links
- **"Best Calls" library:** manager flags exemplary calls for team training
- **"Moments" feed:** top missed moments across all techs this week
- Downloadable audio clips for in-person coaching sessions

---

### 10.7 Owner / Manager Dashboard

#### Home Screen
- **Weekly missed revenue total — big number, front and center**
- Trend: this week vs. last week (arrow + percentage change)
- Top 3 missed opportunity types this week (ranked by dollar value)
- Quick-access call review queue
- Pricebook completion indicator (if defaults still in use)

#### Team Performance
- Per-tech leaderboard: avg score, avg missed revenue per call, call count, trend arrow, gamification badges
- Drill into any tech for full call history and coaching activity
- Comparison view: any two techs side-by-side
- Team average benchmarks per scoring dimension

#### Revenue Intelligence
- Rolling 30-day total estimated missed revenue
- **Recovery trend:** as coaching takes effect, this number should decline
- Breakdown by opportunity type
- Highest-value individual missed moments this month

#### Call Review Queue
- Calls auto-flagged: high missed revenue, low score, new techs, below threshold
- One-click to full call + transcript + clips
- Mark as reviewed / add note / flag for 1:1

#### Coaching Activity
- Coaching points delivered vs. reviewed per tech
- Coaching completion rate
- Manager annotation log
- Week-over-week improvement per tech per dimension

---

## 11. Technician Adoption & Gamification

### The Core Adoption Problem
The biggest execution risk for Kova is not technology — it is technician behavior. Techs will resist being recorded unless they understand what's in it for them. If recording rates are low, the product has no data and delivers no value. Adoption strategy is not a nice-to-have — it is mission critical.

### What's In It for the Tech
Frame Kova to techs as: **"This is your own performance coach — it shows you how to make more money."**

Key messages for tech-facing communication:
- "The better your score, the better your earning potential"
- "You can see exactly where you're improving over time"
- "The best performers get recognized on the leaderboard"
- Avoid framing it as: "your boss is listening to every call" — even if technically true

---

### 11.1 Gamification System

#### Leaderboard
- Company-wide ranking by score (rolling 7-day and 30-day)
- Displayed in the mobile app for all techs to see
- Shows rank, score, and trend direction
- Resets monthly — giving everyone a fresh shot
- **Optional:** Owner can toggle leaderboard visibility (some cultures prefer private scoring)

#### Streaks
A streak is a consecutive run of calls above a defined score threshold.

- **Threshold:** owner-configurable (default: 70/100)
- Streak counter displayed prominently on the tech's home screen
- Streak milestones:
  - 3 calls in a row: "On a roll"
  - 7 calls: "Week streak"
  - 14 calls: "Two-week streak"
  - 30 calls: "Month streak"
- Streak resets if a call scores below the threshold

#### Badges
Earned automatically based on performance. Displayed on the tech's profile and on the leaderboard.

| Badge | Criteria |
|---|---|
| First Call | Complete first scored call |
| Perfect Score | 100/100 on any call |
| Camera Pro | Offer camera inspection on 10 triggered calls |
| Maintenance Closer | Close a maintenance plan on 5 calls |
| Comeback | Score 90+ after scoring below 50 |
| Consistent | 30-day average score above 80 |
| Top Earner | Highest revenue capture rate on the team for the month |
| Streak Master | Maintain a 14-call streak |

#### Personal Bests
- Highest single-call score ever
- Highest value captured on a single call (based on actual invoiced amount if FSM connected)
- Longest streak ever
- Best monthly average score

#### Weekly Recognition
- Every Monday, the app surfaces: "Last week's top performer: [Tech Name] — 92 avg score"
- Owner can send a manual recognition message ("Great week, Marcus — you led the team") delivered as a push notification to the tech

---

### 11.2 Manager's Role in Adoption

- Managers are given an **adoption score** per tech: recording rate × review rate × trend direction
- Techs who haven't recorded in 3+ days are surfaced in the manager's call review queue with a nudge
- Managers can set recording targets per tech: "Marcus should record at least 8 calls this week"
- Progress toward targets visible on the manager dashboard

---

### 11.3 Onboarding Adoption Tactics

- **First recording incentive:** any tech who completes their first 3 recordings in Week 1 gets a "Pioneer" badge
- **Owner kickoff script:** Kova provides a suggested team meeting script for owners introducing Kova to their techs — framed around earnings potential, not surveillance
- **Tech explainer video:** 2-minute in-app video walking techs through what Kova is and why it helps them earn more

---

## 12. Notification & Alerting System

### Owner / Manager Notifications

#### Weekly Digest Email (Every Monday Morning)
Sent to owner and all managers. Contains:
- Total missed revenue identified last week
- Week-over-week change (up/down + %)
- Top 3 missed opportunity types
- Top performing tech (score)
- Tech with most improvement (score change)
- 1–2 specific high-value moments with a clip link
- Pricebook completion reminder (if defaults still in use)
- Link to full dashboard

Design: clean, scannable email — readable in 60 seconds. No login required to see the summary.

#### Real-Time Threshold Alerts (Push + Email)
Owner configures a missed revenue threshold. Any single call that exceeds it triggers an immediate alert.

Default threshold: **$1,500 missed on a single call**

Alert contains:
- Tech name, call date, job type
- Total missed revenue on the call
- Top 2 missed items with links to clips
- Link to full call in the dashboard

Owner can adjust threshold in Settings → Notifications.

#### Tech Performance Alerts
- "A tech hasn't recorded in 3 days" — sent to manager
- "Tech is on a 7-call streak" — sent to the tech as positive reinforcement
- "Tech's score has dropped 15+ points over the last 5 calls" — sent to manager as a coaching flag

#### Processing Alerts (System)
- "Your call has been analyzed" — sent to the tech via push notification when post-call summary is ready
- "Low audio quality detected on a call" — sent to the tech with instructions for better recording next time

---

### Technician Notifications

| Event | Channel | Timing |
|---|---|---|
| Post-call summary ready | Push + in-app | Within 5 min of processing |
| New coaching point from manager | Push + in-app | Real-time |
| Badge earned | Push + in-app | Real-time |
| Streak milestone | Push + in-app | Real-time |
| Weekly personal stats | Push | Every Monday |
| Leaderboard rank change (Top 3) | Push | Real-time |

---

### Notification Settings
All notification types are individually configurable by the owner/admin. Techs can mute non-critical notifications but cannot turn off coaching point delivery.

---

## 13. Onboarding & First-Time Setup

### Design Principle
Kova should be live — first call recorded and scored — within **30 minutes of signup**. This is a direct competitive advantage over ServiceTitan's weeks-long onboarding. Every minute of friction before the first "aha moment" is a churn risk.

---

### 13.1 Owner Onboarding Flow (Web)

**Step 1 — Account Creation (2 min)**
- Email + password or Google SSO
- Company name, phone number, primary trade (Drain / Plumbing / Both)
- State (for consent defaults)
- Billing info (or skip for 14-day trial)

**Step 2 — Team Setup (3 min)**
- Add technicians: name + phone number or email
- Assign role: Technician / Field Manager
- Kova sends each tech a text/email with a download link for the mobile app
- Owner can skip and add techs later

**Step 3 — Pricebook Setup (5–10 min)**
- Kova pre-loads industry defaults for their trade(s)
- Three options presented:
  1. "Start with defaults — I'll update prices later" → proceed immediately
  2. "Import from CSV / Excel" → upload flow
  3. "Sync from ServiceTitan" → connect ST integration, import pricebook
- Pricebook completion indicator shown — owner sees which items still use defaults
- "You can update this anytime in Settings"

**Step 4 — Connect FSM (Optional, 2 min)**
- "Do you use a field service management tool?"
- If yes: select ServiceTitan / Housecall Pro / Jobber → OAuth connect flow
- If no: skip — Kova works standalone
- Connection unlocks: pre-call intelligence, auto job-matching, invoice matching

**Step 5 — Record Your First Call (1 min setup)**
- Tech receives the app download link via SMS
- Owner is shown an in-app checklist: "Your team is set up ✓ — ask your tech to record their next job"
- Setup complete — dashboard shown (empty state with clear call-to-action)

---

### 13.2 Technician Onboarding Flow (Mobile)

**Step 1 — Download + Login**
- Tech receives SMS/email with link: "Download Kova — [Company Name] wants you to use this for your calls"
- Opens app, logs in with phone number + SMS verification code

**Step 2 — Quick Intro (60 seconds)**
- 3-screen swipe intro: what Kova is, how it helps you earn more, how to record
- No mandatory video — swipeable cards
- "Start recording" button prominent on completion

**Step 3 — First Recording**
- Tech is prompted to record their next call
- In-app contextual help on first use: tap prompts explaining each UI element
- "Pioneer" badge offered: "Record 3 calls this week to earn your Pioneer badge"

---

### 13.3 Time to Value
| Milestone | Target |
|---|---|
| Account created → first call recorded | < 30 minutes |
| First call uploaded → first scored result | < 5 minutes |
| Owner sees first missed revenue output | < 35 minutes from signup |

This is the sequence that makes Kova sticky. The faster the first "wow" moment, the lower the churn.

---

## 14. FSM Integration Architecture

### Design Principle: FSM-Agnostic Core
Kova works fully standalone with zero FSM required. Connecting an FSM unlocks additional intelligence features — it is never a requirement to use the product.

### Standalone Mode (No FSM)
- Manual job tagging
- All recording, scoring, missed revenue, and dashboard features available
- Manual pre-call notes via owner-created job-type templates
- Industry-default pricebook (or manually configured)
- No invoice matching

### FSM-Connected Mode

**Features unlocked:**
- **Pre-call brief:** AI pulls customer history, job type, dispatch notes on dispatch
- **Auto job-matching:** recorded call linked to FSM job record without manual entry
- **Invoice matching:** Kova's estimated call value vs. actual invoiced amount → recovery rate
- **Push results:** scored call summary written back to FSM job record as a note
- **Ticket delta view:** per tech, chart Kova-estimated potential vs. actual invoiced
- **Pricebook sync:** import and sync price data directly from FSM pricebook

### Integration Tiers

**Tier 1 — ServiceTitan (Priority)**
- Bidirectional: read job/customer data on dispatch → write call score to job notes
- Pricebook import via ST pricebook API
- Invoice matching via ST invoice API
- Kova insights surfaced inside ST job timeline via native notes
- Target: first integration shipped, aligned with pilot expansion

**Tier 2 — Housecall Pro + Jobber (Phase 2)**
- Read dispatch data + write call summary to job record
- Pricebook sync where APIs support it
- Opens the 400,000+ SMB shops unserved by ST Field Pro

**Tier 3 — FieldEdge, ServiceFusion, others (Phase 3+)**
- Community-requested; shipped based on customer demand

---

## 15. User Roles & Admin Controls

### 15.1 User Roles

#### Technician
Mobile-primary. Records calls, receives feedback, tracks personal performance.

**Permissions:**
- Record calls
- View own call history and scores
- View and action own coaching insights
- Mark coaching points as reviewed
- View personal stats vs. anonymized team average
- View own badges, streaks, and personal bests
- Cannot view other technicians' individual performance data

---

#### Field Manager / Sales Manager
Mobile + web. Reviews team calls, delivers coaching, monitors performance.

**Permissions:** All of Technician +
- View all team calls and scores
- Create and share clips
- Add coaching notes to any call
- Flag calls for escalation
- View full team leaderboard (non-anonymized)
- Set per-tech recording targets
- Export call reports
- Receive threshold alerts and weekly digest

---

#### Owner / Admin
Web-primary. Full dashboard, all configuration, billing.

**Permissions:** All of above +
- Full admin settings (see 15.2)
- Manage team: add, remove, role-assign users
- Connect and manage FSM integrations
- Manage billing and subscription
- View all analytics across all locations
- Export all data (CSV/PDF)
- API access (Team tier)

---

### 15.2 Admin Controls — Full Configuration Reference

**Pricebook**
- Add / edit / delete service items
- Configure pricing model (fixed / range / tiered) per item
- Import via CSV/Excel or FSM sync
- Mark items as recurring and configure LTV inputs
- Set pricebook per location (Team tier)

**Scoring**
- Adjust scoring dimension weights (e.g., weight maintenance plan higher than walkthrough)
- Set minimum score threshold that triggers manager review
- Enable/disable specific dimensions per trade

**Alerts & Notifications**
- Configure missed revenue threshold for real-time alerts
- Toggle each notification type on/off
- Configure weekly digest recipients (owner only or all managers)

**Team Structure**
- Create and manage locations (Team tier)
- Assign techs to locations
- Assign managers to locations

**Recording Targets**
- Set company-wide default recording target per tech per week
- Override per individual tech

**Call Retention**
- Set data retention period (default 12 months; configurable from 3 months to 36 months)
- Configure auto-delete policy

**Integrations**
- Connect / disconnect FSM integrations
- Configure what data flows in each direction
- Manage API keys (Team tier)

**Gamification**
- Toggle leaderboard visibility (public to all techs / managers only / off)
- Configure streak threshold (default 70/100)
- Enable/disable specific badges

**Billing**
- View current plan, seat count, next invoice
- Add/remove seats
- Upgrade/downgrade plan
- Download invoices

---

## 16. Data Security & Privacy

### Infrastructure
- Hosted on AWS (primary) with data residency in the United States
- All audio, transcripts, and scored data encrypted **at rest** (AES-256) and **in transit** (TLS 1.2+)
- Audio files stored in isolated, access-controlled storage buckets — not accessible via public URLs
- Transcripts and scored data stored in encrypted databases

### Access Controls
- Role-based access control enforced at the API level — not just the UI
- Techs can only access their own call data (enforced server-side)
- Managers can only access calls for techs assigned to their location
- All admin actions are logged in an audit trail (visible to owner)
- Session tokens expire after 24 hours of inactivity

### Data Retention
- Default: 12 months from call date
- Owner-configurable: 3–36 months
- Deletion: audio files permanently deleted on retention expiry; transcripts and scored metadata retained for 24 additional months for analytics (owner can disable)
- User deletion: when a tech is removed from the account, their personal data can be purged on request (CCPA compliance)

### Consent
- Consent acknowledgment is required before every recording starts — enforced in the app
- Consent event is logged with a timestamp per call
- Owners are responsible for ensuring their consent flow complies with local law; Kova provides the mechanism, not legal advice
- California two-party consent language is the default; customizable by the owner

### Security Roadmap
- **Phase 1:** Encryption at rest + in transit, role-based access, audit logging
- **Phase 2:** SOC 2 Type I certification (targeted for Month 9–12)
- **Phase 3:** SOC 2 Type II, enterprise SSO (SAML/SCIM), IP allowlisting (Team tier)

---

## 17. Audio Quality & Edge Cases

### Audio Quality Assessment
Every call goes through an audio quality check at the start of processing:

| Quality Level | Definition | Handling |
|---|---|---|
| **High** | Clear speech, low background noise, full intelligibility | Standard processing |
| **Medium** | Some background noise or muffling; mostly intelligible | Standard processing with slightly wider confidence intervals |
| **Low** | Significant noise, multiple simultaneous speakers, or large unintelligible sections | Processed with "Low Confidence" flag on all outputs |
| **Failed** | < 30% of call intelligible | Not scored; flagged as "Unprocessable" with note to tech |

### Low Confidence Calls
- Score is calculated but displayed with a warning banner: "Audio quality was low — results may be less accurate"
- Specific scoring dimensions with low-confidence flags are marked individually
- Manager can override a low-confidence score after manual review
- Owner receives a tip in the post-call summary if low-quality calls are frequent: "Remind techs to [specific tip based on detected issue]"

### Common Audio Issues & Guidance
| Issue | Detected By | Tech Guidance |
|---|---|---|
| Wind / outdoor noise | Signal processing | "Record indoors when possible or position phone closer" |
| Running water or equipment | Frequency analysis | "Pause recording when equipment is running" |
| Phone in pocket | Volume / muffling | "Keep phone face-up or in shirt pocket facing out" |
| Multiple speakers talking simultaneously | Diarization | "Try to speak in turn with the customer" |
| Call interrupted (< 5 min) | Duration check | "Short calls may not score all dimensions — record full interaction" |

### Partial Recordings
- Calls under 5 minutes are processed but flagged as "Short call"
- Only dimensions that could plausibly be scored in the available time are scored
- Missing dimensions are marked "N/A — insufficient duration" rather than penalized as 0

### Interrupted Uploads
- If upload is interrupted mid-transfer, the app resumes from the last successful chunk on next connection
- No call data is lost due to interrupted upload

---

## 18. Multi-Language Support (English + Spanish)

### Day-One Scope
- **English** and **Spanish** both supported in transcription and scoring from launch
- Language is **auto-detected per call** — no manual selection required
- Bilingual calls (code-switching between English and Spanish) are handled: transcript shows the language used sentence-by-sentence

### Transcription
- Two transcription models run in parallel for ambiguous language detection, with the higher-confidence result used
- Transcript displayed in the language spoken, with a language label on each call record
- Owner/manager reads the transcript in the language it was recorded in (no auto-translation in v1)

### Scoring
- Scoring trigger phrases are defined in both English and Spanish
- Example equivalents:
  - "keeps happening" / "siempre pasa esto"
  - "old water heater" / "calentador viejo"
  - "had someone out before" / "ya vinieron antes"
- LLM layer prompted with both-language context
- Score output and coaching insights always delivered in English regardless of call language (owner/manager interface is English)
- Tech-facing coaching insights delivered in the language detected for that tech's calls (if Spanish-primary tech, coaching cards in Spanish)

### Roadmap
- Phase 2: Translated UI for technicians (Spanish-language app interface)
- Phase 3: Auto-translation of transcripts (English summary of Spanish calls for English-only managers)

---

## 19. Pricing & Billing Guardrails

### Model
- Per seat / per month
- Monthly billing, no contracts, no minimums
- 14-day free trial (no credit card required)
- **Minimum:** owner seat + 1 tech = 2 seats ($178/month on Starter)

### Tiers

| Tier | Price / Seat / Month | Who It's For | Features |
|---|---|---|---|
| **Starter** | $89 | Owner-operators, 2–5 techs | Recording, transcription, post-call scoring, pricebook (manual entry + CSV import + defaults), missed revenue output, basic coaching insights, gamification, EN + ES, 90-day archive, owner dashboard, weekly digest |
| **Pro** | $129 | Growing teams, 5–15 techs | Everything in Starter + pre-call intelligence, full call library (search + clips), manager dashboard, leaderboard, 12-month archive, FSM integrations (ST, HCP, Jobber), pricebook FSM sync, invoice matching, real-time threshold alerts, Kova ROI Report |
| **Team** | $149 | Multi-manager operations, 15+ techs | Everything in Pro + multi-location support, per-location pricebooks, custom scoring weights, team comparison views, advanced reporting + data export, API access, SOC2 compliance docs, priority support |

### ROI Positioning
A 5-tech shop on Pro = **$645/month**.

Alternatives:
- ServiceTitan + Field Pro: $2,000–$3,500/month
- Manual coaching programs (BDR, etc.): $500–$2,000/month
- Ride-along manager: $4,000–$8,000/month salary equivalent

One recovered maintenance plan per week pays for Kova outright.

### Fair-Use Policy

**What's included per seat:**
- Unlimited call recordings
- Unlimited transcription minutes
- Unlimited AI analysis / scoring
- Unlimited call storage (within retention period)

**Fair-use limits:**
- No hard caps on calls or minutes per seat
- Fair-use threshold: if a single seat generates > 150 hours of recorded audio per month, Kova reserves the right to contact the account to discuss usage (this protects against misuse, not legitimate field use — a tech doing 10 calls/day × 45 min × 22 days = ~165 hours, which falls within expected Team-tier usage)
- Kova will not throttle or charge overage fees without 30-day notice

**Data export:**
- CSV export of all scored data: included on all tiers
- PDF call reports: included on Pro and Team
- Bulk audio download: Team tier only

---

## 20. Unit Economics & Cost Model

### Per-Call Backend Costs (Estimates)

| Component | Cost per Call (est.) | Notes |
|---|---|---|
| Audio transcription | $0.008–$0.015/min | Deepgram or AssemblyAI pricing at scale; 30-min call ≈ $0.24–$0.45 |
| LLM analysis | $0.02–$0.08/call | GPT-4o / Claude Haiku at scale; depends on prompt + transcript length |
| Audio storage | $0.001–$0.003/call/month | S3-equivalent; 30 min audio ≈ 15–30MB |
| Transcription storage | Negligible | Text is tiny |
| **Total COGS per call** | **~$0.30–$0.60** | At scale (10K+ calls/month) |

### Gross Margin Targets

A seat at $89/month. If a tech averages 6 calls/week = ~24 calls/month:
- Transcription + analysis COGS per seat: ~$7–$14/month
- Gross margin per seat (Starter): **84–92%** (before infrastructure, support, and overhead)

At Pro ($129/seat):
- Gross margin per seat: **89–95%**

These margins are healthy for a SaaS business. The key risk to manage: a tech who records 20+ calls/day (rare in the field, but possible for high-volume drain companies) drives up per-seat COGS.

### Unit Economics at Scale

| Stage | Accounts | Avg Seats | MRR | Est. COGS | Gross Profit |
|---|---|---|---|---|---|
| Month 6 | 10 | 6 seats avg | $15K | ~$1.5K | ~$13.5K (90%) |
| Month 12 | 50 | 7 seats avg | $75K | ~$7K | ~$68K (91%) |
| Month 18 | 150 | 8 seats avg | $225K | ~$20K | ~$205K (91%) |

### Cost Optimization Path
- Negotiate volume pricing on transcription API (Deepgram/AssemblyAI offer enterprise tiers)
- Cache and reuse LLM outputs where possible (trigger detection runs once, not repeatedly)
- Compress and tier audio storage: recent calls in hot storage, older calls in cold storage at ~80% lower cost

---

## 21. Self-Proving ROI

### The Problem with Subscription Software
Every month, an owner looks at their Kova bill and asks: "Is this worth it?" If they have to think hard to answer that, churn risk is high. Kova needs to make the ROI answer automatic and undeniable.

### The Kova ROI Report
Delivered monthly to the owner (first day of each month), automatically generated.

```
KOVA ROI REPORT — April 2026
Drain Right | 5 Technicians

YOUR RESULTS THIS MONTH
  Missed revenue identified:          $47,320
  Estimated recovery (coaching):      +$8,900  (vs. March)
  Month-over-month improvement:       +23%

WHAT THIS MEANS
  Your team improved their average ticket by $94/call since using Kova.
  At your current call volume (94 calls this month), that's an estimated
  $8,836 in incremental revenue compared to your first month.

KOVA PAID FOR ITSELF
  Your Kova subscription this month:  $645
  Estimated incremental revenue:      $8,836
  ROI:                                13.7x

TOP MISSED OPPORTUNITY THIS MONTH
  Maintenance plan not offered:       $23,500 remaining on table
  31 calls where plan was triggered but not offered.
  [View calls →]

BEST PERFORMING TECH:  Marcus — 89 avg score (↑ from 74 last month)
MOST IMPROVED:         Carlos — +18 points improvement since March
```

### The Real Math (Based on Industry Data)

**Verified market data from actual plumbing/drain business owners (Reddit, 2024–2026):**
- Average residential plumbing/drain service ticket: **$856**
- Average revenue per truck per year: **~$350,000**
- Average calls per tech per week: **10–15 jobs**
- Net margin: **20–22%**

**If Kova moves average ticket by 17%** (the average lift Rilla publishes across their customers):
- New average ticket: $856 × 1.17 = **$1,001/call**
- Incremental revenue per call: **$145**
- Per tech per year (12 calls/week × 50 weeks): **$87,000/year**
- **5-tech shop incremental revenue: ~$435,000/year**
- Kova cost for 5-tech shop (Pro): **$7,740/year**
- **ROI: 56x**

Even a conservative 5% ticket improvement:
- Incremental per call: $43
- Per tech per year: **$25,800**
- 5-tech shop: **$129,000/year**
- ROI vs. Kova cost: **17x**

One recovered maintenance plan offer per week pays for the entire Kova subscription. The math is not subtle.

### How Recovery Is Calculated
- Kova tracks each tech's "opportunity capture rate" over time: (opportunities offered / opportunities triggered)
- As a tech improves their rate, the delta vs. their baseline is the estimated incremental revenue
- This is conservative — it only counts improvement over the tech's own previous baseline, not an industry target

### ROI Attribution Model
Kova uses a conservative attribution approach:
- It does not claim credit for revenue the tech already captured before Kova
- It only claims credit for improvement in capture rate after coaching delivery
- Owners can see both the "missed" number and the "recovered" number side by side

### Compensation & Performance Export
- Monthly per-tech performance summaries exportable as PDF or CSV
- Fields: call count, avg score, avg ticket (if FSM connected), opportunity capture rate, missed revenue, coaching completion rate
- Designed to be used directly in performance reviews, bonus calculations, and hiring/firing decisions
- Includes a month-over-month trend line per tech

---

## 22. Core Data Entities

A product-level overview of the key objects in the Kova system — sufficient context for engineering to begin data modeling.

| Entity | Key Fields | Notes |
|---|---|---|
| **Company** | id, name, plan, locations[], pricebook_id, fsm_connection, settings | Top-level account |
| **Location** | id, company_id, name, pricebook_id (optional) | Multi-location support (Team tier) |
| **User** | id, company_id, location_id, role (tech/manager/owner), name, language_pref | All users |
| **Call** | id, tech_id, job_id, recorded_at, duration, audio_url, transcript_id, score_id, language, audio_quality, status | Core record |
| **Transcript** | id, call_id, segments[] (text, speaker, timestamp, language, confidence) | Per-call; synchronized with audio |
| **Score** | id, call_id, overall_score, dimensions{}, missed_revenue_total, opportunities[], confidence_level | Scoring output |
| **Opportunity** | id, score_id, type, triggered, offered, pricebook_item_id, value_low, value_high, clip_start, clip_end, is_default_price | Each detected opportunity |
| **PricebookItem** | id, company_id, location_id, name, trade, opportunity_type, pricing_model, price_fixed, price_low, price_high, tiers[], is_recurring, ltv_annual, ltv_years, is_default, active | Owner's pricebook |
| **Clip** | id, call_id, opportunity_id, start_time, end_time, created_by, share_token, expires_at | Auto-generated or manual |
| **CoachingPoint** | id, call_id, tech_id, text, clip_id, reviewed_at, manager_note | Delivered to tech |
| **Badge** | id, user_id, badge_type, earned_at | Gamification |
| **Streak** | id, user_id, current_count, longest_count, last_call_date, threshold | Per tech |
| **Job** | id, company_id, fsm_job_id, tech_id, customer_name, job_type, scheduled_at, call_id | FSM-synced or manual |
| **Notification** | id, user_id, type, payload, sent_at, read_at, channel (push/email) | All notification events |

---

## 23. Go-To-Market

### Channel Strategy

#### Phase 1 — Design Partner → Case Study (Months 1–3)
- Drain Right as primary pilot
- Document: calls recorded, missed revenue identified, ticket size change after coaching
- Target output: "$X in missed revenue identified in the first 30 days"
- Use case study as the primary sales asset for all outbound

#### Phase 2 — ServiceTitan Users Without Field Pro (Months 2–6)
- Target plumbing/drain companies on ServiceTitan who haven't purchased Field Pro
- Positioning: "You're already paying for the FSM. Here's the coaching layer at a fraction of Field Pro's cost — and it actually shows you the dollar amount in your own prices."
- Channels: Titan Exchange (ST community forums), owner Facebook groups, LinkedIn direct outreach

#### Phase 3 — FSM-Agnostic Expansion (Months 4–9)
- Jobber and HCP users — larger SMB pool, completely unserved by coaching products
- Positioning: "No need to switch FSMs. Kova works with what you have."
- Trade associations: PHCC, NAPHCC
- Industry events: Service World Expo, Nexstar Super Meeting

#### Phase 4 — Coaching Program Alternative (Months 6–12)
- Target owners currently spending on BDR, Service Excellence Training, etc.
- Positioning: "100% call coverage for 20% of the cost of your current coaching program."
- ROI comparison content; direct outreach to known coaching program customers

#### Phase 5 — PE-Backed Home Services Platforms (Months 9–18)
Private equity firms are aggressively rolling up residential plumbing, drain, and HVAC companies — and this is one of the best distribution channels in the market.

**Why PE firms are ideal buyers:**
- They own portfolios of 5–50+ home service companies and need standardized performance management across all of them
- Revenue-per-truck optimization is the core PE value creation thesis — they buy at 5–7x EBITDA and need to grow ticket sizes, close rates, and service agreement attach rates
- They demand dashboards, KPIs, and accountability frameworks that individual owner-operators never ask for
- A single PE firm signing a Kova deal could represent 10–30 companies and 200+ seats onboarded at once
- ServiceTitan explicitly has a "Private Equity" solution category on their website — validating this as a buyer segment

**GTM approach:**
- Identify PE firms active in home services M&A (Nexus Capital, Apex Service Partners, Wrench Group, Five Star Home Services, Authority Brands and similar platforms)
- Position Kova as the "revenue intelligence layer" that PE firms deploy across their portfolio companies post-acquisition
- Offer portfolio pricing: flat rate per company rather than per-seat for multi-company deals
- Lead with the ROI story: if Kova moves average ticket 17% across a 10-company portfolio, that directly impacts EBITDA and exit multiples
- Leverage Nexstar Network connections — PE-backed companies are heavy Nexstar members

### GTM Milestones
| Milestone | Target |
|---|---|
| Month 1 | Drain Right live, baseline metrics captured |
| Month 3 | Case study published |
| Month 6 | 10 paying companies, ~$15K MRR |
| Month 12 | 50 paying companies, ~$75K MRR |
| Month 18 | 150 companies, ~$225K MRR |

---

## 24. Product Roadmap

### Phase 1 — Foundation (Months 1–3)
**Goal: Prove the missed revenue number is real — with the owner's own prices.**

- [ ] Mobile app: recording, consent, offline, auto-upload (iOS first)
- [ ] Transcription pipeline (cloud, < 5 min turnaround), EN + ES
- [ ] Audio quality detection and confidence flagging
- [ ] Rules-based scoring engine — drain + plumbing dimensions
- [ ] LLM integration (GPT-4o or Claude) for contextual analysis
- [ ] Missed revenue engine — drain opportunity model
- [ ] **Pricebook: manual entry + CSV/Excel import + industry defaults**
- [ ] Post-call summary: tech view + manager view
- [ ] Owner dashboard: per-call, per-tech, weekly aggregate
- [ ] Basic call library: list view + audio playback
- [ ] Manual job tagging
- [ ] Gamification: leaderboard, streaks, basic badges
- [ ] Onboarding flow: account → team → pricebook → first recording (< 30 min)
- [ ] Weekly digest email

**Phase 1 Success Gate:**
> Show Drain Right "$20K–$50K in identified missed revenue" within 30 days.
> Numbers are powered by Drain Right's actual prices.
> Owner says the numbers feel accurate. Techs are recording and reviewing feedback.

---

### Phase 2 — Intelligence (Months 3–6)
**Goal: Build the product owners will pay for and refer.**

- [ ] Full call library: search + clips + clip sharing
- [ ] ServiceTitan integration: job data read, call score write, pricebook sync
- [ ] Pre-call intelligence: FSM mode (full AI brief) + manual mode (checklists)
- [ ] Full plumbing scoring model (all dimensions)
- [ ] Invoice matching: Kova estimate vs. actual ST invoice
- [ ] Real-time threshold alerts (high-value miss push notification)
- [ ] Kova ROI Report (monthly, auto-generated)
- [ ] Tech coaching points in Spanish for Spanish-primary techs
- [ ] Full badge set + personal bests
- [ ] Manager adoption dashboard (recording rate, review rate per tech)
- [ ] Android app
- [ ] Compensation export (monthly PDF/CSV per tech)

---

### Phase 3 — Expansion (Months 6–12)
**Goal: Open the SMB market beyond ST users.**

- [ ] Housecall Pro + Jobber integrations (read/write + pricebook sync where available)
- [ ] Multi-location dashboard + per-location pricebooks (Team tier)
- [ ] Team comparison views (any two techs, side-by-side)
- [ ] Custom scoring weight configuration
- [ ] API access (Team tier)
- [ ] "Best Calls" training library
- [ ] Coaching completion metrics and trend tracking
- [ ] SOC 2 Type I certification process begins
- [ ] Spanish-language mobile app UI
- [ ] Auto-record on arrival (geofence trigger — roadmap feature)

---

### Phase 4 — Real-Time (Year 2)
**Goal: Become the operating layer for every field call.**

- [ ] Real-time in-call coaching (live alert to tech's phone during call)
- [ ] AI-generated pre-call scripts per job type
- [ ] ML model fine-tuned on annotated Kova call data
- [ ] HVAC trade scoring model (new vertical)
- [ ] Rehash / reactivation lead engine (near-miss flagging from past calls)
- [ ] Call center / CSR intelligence layer
- [ ] SOC 2 Type II + enterprise SSO

---

## 25. What NOT to Build

| Category | Why Not |
|---|---|
| CRM / customer management | FSMs own this — don't compete |
| Booking and scheduling | FSMs own this |
| Payment processing | Stripe + FSMs handle it |
| Marketing / ad attribution | CallRail's domain |
| HVAC scoring model | Year 2 — nail plumbing/drain first |
| Real-time coaching (Phase 1) | Complex, high-latency risk, distraction risk for techs |
| Proprietary ML model (Phase 1) | Need training data first — earn it in Phase 1 + 2 |
| Multi-trade expansion (Year 1) | Trade specificity is the moat — don't dilute it |
| Auto-translation of transcripts | Phase 3+ — not needed for CA pilot market |
| Full pricebook / CPQ tool | Don't become a pricebook product — Kova uses prices, it doesn't manage them beyond what scoring needs |

---

## 26. Success Metrics

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
| Recording rate (calls recorded / dispatched jobs) | ≥ 80% |
| Time to first scored call (from signup) | < 35 minutes |

### Product Health Metrics (Post-Launch)
| Metric | Target |
|---|---|
| Recording rate per active account | ≥ 80% of dispatched jobs |
| Post-call summary open rate (techs) | ≥ 65% |
| Coaching point review rate | ≥ 60% |
| Owner dashboard WAU | ≥ 3x/week |
| Missed revenue recovery trend | Declining per tech after 4 weeks of coaching |
| Pricebook completion rate | ≥ 70% of items owner-configured (not default) |
| Gamification engagement | ≥ 50% of techs have active streak by Week 4 |

### Business Metrics (Month 6+)
| Metric | Target |
|---|---|
| MRR growth | 20%+ month-over-month |
| Monthly churn | < 5% |
| NPS | > 50 |
| LTV / CAC ratio | > 5x |
| Average seats per account | 4–7 |
| Gross margin | > 85% |

---

## 27. Long-Term Vision

- **Year 2:** HVAC trade model. Real-time in-call coaching. Rehash lead engine. Proprietary model trained on annotated plumbing/drain call data.
- **Year 3:** Multi-trade platform (plumbing, drain, HVAC, electrical). Call center intelligence layer. Proprietary AI trained on tens of thousands of scored trades calls.
- **Year 4+:** The operating standard for how a profitable service call is run — and the system that enforces it at scale across every trade.

> Kova becomes the benchmark for what a great service call looks like. Every technician. Every trade. Every call, measured and coached.

---

## Final Summary

Kova is not a coaching tool. It is not conversation intelligence. It is not a CRM add-on.

It is a **system that enforces how a profitable plumbing and drain service call should be run — and quantifies in dollars, using your own prices, when it isn't.**

Rilla is the closest competitor — well-funded, embedded in home services, and respected. But Rilla tells a manager *how* a rep performed. Kova tells an owner *what it cost them in dollars on that specific call, at their actual prices.* That distinction is the entire wedge. Rilla has no FSM integration, no pricebook-driven revenue attribution, and no trade-specific job logic for drain or plumbing economics. They solve a real problem — just not this one.

No competitor does all six things: records field calls, applies trade-specific scoring logic, uses the owner's actual pricebook to calculate missed revenue, integrates with FSMs for invoice verification, is priced for a 3-tech shop, and proves its own ROI every month. Kova does.

The moat is the trade-specific logic plus the proprietary call data we accumulate every day.
The growth engine is the ROI story — a number so specific and credible that owners can't ignore it.
The market is wide open.
