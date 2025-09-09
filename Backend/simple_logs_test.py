import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongodb_config import db
from datetime import datetime

print("Testing postback logs...")

# Check database connection
if db is None:
    print("❌ No database connection")
    exit(1)

print("✅ Database connected")

# Check collections
collections = db.list_collection_names()
print(f"Collections: {collections}")

# Check outbound logs
outbound_count = db.outbound_postback_logs.count_documents({})
print(f"Outbound logs: {outbound_count}")

# Check inbound logs  
inbound_count = db.inbound_postback_logs.count_documents({})
print(f"Inbound logs: {inbound_count}")

# Create test logs if none exist
if outbound_count == 0:
    print("Creating test outbound log...")
    test_log = {
        "timestamp": datetime.utcnow(),
        "url": "https://test.com/postback",
        "success": True,
        "response_code": 200
    }
    db.outbound_postback_logs.insert_one(test_log)
    print("✅ Test outbound log created")

if inbound_count == 0:
    print("Creating test inbound log...")
    test_log = {
        "timestamp": datetime.utcnow(),
        "type": "postback",
        "success": True,
        "click_id": "test123"
    }
    db.inbound_postback_logs.insert_one(test_log)
    print("✅ Test inbound log created")

print("Done!")
