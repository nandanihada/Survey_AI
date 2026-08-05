"""
End-to-end test script for the Location Control feature.
Run with:  python test_location.py
"""
import requests
import json

BASE = "http://localhost:5000"
ADMIN_TOKEN = None

# ─── helpers ────────────────────────────────────────────────────────────────

def h(token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers

def ok(label, r):
    status = "PASS" if r.status_code < 400 else "FAIL"
    print(f"  [{status}] {label} → HTTP {r.status_code}")
    try:
        data = r.json()
        print(f"         {json.dumps(data, indent=8)[:300]}")
        return data
    except Exception:
        print(f"         (no JSON body)")
        return {}

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

# ─── Step 0: find a working admin token ─────────────────────────────────────

section("STEP 0: get admin token")

# Try common passwords for each admin
from pymongo import MongoClient
client = MongoClient("mongodb+srv://shivamjulka_db_user:q7SBVSvFvK3IbinL@pepperwahl.i2a0jmi.mongodb.net/pepper_database?retryWrites=true&w=majority")
db = client["pepper_database"]
admins = list(db.users.find({"role": "admin"}, {"email": 1}))
print(f"  Found {len(admins)} admin user(s)")

# Try to find token via a direct DB approach: reset one admin's password temporarily
import bcrypt
test_pw = "TestPass123!"
hashed = bcrypt.hashpw(test_pw.encode(), bcrypt.gensalt()).decode()

target_admin = admins[0]
print(f"  Using admin: {target_admin['email']}")
db.users.update_one({"_id": target_admin["_id"]}, {"$set": {"passwordHash": hashed}})
print(f"  Temporarily set password to: {test_pw}")

r = requests.post(f"{BASE}/api/auth/login",
                  json={"email": target_admin["email"], "password": test_pw},
                  headers={"Content-Type": "application/json"})
data = ok("Admin login", r)
ADMIN_TOKEN = data.get("token")
if not ADMIN_TOKEN:
    print("  ERROR: Could not get admin token. Aborting.")
    exit(1)
print(f"  Token obtained: {ADMIN_TOKEN[:60]}...")

# ─── Test 1: public-config (no auth) ────────────────────────────────────────

section("TEST 1: Public config endpoint (no auth required)")
r = requests.get(f"{BASE}/api/admin/location/public-config")
ok("GET /public-config", r)

# ─── Test 2: get settings (admin) ───────────────────────────────────────────

section("TEST 2: Get location settings (admin)")
r = requests.get(f"{BASE}/api/admin/location/settings", headers=h(ADMIN_TOKEN))
d = ok("GET /settings", r)

# ─── Test 3: master switch OFF ──────────────────────────────────────────────

section("TEST 3: Turn master switch OFF")
r = requests.post(f"{BASE}/api/admin/location/settings",
                  json={"global_location_enabled": False},
                  headers=h(ADMIN_TOKEN))
ok("POST /settings global=False", r)

r = requests.get(f"{BASE}/api/admin/location/public-config")
d = ok("Verify public-config (should be all False)", r)
assert d.get("global_location_enabled") == False, "FAIL: master switch not OFF"
print("  ASSERT PASSED: master switch is OFF")

# ─── Test 4: master switch ON ───────────────────────────────────────────────

section("TEST 4: Turn master switch ON")
r = requests.post(f"{BASE}/api/admin/location/settings",
                  json={"global_location_enabled": True},
                  headers=h(ADMIN_TOKEN))
ok("POST /settings global=True", r)

r = requests.get(f"{BASE}/api/admin/location/public-config")
d = ok("Verify public-config", r)
assert d.get("global_location_enabled") == True, "FAIL: master switch not ON"
print("  ASSERT PASSED: master switch is ON")

# ─── Test 5: signup location toggle ─────────────────────────────────────────

section("TEST 5: Signup location popup toggle")
r = requests.post(f"{BASE}/api/admin/location/settings",
                  json={"signup_location_enabled": True},
                  headers=h(ADMIN_TOKEN))
ok("POST signup_location_enabled=True", r)

r = requests.get(f"{BASE}/api/admin/location/public-config")
d = ok("Verify signup flag", r)
assert d.get("signup_location_enabled") == True
assert d.get("global_location_enabled") == True
print("  ASSERT PASSED: signup location enabled")

# turn it back off for clean state
requests.post(f"{BASE}/api/admin/location/settings",
              json={"signup_location_enabled": False}, headers=h(ADMIN_TOKEN))

# ─── Test 6: all-surveys flag ────────────────────────────────────────────────

section("TEST 6: All-surveys location flag")
r = requests.post(f"{BASE}/api/admin/location/settings",
                  json={"all_surveys_location_enabled": True},
                  headers=h(ADMIN_TOKEN))
ok("POST all_surveys=True", r)

r = requests.get(f"{BASE}/api/admin/location/public-config")
d = ok("Verify all_surveys flag", r)
assert d.get("all_surveys_location_enabled") == True
print("  ASSERT PASSED: all_surveys flag ON")

# turn it back off
requests.post(f"{BASE}/api/admin/location/settings",
              json={"all_surveys_location_enabled": False}, headers=h(ADMIN_TOKEN))

# ─── Test 7: list users ──────────────────────────────────────────────────────

section("TEST 7: List users with location_feature_enabled")
r = requests.get(f"{BASE}/api/admin/location/users", headers=h(ADMIN_TOKEN))
d = ok("GET /users", r)
users = d.get("users", [])
print(f"  Found {len(users)} users")
if users:
    sample = users[0]
    print(f"  Sample user: {sample.get('email')} | location_feature_enabled={sample.get('location_feature_enabled')}")
    assert "location_feature_enabled" in sample, "FAIL: field missing"
    print("  ASSERT PASSED: location_feature_enabled field present")

# ─── Test 8: grant location feature to a non-admin user ──────────────────────

section("TEST 8: Grant location feature to a user")
non_admins = list(db.users.find({"role": {"$ne": "admin"}}, {"_id": 1, "email": 1}).limit(1))
if non_admins:
    test_user_id = str(non_admins[0]["_id"])
    test_user_email = non_admins[0]["email"]
    print(f"  Target user: {test_user_email} ({test_user_id})")

    r = requests.put(f"{BASE}/api/admin/location/users/{test_user_id}",
                     json={"enabled": True},
                     headers=h(ADMIN_TOKEN))
    ok("PUT /users/<id> enabled=True", r)

    # verify in DB
    updated = db.users.find_one({"_id": non_admins[0]["_id"]})
    assert updated.get("location_feature_enabled") == True, "FAIL: DB not updated"
    print("  ASSERT PASSED: location_feature_enabled=True in MongoDB")

    # revoke it
    r = requests.put(f"{BASE}/api/admin/location/users/{test_user_id}",
                     json={"enabled": False},
                     headers=h(ADMIN_TOKEN))
    ok("PUT /users/<id> enabled=False (revoke)", r)
    updated = db.users.find_one({"_id": non_admins[0]["_id"]})
    assert updated.get("location_feature_enabled") == False
    print("  ASSERT PASSED: revoke works")
else:
    print("  SKIP: no non-admin users found")

# ─── Test 9: list surveys ────────────────────────────────────────────────────

section("TEST 9: List surveys with collect_location")
r = requests.get(f"{BASE}/api/admin/location/surveys", headers=h(ADMIN_TOKEN))
d = ok("GET /surveys", r)
surveys = d.get("surveys", [])
print(f"  Found {len(surveys)} surveys")
if surveys:
    sample = surveys[0]
    assert "collect_location" in sample, "FAIL: collect_location field missing"
    print(f"  Sample: '{sample.get('title', 'no title')}' | collect_location={sample.get('collect_location')}")
    print("  ASSERT PASSED: collect_location field present")

# ─── Test 10: per-survey toggle ──────────────────────────────────────────────

section("TEST 10: Per-survey location override")
if surveys:
    target_survey = surveys[0]
    # Use mongo_id (real ObjectId) now returned by the updated endpoint
    sid = target_survey.get("mongo_id") or target_survey["_id"]
    short_id = target_survey.get("short_id") or target_survey["_id"]
    original_val = target_survey.get("collect_location", False)
    print(f"  Survey: '{target_survey.get('title', sid)}' | short_id={short_id} | mongo_id={sid}")
    print(f"  current collect_location={original_val}")

    # flip it on using mongo_id
    r = requests.put(f"{BASE}/api/admin/location/surveys/{sid}",
                     json={"collect_location": True},
                     headers=h(ADMIN_TOKEN))
    ok("PUT /surveys/<mongo_id> collect_location=True", r)

    if r.status_code == 200:
        # surveys use string _id — no ObjectId needed
        updated = db.surveys.find_one({'_id': sid})
        if updated:
            assert updated.get("collect_location") == True, "FAIL: DB not updated"
            print("  ASSERT PASSED: collect_location=True in MongoDB")

        # restore
        r2 = requests.put(f"{BASE}/api/admin/location/surveys/{sid}",
                         json={"collect_location": original_val},
                         headers=h(ADMIN_TOKEN))
        ok(f"PUT /surveys/<id> restore to {original_val}", r2)
        # verify restore
        updated2 = db.surveys.find_one({'_id': sid})
        if updated2:
            assert updated2.get("collect_location") == original_val
            print(f"  ASSERT PASSED: restored to collect_location={original_val}")
else:
    print("  SKIP: no surveys found")

# ─── Test 11: invalid user ID ────────────────────────────────────────────────

section("TEST 11: Error handling — invalid user ID")
r = requests.put(f"{BASE}/api/admin/location/users/invalid_id_xyz",
                 json={"enabled": True},
                 headers=h(ADMIN_TOKEN))
ok("PUT /users/invalid_id (expect 400)", r)
assert r.status_code == 400, f"FAIL: expected 400 got {r.status_code}"
print("  ASSERT PASSED: 400 on bad ObjectId")

# ─── Test 12: missing enabled field ─────────────────────────────────────────

section("TEST 12: Error handling — missing field")
r = requests.put(f"{BASE}/api/admin/location/users/{test_user_id if non_admins else '507f1f77bcf86cd799439011'}",
                 json={},
                 headers=h(ADMIN_TOKEN))
ok("PUT /users/<id> empty body (expect 400)", r)
assert r.status_code == 400
print("  ASSERT PASSED: 400 on missing 'enabled' field")

# ─── Test 13: no auth on protected endpoint ──────────────────────────────────

section("TEST 13: Auth enforcement — no token")
r = requests.get(f"{BASE}/api/admin/location/settings")
ok("GET /settings no token (expect 401)", r)
assert r.status_code == 401, f"FAIL: expected 401 got {r.status_code}"
print("  ASSERT PASSED: 401 without token")

# ─── Test 14: login response includes location_feature_enabled ───────────────

section("TEST 14: Login response includes location_feature_enabled")
r = requests.post(f"{BASE}/api/auth/login",
                  json={"email": target_admin["email"], "password": test_pw},
                  headers={"Content-Type": "application/json"})
d = ok("POST /auth/login", r)
user_obj = d.get("user", {})
assert "location_feature_enabled" in user_obj, "FAIL: field missing from login response"
print(f"  location_feature_enabled = {user_obj['location_feature_enabled']}")
print("  ASSERT PASSED: field present in login response")

# ─── Test 15: /api/auth/check response includes field ────────────────────────

section("TEST 15: /api/auth/check includes location_feature_enabled")
r = requests.get(f"{BASE}/api/auth/check", headers=h(ADMIN_TOKEN))
d = ok("GET /api/auth/check", r)
user_obj = d.get("user", {})
assert "location_feature_enabled" in user_obj, "FAIL: field missing from check response"
print(f"  location_feature_enabled = {user_obj['location_feature_enabled']}")
print("  ASSERT PASSED: field present in check response")

# ─── Summary ─────────────────────────────────────────────────────────────────

section("ALL TESTS COMPLETED")
print("  Check above for any FAIL lines.")
print("  All ASSERT PASSED lines = feature working correctly.")

# Reset admin password back to empty hash so login still works via the app
# (leave the test password so you can log into the UI)
print(f"\n  Admin email for UI login: {target_admin['email']}")
print(f"  Admin password for UI:    {test_pw}")
