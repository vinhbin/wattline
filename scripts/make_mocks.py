"""Generate mock API responses so the frontend is never blocked.
Run: python scripts/make_mocks.py   ->  writes mocks/*.json
Replace with real data later; the shapes must not change."""
import json, math, os, random, zlib
random.seed(7)

NPUS = [("NPU-M","Downtown",33.755,-84.390),("NPU-E","Midtown",33.781,-84.383),
        ("NPU-V","West End",33.735,-84.418),("NPU-T","Atlantic Station",33.792,-84.397),
        ("NPU-L","Bankhead",33.771,-84.428),("NPU-N","Old Fourth Ward",33.766,-84.365),
        ("NPU-W","East Atlanta",33.740,-84.341),("NPU-Y","Buckhead South",33.822,-84.383),
        ("NPU-O","Virginia Highland",33.786,-84.353),("NPU-X","Lakewood",33.700,-84.395),
        ("NPU-Z","Southeast",33.712,-84.352),("NPU-P","Adamsville",33.757,-84.489)]
DEV = ["ventilator","oxygen_concentrator","bipap","iv_pump","power_wheelchair","electric_bed"]
os.makedirs("mocks", exist_ok=True)

def box(lat, lon, d=0.014):
    return [[[lon-d,lat-d],[lon+d,lat-d],[lon+d,lat+d],[lon-d,lat+d],[lon-d,lat-d]]]

npus, meta = [], {}
for nid, name, lat, lon in NPUS:
    est = random.randint(60, 310)
    mix = {}
    rem = est
    for i, dv in enumerate(DEV):
        take = rem if i == len(DEV)-1 else random.randint(0, max(1, rem//2))
        mix[dv] = take; rem -= take
    meta[nid] = dict(est=est, mix=mix, lat=lat, lon=lon, name=name)
    npus.append({"type":"Feature","geometry":{"type":"Polygon","coordinates":box(lat,lon)},
        "properties":{"npu_id":nid,"name":name,"dme_estimate":est,
            "dme_low":int(est*0.92),"dme_high":int(est*1.08),"device_mix":mix,
            "no_vehicle_rate":round(random.uniform(0.08,0.42),2),
            "zip_source_count":random.randint(2,6)}})
json.dump({"type":"FeatureCollection","features":npus}, open("mocks/npus.json","w"), indent=2)

RUN = json.load(open("data/device_runtimes.json"))["devices"]
def shortest(mix):
    present = [RUN[d]["min_hours"] for d,c in mix.items() if c>0 and RUN[d]["min_hours"]>0]
    return min(present) if present else 0.0

series = {}
for hour in range(25):
    rows = []
    for nid, m in meta.items():
        # zlib.crc32, not hash(): hash() is salted per process, so the
        # dark/lit assignment (and stats.json) changed on every run
        dark = hour >= 1 and zlib.crc32(nid.encode()) % 5 != 0
        eta = 9 if dark else 0
        sr = shortest(m["mix"])
        gap = round(max(0.0, (eta - sr) * min(1.0, hour/4)), 1) if dark else 0.0
        tier = "critical" if gap > 4 else ("warning" if gap > 0 else "safe")
        rows.append({"npu_id":nid,"is_dark":dark,"utility_eta_hours":eta,
            "shortest_runtime_hours":sr,"exposure_gap_hours":gap,"tier":tier,
            "people_at_risk":m["est"] if dark else 0})
    series[hour] = {"hour":hour,"npus":rows}
json.dump(series, open("mocks/exposure.json","w"), indent=2)

SITES = [("lib-001","Central Library","library",33.7615,-84.3877),
         ("lib-002","West End Branch","library",33.7360,-84.4135),
         ("fire-014","Station 14","fire_station",33.7720,-84.3650),
         ("rec-003","Grant Park Rec","rec_center",33.7370,-84.3700),
         ("rec-009","Adamsville Rec","rec_center",33.7570,-84.4880),
         ("lib-007","Buckhead Branch","library",33.8400,-84.3800),
         ("fire-021","Station 21","fire_station",33.7000,-84.3900)]
sites=[]
for sid,name,typ,lat,lon in SITES:
    reach = not sid.endswith(("009","021","007"))
    assigned = random.sample(list(meta), 2) if reach else []
    sites.append({"site_id":sid,"name":name,"type":typ,"lat":lat,"lon":lon,
        "capacity":random.choice([60,80,120,150]),"transit_reachable":reach,
        "assigned_npus":assigned,
        "people_served":sum(meta[a]["est"] for a in assigned)})
json.dump({"sites":sites}, open("mocks/sites.json","w"), indent=2)

crit = [r for r in series[6]["npus"] if r["tier"]=="critical"]
json.dump({"georgia_total":92233,"richmond_county":1647,
    "metro_atlanta_total":sum(m["est"] for m in meta.values()),
    "npus_critical":len(crit),
    "people_critical":sum(r["people_at_risk"] for r in crit)},
    open("mocks/stats.json","w"), indent=2)
print("wrote mocks/npus.json exposure.json sites.json stats.json")
