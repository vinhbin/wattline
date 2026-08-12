# WATTLINE Decision Log

Every locked decision with rationale + date + scope. Newest first.
Reference entries by `D-###` in commits. Do not re-litigate a logged decision without escalation.

---

## 2026-08-12 ~5:30 PM D-012: D-011 reversed — Workflows back to stretch

**Decision.** Render Workflows returns to stretch S1. The workflow code
(`workflows/main.py`, requirements, render.yaml) stays in the repo.

**Rationale.** User call, fifteen minutes after D-011: with the frontend just
started and ~90 min of build time before code freeze, no one's attention
should be on a sponsor prize until the core demo is safe. The reversal costs
nothing — the code is written, so the stretch goal is "loaded": if Core is
green at the 6:30 PM check, the deploy is ~10 minutes of dashboard clicks.

**Scope.** Priority only. No code removed. Guttu's paste-message becomes a
heads-up, not an action item.

---

## 2026-08-12 ~5:15 PM D-011: Render Workflows promoted stretch → Core *(superseded by D-012)*

**Decision.** We commit to the Best Use of Render Workflows track. The ingest
pipeline ships as a Workflow service (`workflows/main.py`): fetch_empower →
fetch_arc_tracts → fetch_gtfs → verify_conservation, plus a `run_pipeline`
task chaining all four.

**Rationale.** User call. The marginal cost collapsed once the fetch scripts
existed — the DAG is a thin wrapper over them, and the story is honest:
emPOWER refreshes monthly, so a re-runnable fetch-and-verify pipeline is what
this project would genuinely need in production. $250 GC is the largest
sponsor prize.

**Scope.** Deploy is dashboard-only (Blueprints don't support the Workflow
service type yet — verified against Render docs today). Falls back to cut
ONLY if the core map demo itself is at risk; all remaining stretch (Tiger,
bootstrap band, dispatch lines, reachability) cuts first.

**Cross-references.** PLAN.md C6 / row 4.3; Render docs: workflows,
workflows-sdk-python, render-oss/skills.

---

## 2026-08-12 D-010: `make_mocks.py` uses `zlib.crc32`, not `hash()`

**Decision.** The dark/lit NPU assignment in the mock exposure series keys off
`zlib.crc32(nid.encode()) % 5`, not `hash(nid) % 5`.

**Rationale.** Python's built-in `hash()` on strings is salted per process
(PYTHONHASHSEED), so every run of the generator produced a different set of
dark NPUs and different `stats.json` numbers despite `random.seed(7)`. The
frontend is built against these files; the demo numbers must not drift between
regenerations. Verified: two consecutive runs now produce byte-identical output.

**Scope.** Mock generator only. Real exposure series (D3) computes darkness
from the outage profile, not a hash.

---

## 2026-08-12 D-009: Repo layout — `mocks/`, `data/`, `scripts/`

**Decision.** Mock API responses live in `mocks/` (npus, exposure, sites,
stats), runtime floors in `data/device_runtimes.json`, the generator in
`scripts/make_mocks.py`. The four mock files are the **frozen API contract**
until real data lands.

**Rationale.** CLAUDE.md and the script's own docstring both specify this
layout; the files were sitting at repo root, which broke the script's relative
paths and left the contract's home ambiguous. Contract drift is the #1
integration bug with four people building in parallel.

**Scope.** Whole repo. Changing any shape in `mocks/` requires a `CONTRACT:`
commit + announcement.

---

## 2026-08-12 D-001…D-008: Correctness + stack rules (imported from CLAUDE.md)

Locked before the build; recorded here so commits can reference them by ID.
Full rationale lives in `CLAUDE.md` (source of truth #1).

- **D-001** One CRS: EPSG:4326 at ingest, never reproject at join — mismatches corrupt spatial joins *silently*.
- **D-002** Population = `Power_Dependent_Devices_DME` only; device fields bind runtimes, never sum them (one person can hold two devices).
- **D-003** Exclude `Power_De_1` / `Power_Dependent_Card_Dvcs_5yrs` — implanted cardiac devices have internal batteries; they do not fail on grid loss.
- **D-004** Suppressed cells (published `11`) stored as `[1, 11]` intervals; conservation tests containment, not equality.
- **D-005** Conserve against the state anchor **92,233** — ZIPs do not nest in counties (only 109/159 reconcile).
- **D-006** Precompute everything; the API only reads. Nothing computes while a judge watches.
- **D-007** Every pipeline stage writes its own table — a late-stage failure still leaves a demo.
- **D-008** MapLibre GL (no Mapbox token) · no Redux · one screen · **exposure-gap** framing — it is a subtraction, never named as a prediction of clinical failure.

---
