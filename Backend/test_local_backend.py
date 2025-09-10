#!/usr/bin/env python3

import requests
import json

def test_local_backend():
    """Test local backend endpoints"""
    print("🔍 Testing Local Backend Endpoints")
    print("=" * 50)
    
    # Test different possible local URLs
    local_urls = [
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    for base_url in local_urls:
        print(f"\n🧪 Testing: {base_url}")
        
        # Test basic health check
        try:
            response = requests.get(f"{base_url}/", timeout=5)
            print(f"   ✅ Base URL accessible: {response.status_code}")
        except Exception as e:
            print(f"   ❌ Base URL failed: {str(e)}")
            continue
        
        # Test outbound postback endpoint
        try:
            test_data = {
                "partner_url": "https://httpbin.org/get?test=local&transaction_id=[TRANSACTION_ID]&reward=[REWARD]",
                "partner_name": "Local Test",
                "transaction_id": "LOCAL_123",
                "reward": "15.00"
            }
            
            response = requests.post(
                f"{base_url}/api/outbound-postback/send-to-partner",
                json=test_data,
                timeout=10
            )
            print(f"   ✅ Outbound API: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"   📊 Success: {result.get('success', False)}")
                print(f"   📝 Message: {result.get('message', 'No message')}")
        except Exception as e:
            print(f"   ❌ Outbound API failed: {str(e)}")
        
        # Test logs endpoint
        try:
            response = requests.get(f"{base_url}/api/postback-logs", timeout=5)
            print(f"   ✅ Logs API: {response.status_code}")
            if response.status_code == 200:
                logs = response.json()
                print(f"   📊 Found {len(logs)} logs")
        except Exception as e:
            print(f"   ❌ Logs API failed: {str(e)}")
        
        # If this URL works, break
        if response.status_code in [200, 404]:  # 404 is ok, means server is running
            print(f"\n🎉 Found working backend at: {base_url}")
            return base_url
    
    print(f"\n❌ No working local backend found!")
    print("💡 Make sure your backend server is running with: python app.py")
    return None

if __name__ == "__main__":
    test_local_backend()
