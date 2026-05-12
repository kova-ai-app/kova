# Kova — Product Strategy v1
## Risk Analysis, Mitigations & Strategic Amendments to Product Plan v3

---

## 1. Purpose

This document is a companion to `product-plan-v3.md`. It captures the results of a structured devil's advocate analysis of that plan — identifying real-world risks, blind spots, and gaps surfaced through competitive research, legal review, industry data, and operational benchmarking.

**How to use this document:**
- Each section identifies a specific risk with a probability/impact rating
- Each risk is followed by concrete mitigations — specific changes to the product, framing, architecture, or operations
- Section 4 consolidates every proposed change into a table referencing the specific section of product-plan-v3.md it amends
- Section 5 is a full research appendix with citations for every data point used

This document does not replace product-plan-v3.md. It amends and hardenes it. Every mitigation here should be integrated into the next version of the product plan.

---

## 2. Risk Register

The following 10 risks were identified through competitive research, legal analysis, behavioral science literature, and operational benchmarking against analogous companies.

| # | Risk | Probability | Impact | Timeframe | Priority |
|---|------|------------|--------|-----------|----------|
| 1 | iOS-only launch excludes 40-55% of target users | High (80%) | High | Day 1 | Critical |
| 2 | Customer (homeowner) consent mechanism undefined | Medium (50%) | High | Day 1 | Critical |
| 3 | Tech adoption settles at 30-40%, not 80% | High (75%) | Critical | Months 2-4 | Critical |
| 4 | Rilla ships dollar-denominated scoring for plumbing in 6-12 months | High (70%) | Critical | Months 6-12 | Critical |
| 5 | Missed revenue numbers lose credibility from false positives | Medium (60%) | Critical | Months 3-6 | Critical |
| 6 | SMB monthly churn hits 4-5%, LTV math breaks | High (70%) | Critical | Months 6-12 | Critical |
| 7 | ServiceTitan blocks or competes with integration | Medium (50%) | High | Months 6-12 | High |
| 8 | Predatory upselling liability traced to Kova scoring | Low (20%) | High | Months 6-18 | High |
| 9 | Self-proving ROI report used to justify cancellation | Medium (40%) | Medium | Months 8-14 | Medium |
| 10 | AI scoring triggers employment discrimination claim | Low (15%) | Catastrophic | Months 12-24 | Medium |

**Probability definitions:** Low = <25%, Medium = 25-60%, High = 60%+
**Impact definitions:** Medium = survivable setback, High = significant revenue/legal harm, Critical = existential, Catastrophic = company-ending

---

## 3. Critical Risk Mitigations

---

### 3.1 Mobile Platform Strategy

**Risk:** Phase 1 of product-plan-v3.md specifies "iOS first, Android in Phase 2 (Months 3-6)." Research strongly indicates the target demographic (plumbers, drain techs) is 50-60% Android. Launching iOS-only excludes roughly half of the intended users on Day 1 — including a substantial portion of Drain Right's own technician team.

**Research basis:**
- Bureau of Labor Statistics (2024): median plumber/pipefitter wage is $62,970. CIRP data consistently shows iPhone owners skew toward $75K+ households; Android skews toward $30K-$75K — the exact plumber wage band.
- Pew Research (2021): among adults earning <$30K, Android ownership is ~60-65%; among $75K+ earners, iOS dominates at 65-70%.
- Hispanic Americans make up 30%+ of construction trades workers (BLS); Pew data confirms Hispanic Americans use Android at higher rates than the general population.
- Rugged phone market (CAT, Samsung XCover, Kyocera DuraForce) is 95%+ Android — specifically marketed to field/construction workers who damage phones on job sites.
- Jobber's Google Play reviews outnumber App Store reviews, suggesting Android-heavy composition in their trades user base.
- ServiceM8 (Australian FSM app) launched iOS-only and faced significant US market adoption barriers until Android support was added. Repeatedly cited in field service forums as a reason for not considering the product.

**Estimated impact of iOS-only launch:** 40-55% of potential techs at any given shop cannot install the app. The Phase 1 success gate ("80% recording rate") is mathematically unreachable if half the workforce can't participate.

**Mitigation — Both Platforms Day 1:**

The recommended approach is a **cross-platform framework** (not two separate native codebases). Two fully native codebases (Swift + Kotlin) is inadvisable for an early-stage team:
- Every feature ships at 2x the development cost
- Every bug must be found and fixed twice
- QA doubles
- A small mobile team (2-3 engineers) cannot maintain this velocity sustainably

**Cross-platform framework comparison:**

| Framework | Relative Dev Time | Audio Recording Support | UX Quality | Recommendation |
|-----------|------------------|------------------------|------------|----------------|
| React Native | 1.2x vs. iOS-only | Good (needs native module bridge) | Very Good | Strong option if team is JS/TS-proficient |
| Flutter | 1.2x vs. iOS-only | Good (flutter_sound, record packages) | Very Good | Strong option; Dart is easy to learn |
| Kotlin Multiplatform (KMP) | 1.3x vs. iOS-only | Best (native audio APIs per platform) | Best | Best for audio fidelity; steeper learning curve |
| Two native (Swift + Kotlin) | 2x | Best | Best | Not recommended for Phase 1 team size |

**Recommended choice: React Native or Flutter.** The core product UX does not require pixel-perfect native animations. Techs need: a prominent record button, a clear consent popup, a simple post-call summary, and a badge screen. Both frameworks handle this well.

**The one non-negotiable native requirement:** Background audio recording must use native bridges on both platforms. On iOS, this requires `AVAudioSession` with `allowBackgroundAudio`. On Android, this requires a Foreground Service. Both React Native and Flutter have mature community packages for this (`react-native-audio-recorder-player`, `flutter_sound`), but they must be explicitly validated for background recording and battery impact before committing to a framework.

**Battery impact mitigation:** Continuous audio recording drains battery 3-5x faster than normal phone use. Mitigations to spec:
- Compress audio in real time (Opus codec at 16kbps mono gives excellent voice quality at ~7MB/hour vs. ~100MB/hour for uncompressed)
- Allow techs to see battery level in-app with a "low battery" warning before starting a job
- Auto-pause recording if battery drops below 15% with a notification to the tech
- Wired earphone mic support (removes the phone-in-pocket muffling problem and reduces screen power drain)

**Product plan amendment:** Remove "iOS first" from Phase 1. Replace with "iOS + Android (cross-platform framework, Day 1). Android app parity is a hard launch requirement, not a Phase 2 item."

---

### 3.2 Customer (Homeowner) Consent Mechanism

**Risk:** The plan's consent flow captures the technician's acknowledgment — not the customer's. In California (two-party consent, Cal. Penal Code §632) and 10 other states, ALL parties must consent to being recorded. A tech tapping "I agree" on their phone does not satisfy the customer's legal right.

**The 11 all-party consent states and their penalties:**

| State | Statute | Maximum Penalty |
|-------|---------|-----------------|
| California | Cal. Penal Code §632 | $2,500 fine + 1 year jail; civil: $5,000 or 3x actual damages |
| Florida | Fla. Stat. §934.03 | 3rd degree felony (up to 5 years); civil punitive damages |
| Pennsylvania | 18 Pa.C.S. §5703 | 3rd degree felony (up to 7 years) |
| Maryland | Md. Code §10-402 | Felony, up to 5 years prison |
| Massachusetts | Mass. Gen. Laws ch.272 §99 | Up to 5 years; civil: $100/day minimum |
| Connecticut | Conn. Gen. Stat. §53a-189a | Class D felony (1-5 years) |
| Washington | Wash. Rev. Code §9.73.030 | Gross misdemeanor; civil: $100/day minimum |
| New Hampshire | N.H. Rev. Stat. §570-A:2 | Class B felony |
| Montana | Mont. Code §45-8-213 | Up to $500 fine / 6 months jail |
| Illinois | 720 ILCS 5/14-2 | Varies (statute revised post-2014 constitutionality challenge) |
| Hawaii | HRS §803-42 | Two-party if device installed in private place |

**Additional legal exposure specific to recording in someone's HOME:**
- Recording in a home triggers the highest constitutional expectation of privacy under *Katz v. United States* (1967)
- Third parties (spouses, children, guests) who walk through during recording are separate parties requiring consent in all-party states
- Intrusion upon seclusion tort: the tech is an invited licensee for a limited purpose (repair). Recording expands that invitation and may constitute tort liability
- CCPA (Cal. Civ. Code §1798.100): voice recordings are "personal information" requiring notice at or before collection — to the customer, not just the tech. Penalties: $2,500/violation (unintentional), $7,500/violation (intentional)

**BIPA (Illinois) specific risk:** If Kova's AI creates any form of voice profile or speaker identification model, Illinois Biometric Information Privacy Act (740 ILCS 14) applies. Penalties: $1,000-$5,000 per occurrence. After *Cothron v. White Castle* (2023), the Illinois Supreme Court ruled each individual scan/collection is a separate violation. White Castle faced potential $17B liability. BNSF Railway paid $228M (jury verdict) for fingerprinting truck drivers — directly analogous to field worker biometric collection.

**The critical gap in the current plan:** Rilla's own FAQ tells customers "just inform the customer" — this is legally thin for a home service context but at least identifies the obligation. Kova's plan currently doesn't even identify who is responsible for notifying the customer.

**Mitigation — Consent Mechanism (Finalized):**

The approved approach is: **tech confirms customer consented via popup before recording begins.**

To make this legally defensible:

**1. Popup Design**
When the tech taps "Start Recording," a modal appears before recording begins:

```
Before Recording Starts

Please verbally inform your customer:
"I'll be recording this appointment for quality
purposes — is that okay with you?"

Once they agree, tap Start.

[ Customer Consented — Start Recording ]   [ Cancel ]
```

The popup serves three functions:
- Reminds the tech of their verbal disclosure obligation on every call (not just once during training)
- Creates a timestamped log entry: "Tech [name] confirmed customer consent at [time]" — this is the company's compliance record
- Prevents accidental recording before the customer has been told

**2. Audible Recording Tone**
When recording begins, the app plays a brief audible tone (similar to call center recording beeps). This serves as an ambient secondary notice that is verifiable in the recording itself.

