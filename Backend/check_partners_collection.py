#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mongodb_config import db
from datetime import datetime

print("Checking partners collection...")

try:
    # Check if partners collection exists
    partners_count = db.partners.count_documents({})
    print(f"Partners collection has {partners_count} documents")
    
    if partners_count == 0:
        print("Creating sample partners...")
        
        sample_partners = [
            {
                "name": "New Partner",
                "url": "https://newpartner.com/track?subid=[TRANSACTION_ID]&payout=[REWARD]",
                "status": "active",
                "created_at": datetime.utcnow()
            },
            {
                "name": "wini woods", 
                "url": "http://www.ads-ads.co/pb?adv_section=4yJH9QE&id={clickid}&adv_cvvalue={payout}",
                "status": "active",
                "created_at": datetime.utcnow()
            }
        ]
        
        result = db.partners.insert_many(sample_partners)
        print(f"✅ Created {len(result.inserted_ids)} sample partners")
    
    # List all partners
    partners = list(db.partners.find())
    print("\nCurrent partners:")
    for partner in partners:
        print(f"- {partner.get('name', 'Unknown')}: {partner.get('url', 'No URL')} ({partner.get('status', 'unknown')})")
    
    print("\n✅ Partners collection ready")
    
except Exception as e:
    print(f"❌ Error: {e}")
