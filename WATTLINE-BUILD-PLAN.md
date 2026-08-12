# WATTLINE — Build Plan

**Hack RenderATL · Vinh · Niko · Guttu · Kareem · ~5 hours to a submittable demo**

Primary target: **Best Use of Atlanta Open Data** (1 winner)
Secondary: **Best Hack for Good** (3 winners)

Judged on **Technology · Design · Completion · Learning**. Half that rubric is
"does it work and does it look good." Scope accordingly.

---

## 0. The one rule

**Ship a working, beautiful, narrow thing.** A finished map with draining clocks
beats a half-built optimizer. Every decision below is made in service of having
something demo-able at every checkpoint.

If we are behind, we cut features, never polish.

---

## 1. Roles

| Who | Owns | Deliverable |
|---|---|---|
| **Vinh** | **Frontend + design** | React app, map, clocks, scrubber, polish |
| **Niko** | **emPOWER + disaggregation** | The track-winning transform. Single owner, no dilution. |
| **Guttu** | **API + deploy + submission** | Mock JSON, FastAPI, Render, Devpost checklist |
| **Kareem** | **Atlanta layers + exposure + video** | Parcels/NPU/facilities, exposure series, sites, demo video |

**Two rules that make four people faster than three:**

1. **Guttu's first job is not the API — it is the mock JSON** (§3), inside 15
   minutes. Vinh and Kareem both build against it. Nobody waits for the pipeline.
2. **Frontend stays single-owner.** Two people editing MapLibre code in five
   hours produces merge conflicts, not speed. If Kareem is ahead, they build the
   **NPU detail panel as an isolated component** (§4, F4) against mock props and
   hand Vinh a file — no shared state, no conflicts.

**Video ownership matters.** Kareem records and edits while Vinh keeps polishing.
Vinh writes the script and narrates; Kareem runs the capture. This is the single
biggest win from the fourth person — under this rubric Vinh should be polishing
until the last possible minute, not stopping at T+4:30 to fight with a screen
recorder.

---

## 2. Architecture

```
ArcGIS / ARC / MARTA / ACS
        │  (Niko)
        ▼
   Postgres + PostGIS
   ├── zips              emPOWER ZIP counts + geometry
   ├── parcels           ARC parcels + unit counts
   ├── npu               NPU boundaries
   ├── npu_estimates     ← disaggregation output (THE track winner)
   ├── sites             libraries / fire stations / rec centers
   └── exposure_series   time-series per NPU per outage hour
        │  (Guttu)
        ▼
   FastAPI  (read-only, precomputed)
        │
        ▼
   React + MapLibre GL  (Vinh)
```

**Three rules that prevent silent failure:**

1. **One CRS, set at ingest, never at join.** Store EPSG:4326. emPOWER ZIP
   geometry arrives as EPSG:3857 — reproject on load. A projection mismatch
   corrupts a spatial join *without raising an error*.
2. **Precompute everything. The API only reads.** Nothing computes while a judge
   watches.
3. **Every stage writes its own table.** If dispatch collapses, stages 1–4 still
   render a full demo.

---

## 3. API contract — freeze this first

Guttu writes these as static JSON files in the first 15 minutes. Vinh builds
against them immediately. Niko fills them with real data later. **Nobody waits.**

### `GET /api/npus`
Returns the base map + disaggregated population. This is the Atlanta Open Data
track in one payload.

```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "geometry": { "type": "Polygon", "coordinates": [[[-84.39,33.75], "..."]] },
    "properties": {
      "npu_id": "NPU-M",
      "name": "Downtown",
      "dme_estimate": 214,
      "dme_low": 198,
      "dme_high": 231,
      "device_mix": {
        "ventilator": 12, "oxygen_concentrator": 88, "bipap": 41,
        "iv_pump": 9, "power_wheelchair": 44, "electric_bed": 20
      },
      "no_vehicle_rate": 0.31,
      "zip_source_count": 4
    }
  }]
}
```

