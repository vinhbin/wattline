# WATTLINE — Plan & Coordination

> Living working doc. Updated on every status change and pushed to `main`.
> Authoritative for task ownership, status, decisions, and contracts.

**What / deadline:** Outage exposure map for Atlanta — **Devpost deadline Aug 12, 2026 @ 8:00 PM EDT (hard)**
**Repo:** https://github.com/vinhbin/wattline
**Team:** Vinh (frontend + design) · Niko (emPOWER + disaggregation) · Guttu (API + deploy + submission) · Kareem (Atlanta layers + exposure + sites + video)
**Goal:** Win **Best Use of Atlanta Open Data** with a working, beautiful, narrow demo — map + draining clocks + disaggregation that conserves against 92,233.

---

## Sources of truth (priority order)

When two artifacts disagree, the higher one wins. Fix the LOWER artifact to match.

1. `CLAUDE.md` — hard correctness rules + verified numbers
2. `WATTLINE-BUILD-PLAN.md` — full build spec (§3 API shapes, §13 README template)
3. **This file (`PLAN.md`)** — ownership, status, decisions, contracts
4. Devpost rules page — submission requirements (mirrored in checklist below)
5. `docs/decision-log.md` — locked decisions with rationale
6. `README.md` — public front door (do not mirror this plan into it)

---

## Status snapshot (APPEND a new dated block on top; never overwrite)

### 2026-08-12 ~4:40 PM — Prerequisites: all data + seams in repo, everyone unblocked

- Done: **emPOWER GA pulled from HHS REST and verified — all 6 anchor checks
  pass exactly** (92,233 state; 711 ZIPs; Richmond 1,647/39,254; ZIP sum
  92,567; 67 suppressed cells). `scripts/fetch_empower.py` reproduces it.
- Done: **NPU boundaries** (`data/npu_boundaries.geojson`) — official DPCD
  layer, 25 NPUs (A–Z, no U), EPSG:4326. ⚠️ Gotchas: the NPU letter is in the
  `NAME` property (the `NPU` field is null on every feature), and geometries
  mix Polygon + MultiPolygon — handle both.
- Done: **API stub** (`api/main.py`) — all four endpoints serve the frozen
  contract from `mocks/` (or `data/processed/` once real data lands, same
  shapes). Smoke-tested: 4/4 endpoints OK, hour validation 422s.
- Done: **MARTA GTFS** — `scripts/fetch_gtfs.py` pulls 7,057 stops into
  `data/gtfs/` (gitignored, each person runs it locally, ~30s).
- ⚠️ **Census API now requires a key** (302s to missing_key.html — keyless
  access is gone). `scripts/fetch_acs.py` works with a free instant key in
  `CENSUS_API_KEY`; ARC open-data tract demographics being pulled as the
  keyless (and more on-track) alternative.
- In progress: facilities (libraries/fire/rec) + ARC tract demographics
  downloads.
- Next milestone: build phases start — everyone can work fully in parallel.

### 2026-08-12 ~4:00 PM — Pre-build scaffolding done, ~4h to deadline

- Done: repo restructured to contract layout (`mocks/`, `data/`, `scripts/`);
  `make_mocks.py` determinism bug fixed (salted `hash()` → `zlib.crc32`, D-010);
  mocks regenerate byte-identical; README.md drafted judge-ready with three
  submission TODOs (live URL, video URL, screenshot); PLAN + decision log created.
- In progress: nothing — build phases not started.
- Blocked: nothing. ⚠️ Devpost page still shows a "Register" to-do — **complete
  registration NOW**, it is a DQ condition.
- Next milestone: Phase 1 unblock by 4:40 PM (map on screen, API serving mocks).

---

## Status dashboard

Legend: ✅ done · 🟡 in progress · ⬜ not started · ⛔ blocked · ✂️ cut
**Bold owner = currently active.**

### Phase 0 — Scaffolding (done, ~4:00 PM)

