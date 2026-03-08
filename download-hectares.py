"""
Downloads all hectare lat/lng data from satnavapp.com and saves locally.
Run once: python download-hectares.py
"""
import urllib.request
import json
import concurrent.futures
import sys
import os

API_BASE = "https://satnavapp.com/hectare_api/avatime_test"
MAX_HECTARE = 10435
CONCURRENCY = 50
OUT_FILE = os.path.join(os.path.dirname(__file__), "site", "carboncollectiblenfts.com", "static", "data", "hectare_data.json")

def fetch(hid):
    url = f"{API_BASE}/{hid}"
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            d = json.loads(r.read())
        if d["status"] == 200:
            return hid, d["data"]
        return hid, None
    except Exception:
        return hid, None

print(f"Fetching {MAX_HECTARE} hectares with {CONCURRENCY} workers...")

static_data = None
hlatllng_map = {}
failed = []

with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
    futures = {ex.submit(fetch, i): i for i in range(1, MAX_HECTARE + 1)}
    done = 0
    for fut in concurrent.futures.as_completed(futures):
        hid, data = fut.result()
        done += 1
        if data:
            hlatllng_map[hid] = data["hLatLng"]
            if static_data is None:
                static_data = {
                    "roi_coords": data["roi_coords"],
                    "soi_info": data["soi_info"],
                    "sub_divisions": data["sub_divisions"],
                }
        else:
            failed.append(hid)
        if done % 500 == 0:
            sys.stdout.write(f"\r  {done}/{MAX_HECTARE} ({len(failed)} failed)")
            sys.stdout.flush()

print(f"\nDone. {len(hlatllng_map)} fetched, {len(failed)} failed.")
if failed:
    print("Failed IDs (first 10):", failed[:10])

output = {
    "static": static_data,
    "hectares": hlatllng_map,
}

os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
with open(OUT_FILE, "w") as f:
    json.dump(output, f, separators=(",", ":"))

size_kb = os.path.getsize(OUT_FILE) // 1024
print(f"Saved to {OUT_FILE} ({size_kb} KB)")
