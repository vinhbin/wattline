"""
pipeline/atlanta_layers.py — Ingest, clean, and standardize Atlanta Open Data layers:
- NPU Boundaries (City of Atlanta DPCD, 25 NPUs, EPSG:4326)
- Public Facilities (Libraries, Fire Stations, Rec Centers)
- ARC Tract Demographics (ACS 2022 senior, disability, vehicle, housing metrics)
"""

import os
import json
import math
from typing import Dict, Any, List, Tuple


def _compute_geometry_bbox_and_centroid(geometry: Dict[str, Any]) -> Tuple[List[float], List[float]]:
    """Calculate bounding box [min_lon, min_lat, max_lon, max_lat] and centroid [lon, lat]."""
    gtype = geometry.get("type", "")
    coords = geometry.get("coordinates", [])

    points: List[Tuple[float, float]] = []

    def extract_points(lst):
        if not lst:
            return
        if isinstance(lst[0], (int, float)) and len(lst) >= 2:
            points.append((float(lst[0]), float(lst[1])))
        elif isinstance(lst, list):
            for item in lst:
                extract_points(item)

    extract_points(coords)

    if not points:
        return [0.0, 0.0, 0.0, 0.0], [0.0, 0.0]

    min_lon = min(p[0] for p in points)
    max_lon = max(p[0] for p in points)
    min_lat = min(p[1] for p in points)
    max_lat = max(p[1] for p in points)

    avg_lon = sum(p[0] for p in points) / len(points)
    avg_lat = sum(p[1] for p in points) / len(points)

    return [round(min_lon, 6), round(min_lat, 6), round(max_lon, 6), round(max_lat, 6)], [round(avg_lon, 6), round(avg_lat, 6)]


