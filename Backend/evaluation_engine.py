"""
Survey Pass/Fail Evaluation Engine
Handles criteria evaluation, scoring, and pass/fail determination
"""

from datetime import datetime, timezone
from mongodb_config import db
from typing import Dict, List, Any, Tuple
import re

class SurveyEvaluationEngine:
    """Main evaluation engine for survey pass/fail logic"""
    
    def __init__(self):
        self.db = db
        
    def evaluate_survey_responses(
        self, 
        survey_id: str, 
        responses: Dict, 
        criteria_set_id: str = None
    ) -> Dict:
        """
        Main evaluation method for survey responses
        
        Args:
            survey_id: ID of the survey
            responses: Dictionary of question_id -> answer
            criteria_set_id: Specific criteria set to use (optional)
            
        Returns:
            Dictionary with evaluation results
        """
        try:
            print(f"🔍 Starting evaluation for survey {survey_id}")
            print(f"📝 Responses to evaluate: {responses}")
            
            # Get criteria to use
            criteria_doc = self._get_criteria_for_evaluation(survey_id, criteria_set_id)
            
            if not criteria_doc:
                print("❌ No criteria found for evaluation")
                return {
                    "status": "error",
                    "message": "No evaluation criteria configured",
                    "score": 0,
                    "criteria_met": [],
                    "criteria_failed": [],
                    "details": {}
                }
            
            print(f"✅ Using criteria: {criteria_doc['name']}")
            
            # Evaluate each criterion
            criteria_results = {}
            criteria_met = []
            criteria_failed = []
            total_weight = 0
            achieved_weight = 0
            
            for criterion in criteria_doc["criteria"]:
                result = self._evaluate_single_criterion(criterion, responses)
                criteria_results[criterion["id"]] = result
                
                weight = criterion.get("weight", 1.0)
                total_weight += weight
                
                if result["passed"]:
                    criteria_met.append(criterion["id"])
                    achieved_weight += weight
                else:
                    criteria_failed.append(criterion["id"])
                    
                print(f"📊 Criterion {criterion['id']}: {'✅ PASS' if result['passed'] else '❌ FAIL'}")
            
            # Determine overall pass/fail based on logic type
            logic_type = criteria_doc.get("logic_type", "all_required")
            overall_result = self._determine_overall_result(
                logic_type, 
                criteria_results, 
                criteria_doc, 
                achieved_weight, 
                total_weight
            )
            
            # Calculate final score
            final_score = (achieved_weight / total_weight * 100) if total_weight > 0 else 0
            
            evaluation_result = {
                "status": "pass" if overall_result else "fail",
                "score": round(final_score, 2),
                "criteria_met": criteria_met,
                "criteria_failed": criteria_failed,
                "details": {
                    "criteria_results": criteria_results,
                    "logic_type": logic_type,
                    "total_criteria": len(criteria_doc["criteria"]),
                    "criteria_passed": len(criteria_met),
                    "achieved_weight": achieved_weight,
                    "total_weight": total_weight,
                    "criteria_set_used": criteria_doc["_id"]
                },
                "evaluated_at": datetime.now(timezone.utc),
                "message": f"{'Qualified' if overall_result else 'Not qualified'} based on {logic_type} logic"
            }
            
            print(f"🏆 Final Result: {evaluation_result['status'].upper()} (Score: {evaluation_result['score']}%)")
            return evaluation_result
            
        except Exception as e:
            print(f"❌ Error in evaluation: {e}")
            return {
                "status": "error",
                "message": f"Evaluation failed: {str(e)}",
                "score": 0,
                "criteria_met": [],
                "criteria_failed": [],
                "details": {"error": str(e)}
            }
    
    def _get_criteria_for_evaluation(self, survey_id: str, criteria_set_id: str = None) -> Dict:
        """Get the appropriate criteria set for evaluation"""
        
        # If specific criteria set is requested, use that
        if criteria_set_id:
            criteria_doc = self.db.pass_fail_criteria.find_one({
                "_id": criteria_set_id,
                "is_active": True
            })
            if criteria_doc:
                print(f"✅ Using specified criteria: {criteria_doc['name']}")
                return criteria_doc
        
        # Try to get survey-specific criteria from survey configuration
        survey_config = self.db.survey_configurations.find_one({"survey_id": survey_id})
        if survey_config and survey_config.get("criteria_set_id"):
            criteria_doc = self.db.pass_fail_criteria.find_one({
                "_id": survey_config["criteria_set_id"],
                "is_active": True
            })
            if criteria_doc:
                print(f"✅ Using survey-specific criteria: {criteria_doc['name']}")
                return criteria_doc
        
        # Try to create dynamic criteria based on survey questions
        survey_doc = self.db.surveys.find_one({
            "$or": [{"_id": survey_id}, {"id": survey_id}]
        })
        
        if survey_doc and survey_doc.get("questions"):
            dynamic_criteria = self._create_dynamic_criteria_for_survey(survey_doc)
            if dynamic_criteria:
                print(f"🔧 Using dynamic criteria based on survey questions")
                return dynamic_criteria
        
        # Fall back to default criteria
        criteria_doc = self.db.pass_fail_criteria.find_one({
            "name": "Default Business Survey Criteria",
            "is_active": True
        })
        
        if criteria_doc:
            print(f"ℹ️ Using default criteria: {criteria_doc['name']}")
        else:
            print(f"⚠️ No criteria found for survey {survey_id}")
        
        return criteria_doc
    
    def _evaluate_single_criterion(self, criterion: Dict, responses: Dict) -> Dict:
        """Evaluate a single criterion against responses"""
        
        try:
            question_id = criterion["question_id"]
            condition = criterion["condition"]
            expected_value = criterion["expected_value"]
            
            # Get the actual response for this question
            actual_response = responses.get(question_id)
            
            if actual_response is None:
                return {
                    "passed": False,
                    "reason": f"No response found for question {question_id}",
                    "actual_value": None,
                    "expected_value": expected_value,
                    "condition": condition
                }
            
            # Normalize response for comparison
            normalized_response = self._normalize_response(actual_response)
            normalized_expected = self._normalize_response(expected_value)
            
            # Apply the condition
            passed = self._apply_condition(normalized_response, condition, normalized_expected)
            
            return {
                "passed": passed,
                "actual_value": actual_response,
                "expected_value": expected_value,
                "condition": condition,
                "reason": f"Response '{actual_response}' {'meets' if passed else 'does not meet'} criteria"
            }
            
        except Exception as e:
            return {
                "passed": False,
                "reason": f"Error evaluating criterion: {str(e)}",
                "actual_value": responses.get(criterion.get("question_id")),
                "expected_value": expected_value,
                "condition": condition
            }
    
    def _normalize_response(self, response: Any) -> Any:
        """Normalize response for consistent comparison"""
        if isinstance(response, str):
            # Convert to lowercase and strip whitespace
            return response.strip().lower()
        elif isinstance(response, (int, float)):
            return response
        else:
            return str(response).strip().lower()
    
    def _apply_condition(self, actual: Any, condition: str, expected: Any) -> bool:
        """Apply the specified condition for comparison"""
        
        try:
            if condition == "equals":
                return actual == expected
                
            elif condition == "not_equals":
                return actual != expected
                
            elif condition == "contains":
                return str(expected) in str(actual)
                
            elif condition == "not_contains":
                return str(expected) not in str(actual)
                
            elif condition == "starts_with":
                return str(actual).startswith(str(expected))
                
            elif condition == "ends_with":
                return str(actual).endswith(str(expected))
                
            elif condition == "greater_than":
                return float(actual) > float(expected)
                
            elif condition == "greater_than_or_equal":
                return float(actual) >= float(expected)
                
            elif condition == "less_than":
                return float(actual) < float(expected)
                
            elif condition == "less_than_or_equal":
                return float(actual) <= float(expected)
                
            elif condition == "in_list":
                # Expected should be a list
                expected_list = expected if isinstance(expected, list) else [expected]
                return actual in [self._normalize_response(item) for item in expected_list]
                
            elif condition == "not_in_list":
                expected_list = expected if isinstance(expected, list) else [expected]
                return actual not in [self._normalize_response(item) for item in expected_list]
                
            elif condition == "regex_match":
                return bool(re.match(str(expected), str(actual), re.IGNORECASE))
                
            elif condition == "length_greater_than":
                return len(str(actual)) > int(expected)
                
            elif condition == "length_less_than":
                return len(str(actual)) < int(expected)
                
            else:
                print(f"⚠️ Unknown condition: {condition}, defaulting to equals")
                return actual == expected
                
        except (ValueError, TypeError) as e:
            print(f"⚠️ Error applying condition {condition}: {e}")
            return False
    
    def _determine_overall_result(
        self, 
        logic_type: str, 
        criteria_results: Dict, 
        criteria_doc: Dict, 
        achieved_weight: float, 
        total_weight: float
    ) -> bool:
        """Determine overall pass/fail result based on logic type"""
        
        if logic_type == "all_required":
            # All required criteria must pass
            for criterion in criteria_doc["criteria"]:
                if criterion.get("required", False):
                    if not criteria_results[criterion["id"]]["passed"]:
                        return False
            return True
            
        elif logic_type == "threshold_based":
            # Must meet the specified threshold
            threshold = criteria_doc.get("passing_threshold", 50.0)
            score_percentage = (achieved_weight / total_weight * 100) if total_weight > 0 else 0
            return score_percentage >= threshold
            
        elif logic_type == "weighted_score":
            # Similar to threshold but with more explicit weight consideration
            threshold = criteria_doc.get("passing_threshold", total_weight / 2)
            return achieved_weight >= threshold
            
        elif logic_type == "any_required":
            # At least one required criterion must pass
            for criterion in criteria_doc["criteria"]:
                if criterion.get("required", False):
                    if criteria_results[criterion["id"]]["passed"]:
                        return True
            return False
            
        else:
            print(f"⚠️ Unknown logic type: {logic_type}, defaulting to all_required")
            return self._determine_overall_result("all_required", criteria_results, criteria_doc, achieved_weight, total_weight)
    
    def _create_dynamic_criteria_for_survey(self, survey_doc: Dict) -> Dict:
        """Create dynamic criteria based on survey questions"""
        try:
            questions = survey_doc.get("questions", [])
            if not questions:
                return None
            
            criteria_list = []
            criteria_count = 0
            
            for i, question in enumerate(questions):
                question_text = question.get("question", "").lower()
                question_type = question.get("type", "")
                question_id = question.get("id", f"q{i+1}")
                options = question.get("options", [])
                
                # Create criteria based on question patterns
                if "business" in question_text or "start" in question_text:
                    if question_type == "yes_no" or "yes" in [opt.lower() for opt in options]:
                        criteria_list.append({
                            "id": f"business_interest_{criteria_count}",
                            "question_id": question_id,
                            "condition": "equals",
                            "expected_value": "Yes",
                            "required": True,
                            "weight": 2.0,
                            "description": f"Must show business interest: {question.get('question', '')[:50]}..."
                        })
                        criteria_count += 1
                
                elif "age" in question_text:
                    if question_type in ["short_answer", "rating"]:
                        criteria_list.append({
                            "id": f"age_requirement_{criteria_count}",
                            "question_id": question_id,
                            "condition": "greater_than_or_equal",
                            "expected_value": 18,
                            "required": True,
                            "weight": 1.0,
                            "description": f"Must meet age requirement: {question.get('question', '')[:50]}..."
                        })
                        criteria_count += 1
                
                elif "income" in question_text or "salary" in question_text:
                    if question_type in ["short_answer", "rating", "multiple_choice"]:
                        criteria_list.append({
                            "id": f"income_requirement_{criteria_count}",
                            "question_id": question_id,
                            "condition": "greater_than",
                            "expected_value": 25000,
                            "required": False,
                            "weight": 1.5,
                            "description": f"Income criteria: {question.get('question', '')[:50]}..."
                        })
                        criteria_count += 1
                
                elif "experience" in question_text or "years" in question_text:
                    if question_type in ["short_answer", "rating", "multiple_choice"]:
                        criteria_list.append({
                            "id": f"experience_criteria_{criteria_count}",
                            "question_id": question_id,
                            "condition": "greater_than_or_equal",
                            "expected_value": 1,
                            "required": False,
                            "weight": 1.0,
                            "description": f"Experience requirement: {question.get('question', '')[:50]}..."
                        })
                        criteria_count += 1
                
                elif "recommend" in question_text or "likely" in question_text:
                    if question_type == "rating" or any(str(i) in str(options) for i in range(1, 11)):
                        criteria_list.append({
                            "id": f"recommendation_score_{criteria_count}",
                            "question_id": question_id,
                            "condition": "greater_than_or_equal",
                            "expected_value": 7,
                            "required": False,
                            "weight": 1.5,
                            "description": f"High recommendation score: {question.get('question', '')[:50]}..."
                        })
                        criteria_count += 1
                        
                elif "interested" in question_text or "interest" in question_text:
                    if question_type == "yes_no" or "yes" in [opt.lower() for opt in options]:
                        criteria_list.append({
                            "id": f"interest_criteria_{criteria_count}",
                            "question_id": question_id,
                            "condition": "equals",
                            "expected_value": "Yes",
                            "required": True,
                            "weight": 1.5,
                            "description": f"Must show interest: {question.get('question', '')[:50]}..."
                        })
                        criteria_count += 1
            
            if not criteria_list:
                # Create basic criteria if no patterns match
                if len(questions) >= 1:
                    first_question = questions[0]
                    criteria_list.append({
                        "id": "basic_completion",
                        "question_id": first_question.get("id", "q1"),
                        "condition": "not_equals",
                        "expected_value": "",
                        "required": True,
                        "weight": 1.0,
                        "description": "Basic completion requirement"
                    })
            
            # Return dynamic criteria set
            return {
                "_id": f"dynamic_{survey_doc.get('_id', survey_doc.get('id'))}",
                "name": f"Dynamic Criteria for {survey_doc.get('prompt', 'Survey')[:30]}...",
                "description": f"Auto-generated criteria based on survey questions",
                "criteria": criteria_list,
                "logic_type": "threshold_based",
                "passing_threshold": 60.0,
                "is_active": True,
                "is_dynamic": True
            }
            
        except Exception as e:
            print(f"Error creating dynamic criteria: {e}")
            return None

