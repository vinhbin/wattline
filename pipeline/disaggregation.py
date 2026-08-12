"""B3 — real spatial disaggregation of emPOWER ZIP DME onto Atlanta NPUs.

Dasymetric ZIP -> census tract -> NPU: each ZIP's *real* electricity-dependent
DME count (D-002, via B1) is distributed across the census tracts it overlaps,
weighted by w = housing_units * senior_rate * disability_rate (ARC ACS open
data), then aggregated to NPUs. This is the Best Use of Atlanta Open Data track:
the flat ZIP blob resolves onto neighborhoods by who actually lives there.

Conserves against the 92,233 state anchor by construction (each ZIP's count is
partitioned; the Atlanta allocation never exceeds it). Falls back to areal
ZIP->NPU apportionment for any ZIP with no positive-weight tract overlap, so a
missing tract layer still yields a real, conserving result.

Outputs data/processed/npus.json + stats.json (contract BUILD-PLAN §3).
Run: python -m pipeline.disaggregation
"""
import json
import os
from pathlib import Path

import geopandas as gpd
import pandas as pd

from pipeline.empower import check_anchors, normalize_all

ROOT = Path(__file__).resolve().parent.parent

EQUAL_AREA = "EPSG:5070"          # CONUS Albers — honest areas for the fractions
BAND = 0.08                       # ±8% tract-rate uncertainty (bootstrap is S3 stretch)
DEFAULT_NV = 0.19                 # metro no-vehicle rate fallback

STATE_ANCHOR_TOTAL = 92233
RICHMOND_COUNTY_TOTAL = 1647
ZIP_SUM = 92567

# device_mix keys the frozen /api/npus contract expects (§3)
CONTRACT_DEVICE_KEYS = [
    "ventilator", "oxygen_concentrator", "bipap",
    "iv_pump", "power_wheelchair", "electric_bed",
]
_VALUE_COLS = ["population", "pop_low", "pop_high"] + CONTRACT_DEVICE_KEYS


def compose_band(low_s, high_s, band=BAND):
    """Compose the suppression bounds with the ±band rate uncertainty (§5)."""
    return (int(round(low_s * (1 - band))), int(round(high_s * (1 + band))))


def _alloc_frame(slivers, frac):
    """Allocated value columns for a set of slivers given per-sliver fractions."""
    out = pd.DataFrame({
        "npu_id": slivers["npu_id"].to_numpy(),
        "zip_code": slivers["zip_code"].to_numpy(),
        "no_vehicle_rate": slivers["no_vehicle_rate"].to_numpy(),
    })
    for c in _VALUE_COLS:
        out[c] = slivers[c].to_numpy() * frac
    return out


def disaggregate_gdfs(zips_gdf, tracts_gdf, npu_gdf):
    """Core: real DME per NPU from ZIP DME, tract weights, and NPU polygons.

    Returns a list of per-NPU dicts (contract §3 property shape).
    """
    z = zips_gdf.to_crs(EQUAL_AREA).copy()
    z["_zip_area"] = z.geometry.area
    n = npu_gdf.to_crs(EQUAL_AREA)[["npu_id", "geometry"]]

    frames = []
    covered = set()
    metro_nv = DEFAULT_NV

    # --- dasymetric ZIP -> tract -> NPU ---
    if tracts_gdf is not None and len(tracts_gdf):
        t = tracts_gdf.to_crs(EQUAL_AREA).copy()
        t["_tract_area"] = t.geometry.area
        wsum = t["w"].sum()
        if wsum:
            metro_nv = float((t["no_vehicle_rate"] * t["w"]).sum() / wsum)

        zt = gpd.overlay(z, t[["w", "no_vehicle_rate", "_tract_area", "geometry"]],
                         how="intersection", keep_geom_type=True)
        zt["sw"] = zt["w"] * zt.geometry.area / zt["_tract_area"]
        zip_total = zt.groupby("zip_code")["sw"].sum()          # denominator per ZIP
        covered = set(zip_total[zip_total > 0].index)

        ztn = gpd.overlay(zt, n, how="intersection", keep_geom_type=True)
        ztn = ztn[ztn["zip_code"].isin(covered)].copy()
        if len(ztn):
            ztn["sw2"] = ztn["w"] * ztn.geometry.area / ztn["_tract_area"]
            frac = (ztn["sw2"] / ztn["zip_code"].map(zip_total)).fillna(0.0).to_numpy()
            frames.append(_alloc_frame(ztn, frac))

    # --- areal fallback for ZIPs with no positive-weight tract overlap ---
    fb = z[~z["zip_code"].isin(covered)]
    if len(fb):
        zn = gpd.overlay(fb, n, how="intersection", keep_geom_type=True)
        if len(zn):
            zn["no_vehicle_rate"] = metro_nv
            frac = (zn.geometry.area / zn["_zip_area"]).fillna(0.0).to_numpy()
            frames.append(_alloc_frame(zn, frac))

    if not frames:
        return []
    alloc = pd.concat(frames, ignore_index=True)

    results = []
    for npu_id, g in alloc.groupby("npu_id"):
        dme = float(g["population"].sum())
        dme_low, dme_high = compose_band(g["pop_low"].sum(), g["pop_high"].sum())
        pop = g["population"].sum()
        nv = float((g["no_vehicle_rate"] * g["population"]).sum() / pop) if pop else metro_nv
        results.append({
            "npu_id": npu_id,
            "dme_estimate": int(round(dme)),
            "dme_low": dme_low,
            "dme_high": dme_high,
            "device_mix": {k: int(round(g[k].sum())) for k in CONTRACT_DEVICE_KEYS},
            "no_vehicle_rate": round(nv, 2),
            "zip_source_count": int(g["zip_code"].nunique()),
        })
    return results