### `GET /api/exposure?hour=6`
The clock state at hour N of the outage. `hour` ranges 0–24.

```json
{
  "hour": 6,
  "npus": [{
    "npu_id": "NPU-M",
    "is_dark": true,
    "utility_eta_hours": 9,
    "shortest_runtime_hours": 0.9,
    "exposure_gap_hours": 8.1,
    "tier": "critical",
    "people_at_risk": 214
  }]
}
```

`tier` ∈ `"safe" | "warning" | "critical"`
`safe` gap ≤ 0 · `warning` 0 < gap ≤ 4 · `critical` gap > 4

### `GET /api/sites`
```json
{
  "sites": [{
    "site_id": "lib-001",
    "name": "Central Library",
    "type": "library",
    "lat": 33.7615, "lon": -84.3877,
    "capacity": 120,
    "transit_reachable": true,
    "assigned_npus": ["NPU-M", "NPU-E"],
    "people_served": 186
  }]
}
```

`transit_reachable: false` sites render greyed out — **that is the demo beat.**

### `GET /api/stats`
Header numbers. Hardcode-safe.

```json
{
  "georgia_total": 92233,
  "richmond_county": 1647,
  "metro_atlanta_total": 18400,
  "npus_critical": 11,
  "people_critical": 1932
}
```

---

## 4. Vinh — Frontend spec

### Stack
- Vite + React
- **MapLibre GL JS** (not Mapbox — no token needed)
- Zustand or plain `useState` for state. No Redux.
- Framer Motion **only** for number transitions if time allows

### Layout

```
┌──────────────────────────────────────────────────┐
│  WATTLINE          92,233 in GA · 11 NPUs critical│  header
├────────────┬─────────────────────────────────────┤
│            │                                     │
│  NPU LIST  │            MAP                      │
│  (sorted   │      (choropleth by tier)           │
│   by gap)  │                                     │
│            │                                     │
├────────────┴─────────────────────────────────────┤
│  ◀ ─────────●──────────────────▶   HOUR 6        │  scrubber
└──────────────────────────────────────────────────┘
```

### Build order — each step is demo-able

**F1 · Map on screen (45 min)**
MapLibre with a dark basemap. Load `/api/npus`, render NPU polygons, fill by
`dme_estimate`. Fit bounds to Atlanta. **Checkpoint: it looks like a real product.**

**F2 · Tier coloring + header stats (30 min)**
Load `/api/exposure?hour=0`. Recolor polygons by `tier`. Wire header to
`/api/stats`.

Palette (dark theme, high contrast for projector):
```
background   #0B1416
safe         #1F6F5C
warning      #C77D0A
critical     #B3392A
text         #E8F1F2
accent       #F5B54A
```

**F3 · The scrubber (45 min) — THE demo moment**
Slider 0→24. On change, fetch `/api/exposure?hour=N`, transition fills.
Prefetch all 25 hours on mount into an array — **the scrub must be instant, not
network-bound.** A laggy scrubber loses Design points.

Add a Play button that steps hour by hour at ~600ms. Judges love autoplay.

**F4 · NPU detail panel (30 min)**
Click a polygon → side panel:
- NPU name, `dme_estimate` with `low–high` band
- Exposure gap as a large number: **"8.1 hours unprotected"**
- Device mix as a small horizontal bar
- `no_vehicle_rate` as "31% of households have no car"

**F5 · Sites + dispatch (30 min)**
Load `/api/sites`. Markers on map. `transit_reachable: false` → grey, 40% opacity,
with a tooltip: *"No transit access"*. A "Dispatch" button draws lines from each
site to its `assigned_npus`.

**F6 · Polish (45 min) — do not skip**
- Loading skeletons, not spinners
- Empty state if the API fails: show mock data, never a blank screen
- A legend
- One transition on the tier fill (`fill-color` with a 300ms ease)
- Font: Space Grotesk headings, Inter/system body
- **Test on a projector-brightness screen** — dark themes wash out