# Helper functions for external use
def evaluate_responses(survey_id: str, responses: Dict, criteria_set_id: str = None) -> Dict:
    """
    Convenience function to evaluate survey responses
    
    Args:
        survey_id: ID of the survey
        responses: Dictionary of responses (question_id -> answer)
        criteria_set_id: Optional specific criteria set to use
        
    Returns:
        Evaluation result dictionary
    """
    engine = SurveyEvaluationEngine()
    return engine.evaluate_survey_responses(survey_id, responses, criteria_set_id)

def check_survey_has_evaluation_enabled(survey_id: str) -> bool:
    """Check if a survey has pass/fail evaluation enabled"""
    try:
        survey_config = db.survey_configurations.find_one({"survey_id": survey_id})
        if survey_config:
            return survey_config.get("pass_fail_enabled", False)
        return False
    except Exception as e:
        print(f"Error checking evaluation status: {e}")
        return False

def get_survey_evaluation_config(survey_id: str) -> Dict:
    """Get complete evaluation configuration for a survey"""
    try:
        survey_config = db.survey_configurations.find_one({"survey_id": survey_id})
        if not survey_config:
            return {}
        
        # Get criteria details if specified
        criteria_details = None
        if survey_config.get("criteria_set_id"):
            criteria_details = db.pass_fail_criteria.find_one({
                "_id": survey_config["criteria_set_id"],
                "is_active": True
            })
        
        # Get PepperAds offer details if specified
        pepperads_details = None
        if survey_config.get("pepperads_offer_id"):
            pepperads_details = db.pepperads_offers.find_one({
                "_id": survey_config["pepperads_offer_id"],
                "is_active": True
            })
        
        return {
            "survey_config": survey_config,
            "criteria_details": criteria_details,
            "pepperads_details": pepperads_details
        }
        
    except Exception as e:
        print(f"Error getting survey config: {e}")
        return {}

# Test function
def test_evaluation_engine():
    """Test the evaluation engine with sample data"""
    print("\n🧪 Testing Evaluation Engine...")
    
    # Sample responses
    test_responses = {
        "q1": "Yes",  # Business interest
        "q2": "25"    # Age
    }
    
    # Test evaluation
    result = evaluate_responses("test_survey", test_responses)
    print(f"Test Result: {result}")
    
    return result

if __name__ == "__main__":
    test_evaluation_engine()
