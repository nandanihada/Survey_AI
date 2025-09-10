#!/usr/bin/env python3

from mongodb_config import db
import json

def debug_postback_system():
    """Debug the entire postback system to understand the architecture"""
    print("🔍 Debugging Complete Postback System Architecture")
    print("=" * 70)
    
    # 1. Check postback shares (INBOUND - receivers)
    print("\n1️⃣ INBOUND SYSTEM - Postback Shares (We receive postbacks)")
    shares = list(db.postback_shares.find())
    print(f"   📊 Found {len(shares)} postback shares")
    for share in shares:
        print(f"   - Name: '{share.get('third_party_name', 'No name')}'")
        print(f"     Status: {share.get('status', 'No status')}")
        print(f"     Unique ID: {share.get('unique_postback_id', 'No ID')}")
        print(f"     Parameters: {len(share.get('parameters', {}))}")
        print()
    
    # 2. Check partners (OUTBOUND - senders)
    print("\n2️⃣ OUTBOUND SYSTEM - Partners (We send postbacks to)")
    partners = list(db.partners.find())
    print(f"   📊 Found {len(partners)} partners")
    for partner in partners:
        print(f"   - Name: '{partner.get('name', 'No name')}'")
        print(f"     URL: {partner.get('url', 'No URL')}")
        print(f"     Status: {partner.get('status', 'No status')}")
        print()
    
    # 3. Check outbound logs
    print("\n3️⃣ OUTBOUND LOGS - Postbacks we sent")
    outbound_logs = list(db.outbound_postback_logs.find().sort("timestamp", -1).limit(5))
    print(f"   📊 Found {len(outbound_logs)} recent outbound logs")
    for log in outbound_logs:
        print(f"   - Partner: {log.get('partnerName', 'Unknown')}")
        print(f"     Status: {log.get('status', 'Unknown')}")
        print(f"     URL: {log.get('url', 'No URL')[:50]}...")
        print(f"     Time: {log.get('timestamp_str', 'No time')}")
        print()
    
    # 4. Check inbound logs
    print("\n4️⃣ INBOUND LOGS - Postbacks we received")
    inbound_logs = list(db.inbound_postback_logs.find().sort("timestamp", -1).limit(5))
    print(f"   📊 Found {len(inbound_logs)} recent inbound logs")
    for log in inbound_logs:
        print(f"   - Source: {log.get('name', 'Unknown')}")
        print(f"     Success: {log.get('success', False)}")
        print(f"     Transaction ID: {log.get('transaction_id', 'No ID')}")
        print(f"     Time: {log.get('timestamp_str', 'No time')}")
        print()
    
    # 5. Check the mismatch issue
    print("\n5️⃣ CHECKING BUTTON ISSUE - Partner vs Share Name Matching")
    share_names = [s.get('third_party_name', '') for s in shares]
    partner_names = [p.get('name', '') for p in partners]
    
    print(f"   📋 Share names: {share_names}")
    print(f"   📋 Partner names: {partner_names}")
    
    for share_name in share_names:
        if share_name in partner_names:
            print(f"   ✅ '{share_name}' - HAS matching partner (button should work)")
        else:
            print(f"   ❌ '{share_name}' - NO matching partner (button disabled)")
    
    # 6. Test database collections
    print(f"\n6️⃣ DATABASE COLLECTIONS STATUS")
    collections = db.list_collection_names()
    postback_collections = [c for c in collections if 'postback' in c.lower()]
    print(f"   📊 Postback-related collections: {postback_collections}")
    
    for collection in postback_collections:
        count = db[collection].count_documents({})
        print(f"   - {collection}: {count} documents")

if __name__ == "__main__":
    debug_postback_system()
