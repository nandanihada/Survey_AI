from pymongo import MongoClient
from dotenv import load_dotenv
import os

print("Testing MongoDB connection...")

# Load environment variables
load_dotenv()

# Try both MONGO_URI and MONGODB_URI for compatibility
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017/pepper_database"
print(f"Connecting to MongoDB at: {MONGO_URI}")

try:
    # Test connection with a short timeout
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    
    # Test the connection
    client.admin.command('ping')
    print("✅ Successfully connected to MongoDB")
    
    # List all databases
    print("\nAvailable databases:")
    for db_name in client.list_database_names():
        print(f"- {db_name}")
    
    # Test accessing the pepper_database
    db = client["pepper_database"]
    print("\nCollections in pepper_database:")
    for col in db.list_collection_names():
        print(f"- {col}")
    
    print("\n✅ MongoDB test completed successfully!")
    
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    print("\nTroubleshooting steps:")
    print("1. Make sure MongoDB is running")
    print("2. Check your MONGO_URI or MONGODB_URI in .env file")
    print("3. If using a remote database, verify network connectivity")
    print("4. Check MongoDB logs for any errors")
