"""Conservation check against the raw emPOWER dump — stdlib only, runs anywhere.

The camera-friendly proof for the demo video: no geopandas, no venv, just the
raw federal data and arithmetic. Run: python scripts/verify_anchor.py
"""
import json
from pathlib import Path

RAW = Path(__file__).resolve().parent.parent / "data" / "empower_ga_zip.json"
PROCESSED = Path(__file__).resolve().parent.parent / "data" / "processed" / "npus.json"
POP_FIELD = "Power_Dependent_Devices_DME"  # D-002: population field, never summed devices
STATE_ANCHOR = 92233

feats = json.loads(RAW.read_text(encoding="utf-8"))["features"]
vals = [f["properties"].get(POP_FIELD, 0) for f in feats]
pop, supp = sum(vals), sum(1 for v in vals if v == 11)
lo, hi = pop - supp * 10, pop  # each suppressed 11 is truly in [1, 11] (D-004)

print(f"raw emPOWER ZIPs: {len(feats)} | published DME sum: {pop:,} | suppressed cells: {supp}")
print(f"suppression band: [{lo:,}, {hi:,}]")
assert lo <= STATE_ANCHOR <= hi
print(f"state anchor {STATE_ANCHOR:,} inside the band  [OK]")

npus = json.loads(PROCESSED.read_text(encoding="utf-8"))["features"]
metro = sum(f["properties"]["dme_estimate"] for f in npus)
assert metro <= STATE_ANCHOR
print(f"Atlanta NPU allocation: {metro:,} across {len(npus)} NPUs "
      f"({100 * metro / STATE_ANCHOR:.1f}% of the anchor) -> conserves  [OK]")
