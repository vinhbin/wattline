"""TDD tests for B1 emPOWER ingest (pipeline/empower.py).

Pure-Python, no database — run with `.venv/Scripts/python -m pytest tests/`.
The DB load (load_zips) is verified manually against Docker PostGIS.
"""
from pathlib import Path

import pytest
from shapely.geometry import Point

from pipeline import constants as C
from pipeline.empower import (
    build_device_mix,
    check_anchors,
    crs_guard,
    normalize_all,
    normalize_feature,
    suppressed_interval,
)

ROOT = Path(__file__).resolve().parent.parent
ZIP_PATH = ROOT / "data" / "empower_ga_zip.json"


def make_feature(geometry=None, **prop_overrides):
    """A minimal emPOWER-shaped GeoJSON feature for unit tests."""
    props = {
        "Zip_Code": "30301",
        "COUNTY": "Fulton",
        C.POP_FIELD: 27,
        "Ventilators_13mo": 11,
        "BiPAPs_13mo": 0,
        "O2_Concentrators_36mo": 19,
        "IV_Infusion_Pumps_13mo": 11,
        "Enteral_Feeding_13mo": 11,
        "AtHome_Dialysis_3mo": 0,
        "Power_Wheelchairs_Scooters_13mo": 11,
        "Electric_Beds_13mo": 11,
        # exclusions that must never leak into device_mix (D-003 + unions)
        "Power_De_1": 5,
        "Power_Dependent_Card_Dvcs_5yrs": 5,
        "Any_Healthcare_Srvc_Any_DME": 22,
    }
    props.update(prop_overrides)
    return {
        "type": "Feature",
        "properties": props,
        "geometry": geometry or {"type": "Point", "coordinates": [-84.4, 33.75]},
    }


# --- suppressed_interval (D-004) -----------------------------------------

def test_suppressed_interval_marks_11_as_1_to_11():
    assert suppressed_interval(11) == (11, 1, 11, True)


def test_suppressed_interval_zero_is_true_zero():
    assert suppressed_interval(0) == (0, 0, 0, False)


def test_suppressed_interval_real_value_is_a_point():
    assert suppressed_interval(27) == (27, 27, 27, False)


# --- population source (D-002) -------------------------------------------

def test_population_uses_only_pop_field_not_device_sum():
    # device fields sum well past the population field; population must ignore them
    rec = normalize_feature(make_feature(**{C.POP_FIELD: 27}))
    assert rec["population"] == 27


def test_normalize_feature_suppressed_population_is_an_interval():
    rec = normalize_feature(make_feature(**{C.POP_FIELD: 11}))
    assert (rec["population"], rec["pop_low"], rec["pop_high"], rec["is_suppressed"]) == (
        11, 1, 11, True,
    )


# --- device_mix mapping --------------------------------------------------

def test_device_mix_has_exactly_the_eight_canonical_keys():
    mix = build_device_mix(make_feature()["properties"])
    assert set(mix) == set(C.DEVICE_FIELD_MAP.values())


def test_device_mix_maps_field_values():
    mix = build_device_mix(make_feature(Ventilators_13mo=42)["properties"])
    assert mix["ventilator"] == 42


# --- exclusions (D-003 + overlapping unions) -----------------------------

def test_excluded_fields_never_enter_device_mix():
    mix = build_device_mix(make_feature()["properties"])
    assert not (set(mix) & C.EXCLUDED_FIELDS)
    assert "Power_De_1" not in mix
    assert "Any_Healthcare_Srvc_Any_DME" not in mix


# --- CRS guard (D-001) ---------------------------------------------------

def test_crs_guard_passes_for_georgia_4326_point():
    crs_guard(Point(-84.4, 33.75))  # must not raise


def test_crs_guard_rejects_3857_range_coords():
    with pytest.raises(ValueError):
        crs_guard(Point(-9_400_000, 4_000_000))


# --- anchor checks (D-004 / D-005) ---------------------------------------

def test_check_anchors_raises_on_wrong_feature_count():
    with pytest.raises(AssertionError):
        check_anchors([])


# --- integration against the real 711-ZIP file ---------------------------

@pytest.mark.skipif(not ZIP_PATH.exists(), reason="raw emPOWER data not present")
def test_normalize_all_conserves_against_anchor():
    records = normalize_all(ZIP_PATH)
    assert len(records) == C.FEATURE_COUNT
    assert sum(r["population"] for r in records) == C.ZIP_SUM
    assert sum(1 for r in records if r["is_suppressed"]) == C.SUPPRESSED_COUNT
    check_anchors(records)  # must not raise
