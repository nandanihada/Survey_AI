import firebase_admin
from firebase_admin import credentials, firestore
import os

try:
    if not firebase_admin._apps:
        cred = credentials.Certificate("service-account.json")
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    print("✅ Firebase initialized from firebase_config.py")

except Exception as e:
    print("❌ Firebase init error in firebase_config.py:", str(e))
    db = None

if db:
    print("✅ Firebase initialized from firebase_config.py")