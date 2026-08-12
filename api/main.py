"""WATTLINE API — read-only, serves precomputed JSON (rule D-006).
Contract: BUILD-PLAN §3, frozen in mocks/.

Data resolution: data/processed/<name>.json wins if it exists, else
mocks/<name>.json. Swapping mock -> real = drop files into data/processed/
with the SAME shapes and restart. No endpoint computes anything per request.

Run: uvicorn api.main:app --reload
"""
import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve().parent.parent


def load(name: str):
    for base in (ROOT / "data" / "processed", ROOT / "mocks"):
        p = base / f"{name}.json"
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8"))
    raise RuntimeError(f"no data source for '{name}' — run scripts/make_mocks.py")


app = FastAPI(title="WATTLINE API")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

NPUS = load("npus")
EXPOSURE = load("exposure")   # dict keyed by hour as string, "0".."24"
SITES = load("sites")
STATS = load("stats")


@app.get("/api/npus")
def npus():
    return NPUS


@app.get("/api/exposure")
def exposure(hour: int = 0):
    if not 0 <= hour <= 24:
        raise HTTPException(status_code=422, detail="hour must be in 0..24")
    return EXPOSURE[str(hour)]


@app.get("/api/sites")
def sites():
    return SITES


@app.get("/api/stats")
def stats():
    return STATS
