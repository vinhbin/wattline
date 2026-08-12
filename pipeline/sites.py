"""
pipeline/sites.py — Emergency Charging Sites & MARTA GTFS Transit Reachability (Task 2.5 / D2).
Calculates transit accessibility for emergency power charging sites using MARTA GTFS stops.
Sites without a MARTA bus/rail stop within ~650m (~8 min walk) are flagged transit_reachable: false.
Outputs data/processed/sites.json matching frozen API contract.
"""

import os
import json
import math
import csv
from typing import Dict, Any, List, Tuple

# Earth radius in meters for Haversine distance calculation
EARTH_RADIUS_METERS = 6371000.0


def _haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two points in meters."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_METERS * c


def load_marta_stops(gtfs_stops_path: str = "data/gtfs/stops.txt") -> List[Tuple[float, float]]:
    """Load (lat, lon) coordinates of MARTA GTFS bus and rail stops."""
    stops = []
    if not os.path.exists(gtfs_stops_path):
        print(f"Warning: GTFS stops file not found at {gtfs_stops_path}. Using fallback heuristic.")
        return stops

    with open(gtfs_stops_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                lat = float(row.get("stop_lat", 0.0))
                lon = float(row.get("stop_lon", 0.0))
                if lat != 0.0 and lon != 0.0:
                    stops.append((lat, lon))
            except (ValueError, TypeError):
                continue

    return stops


def run_sites_processing(
    facilities_path: str = "data/processed/facilities_clean.json",
    npus_path: str = "data/processed/npus.json",
    gtfs_stops_path: str = "data/gtfs/stops.txt",
    output_dir: str = "data/processed",
    walk_radius_meters: float = 650.0,
) -> Dict[str, Any]:
    """
    Process facilities into emergency charging sites with MARTA transit reachability.
    """
    os.makedirs(output_dir, exist_ok=True)

    if not os.path.exists(facilities_path):
        raise FileNotFoundError(f"Clean facilities file not found: {facilities_path}")

    with open(facilities_path, "r", encoding="utf-8") as f:
        facilities_data = json.load(f)

    sites_raw = facilities_data.get("sites", [])

    npus_list = []
    if os.path.exists(npus_path):
        with open(npus_path, "r", encoding="utf-8") as f:
            npu_geojson = json.load(f)
            for feat in npu_geojson.get("features", []):
                props = feat.get("properties", {})
                centroid = props.get("centroid")
                lon, lat = 0.0, 0.0
                if centroid and (centroid[0] != 0.0 or centroid[1] != 0.0):
                    lon, lat = centroid[0], centroid[1]
                else:
                    # Fallback: compute centroid from geometry coordinates
                    pts = []
                    def extract_pts(lst):
                        if not lst:
                            return
                        if isinstance(lst[0], (int, float)) and len(lst) >= 2:
                            pts.append((float(lst[0]), float(lst[1])))
                        elif isinstance(lst, list):
                            for item in lst:
                                extract_pts(item)
                    extract_pts(feat.get("geometry", {}).get("coordinates", []))
                    if pts:
                        lon = sum(p[0] for p in pts) / len(pts)
                        lat = sum(p[1] for p in pts) / len(pts)

                npus_list.append({
                    "npu_id": props.get("npu_id"),
                    "name": props.get("name"),
                    "dme_estimate": props.get("dme_estimate", 100),
                    "lon": lon,
                    "lat": lat,
                })

    marta_stops = load_marta_stops(gtfs_stops_path)
    print(f"Loaded {len(marta_stops)} MARTA transit stops for reachability calculation.")

    processed_sites: List[Dict[str, Any]] = []

    for site in sites_raw:
        lat = site["lat"]
        lon = site["lon"]

        # Calculate transit reachability
        if marta_stops:
            min_stop_dist = min(_haversine_distance_meters(lat, lon, slat, slon) for slat, slon in marta_stops)
            transit_reachable = min_stop_dist <= walk_radius_meters
        else:
            # Fallback heuristic: sites in outer suburban fringes are transit unreachable
            transit_reachable = not (lat > 33.82 or lat < 33.71 or lon < -84.45)

        # Assigned NPUs & people served
        assigned_npus = []
        people_served = 0

        if transit_reachable and npus_list:
            # Find nearest NPUs
            npu_dists = []
            for npu in npus_list:
                dist = _haversine_distance_meters(lat, lon, npu["lat"], npu["lon"])
                npu_dists.append((dist, npu))

            npu_dists.sort(key=lambda x: x[0])
            for dist, npu in npu_dists[:2]:
                if dist <= 8000.0:  # 8km radius
                    assigned_npus.append(npu["npu_id"])
                    people_served += int(npu["dme_estimate"] * 0.45)

            # If none within 8km, pick nearest 1 NPU
            if not assigned_npus and npu_dists:
                assigned_npus.append(npu_dists[0][1]["npu_id"])
                people_served += int(npu_dists[0][1]["dme_estimate"] * 0.45)

            capacity = site.get("capacity", 120)
            people_served = max(15, min(people_served, capacity))
        else:
            transit_reachable = False
            assigned_npus = []
            people_served = 0

        processed_site = {
            "site_id": site["site_id"],
            "name": site["name"],
            "type": site["type"],
            "lat": lat,
            "lon": lon,
            "capacity": site.get("capacity", 100),
            "transit_reachable": transit_reachable,
            "assigned_npus": assigned_npus,
            "people_served": people_served,
        }

        processed_sites.append(processed_site)

    output_data = {"sites": processed_sites}

    sites_out_path = os.path.join(output_dir, "sites.json")
    with open(sites_out_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2)

    reachable_count = sum(1 for s in processed_sites if s["transit_reachable"])
    unreachable_count = sum(1 for s in processed_sites if not s["transit_reachable"])

    print(f"Sites processed: {len(processed_sites)} total ({reachable_count} transit reachable, {unreachable_count} greyed out / unreachable) [OK]")

    return {
        "total_sites": len(processed_sites),
        "transit_reachable": reachable_count,
        "transit_unreachable": unreachable_count,
        "sites_json": sites_out_path,
    }


if __name__ == "__main__":
    run_sites_processing()
