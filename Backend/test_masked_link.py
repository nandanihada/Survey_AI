#!/usr/bin/env python3

# Test script to verify masked link functionality
import requests

# Test the masked link endpoint
def test_masked_link():
    try:
        # Test with the short ID from your admin dashboard
        short_id = "en0RcC"
        url = f"http://127.0.0.1:5000/l/{short_id}"
        
        print(f"Testing masked link: {url}")
        
        # Make request without following redirects
        response = requests.get(url, allow_redirects=False)
        
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Content: {response.text[:200]}...")
        
        if response.status_code == 302:
            print("✅ Redirect working!")
            print(f"Redirect Location: {response.headers.get('Location')}")
        elif response.status_code == 404:
            print("❌ Link not found in database")
        else:
            print(f"⚠️ Unexpected status: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_masked_link()
