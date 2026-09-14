import bcrypt
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

# Connect to your DB
client = MongoClient(os.getenv("MONGODB_URI"))
db = client[os.getenv("MONGODB_DB_NAME", "survey_ai")]

new_password = "TestPassword123!"

# Hash it the same way the app does
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(new_password.encode("utf-8"), salt).decode("utf-8")

# Update by email
result = db.users.update_one(
    {"email": "arjun@gmaail.com"},
    {"$set": {"password": hashed}}
)

print(f"Matched: {result.matched_count}, Updated: {result.modified_count}")
print(f"New password is: {new_password}")
