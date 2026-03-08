"""
Rebuilds hectare_data.json from source CSV files.
Run whenever CSVs are updated: python rebuild-data.py

Source files (update these paths if files move):
  HECTARES_CSV  - one row per NFT/hectare, must have columns: nftid, latitude, longitude
  SOI_CSV       - sites of interest (red dots), must have columns: latitude, longitude
  ROI_CSV       - forest boundary polygon, must have columns: latitude, longitude (ordered)
"""
import csv
import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))
OUT_FILE = os.path.join(BASE, 'site', 'carboncollectiblenfts.com', 'static', 'data', 'hectare_data.json')

HECTARES_CSV = r'E:\CarbonCollectibles\Satellite Nav\Plots\avatime_map.csv'
SOI_CSV      = r'E:\CarbonCollectibles\Satellite Nav\Segments\New Segment\avatime_production_soi_2022-07-29T00_03_33.271Z.csv'
ROI_CSV      = r'E:\CarbonCollectibles\Satellite Nav\Forest\avatime_test_2022-06-29T03_23_44.783Z.csv'

# --- Hectares (nftid -> [lat, lng]) ---
print('Reading hectares...')
hectares = {}
with open(HECTARES_CSV, newline='') as f:
    for row in csv.DictReader(f):
        hectares[row['nftid']] = [float(row['latitude']), float(row['longitude'])]
print(f'  {len(hectares)} hectares loaded (nftid range: {min(int(k) for k in hectares)}-{max(int(k) for k in hectares)})')

# --- Sites of interest (red dots) ---
print('Reading sites of interest...')
soi_lats, soi_lngs = [], []
with open(SOI_CSV, newline='') as f:
    for row in csv.DictReader(f):
        soi_lats.append(float(row['latitude']))
        soi_lngs.append(float(row['longitude']))
print(f'  {len(soi_lats)} SOI points loaded')

# --- Forest boundary polygon ---
print('Reading forest boundary...')
roi_lats, roi_lngs = [], []
with open(ROI_CSV, newline='') as f:
    for row in csv.DictReader(f):
        roi_lats.append(float(row['latitude']))
        roi_lngs.append(float(row['longitude']))
print(f'  {len(roi_lats)} boundary points loaded')

# --- Sub-divisions (static — loaded from existing JSON if present) ---
sub_divisions = []
if os.path.exists(OUT_FILE):
    with open(OUT_FILE) as f:
        existing = json.load(f)
    sub_divisions = existing.get('static', {}).get('sub_divisions', [])
    print(f'  Keeping {len(sub_divisions)} existing sub_divisions')

# --- Write output ---
output = {
    'static': {
        'roi_coords': [roi_lats, roi_lngs],
        'soi_info':   [soi_lats, soi_lngs],
        'sub_divisions': sub_divisions,
    },
    'hectares': hectares,
}

os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
with open(OUT_FILE, 'w') as f:
    json.dump(output, f, separators=(',', ':'))

size_kb = os.path.getsize(OUT_FILE) // 1024
print(f'\nSaved to {OUT_FILE} ({size_kb} KB)')
print('Done. Restart the server to pick up the new data.')
