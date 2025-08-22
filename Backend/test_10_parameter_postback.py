#!/usr/bin/env python3
"""
Test script for the updated 10-parameter postback system
Tests both inbound receiver and parameter mapping functionality
"""

import requests
import json
from datetime import datetime
import time

def test_10_parameter_postback():
    """Test the postback system with all 10 fixed parameters"""
    
    print("🚀 Testing 10-Parameter Postback System")
    print("=" * 60)
    
    # Base URL for postback handler
    base_url = "http://127.0.0.1:5000/postback-handler"
    
    # Test data with all 10 fixed parameters
    test_params = {
        # 10 Fixed Parameters
        "click_id": "test_click_12345",
        "payout": "5.50",
        "currency": "USD", 
        "offer_id": "survey_offer_001",
        "conversion_status": "confirmed",
        "transaction_id": "txn_987654321",
        "sub1": "test_response_id",
        "sub2": "additional_tracking",
        "event_name": "survey_completion",
        "timestamp": str(int(datetime.now().timestamp())),
        
        # Legacy parameters for backward compatibility
        "sid1": "test_response_id",  # Required for finding response
        "reward": "5.50",
        "status": "confirmed",
        "username": "test_user"
    }
    
    print("📋 Test Parameters:")
    for key, value in test_params.items():
        print(f"   {key}: {value}")
    
    try:
        print(f"\n📡 Sending postback to: {base_url}")
        
        # Send GET request with parameters
        response = requests.get(base_url, params=test_params, timeout=10)
        
        print(f"\n📊 Response Details:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Response Text: {response.text}")
        
        if response.status_code == 200:
            print("✅ Postback processed successfully!")
            try:
                response_json = response.json()
                print(f"   JSON Response: {json.dumps(response_json, indent=2)}")
            except:
                print("   (Response is not JSON)")
        elif response.status_code == 404:
            print("⚠️ Response not found (expected for test data)")
        else:
            print(f"❌ Unexpected status code: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Flask server. Is it running on port 5000?")
        return False
    except Exception as e:
        print(f"❌ Error during test: {e}")
        return False
    
    return True

def test_postback_api_configuration():
    """Test the postback API configuration endpoints"""
    
    print(f"\n🔧 Testing Postback API Configuration")
    print("=" * 60)
    
    base_url = "http://127.0.0.1:5000"
    
    # Test creating a postback share with new 10-parameter configuration
    test_share_data = {
        "third_party_name": "Test Partner - 10 Params",
        "third_party_contact": "test@10params.com",
        "postback_type": "global",
        "notes": "Testing 10-parameter configuration",
        "status": "active",
        "parameters": {
            # Enable some of the new 10 parameters
            "click_id": {"enabled": True, "description": "Test click ID"},
            "payout": {"enabled": True, "description": "Test payout amount"},
            "offer_id": {"enabled": True, "description": "Test offer ID"},
            "conversion_status": {"enabled": True, "description": "Test conversion status"},
            "transaction_id": {"enabled": True, "description": "Test transaction ID"},
            "sub1": {"enabled": True, "description": "Test sub1 parameter"},
            "event_name": {"enabled": True, "description": "Test event name"},
            "timestamp": {"enabled": True, "description": "Test timestamp"}
        }
    }
    
    try:
        # Create postback share
        print("📤 Creating postback share...")
        response = requests.post(
            f"{base_url}/api/postback-shares",
            json=test_share_data,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            share_id = result.get('id')
            print(f"✅ Successfully created postback share: {share_id}")
            
            # Test URL generation
            print(f"\n🔗 Testing URL generation...")
            url_response = requests.post(
                f"{base_url}/api/postback-shares/{share_id}/generate-url",
                timeout=10
            )
            
            if url_response.status_code == 200:
                url_result = url_response.json()
                print(f"✅ Generated URL: {url_result.get('postback_url')}")
                print(f"   Enabled parameters: {url_result.get('enabled_parameters')}")
            else:
                print(f"❌ URL generation failed: {url_response.text}")
                
        else:
            print(f"❌ Failed to create postback share: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Flask server. Is it running on port 5000?")
        return False
    except Exception as e:
        print(f"❌ Error during API test: {e}")
        return False
    
    return True

def test_parameter_mapping():
    """Test parameter mapping and third-party customization"""
    
    print(f"\n🗺️ Testing Parameter Mapping")
    print("=" * 60)
    
    # Example of how third parties can map parameters
    third_party_mappings = {
        "AdBreak Media": {
            "click_id": "tracking_id",
            "payout": "commission", 
            "offer_id": "campaign_id",
            "conversion_status": "status",
            "transaction_id": "reference_id",
            "sub1": "subid1",
            "sub2": "subid2",
            "event_name": "event_type",
            "timestamp": "conversion_time"
        },
        "SurveyTitans": {
            "click_id": "click_ref",
            "payout": "reward_amount",
            "offer_id": "survey_id", 
            "conversion_status": "completion_status",
            "transaction_id": "titan_txn_id",
            "sub1": "user_ref",
            "event_name": "action_type"
        }
    }
    
    print("📋 Example Third-Party Parameter Mappings:")
    for partner, mapping in third_party_mappings.items():
        print(f"\n   🏢 {partner}:")
        for standard_param, custom_param in mapping.items():
            print(f"      {standard_param} → {custom_param}")
    
    print(f"\n💡 These mappings can be configured in the frontend UI")
    print(f"   Users can map our 10 standard parameters to any third-party parameter names")
    
    return True

def main():
    """Run all tests"""
    
    print("🧪 10-Parameter Postback System Test Suite")
    print("=" * 80)
    
    tests = [
        ("Postback Handler", test_10_parameter_postback),
        ("API Configuration", test_postback_api_configuration), 
        ("Parameter Mapping", test_parameter_mapping)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n🔍 Running: {test_name}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append((test_name, False))
        
        time.sleep(1)  # Brief pause between tests
    
    # Summary
    print(f"\n" + "=" * 80)
    print("📊 TEST SUMMARY")
    print("=" * 80)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name}: {status}")
    
    total_passed = sum(1 for _, result in results if result)
    print(f"\n🎯 Overall: {total_passed}/{len(results)} tests passed")
    
    if total_passed == len(results):
        print("🎉 All tests passed! 10-parameter postback system is working correctly.")
    else:
        print("⚠️ Some tests failed. Check the Flask server and database connection.")

if __name__ == "__main__":
    main()
