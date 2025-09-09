#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongodb_config import db
from datetime import datetime, timedelta
import random

def create_sample_logs():
    """Create sample postback logs for testing"""
    
    if db is None:
        print("❌ No database connection")
        return False
    
    print("🔍 Creating sample postback logs...")
    
    # Create sample outbound postback logs
    outbound_logs = []
    for i in range(5):
        log = {
            "timestamp": datetime.utcnow() - timedelta(minutes=random.randint(1, 1440)),
            "url": f"https://partner{i+1}.com/postback?click_id=test{i+1}&payout={random.randint(1, 10)}.00",
            "method": "GET",
            "success": random.choice([True, False]),
            "response_code": random.choice([200, 404, 500]),
            "response_message": random.choice(["OK", "Not Found", "Internal Server Error"]),
            "partner_name": f"Test Partner {i+1}",
            "parameters": {
                "click_id": f"test{i+1}",
                "payout": f"{random.randint(1, 10)}.00",
                "currency": "USD",
                "offer_id": f"OFFER{i+1}",
                "conversion_status": random.choice(["confirmed", "pending", "reversed"])
            },
            "execution_time_ms": random.randint(100, 2000)
        }
        outbound_logs.append(log)
    
    # Insert outbound logs
    result = db.outbound_postback_logs.insert_many(outbound_logs)
    print(f"✅ Created {len(result.inserted_ids)} outbound postback logs")
    
    # Create sample inbound postback logs
    inbound_logs = []
    for i in range(7):
        log = {
            "timestamp": datetime.utcnow() - timedelta(minutes=random.randint(1, 1440)),
            "type": "postback",
            "source_ip": f"192.168.1.{random.randint(1, 255)}",
            "user_agent": f"Mozilla/5.0 Test Agent {i+1}",
            "url_called": f"/postback-handler/uuid-{i+1}?click_id=inbound{i+1}&payout={random.randint(2, 8)}.50",
            "success": random.choice([True, False]),
            "click_id": f"inbound{i+1}",
            "payout": f"{random.randint(2, 8)}.50",
            "currency": "USD",
            "offer_id": f"INBOUND_OFFER{i+1}",
            "conversion_status": random.choice(["confirmed", "pending", "reversed"]),
            "transaction_id": f"TXN{i+1}_{random.randint(1000, 9999)}",
            "sub1": f"sub1_value_{i+1}",
            "sub2": f"sub2_value_{i+1}",
            "event_name": random.choice(["conversion", "lead", "sale", "signup"]),
            "unique_id": f"uuid-{i+1}",
            "response_message": random.choice(["Success", "Invalid parameters", "Server error"]),
            "error_message": None if random.choice([True, False]) else "Sample error message"
        }
        inbound_logs.append(log)
    
    # Insert inbound logs
    result = db.inbound_postback_logs.insert_many(inbound_logs)
    print(f"✅ Created {len(result.inserted_ids)} inbound postback logs")
    
    # Verify counts
    outbound_count = db.outbound_postback_logs.count_documents({})
    inbound_count = db.inbound_postback_logs.count_documents({})
    
    print(f"📊 Total outbound logs: {outbound_count}")
    print(f"📊 Total inbound logs: {inbound_count}")
    
    return True

if __name__ == "__main__":
    print("🚀 Creating Sample Postback Logs")
    print("=" * 40)
    
    success = create_sample_logs()
    
    if success:
        print("\n✅ Sample logs created successfully!")
        print("You can now test the postback logs endpoints.")
    else:
        print("\n❌ Failed to create sample logs.")
