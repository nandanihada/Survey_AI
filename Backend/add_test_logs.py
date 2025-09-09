import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongodb_config import db
from datetime import datetime

# Add test outbound log
outbound_log = {
    "timestamp": datetime.utcnow(),
    "url": "https://test.com/postback?click_id=123",
    "success": True,
    "response_code": 200,
    "partner_name": "Test Partner"
}

# Add test inbound log
inbound_log = {
    "timestamp": datetime.utcnow(),
    "type": "postback",
    "success": True,
    "click_id": "test123",
    "source_ip": "192.168.1.1"
}

try:
    db.outbound_postback_logs.insert_one(outbound_log)
    db.inbound_postback_logs.insert_one(inbound_log)
    print("Test logs added successfully")
except Exception as e:
    print(f"Error: {e}")
