# firebase_config.py
import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

db = None

try:
    if not firebase_admin._apps:
        cred_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
        if not cred_json:
            raise Exception("GOOGLE_APPLICATION_CREDENTIALS_JSON env var is missing or empty.")
        cred = credentials.Certificate(json.loads(cred_json))
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    print("✅ Firebase initialized from firebase_config.py")

except Exception as e:
    print("❌ Firebase init error in firebase_config.py:", str(e))
