# WATTLINE — emPOWER ingest + disaggregation — design

**Owner:** Niko (emPOWER + disaggregation) · **Date:** 2026-08-12 · **Status:** proposed, pending team confirm

> This is Niko's part only (BUILD-PLAN §5, tasks **B1** and **B3**). Kareem owns
> exposure series (D3) and sites (D2); Guttu owns the API + deploy. This spec is
> the plan to confirm with the team before implementation.

---

## Context — why this exists

emPOWER publishes counts of electricity-dependent Medicare beneficiaries at **ZIP
level**. A ZIP can span a senior tower and a golf course, so a raw ZIP choropleth
is a "smear." The **disaggregation onto Atlanta neighborhoods (NPUs), weighted by
housing and tract-level age/disability rates, is the Best Use of Atlanta Open Data
track** — it is the one thing we never cut.

This part does two jobs:
1. **B1 — ingest:** normalize the raw emPOWER ZIP dump into a clean, correctness-
   checked table (suppression intervals, excluded cardiac devices, canonical
   device names, one CRS).
2. **B3 — disaggregation:** distribute each ZIP's count onto NPUs via census
   tracts, conserving the published totals, and publish the `/api/npus` payload.

Intended outcome: a `npu_estimates` table + `data/processed/npus.json` that the
frozen API contract (§3) serves, and a printed conservation check tying the
output back to the **92,233** state anchor.

---

## Decisions locked (with rationale)

| # | Decision | Rationale |
|---|----------|-----------|
| **A** | **Disaggregate ZIP → census tract → NPU** (dasymetric), weighted by `housing_units · senior_rate · disability_rate`. | Only geometry in-repo is ZIP + NPU. Tract *attributes* exist (`arc_tract_demographics.json`) but no parcels and no tract *geometry*. Tract-level demographic weighting is the achievable version of the track story. |
| **B** | **Fetch TIGER 2020 tract geometry** for Fulton (13121) + DeKalb (13089), join by `GEOID`. | Closes the missing-geometry blocker without needing parcels/building footprints (both out of scope for the clock). |
| **C** | **Postgres + PostGIS is in the loop.** Pipeline loads geometry into PostGIS, computes joins there, writes a table per stage, then publishes. | Not technical necessity — strategy: Tiger Data (managed PostGIS) is a sponsor prize (×2), the Render Workflows DAG (§6 C4, $250) is a DB-backed pipeline, §2 architecture has FastAPI reading Postgres, and D-007 ("every stage writes its own table") means literal tables. geopandas-to-JSON would forfeit those tracks. |
| **D** | **Publish exports contract JSON to `data/processed/`** in addition to leaving the PostGIS tables. | Keeps `api/main.py` (reads files) working and demo-safe regardless of PostGIS-on-Render status (Q-004), while the tables remain for the Tiger/Workflows tracks. |
| **E** | **Uncertainty band = suppression-interval bounds + fixed ±8%**, NOT the ~100× bootstrap. | Pre-agreed cut (BUILD-PLAN §5 fallback, PLAN.md S3). Revisit only if everything else is green. |

---

## Architecture — stage-per-table (D-007)

```
fetch_empower.py (DONE)              fetch_tracts.py (NEW)
  data/empower_ga_zip.json            data/tract_geom_fulton_dekalb.geojson
       │                                   │  join by GEOID to
       │                                   │  data/arc_tract_demographics.json
       ▼                                   ▼
  ┌────────────┐     ┌───────────┐     ┌──────────┐
  │  S1 zips   │     │ S2 tracts │     │  S3 npu  │   all EPSG:4326 at load
  └─────┬──────┘     └─────┬─────┘     └────┬─────┘
        └────────── S4 disaggregate ────────┘
                          │  ZIP ∩ tract (dasymetric weight) → tract → NPU
                          ▼
                   ┌───────────────┐
                   │ npu_estimates │  ← THE track winner
                   └───────┬───────┘
                           ▼
                   S5 publish → data/processed/npus.json + stats.json
                               (PostGIS tables remain for Tiger / Workflows)
```

Every stage writes and commits its own table before the next runs, so a
downstream failure still leaves a queryable, demo-able product.

---

## Stage detail

### S1 — `zips` (B1 normalize)

One row per ZIP from `data/empower_ga_zip.json` (711 features, already EPSG:4326,
geometry **mixed Polygon + MultiPolygon**):

- `zip_code`, `county`, geometry
- `population = Power_Dependent_Devices_DME` **only** (D-002 — never sum device fields)
- `pop_low`, `pop_high`, `is_suppressed`: published `11` → `[1, 11]`, `is_suppressed=true`; value >11 → `low=high=value`; `0` → true zero (D-004)
- `device_mix` (JSONB), 8 canonical keys via the field map below — **binds runtimes only, never summed to population**
- **Excluded:** `Power_De_1` and `Power_Dependent_Card_Dvcs_5yrs` (D-003, implanted cardiac, internal batteries); all `_Any_DME` union fields and the `Vents_..._O2_Conc_` combo field (overlapping unions)
- **CRS guard:** assert every coordinate is within lon/lat range; hard-fail otherwise (catches a silent 3857 leak — D-001)

**Device field → canonical key map** (canonical keys match `data/device_runtimes.json`):