**3. "Customer Declined" Workflow**
When a customer says no, the tech taps "Customer Declined" instead. This:
- Does not record the call
- Logs the decline (timestamp + tech ID)
- Counts the job as a dispatched job that was not recorded for a legitimate reason
- Keeps recording rate metrics accurate (declined calls excluded from compliance denominator)
- Prevents managers from penalizing techs for customer-initiated declines

**4. Realistic decline rate modeling**
In residential home services, customer recording decline rates are estimated at 5-15%. The product plan should model this:
- Revised recording rate target: **65-75% of dispatched jobs** (not 80%), accounting for ~10% customer declines, ~5-8% technical issues, ~5% genuine forgetfulness
- A 65% recording rate is still operationally excellent and produces meaningful data volume

**5. State-configurable consent language**
Admin settings should allow owners to select their state(s) of operation. In two-party consent states, the reminder text and recording tone are mandatory. In one-party states, they are optional but default to on (best practice).

**6. Legal consultation requirement (pre-launch)**
Budget for a 1-hour consultation with a California privacy attorney before the first customer goes live. Approximate cost: $300-500. This validates the specific consent flow against Cal. Penal Code §632 and CCPA before any recordings exist. This is a non-negotiable pre-launch item.

**Product plan amendment:** Replace "Consent capture: single on-screen acknowledgment before recording begins" with the full popup spec above, including the "Customer Declined" workflow, audible tone, and decline-adjusted recording rate target.

---

### 3.3 Technician Adoption Strategy

**Risk:** Product-plan-v3.md relies primarily on gamification (leaderboards, streaks, badges) to drive recording adoption. Research in behavioral science and field service deployments shows voluntary recording compliance settles at 30-40% without enforcement mechanisms. Gamification specifically fails for this demographic at high rates.

**Research basis:**
- Aberdeen Group: only 30% of field service organizations report "high adoption" of mobile tools in the first year; average time to >80% consistent daily use is 14 months
- Gartner (2012, 2014): predicted 80% of gamified applications would fail to meet business objectives — largely confirmed in field deployments
- University of Pennsylvania (Werbach & Hunter, 2012): gamification works best for intrinsically motivated workers; for others it feels patronizing or coercive
- Workers over 45 and workers with 10+ years of experience respond more negatively to leaderboards (Organizational Psychology research, 2018-2021): they perceive gamification as insulting to their craft expertise
- Disney hotel laundry workers dubbed electronic performance leaderboards "the electronic whip" (2013). Workers reported increased anxiety and injuries from rushing. Some intentionally slowed in protest.
- Amazon driver gamification: studied extensively. Worked short-term; eroded trust and contributed to ~150% annual turnover long-term (MIT Labor Lab, 2022)
- Rilla public statements: even their most successful customers don't report 100% recording rates; they've built features specifically to detect "selective recording" (the practice of techs only recording calls they know went well)
- BLS construction industry turnover: 56-65% annually. With a 6-month adoption ramp, and half the workforce leaving annually, you're in a perpetual re-onboarding cycle

**The demographic reality:** Experienced tradespeople have a strong craft identity. Being "scored" by an algorithm on dimensions they may find arbitrary ("rapport-building quality") threatens that identity. The gamification framing assumes techs will respond like Uber drivers or game players. They won't.

**MIT Sloan research (2017):** Reframing monitoring as "coaching" improved initial acceptance by ~20%, but the effect diminished after 60 days as workers observed how data was actually used. If coaching data is ever used for discipline or termination — even once — trust collapses permanently across the entire workforce, not just for the affected tech.

**Mitigation — Multi-Layer Adoption Strategy:**

Gamification is retained as a secondary layer (it works for a subset of techs, especially newer/younger ones). But the primary adoption architecture shifts from incentive-based to structural.

**Layer 1 — Mandatory Recording as Job Policy (Owner-Enforced)**
Since Drain Right's owner will require recording, the product should support enforcement rather than rely on motivation:

- **Recording compliance as a primary KPI** on the manager dashboard — given equal visual weight to coaching scores. "Did they record?" is as important as "how did they score?"
- **Dispatch-linked accountability:** When FSM is connected, Kova knows when a tech was dispatched. Every dispatched job without a corresponding recording is flagged automatically in the manager's review queue — labeled as a "compliance gap," not a coaching item
- **Non-recording reason capture:** When a job ends without a recording, the tech is prompted to log a reason before they can start the next job: "Customer declined" / "Technical issue (battery/signal)" / "Emergency call — no time" / "Other." This creates accountability without punishing legitimate skips, and gives managers real visibility into WHY recordings are missing
- **Manager recording targets:** Owner sets a company-wide recording target (e.g., "record every dispatched job except customer declines"). Compliance toward target is visible per tech on the dashboard

**Layer 2 — Eliminate Friction to Zero**
The plan's "one-tap record" is still one tap too many for a tech with wet/dirty hands who's carrying tools:

- **Auto-record on arrival (geofence/GPS trigger):** The plan lists this as a Phase 3 roadmap item. It should be Phase 1 or 2. If recording starts automatically when the tech's GPS enters the customer's address radius, the "forgot to record" problem is structurally eliminated. Tech still taps the consent popup before recording officially begins (giving them the reminder to verbally disclose), but the app is already running and ready.
- **Lock screen shortcut + widget:** Record button accessible without unlocking the phone. One less friction point for a dirty-handed tech.
- **Wired earphone mic support:** Techs who plug in earphones get better audio quality and can start recording without touching their phone.

**Layer 3 — Self-Defense Framing (Most Overlooked Motivator)**
The plan frames Kova to techs as "this helps you earn more." That works for ambitious techs. A more universally motivating frame for experienced tradespeople:

> "Kova protects you. When a customer claims you damaged something or said something you didn't say, the recording is your proof."

Experienced techs who have been falsely accused of damage, theft, or incorrect diagnoses understand this immediately. One story from a vet tech about a wrongful damage claim that cost them $800 out of pocket will do more for adoption than 100 "earn more" messages.

Additional self-defense framing:
- "You have documentation that you offered the camera inspection and the customer declined — no one can blame you for missed revenue you actually offered"
- "If a customer disputes the scope of work, you have the conversation on record"

**Layer 4 — Connect to Money Directly**
For techs who are motivated by compensation, abstract badges are weak. Strong options:
- **Bonus structure integration:** If the owner ties a bonus (even small — $25-50/week) to recording compliance AND score threshold, adoption will be near-universal. Kova should provide the performance export that feeds directly into bonus calculations.
- **Leaderboard with cash prize:** "Top scorer this month gets a $100 Amazon gift card" is more effective than any badge. This is an owner-level decision, but Kova should make it easy to run.

**Layer 5 — Revised Targets**
The 80% recording rate target in product-plan-v3.md should be revised:

| Recording Rate | What It Means |
|----------------|--------------|
| 80%+ | Exceptional — likely only achieved with geofence auto-recording + mandatory policy |
| 65-75% | Strong — realistic target for mandatory + consent declines + legitimate skips |
| 50-60% | Acceptable — minimum viable for product to deliver meaningful data |
| Below 50% | Failure state — product cannot score reliably, owner will churn |

**Gamification is retained but repositioned:** It is a secondary engagement layer for techs who are already recording at compliant rates. It rewards consistency, not initial compliance. Specifically: streaks and personal bests are more effective than leaderboards for experienced workers (they compete against themselves, not colleagues).

**Product plan amendment:** Add dispatch-linked accountability and non-recording reason capture to Phase 1 feature spec. Add auto-record on arrival (geofence) to Phase 2 (not Phase 3). Add "Self-defense / call documentation" to tech-facing value propositions alongside "earn more." Revise recording rate target to 65-75%.

---

### 3.4 Competitive Defense — Rilla

**Risk:** Product-plan-v3.md assumes Rilla needs "12-18 months of real call data" to build a competing drain/plumbing product with dollar-denominated scoring. This assumption is wrong on multiple dimensions.

**Research basis:**
- Neighborly (confirmed Rilla customer via their homepage and VP of Talent Ken Midgett's published case study) owns Mr. Rooter Plumbing and Benjamin Franklin Plumbing. Rilla has already processed 5,000+ virtual ridealongs with Neighborly technicians including plumbing/drain tech recordings. They have real plumbing data already.
- Rilla's "Rick Copilot" feature (AI that learns and mimics a specific manager's coaching style) went from concept to production in months — demonstrating high product velocity.
- Rilla hosts engineering events with AI startups and is actively recruiting engineers as of 2026. Their team of ~123 employees includes a strong engineering core (3 of 4 founders are technical).
- Pricebook integration is not technically difficult — it is a settings screen and a database table mapping service types to prices. A 4-person team can ship this in 6-8 weeks.
- Modern LLMs (GPT-4o, Claude) can be prompted with trade-specific context without needing custom training data. Kova's own Phase 1 uses this approach. Rilla can do the same in a sprint.
- Rilla's current multi-vertical strategy (dental, automotive, senior living, multifamily) is the reason they haven't done this yet — not a capability gap.
- Rilla's consent FAQ already addresses two-party consent states. Adding a formal consent capture screen is a trivially small engineering task.

**The realistic competitive scenario:**
1. Kova launches, gets 10-20 customers, starts appearing in plumbing Facebook groups and industry conversations (~Month 4-6)
2. Rilla's sales team encounters Kova in a competitive deal (~Month 5-7)
3. Rilla leadership decides plumbing is worth a vertical play (~Month 6-8)
4. Rilla ships "Rilla for Plumbing" with pricebook pricing and dollar-denominated output, marketed to their existing 1,300+ customers including Neighborly (~Month 9-12)
5. Kova is now competing against a well-funded ($20-50M+ ARR estimated), well-known brand with 6 years of distribution advantages

This is a 9-12 month window, not 18 months.

**Mitigation — Speed + Depth + Lock-In:**

**Layer 1 — Compress the Stealth Window**

Rilla will notice Kova when it starts appearing in industry conversations. That window is approximately the first 6-9 months. Use it aggressively:

