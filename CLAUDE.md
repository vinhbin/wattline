# WATTLINE — project context

Hackathon build, Hack RenderATL, Aug 2026. Team: Vinh (frontend), Niko
(emPOWER + disaggregation), Guttu (API + deploy), Kareem (Atlanta layers +
exposure + sites).

## What this is

Turns federal emPOWER data (counts of Medicare beneficiaries dependent on
electricity for medical equipment) into a neighborhood-level outage exposure
map for Atlanta, plus a charging-site assignment constrained by MARTA transit
reachability.

Primary track: **Best Use of Atlanta Open Data**. The disaggregation onto
Atlanta parcels/NPUs is what wins it — never cut it.

## Stack

Python ingest · Postgres + PostGIS · FastAPI · React + Vite + MapLibre GL ·
Render hosting. No Mapbox (needs a token). No Redux. One screen.

## Hard rules — violating these breaks correctness

1. **One CRS, set at ingest, never at join.** Store EPSG:4326. emPOWER ZIP
   geometry arrives EPSG:3857. A projection mismatch corrupts spatial joins
   *without raising an error*.
2. **Never sum emPOWER device fields.** One person can hold a ventilator AND a
   wheelchair. Population = `Power_Dependent_Devices_DME` only. Device fields
   are used only to bind runtimes.
3. **Never sum the `_Any_DME` fields.** They are overlapping combinations;
   `Any_Healthcare_Srvc_Any_DME` is their union.
4. **Exclude `Power_De_1`** (alias `Power_Dependent_Card_Dvcs_5yrs`) — implanted
   cardiac devices with internal batteries. They do not fail on grid loss.
5. **Suppressed cells:** a published value of `11` means the true value is in
   `[1, 11]`. Store `value_low=1`, `value_high=11`, `is_suppressed=true`.
   Conservation tests containment, not equality.
6. **Conserve against the state anchor 92,233**, not county totals. ZIP codes do
   not nest in counties — only 109 of 159 reconcile.
7. **Precompute everything. The API only reads.** Nothing computes per request.
8. **Every pipeline stage writes its own table**, so a later stage failing still
   leaves a demo-able product.

## Verified numbers

- Georgia total (emPOWER layer 3): **92,233**
- County sum / ZIP sum: 92,567 (suppression inflation, 67 masked ZIPs)
- Richmond County: 39,254 Medicare beneficiaries, **1,647** electricity-dependent
- Georgia ZIPs in emPOWER: 711

## Framing — matters for naming and comments

This computes an **exposure gap** (utility ETA minus published manufacturer
minimum runtime). It is a subtraction, NOT a prediction of clinical failure.
Do not name anything `predict_death`, `time_to_failure`, or similar.

## API contract

`GET /api/npus` · `GET /api/exposure?hour=N` · `GET /api/sites` · `GET /api/stats`
See BUILD-PLAN.md §3 for exact shapes. Mock JSON in `mocks/` is the source of
truth until real data lands.
