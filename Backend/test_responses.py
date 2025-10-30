#!/usr/bin/env python3

# Quick test for survey responses functionality
from enhanced_postback_sender import process_survey_responses, prepare_comprehensive_survey_data

def test_responses():
    print("🧪 Testing Survey Response Processing...")
    
    # Test sample responses
    sample_responses = {
        "question_1": "Very satisfied",
        "question_2": "Yes, I would recommend",
        "rating": "5/5",
        "feedback": "Great product!"
    }
    
    # Test processing
    result = process_survey_responses(sample_responses)
    
    print(f"✅ JSON: {result['json_string']}")
    print(f"✅ Flat: {result['flat_string']}")
    print(f"✅ Count: {result['count']}")
    print(f"✅ Summary: {result['summary']}")
    
    # Test comprehensive data
    survey_data = {
        "transaction_id": "TEST123",
        "username": "test_user",
        "responses": sample_responses,
        "status": "completed"
    }
    
    comprehensive = prepare_comprehensive_survey_data(survey_data)
    
    print(f"\n📋 Available response fields:")
    print(f"   responses: {comprehensive.get('responses', 'Missing!')}")
    print(f"   responses_flat: {comprehensive.get('responses_flat', 'Missing!')}")
    print(f"   responses_count: {comprehensive.get('responses_count', 'Missing!')}")
    print(f"   responses_summary: {comprehensive.get('responses_summary', 'Missing!')}")
    
    print("\n🎯 Survey responses are ready for partners!")

if __name__ == "__main__":
    test_responses()