| emPOWER field | canonical key |
|---|---|
| `Ventilators_13mo` | `ventilator` |
| `BiPAPs_13mo` | `bipap` |
| `O2_Concentrators_36mo` | `oxygen_concentrator` |
| `IV_Infusion_Pumps_13mo` | `iv_pump` |
| `Enteral_Feeding_13mo` | `enteral_feeding` |
| `AtHome_Dialysis_3mo` | `home_dialysis` |
| `Power_Wheelchairs_Scooters_13mo` | `power_wheelchair` |
| `Electric_Beds_13mo` | `electric_bed` |

Suppression (11 → [1,11]) applies to **each device field too**, not just population.

### S2 — `tracts`

- `fetch_tracts.py`: pull TIGER 2020 tract polygons for FIPS `13121` + `13089`, EPSG:4326.
- Join by 11-digit `GEOID` to `arc_tract_demographics.json` (`senior_rate`, `disability_rate`, `no_vehicle_rate`, `housing_units`).
- Weight `w = housing_units · senior_rate · disability_rate`. The 2 null / zero-population tracts resolve to `w = 0` naturally (airport etc.).

### S3 — `npu`

- Load `data/npu_boundaries.geojson` (25 NPUs).
- **NPU letter comes from the `NAME` property** (the `NPU` field is null on every feature).
- Handle Polygon **and** MultiPolygon geometries.

### S4 — disaggregation (dasymetric ZIP → tract → NPU)

1. `overlay(zips, tracts)` → ZIP×tract slivers. Sliver weight = tract `w` × (sliver_area / tract_area).
2. `E_sliver = E_zip · sliver_w / Σ(sliver_w in that ZIP)` — **per-ZIP partition is exact by construction.**
   - **Fallback:** if a ZIP's `Σ sliver_w = 0`, distribute by area fraction so no population is dropped.
3. Assign slivers to NPU by intersection; aggregate `E_sliver` → `npu_estimates`:
   `npu_id`, `dme_estimate` (point), `dme_low`, `dme_high`, `device_mix` (rolled up), `no_vehicle_rate` (weighted), `zip_source_count`.

### S5 — publish

- Write `data/processed/npus.json` in the **frozen §3 shape** (GeoJSON FeatureCollection with `dme_estimate/low/high`, `device_mix`, `no_vehicle_rate`, `zip_source_count`).
- Update `metro_atlanta_total` in `data/processed/stats.json` (**Q-006** — a new number = Atlanta-subset sum, not 92,233).
- PostGIS tables stay in place for the Tiger Data / Render Workflows tracks.

---

## Conservation & correctness (write tests FIRST — TDD)

- **Per-ZIP conservation:** `Σ E_sliver == E_zip` (within float tolerance) for every Atlanta ZIP. Exact by construction; the test guards regressions.
- **Anchor containment (D-004 / D-005):** the statewide ZIP-sum suppression band **[91,897, 92,567]** contains **92,233**. Assert **containment, not equality**.
- **Printed check block** (the demo artifact):
  ```
  Σ NPU estimates → ZIP:  conserved per-ZIP ✓ (Atlanta subset)
  state anchor 92,233 ∈ suppression band [91,897, 92,567] ✓
  suppressed ZIP cells: 67
  ```
- **Framing guard (D-008):** exposure-*gap* language only — no `predict_*`, `time_to_failure`, or similar. This is a subtraction, not a clinical prediction.

### Honest-scope caveat (state before asked)

We have NPU geometry for Atlanta only and tract geometry for 2 counties, so we
**cannot** literally reconstruct the statewide total up through NPUs. The provable
claims are (a) per-ZIP partition conservation for Atlanta ZIPs and (b) the
statewide suppression band contains the anchor. `metro_atlanta_total` is a subset
sum, not 92,233.

---

## Scope boundaries

**In:** B1 ingest, tract-geometry fetch, B3 dasymetric disaggregation, publish
`npus.json` + `metro_atlanta_total`, conservation tests.

**Out (owned elsewhere):** exposure series / tiers (Kareem D3), sites + transit
(Kareem D2), API endpoints + deploy (Guttu C2/C3), frontend (Vinh).

**Deferred cuts (pre-agreed):** ~100× bootstrap band (→ ±8%); building-footprint /
parcel resolution (tracts only).

---

## Team coordination points

- **Guttu:** does the deployed API read Postgres live (§2 diagram) or the exported
  `data/processed/*.json` (current `api/main.py`)? This spec publishes JSON either
  way; confirm whether we also point the API at PostGIS for the Tiger story.
- **Kareem:** `npu_estimates.device_mix` (canonical keys) is the input to your
  exposure series — confirm the 8-key shape works for D3's shortest-runtime logic.
- **Q-004 (Guttu):** PostGIS-on-Render still unverified. Publish-to-JSON keeps the
  demo safe regardless; PostGIS availability only affects the Tiger/Workflows tracks.
- **Q-006 (Niko):** real `metro_atlanta_total` comes out of S5 — replaces the mock's 1,778.

---

## Verification

1. `python scripts/fetch_tracts.py` → tract geometry lands, joins to demographics with no unmatched GEOIDs.
2. `python -m pipeline.<...>` runs S1→S5; each stage's table row-count printed.
3. Conservation test suite passes (per-ZIP + anchor containment) — run before claiming done.
4. `uvicorn api.main:app --reload` → `GET /api/npus` returns the real disaggregated
   FeatureCollection (contract §3 shape) and `GET /api/stats` shows the real
   `metro_atlanta_total`.
