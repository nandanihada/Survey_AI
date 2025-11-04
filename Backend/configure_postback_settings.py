#!/usr/bin/env python3

"""
Configure Postback Settings for a User
Allows setting postback URL, method (GET/POST), and response inclusion
"""

from mongodb_config import db
from bson import ObjectId

def configure_user_postback(email, postback_url, method='POST', include_responses=True, parameter_mappings=None):
    """
    Configure postback settings for a user
    
    Args:
        email: User's email address
        postback_url: The postback URL to send data to
        method: 'GET' or 'POST' (default: POST)
        include_responses: Whether to include survey responses (default: True)
        parameter_mappings: Optional dict to map field names
    """
    
    print(f"\n{'='*60}")
    print(f"🔧 CONFIGURING POSTBACK SETTINGS")
    print(f"{'='*60}")
    
    # Find user
    user = db.users.find_one({"email": email})
    
    if not user:
        print(f"❌ User not found: {email}")
        return False
    
    print(f"✅ User found: {user.get('name', 'Unknown')} ({email})")
    print(f"   User ID: {user['_id']}")
    
    # Prepare update data
    update_data = {
        "postbackUrl": postback_url,
        "postbackMethod": method.upper(),
        "includeResponses": include_responses
    }
    
    if parameter_mappings:
        update_data["parameterMappings"] = parameter_mappings
    
    # Update user
    result = db.users.update_one(
        {"_id": user["_id"]},
        {"$set": update_data}
    )
    
    if result.modified_count > 0:
        print(f"\n✅ POSTBACK SETTINGS UPDATED!")
        print(f"   Postback URL: {postback_url}")
        print(f"   Method: {method.upper()}")
        print(f"   Include Responses: {include_responses}")
        if parameter_mappings:
            print(f"   Parameter Mappings:")
            for our_field, their_field in parameter_mappings.items():
                print(f"      {our_field} → {their_field}")
        print(f"{'='*60}\n")
        return True
    else:
        print(f"⚠️ No changes made (settings might be the same)")
        return False

def view_user_postback_settings(email):
    """View current postback settings for a user"""
    
    print(f"\n{'='*60}")
    print(f"📋 CURRENT POSTBACK SETTINGS")
    print(f"{'='*60}")
    
    user = db.users.find_one({"email": email})
    
    if not user:
        print(f"❌ User not found: {email}")
        return
    
    print(f"👤 User: {user.get('name', 'Unknown')} ({email})")
    print(f"   User ID: {user['_id']}")
    print(f"\n📡 Postback Configuration:")
    print(f"   URL: {user.get('postbackUrl', 'NOT SET')}")
    print(f"   Method: {user.get('postbackMethod', 'GET (default)')}")
    print(f"   Include Responses: {user.get('includeResponses', 'True (default)')}")
    
    mappings = user.get('parameterMappings', {})
    if mappings:
        print(f"\n🔄 Parameter Mappings:")
        for our_field, their_field in mappings.items():
            print(f"      {our_field} → {their_field}")
    else:
        print(f"\n🔄 Parameter Mappings: None (using default field names)")
    
    print(f"{'='*60}\n")

def list_all_users_with_postbacks():
    """List all users who have postback URLs configured"""
    
    print(f"\n{'='*60}")
    print(f"📋 USERS WITH POSTBACK CONFIGURED")
    print(f"{'='*60}\n")
    
    users = db.users.find({"postbackUrl": {"$exists": True, "$ne": ""}})
    
    count = 0
    for user in users:
        count += 1
        print(f"{count}. {user.get('name', 'Unknown')} ({user.get('email', 'No email')})")
        print(f"   URL: {user.get('postbackUrl', 'N/A')}")
        print(f"   Method: {user.get('postbackMethod', 'GET')}")
        print(f"   Include Responses: {user.get('includeResponses', True)}")
        print()
    
    if count == 0:
        print("   No users with postback URLs configured")
    
    print(f"{'='*60}\n")

if __name__ == "__main__":
    import sys
    
    print("\n🎯 POSTBACK CONFIGURATION TOOL")
    print("="*60)
    
    if len(sys.argv) < 2:
        print("\nUsage:")
        print("  python configure_postback_settings.py <email> <postback_url> [method] [include_responses]")
        print("\nExamples:")
        print("  # Set POST method with responses")
        print("  python configure_postback_settings.py user@email.com https://webhook.site/abc123 POST true")
        print()
        print("  # Set GET method without responses")
        print("  python configure_postback_settings.py user@email.com https://webhook.site/abc123 GET false")
        print()
        print("  # View current settings")
        print("  python configure_postback_settings.py user@email.com view")
        print()
        print("  # List all users with postbacks")
        print("  python configure_postback_settings.py list")
        print()
        sys.exit(1)
    
    if sys.argv[1] == "list":
        list_all_users_with_postbacks()
        sys.exit(0)
    
    email = sys.argv[1]
    
    if len(sys.argv) == 3 and sys.argv[2] == "view":
        view_user_postback_settings(email)
        sys.exit(0)
    
    if len(sys.argv) < 3:
        print("❌ Error: Postback URL required")
        print("Usage: python configure_postback_settings.py <email> <postback_url> [method] [include_responses]")
        sys.exit(1)
    
    postback_url = sys.argv[2]
    method = sys.argv[3] if len(sys.argv) > 3 else 'POST'
    include_responses = sys.argv[4].lower() == 'true' if len(sys.argv) > 4 else True
    
    # Example parameter mappings (you can customize this)
    parameter_mappings = {
        "transaction_id": "txn_id",
        "email": "user_email",
        "responses": "survey_answers",
        "status": "completion_status"
    }
    
    configure_user_postback(
        email=email,
        postback_url=postback_url,
        method=method,
        include_responses=include_responses,
        parameter_mappings=parameter_mappings  # Comment this line to use default field names
    )
    
    # Show updated settings
    view_user_postback_settings(email)
