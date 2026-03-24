import requests

def test_deployed_redirect():
    """Test the deployed redirect endpoint"""
    try:
        # Test the deployed endpoint
        response = requests.get('https://pepper-dash.onrender.com/l/en0RcC', 
                              allow_redirects=False, 
                              timeout=10)
        
        print(f"Deployed App Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 302:
            print(f"✅ Deployed Redirect Location: {response.headers.get('Location')}")
            print("✅ Deployed redirect working correctly!")
        elif response.status_code == 404:
            print("❌ Deployed: Link not found")
            print("This suggests the deployed app is using a different database")
        else:
            print(f"Deployed Response: {response.text[:300]}")
            
    except requests.exceptions.Timeout:
        print("❌ Timeout - deployed app might be sleeping")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to deployed app")
    except Exception as e:
        print(f"❌ Error testing deployed app: {e}")

if __name__ == "__main__":
    test_deployed_redirect()