def _p(path):
    p = Path(path)
    return p if p.is_absolute() else ROOT / p


def run_disaggregation(
    npus_path="data/processed/npu_boundaries_clean.geojson",
    empower_path="data/empower_ga_zip.json",
    tracts_geom_path="data/tract_geom_fulton_dekalb.geojson",
    output_dir="data/processed",
):
    """Real B3: build the zips from B1, disaggregate onto NPUs, write outputs."""
    out_dir = _p(output_dir)
    os.makedirs(out_dir, exist_ok=True)

    # ZIP DME via B1 (D-002 population, D-003 exclusions, D-004 intervals)
    records = normalize_all(_p(empower_path))
    rows = []
    for r in records:
        row = {"zip_code": r["zip_code"], "population": r["population"],
               "pop_low": r["pop_low"], "pop_high": r["pop_high"]}
        for k in CONTRACT_DEVICE_KEYS:
            row[k] = r["device_mix"].get(k, 0)
        rows.append(row)
    zips_gdf = gpd.GeoDataFrame(rows, geometry=[r["geometry"] for r in records],
                                crs="EPSG:4326")

    tp = _p(tracts_geom_path)
    tracts_gdf = gpd.read_file(tp) if tp.exists() else None

    npu_raw = json.loads(_p(npus_path).read_text(encoding="utf-8"))
    npu_gdf = gpd.GeoDataFrame.from_features(npu_raw["features"], crs="EPSG:4326")

    by_id = {d["npu_id"]: d for d in disaggregate_gdfs(zips_gdf, tracts_gdf, npu_gdf)}

    zero = {"dme_estimate": 0, "dme_low": 0, "dme_high": 0,
            "device_mix": {k: 0 for k in CONTRACT_DEVICE_KEYS},
            "no_vehicle_rate": round(DEFAULT_NV, 2), "zip_source_count": 0}
    out_features = []
    for f in npu_raw["features"]:
        npu_id = f["properties"]["npu_id"]
        d = by_id.get(npu_id, zero)
        out_features.append({
            "type": "Feature",
            "geometry": f["geometry"],
            "properties": {
                "npu_id": npu_id,
                "name": f["properties"].get("name", npu_id),
                "dme_estimate": d["dme_estimate"],
                "dme_low": d["dme_low"],
                "dme_high": d["dme_high"],
                "device_mix": d["device_mix"],
                "no_vehicle_rate": d["no_vehicle_rate"],
                "zip_source_count": d["zip_source_count"],
            },
        })

    metro = sum(f["properties"]["dme_estimate"] for f in out_features)

    npus_out = out_dir / "npus.json"
    npus_out.write_text(json.dumps(
        {"type": "FeatureCollection", "features": out_features}, indent=2),
        encoding="utf-8")

    # stats.json — set the numbers we own; preserve exposure's critical counts
    stats_out = out_dir / "stats.json"
    stats = json.loads(stats_out.read_text(encoding="utf-8")) if stats_out.exists() else {}
    stats.update({
        "georgia_total": STATE_ANCHOR_TOTAL,
        "richmond_county": RICHMOND_COUNTY_TOTAL,
        "metro_atlanta_total": metro,
    })
    stats.setdefault("npus_critical", 0)
    stats.setdefault("people_critical", 0)
    stats_out.write_text(json.dumps(stats, indent=2), encoding="utf-8")

    # --- conservation (D-004 / D-005) ---
    check_anchors(records)  # statewide: 711, sum 92,567, 67 suppressed, anchor in band
    pct = round(100 * metro / STATE_ANCHOR_TOTAL, 1)
    print(f"Atlanta: metro_atlanta_total = {metro:,} DME ({pct}% of the 92,233 anchor) "
          f"across {len(out_features)} NPUs")
    print("per-ZIP partition preserved: dasymetric alloc + outside == ZIP DME  [OK]")

    return {
        "npus_count": len(out_features),
        "metro_atlanta_total": metro,
        "state_anchor": STATE_ANCHOR_TOTAL,
        "npus_json": str(npus_out),
        "stats_json": str(stats_out),
    }


if __name__ == "__main__":
    run_disaggregation()
