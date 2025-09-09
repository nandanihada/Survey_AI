#!/usr/bin/env python3

import requests
import json
from datetime import datetime

def test_postback_logs_endpoints():
    """Test the postback logs API endpoints"""
    base_url = "https://api.theinterwebsite.space"
    
    print("🔍 Testing Postback Logs API Endpoints")
    print("=" * 50)
    
    # Test outbound logs endpoint
    print("\n1. Testing /api/postback-logs (outbound)...")
    try:
        response = requests.get(f"{base_url}/api/postback-logs", timeout=15)
        print(f"   Status Code: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success! Found {len(data)} outbound logs")
            if data:
                print(f"   Sample log structure: {list(data[0].keys())}")
                print(f"   First log: {json.dumps(data[0], indent=2, default=str)}")
            else:
                print("   ⚠️ No outbound logs found")
        else:
            print(f"   ❌ Error: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {e}")
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
    
    # Test inbound logs endpoint
    print("\n2. Testing /api/inbound-postback-logs (inbound)...")
    try:
        response = requests.get(f"{base_url}/api/inbound-postback-logs", timeout=15)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success! Found {len(data)} inbound logs")
            if data:
                print(f"   Sample log structure: {list(data[0].keys())}")
                print(f"   First log: {json.dumps(data[0], indent=2, default=str)}")
            else:
                print("   ⚠️ No inbound logs found")
        else:
            print(f"   ❌ Error: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {e}")
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
    
    # Test database connection endpoint
    print("\n3. Testing /api/test-db...")
    try:
        response = requests.get(f"{base_url}/api/test-db", timeout=15)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Database connection: {data}")
        else:
            print(f"   ❌ Error: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {e}")
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")

if __name__ == "__main__":
    test_postback_logs_endpoints()
