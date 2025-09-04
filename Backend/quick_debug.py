from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client["pepper_database"]
    
    target_email = "hadanandani14@gmail.com"
    print(f"Checking user: {target_email}")
    
    # Find user
    user = db.users.find_one({"email": target_email})
    if user:
        user_id = str(user['_id'])
        print(f"User ID: {user_id}")
        print(f"Simple ID: {user.get('simpleUserId', 'None')}")
        
        # Check surveys
        surveys = list(db.surveys.find({
            '$or': [
                {'ownerUserId': user_id},
                {'user_id': user_id},
                {'creator_email': target_email}
            ]
        }))
        print(f"Found {len(surveys)} surveys for this user")
        
        # Show all surveys to debug
        all_surveys = list(db.surveys.find({}, {'prompt': 1, 'ownerUserId': 1, 'creator_email': 1}).limit(5))
        print(f"\nRecent surveys in DB:")
        for s in all_surveys:
            print(f"- {s.get('prompt', 'No prompt')[:30]}... Owner: {s.get('ownerUserId', 'None')} Email: {s.get('creator_email', 'None')}")
    else:
        print("User not found!")
        
except Exception as e:
    print(f"Error: {e}")
