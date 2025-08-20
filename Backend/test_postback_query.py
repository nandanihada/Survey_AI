from mongodb_config import db

# Test the exact same query your postback handler uses
sid1 = '5400441a-5eed-4a0b-8bbf-190cda6d9069'

print("🔍 TESTING POSTBACK DATABASE QUERY")
print("="*50)
print(f"Testing sid1: {sid1}")

# Test the exact query from your postback handler
response_doc = db["responses"].find_one({
    "_id": sid1
})

print(f"Query: db['responses'].find_one({{'_id': '{sid1}'}})")
print(f"Result: {'FOUND' if response_doc else 'NOT FOUND'}")

if response_doc:
    print("✅ SUCCESS! Response found:")
    print(f"   Email: {response_doc.get('email', 'N/A')}")
    print(f"   Username: {response_doc.get('username', 'N/A')}")
    print(f"   Survey ID: {response_doc.get('survey_id', 'N/A')}")
else:
    print("❌ Response not found. Let's check both collections:")
    
    # Check responses collection
    total_responses = db.responses.count_documents({})
    print(f"   responses collection: {total_responses} documents")
    
    # Check survey_responses collection  
    total_survey_responses = db.survey_responses.count_documents({})
    print(f"   survey_responses collection: {total_survey_responses} documents")
    
    # Get a valid ID from responses
    sample = db.responses.find_one()
    if sample:
        print(f"   Sample valid sid1: {sample['_id']}")
        
        # Test postback with valid ID
        print(f"\n🧪 Test with this URL instead:")
        print(f"   https://hostslice.onrender.com/postback-handler?sid1={sample['_id']}&status=confirmed&reward=2.50")
    
print("\n💡 Your inbound postbacks are visible in:")
print("1. ✅ Backend console (what you just showed)")
print("2. 📊 Database responses with postback_* fields")
print("3. 📱 Frontend dashboard > Postback > Logs tab")