| # | Component | File(s) | Owner | Status | Notes |
|---|-----------|---------|-------|--------|-------|
| 0.1 | Mock JSON, all four shapes | `mocks/*.json` | Guttu | ✅ | deterministic, shapes frozen per §3 |
| 0.2 | Device runtime floors | `data/device_runtimes.json` | Kareem | ✅ | verify vs vendor sheets before pitch (Q-005) |
| 0.3 | README (judge-facing draft) | `README.md` | Guttu | ✅ | 3 TODOs left: URL, video, screenshot |
| 0.4 | Plan + decision log | `PLAN.md`, `docs/decision-log.md` | Vinh | ✅ | this file |
| 0.5 | First commit + push (repo public, verified via API) | — | Vinh | ✅ | `071108e`, repo returns 200 unauthenticated |
| 0.6 | emPOWER GA data, 6/6 anchor checks | `data/empower_ga*.json`, `scripts/fetch_empower.py` | Vinh | ✅ | unblocks Niko B1/B3 |
| 0.7 | NPU boundaries (official DPCD, 25 NPUs, 4326) | `data/npu_boundaries.geojson` | Vinh | ✅ | unblocks Kareem D1 + Niko B3 target geography |
| 0.8 | API stub serving frozen contract + smoke test | `api/main.py`, `requirements.txt` | Vinh | ✅ | Guttu can deploy to Render NOW |
| 0.9 | MARTA GTFS fetch script (data gitignored) | `scripts/fetch_gtfs.py` | Vinh | ✅ | run locally: 7,057 stops |
| 0.10 | ARC tract demographics (senior/disability/no-vehicle/housing), 530 tracts Fulton+DeKalb, cross-checked vs ARC's own percent fields | `data/arc_tract_demographics.json`, `scripts/fetch_arc_tracts.py` | Vinh | ✅ | keyless — better track story than Census API; 4 null tracts are zero-pop (airport etc.), zero-weight naturally |
| 0.11 | Facilities: 22 libraries + 37 fire stations + 31 rec centers, official sources | `data/facilities.geojson` | Vinh | ✅ | one library name truncated at source; a couple of branches may be historical — sanity-pass during D2 |

### Phase 1 — Unblock (4:00–4:40 PM)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|-----------|---------|-------|--------|------|-------|
| 1.1 | Vite + MapLibre scaffold, F1 map renders NPUs from mocks | `web/` | **Vinh** | 🟡 5:17 PM | 0.1 | checkpoint: looks like a product |
| 1.2 | B1 emPOWER → PostGIS (reproject 3857→4326, suppression intervals) | `pipeline/` | **Niko** | ⬜ | — | rules D-001..D-005 |
| 1.3 | FastAPI serving the four endpoints straight from `mocks/` | `api/` | **Guttu** | ⬜ | 0.1 | CORS open, read-only |
| 1.4 | **Verify PostGIS on Render vs Tiger Data** (15 min, then decide) | — | **Guttu** | ⬜ | — | Q-004; if missing → Render Postgres, drop Tiger prize |
| 1.5 | D1 Atlanta layers: NPU boundaries, parcels, facilities | `pipeline/` | **Kareem** | ⬜ | — | agree column names with Niko FIRST |
| 1.6 | Complete Devpost registration + create project entry | Devpost | **Guttu** | ⬜ | — | ⚠️ DQ condition |

### Phase 2 — Core build (4:40–5:45 PM)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|-----------|---------|-------|--------|------|-------|
| 2.1 | F2 tier coloring + header stats | `web/` | Vinh | ⬜ | 1.1 | palette in §4 |
| 2.2 | **F3 scrubber + autoplay** (THE demo moment) | `web/` | Vinh | ⬜ | 2.1 | prefetch all 25 hours; must be instant |
| 2.3 | **B3 disaggregation** (THE track winner) | `pipeline/` | Niko | ⬜ | 1.2, 1.5 | conserve vs 92,233; print the check |
| 2.4 | C3 deploy to Render (API + static site) | — | Guttu | ⬜ | 1.3 | live URL = Completion evidence |
| 2.5 | D2 sites + transit reachability (honest heuristic, no RAPTOR) | `pipeline/` | Kareem | ⬜ | 1.5 | `transit_reachable:false` is the demo beat |

### Phase 3 — Integration (5:45–6:30 PM) ← convergence point

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|-----------|---------|-------|--------|------|-------|
| 3.1 | Swap mock → real API; **if real data not ready, ship on mock** | `web/`, `api/` | Guttu + Vinh | ⬜ | 2.3, 2.4 | pre-decided fallback, no debate |
| 3.2 | B3 conservation check printed + committed | `pipeline/` | Niko | ⬜ | 2.3 | `Σ NPU → ZIP → state: 92,233 ✓` |
| 3.3 | F4 NPU detail panel | `web/` | Vinh | ⬜ | 2.2 | "8.1 hours unprotected" |
| 3.4 | D3 exposure series per NPU × hour 0–24 | `pipeline/` | Kareem | ⬜ | 2.3, 2.5 | Helene profile: ETA 9h |

