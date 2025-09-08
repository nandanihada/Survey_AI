"""
Script to create or promote a user to admin role
"""
from mongodb_config import db
from datetime import datetime

def create_admin_user():
    """Create or promote user to admin"""
    email = input("Enter email to promote to admin: ").strip()
    
    if not email:
        print("❌ Email required")
        return
    
    # Find user
    user = db.users.find_one({'email': email})
    
    if not user:
        print(f"❌ User {email} not found")
        print("Please register the user first")
        return
    
    # Update to admin role
    result = db.users.update_one(
        {'email': email},
        {
            '$set': {
                'role': 'admin',
                'status': 'approved',
                'updatedAt': datetime.utcnow()
            }
        }
    )
    
    if result.modified_count > 0:
        print(f"✅ {email} promoted to admin successfully!")
        print("User can now manage other users' roles and statuses")
    else:
        print(f"❌ Failed to promote {email}")

if __name__ == "__main__":
    print("🔧 Admin User Creator")
    print("=" * 30)
    create_admin_user()
