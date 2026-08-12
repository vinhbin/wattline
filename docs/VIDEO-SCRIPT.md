# WATTLINE demo video — team script & shot plan

**Hard cap 2:00 · target runtime 1:55 · Devpost rule: must open by naming the hackathon · upload PUBLIC (unlisted = DQ) · created today**

Roles: **Vinh** narrates (recorded once, straight through) · **Kareem** captures + edits · **Niko** and **Guttu** each record ONE line for the Learning beat (phone voice memo is fine; if you can't record in time, Vinh reads your line and names you).

**Source of truth for every number on screen:** `CLAUDE.md` verified numbers + `data/processed/stats.json` + `python scripts/verify_anchor.py` output. If the app shows a different number than this script, the app wins and we re-say the line.

**Two corrections vs the old §10 script (both verified against real data tonight):**
- ~~"eleven NPUs flip red"~~ → **seventeen** neighborhoods critical at hour six (`stats.json`)
- ~~"three grey out"~~ → **seven** sites have no transit access (`/api/health`: 83 reachable / 7 not)

---

## Beat sheet

### Beat 1 · 0:00–0:08 · THE HOOK (landing page drain clock)
**Visual:** Landing page hero, punch in on the battery clock as it drains from 0.9h and the gap line flips red. Real capture, no title card.
**VO (Vinh):**
> "Hey, I'm Vinh, and this is my demo for Hack RenderATL. This clock is a portable oxygen concentrator. On battery, on continuous flow, it holds fifty-four minutes."
**Why it works:** hook in 8 seconds, opens on the required line, and the product is on screen from frame one (Completion + Design).

### Beat 2 · 0:08–0:22 · THE PROBLEM
**Visual:** Stay on landing; slow scroll to the stats strip as 92,233 / 1,647 / 9 count up.
**VO:**
> "Georgia Power tells customers to prepare for three days without electricity. Their entire published guidance for medical equipment is one line: keep your devices charged. After Hurricane Helene, parts of Augusta were dark for nine days. Richmond County alone has one thousand six hundred forty-seven people on electricity-dependent medical equipment."
**On-screen text:** none needed, the stats strip carries it.

### Beat 3 · 0:22–0:38 · THE EVIDENCE (structural gap)
**Visual:** Scroll through the Docket 44280 findings cards, hold on the state-agency quote card for a full 2 seconds.
**VO:**
> "We read Georgia Power's nine hundred twelve million dollar storm cost recovery case. The same utility that already tracks one hundred fifteen thousand income-qualified customers every month never once says the words medical, ventilator, or oxygen. A state agency told us directly: Georgians who depend on this equipment can and do die, and there is no protocol to reach them."
**Honesty note:** the "can and do die" line stays ATTRIBUTED (it is the agency's quote, on screen in their card). We never say it in our own voice.

### Beat 4 · 0:38–1:00 · THE INNOVATION (the track beat — disaggregation)
**Visual A (0:38):** Click "Enter the live map." The 3D map loads, camera pitched, towers flat at hour 0.
**Visual B (0:48):** CUT to a terminal, run `python scripts/verify_anchor.py`, hold the output 3 full seconds:
```
raw emPOWER ZIPs: 711 | published DME sum: 92,567 | suppressed cells: 67
state anchor 92,233 inside the band  [OK]
Atlanta NPU allocation: 2,513 across 25 NPUs (2.7% of the anchor) -> conserves  [OK]
```
**VO:**
> "Federal emPOWER data stops at ZIP codes, and a ZIP can span a senior tower and a golf course. We disaggregate those counts onto Atlanta's official NPU boundaries, census tract by census tract, weighted by housing, age, and disability rates from Atlanta regional open data. And we can prove it: every number on this map sums back to the federal total for Georgia. Nothing is invented."
**Why it works:** this IS Best Use of Atlanta Open Data, and the terminal output makes the core claim falsifiable on camera (Technology). A pretty map can be faked; arithmetic summing to a federal anchor cannot.

### Beat 5 · 1:00–1:25 · THE LIVE CLIMAX (scrub + dispatch)
**Visual:** Back to the live map, F4 detail panel OPEN on a critical NPU. Press Play. The scrub runs hour 0 → 24: towers rise, tiers flip, the panel's gap number drains and then recovers on the restoration arc. Pause at hour 6. Then hit **Dispatch**: lines draw to charging sites, punch in on the seven indigo dots.
**VO:**
> "This is live. Scrub through the outage: every neighborhood is a clock, and the towers rise as batteries fall behind the restoration estimate. At hour six, seventeen neighborhoods are past their shortest device runtime. Hit dispatch: charging sites at libraries, fire stations, and rec centers get assigned to the highest-gap neighborhoods. And seven sites grey out, because no MARTA route reaches them, and a household with no car cannot use a site no bus serves."
**Honesty gate (BLOCKING, before recording):** this is the ONE moment narrated as "live." Verify: live URL loads (hit it 5 minutes early, Render free tier cold-starts ~50s), `/api/health` shows all four payloads `processed`, header at hour 6 reads 17 critical, dispatch draws, scrub is instant.

### Beat 6 · 1:25–1:40 · LEARNING (all four teammates — rubric criterion)
**Visual:** Stay on the map, slow drift; or landing "how it works" cards.
**Lines (one sentence each, first-person, recorded by each teammate):**
- **Niko:** "I learned that suppressed federal data isn't missing data, a published eleven means one-to-eleven, so we test containment, not equality."
- **Guttu:** "I learned to precompute everything, the API only reads, so nothing computes while a judge is watching."
- **Kareem:** "I learned that no one, not even Georgia Tech's assistive tech lab, will commit to a hard battery runtime, so our gap is the optimistic case."
- **Vinh:** "And I learned that the most important pixel on a map can be the one that greys out."
**Fallback:** if any recording is missing by 7:30, Vinh reads it as "Niko learned that..."

### Beat 7 · 1:40–1:55 · THE CLOSE (bookend)
**Visual:** Landing close section: giant 92,233, then "THE MONDAY AFTER" line, end on "WATTLINE is the missing join."
**VO:**
> "Ninety-two thousand two hundred thirty-three Georgians depend on electricity for medical equipment, and there is no protocol to find them. Before landfall, a county emergency management office opens WATTLINE, sees the three highest-gap neighborhoods, and stages a charging site at each. That is the decision no dataset lets them make today. WATTLINE is the missing join."
**Why it works:** pays off the opening clock, lands the named-adopter action (Impact), ends on the product name.

---

## Trim plan (cut in this order if a take runs long)
1. Beat 3: drop the 115,000 sentence (keep zero-words + the quote) — saves ~7s
2. Beat 6: run only Niko + Vinh's learning lines, Vinh names the other two — saves ~8s
3. Beat 5: drop the dispatch-lines sentence, keep the seven-sites grey-out — saves ~6s
**Never cut:** the opening line (DQ), the drain clock, the conservation terminal, the scrub, the 92,233 close.

## Pre-burn verification gates (all BLOCKING, run before export)
- [ ] `python scripts/verify_anchor.py` exits clean (711 / 92,567 / 67 / anchor in band / 2,513 across 25) — matches Beat 4 frame
- [ ] `data/processed/stats.json`: 17 critical at hour 6 — matches Beat 5 VO
- [ ] Live `/api/sites`: 83 reachable / 7 not — matches "seven sites"
- [ ] No frame shows the words "predicts," "death," or "time to failure" (framing rule)

## ONE-TAKE ADAPTATION (StreamYard-style, live narration while driving)

Same beats, same lines, same numbers. What changes is mechanics:

**Stage setup BEFORE hitting record (5 min):**
- [ ] Hit the live URL twice so Render is warm (cold start is ~50s and would eat a third of the take)
- [ ] Browser tab 1: landing page, scrolled to top
- [ ] Browser tab 2: the live map already loaded once (basemap tiles cached), then reloaded and left at hour 0 with the F4 panel practiced (know which NPU you'll click)
- [ ] Terminal window: `python scripts/verify_anchor.py` PRE-TYPED, just press Enter on camera
- [ ] A visible clock/timer next to your monitor — the cap is hard and there is no trim in post
- [ ] Close everything else; notifications off

**Transitions:** Beat 4's cut to the terminal is now an alt-tab: say the disaggregation line while switching, press Enter, read the [OK] lines off the screen, alt-tab back. Practice the alt-tab order once.

**Teammate lines (Beat 6):** best case, Niko / Guttu / Kareem join the StreamYard room muted and unmute for their one sentence in order. One flub means a full retake, so decide BEFORE recording: if anyone is shaky on their line, use the fallback (Vinh reads it as "Niko learned that...") — it costs nothing on the rubric.

**Live checkpoints (replaces the trim plan — glance at the timer):**
- By "Enter the live map" you should be at **≤0:42**. If later: skip the 115,000 sentence in Beat 3.
- By "Hit dispatch" you should be at **≤1:15**. If later: skip the dispatch sentence, point at the seven indigo dots instead.
- By the Learning beat you should be at **≤1:30**. If later: only Niko + Vinh lines.
- The close needs 15 seconds. Protect it.

**Retake rule:** flubbing a word is fine, keep going — judges forgive live imperfection and it reads as authentic. Retake ONLY for: passing 2:00, a dead app, or a wrong number said out loud. Do at most 3 takes, then ship the best one; a shipped 1:58 with a stumble beats a missed deadline.

## Deadline runbook (owner: Kareem, Guttu on submit)
1. Hit the live URL now so Render is warm
2. Record Vinh's VO straight through, then screen-capture at 1080p+ (multiple takes of the scrub, it is the money shot)
3. Collect Niko/Guttu/Kareem voice lines (or invoke the fallback)
4. Cut to ≤1:58, export
5. Upload to YouTube **PUBLIC** — not unlisted
6. Open the URL in an incognito window and watch 10 seconds — if it plays logged-out, it counts
7. Paste the URL into Devpost (5.2) + README, Guttu submits — target 7:45, hard stop 8:00