### Phase 4 — Sites + polish (6:30–7:15 PM)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|-----------|---------|-------|--------|------|-------|
| 4.1 | F5 sites layer + dispatch lines | `web/` | Vinh | ⬜ | 3.4 | grey no-transit sites, tooltip |
| 4.2 | **F6 polish — never cut** | `web/` | Vinh | ⬜ | 4.1 | legend, skeletons, fallback-to-mock on API failure |
| 4.3 | C4 Render Workflows DAG (stretch only) | — | Guttu | ⬜ | 3.1 | only if everything green; $250 GC prize |
| 4.4 | Screenshot → `docs/demo.png`, uncomment README line | `docs/` | Kareem | ⬜ | 4.2 | judges scroll on mobile |

### Phase 5 — Submission (7:15–8:00 PM) — no new features

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|-----------|---------|-------|--------|------|-------|
| 5.1 | D4 video: Vinh narrates script (§10), Kareem captures + edits | — | Kareem | ⬜ | 4.2 | ≤2:00; opens "Hey, I'm Vinh, and this is my demo for Hack RenderATL"; multiple takes of the scrub |
| 5.2 | Upload video **PUBLIC** (unlisted ≠ public) | — | Kareem | ⬜ | 5.1 | created today — DQ condition |
| 5.3 | README final: live URL + video URL, delete TODO comment | `README.md` | Guttu | ⬜ | 5.2 | |
| 5.4 | Devpost submit: both tracks, all 4 members, links pasted | Devpost | Guttu | ⬜ | 5.3 | **target 7:45 PM, not 7:59** |

---

## Phase Build Order Notes

- **Unblocker: Phase 1.** Mocks already exist, so all four people start in
  parallel immediately; 1.4 (PostGIS check) gates the Tiger decision and 1.6
  (registration) gates eligibility itself.
- **Critical path: 2.3 disaggregation.** It IS the Atlanta Open Data track.
  Niko touches nothing else. Everything downstream (3.2, 3.4) hangs off it.
- **Convergence point: Phase 3.** First end-to-end run on real data. If it
  slips, the fallback is pre-decided (3.1): demo ships on mocks, no debate.
- **Highest risk: Phase 2** — four unproven things land at once. That is why
  Phase 3 is 45 min of integration, not new features.
- **Submission phase: Phase 5.** Nothing new after 7:15. Vinh polishes while
  Kareem records — the four-person win from §1.

---

## Coordination Protocol

1. Before starting a task: flip your row to 🟡 with a timestamp, commit
   `PLAN.md` ONLY, push. That commit is your lock.
2. After finishing: flip to ✅, commit `PLAN.md` only, push.
3. Blocked: set ⛔ + one-line reason, ping the owner of the dependency.
4. `git pull` before starting anything.
5. Hotfixes skip the protocol; update PLAN.md after.
6. Conventional commits: `feat(web):`, `fix(pipeline):`, `docs(plan):`.
7. **Stale-lock TTL = 30 min** (4-hour build — no long locks).
8. Contract changes: announce in group chat first + `CONTRACT:` commit prefix.
9. Push after every commit — a dead laptop must never cost an hour.

---

## Shared Contracts

> Change only with announcement + `CONTRACT:` prefix.

| Contract | Owner | Consumer | Definition |
|----------|-------|----------|------------|
| Four API shapes (`/api/npus`, `/api/exposure?hour=N`, `/api/sites`, `/api/stats`) | Guttu | Vinh, Niko, Kareem | `mocks/*.json` — frozen per BUILD-PLAN §3 |
| Pipeline column names (parcels, npu, ACS tables) | Kareem | Niko | agree at Phase 1 start, write into this row |
| Device runtime floors + tier mapping | Kareem | Niko, Vinh | `data/device_runtimes.json` |
| Tier thresholds | Guttu | Vinh, Kareem | safe ≤ 0 < warning ≤ 4 < critical (gap hours) |

**Data gotchas (read before touching `data/`):**
- `npu_boundaries.geojson`: NPU letter is in **`NAME`** (the `NPU` field is
  null everywhere); geometries mix Polygon and MultiPolygon.
- `empower_ga_zip.json`: already **EPSG:4326** (converted at ingest via
  `outSR=4326` — satisfies D-001, do NOT reproject again). Suppressed cells
  arrive as literal `11` (D-004).
- Census API requires `CENSUS_API_KEY` since ~2026; ARC layers are keyless.

---

## Scope tiering

**Core (ship-blockers — these MUST ship):**