### Frontend non-goals
No routing. No auth. No mobile layout. No settings panel. One screen.

---

## 5. Niko — emPOWER + disaggregation spec

> **Your only job is B1 and B3.** Kareem owns Atlanta layers, exposure series, and
> sites. Do not get pulled off the disaggregation — it is the primary track.

### B1 · Load emPOWER (30 min)
Already pulled: `data/empower_ga.json` (county), `data/empower_ga_zip.json`
(711 ZIPs, geometry, per-device fields).

- Reproject ZIP geometry **3857 → 4326**
- Suppressed cells: published value `11` means true value ∈ `[1,11]`. Store as
  `value`, `value_low=1`, `value_high=11`, `is_suppressed=true`
- **Never sum device fields** — one person can hold a ventilator *and* a
  wheelchair. Population comes from `Power_Dependent_Devices_DME`; device fields
  only bind runtimes
- **Exclude `Power_De_1`** (`Power_Dependent_Card_Dvcs_5yrs`) — implanted cardiac
  devices, internal batteries, do not fail on grid loss

### B2 · Atlanta layers — **owned by Kareem**, see §5B
Niko consumes the `parcels`, `npu`, and ACS tables Kareem produces. Agree the
column names at T+0 so B3 can be written before the data lands.

### B3 · Disaggregation (60 min) — **this wins the track**

```python
w_p = units_p * senior_rate(tract_p) * disability_rate(tract_p)
E_p = E_zip * w_p / sum(w_p for p in zip)
# then aggregate parcels → NPU
```

**Assert conservation** against the state anchor **92,233**, not county totals.
ZCTAs do not nest in counties — only 109 of 159 match. Print the check:

```
Σ NPU estimates → ZIP → state:  92,233 ✓
suppressed cells: 67 (bounds 91,897–92,567)
```

Bootstrap tract rates ~100x for `dme_low` / `dme_high`. If short on time, skip
the bootstrap and set band = ±8%.

### B4 · Exposure series — **owned by Kareem**, see §5B

---

## 5B. Kareem — Atlanta layers, exposure, sites, video

### D1 · Atlanta layers (30 min) — **start here, Niko is blocked on this**
From ARC Open Data Hub / City of Atlanta DPCD hub:
- Parcels (with unit counts if available)
- **NPU boundaries** — required, this is the output geography
- Public facilities: libraries, fire stations, rec centers

Fallback if parcels won't download: Microsoft/OSM building footprints + ACS
block-group housing units.

ACS tables: `B01001` (65+), `B18101` (disability), `B08201` (no vehicle).

**Agree column names with Niko at T+0** so they can write the disaggregation
before your data lands.

### D2 · Sites + transit reachability (45 min)
Load facilities into the `sites` table. MARTA GTFS static → stops + routes.

Reachability, hackathon-honest version — **do not build a full RAPTOR router**:
```
walk(parcel → nearest stop) at 4.5 km/h
  + scheduled headway as wait penalty
  + transit leg if any route serves both stops
  + walk(stop → site)
  ≤ T
```
Sites failing this get `transit_reachable: false`. **That flag is the demo beat**
— three sites grey out on stage.

### D3 · Exposure series (45 min)
For each NPU × hour 0–24: `gap = utility_eta − shortest_runtime(device_mix)`.

Runtime floors (manufacturer published minimums — **verify before the pitch**):
```
oxygen_concentrator   0.9 h   (SimplyGo, continuous flow)
ventilator            7.5 h   (Trilogy Evo, per battery)
bipap                 8.0 h
iv_pump              69.0 h   (CADD-Solis)
power_wheelchair      8.0 h
electric_bed          0.0 h   (mains only)
```

