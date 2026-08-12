# LLM Council — WATTLINE pitch pressure-test

**Mode:** HACKATHON · **Date:** 2026-08-12 ~7:30 PM EDT · ~30 min to the 8:00 PM Devpost deadline

## Original question
Pressure-test WATTLINE for Hack RenderATL. Is this a winning pitch for Best Use of Atlanta Open Data? Where is it weakest under a skeptical judge, and what is the single highest-leverage thing to do in the final hour, given the video is the only hard blocker?

## Framed question
WATTLINE disaggregates federal HHS emPOWER ZIP-level electricity-dependent-Medicare counts onto 25 Atlanta NPU boundaries (dasymetric, weighted by housing units × 65+ × disability, conserving against the 92,233 GA state anchor with a containment band for suppressed cells). Computes an "exposure gap" = utility ETA − manufacturer minimum device runtime (a subtraction, explicitly NOT a death prediction). Assigns MARTA-reachable charging sites (83 reachable / 7 deserts). Live React+MapLibre 3D dashboard + new judge-facing landing page + FastAPI on Render. Devpost 3/5; only blocker is the public demo video URL. Evidence: GA PSC Docket 44280 ($912M) never says medical/ventilator/oxygen/vulnerable; a state agency confirmed no protocol exists; Georgia Tech CIDI confirmed no one commits to hard runtime numbers.

---

## Round 1 — the 5 Pitch Pillars

### Pillar 1 — Real Problem, Specific People
Verdict: WATTLINE has no human in it — it has a census. Hero ("some people are on a clock. Nobody is counting") — "some people" is the failure. The drain clock animates "an oxygen concentrator," not a named person. The build plan rationalizes ZIP-privacy as "a feature," which defends the DATA not the PITCH. Fix (one edit): rewrite the 0:05 video beat + hero sub to a specific composite person — "Dorothy, 71, in Peoplestown, called Georgia Power after Helene and was told 'three days.' Her concentrator holds 54 minutes." Flagged illustrative, grounded in real numbers. 92,233 is the evidence; Dorothy is the reason.

### Pillar 2 — Structural Gap
Verdict: genuinely structural, but the flagship "zero mentions in Docket 44280" proof is puncturable — a utility-lawyer judge says "$912M cost-recovery is the wrong venue." The real weapon is FINDINGS: GA Power tracks 115,000 income-qualified customers monthly and measures outages by 78.5% positive social sentiment — capability exists, incentive points elsewhere. The concession (utility order is correct, "buildings not crews") is a STRENGTH. Fix: pair the zero-count with 115,000 as one beat — "the same filing that recovers $912M, and the same utility that identifies 115,000 vulnerable customers monthly, commits zero to the electricity-dependent."

### Pillar 3 — Statistics That Land
Verdict: strongest gut-punch already exists in the DrainClock (0.9h battery vs 9h ETA). But "8.1 hours unprotected — the exposure gap" is a policy noun-stack; humanize it. $450 meter-box vs $0 ventilator is the sharpest weapon. Rank for opening 30s: (1) 0.9h vs 9h; (2) $450 vs $0; (3) 92,233 + "they can and do die." Cut from opening: 78.5%, 115,000, 2,513, 7 deserts. Fix: one string change on the gap line.

### Pillar 4 — Technology as Inevitable Answer
Verdict: the 3D scrub (towers rise/fall live via feature-state height) is the one thing a screenshot can't fake — keep the F4 panel open so the gap drains in lockstep. BUT the disaggregation (the actual track claim) is STATED, not SHOWN, and the repo proves the first version WAS invented (trig-of-area, hardcoded "92233 OK"), caught 4h ago. Single on-screen proof: show conservation arithmetic LIVE — run the pipeline, camera catches "state anchor 92,233 in band [91,897, 92,567] OK," cut to the F4 panel's ZIP→tract→NPU derivation. Final-hour: film the "18 tests green" pytest as 3s of B-roll → "audited pipeline," not "pretty choropleth."

### Pillar 5 — Business / Impact Numbers
Verdict: has per-incident harm (1,647 Richmond vs 9-day outage) and named orgs, but they're not joined into a deployment motion — "map without a Monday." Missing a NAMED budget-holder; "public health outreach" names no office; the GA Council is a witness, not an adopter. Converting sentence for the close: "Before landfall, a county emergency-management office opens WATTLINE, sees the three highest-gap NPUs, and stages a generator-backed charging site at each — the exact decision no dataset lets them make today." Final hour: add that one sentence to the 1:45 narration; don't touch code.

Anonymization map: A=Pillar 3 · B=Pillar 5 · C=Pillar 1 · D=Pillar 4 · E=Pillar 2

## Round 2 — peer review

