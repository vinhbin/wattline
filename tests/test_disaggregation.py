"""TDD tests for the real B3 disaggregation (pipeline/disaggregation.py).

Synthetic-fixture tests exercise the dasymetric allocation + fallback with known
geometry; the real-file test asserts conservation and contract shape on the
actual 711-ZIP / 25-NPU / 530-tract data.
"""
from pathlib import Path

import geopandas as gpd
import pytest
from shapely.geometry import box

from pipeline.disaggregation import (
    CONTRACT_DEVICE_KEYS,
    compose_band,
    disaggregate_gdfs,
    run_disaggregation,
)

ROOT = Path(__file__).resolve().parent.parent
NPUS_OUT = ROOT / "data" / "processed" / "npus.json"


def _zips(pop=100.0, devices=None):
    devices = devices or {k: 0 for k in CONTRACT_DEVICE_KEYS}
    row = {"zip_code": "30301", "population": pop, "pop_low": pop, "pop_high": pop}
    row.update(devices)
    return gpd.GeoDataFrame(
        [row], geometry=[box(-84.4, 33.75, -84.2, 33.85)], crs="EPSG:4326"
    )


def _npus():
    return gpd.GeoDataFrame(
        [{"npu_id": "NPU-X"}, {"npu_id": "NPU-Y"}],
        geometry=[box(-84.4, 33.75, -84.3, 33.85), box(-84.3, 33.75, -84.2, 33.85)],
        crs="EPSG:4326",
    )


def _tracts(w_left, w_right, nv=0.2):
    return gpd.GeoDataFrame(
        [{"w": w_left, "no_vehicle_rate": nv}, {"w": w_right, "no_vehicle_rate": nv}],
        geometry=[box(-84.4, 33.75, -84.3, 33.85), box(-84.3, 33.75, -84.2, 33.85)],
        crs="EPSG:4326",
    )


# --- band composition (±8% + suppression) --------------------------------

def test_compose_band_applies_eight_percent():
    assert compose_band(100, 100) == (92, 108)


def test_compose_band_orders_low_le_high():
    lo, hi = compose_band(90, 110)
    assert lo <= 90 and hi >= 110


# --- dasymetric allocation splits by demographic weight ------------------

def test_allocation_splits_by_tract_weight():
    # left tract weight 3, right weight 1 -> 75/25 across the two NPUs
    out = {d["npu_id"]: d for d in disaggregate_gdfs(_zips(100.0), _tracts(3, 1), _npus())}
    assert round(out["NPU-X"]["dme_estimate"]) == 75
    assert round(out["NPU-Y"]["dme_estimate"]) == 25


def test_allocation_conserves_zip_total():
    out = disaggregate_gdfs(_zips(100.0), _tracts(3, 1), _npus())
    assert round(sum(d["dme_estimate"] for d in out)) == 100


# --- fallback: zero-weight tracts still allocate by area ------------------

def test_zero_weight_falls_back_to_area():
    # both tracts weight 0 -> equal-area split 50/50, nothing dropped
    out = {d["npu_id"]: d for d in disaggregate_gdfs(_zips(100.0), _tracts(0, 0), _npus())}
    assert round(out["NPU-X"]["dme_estimate"]) == 50
    assert round(out["NPU-Y"]["dme_estimate"]) == 50


# --- real-file integration ----------------------------------------------

def test_real_run_conserves_and_matches_contract():
    result = run_disaggregation()
    total = result["metro_atlanta_total"]
    assert total > 0
    # metro total must equal the sum of per-NPU estimates, and not exceed the
    # statewide published DME sum (92,567)
    import json
    npus = json.loads(NPUS_OUT.read_text(encoding="utf-8"))
    feats = npus["features"]
    assert len(feats) == 25
    assert round(sum(f["properties"]["dme_estimate"] for f in feats)) == round(total)
    assert total <= 92567
    for f in feats:
        p = f["properties"]
        assert set(p["device_mix"]) == set(CONTRACT_DEVICE_KEYS)
        assert p["dme_low"] <= p["dme_estimate"] <= p["dme_high"]
