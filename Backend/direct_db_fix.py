#!/usr/bin/env python3
"""
Direct database fix using Flask app context
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db

def fix_surveys_direct():
    """Fix surveys using Flask app context"""
    with app.app_context():
        print("🔧 FIXING SURVEYS DIRECTLY")
        print("=" * 30)
        
        # Get all surveys
        surveys = list(db.surveys.find({}))
        print(f"Found {len(surveys)} surveys")
        
        fixed = 0
        for survey in surveys:
            survey_id = survey.get('_id')
            current_link = survey.get('shareable_link', '')
            creator_email = survey.get('creator_email', '')
            
            print(f"\nSurvey {survey_id}:")
            print(f"  Current: {current_link}")
            
            # Skip if already has user_id (and not 0)
            if 'user_id=' in current_link and 'user_id=0' not in current_link:
                print("  ✅ Already has user_id")
                continue
            
            if creator_email:
                creator = db.users.find_one({'email': creator_email})
                if creator and creator.get('simpleUserId'):
                    simple_user_id = creator['simpleUserId']
                    
                    # Determine base URL
                    if 'localhost' in current_link or not current_link:
                        base_url = "http://localhost:5173"
                    else:
                        base_url = "https://theinterwebsite.space"
                    
                    new_url = f"{base_url}/survey?offer_id={survey_id}&user_id={simple_user_id}"
                    
                    # Update
                    result = db.surveys.update_one(
                        {'_id': survey_id},
                        {
                            '$set': {
                                'shareable_link': new_url,
                                'public_link': new_url,
                                'simple_user_id': simple_user_id
                            }
                        }
                    )
                    
                    if result.modified_count > 0:
                        print(f"  ✅ FIXED: {new_url}")
                        fixed += 1
                    else:
                        print("  ⚠️ No changes")
                else:
                    print("  ❌ No creator or simpleUserId")
            else:
                print("  ❌ No creator email")
        
        print(f"\n🎉 Fixed {fixed} surveys!")
        
        # Show results
        print("\nRecent surveys:")
        recent = list(db.surveys.find({}).sort('created_at', -1).limit(5))
        for s in recent:
            print(f"  {s.get('_id')}: {s.get('shareable_link', 'No link')}")

if __name__ == "__main__":
    fix_surveys_direct()
