# firebase_config.py
import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

try:
    if not firebase_admin._apps:
        service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
        if not service_account_json:
            raise Exception("FIREBASE_SERVICE_ACCOUNT env var is missing or empty.")
        
        # Parse the env var content as JSON
        cred_dict = json.loads(service_account_json)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    print("✅ Firebase initialized from firebase_config.py")

except Exception as e:
    print("❌ Firebase init error in firebase_config.py:", str(e))
    db = None
