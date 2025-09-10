#!/usr/bin/env python3

from mongodb_config import db
from datetime import datetime

def fix_missing_partners():
    """Create missing partner entries for existing postback shares"""
    print("🔧 Fixing Missing Partners for Postback Shares")
    print("=" * 60)
    
    # Get all postback shares
    shares = list(db.postback_shares.find())
    existing_partners = list(db.partners.find())
    
    partner_names = [p.get('name', '') for p in existing_partners]
    
    print(f"📊 Found {len(shares)} postback shares")
    print(f"📊 Found {len(existing_partners)} existing partners")
    print(f"🏷️  Existing partner names: {partner_names}")
    
    created_count = 0
    
    for share in shares:
        share_name = share.get('third_party_name', '')
        
        if share_name and share_name not in partner_names:
            print(f"\n➕ Creating missing partner: '{share_name}'")
            
            # Create partner with a test URL
            new_partner = {
                "name": share_name,
                "url": f"https://httpbin.org/get?partner={share_name.replace(' ', '_').lower()}&transaction_id=[TRANSACTION_ID]&reward=[REWARD]&currency=[CURRENCY]&click_id=[CLICK_ID]",
                "status": "active",
                "created_at": datetime.utcnow()
            }
            
            try:
                result = db.partners.insert_one(new_partner)
                print(f"   ✅ Created partner with ID: {result.inserted_id}")
                print(f"   🔗 URL: {new_partner['url']}")
                partner_names.append(share_name)  # Add to list to avoid duplicates
                created_count += 1
            except Exception as e:
                print(f"   ❌ Error creating partner: {e}")
    
    if created_count == 0:
        print("\n✅ All postback shares already have matching partners!")
    else:
        print(f"\n🎉 Created {created_count} missing partners!")
        print("\n📝 Next steps:")
        print("   1. Refresh your PostbackManager page")
        print("   2. The blue 'Send Postback' buttons should now be clickable")
        print("   3. You can edit partner URLs by going to 'Manage Outbound Partners'")

if __name__ == "__main__":
    fix_missing_partners()
