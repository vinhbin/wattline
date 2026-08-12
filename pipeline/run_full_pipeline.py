"""
pipeline/run_full_pipeline.py — Master Execution Pipeline for WATTLINE.
Executes all data ingestion and processing stages sequentially:
1. Layer Ingestion (NPU Boundaries, Facilities, Demographics)
2. B3 Spatial Disaggregation (emPOWER ZIP -> NPU + Anchor Conservation Check)
3. Emergency Sites & MARTA GTFS Transit Reachability
4. Exposure Gap Series (Hours 0–24)

Outputs clean, precomputed JSON files to data/processed/.
"""

import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pipeline.atlanta_layers import export_processed_layers
from pipeline.disaggregation import run_disaggregation
from pipeline.sites import run_sites_processing
from pipeline.exposure import run_exposure_processing


def main():
    print("==================================================")
    print("      WATTLINE — Master Ingestion Pipeline        ")
    print("==================================================")
    start_time = time.time()

    print("\n[Stage 1/4] Processing Atlanta layers...")
    layers_result = export_processed_layers()
    print(f" -> Processed {layers_result['npus_processed']} NPUs, {layers_result['facilities_processed']} facilities, {layers_result['tracts_processed']} tracts.")

    print("\n[Stage 2/4] Running B3 spatial disaggregation...")
    disagg_result = run_disaggregation()
    print(f" -> Disaggregated onto {disagg_result['npus_count']} NPUs. Total DME: {disagg_result['metro_atlanta_total']}")

    print("\n[Stage 3/4] Processing emergency sites & MARTA transit reachability...")
    sites_result = run_sites_processing()
    print(f" -> Processed {sites_result['total_sites']} sites ({sites_result['transit_reachable']} reachable, {sites_result['transit_unreachable']} unreachable).")

    print("\n[Stage 4/4] Calculating exposure series (hours 0–24)...")
    exposure_result = run_exposure_processing()
    print(f" -> Generated exposure data for {exposure_result['hours_processed']} hours.")

    elapsed = round(time.time() - start_time, 2)
    print("\n==================================================")
    print(f"Pipeline completed successfully in {elapsed} seconds!")
    print("Processed datasets written to data/processed/")
    print("==================================================")


if __name__ == "__main__":
    main()
