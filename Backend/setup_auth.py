"""
Setup script for authentication system
"""
import os
from dotenv import load_dotenv

def setup_firebase_config():
    """Guide for Firebase setup"""
    print("🔧 Firebase Authentication Setup Guide")
    print("=" * 50)
    print()
    print("1. Go to Firebase Console: https://console.firebase.google.com/")
    print("2. Create a new project or select existing project")
    print("3. Enable Authentication > Sign-in method > Google")
    print("4. Go to Project Settings > General > Your apps")
    print("5. Add a web app if you haven't already")
    print("6. Copy the config values to your .env file:")
    print()
    print("Required .env variables:")
    print("FIREBASE_PROJECT_ID=your-project-id")
    print("FIREBASE_CLIENT_ID=your-web-client-id")
    print("FIREBASE_CLIENT_SECRET=your-client-secret")
    print("FIREBASE_REDIRECT_URI=http://localhost:5000/auth/callback")
    print("FIREBASE_SERVICE_ACCOUNT_PATH=path/to/service-account-key.json")
    print()
    print("7. Download service account key:")
    print("   - Go to Project Settings > Service accounts")
    print("   - Click 'Generate new private key'")
    print("   - Save the JSON file and update FIREBASE_SERVICE_ACCOUNT_PATH")
    print()
    print("8. Configure OAuth consent screen in Google Cloud Console")
    print("9. Add authorized redirect URIs:")
    print("   - http://localhost:5000/auth/callback (development)")
    print("   - https://your-domain.com/auth/callback (production)")
    print()

def check_environment():
    """Check if environment variables are set"""
    load_dotenv()
    
    required_vars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_CLIENT_ID', 
        'FIREBASE_CLIENT_SECRET',
        'FIREBASE_REDIRECT_URI',
        'MONGODB_URI'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("❌ Missing environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print()
        print("Please update your .env file with the required values.")
        return False
    else:
        print("✅ All required environment variables are set")
        return True

if __name__ == "__main__":
    print("Setting up authentication system...")
    print()
    
    setup_firebase_config()
    
    if check_environment():
        print("✅ Environment check passed")
        print()
        print("Next steps:")
        print("1. Run database migrations: python database_migrations.py")
        print("2. Start the Flask app: python app.py")
        print("3. Test authentication flow")
    else:
        print("❌ Environment check failed")
        print("Please configure your .env file before proceeding.")
