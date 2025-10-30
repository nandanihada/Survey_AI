#!/usr/bin/env python3

try:
    from user_postback_api import user_postback_bp
    print("✅ user_postback_api imported successfully")
    print(f"Blueprint name: {user_postback_bp.name}")
except Exception as e:
    print(f"❌ Import error: {e}")
    import traceback
    traceback.print_exc()
