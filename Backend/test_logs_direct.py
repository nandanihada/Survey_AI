import requests
import json

def test_logs_api():
    base_url = "https://api.theinterwebsite.space/api"
    
    print("Testing postback logs endpoints...")
    
    # Test outbound logs
    try:
        response = requests.get(f"{base_url}/postback-logs", timeout=10)
        print(f"Outbound logs - Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Outbound logs count: {len(data)}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Outbound error: {e}")
    
    # Test inbound logs
    try:
        response = requests.get(f"{base_url}/inbound-postback-logs", timeout=10)
        print(f"Inbound logs - Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Inbound logs count: {len(data)}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Inbound error: {e}")

if __name__ == "__main__":
    test_logs_api()
