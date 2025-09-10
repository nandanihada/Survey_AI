#!/usr/bin/env python3

import requests
import json

def quick_debug():
    """Quick debug of postback system"""
    print("🔍 Quick Postback System Debug")
    print("=" * 50)
    
    # Test the outbound API directly
    url = "https://api.theinterwebsite.space/api/outbound-postback/send-to-partner"
    data = {
        "partner_url": "https://httpbin.org/get?test=1&transaction_id=[TRANSACTION_ID]&reward=[REWARD]",
        "partner_name": "Quick Test",
        "transaction_id": "QUICK_123",
        "reward": "10.00"
    }
    
    print(f"Testing: {url}")
    print(f"Data: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(url, json=data, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test logs API
    print("\nTesting logs API...")
    try:
        logs_response = requests.get("https://api.theinterwebsite.space/api/postback-logs", timeout=10)
        print(f"Logs Status: {logs_response.status_code}")
        if logs_response.status_code == 200:
            logs = logs_response.json()
            print(f"Found {len(logs)} logs")
        else:
            print(f"Logs Error: {logs_response.text}")
    except Exception as e:
        print(f"Logs Error: {e}")

if __name__ == "__main__":
    quick_debug()
