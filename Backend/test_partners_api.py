#!/usr/bin/env python3

import requests
import json

def test_partners_api():
    """Test the partners API endpoints"""
    
    BASE_URL = "http://localhost:5000"
    
    print("🧪 TESTING PARTNERS API")
    print("="*40)
    
    # Test 1: Get existing partners
    print("\n1. Testing GET /api/partners...")
    try:
        response = requests.get(f"{BASE_URL}/api/partners")
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        if response.status_code == 200:
            partners = response.json()
            print(f"✅ Found {len(partners)} partners")
            if partners:
                print(f"Sample partner: {partners[0]}")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    # Test 2: Create new partner
    print("\n2. Testing POST /api/partners...")
    try:
        partner_data = {
            "name": "API Test Partner",
            "url": "https://api-test.com/postback?id={transaction_id}&status={status}",
            "status": "active"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partners",
            headers={"Content-Type": "application/json"},
            json=partner_data
        )
        
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Response text: {response.text}")
        
        if response.status_code == 201:
            new_partner = response.json()
            print(f"✅ Created partner: {new_partner}")
        else:
            print(f"❌ Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    print(f"\n🎯 PARTNERS API TEST COMPLETE")
    print("="*40)

if __name__ == "__main__":
    test_partners_api()