Tier by urgency — **do not average across device classes**:
- `critical`: ventilator, bipap, oxygen concentrator, iv pump
- `serious`: enteral feeding, at-home dialysis (schedule failure, not battery)
- `mobility`: power wheelchair, electric bed

Use a **real Helene outage profile** for the demo: ETA 9h, actual restoration
much longer.

---

### D4 · Demo video (45 min, from T+4:00)
Vinh writes the script (§10) and narrates. **You run the capture and edit.**
- Screen record at 1080p minimum
- Multiple takes of the scrub — it is the money shot
- Cut to ≤ 2:00, hard limit
- Export, upload **public** (unlisted does not count), paste the link to Guttu

## 6. Guttu — API + deploy spec

### C1 · Mock JSON (15 min) — **do this first, everything unblocks**
Four static files matching §3 exactly. Real NPU geometry if you can grab it fast,
otherwise hand-drawn rough polygons. 10–15 NPUs is enough.

### C2 · FastAPI (45 min)
Four endpoints. Read-only. CORS open. Serve from precomputed tables — no
computation per request.

### C3 · Deploy on Render (30 min)
- Web service (FastAPI) + static site (React build)
- **Live URL is evidence of Completion.** Judges should not see localhost.
- Render Postgres with PostGIS, *or* Tiger Data if PostGIS is available there
  — **verify PostGIS in the first 15 min**; if missing, use Render Postgres and
  drop the Tiger prize

### C4 · Render Workflows (30 min, stretch)
Wrap the ingest as a DAG: fetch → normalize → disaggregate → exposure → publish.
Honest fit — this genuinely re-runs monthly when emPOWER updates.
**$250 gift card, the highest-value sponsor prize.** Only after core ships.

---

## 7. Timeline

| Time | Vinh | Niko | Guttu | Kareem |
|---|---|---|---|---|
| **T+0:00** | Scaffold Vite + MapLibre | B1 emPOWER → PostGIS | **Mock JSON** | D1 Atlanta layers |
| **T+0:30** | F1 map rendering | B1 cont. / write B3 | C2 FastAPI | D1 cont. + agree schema |
| **T+1:15** | F2 tiers + header | **B3 disaggregation** | C3 deploy | D2 sites + reachability |
| **T+2:00** | **F3 scrubber** | B3 conservation check | Wire real data | D2 cont. |
| **T+2:45** | F4 detail panel | Hand off to Guttu | Verify endpoints | **D3 exposure series** |
| **T+3:15** | F5 sites + dispatch | Support frontend | C4 Workflows | D3 cont. |
| **T+3:45** | **F6 polish** | README + data credits | Final deploy check | Set up capture |
| **T+4:00** | **F6 polish (continues)** | Support | Submission checklist | **D4 record video** |
| **T+4:40** | Freeze, hand over | | Paste video + URL | Export, upload public |
| **T+5:00** | **Submit** | | | |

**Integration checkpoint at T+2:00.** Swap mock → real API. If real data isn't
ready, **ship on mock and keep going** — a working demo on partial data beats a
broken one on real data.

**The four-person win:** Vinh polishes to T+4:40 instead of stopping at T+4:30 to
record. Kareem captures in parallel. Protect this — it is worth more than any
feature either of them could add in that window.

---

## 8. Cut order

Cut from the bottom when behind:

1. Render Workflows / Tiger Data
2. Bootstrap uncertainty band → fixed ±8%
3. Dispatch assignment → sites shown, no assignment lines
4. Transit reachability → straight-line distance, caveat stated
5. **The entire sites layer**

**Never cut:** the disaggregation, the scrubber, or the polish block.
Disaggregation *is* the Atlanta Open Data track. Polish is half the rubric.

---

## 9. Submission checklist

