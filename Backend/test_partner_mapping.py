#!/usr/bin/env python3

import requests
import json
from datetime import datetime

# Test the partner mapping system
BASE_URL = "http://localhost:5000"

def test_partner_mapping_system():
    """Test the complete partner mapping workflow"""
    
    print("🧪 TESTING PARTNER MAPPING SYSTEM")
    print("="*50)
    
    # Test 1: Get available data fields
    print("\n1. Testing available data fields endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/available-data-fields")
        if response.status_code == 200:
            fields = response.json()
            print(f"✅ Available fields: {len(fields['available_fields'])} fields")
            print(f"   Sample fields: {list(fields['available_fields'].keys())[:5]}")
        else:
            print(f"❌ Failed to get available fields: {response.status_code}")
    except Exception as e:
        print(f"❌ Error getting available fields: {e}")
    
    # Test 2: Get existing partners
    print("\n2. Testing partners endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/partners")
        if response.status_code == 200:
            partners = response.json()
            print(f"✅ Found {len(partners)} partners")
            if partners:
                print(f"   Sample partner: {partners[0].get('name', 'Unknown')}")
        else:
            print(f"❌ Failed to get partners: {response.status_code}")
    except Exception as e:
        print(f"❌ Error getting partners: {e}")
    
    # Test 3: Create a test partner if none exist
    print("\n3. Creating test partner...")
    try:
        test_partner_data = {
            "name": "Test Partner for Mapping",
            "url": "https://test-partner.com/postback?txn_id={transaction_id}&user={username}&amount={payout}",
            "status": "active"
        }
        
        response = requests.post(f"{BASE_URL}/api/partners", json=test_partner_data)
        if response.status_code == 201:
            partner = response.json()
            partner_id = partner['id']
            print(f"✅ Created test partner: {partner['name']} (ID: {partner_id})")
        else:
            print(f"❌ Failed to create test partner: {response.status_code}")
            print(f"   Response: {response.text}")
            return
    except Exception as e:
        print(f"❌ Error creating test partner: {e}")
        return
    
    # Test 4: Create a survey-partner mapping
    print("\n4. Creating survey-partner mapping...")
    try:
        # Use a real survey ID
        test_survey_id = "66dda76b-6e75-4371-927c-be8b11c0815f"  # Real survey ID
        
        mapping_data = {
            "survey_id": test_survey_id,
            "partner_id": partner_id,
            "postback_url": "https://test-partner.com/postback?txn_id={transaction_id}&user={username}&amount={payout}&status={status}",
            "parameter_mappings": {
                "transaction_id": "txn_id",
                "username": "user", 
                "payout": "amount",
                "status": "status",
                "email": "customer_email"
            },
            "send_on_completion": True,
            "send_on_failure": False
        }
        
        response = requests.post(f"{BASE_URL}/api/survey-partner-mappings", json=mapping_data)
        if response.status_code == 201:
            mapping = response.json()
            mapping_id = mapping['mapping']['id']
            print(f"✅ Created survey-partner mapping (ID: {mapping_id})")
            print(f"   Parameter mappings: {mapping['mapping']['parameter_mappings']}")
        else:
            print(f"❌ Failed to create mapping: {response.status_code}")
            print(f"   Response: {response.text}")
            return
    except Exception as e:
        print(f"❌ Error creating mapping: {e}")
        return
    
    # Test 5: Get mappings for the survey
    print("\n5. Getting survey mappings...")
    try:
        response = requests.get(f"{BASE_URL}/api/survey-partner-mappings/{test_survey_id}")
        if response.status_code == 200:
            mappings_data = response.json()
            mappings = mappings_data['mappings']
            print(f"✅ Found {len(mappings)} mappings for survey {test_survey_id}")
            if mappings:
                mapping = mappings[0]
                print(f"   Mapping: {mapping['partner_name']} → {mapping['postback_url']}")
                print(f"   Parameters: {mapping['parameter_mappings']}")
        else:
            print(f"❌ Failed to get mappings: {response.status_code}")
    except Exception as e:
        print(f"❌ Error getting mappings: {e}")
    
    # Test 6: Test the parameter mapping function
    print("\n6. Testing parameter mapping function...")
    try:
        from survey_partner_mapping_api import build_mapped_postback_url
        
        base_url = "https://test-partner.com/postback?txn_id={transaction_id}&user={username}&amount={payout}&status={status}"
        parameter_mappings = {
            "transaction_id": "txn_id",
            "username": "user",
            "payout": "amount", 
            "status": "status"
        }
        survey_data = {
            "transaction_id": "TXN123456",
            "username": "test_user",
            "payout": "5.00",
            "status": "completed"
        }
        
        final_url = build_mapped_postback_url(base_url, parameter_mappings, survey_data)
        print(f"✅ Parameter mapping test successful")
        print(f"   Original: {base_url}")
        print(f"   Final:    {final_url}")
        
        # Verify the parameters were replaced correctly
        expected_params = ["txn_id=TXN123456", "user=test_user", "amount=5.00", "status=completed"]
        for param in expected_params:
            if param in final_url:
                print(f"   ✓ {param}")
            else:
                print(f"   ❌ Missing: {param}")
                
    except Exception as e:
        print(f"❌ Error testing parameter mapping: {e}")
    
    print(f"\n🎯 PARTNER MAPPING SYSTEM TEST COMPLETE")
    print("="*50)

if __name__ == "__main__":
    test_partner_mapping_system()
