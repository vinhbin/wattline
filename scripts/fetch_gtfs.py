"""Download MARTA GTFS static feed for transit reachability (D2). No API key.
Run: python scripts/fetch_gtfs.py

Writes data/gtfs/ (gitignored — 100MB+ uncompressed; this script is the
reproducible path, every teammate runs it locally):
  stops.txt routes.txt trips.txt stop_times.txt calendar.txt
"""
import io, os, urllib.request, zipfile

URL = "https://www.itsmarta.com/google_transit_feed/google_transit.zip"
KEEP = {"stops.txt", "routes.txt", "trips.txt", "stop_times.txt", "calendar.txt"}

os.makedirs("data/gtfs", exist_ok=True)
print("downloading", URL)
req = urllib.request.Request(URL, headers={"User-Agent": "wattline-hackathon/1.0"})
with urllib.request.urlopen(req, timeout=300) as r:
    blob = r.read()
print(f"got {len(blob)/1e6:.1f} MB")

z = zipfile.ZipFile(io.BytesIO(blob))
for name in z.namelist():
    base = os.path.basename(name)
    if base in KEEP:
        with open(os.path.join("data/gtfs", base), "wb") as f:
            f.write(z.read(name))
        print(" ", base)

with open("data/gtfs/stops.txt", encoding="utf-8-sig") as f:
    n_stops = sum(1 for _ in f) - 1
print(f"{n_stops} stops")
