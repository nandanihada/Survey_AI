"""
Redirect Rule Engine
Evaluates redirect rules against survey responses and determines which endpoint to use.
Also handles S2S (Server-to-Server) postback firing.
"""

import json
import re
import requests
from datetime import datetime, timezone
from mongodb_config import db
from typing import Dict, Optional, Any


class RedirectRuleEngine:
    """Engine that evaluates redirect rules and fires S2S postbacks"""
    
    def __init__(self):
        self.db = db
    
    def evaluate_redirect(
        self,
        survey_id: str,
        responses: Dict,
        evaluation_result: Dict,
        session_context: Dict
    ) -> Dict:
        """
        Main entry point: evaluate all rules and return the matched redirect endpoint.
        
        Args:
            survey_id: The survey ID
            responses: Dict of question_id -> answer
            evaluation_result: The pass/fail evaluation result
            session_context: Dict with session_id, click_id, email, username, etc.
            
        Returns:
            Dict with redirect_url, endpoint_name, status_code, fire_s2s, matched_rule
        """
        try:
            config = self.db.redirect_rules_config.find_one({"survey_id": survey_id})
            
            if not config:
                print(f"📡 [RedirectRules] No redirect rules config for survey {survey_id}")
                return {"matched": False, "reason": "no_config"}
            
            endpoints = config.get("redirect_endpoints", [])
            rules = config.get("redirect_rules", [])
            default_endpoint_id = config.get("default_redirect_endpoint_id")
            
            if not endpoints:
                print(f"📡 [RedirectRules] No endpoints configured for survey {survey_id}")
                return {"matched": False, "reason": "no_endpoints"}
            
            if not rules and not default_endpoint_id:
                print(f"📡 [RedirectRules] No rules or default configured for survey {survey_id}")
                return {"matched": False, "reason": "no_rules"}
            
            # Sort rules by priority (lower = higher priority)
            active_rules = [r for r in rules if r.get("is_active", True)]
            active_rules.sort(key=lambda r: r.get("priority", 999))
            
            print(f"📡 [RedirectRules] Evaluating {len(active_rules)} rules for survey {survey_id}")
            
            # Evaluate each rule in priority order
            for rule in active_rules:
                print(f"   📋 Checking rule: {rule.get('name', rule['id'])} (type: {rule['condition_type']}, priority: {rule.get('priority', 0)})")
                matched = self._evaluate_rule(rule, responses, evaluation_result)
                print(f"   {'✅ MATCHED' if matched else '❌ No match'}")
                if matched:
                    endpoint = self._find_endpoint(endpoints, rule["redirect_endpoint_id"])
                    if endpoint:
                        redirect_url = self._build_url(endpoint["url"], session_context, endpoint)
                        
                        result = {
                            "matched": True,
                            "redirect_url": redirect_url,
                            "endpoint_name": endpoint["name"],
                            "endpoint_id": endpoint["id"],
                            "status_code": endpoint.get("status_code", 1),
                            "fire_s2s": rule.get("fire_s2s", True),
                            "matched_rule": {
                                "id": rule["id"],
                                "name": rule.get("name", ""),
                                "condition_type": rule["condition_type"],
                                "priority": rule.get("priority", 0)
                            }
                        }
                        
                        print(f"✅ [RedirectRules] Rule matched: {rule.get('name', rule['id'])} → {endpoint['name']}")
                        
                        # Fire S2S if configured
                        if rule.get("fire_s2s", True):
                            s2s_result = self._fire_s2s(
                                survey_id, config.get("s2s_config"),
                                session_context, endpoint
                            )
                            result["s2s_result"] = s2s_result
                        
                        # Log the redirect
                        self._log_redirect(survey_id, session_context, result, rule)
                        
                        return result
            
            # No rule matched — use default endpoint
            if default_endpoint_id:
                endpoint = self._find_endpoint(endpoints, default_endpoint_id)
                if endpoint:
                    redirect_url = self._build_url(endpoint["url"], session_context, endpoint)
                    
                    result = {
                        "matched": True,
                        "redirect_url": redirect_url,
                        "endpoint_name": endpoint["name"],
                        "endpoint_id": endpoint["id"],
                        "status_code": endpoint.get("status_code", 1),
                        "fire_s2s": True,
                        "matched_rule": {"id": "default", "name": "Default Fallback", "condition_type": "default", "priority": 9999}
                    }
                    
                    print(f"📡 [RedirectRules] No rules matched, using default: {endpoint['name']}")
                    
                    # Fire S2S for default too
                    s2s_result = self._fire_s2s(
                        survey_id, config.get("s2s_config"),
                        session_context, endpoint
                    )
                    result["s2s_result"] = s2s_result
                    
                    self._log_redirect(survey_id, session_context, result, None)
                    return result
            
            print(f"📡 [RedirectRules] No rules matched and no default set")
            return {"matched": False, "reason": "no_match"}
            
        except Exception as e:
            print(f"❌ [RedirectRules] Error evaluating redirect: {e}")
            import traceback
            traceback.print_exc()
            return {"matched": False, "reason": f"error: {str(e)}"}
    
    def _evaluate_rule(self, rule: Dict, responses: Dict, evaluation_result: Dict) -> bool:
        """Evaluate a single rule against the responses"""
        condition_type = rule.get("condition_type", "")
        condition = rule.get("condition", "equals")
        expected_value = rule.get("expected_value", "")
        
        try:
            if condition_type == "answer_based":
                question_id = rule.get("question_id", "")
                if not question_id:
                    return False
                
                actual_value = responses.get(question_id)
                if actual_value is None:
                    print(f"      ⚠️ No response found for question_id '{question_id}'. Available keys: {list(responses.keys())}")
                    return False
                
                result = self._apply_condition(str(actual_value).strip().lower(), condition, str(expected_value).strip().lower())
                print(f"      🔍 Q:{question_id} actual='{actual_value}' {condition} expected='{expected_value}' → {result}")
                return result
            
            elif condition_type == "criteria_set":
                # Evaluate an entire criteria set and check if it passes
                criteria_set_id = rule.get("question_id", "")  # stored in question_id field
                if not criteria_set_id:
                    return False
                
                try:
                    from evaluation_engine import SurveyEvaluationEngine
                    engine = SurveyEvaluationEngine()
                    result = engine.evaluate_survey_responses("", responses, criteria_set_id)
                    return result.get("status") == "pass"
                except Exception as e:
                    print(f"⚠️ [RedirectRules] Error evaluating criteria set {criteria_set_id}: {e}")
                    return False
            
            elif condition_type == "evaluation_result":
                actual_status = evaluation_result.get("status", "unknown")
                return self._apply_condition(actual_status.lower(), condition, str(expected_value).strip().lower())
            
            elif condition_type == "score_based":
                actual_score = evaluation_result.get("score", 0)
                try:
                    expected_num = float(expected_value)
                except (ValueError, TypeError):
                    expected_num = 0
                return self._apply_numeric_condition(actual_score, condition, expected_num)
            
            elif condition_type == "always":
                return True
            
            else:
                print(f"⚠️ [RedirectRules] Unknown condition_type: {condition_type}")
                return False
                
        except Exception as e:
            print(f"⚠️ [RedirectRules] Error evaluating rule {rule.get('id')}: {e}")
            return False
    
    def _apply_condition(self, actual: str, condition: str, expected: str) -> bool:
        """Apply string-based condition"""
        if condition == "equals":
            return actual == expected
        elif condition == "not_equals":
            return actual != expected
        elif condition == "contains":
            return expected in actual
        elif condition == "not_contains":
            return expected not in actual
        elif condition == "starts_with":
            return actual.startswith(expected)
        elif condition == "ends_with":
            return actual.endswith(expected)
        elif condition == "in_list":
            expected_list = [v.strip().lower() for v in expected.split(",")]
            return actual in expected_list
        elif condition == "not_in_list":
            expected_list = [v.strip().lower() for v in expected.split(",")]
            return actual not in expected_list
        elif condition == "regex_match":
            return bool(re.match(expected, actual, re.IGNORECASE))
        else:
            return actual == expected
    
    def _apply_numeric_condition(self, actual: float, condition: str, expected: float) -> bool:
        """Apply numeric condition"""
        if condition == "equals":
            return actual == expected
        elif condition == "not_equals":
            return actual != expected
        elif condition == "greater_than":
            return actual > expected
        elif condition == "greater_than_or_equal":
            return actual >= expected
        elif condition == "less_than":
            return actual < expected
        elif condition == "less_than_or_equal":
            return actual <= expected
        else:
            return actual == expected
    
    def _find_endpoint(self, endpoints: list, endpoint_id: str) -> Optional[Dict]:
        """Find an endpoint by ID"""
        for ep in endpoints:
            if ep["id"] == endpoint_id:
                return ep
        return None
    
    def _build_url(self, url_template: str, session_context: Dict, endpoint: Dict) -> str:
        """Build the final redirect URL by replacing placeholders"""
        replacements = {
            "{session_id}": session_context.get("session_id", ""),
            "{survey_id}": session_context.get("survey_id", ""),
            "{click_id}": session_context.get("click_id", ""),
            "{user_id}": session_context.get("user_id", ""),
            "{email}": session_context.get("email", ""),
            "{username}": session_context.get("username", ""),
            "{ip_address}": session_context.get("ip_address", ""),
            "{timestamp}": str(int(datetime.now(timezone.utc).timestamp())),
            "{iso_timestamp}": datetime.now(timezone.utc).isoformat(),
            "{score}": str(session_context.get("score", 0)),
            "{status}": session_context.get("status", ""),
            "{redirect_status_code}": str(endpoint.get("status_code", 1)),
            "{respondent_id}": session_context.get("session_id", ""),
            "{sub1}": session_context.get("sub1", ""),
            "{sub2}": session_context.get("sub2", ""),
        }
        
        url = url_template
        for placeholder, value in replacements.items():
            url = url.replace(placeholder, str(value))
        
        # Remove any unreplaced placeholders
        url = re.sub(r'\{[^}]+\}', '', url)
        
        # Ensure URL has protocol prefix
        if url and not url.startswith('http://') and not url.startswith('https://'):
            url = 'https://' + url
        
        return url
    
    def _fire_s2s(self, survey_id: str, s2s_config: Optional[Dict], session_context: Dict, endpoint: Dict) -> Dict:
        """Fire S2S postback to partner"""
        if not s2s_config or not s2s_config.get("enabled"):
            return {"fired": False, "reason": "s2s_not_enabled"}
        
        try:
            api_endpoint = s2s_config.get("endpoint", "")
            api_key = s2s_config.get("api_key", "")
            method = s2s_config.get("method", "POST")
            body_template = s2s_config.get("body_template", {})
            custom_headers = s2s_config.get("headers", {})
            
            if not api_endpoint:
                return {"fired": False, "reason": "no_endpoint"}
            
            # Build replacements
            replacements = {
                "{session_id}": session_context.get("session_id", ""),
                "{survey_id}": session_context.get("survey_id", survey_id),
                "{respondent_id}": session_context.get("session_id", ""),
                "{redirect_status_code}": str(endpoint.get("status_code", 1)),
                "{email}": session_context.get("email", ""),
                "{username}": session_context.get("username", ""),
                "{click_id}": session_context.get("click_id", ""),
                "{score}": str(session_context.get("score", 0)),
                "{status}": session_context.get("status", ""),
                "{timestamp}": datetime.now(timezone.utc).isoformat(),
                "{ip_address}": session_context.get("ip_address", ""),
                "{sub1}": session_context.get("sub1", ""),
                "{sub2}": session_context.get("sub2", ""),
            }
            
            # Replace placeholders in body template
            body_str = json.dumps(body_template)
            for placeholder, value in replacements.items():
                body_str = body_str.replace(placeholder, str(value))
            
            body = json.loads(body_str)
            
            # Build headers
            headers = {"Content-Type": "application/json"}
            if api_key:
                headers["X-Api-Key"] = api_key
            headers.update(custom_headers)
            
            print(f"📡 [S2S] Firing {method} to {api_endpoint}")
            print(f"📡 [S2S] Body: {body}")
            
            # Send request
            if method.upper() == "POST":
                response = requests.post(api_endpoint, json=body, headers=headers, timeout=15)
            elif method.upper() == "GET":
                # For GET: replace placeholders directly in the endpoint URL
                get_url = api_endpoint
                for placeholder, value in replacements.items():
                    get_url = get_url.replace(placeholder, str(value))
                print(f"📡 [S2S] GET URL: {get_url}")
                response = requests.get(get_url, timeout=15)
            else:
                response = requests.post(api_endpoint, json=body, headers=headers, timeout=15)
            
            success = response.status_code in [200, 201, 202]
            
            print(f"{'✅' if success else '❌'} [S2S] Response: {response.status_code} - {response.text[:200]}")
            
            # Log S2S attempt
            self._log_s2s(survey_id, session_context, s2s_config, response, endpoint)
            
            return {
                "fired": True,
                "success": success,
                "status_code": response.status_code,
                "response_text": response.text[:200]
            }
            
        except requests.exceptions.RequestException as e:
            print(f"❌ [S2S] Request failed: {e}")
            return {"fired": True, "success": False, "error": str(e)}
        except Exception as e:
            print(f"❌ [S2S] Error: {e}")
            return {"fired": False, "success": False, "error": str(e)}
    
    def _log_redirect(self, survey_id: str, session_context: Dict, result: Dict, rule: Optional[Dict]):
        """Log redirect decision to database"""
        try:
            log_entry = {
                "survey_id": survey_id,
                "session_id": session_context.get("session_id", ""),
                "endpoint_name": result.get("endpoint_name", ""),
                "endpoint_id": result.get("endpoint_id", ""),
                "redirect_url": result.get("redirect_url", ""),
                "status_code": result.get("status_code", 0),
                "matched_rule_id": rule.get("id") if rule else "default",
                "matched_rule_name": rule.get("name", "") if rule else "Default Fallback",
                "timestamp": datetime.now(timezone.utc)
            }
            self.db.redirect_rule_logs.insert_one(log_entry)
        except Exception as e:
            print(f"⚠️ [RedirectRules] Failed to log redirect: {e}")
    
    def _log_s2s(self, survey_id: str, session_context: Dict, s2s_config: Dict, response, endpoint: Dict):
        """Log S2S attempt to database"""
        try:
            log_entry = {
                "type": "s2s_outbound",
                "survey_id": survey_id,
                "session_id": session_context.get("session_id", ""),
                "partner_name": s2s_config.get("partner_name", "Unknown"),
                "endpoint_url": s2s_config.get("endpoint", ""),
                "method": s2s_config.get("method", "POST"),
                "redirect_status_code": endpoint.get("status_code", 0),
                "http_status": response.status_code,
                "response_text": response.text[:500],
                "success": response.status_code in [200, 201, 202],
                "timestamp": datetime.now(timezone.utc)
            }
            self.db.s2s_postback_logs.insert_one(log_entry)
        except Exception as e:
            print(f"⚠️ [S2S] Failed to log: {e}")


# Module-level convenience function
_engine = RedirectRuleEngine()

def evaluate_redirect_rules(survey_id: str, responses: Dict, evaluation_result: Dict, session_context: Dict) -> Dict:
    """Convenience function to evaluate redirect rules"""
    return _engine.evaluate_redirect(survey_id, responses, evaluation_result, session_context)
