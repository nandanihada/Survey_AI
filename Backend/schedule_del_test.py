import requests
from collections import Counter

OFFER_URL = "http://localhost:5000/track/click?offer_id=ML-00037&campaign_id=44&target=https%253A%252F%252Fpractice.geeksforgeeks.org%252Fexplore%252F%253FproblemType%253Dfull%2526difficulty%25255B%25255D%253D-2%2526page%253D1"

results = []

for i in range(10):  # test with 10 first
    try:
        r = requests.get(OFFER_URL, allow_redirects=False, timeout=5)
        print(f"Status: {r.status_code}")
        print(f"Headers: {r.headers}")
        dest = r.headers.get("Location")
        results.append(dest)
    except Exception as e:
        print(f"Error: {e}")

# Check results
print("Collected Results:", results)

# Count how many times each link was selected
counts = Counter(results)
for link, count in counts.items():
    if link:
        percent = (count / 10) * 100
        print(f"{link} → {count} clicks ({percent:.2f}%)")
    else:
        print("❌ No redirect returned for some requests")