def load_npu_boundaries(filepath: str = "data/npu_boundaries.geojson") -> Dict[str, Any]:
    """
    Ingest and clean NPU boundaries from official COA DPCD layer.
    Extracts NPU letter from NAME property, standardizes npu_id to NPU-{LETTER},
    calculates bounding box and centroid, and preserves EPSG:4326 geometry.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"NPU boundaries file not found: {filepath}")

    with open(filepath, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    cleaned_features = []
    seen_npus = set()

    for feature in raw_data.get("features", []):
        props = feature.get("properties", {})
        geometry = feature.get("geometry", {})

        # Gotcha: NPU letter is in NAME property (the NPU property is null everywhere)
        raw_name = props.get("NAME") or props.get("NPU") or ""
        letter = str(raw_name).strip().upper()

        if not letter or len(letter) > 2:
            continue

        npu_id = f"NPU-{letter}"
        bbox, centroid = _compute_geometry_bbox_and_centroid(geometry)

        clean_props = {
            "npu_id": npu_id,
            "letter": letter,
            "name": f"NPU-{letter}",
            "acres": round(float(props.get("ACRES", 0.0) or 0.0), 2),
            "sqmiles": round(float(props.get("SQMILES", 0.0) or 0.0), 2),
            "bbox": bbox,
            "centroid": centroid,
        }

        cleaned_feature = {
            "type": "Feature",
            "geometry": geometry,
            "properties": clean_props,
        }

        cleaned_features.append(cleaned_feature)
        seen_npus.add(npu_id)

    # Sort NPUs alphabetically by NPU ID
    cleaned_features.sort(key=lambda x: x["properties"]["npu_id"])

    return {
        "type": "FeatureCollection",
        "properties": {
            "total_npus": len(cleaned_features),
            "crs": "EPSG:4326",
            "npu_ids": sorted(list(seen_npus)),
        },
        "features": cleaned_features,
    }


def load_facilities(filepath: str = "data/facilities.geojson") -> Dict[str, Any]:
    """
    Ingest public facilities (libraries, fire stations, rec centers),
    assign unique site_ids, extract coordinates, apply default capacities,
    and output schema foundation for /api/sites.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Facilities file not found: {filepath}")

    with open(filepath, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    sites: List[Dict[str, Any]] = []
    counters = {"library": 0, "fire_station": 0, "rec_center": 0, "other": 0}

    # Capacity defaults per type if not specified
    capacity_defaults = {
        "library": 100,
        "fire_station": 120,
        "rec_center": 150,
        "other": 80,
    }

    type_prefixes = {
        "library": "lib",
        "fire_station": "fire",
        "rec_center": "rec",
        "other": "site",
    }

    for feature in raw_data.get("features", []):
        props = feature.get("properties", {})
        geometry = feature.get("geometry", {})

        coords = geometry.get("coordinates", [0.0, 0.0])
        lon, lat = round(float(coords[0]), 6), round(float(coords[1]), 6)

        raw_type = str(props.get("type", "other")).lower().strip()
        if "lib" in raw_type:
            fac_type = "library"
        elif "fire" in raw_type:
            fac_type = "fire_station"
        elif "rec" in raw_type or "community" in raw_type:
            fac_type = "rec_center"
        else:
            fac_type = "other"

        counters[fac_type] += 1
        prefix = type_prefixes[fac_type]
        site_id = f"{prefix}-{counters[fac_type]:03d}"

        name = props.get("name") or f"{fac_type.replace('_', ' ').title()} #{counters[fac_type]}"
        capacity = int(props.get("capacity", capacity_defaults[fac_type]))

        site_obj = {
            "site_id": site_id,
            "name": name,
            "type": fac_type,
            "lat": lat,
            "lon": lon,
            "capacity": capacity,
            "transit_reachable": True,
            "assigned_npus": [],
            "people_served": 0,
            "source": props.get("source", "City of Atlanta / ARC"),
        }

        sites.append(site_obj)

    return {
        "sites": sites,
        "stats": {
            "total_sites": len(sites),
            "by_type": counters,
        },
    }


def load_tract_demographics(filepath: str = "data/arc_tract_demographics.json") -> Dict[str, Any]:
    """
    Ingest ARC census tract demographics (530 tracts across Fulton and DeKalb).
    Normalizes tract GEOID keys, senior rates, disability rates, no-vehicle rates, and housing units.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"ARC tract demographics file not found: {filepath}")

    with open(filepath, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    tracts_dict = raw_data.get("tracts", {})
    cleaned_tracts: Dict[str, Dict[str, Any]] = {}

    for tract_id, metrics in tracts_dict.items():
        geoid = str(tract_id).zfill(11)
        sr = float(metrics.get("senior_rate", 0.0) or 0.0)
        dr = float(metrics.get("disability_rate", 0.0) or 0.0)
        nvr = float(metrics.get("no_vehicle_rate", 0.0) or 0.0)
        hu = int(metrics.get("housing_units", 0) or 0)

        cleaned_tracts[geoid] = {
            "tract_geoid": geoid,
            "senior_rate": round(sr, 4),
            "disability_rate": round(dr, 4),
            "no_vehicle_rate": round(nvr, 4),
            "housing_units": hu,
        }

    return {
        "source": raw_data.get("source", "ARC Open Data"),
        "total_tracts": len(cleaned_tracts),
        "tracts": cleaned_tracts,
    }


def export_processed_layers(data_dir: str = "data", output_dir: str = "data/processed") -> Dict[str, Any]:
    """
    Run full layer ingestion and export clean files to output_dir.
    """
    os.makedirs(output_dir, exist_ok=True)

    npus_file = os.path.join(data_dir, "npu_boundaries.geojson")
    facilities_file = os.path.join(data_dir, "facilities.geojson")
    tracts_file = os.path.join(data_dir, "arc_tract_demographics.json")

    npu_data = load_npu_boundaries(npus_file)
    facilities_data = load_facilities(facilities_file)
    tracts_data = load_tract_demographics(tracts_file)

    npu_out_path = os.path.join(output_dir, "npu_boundaries_clean.geojson")
    facilities_out_path = os.path.join(output_dir, "facilities_clean.json")
    tracts_out_path = os.path.join(output_dir, "tract_demographics_clean.json")

    with open(npu_out_path, "w", encoding="utf-8") as f:
        json.dump(npu_data, f, indent=2)

    with open(facilities_out_path, "w", encoding="utf-8") as f:
        json.dump(facilities_data, f, indent=2)

    with open(tracts_out_path, "w", encoding="utf-8") as f:
        json.dump(tracts_data, f, indent=2)

    return {
        "npus_processed": npu_data["properties"]["total_npus"],
        "facilities_processed": facilities_data["stats"]["total_sites"],
        "tracts_processed": tracts_data["total_tracts"],
        "files_written": [npu_out_path, facilities_out_path, tracts_out_path],
    }
