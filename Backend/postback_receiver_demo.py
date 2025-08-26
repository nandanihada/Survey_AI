"""
POSTBACK RECEIVER DEMO SYSTEM
This demonstrates how your postback receiver works and helps you test it.
"""
import requests
import json
from datetime import datetime
from mongodb_config import db

def explain_postback_flow():
    """Explain how the postback system works"""
    print("="*60)
    print("📡 HOW YOUR POSTBACK RECEIVER WORKS")
    print("="*60)
    
    print("\n🔄 COMPLETE FLOW:")
    print("1. User completes survey on your site")
    print("2. Your backend forwards survey data to AdBreak Media")
    print("3. AdBreak Media processes the offer completion")
    print("4. AdBreak Media sends postback to YOUR receiver URL")
    print("5. Your receiver processes the postback and updates records")
    
    print("\n🌐 YOUR POSTBACK RECEIVER URLs:")
    print("Production: https://api.theinterwebsite.space/postback-handler")
    print("Local Dev:  http://127.0.0.1:5000/postback-handler")
    
    print("\n📋 EXPECTED PARAMETERS FROM ADBREAK MEDIA:")
    print("- transaction_id: Unique transaction ID")
    print("- status: 'confirmed', 'pending', 'declined'")
    print("- reward: Amount earned (e.g., '0.50')")
    print("- currency: 'USD', 'EUR', etc.")
    print("- sid1: Your tracking ID (response_id from your database)")
    print("- username: User who completed the offer")
    
    return True

def show_current_partners():
    """Show current partner configuration"""
    print("\n" + "="*60)
    print("🤝 CURRENT PARTNER CONFIGURATION")
    print("="*60)
    
    partners = list(db.partners.find({}))
    if not partners:
        print("❌ No partners configured!")
        return False
    
    for partner in partners:
        print(f"\n📊 Partner: {partner['name']}")
        print(f"   Status: {'✅ ACTIVE' if partner['status'] == 'active' else '❌ INACTIVE'}")
        print(f"   URL: {partner['url']}")
        print(f"   Created: {partner.get('created_at', 'Unknown')}")
    
    return True

def create_test_survey_response():
    """Create a test survey response for postback testing"""
    print("\n" + "="*60)
    print("📝 CREATING TEST SURVEY RESPONSE")
    print("="*60)
    
    # Create a test response that matches your actual survey response structure
    test_response_data = {
        "_id": "test-response-12345",
        "id": "test-response-12345",
        "survey_id": "test-survey-456",
        "responses": {
            "What is your favorite color?": "Blue",
            "How satisfied are you?": "Very satisfied",
            "Would you recommend us?": "Yes"
        },
        "email": "test@example.com",
        "username": "testuser123",
        "submitted_at": datetime.utcnow(),
        "is_public": True,
        "status": "submitted"
    }
    
    # Save to database
    try:
        # Remove existing test response if it exists
        db.responses.delete_one({"_id": "test-response-12345"})
        
        # Insert new test response
        db.responses.insert_one(test_response_data)
        
        print("✅ Created test survey response:")
        print(f"   Response ID: {test_response_data['_id']}")
        print(f"   Survey ID: {test_response_data['survey_id']}")
        print(f"   Email: {test_response_data['email']}")
        print(f"   Username: {test_response_data['username']}")
        print(f"   Responses: {len(test_response_data['responses'])} questions answered")
        
        return test_response_data['_id']
        
    except Exception as e:
        print(f"❌ Error creating test response: {e}")
        return None

