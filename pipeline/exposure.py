"""
pipeline/exposure.py — Time-Series Outage Exposure Gap Engine (Task 3.4 / D3).
Calculates exposure gaps per NPU across hours 0–24 during grid outages (Helene profile).
Exposure gap = max(0, utility_eta_hours - shortest_runtime_hours).
Tier classification: safe (gap <= 0), warning (0 < gap <= 4), critical (gap > 4).
Outputs data/processed/exposure.json matching frozen API contract.
"""

import os
import json
import math
from typing import Dict, Any, List

# Standard runtime floors (published minimums in hours)
# Shortest critical runtime is Oxygen Concentrator (0.9 hours)
SHORTEST_RUNTIME_HOURS = 0.9


def run_exposure_processing(
    npus_path: str = "data/processed/npus.json",
    output_dir: str = "data/processed",
) -> Dict[str, Any]:
    """
    Generate exposure series across hours 0–24 for all NPUs.
    """
    os.makedirs(output_dir, exist_ok=True)

    npus_list = []
    if os.path.exists(npus_path):
        with open(npus_path, "r", encoding="utf-8") as f:
            npu_geojson = json.load(f)
            for feat in npu_geojson.get("features", []):
                props = feat.get("properties", {})
                npus_list.append({
                    "npu_id": props.get("npu_id"),
                    "name": props.get("name"),
                    "dme_estimate": props.get("dme_estimate", 100),
                })

    # Fallback to mock NPU list if npus.json doesn't exist
    if not npus_list:
        npus_list = [{"npu_id": f"NPU-{chr(65+i)}", "name": f"NPU-{chr(65+i)}", "dme_estimate": 120} for i in range(25) if chr(65+i) != 'U']

    exposure_data: Dict[str, Any] = {}

    for hour in range(25): # Hours 0 to 24
        hour_npus: List[Dict[str, Any]] = []

        for idx, npu in enumerate(npus_list):
            npu_id = npu["npu_id"]
            dme = npu["dme_estimate"]

            # Outage simulation timeline (Helene profile)
            # Hour 0: normal operations (grid alive)
            # Hour 1+: grid outage spreads across NPUs
            if hour == 0:
                is_dark = False
                utility_eta = 0.0
            else:
                # Deterministic outage wave based on NPU index
                npu_outage_onset = 1 + (idx % 3)
                is_dark = hour >= npu_outage_onset
                if is_dark:
                    # Utility restoration ETA decays as time passes or stays high during storm
                    base_eta = 9.0 + (idx % 5)
                    utility_eta = max(1.0, round(base_eta - (hour * 0.25), 1))
                else:
                    utility_eta = 0.0

            if is_dark and utility_eta > SHORTEST_RUNTIME_HOURS:
                gap = round(utility_eta - SHORTEST_RUNTIME_HOURS, 1)
            else:
                gap = 0.0

            # Tier classification per API contract
            if gap <= 0.0:
                tier = "safe"
                people_at_risk = 0
            elif gap <= 4.0:
                tier = "warning"
                people_at_risk = int(round(dme * 0.6))
            else:
                tier = "critical"
                people_at_risk = dme

            hour_npu_state = {
                "npu_id": npu_id,
                "is_dark": is_dark,
                "utility_eta_hours": utility_eta if is_dark else 0,
                "shortest_runtime_hours": SHORTEST_RUNTIME_HOURS,
                "exposure_gap_hours": gap,
                "tier": tier,
                "people_at_risk": people_at_risk,
            }

            hour_npus.append(hour_npu_state)

        exposure_data[str(hour)] = {
            "hour": hour,
            "npus": hour_npus,
        }

    exposure_out_path = os.path.join(output_dir, "exposure.json")
    with open(exposure_out_path, "w", encoding="utf-8") as f:
        json.dump(exposure_data, f, indent=2)

    print(f"Exposure series generated for hours 0–24 across {len(npus_list)} NPUs [OK]")

    return {
        "hours_processed": 25,
        "npus_count": len(npus_list),
        "exposure_json": exposure_out_path,
    }


if __name__ == "__main__":
    run_exposure_processing()
