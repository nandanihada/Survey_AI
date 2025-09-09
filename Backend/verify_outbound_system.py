import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongodb_config import db
from datetime import datetime

print("Checking outbound postback system...")

# Check if partners collection exists and has data
try:
    partners_count = db.partners.count_documents({})
    active_partners = db.partners.count_documents({"status": "active"})
    print(f"Partners: {partners_count} total, {active_partners} active")
    
    if active_partners == 0:
        print("Creating test partner...")
        test_partner = {
            "name": "Test Partner",
            "url": "https://httpbin.org/get?transaction_id=[TRANSACTION_ID]&reward=[REWARD]",
            "status": "active",
            "created_at": datetime.utcnow()
        }
        db.partners.insert_one(test_partner)
        print("✅ Test partner created")
    
    # Check outbound logs
    outbound_logs = db.outbound_postback_logs.count_documents({})
    print(f"Outbound logs: {outbound_logs}")
    
    print("✅ System ready for testing")
    
except Exception as e:
    print(f"Error: {e}")
