"""
Test admin role management functionality
"""
import requests
import json

BASE_URL = "http://localhost:5000"

def test_admin_role_management():
    """Test complete admin role management workflow"""
    print("🔧 Testing Admin Role Management")
    print("=" * 40)
    
    # Step 1: Register test users
    print("\n1️⃣ Creating test users...")
    
    users = [
        {"email": "admin@test.com", "password": "password123", "name": "Admin User"},
        {"email": "user1@test.com", "password": "password123", "name": "Test User 1"},
        {"email": "user2@test.com", "password": "password123", "name": "Test User 2"}
    ]
    
    tokens = {}
    user_ids = {}
    
    for user in users:
        try:
            response = requests.post(f"{BASE_URL}/api/auth/register", json=user)
            if response.status_code == 200:
                data = response.json()
                tokens[user["email"]] = data.get("token")
                user_ids[user["email"]] = data.get("user", {}).get("id")
                print(f"✅ Created: {user['email']}")
            else:
                print(f"⚠️ User {user['email']} might already exist")
                # Try login instead
                login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                    "email": user["email"],
                    "password": user["password"]
                })
                if login_response.status_code == 200:
                    data = login_response.json()
                    tokens[user["email"]] = data.get("token")
                    user_ids[user["email"]] = data.get("user", {}).get("id")
                    print(f"✅ Logged in: {user['email']}")
        except Exception as e:
            print(f"❌ Error with {user['email']}: {e}")
    
    # Step 2: Get admin token (you'll need to manually promote first user to admin)
    admin_email = "admin@test.com"
    admin_token = tokens.get(admin_email)
    
    if not admin_token:
        print(f"❌ No token for admin user")
        return
    
    print(f"\n2️⃣ Testing with admin user: {admin_email}")
    print("⚠️ NOTE: You need to run create_admin_user.py first to promote this user to admin")
    
    # Step 3: Test getting all users (admin only)
    print("\n3️⃣ Testing admin endpoints...")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        if response.status_code == 200:
            users_data = response.json()
            print(f"✅ Retrieved {len(users_data.get('users', []))} users")
            
            # Show current users and their roles
            for user in users_data.get('users', []):
                print(f"   - {user.get('email')}: {user.get('role', 'unknown')} ({user.get('status', 'unknown')})")
                
        elif response.status_code == 403:
            print("❌ Access denied - user is not admin")
            print("   Run: python create_admin_user.py")
            return
        else:
            print(f"❌ Failed to get users: {response.text}")
            return
    except Exception as e:
        print(f"❌ Error getting users: {e}")
        return
    
    # Step 4: Test role changes
    print("\n4️⃣ Testing role modifications...")
    
    target_user_email = "user1@test.com"
    target_user_id = user_ids.get(target_user_email)
    
    if target_user_id:
        # Test changing role to premium
        print(f"Changing {target_user_email} to premium role...")
        
        try:
            response = requests.put(
                f"{BASE_URL}/api/admin/users/{target_user_id}/role",
                headers=headers,
                json={"role": "premium"}
            )
            
            if response.status_code == 200:
                print("✅ Role changed to premium")
                
                # Verify the change by checking user permissions
                user_token = tokens.get(target_user_email)
                if user_token:
                    perm_response = requests.get(
                        f"{BASE_URL}/api/auth/permissions",
                        headers={"Authorization": f"Bearer {user_token}"}
                    )
                    
                    if perm_response.status_code == 200:
                        perms = perm_response.json()
                        print(f"   New role: {perms.get('role')}")
                        print(f"   Features: {perms.get('features', [])}")
                    
            else:
                print(f"❌ Failed to change role: {response.text}")
                
        except Exception as e:
            print(f"❌ Error changing role: {e}")
    
    # Step 5: Test status changes
    print("\n5️⃣ Testing status modifications...")
    
    target_user_email = "user2@test.com"
    target_user_id = user_ids.get(target_user_email)
    
    if target_user_id:
        print(f"Changing {target_user_email} status to disapproved...")
        
        try:
            response = requests.put(
                f"{BASE_URL}/api/admin/users/{target_user_id}/status",
                headers=headers,
                json={"status": "disapproved"}
            )
            
            if response.status_code == 200:
                print("✅ Status changed to disapproved")
                
                # Test that user can't login now
                print("Testing blocked login...")
                login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                    "email": target_user_email,
                    "password": "password123"
                })
                
                if login_response.status_code == 401:
                    error_data = login_response.json()
                    print(f"✅ Login blocked: {error_data.get('error')}")
                else:
                    print("❌ User should be blocked but isn't")
                    
            else:
                print(f"❌ Failed to change status: {response.text}")
                
        except Exception as e:
            print(f"❌ Error changing status: {e}")
    
    print("\n✅ Admin role management test completed!")
    print("\nAvailable roles: basic, premium, enterprise, admin")
    print("Available statuses: approved, disapproved, locked")

if __name__ == "__main__":
    test_admin_role_management()
