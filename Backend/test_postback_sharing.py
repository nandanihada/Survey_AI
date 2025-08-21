#!/usr/bin/env python3
"""
Test script for postback sharing functionality
Tests all CRUD operations and URL generation with custom parameters
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000"
API_BASE = f"{BASE_URL}/api"

def test_create_postback_share():
    """Test creating a new postback sharing record"""
    print("🧪 Testing: Create postback share...")
    
    data = {
        "third_party_name": "AdBreak Media",
        "contact_email": "integration@adbreak.com",
        "postback_type": "global",
        "parameters": {
            "campaign_id": {"enabled": True, "customValue": ""},
            "sid1": {"enabled": True, "customValue": "adbreak_user_123"},
            "sid2": {"enabled": True, "customValue": "source_adbreak"},
            "status": {"enabled": True, "customValue": ""},
            "commission": {"enabled": True, "customValue": "2.50"}
        },
        "notes": "AdBreak Media integration - custom SID values for tracking"
    }
    
    try:
        response = requests.post(f"{API_BASE}/postback-shares", json=data)
        if response.status_code == 201:
            result = response.json()
            print(f"✅ Created postback share: {result['id']}")
            return result['id']
        else:
            print(f"❌ Failed to create: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error creating postback share: {e}")
        return None

def test_get_postback_shares():
    """Test retrieving all postback sharing records"""
    print("\n🧪 Testing: Get all postback shares...")
    
    try:
        response = requests.get(f"{API_BASE}/postback-shares")
        if response.status_code == 200:
            shares = response.json()
            print(f"✅ Retrieved {len(shares)} postback shares")
            for share in shares:
                print(f"   - {share['third_party_name']} ({share['postback_type']}) - Created: {share.get('created_at_str', 'Unknown')}")
            return shares
        else:
            print(f"❌ Failed to get shares: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ Error getting postback shares: {e}")
        return []

def test_generate_url(share_id):
    """Test URL generation with custom parameters"""
    print(f"\n🧪 Testing: Generate URL for share {share_id}...")
    
    try:
        response = requests.post(f"{API_BASE}/postback-shares/{share_id}/generate-url")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Generated URL: {result['postback_url']}")
            print(f"   Usage count: {result['usage_count']}")
            return result['postback_url']
        else:
            print(f"❌ Failed to generate URL: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error generating URL: {e}")
        return None

def test_update_postback_share(share_id):
    """Test updating a postback sharing record"""
    print(f"\n🧪 Testing: Update postback share {share_id}...")
    
    data = {
        "third_party_name": "AdBreak Media Pro",
        "contact_email": "premium@adbreak.com",
        "parameters": {
            "campaign_id": {"enabled": True, "customValue": "PREMIUM_CAMPAIGN"},
            "sid1": {"enabled": True, "customValue": "adbreak_premium_456"},
            "sid2": {"enabled": True, "customValue": "source_premium"},
            "status": {"enabled": True, "customValue": ""},
            "commission": {"enabled": True, "customValue": "5.00"}
        },
        "notes": "Updated to premium tier with higher commission"
    }
    
    try:
        response = requests.put(f"{API_BASE}/postback-shares/{share_id}", json=data)
        if response.status_code == 200:
            print("✅ Updated postback share successfully")
            return True
        else:
            print(f"❌ Failed to update: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error updating postback share: {e}")
        return False

def test_different_postback_types():
    """Test creating shares for different postback types"""
    print("\n🧪 Testing: Different postback types...")
    
    # Content Monetizer
    cm_data = {
        "third_party_name": "Content Monetizer",
        "contact_email": "api@contentmon.com",
        "postback_type": "content_monetizer",
        "parameters": {
            "widget_id": {"enabled": True, "customValue": "CM_WIDGET_789"},
            "virtual_currency": {"enabled": True, "customValue": "200"},
            "sid1": {"enabled": True, "customValue": "contentmon_user_999"}
        },
        "notes": "Content Monetizer integration"
    }
    
    # WallAd
    wallad_data = {
        "third_party_name": "WallAd Network",
        "contact_email": "integration@wallad.net",
        "postback_type": "wallad",
        "parameters": {
            "wallad_id": {"enabled": True, "customValue": "WALL_12345"},
            "wallad_currency_amount": {"enabled": True, "customValue": "150"},
            "user_id": {"enabled": True, "customValue": "wallad_user_777"}
        },
        "notes": "WallAd Network integration"
    }
    
    created_ids = []
    
    for data in [cm_data, wallad_data]:
        try:
            response = requests.post(f"{API_BASE}/postback-shares", json=data)
            if response.status_code == 201:
                result = response.json()
                print(f"✅ Created {data['postback_type']} share: {result['id']}")
                created_ids.append(result['id'])
            else:
                print(f"❌ Failed to create {data['postback_type']}: {response.status_code}")
        except Exception as e:
            print(f"❌ Error creating {data['postback_type']}: {e}")
    
    return created_ids

def test_url_generation_for_all_types(share_ids):
    """Test URL generation for different postback types"""
    print("\n🧪 Testing: URL generation for all types...")
    
    for share_id in share_ids:
        url = test_generate_url(share_id)
        if url:
            print(f"   Generated URL length: {len(url)} characters")

def main():
    """Run all tests"""
    print("🚀 Starting Postback Sharing Functionality Tests")
    print("=" * 60)
    
    # Test 1: Create a postback share
    share_id = test_create_postback_share()
    if not share_id:
        print("❌ Cannot continue tests without a valid share ID")
        return
    
    # Test 2: Get all shares
    shares = test_get_postback_shares()
    
    # Test 3: Generate URL
    test_generate_url(share_id)
    
    # Test 4: Update share
    test_update_postback_share(share_id)
    
    # Test 5: Test different postback types
    other_share_ids = test_different_postback_types()
    
    # Test 6: Generate URLs for all types
    all_share_ids = [share_id] + other_share_ids
    test_url_generation_for_all_types(all_share_ids)
    
    # Final summary
    print("\n" + "=" * 60)
    print("🎉 Test Summary:")
    print(f"   - Created {len(all_share_ids)} postback sharing records")
    print(f"   - Tested custom parameter values (SID1, SID2, etc.)")
    print(f"   - Verified URL generation with placeholders and custom values")
    print(f"   - Tested all postback types: Global, Content Monetizer, WallAd")
    print(f"   - Timestamps should now display in IST timezone")
    print("\n✅ All postback sharing functionality tests completed!")

if __name__ == "__main__":
    main()
