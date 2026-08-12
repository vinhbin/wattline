"""Pull Census ACS 5-year tables for the disaggregation weights.
Run: CENSUS_API_KEY=<key> python scripts/fetch_acs.py

NOTE: as of 2026 api.census.gov REQUIRES a key (302s to missing_key.html
without one). Free + instant: https://api.census.gov/data/key_signup.html
Keyless alternative: ARC open data tract layers (see data/ if already pulled).

Writes:
  data/acs_tract_rates.json   per-tract senior/disability/no-vehicle rates, all of GA
  data/acs_bg_housing.json    per-block-group housing units, Fulton + DeKalb

Tables (BUILD-PLAN §5B): B01001 (age), B18101 (disability), B08201 (vehicles),
B25001 (housing units — the parcel fallback weight base).
"""
import json, os, urllib.parse, urllib.request

KEY = os.environ.get("CENSUS_API_KEY", "")
if not KEY:
    raise SystemExit("CENSUS_API_KEY not set — free key: "
                     "https://api.census.gov/data/key_signup.html")

# newest vintage first; fall back if the endpoint 404s
VINTAGES = ["2024", "2023"]

SENIOR_M = [f"B01001_{i:03d}E" for i in range(20, 26)]   # male 65+
SENIOR_F = [f"B01001_{i:03d}E" for i in range(44, 50)]   # female 65+
DISAB_M = [f"B18101_{i:03d}E" for i in (4, 7, 10, 13, 16, 19)]    # male w/ disability
DISAB_F = [f"B18101_{i:03d}E" for i in (23, 26, 29, 32, 35, 38)]  # female w/ disability


def get(vintage, variables, geo_for, geo_in):
    qs = urllib.parse.urlencode({"get": ",".join(variables),
                                 "for": geo_for, "in": geo_in, "key": KEY})
    url = f"https://api.census.gov/data/{vintage}/acs/acs5?{qs}"
    with urllib.request.urlopen(url, timeout=120) as r:
        rows = json.load(r)
    head, out = rows[0], {}
    for row in rows[1:]:
        rec = dict(zip(head, row))
        out[rec["state"] + rec["county"] + rec["tract"] + rec.get("block group", "")] = rec
    return out


def num(rec, keys):
    return sum(max(0, int(float(rec[k] or 0))) for k in keys)


vintage = None
for v in VINTAGES:
    try:
        get(v, ["B01001_001E"], "tract:*", "state:13 county:121")
        vintage = v
        break
    except Exception:
        continue
if not vintage:
    raise SystemExit("no ACS vintage reachable")
print(f"using ACS 5-year vintage {vintage}")

age = get(vintage, ["B01001_001E"] + SENIOR_M + SENIOR_F, "tract:*", "state:13")
dis = get(vintage, ["B18101_001E"] + DISAB_M + DISAB_F, "tract:*", "state:13")
veh = get(vintage, ["B08201_001E", "B08201_002E"], "tract:*", "state:13")

rates = {}
for geoid, a in age.items():
    total = num(a, ["B01001_001E"])
    d, v_ = dis.get(geoid), veh.get(geoid)
    rates[geoid] = {
        "senior_rate": num(a, SENIOR_M + SENIOR_F) / total if total else 0.0,
        "disability_rate": (num(d, DISAB_M + DISAB_F) / num(d, ["B18101_001E"])
                            if d and num(d, ["B18101_001E"]) else 0.0),
        "no_vehicle_rate": (num(v_, ["B08201_002E"]) / num(v_, ["B08201_001E"])
                            if v_ and num(v_, ["B08201_001E"]) else 0.0),
    }
json.dump({"vintage": vintage, "tracts": rates},
          open("data/acs_tract_rates.json", "w"), indent=1)
print(f"tract rates: {len(rates)} GA tracts")

housing = {}
for county in ("121", "089"):  # Fulton, DeKalb
    bg = get(vintage, ["B25001_001E"], "block group:*", f"state:13 county:{county}")
    for geoid, rec in bg.items():
        housing[geoid] = int(float(rec["B25001_001E"] or 0))
json.dump({"vintage": vintage, "block_groups": housing},
          open("data/acs_bg_housing.json", "w"), indent=1)
print(f"housing units: {len(housing)} block groups (Fulton+DeKalb), "
      f"total {sum(housing.values()):,}")

bad = [g for g, r in rates.items()
       if not all(0 <= r[k] <= 1 for k in r)]
print("rate sanity:", "OK all in [0,1]" if not bad else f"FAIL {len(bad)} tracts out of range")
