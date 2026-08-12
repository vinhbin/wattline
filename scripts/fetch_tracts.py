"""Fetch 2020 census tract polygons for Fulton (13121) + DeKalb (13089) from the
Census TIGERweb ArcGIS REST service as GeoJSON (outSR=4326), joined by 11-digit
GEOID to data/processed/tract_demographics_clean.json.

Writes: data/tract_geom_fulton_dekalb.geojson
  tract polygons with a demographic disaggregation weight
  w = housing_units * senior_rate * disability_rate  (0 where demographics absent)

CRS rule (D-001): geometry requested with outSR=4326 — no downstream reprojection.

Tolerant: on any network/parse failure this prints a warning and exits 0, so the
disaggregation can fall back to areal ZIP->NPU weighting and still ship.

Run: python scripts/fetch_tracts.py
"""
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEMOG = ROOT / "data" / "processed" / "tract_demographics_clean.json"
OUT = ROOT / "data" / "tract_geom_fulton_dekalb.geojson"

BASE = ("https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/"
        "Tracts_Blocks/MapServer/0")
WHERE = "STATE='13' AND (COUNTY='121' OR COUNTY='089')"
PAGE = 500


def query(offset):
    params = urllib.parse.urlencode({
        "where": WHERE, "outFields": "GEOID", "returnGeometry": "true",
        "outSR": "4326", "f": "geojson",
        "resultOffset": offset, "resultRecordCount": PAGE,
    })
    with urllib.request.urlopen(f"{BASE}/query?{params}", timeout=60) as r:
        return json.load(r)


def main():
    try:
        demog = json.loads(DEMOG.read_text(encoding="utf-8")).get("tracts", {})
        feats, offset = [], 0
        while True:
            got = query(offset).get("features", [])
            feats.extend(got)
            if len(got) < PAGE:
                break
            offset += len(got)

        joined = 0
        for f in feats:
            gid = str(f["properties"].get("GEOID", ""))
            d = demog.get(gid)
            if d:
                w = (d.get("housing_units") or 0) * (d.get("senior_rate") or 0) \
                    * (d.get("disability_rate") or 0)
                f["properties"].update({
                    "tract_geoid": gid,
                    "housing_units": d.get("housing_units"),
                    "senior_rate": d.get("senior_rate"),
                    "disability_rate": d.get("disability_rate"),
                    "no_vehicle_rate": d.get("no_vehicle_rate"),
                    "w": round(w, 4),
                })
                joined += 1
            else:
                f["properties"]["w"] = 0.0

        OUT.write_text(json.dumps({"type": "FeatureCollection", "features": feats}))
        print(f"tracts: {len(feats)} geometry features, {joined} joined to "
              f"demographics -> {OUT.name}")
    except Exception as e:  # network, parse, whatever — degrade gracefully
        print(f"WARN fetch_tracts failed ({e}); disaggregation will use areal fallback")
        sys.exit(0)


if __name__ == "__main__":
    main()
