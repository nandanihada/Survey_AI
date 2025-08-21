from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

# Try both MONGO_URI and MONGODB_URI for compatibility
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017/pepper_database"

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    # Test the connection
    client.admin.command('ping')
    db = client["pepper_database"]
    print(f"✅ Connected to MongoDB: {MONGO_URI}")
    
    # Ensure postback_shares collection exists
    if 'postback_shares' not in db.list_collection_names():
        db.create_collection('postback_shares')
        print("✅ Created postback_shares collection")
    else:
        print("✅ postback_shares collection already exists")
        
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    print("Using fallback - some features may not work")
    db = None
