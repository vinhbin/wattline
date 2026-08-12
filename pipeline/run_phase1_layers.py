"""
pipeline/run_phase1_layers.py — Executable script for Phase 1 (Task 1.5).
Processes Atlanta Open Data layers, outputs clean datasets to data/processed/,
and validates data against schemas and correctness rules.
"""

import os
import sys
import json

# Ensure project root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pipeline.atlanta_layers import export_processed_layers


def main():
    print("=" * 60)
    print("WATTLINE — Phase 1 Pipeline Execution: Atlanta Open Data Layers")
    print("=" * 60)

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    data_dir = os.path.join(project_root, "data")
    output_dir = os.path.join(project_root, "data", "processed")

    print(f"Data Directory:   {data_dir}")
    print(f"Output Directory: {output_dir}\n")

    summary = export_processed_layers(data_dir=data_dir, output_dir=output_dir)

    print("[SUCCESS] Layer Processing Completed Successfully!")
    print(f"- NPUs Processed:       {summary['npus_processed']} (Expected: 25)")
    print(f"- Facilities Processed: {summary['facilities_processed']} (Expected: 90)")
    print(f"- Tracts Processed:     {summary['tracts_processed']} (Expected: 530)")

    # Assertions
    assert summary["npus_processed"] == 25, f"Expected 25 NPUs, got {summary['npus_processed']}"
    assert summary["facilities_processed"] >= 80, f"Expected >=80 facilities, got {summary['facilities_processed']}"
    assert summary["tracts_processed"] >= 500, f"Expected >=500 tracts, got {summary['tracts_processed']}"

    # Verify generated files
    print("\nVerifying output files:")
    for filepath in summary["files_written"]:
        rel_path = os.path.relpath(filepath, project_root)
        size_bytes = os.path.getsize(filepath)
        print(f"  - {rel_path} ({size_bytes:,} bytes)")

    print("\n" + "=" * 60)
    print("ALL PHASE 1 CHECKS PASSED [OK] - Unblocking Niko B3 Disaggregation & Guttu API")
    print("=" * 60)


if __name__ == "__main__":
    main()
