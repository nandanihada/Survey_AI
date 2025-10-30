#!/usr/bin/env python3

from mongodb_config import db

def get_survey_ids():
    """Get some survey IDs for testing"""
    try:
        surveys = list(db.surveys.find({}, {'_id': 1, 'prompt': 1}).limit(5))
        print("Available surveys:")
        for survey in surveys:
            prompt = survey.get('prompt', 'No prompt')[:50] + '...'
            print(f"  {survey['_id']}: {prompt}")
        
        if surveys:
            return surveys[0]['_id']
        return None
    except Exception as e:
        print(f"Error getting surveys: {e}")
        return None

if __name__ == "__main__":
    survey_id = get_survey_ids()
    if survey_id:
        print(f"\nFirst survey ID: {survey_id}")
    else:
        print("No surveys found")
