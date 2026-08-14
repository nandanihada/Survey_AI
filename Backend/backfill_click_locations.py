"""
One-time backfill: resolve geo for all survey_clicks records that have an IP but no location.
Run once:  python backfill_click_locations.py
ip-api.com free tier: 45 req/min, so we add a small delay between batches.
"""
import time
import requests
from mongodb_config import db

SKIP_IPS = {'unknown', '127.0.0.1', '::1', 'localhost', '0.0.0.0', ''}
BATCH = 40          # stay under the 45 req/min free limit
DELAY = 62          # seconds between batches (>60s resets the rate limit window)

def geo_from_ip(ip: str) -> dict:
    try:
        r = requests.get(
            f"http://ip-api.com/json/{ip}?fields=status,country,regionName,city",
            timeout=4
        )
        if r.status_code == 200:
            d = r.json()
            if d.get('status') == 'success':
                return {
                    'city': d.get('city', ''),
                    'region': d.get('regionName', ''),
                    'country': d.get('country', ''),
                }
    except Exception as e:
        print(f"  ⚠️  {ip} → {e}")
    return {}

# Collect unique IPs needing resolution
print("Scanning survey_clicks for missing locations...")
ip_to_ids: dict = {}   # ip -> list of _id
for rec in db.survey_clicks.find(
    {'$or': [{'location': {'$exists': False}}, {'location': {}}, {'location.country': ''}]},
    {'_id': 1, 'ip_address': 1}
):
    ip = rec.get('ip_address', '').strip()
    if ip and ip not in SKIP_IPS:
        ip_to_ids.setdefault(ip, []).append(rec['_id'])

unique_ips = list(ip_to_ids.keys())
print(f"Found {len(unique_ips)} unique IPs to resolve across "
      f"{sum(len(v) for v in ip_to_ids.values())} records.")

if not unique_ips:
    print("Nothing to do.")
    raise SystemExit(0)

resolved = 0
failed = 0

for i in range(0, len(unique_ips), BATCH):
    batch = unique_ips[i:i + BATCH]
    print(f"\nBatch {i // BATCH + 1}: resolving {len(batch)} IPs …")

    for ip in batch:
        geo = geo_from_ip(ip)
        if geo:
            ids = ip_to_ids[ip]
            result = db.survey_clicks.update_many(
                {'_id': {'$in': ids}},
                {'$set': {'location': geo}}
            )
            print(f"  ✅  {ip} → {geo['city']}, {geo['country']}  ({result.modified_count} records)")
            resolved += result.modified_count
        else:
            print(f"  ❌  {ip} → no data")
            failed += 1

    # Rate-limit pause between batches (skip after the last batch)
    if i + BATCH < len(unique_ips):
        print(f"  ⏳  Waiting {DELAY}s to respect ip-api rate limit…")
        time.sleep(DELAY)

print(f"\n✅  Done. Resolved {resolved} records. {failed} IPs returned no data.")