- [ ] Public GitHub repo — **stays public after the event**
- [ ] Demo video **≤ 2 minutes**, recorded today
- [ ] Video opens: *"Hey, I'm Vinh, and this is my demo for Hack RenderATL"*
- [ ] Video is public (YouTube unlisted is not public — use public)
- [ ] Devpost submission with both tracks selected if selection is offered
- [ ] Live URL in the README
- [ ] All 4 team members added on Devpost (max 4 — we are at the cap)
- [ ] Data sources credited: HHS emPOWER, ARC / City of Atlanta, MARTA, Census ACS

---

## 10. Video script (2:00)

| Time | Beat |
|---|---|
| **0:00** | "Hey, I'm Vinh, and this is my demo for Hack RenderATL." |
| **0:05** | Georgia Power tells you to prepare for **three days** without power. Their entire guidance for medical equipment is one line: *keep your devices charged.* A portable oxygen concentrator on continuous flow runs **under an hour**. |
| **0:25** | Richmond County: **1,647 people** on electricity-dependent medical equipment. After Helene, parts of Augusta were dark for **nine days**. |
| **0:40** | *Screen:* the federal map — one flat ZIP-shaped blob. Then it resolves onto **real Atlanta parcels and NPU boundaries**. Three senior housing towers appear where there was a smear. |
| **1:00** | *Scrub the timeline.* Clocks drain. Eleven NPUs flip red. Hit dispatch — sites light up, and **three grey out because no bus reaches them.** |
| **1:25** | Built on HHS emPOWER, Atlanta parcels and NPU boundaries, MARTA GTFS, and published manufacturer runtimes. *Name one thing each of us learned — Learning is a judging criterion.* |
| **1:45** | 92,233 Georgians depend on electricity for medical equipment. A state agency confirmed there is **no protocol** to identify them, reach them, or get them to power. **WATTLINE is the missing join.** |

---

## 11. If someone asks: "shouldn't the utility just restore them first?"

**Concede it — their order is correct.** A crew on a feeder restores 3,000
customers; the same crew on a lateral restores one house. Individual-priority
restoration also creates verification burden and skews toward people with the
resources to enroll.

**WATTLINE uses a different resource pool entirely.** Charging sites, not crews.
Public health outreach, not the utility. The failure isn't that the grid is
restored in the wrong order — it's that **nothing exists** to cover the window
that correct order leaves open.

---

## 12. Known limitations — state these before you're asked

- emPOWER is **Medicare-only**: excludes private insurance, Medicaid-only,
  military, and long-term care. Undercounts under-65 disabled people.
- Lookback windows are 13 months (most DME), 36 months (oxygen), 5 years
  (implanted cardiac) — this is "filed a claim," not "currently uses."
- The disaggregation output is a **scenario-based neighborhood priority
  surface**, not a claim about where specific individuals live.
- ZIP resolution is a **privacy feature** as much as a limitation.

---

## 13. Repo name & README

### Repo name

**`wattline`** — short, no hyphens, memorable, matches the product. If taken,
use **`wattline-atl`**. Do not use `hack-renderatl-project` or anything with
"hackathon" in it; the repo outlives the event.

Set the GitHub **description** to:
> Turning federal medical-equipment data into a live outage exposure map for Atlanta neighborhoods.

Add topics: `civic-tech` `geospatial` `postgis` `public-health` `atlanta` `open-data`

### README — judges will open this

Guttu owns it. Write it at T+3:45 while the build finishes. It is part of the
**Completion** impression — a bare README reads as unfinished even if the app works.

