from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

# Try both MONGO_URI and MONGODB_URI for compatibility
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017/pepper_database"

# Connect without blocking - don't ping or verify at import time
# This allows the Flask app to start and respond to health checks immediately
# The actual connection happens lazily when the first DB operation occurs
try:
    client = MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
        socketTimeoutMS=10000,
        maxPoolSize=10,
        retryWrites=True
    )
    db = client["pepper_database"]
    print(f"[OK] MongoDB client initialized (lazy connection): {MONGO_URI[:50]}...")
except Exception as e:
    print(f"[ERROR] MongoDB client initialization failed: {e}")
    print("Using fallback - some features may not work")
    db = None

