"""Fetch ARC Open Data ACS 2018-2022 tract-level demographics for Fulton + DeKalb.

Sources (ARC Open Data & Mapping Hub, opendata.atlantaregional.com, ArcGIS Hub):
  - Sex & Age 2022 (all geographies, statewide)         -> tract layer 19
  - Disability 2022 (all geographies, statewide)        -> tract layer 19
  - Vehicle Availability 2022 (all geographies, statewide) -> tract layer 19
  - Housing Characteristics 2022 (all geographies, statewide) -> tract layer 19
"""
import json
import urllib.parse
import urllib.request

BASE = "https://services1.arcgis.com/Ug5xGQbHsD8zuZzM/arcgis/rest/services"

SERVICES = {
    "sexage": {
        "name": "Sex & Age 2022 (all geographies, statewide)",
        "url": f"{BASE}/ACS 2022 Demographic SexAge GeoSplitJoined/FeatureServer/19",
        "fields": ["GEOID", "NAME", "Age65P_e22", "TotPop_e22"],
    },
    "disability": {
        "name": "Disability 2022 (all geographies, statewide)",
        "url": f"{BASE}/ACS 2022 Social Disability GeoSplitJoined/FeatureServer/19",
        "fields": ["GEOID", "WithDisabilityTotal_e22", "CivNonInstPopTotal_e22"],
    },
    "vehicles": {
        "name": "Vehicle Availability 2022 (all geographies, statewide)",
        "url": f"{BASE}/ACS 2022 Housing Vehicles GeoSplitJoined/FeatureServer/19",
        "fields": ["GEOID", "VehicAvail0_e22", "OccHU_e22"],
    },
    "housing": {
        "name": "Housing Characteristics 2022 (all geographies, statewide)",
        "url": f"{BASE}/ACS 2022 Housing Characteristics GeoSplitJoined/FeatureServer/19",
        "fields": ["GEOID", "TotalHU_e22"],
    },
}

WHERE = "GEOID LIKE '13121%' OR GEOID LIKE '13089%'"  # Fulton, DeKalb


def fetch_layer(url, fields, where):
    """Query an ArcGIS FeatureServer layer, paginating with resultOffset."""
    out = {}
    offset = 0
    while True:
        params = urllib.parse.urlencode({
            "f": "json",
            "where": where,
            "outFields": ",".join(fields),
            "returnGeometry": "false",
            "resultOffset": offset,
            "resultRecordCount": 2000,
        })
        query_url = urllib.parse.quote(url, safe=":/") + "/query?" + params
        with urllib.request.urlopen(query_url, timeout=120) as r:
            data = json.load(r)
        if "error" in data:
            raise RuntimeError(f"{url}: {data['error']}")
        feats = data.get("features", [])
        for f in feats:
            a = f["attributes"]
            out[a["GEOID"]] = a
        if data.get("exceededTransferLimit") and feats:
            offset += len(feats)
        else:
            break
    return out


def rate(num, den):
    if num is None or den is None or den == 0:
        return None
    r = num / den
    assert 0.0 <= r <= 1.0, f"rate out of range: {num}/{den}"
    return round(r, 4)


def main():
    layers = {k: fetch_layer(v["url"], v["fields"], WHERE) for k, v in SERVICES.items()}
    for k, v in layers.items():
        print(f"{k}: {len(v)} tracts")

    geoids = sorted(set().union(*[set(v) for v in layers.values()]))
    tracts = {}
    for g in geoids:
        sa = layers["sexage"].get(g, {})
        di = layers["disability"].get(g, {})
        ve = layers["vehicles"].get(g, {})
        ho = layers["housing"].get(g, {})
        tracts[g] = {
            "senior_rate": rate(sa.get("Age65P_e22"), sa.get("TotPop_e22")),
            "disability_rate": rate(di.get("WithDisabilityTotal_e22"),
                                    di.get("CivNonInstPopTotal_e22")),
            "no_vehicle_rate": rate(ve.get("VehicAvail0_e22"), ve.get("OccHU_e22")),
            "housing_units": ho.get("TotalHU_e22"),
        }

    result = {
        "source": "; ".join(
            f"{v['name']} — {v['url']}" for v in SERVICES.values()
        ) + " | ARC Open Data & Mapping Hub (opendata.atlantaregional.com), "
            "ACS 2018-2022 5-year estimates, 2020-vintage tracts, "
            "Fulton (13121) + DeKalb (13089) counties. "
            "senior_rate = Age65P_e22/TotPop_e22; "
            "disability_rate = WithDisabilityTotal_e22/CivNonInstPopTotal_e22; "
            "no_vehicle_rate = VehicAvail0_e22/OccHU_e22; "
            "housing_units = TotalHU_e22 (B25001 total housing units).",
        "tracts": tracts,
    }

    out_path = r"C:\Users\Binep\wattline\data\arc_tract_demographics.json"
    with open(out_path, "w") as f:
        json.dump(result, f, indent=1)

    n = len(tracts)
    fulton = sum(1 for g in tracts if g.startswith("13121"))
    dekalb = sum(1 for g in tracts if g.startswith("13089"))
    complete = sum(1 for t in tracts.values()
                   if all(t[k] is not None for k in
                          ("senior_rate", "disability_rate", "no_vehicle_rate", "housing_units")))
    print(f"\nTotal tracts: {n} (Fulton {fulton}, DeKalb {dekalb}); "
          f"{complete} with all 4 measures non-null")
    print("\nSample entries:")
    for g in list(tracts)[:2] + [geoids[len(geoids) // 2]]:
        print(g, json.dumps(tracts[g]))


if __name__ == "__main__":
    main()
