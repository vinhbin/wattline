"""WATTLINE ingest pipeline as a Render Workflow (public beta).

Honest fit: emPOWER refreshes monthly — this workflow re-fetches every
source and re-verifies the conservation anchors on demand, so the map
never drifts from the federal data.

Deploy (Dashboard → New → Workflow; Blueprints don't support workflows yet):
  Language:  Python 3
  Build:     pip install -r workflows/requirements.txt
  Start:     python workflows/main.py
  Root dir:  (repo root — tasks call scripts/ and read data/)

Trigger from dashboard or:  render.workflows.run_task("<slug>/run_pipeline", [])
"""
import json
import subprocess
import sys
from pathlib import Path

from render_sdk import Retry, Workflows

ROOT = Path(__file__).resolve().parent.parent
app = Workflows(default_timeout=1800)

FETCH_RETRY = Retry(max_retries=2, wait_duration_ms=5000, backoff_scaling=2.0)


def _run_script(rel: str) -> dict:
    p = subprocess.run([sys.executable, str(ROOT / rel)], cwd=ROOT,
                       capture_output=True, text=True, timeout=1500)
    tail = (p.stdout + p.stderr).strip().splitlines()[-12:]
    if p.returncode != 0:
        raise RuntimeError(f"{rel} exited {p.returncode}: {tail}")
    return {"script": rel, "log_tail": tail}


def _verify_conservation() -> dict:
    state = json.loads((ROOT / "data/empower_ga_state.json").read_text())
    zips = json.loads((ROOT / "data/empower_ga_zip.json").read_text())
    ga = state["features"][0]["attributes"]["Power_Dependent_Devices_DME"]
    vals = [f["properties"]["Power_Dependent_Devices_DME"]
            for f in zips["features"]]
    checks = {
        "state_anchor_92233": ga == 92233,
        "zip_count_711": len(vals) == 711,
        "zip_sum_92567_suppression_inflation": sum(vals) == 92567,
        "suppressed_cells_67": sum(1 for v in vals if v == 11) == 67,
    }
    return {"georgia_total": ga, "zip_count": len(vals),
            "checks": checks, "all_pass": all(checks.values())}


# --- individual stages (triggerable on their own from the dashboard) -----

@app.task(retry=FETCH_RETRY)
def fetch_empower():
    """Pull HHS emPOWER GA state/county/ZIP from the public REST service."""
    return _run_script("scripts/fetch_empower.py")


@app.task(retry=FETCH_RETRY)
def fetch_arc_tracts():
    """Pull ARC open-data tract demographics (senior/disability/vehicle/housing)."""
    return _run_script("scripts/fetch_arc_tracts.py")


@app.task(retry=FETCH_RETRY)
def fetch_gtfs():
    """Pull MARTA GTFS static feed for transit reachability."""
    return _run_script("scripts/fetch_gtfs.py")


@app.task
def verify_conservation():
    """Re-check every anchor: state 92,233 · 711 ZIPs · sum 92,567 · 67 suppressed."""
    return _verify_conservation()


# --- the DAG ---------------------------------------------------------------

@app.task(timeout_seconds=3600)
def run_pipeline():
    """fetch emPOWER → fetch ARC → fetch GTFS → verify conservation."""
    report = {
        "fetch_empower": _run_script("scripts/fetch_empower.py"),
        "fetch_arc_tracts": _run_script("scripts/fetch_arc_tracts.py"),
        "fetch_gtfs": _run_script("scripts/fetch_gtfs.py"),
        "verify": _verify_conservation(),
    }
    report["all_pass"] = report["verify"]["all_pass"]
    return report


if __name__ == "__main__":
    app.start()