```markdown
# WATTLINE

**When the power goes out, some people are on a clock. Nobody is counting.**

[Live demo](URL) · [2-minute video](URL) · Built at Hack RenderATL, August 2026

![screenshot](docs/demo.png)

## The problem

A portable oxygen concentrator runs under an hour on battery. Georgia Power
tells customers to prepare for three days without electricity, and their entire
published guidance for medical equipment is one line: "Keep your phones and
medical devices charged."

After Hurricane Helene, parts of Augusta were dark for nine days. Richmond
County has 1,647 people on electricity-dependent medical equipment. Statewide:
92,233.

We read Georgia Power's $912M storm cost recovery case (GA PSC Docket 44280) —
all data-request responses, the May 2026 stipulation, and the Commission's
order. The words *medical*, *ventilator*, *oxygen*, and *vulnerable* appear
zero times.

## What WATTLINE does

**1. Identify.** Federal emPOWER data publishes at ZIP level — a ZIP can span a
senior tower and a golf course. We disaggregate onto Atlanta parcels and NPU
boundaries, weighted by housing units and tract-level age and disability rates.
Conserves exactly against the 92,233 state total.

**2. Exposure gap.** Not a prediction — a subtraction. Utility restoration ETA
minus the manufacturer's published minimum runtime for the devices counted in
that area.

**3. Reach.** Charging capacity at libraries, fire stations, and rec centers,
assigned to the highest-gap neighborhoods — constrained by MARTA transit
reachability, because a household with no vehicle cannot reach a site no bus
serves.

## What it does not do

It does not touch utility restoration order. Georgia Power restores hospitals,
then the highest-customer-count repairs — that is correct. A crew on a feeder
restores 3,000 customers; the same crew on a lateral restores one house.
WATTLINE uses a different resource pool: buildings, not crews.

## Data sources

| Source | Use |
|---|---|
| [HHS emPOWER](https://empowerprogram.hhs.gov/) | De-identified counts of electricity-dependent Medicare beneficiaries |
| [Atlanta Regional Commission Open Data](https://opendata.atlantaregional.com/) | Parcels, building footprints |
| [City of Atlanta DPCD](https://dpcd-coaplangis.opendata.arcgis.com/) | NPU boundaries, public facilities |
| [MARTA GTFS](https://www.itsmarta.com/app-developer-resources.aspx) | Transit reachability |
| [Census ACS](https://www.census.gov/data/developers/data-sets/acs-5year.html) | B01001, B18101, B08201 |
| GA PSC Docket 44280 | Storm restoration record |

## Architecture

Python ingest → PostGIS → FastAPI → React + MapLibre GL
Deployed on Render. Time-series on Tiger Data.

## Running locally

```bash
cp .env.example .env      # add DATABASE_URL
pip install -r requirements.txt
python -m pipeline.ingest
uvicorn api.main:app --reload
cd web && npm install && npm run dev
```

## Limitations

- **emPOWER is Medicare-only.** It excludes private insurance, Medicaid-only,
  military coverage, and long-term care residents, and undercounts under-65
  disabled people. 92,233 is a floor, not a ceiling.
- **Lookback windows** are 13 months for most DME, 36 months for oxygen
  concentrators, 5 years for implanted cardiac devices. This is "filed a claim,"
  not "currently uses."
- **HHS suppresses small cells** — values 1–10 are published as 11. We treat
  these as intervals and test containment, not equality.
- **ZIP codes do not nest inside counties.** Only 109 of Georgia's 159 counties
  reconcile, so we conserve against the state total.
- Output is a **scenario-based neighborhood priority surface**, not a claim
  about where specific individuals live.
- Battery runtimes are manufacturer published minimums. An assistive technology
  specialist at Georgia Tech CIDI confirmed to us that no one in the field will
  commit to hard runtime numbers — charge state, battery age, and defects all
  vary, and every factor makes it worse. Our gap is the optimistic case.

## Acknowledgments

Georgia Council on Developmental Disabilities and Tools for Life / Center for
Inclusive Design & Innovation at Georgia Tech both responded to our questions
during the build.

## Team

Vinh Le · Niko · Guttu · Kareem

## License

MIT
```

### README checklist

- [ ] Live URL at the top, above the fold
- [ ] Video link at the top
- [ ] One screenshot (`docs/demo.png`) — judges scroll on mobile
- [ ] Data sources credited with links
- [ ] Limitations section — **this is a credibility signal, not a weakness**
- [ ] All four names
- [ ] Repo public, stays public after the event
