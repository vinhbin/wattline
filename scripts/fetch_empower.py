"""Pull HHS emPOWER data for Georgia into data/.
Run: python scripts/fetch_empower.py

Writes:
  data/empower_ga_state.json  state anchor row (layer 3)
  data/empower_ga.json        county attributes, no geometry (layer 2)
  data/empower_ga_zip.json    ZIP GeoJSON with geometry (layer 1)

CRS rule (D-001): geometry is requested as GeoJSON with outSR=4326, so the
one-CRS rule is satisfied AT INGEST — nothing downstream reprojects.
Source arrives 3857 server-side; the outSR parameter does the conversion.
"""
import json, urllib.parse, urllib.request

BASE = ("https://services2.arcgis.com/ZQ4jTQn6k7VPXEwO/arcgis/rest/services/"
        "HHS_emPOWER_REST_Service_Public/FeatureServer")

def query(layer, params):
    qs = urllib.parse.urlencode(params)
    with urllib.request.urlopen(f"{BASE}/{layer}/query?{qs}", timeout=120) as r:
        return json.load(r)

# --- state anchor (layer 3) ---------------------------------------------
state = query(3, {"where": "NAME='Georgia'", "outFields": "*",
                  "returnGeometry": "false", "f": "json"})
json.dump(state, open("data/empower_ga_state.json", "w"), indent=2)
ga_total = state["features"][0]["attributes"]["Power_Dependent_Devices_DME"]

# --- counties (layer 2, attributes only) --------------------------------
county = query(2, {"where": "State='GA'", "outFields": "*",
                   "returnGeometry": "false", "f": "json"})
json.dump(county, open("data/empower_ga.json", "w"), indent=2)
richmond = next(f["attributes"] for f in county["features"]
                if f["attributes"]["NAME"] == "Richmond")

# --- ZIPs (layer 1, GeoJSON, 4326, paginated) ---------------------------
features, offset, page = [], 0, 200
while True:
    batch = query(1, {"where": "STATE='GA'", "outFields": "*",
                      "returnGeometry": "true", "outSR": "4326",
                      "resultOffset": offset, "resultRecordCount": page,
                      "f": "geojson"})
    got = batch.get("features", [])
    features.extend(got)
    print(f"  zips: +{len(got)} (total {len(features)})")
    if len(got) < page:
        break
    offset += len(got)
json.dump({"type": "FeatureCollection", "features": features},
          open("data/empower_ga_zip.json", "w"))

# --- conservation checks (CLAUDE.md verified numbers) --------------------
zip_vals = [f["properties"]["Power_Dependent_Devices_DME"] for f in features]
suppressed = sum(1 for v in zip_vals if v == 11)
checks = [
    ("GA state total = 92,233",           ga_total == 92233,          ga_total),
    ("GA ZIP count = 711",                len(features) == 711,       len(features)),
    ("Richmond DME = 1,647",              richmond["Power_Dependent_Devices_DME"] == 1647,
                                          richmond["Power_Dependent_Devices_DME"]),
    ("Richmond Medicare = 39,254",        richmond["Medicare_Benes"] == 39254,
                                          richmond["Medicare_Benes"]),
    ("ZIP sum = 92,567 (suppr. inflation)", sum(zip_vals) == 92567,   sum(zip_vals)),
    ("suppressed ZIP cells = 67",         suppressed == 67,           suppressed),
]
ok = True
for label, passed, actual in checks:
    print(("  OK   " if passed else "  FAIL ") + f"{label}  (got {actual})")
    ok &= passed
if not ok:
    print("\n!! MISMATCH vs verified numbers — emPOWER may have refreshed."
          "\n!! Update CLAUDE.md + README numbers before the pitch.")
print("done" if ok else "done WITH WARNINGS")
