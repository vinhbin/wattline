"""B1 — emPOWER ingest (pipeline stage S1: the `zips` table).

Normalizes the raw HHS emPOWER ZIP dump (data/empower_ga_zip.json, already
EPSG:4326 via outSR=4326) into clean per-ZIP records that the disaggregation
stage consumes. Correctness rules D-001..D-005 land here; see
pipeline/constants.py and docs/decision-log.md.

Run: .venv/Scripts/python -m pipeline.empower
"""
import json
import logging
from pathlib import Path

from shapely.geometry import shape

from pipeline.constants import (
    DEVICE_FIELD_MAP,
    FEATURE_COUNT,
    GA_BBOX,
    POP_FIELD,
    STATE_ANCHOR,
    SUPPRESSED_COUNT,
    SUPPRESSED_VALUE,
    SUPPRESSION_BAND,
    ZIP_SUM,
)

log = logging.getLogger(__name__)


# --- pure normalization (no DB) ------------------------------------------

def suppressed_interval(v):
    """(value, low, high, is_suppressed) for one emPOWER cell (D-004).

    A published 11 means the true value is in [1, 11]; 0 is a true zero; any
    value > 11 is exact. Values 1..10 should never appear (HHS suppresses them
    as 11) — treat as exact but warn.
    """
    if v == SUPPRESSED_VALUE:
        return (SUPPRESSED_VALUE, 1, SUPPRESSED_VALUE, True)
    if 0 < v < SUPPRESSED_VALUE:
        log.warning("unexpected sub-threshold cell %d (HHS suppresses 1-10 as 11)", v)
    return (v, v, v, False)


def build_device_mix(props):
    """Canonical device counts (point values, 11 if suppressed) — D-002/D-003.

    Reads only the mapped device fields; never the population field or any
    excluded/union field, so device counts can never leak into population.
    """
    return {canonical: props[field] for field, canonical in DEVICE_FIELD_MAP.items()}


def crs_guard(geom):
    """Fail loudly if geometry is not in the Georgia 4326 box (D-001).

    A silent EPSG:3857 leak lands coordinates in the millions; this catches it
    before it corrupts a downstream spatial join.
    """
    minx, miny, maxx, maxy = geom.bounds
    gx0, gy0, gx1, gy1 = GA_BBOX
    if not (gx0 <= minx and maxx <= gx1 and gy0 <= miny and maxy <= gy1):
        raise ValueError(
            f"geometry bounds {geom.bounds} outside GA 4326 box {GA_BBOX} "
            "— EPSG:3857 leak? (D-001)"
        )


def normalize_feature(feature):
    """One raw emPOWER ZIP feature -> one normalized record."""
    props = feature["properties"]
    geom = shape(feature["geometry"])
    crs_guard(geom)
    value, low, high, is_suppressed = suppressed_interval(props[POP_FIELD])
    return {
        "zip_code": str(props["Zip_Code"]),
        "county": props.get("COUNTY"),
        "population": value,
        "pop_low": low,
        "pop_high": high,
        "is_suppressed": is_suppressed,
        "device_mix": build_device_mix(props),
        "geometry": geom,
    }


def normalize_all(path):
    """All ZIP features from the raw GeoJSON -> list of normalized records."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return [normalize_feature(f) for f in data["features"]]


# --- conservation checks (D-004 / D-005) ---------------------------------

def check_anchors(records):
    """Assert the normalized records reproduce the verified anchor numbers.

    Containment, not equality (D-005): the state anchor 92,233 must lie inside
    the suppression band, and the published ZIP sum / counts must match.
    """
    n = len(records)
    pop = sum(r["population"] for r in records)
    supp = sum(1 for r in records if r["is_suppressed"])
    lo, hi = SUPPRESSION_BAND
    assert n == FEATURE_COUNT, f"expected {FEATURE_COUNT} ZIPs, got {n}"
    assert pop == ZIP_SUM, f"expected ZIP pop sum {ZIP_SUM}, got {pop}"
    assert supp == SUPPRESSED_COUNT, f"expected {SUPPRESSED_COUNT} suppressed, got {supp}"
    assert lo <= STATE_ANCHOR <= hi, f"anchor {STATE_ANCHOR} outside band {SUPPRESSION_BAND}"
    print(
        f"zips: {n} rows | pop sum {pop:,} | suppressed {supp}\n"
        f"state anchor {STATE_ANCHOR:,} in suppression band "
        f"[{lo:,}, {hi:,}]  [OK]"
    )


DATA = Path(__file__).resolve().parent.parent / "data" / "empower_ga_zip.json"


def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    records = normalize_all(DATA)
    check_anchors(records)  # prints the conservation check


if __name__ == "__main__":
    main()
