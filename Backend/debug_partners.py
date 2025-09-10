#!/usr/bin/env python3

from mongodb_config import db

def debug_partners_and_shares():
    """Debug partners and postback shares to identify the mismatch"""
    print("🔍 Debugging Partners and Postback Shares")
    print("=" * 60)
    
    # Check existing partners
    print("\n1️⃣ Existing Partners in Database:")
    partners = list(db.partners.find())
    if partners:
        for partner in partners:
            print(f"   - Name: '{partner.get('name', 'No name')}'")
            print(f"     URL: {partner.get('url', 'No URL')}")
            print(f"     Status: {partner.get('status', 'No status')}")
            print()
    else:
        print("   ❌ No partners found in database!")
    
    # Check existing postback shares
    print("\n2️⃣ Existing Postback Shares:")
    shares = list(db.postback_shares.find())
    if shares:
        for share in shares:
            print(f"   - Third Party Name: '{share.get('third_party_name', 'No name')}'")
            print(f"     Status: {share.get('status', 'No status')}")
            print(f"     Unique ID: {share.get('unique_postback_id', 'No ID')}")
            print()
    else:
        print("   ❌ No postback shares found!")
    
    # Check for mismatches
    print("\n3️⃣ Checking for Name Mismatches:")
    partner_names = [p.get('name', '') for p in partners]
    share_names = [s.get('third_party_name', '') for s in shares]
    
    print(f"   Partner names: {partner_names}")
    print(f"   Share names: {share_names}")
    
    missing_partners = []
    for share_name in share_names:
        if share_name not in partner_names:
            missing_partners.append(share_name)
    
    if missing_partners:
        print(f"\n❌ Missing Partners for Shares: {missing_partners}")
        print("\n4️⃣ Creating Missing Partners:")
        
        for missing_name in missing_partners:
            # Create a default partner entry
            new_partner = {
                "name": missing_name,
                "url": f"https://example.com/postback?transaction_id=[TRANSACTION_ID]&reward=[REWARD]&partner={missing_name.replace(' ', '_').lower()}",
                "status": "active",
                "created_at": db.partners.find_one() and db.partners.find_one().get('created_at') or None
            }
            
            result = db.partners.insert_one(new_partner)
            print(f"   ✅ Created partner: {missing_name}")
            print(f"      URL: {new_partner['url']}")
            print(f"      ID: {result.inserted_id}")
    else:
        print("   ✅ All shares have matching partners!")

if __name__ == "__main__":
    debug_partners_and_shares()