- **Hackathon judge:** Strongest C; devil's-advocate D; blind spot A (never asks whether numbers are believed); all missed the video-URL blocker.
- **DevRel engineer:** Strongest D; devil's-advocate E; blind spot C (fabricated persona taints the real 92,233); all missed execution risk / on-camera failure of a live pipeline run.
- **Domain expert:** Strongest D; devil's-advocate B; blind spot A's "$0 ventilator program" (likely false — Medicare cost-share exists) + "they can and do die" crosses WATTLINE's own subtraction-not-prediction line; all missed that humanized rewrites risk implying a death prediction the model disclaims.
- **Hackathon mentor:** Strongest D; devil's-advocate C; blind spot E (picks a "wrong venue" fight it can lose); all missed costing fixes against actually shipping the render — lock script, record once, reserve 15 min to confirm the public URL plays in incognito.
- **Past winner:** Strongest D; devil's-advocate C; blind spot A (spends the scarce hour re-ranking and cutting falsifiable evidence for punch); all missed verifying submission mechanics — rendered, uploaded, public, URL live and pasted into Devpost.

Tally — Strongest: **D ×4**, C ×1. Devil's advocate: C ×2, D/E/B ×1 each. Unanimous "all missed": **de-risking the actual video-URL deliverable.**

---

## Chairman synthesis

### Where the council agrees
1. **The disaggregation must be SHOWN, not stated** (4/5 strongest picks). It is the Best-Use-of-Open-Data track claim, and the repo's own history (a synthetic first version, caught 4h ago) means a skeptical judge is right to demand proof. The live conservation print + ZIP→tract→NPU panel + green pytest is the fix.
2. **The video is the only hard blocker, and nobody in Round 1 protected it** (5/5 reviewers). Every content fix assumes a render that doesn't exist yet. Script must be locked, recorded once, and the last ~15 min reserved to confirm the public URL plays in an incognito window and is pasted into Devpost.
3. **The concession (utility order is correct → different resource pool) is a strength**, not a liability — it narrows the claim to something undeniable.

### Where the council clashes
- **Emotion vs. correctness for the opening.** Pillar 1/3 (persona + gut-punch stats) vs Pillar 4 (audited-pipeline proof). Both can't own the opening 30s. Resolution: the tech proof is a mid-video B-roll insert, not the hook; the hook is human + the drain clock.
- **Whether to invent "Dorothy."** Pillar 1 (memorable, one-line edit) vs Domain-expert + DevRel (a fabricated person in a data-integrity project invites "what else is composite?" and risks the death-prediction line WATTLINE explicitly disclaims). This is the sharpest disagreement.

### Blind spots peer review caught
- The **"$0 ventilator program"** framing is likely factually false (Medicare cost-share for DME/oxygen/batteries exists) — an easy puncture. Keep the $450 meter-box contrast but state the asymmetry truthfully ("there is no equivalent program to get a powered household to a charging site," not "$0").
- **"They can and do die"** is a real quote from the state agency — attributable and defensible — but WATTLINE narrating it in its own voice crosses its own subtraction-not-prediction framing. Keep it as an attributed quote, never as the tool's claim.
- Any humanized rewrite needs an on-screen **"illustrative composite"** label to survive scrutiny.

### Steelman of the strongest minority view
The least-supported-yet-decision-changing view is **Pillar 1 (persona)**, backed only as a devil's-advocate pick. Steelman: judges have watched 200 pitches; they will not remember 92,233 by the parking lot, but they will remember one 71-year-old with a 54-minute battery. Emotional recall is what gets a project quoted in deliberation, and it's a zero-code-risk one-line narration edit. **Partial absorb:** use a *real, attributed* human — the state agency's own words ("Georgians who depend on ventilators can and do die") plus the real Helene/Augusta 9-days fact — rather than a fabricated "Dorothy." That captures the recall benefit without the fabrication risk the domain expert flagged.

### Confidence call
**HIGH** that the single highest-leverage move is de-risking the video mechanics, not any content edit. Flips to MEDIUM only if the video is already rendered, public, and URL-verified — in which case the top move becomes adding the live-conservation B-roll (Pillar 4).

### The recommendation
WATTLINE **is** a strong contender for Best Use of Atlanta Open Data — the disaggregation is real and conserves, the demo is live and hard-to-fake, the narrative is unusually well-sourced. Its weakest point under a skeptical judge is **the unproven-on-camera disaggregation** given the repo's fake-first-version history. But with <60 min and the video as the only disqualifying gap, content perfection is worthless if the link is dead. So: **lock a script that (a) opens on the real human/Helene fact + the drain clock, (b) includes a 3-second live-conservation + green-pytest B-roll to prove the numbers, (c) closes on the named-adopter sentence — record ONCE, then spend the final 15 minutes verifying the public URL resolves in incognito and is pasted into Devpost.** Do not touch code.

### The one thing to do first
Reserve the last 15 minutes before 8:00 PM to confirm the demo video is **rendered, uploaded PUBLIC, and its URL loads in a fresh incognito window and is saved in the Devpost submission** — the single mechanic that turns a finished project into a submitted one.