- Recruit **5-10 design partners in the first 60 days** (not just Drain Right). Every additional partner compresses the data accumulation timeline and deepens the product before Rilla responds.
- **Publish case studies at Month 3-4, not Month 6.** The moment you have one credible ROI story ("Drain Right found $45K in estimated missed revenue in 30 days"), publish it everywhere: trade Facebook groups, PHCC forums, LinkedIn, Titan Exchange. Own the narrative before Rilla can respond.
- **Trade-specific SEO and community ownership.** Claim "plumbing revenue intelligence," "drain tech coaching," and related search/community positions now. Rilla's marketing is generic ("field sales coaching"). You can own the vertical-specific terms before they notice.

**Layer 2 — Build Moats Rilla Won't Copy**

Rilla's multi-vertical strategy is their structural weakness. Features that only make sense for plumbing/drain don't scale across dental, automotive, and senior living. Invest deeply in:

- **Trade-specific scoring logic** that is opaque and proprietary: camera inspection triggers tied to recurrence signal timing, hydrojet vs. snake recommendation logic based on specific drain symptoms, water heater age trigger with model-number cross-reference. None of this translates to other Rilla verticals.
- **Pricebook + FSM invoice matching** — this is the hardest part to copy because it requires active FSM integrations. Even if Rilla starts building tomorrow, they're 6-12 months behind on Jobber/HCP integrations alone.
- **The "plumbing industry" brand** — join PHCC, NAPHCC, sponsor Nexstar content, get quoted in trade publications. Rilla is a generic SaaS brand. Kova can be "the product the plumbing community built."

**Layer 3 — Create Lock-In Early**

After 6 months of Kova data, a customer has:
- A scored archive of hundreds of calls they can't migrate to Rilla
- A configured pricebook tied to their specific service structure
- Tech performance history and coaching notes (manager annotations are embedded in the workflow)
- Leaderboard history and badges that techs care about
- FSM integration write-backs (call scores embedded in ST job records)

This isn't defensible on Day 1 — but aggressively encouraging data accumulation from the first week compounds into real switching cost by Month 6.

**Layer 4 — Updated Competitive Response Playbook**

Add to product-plan-v3.md Section 6 (Competitive Defense):

> **Updated Scenario 1 (Realistic):** Rilla notices Kova in plumbing market and builds dollar-denominated scoring + pricebook feature within 6-12 months.
>
> **Revised Probability:** High (70%) on 6-12 month horizon. Previous "12-18 month" estimate was based on training data requirements that are no longer valid given LLM prompting capabilities and Rilla's existing Neighborly/plumbing data.
>
> **Response:** Speed of data accumulation (more design partners), FSM integration depth (Rilla has zero FSM connections today), trade-specific scoring complexity that doesn't scale horizontally, and community brand ownership in the plumbing niche. The goal is to be the obvious choice in plumbing before Rilla's response lands.

**Layer 5 — Long-Term Positioning: Stay Vertical**

The confirmed strategic direction (dominate plumbing/drain first, expand later) is the right call. Don't let competitive pressure from Rilla push you toward premature horizontal expansion. Going head-to-head with Rilla across verticals is a fight you'd lose. Owning plumbing/drain so thoroughly that Rilla can't take it is a fight you can win.

**Product plan amendment:** Update Competitive Defense Section 6, Scenario 1 to reflect 6-12 month realistic Rilla response window. Add 5-10 design partner recruitment as a Month 1-2 priority alongside Drain Right. Accelerate case study publication timeline to Month 3.

---

### 3.5 Missed Revenue Credibility

**Risk:** The dollar-denominated "missed revenue" output is the product's core value claim and its biggest intellectual vulnerability. "Missed revenue" is a counterfactual — you cannot prove the customer would have said yes. Research shows AI "missed opportunity" systems have precision rates of 30-50% (Forrester, 2022). If 50-70% of flagged opportunities feel irrelevant to techs, trust collapses within weeks and the product becomes ignored background noise.

**Research basis:**
- Forrester Research (2022): AI-driven lead/opportunity scoring systems typically have precision rates of 30-50%, meaning 50-70% of flagged "opportunities" are false positives
- Gartner (2023): when alert override rates in AI systems exceed 90-95%, users effectively ignore all alerts. The threshold for trust collapse is ~40% perceived false positive rate
- Kluger & DeNisi meta-analysis (1996) of 607 feedback interventions: 1/3 of feedback interventions *decrease* performance. Particularly, feedback that threatens self-concept ("you cost us $3,000") can cause avoidance behavior rather than improvement
- Journal of Marketing (2021): sales teams given specific behavioral coaching ("ask discovery questions") outperformed teams given dollar outcome targets ("increase revenue by 15%") by 22% over 12 months; behavioral group also had lower turnover
- The "unfalsifiability problem": if an AI says "you missed a $425 camera inspection," there is no way to verify the customer would have agreed. The dollar figure is inherently speculative. This is not a solvable problem — it is a permanent characteristic of the metric that must be acknowledged in the product's framing.

**The "boy who cried wolf" trajectory:**
- Week 1: "$47,320 identified missed revenue!" — owner is excited
- Week 8: tech has heard "you should have offered a camera inspection" 40 times, including on jobs where a camera inspection was clearly unnecessary. Tech stops reading coaching points.
- Week 16: owner notices techs aren't reviewing coaching points. Recording rates start dropping.
- Month 6: "We're paying $645/month for a thing our techs ignore."

**Mitigation — Precision First, Recall Second:**

**1. Language Change — Mandatory**
Throughout the entire product (UI, reports, marketing, documentation), change:
- "Missed Revenue" → **"Estimated Missed Opportunity"**
- "You lost $2,890 on this call" → **"Estimated opportunity on this call: $2,890"**
- Add a consistent footnote to every dollar figure: *"Based on your pricebook prices. Actual revenue potential depends on customer need, timing, and context — not every flagged opportunity would have been accepted."*

This is both more honest and more legally defensible. It also reduces the psychological threat to the tech (they're not being told they "lost" money — they're being shown an estimate of what was potentially available).

**2. High-Precision Opportunity Phasing**
Do not launch with all 8 opportunity types simultaneously. Launch with the 2-3 highest-confidence, lowest-ambiguity opportunities first:

| Phase | Opportunities | Why High Confidence |
|-------|--------------|-------------------|
| Phase 1 Launch | Camera inspection after recurrence signal; Maintenance plan not offered at close | Binary detection. "Customer said it keeps happening" + no camera offered = clear. No close discussion = binary. |
| Phase 2 (Month 3) | Hydrojet not presented when snake-only diagnosed | Requires understanding of tech's diagnosis — higher confidence after model tuning |
| Phase 3 (Month 6+) | Water heater, whole-home walkthrough, filtration, service agreement framing | More contextual, more ambiguous — require more annotated data to be accurate |

**3. Tech Dispute / Feedback Loop**
Every flagged opportunity in the tech-facing view must include a **"Not Applicable" button** with required reason selection:

- "Customer already has this service"
- "I offered it — customer declined (not captured in audio)"
- "Not relevant to this job type"
- "Customer said they couldn't afford more today"
- "Other"

When a tech disputes a flag:
- That specific opportunity is hidden from their coaching view (they acted in good faith)
- The dispute data feeds into model refinement
- Manager still sees the flag with the dispute reason attached — they can validate or override
- Dispute patterns across all techs are surfaced to Kova's model team as retraining signal

**Dispute rate is a product health metric:** If the dispute rate across all techs exceeds 40% on any specific opportunity type, that type is pulled from auto-scoring and reviewed by Kova's model team before being re-enabled.

**4. Confidence Score Tiering**
The manager and tech views should present opportunities differently based on confidence:

- **High confidence (85%+):** Shown in tech-facing coaching view as primary feedback
- **Medium confidence (60-85%):** Shown in manager view with "Review recommended" label; not surfaced in tech view unless manager promotes it
- **Low confidence (<60%):** Shown in manager view only with "Uncertain — verify manually" label; never shown to tech

**5. Contextual Suppression Signals**
The scoring engine should auto-suppress opportunity flags in specific contexts:

- **"I can't afford more right now"** (or equivalent) detected in transcript → suppress all upsell flags for the remainder of that call
- **Emergency context** detected (flooding, burst pipe, no heat/hot water) → switch to "emergency mode" scoring focused on speed and safety, not upsell. No opportunity flags.
- **First-time caller with no service history** → reduce recurrence trigger sensitivity (they may have had prior issues with another company, but we don't know)
- **Very short call (<8 minutes)** → flag as "Short call — limited scoring" and only score dimensions that plausibly had time to be addressed

**6. Invoice Calibration (When FSM Connected)**
When ServiceTitan or Jobber is connected and invoice data is available:
- Track the ratio of "estimated opportunity" to "actual invoice amount" per job type over time
- If Kova consistently shows $3,000 "estimated opportunity" on drain jobs that invoice for $250, the model is miscalibrated
- Display calibration confidence to the owner: "Estimates are based on X calls matched to invoices — accuracy improves over time"

**Product plan amendment:** Rename "Missed Revenue Engine" to "Estimated Opportunity Engine" throughout product-plan-v3.md. Add tech dispute mechanism to Phase 1 spec. Add confidence thresholds and tiered display to scoring engine spec. Add contextual suppression signals to LLM layer spec. Revise opportunity rollout to phased approach (2-3 types at launch).

---

### 3.6 SMB Churn Strategy

**Risk:** The SMB SaaS segment (< $200/seat/month) carries structural monthly churn of 3-5%. At the plan's ARPU, the LTV math is tight. The plan's MRR targets (Month 6: $15K, Month 12: $75K) assume churn below 5% — which requires the top end of performance for this category.

**Research basis:**
- Jobber (100K customers, $167.5M revenue, 17% YoY growth, 2024): implied ARPU ~$140/month. Industry estimates suggest 3-4% monthly logo churn for their segment.
- Housecall Pro (comparable segment): estimated 3.5-5% monthly logo churn
- ServiceTitan (S-1, 2024): NRR of 110%, implied GRR ~88-92%, ~10-15% annual logo churn — but they serve larger shops at $5-10K+/month, far less churn-prone
- ProfitWell/Paddle (pre-acquisition data): 20-40% of SMB SaaS churn is involuntary (failed payments). SMBs use personal or business debit cards that overdraft during slow seasons.
- Aberdeen Group: products used daily churn at 1/3 the rate of products used weekly
- Home services seasonality: elevated churn in November-January (slow season + year-end budget review + holiday cash pressure)
- Month 1-3 cohort: 20-30% of new SMB customers churn in the first 90 days. After surviving Month 3, retention curves flatten dramatically.
- ProfitWell: customers who receive monthly "value delivered" reports showed no statistically significant retention difference vs. those who didn't — unless ROI exceeded 10x subscription cost

**The math problem:**
At 5 seats average × $129/month (Pro) = $645/month ARPU. With 4% monthly churn:
- Average customer lifetime: 25 months
- LTV per account: $16,125
- Required CAC for 5:1 LTV:CAC ratio: <$3,225

Phone-based outbound sales (the channel that works for this market) costs $2,000-10,000 CAC for mid-market vertical SaaS. You need to stay in the lower half of that range to maintain unit economics.

**Mitigation — Five-Layer Retention Strategy:**

**Layer 1 — Annual Billing as Primary Offer**
Annual customers churn 20-30% less than monthly customers (even accounting for selection bias of committed customers choosing annual).

- **Default offer:** Annual plan (2 months free = 16% discount; equivalent to $645 saved on Pro 5-seat)
- **Monthly as opt-in:** "If you need flexibility, we offer monthly billing — though most owners go annual and save significantly"
- **Annual math for a 5-tech Pro shop:** $645/mo × 10 paid months = $6,450/year vs. $7,740 on monthly. Savings messaging is concrete and resonant with cost-conscious owners.

**Layer 2 — Involuntary Churn Prevention**
20-40% of SMB churn is failed payments — invisible in normal churn analysis but easily mitigated:
- Pre-dunning email at card expiry minus 7 days: "Your card expires [date]. Update it here to avoid interruption."
- Smart retry logic: retry failed payments on the 1st and 15th of the month (typical payday dates for business accounts)
- In-app "payment failed" banner with one-tap update
- ACH/bank debit option for customers who prefer it (lower failure rate than debit cards)
- Visa/Mastercard Account Updater service: automatically refreshes expired card numbers when the issuer provides updated data. Recovers ~30% of expiring card failures passively.
- 7-day grace period before any service interruption after failed payment

**Layer 3 — Month 1-3 Activation Sprint**
50% of first-year churn happens in the first 90 days. Prevent it with high-touch onboarding:

| Milestone | Trigger | Action |
|-----------|---------|--------|
| Day 1 | Account created | Founder/CS call within 24 hours: "Got you set up — want to walk through anything?" |
| Day 7 | Check-in | Text message: "How's the first week going? How many calls recorded so far?" |
| Day 14 | If <10 calls recorded | Urgent outreach: "You haven't recorded 10 calls yet — let's troubleshoot together" |
| Day 21 | Usage review | Call with owner: review first scored calls together, adjust pricebook if needed |
| Day 30 | First ROI baseline | Deliver "Month 1 performance baseline" report — this becomes the benchmark for ROI |
| Day 60 | Progress review | "Here's how your team has improved vs. their Month 1 baseline" |

At early stage, these touchpoints are founder-led. This is time-intensive but prevents the Month 3 cliff that kills most SMB SaaS cohorts.

**Activation gate:** If an account hasn't recorded 10 calls in the first 14 days, it's classified as "at-risk" in the internal dashboard and receives urgent outreach. This is the single most predictive churn indicator to watch.

**Layer 4 — Daily Workflow Integration (Not Weekly Review)**
Products used daily churn at 1/3 the rate of products used weekly. Currently Kova risks being a "Monday morning dashboard" — the owner opens it once a week, glances at numbers, and doesn't engage again. Mitigations:

- **Pre-call notification makes Kova daily for techs:** Every dispatched job generates a Kova notification. This creates a daily habit loop tied to every job start, not just post-call review.
- **Post-call summary within 5 minutes:** The tech's feedback arrives before they're even in the truck. This creates a real-time coaching loop that becomes habitual faster than weekly reviews.
- **Daily morning push for owners:** A short "Yesterday's highlight" notification: "Marcus had your best call of the week — $1,200 captured. Carlos has a coaching point ready." 60-second daily engagement, not weekly dashboard.
- **Manager call queue:** The call review queue should have daily urgency ("3 calls need your review before Marcus's coaching session Friday") — not a passive library.

**Layer 5 — Move Upmarket Faster**
The plan targets "2-15 tech shops" throughout. But churn for 2-5 tech shops is brutal (business failure rates, cash flow variability, single-person decision-making). Adjustments:

- **Primary outbound focus: 8-15 tech shops** — lower churn, higher ARPU, longer relationship, more people whose jobs depend on the product
- **Team tier ($149/seat, 15+ techs) should be actively sold from Month 4**, not just listed as available
- **PE-backed companies (Phase 5 GTM) should be moved to Phase 3 timing.** They're the lowest-churn, highest-LTV customers in the market. One PE portfolio deal could add 200+ seats at once. The product needs to be stable by Month 6-9 to support this, but the sales conversation should start sooner.

**Seasonal preparation:**
- Model a 20-30% churn spike in November-January
- Plan a retention campaign in October: "Kova year-end review" — send owners their cumulative ROI since signup before they're reviewing budgets
- Offer a "slow season" quarterly payment option (Q4 at 25% of annual rate) rather than losing the account entirely

**Product plan amendment:** Add annual billing as the default offer (monthly as opt-in) to pricing section. Add involuntary churn prevention features to admin/billing section. Add Month 1-3 activation milestones to onboarding section. Revise GTM to bring PE/portfolio companies to Phase 3 timing. Update target customer profile to emphasize 8-15 tech shops as primary outbound segment.

---

### 3.7 FSM Integration Strategy

**Risk:** Product-plan-v3.md designates ServiceTitan as the Tier 1 integration priority. But ServiceTitan has built 9+ "Pro" products that directly compete with their own marketplace partners, their API is gated behind a multi-month partner approval process, and their own Field Pro product is directly competitive with Kova. They have both the motive and mechanism to block, compete with, or deprioritize Kova in their marketplace.

**Research basis:**
- ServiceTitan's Marketplace "House Specialties" section explicitly shows first-party products competing with partners: Marketing Pro, Scheduling Pro (acquired from Schedule Engine), Payments, Phones Pro, Pricebook Pro, Fleet Pro, Dispatch Pro, Sales Pro, AI Voice Agent
- The Schedule Engine acquisition is the clearest example: ST observed a successful marketplace partner, acquired them, and rebranded them as a first-party product (Scheduling Pro). Any marketplace partner category could face this.
- ServiceTitan API access is gated behind partner approval: multi-month process including security review, use-case review, and tiered partnership levels
- The API uses polling-based triggers (15-minute intervals via Zapier integration) rather than real-time webhooks for standard access — making true real-time job matching impossible through standard channels
- Jobber has a publicly documented GraphQL API with standard OAuth 2.0, open developer documentation, and an active marketplace with monetization. No competing internal coaching product.
- Housecall Pro's API documentation is not publicly accessible — suggesting limited/early-stage API support
- Drain Right (the pilot partner) uses ServiceTitan — making some ST integration necessary for Phase 1

**Exception for Phase 1 — ST Needed for Drain Right:**
Since the pilot partner uses ServiceTitan, a minimum viable ST integration is required for Phase 1. However, this integration should be:
- **Scoped narrowly:** Read job data on dispatch (customer name, job type, address) + write call score as a job note. That's it for Phase 1.
- **Not blocking for launch:** Phase 1 can start with **manual job tagging** at Drain Right (tech enters job # or customer name) and the ST API connection built in weeks 4-8, not Day 1.
- **Not dependent on pricebook sync:** Drain Right's pricebook can be manually entered into Kova for Phase 1. The ST pricebook API sync can wait for Phase 2.

**Revised FSM Tier Priority:**

| Tier | FSM | Timeline | Why |
|------|-----|----------|-----|
| 1A | ServiceTitan | Phase 1 (minimum viable) | Required for Drain Right pilot. Narrow scope only. |
| 1B | Jobber | Phase 2 parallel | Largest unserved SMB pool (100K+ shops). No competing product. Open API. |
| 2 | Housecall Pro | Phase 3 | 150K+ users. API maturity unknown — assess during Phase 2. |
| 3 | FieldEdge, ServiceFusion, others | Phase 4+ | Community-requested. |

**Generic FSM Adapter Architecture (Required):**
Do not build "a ServiceTitan integration" as a one-off. Build a standardized FSM adapter layer:

```
[Kova Core] ←→ [FSM Adapter Interface]
                    ↓             ↓             ↓
             [ST Connector]  [Jobber Connector]  [HCP Connector]
```

Standardized data model the adapter normalizes to:
- `Job { id, customer_name, address, job_type, tech_id, dispatch_time, invoice_amount }`
- `Customer { id, name, service_history[], prior_notes }`
- `Invoice { id, job_id, line_items[], total_amount }`

Each FSM connector translates between the FSM's native format and this standard model. Adding Jobber or HCP becomes a new connector, not a new architecture.

**Standalone Mode as Primary Experience:**
A critical strategic protection: Kova must be fully valuable without ANY FSM connected. The plan currently positions standalone mode as a fallback. Flip this:
- "Connect your FSM for additional features" should be the positioning, not "you need FSM for full functionality"
- All core features (recording, scoring, estimated missed opportunity, pricebook, dashboard) work fully without FSM
- This means if ServiceTitan blocks or deprioritizes Kova, the product continues to work for 100% of users
- The FSM connection unlocks enhancements (auto job-matching, invoice calibration, pre-call intelligence) — it doesn't gate core value

**ServiceTitan Partnership Positioning:**
If pursuing the ST marketplace approval process, do NOT position Kova as a Field Pro competitor. Position as:
- "Complementary to Field Pro — serves the 90% of ST customers who haven't activated Field Pro yet"
- "Specialized vertical depth for drain/plumbing that Field Pro doesn't focus on"
- "Helps smaller ST shops get coaching value before they're ready for Field Pro"

This won't eliminate the competitive risk, but it may get through the approval process before ST decides to actively block the category.

**Product plan amendment:** Revise FSM Integration Section 14 to reflect revised tier priorities (1A ST minimum viable, 1B Jobber parallel). Add generic adapter architecture requirement to engineering spec. Reframe standalone mode as primary experience (not fallback). Remove "Priority" label from ServiceTitan; replace with "Required for pilot — minimum viable scope."

---

### 3.8 Predatory Upselling Safeguards

**Risk:** Kova is explicitly framed as a "revenue enforcement system" with scores used for "hiring/firing decisions." The scoring engine only measures what was "missed" — it has no mechanism to detect or penalize inappropriate recommendations. This creates the exact same structural incentive that produced the Jiffy Lube pattern (2003, 2009, 2013 KNBC investigations), the ARS/Rescue Rooter BBB complaint patterns, and the multiple state AG actions against HVAC/plumbing companies under Deceptive Trade Practices Acts.

**Research basis:**
- Jiffy Lube (2003, 2009, 2013): Undercover investigations found technicians performing procedures customers never needed — engine flushes that manufacturer guidelines warned against, phantom filter replacements. Training reportedly included scripts to create urgency. Multiple state AG investigations followed.
- ARS/Rescue Rooter, Service Experts, Roto-Rooter, Aire Serv (Neighborly): Documented patterns of technicians diagnosing expensive problems (cracked heat exchangers, failed compressors, complete sewer replacements) that independent second opinions did not confirm. BBB complaint volumes are extensive.
- Wells Fargo (2016): The canonical cross-sell fraud case. When workers are scored on "opportunities identified," they manufacture opportunities. 3.5 million fake accounts. The incentive structure, not individual bad actors, was the root cause.
- FTC Act Section 5: An act is deceptive if there is a representation or omission likely to mislead consumers acting reasonably, and the representation is material. A tech saying "you need X because of Y" when Y doesn't exist is actionable regardless of whether the incentive came from an algorithm or a manager.
- The AI dimension makes it worse in litigation: every AI-generated recommendation is logged. Pattern evidence (the system systematically recommended unnecessary services) is trivially easy to establish from logs. A discovery request in a class action would immediately surface every flagged "opportunity" and every resulting recommendation.
- FTC enforcement trajectory: the FTC issued guidance in 2023 on AI systems that generate recommendations, specifically flagging systems that optimize for conversion rate without regard to consumer interest as potential Section 5 violations.

**The structural flaw:** The current scoring model rewards techs for offering services and penalizes them for not offering them. It has no signal for "was this offer appropriate to the customer's actual situation?" A tech who offers a $1,500 hydrojetting service to a customer with a simple hair clog gets a high score. A tech who professionally diagnoses a minor issue and doesn't push unnecessary services gets penalized. Over time, the scoring system trains the team to recommend more, not recommend better.

**Mitigation — Bidirectional Scoring:**

**1. New Scoring Dimension: Contextual Appropriateness**

Add a fourth layer to the scoring engine that the current plan does not include:

**Customer Experience Quality (0-3 pts)**

| Signal | Detection Method | Scoring |
|--------|-----------------|---------|
| Primary complaint addressed before upsell discussion | Timing analysis | Full primary diagnosis before any upsell mention = 3 |
| Upsell connected to stated customer pain | LLM contextual match | Direct connection to what customer said they're worried about = 3 |
| Customer expressed discomfort, pressure, or distress | Sentiment analysis + keywords | "I really can't afford more right now," "I just want the basic fix," "I feel pressured" → flag |
| Recommendations tied to observable evidence | LLM analysis | Tech explains what they saw/tested before recommending = better score |

Scoring model truth: a call where a tech pushed three upsells to a customer who said twice "I can't afford more today" should score LOWER overall, not higher because "all opportunities were offered." The product's goal is helping companies run profitable AND ethical service calls.

**2. Over-Recommendation Detection**

Flag calls where the tech's offer pattern is inappropriate for context:
- Multiple high-cost upsells on an emergency call (flooding, no heat in winter) → flag as "poor timing"
- Upsell offer before diagnosis is complete (price mentioned in first 2 minutes) → flag as "premature offer"
- Same upsell offered twice after customer declined once → flag as "pressure indicator"
- High-value offer to customer with documented history of declining upgrades → flag for manager review

These flags do NOT automatically penalize the tech — they route to manager review as coaching opportunities.

**3. Terms of Service Language**

Add explicit language to the owner Terms of Service and onboarding flow:

> "Kova's estimated opportunity data is provided to help your team identify genuine service value for customers — not to pressure techs into recommending services customers do not need. Kova scores reflect estimated opportunity, not a mandate to offer every flagged service on every call. Owners are responsible for maintaining ethical sales practices. Using Kova data to incentivize recommendations that are not in the customer's interest is a violation of these Terms of Service."

**4. Framing Update Throughout Product**

The plan's positioning "Kova is not a coaching tool — it is a revenue enforcement system" is both compelling (differentiated) and legally dangerous. Suggest retaining the positioning but adding a qualifier:

- Current: "revenue enforcement system"
- Amended: "revenue intelligence system — showing you what's genuinely available on every call, at your actual prices"

The word "enforcement" implies mandatory maximization regardless of context. "Intelligence" implies informed decision-making.

**5. "Estimated" Language Reinforces This**

The switch to "Estimated Missed Opportunity" language from Risk 3.5 mitigation also mitigates the upselling problem: if the number is explicitly an estimate, techs understand it's a data point for consideration, not a mandate to present.

**Product plan amendment:** Add Customer Experience Quality scoring dimension to Section 10.2 (AI Scoring Engine). Add over-recommendation detection to LLM layer spec. Add acceptable use / ethical sales language to ToS section in Section 16 (Data Security & Privacy). Update "revenue enforcement system" language to "revenue intelligence system" throughout. Remove or qualify language in Section 21 (Compensation Export) that positions scores as direct hiring/firing tools.

---

### 3.9 Self-Proving ROI Report Strategy

**Risk:** The monthly ROI report ("Kova ROI Report") in product-plan-v3.md is auto-sent every month showing missed revenue identified. Research shows automated ROI reports backfire in specific conditions: (1) low-value months provide cancellation ammunition, (2) diminishing returns make the product appear less necessary as techs improve, (3) only 14% of B2B SaaS buyers find vendor-provided ROI metrics "highly credible."

**Research basis:**
- Gartner (2022): only 14% of B2B SaaS buyers rated vendor-provided ROI metrics as "highly credible." The majority view them as marketing artifacts.
- Vendasta published a candid post-mortem noting their "proof of performance" reports accelerated churn when reported value dipped below 3x subscription cost — customers used the vendor's report as cancellation justification
- SaaStr Annual 2023 (CS leader panel): reported ~15-20% of churning SMB customers cite the vendor's own value metrics as their justification for leaving. "Your report says you found $800 in value last month. You cost $645. Not worth it."
- ProfitWell (pre-acquisition): customers receiving monthly value reports showed no statistically significant retention difference vs. those who didn't — unless ROI exceeded 10x
- Journal of Applied Psychology (2019): performance monitoring tools show 23% improvement in first 30 days that decays to ~8% by Day 180. The initial "wow" is partially Hawthorne effect, not the AI.
- Revenue.io (formerly RingDNA): explicitly pivoted away from ROI-based selling after finding that customers sold on ROI numbers churned at higher rates than those sold on workflow improvement
- Gong's actual retention mechanism: workflow dependency (managers build coaching workflows around Gong), not ROI proof. Their quarterly business reviews focus on features used and habits formed, not dollar attribution.
- The Hawthorne effect in coaching tools (Brainshark research): any new recording/monitoring tool produces a temporary performance boost simply from increased management attention and rep awareness of being observed. This confound makes isolating the tool's contribution nearly impossible.

**The diminishing returns death spiral:**

```
Month 1-3: $47K/month estimated missed opportunity
Month 4-6: Techs improve. $22K/month. Owner: "Good progress!"
Month 7-9: $12K/month. Owner: "Are we getting our money's worth?"
Month 10:  $8K/month. Owner: "I'm paying $645 and this says $8K.
           My techs are good now. Do I need this anymore?"
Month 11:  Cancellation.
```

The tool worked perfectly — and its success made it appear unnecessary.

**Mitigation — Cumulative Framing + Narrative Evolution:**

**1. Show Cumulative, Not Monthly (Primary Change)**

Replace the monthly "missed opportunity this month" metric with cumulative totals from signup:

```
KOVA PERFORMANCE REPORT — April 2026
Drain Right | 12 Months Active

SINCE YOU STARTED KOVA
  Total estimated missed opportunity identified: $387,000
  Estimated recovered through coaching:        +$112,400
  Team improvement since Month 1:              +31% avg score

YOUR TEAM THIS MONTH
  April avg score: 79/100  (↑ from 61/100 in Month 1)
  April improvement vs. March: +4 points
  Top performer: Marcus (91 avg)
```

Cumulative numbers only go up. Monthly numbers go down when techs improve. Always lead with the number that tells the success story.

**2. Reframe Declining Missed Revenue as Victory**

When monthly estimated missed opportunity drops significantly (>30% month-over-month), the report should explicitly celebrate this instead of surfacing it as a neutral metric:

> "Your team's estimated missed opportunity dropped from $47K to $14K/month. That means they're capturing approximately $33,000 more in service value every month than when you started. This is exactly what Kova is designed to do."

**3. Regression Detection as Ongoing Value Proposition**

The product's Month 12+ value proposition shifts from "discover missed revenue" to "prevent regression":

- "Marcus has held an 87+ avg score for 12 consecutive weeks. Research on coaching interventions shows unmonitored performance typically regresses to baseline within 4-6 weeks. Kova keeps the gains."
- When a tech's score drops 10+ points over 3 calls, surface it immediately: "Carlos dropped from 83 to 68 this week — without Kova, you would have seen this at month-end when the revenue impact was already done."
- New hires ramping faster than company average → quantify this: "Your last two new hires reached 75+ avg score in 6 weeks. Industry average without structured coaching is 18+ weeks."

**4. Narrative Evolution Map**

The ROI report should change its emphasis based on the account's tenure:

| Tenure | Primary Value Narrative | Key Metrics |
|--------|------------------------|-------------|
| Months 1-3 | Discovery: "Here's what's available" | Estimated missed opportunity per week, first call scores |
| Months 4-9 | Progress: "Here's how much has improved" | Score improvement, estimated recovery trend |
| Months 10+ | Maintenance: "Here's what we're protecting" | Regression prevention, new hire ramp speed, score consistency |

**5. Human CS Trigger for Low-Value Months**

Do not auto-send the ROI report if the data would arm the customer for cancellation. Specific triggers:
- Monthly estimated opportunity <3x subscription cost → do NOT auto-send. Trigger CS outreach to understand context (slow month? seasonal dip? tech turnover?) and schedule a call before the owner sees the numbers without context.
- Month-over-month estimated opportunity decrease >50% → review the report before sending; add context narrative explaining why the number dropped (techs improved, seasonal call volume, etc.)

**6. Usage Metrics as Evidence of Value**
Add to the ROI report: "Your team recorded 94 calls last month, completed 78% of coaching points, and your avg dashboard check-in was 4x/week." Even if dollar numbers are modest in a given month, behavioral evidence of engagement demonstrates the product is working.

**Product plan amendment:** Revise ROI Report (Section 21) to lead with cumulative metrics, add narrative evolution by account tenure, add regression detection as explicit Month 10+ value prop, add CS trigger logic for low-value month reports. Remove auto-send for <3x ROI months.

---

### 3.10 AI Scoring Legal Compliance

**Risk:** The plan specifies that Kova scores can be "used directly in performance reviews, bonus calculations, and hiring/firing decisions." This classification triggers AI employment law compliance requirements in multiple jurisdictions. Additionally, if the NLP scoring engine systematically disadvantages Spanish-speaking technicians due to transcription error rates or linguistic pattern differences, the company faces Title VII disparate impact exposure.

**Research basis:**
- EEOC guidance (2022, 2023): employers are liable for discriminatory AI outcomes even when using third-party vendor tools. Standard 80% rule (Uniform Guidelines on Employee Selection Procedures) applies to AI-generated scores.
- NYC Local Law 144 (effective July 5, 2023): any "automated employment decision tool" used to substantially assist or replace discretionary employment decisions requires: (a) independent bias audit within 12 months before use, (b) public disclosure of audit results, (c) 10 business days advance notice to employees/candidates. Penalty: $500-$1,500/violation/day. Each unnotified tech is a separate violation.
- Houston Federation of Teachers v. Houston ISD (2017): teachers fired based on opaque algorithmic scores successfully challenged the system on due process grounds ($237K+ settlement). Teachers could not meaningfully contest scores generated by a proprietary algorithm.
- Research on NLP linguistic bias: multiple peer-reviewed studies (Blodgett et al., 2020; Sap et al., 2019) demonstrate that NLP models systematically score African American English (AAE), non-native English patterns, and accented speech differently than standard American English.
- Title VII framework: if AI scoring correlates with accent or syntax patterns typical of specific national origin groups, and those scores are used for termination, this is a classic disparate impact claim under Griggs v. Duke Power (1971).
- Siro's experience: when using a legacy transcription provider, Spanish and accented speech had significantly higher WER (Word Error Rate), which cascaded into incorrect AI analysis downstream — "garbage in, garbage out."
- Illinois AI Video Interview Act (820 ILCS 42): signals legislative direction toward AI behavioral analysis requiring consent and transparency, even outside of hiring context.

**The specific risk for Kova:** The scoring engine's accuracy depends entirely on transcription accuracy. If Spanish call transcription has 20-35% WER (vs. 5-10% for clean English), every downstream analysis built on that transcript is proportionally less accurate. A Spanish-primary tech's scores will be systematically lower — not because they perform worse, but because the AI can't understand them as well.

**Mitigation — Legal Compliance Framework:**

**1. Pre-Launch Cross-Language Score Parity Testing**

Before the first paying customer goes live, run a structured bias test:

- Collect 20 English calls, 20 Spanish calls, 10 bilingual/code-switching calls (can use synthetic or designed scenarios initially, replaced with real calls as data accumulates)
- Run all through the full pipeline (transcription → rules → LLM → scoring)
- Compare: average score per language, trigger detection rate per language, false positive rate per language
- If Spanish calls score systematically more than 10 points lower than English calls on equivalent performance, the model has a bias that must be corrected before deployment

This test should be repeated quarterly as the model evolves.

**2. Per-Language Transcription Accuracy Tracking**

Track Word Error Rate (WER) separately for English, Spanish, and bilingual calls:
- If Spanish WER exceeds English WER by more than 15 percentage points, flag all Spanish call scores as "lower confidence" automatically
- Surface this in the manager view: "This call was in Spanish. Transcription confidence: Medium. Score accuracy may be affected. Review recommended."
- This prevents discriminatory outcomes AND gives managers the right context for how to use the score

**3. Language as a Protected Input**

The scoring API should explicitly NOT allow language of call to influence the base score. Language detection is used only for:
- Selecting the appropriate transcription model
- Routing tech-facing coaching points to the right language
- Reporting/analytics

Language should never be a scoring dimension input. If it inadvertently correlates with lower scores (through transcription quality), that correlation must be identified and corrected in bias testing.

**4. "Informs Decisions" vs. "Makes Decisions" — Critical Legal Distinction**

The difference between being classified as an "automated employment decision tool" (NYC LL 144) and a general performance intelligence tool comes down to framing:

- **Classified as AEDT (triggers LL 144):** "Used to substantially assist or replace discretionary decision-making for employment decisions"
- **Not classified as AEDT:** "Provides data to inform performance coaching conversations"

Concrete changes required:
- Remove "hiring/firing decisions" language from all product documentation, the plan, the ROI report, and the compensation export feature
- Replace with: "performance insights to inform coaching conversations and development planning. Employment decisions should incorporate multiple inputs and human judgment."
- The compensation export feature footer must include: "Kova data reflects estimated coaching performance. We recommend using this alongside direct manager observation, customer feedback, and other performance inputs when making employment decisions."

**5. Score Explainability — Required Architecture**

Every score must be decomposable into specific, human-readable reasons:

```
Overall Score: 62/100

Breakdown:
  Camera Inspection (3 pts possible): 0 pts
  Reason: Customer said "this keeps happening" at 4:22.
  No camera inspection offer detected in remaining 24 minutes.
  [▶ Play clip 4:18-4:35]

  Maintenance Plan (3 pts possible): 1 pt
  Reason: Maintenance plan mentioned but not connected to
  customer's stated recurring concern.
  [▶ Play clip 26:41-27:12]

  Customer Experience Quality (3 pts possible): 3 pts
  Reason: Primary diagnosis completed before any upsell
  discussion. Customer comfort level appeared high throughout.
```

This explainability serves two purposes: (1) it allows techs to contest specific points ("that's wrong — I did offer it and the customer declined; it's just not captured clearly in the audio"), (2) it satisfies the due process requirement from Houston Federation of Teachers — the tech can understand and contest their score.

**6. Audit Trail Architecture**

Retain the following data separately from the standard call retention policy, with a minimum 3-year retention:
- Raw transcript segments used in scoring
- Specific triggers detected (with timestamps)
- Confidence scores on each trigger
- Final score per dimension with reasoning
- Any disputes filed by tech or manager overrides

This data is your defense in any EEOC investigation or employment discrimination claim.

**7. NYC Local Law 144 Readiness**

If Kova has any customers in New York City (likely, given the market size):
- Budget for an annual third-party bias audit ($10,000-30,000/year from qualified auditors)
- Post audit results on the Kova website (or provide link to customers for their own compliance)
- Add to employee onboarding materials: "We use an AI scoring system. Here's how it works and what it measures." (10-day advance notice requirement)
- This is a compliance cost that should be built into the Year 1-2 budget

**Product plan amendment:** Add language audit requirement and bias testing protocol to Phase 1 checklist (Section 24). Update Compensation Export (Section 21) with disclaimer language. Update Section 16 (Data Security & Privacy) with audit trail retention requirement. Add NYC LL 144 compliance to legal compliance checklist. Remove "hiring/firing decisions" language from all sections; replace with "informs coaching conversations and performance development."

---

## 4. Product Plan v3 Amendment Summary

The following table consolidates every specific change proposed in Section 3 and maps it to the relevant section of `product-plan-v3.md`.

| # | Amendment | Section in v3 | Priority |
|---|-----------|---------------|----------|
| 1 | Remove "iOS first" — both platforms Day 1 via cross-platform framework | §24 Phase 1 Roadmap | Critical |
| 2 | Add battery management spec (Opus compression, low-battery warning, auto-pause) | §10.1 Mobile App | Critical |
| 3 | Replace "on-screen acknowledgment" with full consent popup spec including reminder text | §10.1 Recording | Critical |
| 4 | Add audible recording tone to consent flow | §10.1 Recording | Critical |
| 5 | Add "Customer Declined" workflow and adjust recording rate metric denominator | §10.1 Recording, §26 Success Metrics | Critical |
| 6 | Add state-configurable consent language to Admin Controls | §15.2 Admin Controls | Critical |
| 7 | Revise recording rate target from 80% to 65-75% | §26 Success Metrics | High |
| 8 | Add dispatch-linked compliance tracking (no recording = flagged gap) to Phase 1 | §24 Phase 1 Roadmap | Critical |
| 9 | Add non-recording reason capture (tech logs reason when no recording) | §10.1 Mobile App | High |
| 10 | Move auto-record on arrival (geofence) from Phase 3 to Phase 2 | §24 Phase 3 → §24 Phase 2 | High |
| 11 | Add self-defense framing to tech-facing value propositions | §11 Tech Adoption | High |
| 12 | Rename "Missed Revenue Engine" → "Estimated Opportunity Engine" throughout | §10.3, §9, §21, all references | Critical |
| 13 | Add "estimated potential — not every opportunity would have been accepted" footnote to all dollar figures | §10.3, §21, §8 | Critical |
| 14 | Phase opportunity type rollout: 2-3 types at launch, expand in Phase 2-3 | §10.3 | High |
| 15 | Add confidence thresholds: 85%+ for tech view, 60-85% for manager view only, <60% review only | §10.2, §10.3 | High |
| 16 | Add tech dispute / "Not Applicable" mechanism to all flagged opportunities | §10.3, §10.4, §10.5 | High |
| 17 | Add contextual suppression signals ("can't afford," emergency context, first-time caller) | §10.2, §10.3 | High |
| 18 | Add invoice calibration layer when FSM connected | §10.3, §14 | Medium |
| 19 | Flip FSM priority: ST = Tier 1A (minimum viable, pilot only); Jobber = Tier 1B (growth) | §14 FSM Integration | High |
| 20 | Add generic FSM adapter architecture requirement | §14 FSM Integration | High |
| 21 | Reframe standalone mode as primary experience (not fallback) | §14 FSM Integration | High |
| 22 | Add Customer Experience Quality scoring dimension (contextual appropriateness) | §10.2, §10.4, §10.5 | High |
| 23 | Add over-recommendation detection to LLM layer | §10.2 AI Scoring Engine | High |
| 24 | Update "revenue enforcement system" → "revenue intelligence system" throughout | §1 Vision, §7 Differentiation | High |
| 25 | Remove or qualify "hiring/firing decisions" language; add coaching framing disclaimer | §21, §15 | Critical |
| 26 | Add ethical use / acceptable use language to Terms of Service | §16 Security & Privacy | High |
| 27 | Replace monthly ROI report with cumulative-first framing | §21 Self-Proving ROI | Medium |
| 28 | Add narrative evolution map to ROI Report (discovery → progress → maintenance) | §21 | Medium |
| 29 | Add regression detection and new hire ramp speed as Month 10+ value props | §21, §27 Long-Term Vision | Medium |
| 30 | Add CS trigger for low-value months (no auto-send <3x ROI) | §21 | Medium |
| 31 | Add annual billing as primary offer (2 months free) to pricing section | §19 Pricing | High |
| 32 | Add involuntary churn prevention features (dunning, ACH, Account Updater, grace period) | §19 Billing Guardrails | High |
| 33 | Add Month 1-3 activation sprint milestones to onboarding section | §13 Onboarding | Critical |
| 34 | Update primary outbound target to 8-15 tech shops (not 2-15) | §3 Target Customer, §23 GTM | High |
| 35 | Move PE-backed portfolio companies to Phase 3 GTM timing | §23 GTM Phase 5 → Phase 3 | Medium |
| 36 | Update Competitive Defense Scenario 1 (Rilla): change timeline to 6-12 months | §6 Competitive Defense | High |
| 37 | Add 5-10 design partner recruitment as Month 1-2 priority | §23 GTM Phase 1 | High |
| 38 | Accelerate case study publication to Month 3 (from Month 6) | §23 GTM Milestones | High |
| 39 | Add pre-launch cross-language score parity testing to Phase 1 checklist | §24 Phase 1 | High |
| 40 | Add per-language WER tracking and confidence flagging to transcription pipeline | §10.2 | High |
| 41 | Add score explainability requirement (decomposable to specific timestamped reasons) | §10.2 | High |
| 42 | Add audit trail retention policy (3-year minimum for scoring data) | §16 Security & Privacy | High |
| 43 | Add legal consultation (CA privacy attorney) as pre-launch checklist item | §24 Phase 1 | Critical |

---

## 5. Open Questions & Next Steps

The following items require decisions, external input, or further research before they are resolved.

### Decisions Required

| Item | Question | Owner | Urgency |
|------|----------|-------|---------|
| Cross-platform framework | React Native vs. Flutter vs. KMP — decision required before any mobile dev starts | Engineering / Founder | Before Phase 1 kickoff |
| Annual billing default | Is the team comfortable pushing annual as primary vs. monthly opt-in? | Founder / Business | Before pricing page is built |
| Geofence auto-record | Is Phase 2 (Months 3-6) early enough, or should this be investigated for Phase 1 as the primary consent trigger? | Product / Legal | Month 1 |
| Score dispute resolution | When a tech disputes a flag and manager disagrees, who has final authority? | Product | Before Phase 1 launch |
| "Over-recommendation" flag consequences | Is an over-recommendation flag surfaced to the owner, the manager only, or both? Does it affect the overall score? | Product | Before Phase 1 launch |

### External Input Required

| Item | Action | Timeline |
|------|--------|----------|
| California consent compliance | Consult with CA privacy attorney: validate popup consent flow against Cal. Penal Code §632 and CCPA before any recordings are made | Before first pilot recording |
| NYC LL 144 applicability | Determine if any Phase 1 customers are in NYC; if yes, assess bias audit requirements and timeline | Month 3 |
| Illinois BIPA | Determine if Kova's AI creates any voice profile or speaker identification model; if yes, BIPA compliance required for IL customers | Before Phase 1 launch |
| ServiceTitan API partnership | Begin ST partner approval application process immediately — it takes 2-6 months to get sandbox access | Month 1 |
| Jobber API access | Jobber API is public; begin reviewing GraphQL schema and scoping Tier 1B integration | Month 2 |

### Research Still Needed

| Item | Why It Matters |
|------|---------------|
| Drain Right's Android vs. iOS split among their existing tech team | Validates the platform decision and timeline urgency |
| Deepgram vs. AssemblyAI accuracy on Spanish plumbing vocabulary | Affects transcription provider selection and Spanish scoring confidence |
| What Drain Right's owner considers a "successful pilot" | Phase 1 success gate should be co-defined with the pilot partner |
| Whether Drain Right techs are on company-provided phones or BYOD | Affects battery management requirements and Android urgency |
| Any existing consent or recording policy at Drain Right | They may already inform customers of recording (Apollo Home in the Rilla Reddit threads had a recording disclosure); understanding this shapes the consent UX |
| ServiceTitan Field Pro activation rate among Drain Right | If Drain Right already has Field Pro active, the integration narrative and competitive positioning change |

---

## 6. Research Appendix

Full citations for all data, studies, statistics, and cases referenced in this document.

---

### A. Transcription Accuracy & Field Audio Challenges

| Citation | Key Finding | Source |
|----------|-------------|--------|
| Siro / AssemblyAI case study | Siro experienced "massive quality issues" with a legacy transcription provider — customer complaints piled up causing churn. After switching to AssemblyAI Universal, they achieved a 90% reduction in customer complaints and support tickets. | AssemblyAI published case study, 2024 |
| AssemblyAI Universal-2 research | Best-in-class models achieve 3-8% WER on clean audio; 15-40%+ on noisy real-world audio. Diarization models showed 85.4% reduction in speaker count errors (previous version had significant speaker attribution failures). 13% improvement in diarization accuracy in latest model. | AssemblyAI Technical Documentation, 2024 |
| Deepgram Nova-3 launch | Nova-3 explicitly described as "recommended for audio with background noise, crosstalk and far-field audio" — signaling prior models performed poorly in these conditions. | Deepgram Product Documentation, 2024 |
| Deepgram pricing | Nova-3 pre-recorded: $0.0048/min; with diarization: ~$0.0068/min | Deepgram public pricing page, 2025 |
| AssemblyAI latency | 23 seconds latency for 30-minute audio file in async processing | AssemblyAI Documentation, 2024 |

---

### B. Legal — Consent, Privacy & Recording Law

| Citation | Key Finding | Source |
|----------|-------------|--------|
| Cal. Penal Code §632 | California two-party consent: fine up to $2,500 + 1 year jail; civil: $5,000 or 3x actual damages | California Penal Code |
| Kearney v. Salomon Smith Barney (Cal. 2006) | California Supreme Court: when a company in a one-party state records calls with California residents, California's two-party consent law applies. Resulted in class action liability. | 39 Cal.4th 95 (2006) |
| CCPA / CPRA | Voice recordings are "personal information" requiring notice at or before collection. $2,500/violation unintentional, $7,500/violation intentional. Private right of action for data breaches. | Cal. Civ. Code §1798.100 |
| Illinois BIPA (740 ILCS 14) | Explicitly covers voiceprints. $1,000-$5,000 per occurrence. Each scan = separate violation (Cothron v. White Castle, 2023). | 740 ILCS 14/1 |
| BNSF Railway jury verdict (2023) | $228M verdict for collecting fingerprints of truck drivers without BIPA-compliant consent. Directly analogous to field worker biometric collection. | Roell v. BNSF Railway, N.D. Ill. |
| White Castle BIPA exposure | Faced potential $17B liability (jury verdict on individual scan theory). Settled. | Cothron v. White Castle System, Inc. |
| NYC Local Law 144 | AEDTs require independent bias audit, public disclosure, 10-day advance employee notice. Penalty: $500-$1,500/violation/day. Each unnotified employee = separate violation. | NYC Local Law 2021/144 |
| Katz v. United States (1967) | Established reasonable expectation of privacy framework. Privacy expectations are highest in the home. | 389 U.S. 347 |

---

### C. Technician Adoption & Field Service Technology

| Citation | Key Finding | Source |
|----------|-------------|--------|
| Aberdeen Group mobile tools | Only 30% of field service organizations report "high adoption" of mobile tools in the first year. Average time to >90% daily use: 14 months. | Aberdeen Group Field Service Research, 2021 |
| Gartner gamification prediction | 80% of gamified applications would fail to meet business objectives — largely confirmed by 2014-2016 outcomes. | Gartner Research, 2012 |
| Werbach & Hunter | Gamification works best for intrinsically motivated workers; for others, it feels patronizing or coercive. | "For the Win" (2012), University of Pennsylvania |
| Disney "electronic whip" | Hotel laundry workers dubbed electronic performance leaderboards "the electronic whip." Increased stress, anxiety, and injuries. Some workers intentionally slowed in protest. | Labor academic research, 2013-2015 |
| Amazon driver gamification | Badges and streaks worked short-term; eroded trust and contributed to ~150% annual turnover long-term. | MIT Labor Lab, 2022; multiple media investigations |
| BLS construction industry turnover | 56-65% annual separation rate in construction/trades — among the highest of any US industry sector. | Bureau of Labor Statistics, 2024 |
| BLS plumber wages | Median annual wage: $62,970. Lowest 10%: $40,670. Highest 10%: $105,150. | BLS Occupational Employment Statistics, May 2024 |
| MIT Sloan monitoring reframe | Reframing monitoring as "coaching" improved initial acceptance by ~20%, but the effect diminished after 60 days as workers observed how data was actually used. | MIT Sloan Management Review, 2017 |
| Bernstein Transparency Paradox | Workers who were observed performed worse than those given privacy. Surveillance reduced experimentation. | Harvard Business School, Ethan Bernstein, 2012 |
| Aberdeen time to 90% daily use | Average 14 months to reach >90% consistent daily use of field service mobile apps. | Aberdeen Group, 2021 |

---

### D. Competitive Intelligence — Rilla

| Citation | Key Finding | Source |
|----------|-------------|--------|
| Neighborly as Rilla customer | Ken Midgett (VP of Talent, Neighborly) cited "5,000 virtual ridealongs in 30 days with 130 technicians" — confirming Rilla has active plumbing/drain recordings from Mr. Rooter and Benjamin Franklin Plumbing brands. | Rilla website customer case study, 2025 |
| Rick Copilot | AI that learns a specific manager's coaching style and auto-generates comments the manager would have left. Operational in 2026. | Rilla product announcements, LinkedIn posts by Sebastian Jimenez, 2026 |
| Rilla employee count | ~123 employees confirmed on LinkedIn | LinkedIn, May 2026 |
| Rilla estimated ARR | $20-50M+ estimated based on 1,300+ customer base, employee count, and event spend (Rilla Masters 2026 in Miami with Bruce Buffer and 200-ft LED screen) | Industry estimation from public signals |
| Rilla Masters 2026 | Full-scale customer conference hosted in Miami with Bruce Buffer as announcer. Signals company operating at significant scale. | LinkedIn posts, Rilla website, 2026 |

---

### E. SMB Churn & SaaS Unit Economics

| Citation | Key Finding | Source |
|----------|-------------|--------|
| ServiceTitan S-1 (2024) | NRR: 110%, implied GRR ~88-92%. ~8,000 customers. Approx. $75K+ average ARR per customer. | ServiceTitan S-1 filing, November 2024 |
| Jobber revenue (2024) | $167.5M revenue (17% YoY growth). 100,000 customers. Implied ARPU ~$140/month. | Jobber financial disclosures, 2024 |
| SMB monthly churn benchmarks | VSB (1-5 employees): 5-8%/month. SMB (5-20 employees): 3-5%/month. Mid-market: 1-2%/month. Enterprise: 0.5-1%/month. | ProfitWell industry benchmarks (pre-acquisition), Bessemer State of the Cloud |
| Involuntary churn | 20-40% of all SMB SaaS churn is involuntary (failed payments). SMBs use personal debit cards with higher failure rates. | ProfitWell / Paddle research |
| Month 1-3 cliff | 20-30% of new SMB customers churn in the first 90 days. After Month 3, retention curves flatten significantly. | Multiple SaaStr panel discussions; Gainsight CS benchmarks |
| Daily vs. weekly usage churn | Products used daily churn at 1/3 the rate of products used weekly. | Aberdeen Group; Lincoln Murphy / Sixteen Ventures |
| Annual billing churn reduction | Annual customers churn 20-30% less than monthly customers (even accounting for selection bias). | SaaStr data; ProfitWell research |
| Home services seasonal churn | Elevated churn in November-January. Slow season + year-end budget + holiday cash pressure. | Jobber / HCP industry benchmarks; operator forum discussions |

---

### F. AI "Missed Opportunity" Scoring Accuracy

| Citation | Key Finding | Source |
|----------|-------------|--------|
| Forrester (2022) AI precision | AI-driven opportunity scoring systems typically have 30-50% precision rates — 50-70% of flagged "opportunities" are false positives. | Forrester Research, 2022 |
| Gartner alert fatigue threshold | When AI alert override rates exceed 90-95%, users effectively ignore all alerts. Trust collapse threshold: ~40% perceived false positive rate. | Gartner Research, 2023 |
| Kluger & DeNisi (1996) | Meta-analysis of 607 feedback interventions: 1/3 of feedback interventions decrease performance. Dollar-loss framing ("you cost us $3,000") can cause avoidance behavior. | Kluger & DeNisi, Psychological Bulletin, 1996 |
| Journal of Marketing (2021) | Sales teams given behavioral coaching ("ask discovery questions") outperformed outcome-target teams ("increase revenue 15%") by 22% over 12 months. Behavioral group had lower turnover. | Journal of Marketing, 2021 |
| Gartner vendor ROI credibility | Only 14% of B2B SaaS buyers find vendor-provided ROI metrics "highly credible." | Gartner Buyer Survey, 2022 |
| Nucleus Research inflation | Vendor-claimed ROI figures are on average 3-5x higher than what customers can independently verify. | Nucleus Research, 2020 |

---

### G. Predatory Upselling — Legal & Industry Cases

| Citation | Key Finding | Source |
|----------|-------------|--------|
| Jiffy Lube (2003, 2009, 2013) | KNBC undercover investigations found phantom charges and unnecessary services in 5/9 locations (2003). Follow-up investigations found continued patterns. Multiple state AG investigations. | KNBC Los Angeles investigative reporting, 2003, 2009, 2013 |
| ARS/Rescue Rooter | Multiple state AG complaints about technicians diagnosing expensive problems (cracked heat exchangers, failed compressors) that independent inspections did not confirm. | BBB complaint records; state AG filings |
| Wells Fargo (2016) | Cross-sell metrics created systematic fraud — 3.5 million fake accounts. When workers are scored on "opportunities identified," they manufacture opportunities. | CFPB enforcement action; Senate Banking Committee hearings |
| FTC Act Section 5 | An act or practice is deceptive if: (1) there is a representation or omission likely to mislead consumers acting reasonably, (2) the representation is material. Applies when a recommendation is presented as based on need but is actually revenue-motivated. | FTC Act, 15 U.S.C. §45 |
| FTC AI recommendation guidance (2023) | AI systems that generate recommendations optimizing for conversion rate without regard to consumer interest are flagged as potential Section 5 violations. | FTC Policy Statement on Enforcement Related to AI, 2023 |
| Goodhart's Law | "When a measure becomes a target, it ceases to be a good measure." When techs are scored on offering behavior, they optimize for offering behavior, not customer outcomes. | Charles Goodhart (1975); widely applied in behavioral economics |

---

### H. Self-Proving ROI & SaaS Retention

| Citation | Key Finding | Source |
|----------|-------------|--------|
| ProfitWell ROI report research | Customers receiving monthly value reports showed no statistically significant retention difference unless ROI exceeded 10x subscription cost. | ProfitWell / Paddle research (pre-acquisition) |
| Vendasta proof of performance | "Proof of performance" reports accelerated churn when reported value dipped below 3x subscription cost — customers used the vendor's report as cancellation justification. | Vendasta company blog post (published, later removed) |
| SaaStr Annual 2023 CS panel | ~15-20% of churning SMB customers cite the vendor's own value metrics as justification for leaving. | SaaStr Annual 2023, CS leadership panel |
| Revenue.io pivot | Explicitly pivoted away from ROI-based selling after finding that customers sold on ROI numbers churned at higher rates than those sold on workflow improvement. | Revenue.io founder interviews, 2022 |
| Brainshark coaching novelty | Any new recording/monitoring tool produces temporary performance boost from increased management attention and rep awareness of being observed. | Brainshark sales enablement research, 2021 |
| Journal of Applied Psychology (2019) | Performance monitoring tools show 23% improvement in the first 30 days that decays to ~8% by Day 180. | Journal of Applied Psychology, 2019 |

---

### I. Mobile Platform Demographics

| Citation | Key Finding | Source |
|----------|-------------|--------|
| US mobile OS market share (2025) | iOS: ~57%, Android: ~43% overall US | StatCounter / Statista, 2025 |
| CIRP income-platform correlation | iPhone owners skew toward $75K+ households; Android skews toward $30K-$75K — the exact plumber wage band. | Consumer Intelligence Research Partners (CIRP), annual reports |
| Pew Research (2021) income/platform | Adults earning <$30K: ~60-65% Android. Adults earning $75K+: ~65-70% iOS. | Pew Research Center, 2021 |
| BLS Hispanic workers in construction | 30%+ of construction trades workers are Hispanic. | Bureau of Labor Statistics, 2024 |
| Rugged phone market | 95%+ Android (CAT, Samsung XCover, Kyocera DuraForce). Specifically marketed to construction and field workers. | IDC rugged device market research |
| ServiceM8 US expansion | iOS-only Australian FSM app faced significant US adoption barriers — lack of Android support repeatedly cited in field service forums. | Field service community forums; ServiceM8 support discussions |
| Jobber app store review volumes | Google Play reviews outnumber App Store reviews for Jobber, suggesting Android-heavy trades user base. | App store public review counts, 2025 |

---

### J. Employment Law & AI Bias

| Citation | Key Finding | Source |
|----------|-------------|--------|
| EEOC guidance (May 2022) | Employers are liable for discriminatory AI outcomes even when using third-party vendor tools. 80% (4/5ths) rule from Uniform Guidelines applies to AI-generated scores used for employment decisions. | EEOC, "The ADA and the Use of Software, Algorithms, and Artificial Intelligence," May 2022 |
| EEOC guidance (May 2023) | Standard adverse impact analysis applies to AI selection procedures. Validation (criterion, content, or construct) is required for selection procedures including AI scoring. | EEOC, "Select Issues: Assessing Adverse Impact," May 2023 |
| Houston Federation of Teachers v. Houston ISD (2017) | Teachers fired based on opaque "value-added" algorithmic scores (EVAAS system) successfully challenged on due process grounds — they could not contest what they could not understand. $237K+ settlement. | Houston ISD litigation records, 2017 |
| NLP linguistic bias research | NLP models systematically score African American English (AAE), non-native English, and accented speech differently from standard American English. | Blodgett et al., ACL 2020; Sap et al., ACL 2019 |
| Title VII disparate impact | Facially neutral AI that causes disparate impact by national origin is unlawful unless employer demonstrates business necessity with no less discriminatory alternative. | Griggs v. Duke Power Co., 401 U.S. 424 (1971) |
| NYC Local Law 144 | Effective July 5, 2023. AEDT = any computational process deriving from ML/AI that issues score, classification, or recommendation substantially assisting employment decisions. Requires bias audit, public disclosure, 10-day advance notice. $500-$1,500/violation/day. | NYC Local Law 2021/144, Admin. Code §20-871 |

---

*Document prepared: May 2026*
*Status: Living document — update with each major product revision*
*Companion to: `docs/product/product-plan-v3.md`*
*Next scheduled review: Prior to Phase 2 kickoff*
