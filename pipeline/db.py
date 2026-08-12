"""Postgres/PostGIS access for the pipeline. Optional — the shippable output is
precomputed JSON (data/processed/); PostGIS is used only when DATABASE_URL is
set (Tiger Data / Render Workflows tracks). Reused by later stages (S2..S4).
"""
import os

from sqlalchemy import create_engine

_ENGINE = None


def engine():
    """Lazily build a SQLAlchemy engine from DATABASE_URL (see .env.example)."""
    global _ENGINE
    if _ENGINE is None:
        url = os.environ.get("DATABASE_URL")
        if not url:
            raise RuntimeError("DATABASE_URL not set — see .env.example")
        _ENGINE = create_engine(url)
    return _ENGINE


def write_postgis(gdf, table, **kw):
    """Write a GeoDataFrame to a PostGIS table (replace by default). D-007: each
    stage writes its own table.
    """
    kw.setdefault("if_exists", "replace")
    kw.setdefault("index", False)
    gdf.to_postgis(table, engine(), **kw)
    return len(gdf)
