"""
SIMPLE POSTBACK RECEIVER GUIDE
This shows you exactly how your postback receiver works
"""
from mongodb_config import db
import requests
from datetime import datetime

def show_your_postback_urls():
    """Show the URLs you give to ANY platform (AdBreak, etc.)"""
    print("🌐 YOUR POSTBACK RECEIVER URLS")
    print("="*50)
    print("Give these URLs to ANY platform (AdBreak Media, etc.):")
    print()
    print("🔗 PRODUCTION URL:")
    print("https://hostslice.onrender.com//postback-handler")
    print()
    print("🔗 LOCAL TESTING URL:")
    print("http://127.0.0.1:5000/postback-handler")
    print()
    print("💡 USAGE:")
    print("- Copy the production URL")
    print("- Go to AdBreak Media dashboard")
    print("- Paste it in their 'Postback URL' field")
    print("- Add parameters like: ?sid1={user_id}&reward={reward}&status={status}")

def test_your_receiver():
    """Test your postback receiver with fake data"""
    print("\n🧪 TESTING YOUR POSTBACK RECEIVER")
    print("="*50)
    
    # Create a test survey response first
    test_response_id = "test-response-999"
    test_response = {
        "_id": test_response_id,
        "survey_id": "test-survey",
        "email": "test@example.com",
        "username": "testuser",
        "responses": {"Q1": "Yes", "Q2": "Good"},
        "submitted_at": datetime.utcnow()
    }
    
    # Save to database
    db.responses.delete_one({"_id": test_response_id})  # Remove old test
    db.responses.insert_one(test_response)
    print(f"✅ Created test response: {test_response_id}")
    
    # Test the postback receiver
    postback_url = "http://127.0.0.1:5000/postback-handler"
    params = {
        'sid1': test_response_id,
        'transaction_id': 'fake-txn-123',
        'status': 'confirmed',
        'reward': '1.50',
        'currency': 'USD',
        'username': 'testuser'
    }
    
    print(f"\n📤 Sending fake postback to: {postback_url}")
    for key, value in params.items():
        print(f"   {key}: {value}")
    
    try:
        response = requests.get(postback_url, params=params, timeout=10)
        print(f"\n📈 Response: {response.status_code}")
        print(f"📄 Content: {response.text}")
        
        if response.status_code == 200:
            print("✅ Your postback receiver is working!")
            
            # Check database update
            updated = db.responses.find_one({"_id": test_response_id})
            if updated.get("postback_status"):
                print(f"✅ Database updated! Status: {updated['postback_status']}")
            else:
                print("⚠️  Database not updated")
        else:
            print("❌ Postback receiver failed!")
            
    except requests.exceptions.ConnectionError:
        print("❌ Server not running! Start with: python app.py")
    except Exception as e:
        print(f"❌ Error: {e}")

def remove_fake_adbreak_partner():
    """Remove the fake AdBreak partner I incorrectly added"""
    print("\n🧹 CLEANING UP FAKE PARTNERS")
    print("="*50)
    
    result = db.partners.delete_one({"name": "AdBreak Media"})
    if result.deleted_count > 0:
        print("✅ Removed fake AdBreak Media partner")
    else:
        print("ℹ️  No fake AdBreak partner found")
    
    # Show remaining partners (these are for YOUR outbound postbacks)
    partners = list(db.partners.find({}))
    print(f"\n📊 YOUR OUTBOUND PARTNERS ({len(partners)} total):")
    print("(These are platforms YOU send data to)")
    
    for partner in partners:
        status_icon = "✅" if partner['status'] == 'active' else "❌"
        print(f"  {status_icon} {partner['name']}: {partner['url']}")

def explain_the_difference():
    """Explain inbound vs outbound postbacks"""
    print("\n📚 UNDERSTANDING POSTBACKS")
    print("="*50)
    
    print("🔄 TWO TYPES OF POSTBACKS:")
    print()
    print("1️⃣ INBOUND (What AdBreak sends to YOU)")
    print("   → AdBreak calls YOUR /postback-handler endpoint")
    print("   → You just give them your URL")
    print("   → No need to add them as a 'partner'")
    print()
    print("2️⃣ OUTBOUND (What YOU send to other platforms)")
    print("   → Your system calls other platforms")
    print("   → These are your 'partners' in the database")
    print("   → Example: SurveyTitans, etc.")
    print()
    print("🎯 FOR ADBREAK MEDIA:")
    print("   → Just give them: https://hostslice.onrender.com//postback-handler")
    print("   → They'll add their parameters automatically")

def main():
    print("🎯 SIMPLE POSTBACK RECEIVER GUIDE")
    print("="*50)
    
    explain_the_difference()
    remove_fake_adbreak_partner()
    show_your_postback_urls()
    
    # Ask if user wants to test
    test_now = input("\n❓ Test your postback receiver now? (y/n): ").lower()
    if test_now == 'y':
        test_your_receiver()
    
    print("\n✅ SUMMARY:")
    print("1. Give AdBreak this URL: https://hostslice.onrender.com//postback-handler")
    print("2. They'll call it when users complete offers")
    print("3. Your receiver will update the database")
    print("4. Done! 🎉")

if __name__ == "__main__":
    main()