def test_postback_receiver_locally():
    """Test the postback receiver with simulated AdBreak Media postback"""
    print("\n" + "="*60)
    print("🧪 TESTING POSTBACK RECEIVER LOCALLY")
    print("="*60)
    
    # Create test response first
    response_id = create_test_survey_response()
    if not response_id:
        print("❌ Cannot test without test response")
        return False
    
    # Simulate AdBreak Media postback parameters
    postback_params = {
        'transaction_id': 'adbreak-txn-789',
        'status': 'confirmed',
        'reward': '0.75',
        'currency': 'USD',
        'sid1': response_id,  # This links to your survey response
        'username': 'testuser123',
        'clicked_at': '2025-08-12 09:00:00'
    }
    
    print("📤 Simulating AdBreak Media postback with parameters:")
    for key, value in postback_params.items():
        print(f"   {key}: {value}")
    
    # Test against local server
    local_url = "http://127.0.0.1:5000/postback-handler"
    
    try:
        print(f"\n📡 Sending POST to: {local_url}")
        
        # Try GET request (as most postback services use GET)
        response = requests.get(local_url, params=postback_params, timeout=10)
        
        print(f"📈 Response Status: {response.status_code}")
        print(f"📄 Response Content: {response.text}")
        
        if response.status_code == 200:
            print("✅ Postback receiver is working correctly!")
            
            # Check if the database was updated
            updated_response = db.responses.find_one({"_id": response_id})
            if updated_response and "postback_status" in updated_response:
                print("✅ Database was updated with postback data!")
                print(f"   Postback Status: {updated_response.get('postback_status')}")
                print(f"   Postback Reward: {updated_response.get('postback_reward')}")
            else:
                print("⚠️  Database was not updated - check postback handler logic")
                
        else:
            print("❌ Postback receiver returned error!")
            
        return response.status_code == 200
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to local server!")
        print("   Make sure your Flask app is running on http://127.0.0.1:5000")
        return False
    except Exception as e:
        print(f"❌ Error testing postback receiver: {e}")
        return False

def show_postback_logs():
    """Show recent postback logs"""
    print("\n" + "="*60)
    print("📊 RECENT POSTBACK LOGS")
    print("="*60)
    
    logs = list(db.postback_logs.find().sort("timestamp", -1).limit(10))
    
    if not logs:
        print("📝 No postback logs found")
        return
    
    for log in logs:
        print(f"\n📋 {log.get('timestamp', 'Unknown time')}")
        print(f"   Partner: {log.get('partnerName', 'Unknown')}")
        print(f"   Status: {log.get('status', 'Unknown')}")
        print(f"   URL: {log.get('url', 'No URL')}")
        print(f"   Response: {log.get('response', 'No response')[:100]}...")

def generate_adbreak_postback_url():
    """Generate the postback URL to give to AdBreak Media"""
    print("\n" + "="*60)
    print("🔗 POSTBACK URL FOR ADBREAK MEDIA")
    print("="*60)
    
    production_url = "https://api.theinterwebsite.space/postback-handler"
    postback_url_template = f"{production_url}?transaction_id={{transaction_id}}&status={{status}}&reward={{reward}}&currency={{currency}}&sid1={{sid1}}&username={{username}}"
    
    print("📋 Give this EXACT URL to AdBreak Media in their postback settings:")
    print()
    print("🔗 POSTBACK URL:")
    print(postback_url_template)
    print()
    print("📝 AdBreak Media will replace the placeholders with actual values:")
    print("   {transaction_id} -> Their transaction ID")
    print("   {status} -> 'confirmed', 'pending', or 'declined'")
    print("   {reward} -> Amount earned (e.g., '0.50')")
    print("   {currency} -> 'USD', 'EUR', etc.")
    print("   {sid1} -> YOUR tracking ID (response_id)")
    print("   {username} -> User who completed the offer")

def main():
    """Run the complete postback demo"""
    print("🚀 POSTBACK RECEIVER DEMO STARTING...")
    
    # Step 1: Explain the flow
    explain_postback_flow()
    
    # Step 2: Show current partners
    show_current_partners()
    
    # Step 3: Generate postback URL for AdBreak Media
    generate_adbreak_postback_url()
    
    # Step 4: Test the receiver locally
    print("\n" + "="*60)
    print("⚠️  LOCAL TESTING")
    print("="*60)
    print("To test locally, first start your Flask app:")
    print("python app.py")
    print("\nThen run this test again to simulate AdBreak postback")
    
    # Ask user if they want to test now
    user_input = input("\n❓ Do you want to test the postback receiver now? (y/n): ").lower()
    
    if user_input == 'y':
        test_result = test_postback_receiver_locally()
        if test_result:
            print("\n🎉 SUCCESS! Your postback receiver is working!")
        else:
            print("\n❌ Test failed. Check the issues above.")
    
    # Step 5: Show logs
    show_postback_logs()
    
    print("\n" + "="*60)
    print("✅ DEMO COMPLETE!")
    print("="*60)

if __name__ == "__main__":
    main()