1. **C1** Disaggregation conserving vs 92,233 (the track)
2. **C2** Map + tier choropleth + scrubber with autoplay
3. **C3** Deployed live URL (Completion evidence)
4. **C4** Polish block F6 (half the rubric is Design + Completion)
5. **C5** Video ≤2:00, public, created today + Devpost submission complete

**Stretch (cut without ceremony if Core slips):**

- **S1** Render Workflows DAG · **S2** Tiger Data time-series ·
  **S3** Bootstrap uncertainty band (→ fixed ±8%) ·
  **S4** Dispatch assignment lines · **S5** Transit reachability (→ straight-line + caveat)

**Cut-triggers (pre-decided, from BUILD-PLAN §8, cut top-down S1→S5):**
behind at the 6:30 PM check → cut S1+S2; behind at 7:00 → S3–S5 in order.
The entire sites layer goes before disaggregation, scrubber, or polish are touched.

Every cut is a dated entry in `docs/decision-log.md`. No silent removal.

---

## Decisions (locked)

> Reference by D-### in commits. Full rationale: `docs/decision-log.md`.

- **D-001:** One CRS — EPSG:4326, set at ingest, never at join.
- **D-002:** Population = `Power_Dependent_Devices_DME` only; never sum device fields.
- **D-003:** Exclude `Power_De_1` (implanted cardiac, internal batteries).
- **D-004:** Suppressed cells stored as intervals `[1,11]`; conservation tests containment.
- **D-005:** Conserve against state anchor 92,233, not county totals.
- **D-006:** Precompute everything; API is read-only.
- **D-007:** Every pipeline stage writes its own table (partial failure still demos).
- **D-008:** MapLibre GL (no Mapbox token) · no Redux · one screen · exposure-gap framing, never prediction naming.
- **D-009 (2026-08-12):** Repo layout `mocks/` + `data/` + `scripts/`; mocks are the frozen contract.
- **D-010 (2026-08-12):** `make_mocks.py` uses `zlib.crc32`, not salted `hash()` — mocks must be reproducible.

---

## Open Questions

- [ ] **Q-001 — Live URL:** paste into README after 2.4. **Owner: Guttu.**
- [ ] **Q-002 — Video URL (public):** paste after 5.2. **Owner: Kareem.**
- [ ] **Q-003 — Screenshot `docs/demo.png`:** capture after polish. **Owner: Kareem.**
- [ ] **Q-004 — PostGIS on Render vs Tiger Data:** verify in first 15 min; decides S2. **Owner: Guttu.**
- [ ] **Q-005 — Runtime floors verified against vendor spec sheets** (SimplyGo, Trilogy Evo, RPS II, CADD-Solis) before the pitch. **Owner: Kareem.**
- [ ] **Q-006 — Real `metro_atlanta_total`:** mock says 1,778 (sum of 12 fake NPUs); plan example said 18,400. Real number comes out of B3. **Owner: Niko.**
- [ ] **Q-007 — Devpost registration status:** page shows an open "Register" to-do. Confirm ALL members registered + added (max 4, we are at cap). **Owner: Guttu.**

---

## Pre-submit checklist (from the ACTUAL Devpost rules — all must pass)

1. [ ] All registration steps completed on Devpost (⚠️ open to-do on the page)
2. [ ] Public GitHub repo — **stays public post-event or winners get reselected**
3. [ ] Demo video ≤ 2 minutes, **created today (Aug 12)**
4. [ ] Video opens by naming the hackathon: "…this is my demo for Hack RenderATL"
5. [ ] Video uploaded **public** (YouTube unlisted does NOT count) — stays public post-event
6. [ ] No prior work in the submission; not submitted to any other hackathon
7. [ ] Max 4 members — all 4 added on Devpost
8. [ ] Both tracks selected if selection offered (Atlanta Open Data + Hack for Good)
9. [ ] Live URL in README, video URL in README + Devpost
10. [ ] Data sources credited (HHS emPOWER, ARC, City of Atlanta DPCD, MARTA, Census ACS)
11. [ ] Submitted by **7:45 PM EDT** — 15 min buffer, deadline 8:00 PM sharp

**Rule corrections vs BUILD-PLAN:** Best Hack for Good = **1 winner** (not 3).
Tiger Data appears as **two** separate prizes. Render Workflows credits:
https://credits-portal-mmdm.onrender.com/claim/renderatlhackathon

---

_Last updated: 2026-08-12 ~4:00 PM EDT by Vinh (via Claude)._
