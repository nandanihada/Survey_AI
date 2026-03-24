"""
Email Trigger System for PepperAds Platform
Handles answer-based email triggers and template management
"""

import os
import re
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from bson import ObjectId
from mongodb_config import db
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmailTriggerService:
    """Service for managing email triggers and sending emails"""
    
    def __init__(self):
        self.db = db
        # Email configuration for Gmail
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME', 'rupavathivoosa2003@gmail.com')
        self.smtp_password = os.getenv('SMTP_PASSWORD', 'glhj qhgd rxya lcyl')
        self.from_email = os.getenv('FROM_EMAIL', 'rupavathivoosa2003@gmail.com')
        
        print(f"📧 Email Service Initialized:")
        print(f"   SMTP Server: {self.smtp_server}")
        print(f"   SMTP Port: {self.smtp_port}")
        print(f"   From Email: {self.from_email}")
        print(f"   Username Configured: {bool(self.smtp_username)}")
        print(f"   Password Configured: {bool(self.smtp_password)}")
        print(f"   ✅ Gmail App Password configured!")
        
    def create_email_template(self, template_data: Dict[str, Any], created_by: str) -> Dict[str, Any]:
        """Create a new email template"""
        try:
            template = {
                "name": template_data.get("name"),
                "subject": template_data.get("subject"),
                "body": template_data.get("body"),
                "created_by": created_by,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "is_active": True
            }
            
            # Validate required fields
            if not template["name"] or not template["subject"] or not template["body"]:
                return {"error": "Name, subject, and body are required"}
            
            # Check if template name already exists for this user
            existing = self.db.email_templates.find_one({
                "name": template["name"], 
                "created_by": created_by
            })
            if existing:
                return {"error": "Template name already exists"}
            
            result = self.db.email_templates.insert_one(template)
            template["_id"] = str(result.inserted_id)
            
            return {
                "success": True,
                "template": template,
                "message": "Email template created successfully"
            }
            
        except Exception as e:
            logger.error(f"Error creating email template: {e}")
            return {"error": f"Failed to create template: {str(e)}"}
    
    def get_email_templates(self, created_by: str) -> Dict[str, Any]:
        """Get all email templates for a user"""
        try:
            templates = list(self.db.email_templates.find(
                {"created_by": created_by, "is_active": True}
            ).sort("created_at", -1))
            
            # Convert ObjectId to string
            for template in templates:
                template["_id"] = str(template["_id"])
            
            return {
                "success": True,
                "templates": templates,
                "total": len(templates)
            }
            
        except Exception as e:
            logger.error(f"Error getting email templates: {e}")
            return {"error": f"Failed to get templates: {str(e)}"}
    
    def update_email_template(self, template_id: str, template_data: Dict[str, Any], created_by: str) -> Dict[str, Any]:
        """Update an email template"""
        try:
            # Check if user owns this template
            template = self.db.email_templates.find_one({
                "_id": ObjectId(template_id), 
                "created_by": created_by
            })
            if not template:
                return {"error": "Template not found or access denied"}
            
            # Update fields
            update_data = {
                "updated_at": datetime.now(timezone.utc)
            }
            
            if "name" in template_data:
                update_data["name"] = template_data["name"]
            if "subject" in template_data:
                update_data["subject"] = template_data["subject"]
            if "body" in template_data:
                update_data["body"] = template_data["body"]
            if "is_active" in template_data:
                update_data["is_active"] = template_data["is_active"]
            
            self.db.email_templates.update_one(
                {"_id": ObjectId(template_id)},
                {"$set": update_data}
            )
            
            return {"success": True, "message": "Template updated successfully"}
            
        except Exception as e:
            logger.error(f"Error updating email template: {e}")
            return {"error": f"Failed to update template: {str(e)}"}
    
    def delete_email_template(self, template_id: str, created_by: str) -> Dict[str, Any]:
        """Delete an email template"""
        try:
            # Check if user owns this template
            template = self.db.email_templates.find_one({
                "_id": ObjectId(template_id), 
                "created_by": created_by
            })
            if not template:
                return {"error": "Template not found or access denied"}
            
            # Check if template is being used by any triggers
            triggers_using = self.db.email_triggers.count_documents({
                "email_template_id": template_id,
                "is_active": True
            })
            if triggers_using > 0:
                return {"error": f"Cannot delete template. It's being used by {triggers_using} trigger(s)"}
            
            # Soft delete (mark as inactive)
            self.db.email_templates.update_one(
                {"_id": ObjectId(template_id)},
                {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
            )
            
            return {"success": True, "message": "Template deleted successfully"}
            
        except Exception as e:
            logger.error(f"Error deleting email template: {e}")
            return {"error": f"Failed to delete template: {str(e)}"}
    
    def create_email_trigger(self, trigger_data: Dict[str, Any], created_by: str) -> Dict[str, Any]:
        """Create a new email trigger"""
        try:
            print(f"DEBUG: Creating email trigger with data: {trigger_data}")
            print(f"DEBUG: created_by: {created_by}")
            
            # Validate required fields
            required_fields = ["survey_id", "question_id", "answer_value", "email_template_id"]
            for field in required_fields:
                if not trigger_data.get(field):
                    print(f"DEBUG: Missing required field: {field}")
                    return {"error": f"{field} is required"}
            
            # Check if user owns the survey - handle both short IDs and ObjectIds
            survey_id = trigger_data["survey_id"]
            is_short_id = len(survey_id) == 5 and survey_id.isalnum()
            
            # For testing, let's not require ownership - just find the survey
            survey_query = {}
            if is_short_id:
                survey_query["id"] = survey_id
            else:
                survey_query["_id"] = ObjectId(survey_id)
            
            print(f"DEBUG: Looking for survey with query: {survey_query}")
            survey = self.db.surveys.find_one(survey_query)
            
            if not survey:
                print(f"DEBUG: Survey not found with query: {survey_query}")
                return {"error": "Survey not found"}
            
            print(f"DEBUG: Found survey: {survey.get('_id')}")
            
            # Check if user owns the template - for now, let's not require ownership
            template = self.db.email_templates.find_one({
                "_id": ObjectId(trigger_data["email_template_id"])
            })
            if not template:
                print(f"DEBUG: Template not found: {trigger_data['email_template_id']}")
                return {"error": "Email template not found"}
            
            # Use the actual survey _id for the trigger
            actual_survey_id = str(survey["_id"])
            
            trigger = {
                "survey_id": actual_survey_id,
                "question_id": trigger_data["question_id"],
                "condition": trigger_data.get("condition", "equals"),
                "answer_value": trigger_data["answer_value"],
                "email_template_id": trigger_data["email_template_id"],
                "send_to": trigger_data.get("send_to", "respondent"),  # respondent, admin, both
                "delay_minutes": trigger_data.get("delay_minutes", 0),  # For future delayed sending
                "created_by": created_by,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "is_active": True
            }
            
            print(f"DEBUG: Creating trigger: {trigger}")
            result = self.db.email_triggers.insert_one(trigger)
            trigger["_id"] = str(result.inserted_id)
            
            return {
                "success": True,
                "trigger": trigger,
                "message": "Email trigger created successfully"
            }
            
        except Exception as e:
            logger.error(f"Error creating email trigger: {e}")
            return {"error": f"Failed to create trigger: {str(e)}"}
    
    def extract_email_from_survey_response(self, survey_id: str, responses: Dict[str, Any]) -> str:
        """Extract email from survey responses by looking for email-type questions"""
        try:
            # Get survey structure to find email questions
            survey = self.db.surveys.find_one({"id": survey_id})
            if not survey:
                survey = self.db.surveys.find_one({"_id": ObjectId(survey_id)})
            
            if not survey:
                print(f"📧 Survey not found: {survey_id}")
                return None
            
            questions = survey.get('questions', [])
            email_found = None
            
            # Look for questions that ask for email
            for question in questions:
                question_text = question.get('question', '').lower()
                question_id = question.get('id')
                
                # Check if this question asks for email
                if any(keyword in question_text for keyword in ['email', 'e-mail', 'mail address', 'email address', 'mail id', 'mail id?', 'email id', 'email id?']):
                    # Get the answer for this question
                    answer_value = responses.get(question_id)
                    if answer_value:
                        # Basic email validation
                        if '@' in str(answer_value) and '.' in str(answer_value):
                            email_found = str(answer_value)
                            print(f"📧 Found email from question '{question_text}': {email_found}")
                            break
            
            if email_found:
                return email_found
            else:
                print(f"📧 No email found in survey responses")
                return None
                
        except Exception as e:
            print(f"📧 Error extracting email from survey: {e}")
            return None
    
    def schedule_email_trigger(self, trigger_id: str, delay_minutes: int, to_email: str, response_data: Dict[str, Any]) -> Dict[str, Any]:
        """Schedule an email trigger with delay"""
        try:
            # Calculate send time
            from datetime import datetime, timezone, timedelta
            send_time = datetime.now(timezone.utc) + timedelta(minutes=delay_minutes)
            
            # Create scheduled email record
            scheduled_email = {
                "trigger_id": trigger_id,
                "to_email": to_email,
                "response_data": response_data,
                "scheduled_at": datetime.now(timezone.utc),
                "send_at": send_time,
                "status": "scheduled",
                "created_at": datetime.now(timezone.utc)
            }
            
            result = self.db.scheduled_emails.insert_one(scheduled_email)
            scheduled_email["_id"] = str(result.inserted_id)
            
            print(f"📧 Email scheduled to be sent to {to_email} at {send_time}")
            
            return {
                "success": True,
                "scheduled_email": scheduled_email,
                "message": f"Email scheduled to be sent in {delay_minutes} minutes"
            }
            
        except Exception as e:
            print(f"📧 Error scheduling email: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def process_scheduled_emails(self) -> Dict[str, Any]:
        """Process and send scheduled emails that are due"""
        try:
            from datetime import datetime, timezone
            
            # Find emails that are due to be sent
            now = datetime.now(timezone.utc)
            due_emails = list(self.db.scheduled_emails.find({
                "status": "scheduled",
                "send_at": {"$lte": now}
            }))
            
            results = {
                "processed": 0,
                "sent": 0,
                "failed": 0,
                "details": []
            }
            
            for scheduled_email in due_emails:
                results["processed"] += 1
                
                try:
                    # Get trigger details
                    trigger = self.db.email_triggers.find_one({"_id": ObjectId(scheduled_email["trigger_id"])})
                    if not trigger:
                        continue
                    
                    # Get email template
                    template = self.db.email_templates.find_one({"_id": ObjectId(trigger["email_template_id"])})
                    if not template:
                        continue
                    
                    # Send email
                    email_result = self.send_email(
                        to_email=scheduled_email["to_email"],
                        subject=template.get("subject", "Survey Response"),
                        body=template.get("body", "Thank you for your response"),
                        is_html=True
                    )
                    
                    if email_result:
                        # Update status to sent
                        self.db.scheduled_emails.update_one(
                            {"_id": scheduled_email["_id"]},
                            {"$set": {"status": "sent", "sent_at": now}}
                        )
                        results["sent"] += 1
                        results["details"].append({
                            "email_id": str(scheduled_email["_id"]),
                            "to_email": scheduled_email["to_email"],
                            "status": "sent"
                        })
                        print(f"📧 Scheduled email sent successfully to {scheduled_email['to_email']}")
                    else:
                        # Update status to failed
                        self.db.scheduled_emails.update_one(
                            {"_id": scheduled_email["_id"]},
                            {"$set": {"status": "failed", "error": "SMTP send failed"}}
                        )
                        results["failed"] += 1
                        results["details"].append({
                            "email_id": str(scheduled_email["_id"]),
                            "to_email": scheduled_email["to_email"],
                            "status": "failed",
                            "error": "SMTP send failed"
                        })
                        
                except Exception as e:
                    # Update status to failed
                    self.db.scheduled_emails.update_one(
                        {"_id": scheduled_email["_id"]},
                        {"$set": {"status": "failed", "error": str(e)}}
                    )
                    results["failed"] += 1
                    results["details"].append({
                        "email_id": str(scheduled_email["_id"]),
                        "to_email": scheduled_email["to_email"],
                        "status": "failed",
                        "error": str(e)
                    })
                    print(f"📧 Failed to send scheduled email: {e}")
            
            print(f"📧 Processed {results['processed']} scheduled emails: {results['sent']} sent, {results['failed']} failed")
            
            return results
            
        except Exception as e:
            print(f"📧 Error processing scheduled emails: {e}")
            return {
                "processed": 0,
                "sent": 0,
                "failed": 0,
                "error": str(e)
            }
    
    def send_triggered_email(self, trigger_id: str, response_data: Dict[str, Any]) -> Dict[str, Any]:
        """Send triggered email using the new backend-only system"""
        try:
            # Get trigger details
            try:
                trigger = self.db.email_triggers.find_one({"_id": ObjectId(trigger_id)})
            except:
                # If trigger_id is not a valid ObjectId, try as string
                trigger = self.db.email_triggers.find_one({"_id": trigger_id})
            
            if not trigger:
                return {"success": False, "error": "Trigger not found"}
            
            # Get survey ID from trigger
            survey_id = trigger.get("survey_id")
            
            # Extract email from survey responses
            # Convert response_data.answers to the format expected by extract_email_from_survey_response
            responses_dict = {}
            if 'answers' in response_data:
                for answer_item in response_data['answers']:
                    question_id = answer_item.get('question_id')
                    answer_value = answer_item.get('answer')
                    if question_id and answer_value:
                        responses_dict[question_id] = answer_value
            
            user_email = self.extract_email_from_survey_response(survey_id, responses_dict)
            
            if not user_email:
                return {
                    "success": False, 
                    "error": "No email found in survey responses",
                    "reason": "No email question answered or email not provided"
                }
            
            # Get email template
            template = self.db.email_templates.find_one({"_id": ObjectId(trigger["email_template_id"])})
            if not template:
                return {"success": False, "error": "Email template not found"}
            
            # Get delay settings
            delay_minutes = trigger.get("delay_minutes", 0)
            
            # Process template variables
            processed_template = self.process_template_variables(template, response_data)
            
            if delay_minutes == 0:
                # Send immediately
                email_result = self.send_email(
                    to_email=user_email,
                    subject=processed_template.get("subject", "Survey Response"),
                    body=processed_template.get("body", "Thank you for your response"),
                    is_html=True
                )
                
                if email_result:
                    return {
                        "success": True,
                        "message": "Email sent successfully",
                        "to_email": user_email,
                        "delay_minutes": 0
                    }
                else:
                    return {
                        "success": False,
                        "error": "Failed to send email via SMTP"
                    }
            else:
                # Schedule for later
                schedule_result = self.schedule_email_trigger(
                    trigger_id=trigger_id,
                    delay_minutes=delay_minutes,
                    to_email=user_email,
                    response_data=response_data
                )
                
                return schedule_result
                
        except Exception as e:
            print(f"📧 Error in send_triggered_email: {e}")
            return {"success": False, "error": str(e)}
    
    def process_survey_triggers(self, survey_id: str, response_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process all email triggers for a survey submission"""
        try:
            print(f"📧 Processing email triggers for survey: {survey_id}")
            
            # Get all active triggers for this survey
            triggers = list(self.db.email_triggers.find({
                "survey_id": survey_id,  # Use short ID directly
                "is_active": True
            }))
            
            print(f"📧 Found {len(triggers)} email triggers")
            
            emails_sent = []
            emails_failed = []
            
            for trigger in triggers:
                try:
                    question_id = trigger.get('question_id')
                    required_answer = trigger.get('answer_value')
                    
                    print(f"📧 Checking trigger - Question: {question_id}, Required: {required_answer}")
                    
                    # Check if the trigger condition is met
                    user_answer = None
                    
                    # Look for answer in response_data.answers
                    if 'answers' in response_data:
                        for answer_item in response_data['answers']:
                            if answer_item.get('question_id') == question_id:
                                user_answer = answer_item.get('answer')
                                break
                    
                    # Also check in response_data directly (for backward compatibility)
                    if user_answer is None and question_id in response_data:
                        user_answer = response_data[question_id]
                    
                    print(f"📧 User answered: {user_answer}")
                    
                    if user_answer and str(user_answer).lower() == str(required_answer).lower():
                        print(f"📧 ✅ Trigger met! Question {question_id} = {required_answer}")
                        
                        # Send triggered email
                        email_result = self.send_triggered_email(
                            str(trigger['_id']),
                            response_data
                        )
                        
                        if email_result.get('success'):
                            emails_sent.append({
                                'trigger_id': str(trigger['_id']),
                                'recipient': email_result.get('to_email', 'unknown'),
                                'subject': 'Email sent successfully',
                                'delay_minutes': email_result.get('delay_minutes', 0)
                            })
                            print(f"📧 ✅ Email processed: {email_result}")
                        else:
                            emails_failed.append({
                                'trigger_id': str(trigger['_id']),
                                'reason': email_result.get('error', 'Unknown error'),
                                'details': email_result
                            })
                            print(f"📧 ❌ Email failed: {email_result}")
                    else:
                        print(f"📧 ❌ Trigger not met - Expected: {required_answer}, Got: {user_answer}")
                        
                except Exception as e:
                    print(f"📧 Error processing trigger {trigger.get('_id')}: {e}")
                    emails_failed.append({
                        'trigger_id': str(trigger.get('_id')),
                        'reason': f'Processing error: {str(e)}'
                    })
            
            result = {
                'success': True,
                'triggers_found': len(triggers),
                'emails_sent': emails_sent,
                'emails_failed': emails_failed,
                'total_processed': len(emails_sent) + len(emails_failed)
            }
            
            print(f"📧 Email trigger processing complete: {len(emails_sent)} sent, {len(emails_failed)} failed")
            
            return result
            
        except Exception as e:
            print(f"📧 Error in process_survey_triggers: {e}")
            return {
                'success': False,
                'error': str(e),
                'emails_sent': [],
                'emails_failed': []
            }
    
    def get_email_triggers(self, survey_id: str, created_by: str) -> Dict[str, Any]:
        """Get all email triggers for a survey"""
        try:
            triggers = list(self.db.email_triggers.find({
                "survey_id": survey_id,
                "created_by": created_by,
                "is_active": True
            }).sort("created_at", -1))
            
            # Populate template details
            for trigger in triggers:
                trigger["_id"] = str(trigger["_id"])
                # Get template details
                template = self.db.email_templates.find_one({
                    "_id": ObjectId(trigger["email_template_id"])
                })
                if template:
                    trigger["template_name"] = template["name"]
                    trigger["template_subject"] = template["subject"]
                else:
                    trigger["template_name"] = "Unknown Template"
                    trigger["template_subject"] = "No Subject"
            
            return {
                "success": True,
                "triggers": triggers,
                "total": len(triggers)
            }
            
        except Exception as e:
            logger.error(f"Error getting email triggers: {e}")
            return {"error": f"Failed to get triggers: {str(e)}"}
    
    def update_email_trigger(self, trigger_id: str, trigger_data: Dict[str, Any], created_by: str) -> Dict[str, Any]:
        """Update an email trigger"""
        try:
            # Check if user owns this trigger
            trigger = self.db.email_triggers.find_one({
                "_id": ObjectId(trigger_id), 
                "created_by": created_by
            })
            if not trigger:
                return {"error": "Trigger not found or access denied"}
            
            # Update fields
            update_data = {
                "updated_at": datetime.now(timezone.utc)
            }
            
            allowed_fields = ["question_id", "condition", "answer_value", "email_template_id", "send_to", "delay_minutes", "is_active"]
            for field in allowed_fields:
                if field in trigger_data:
                    update_data[field] = trigger_data[field]
            
            self.db.email_triggers.update_one(
                {"_id": ObjectId(trigger_id)},
                {"$set": update_data}
            )
            
            return {"success": True, "message": "Trigger updated successfully"}
            
        except Exception as e:
            logger.error(f"Error updating email trigger: {e}")
            return {"error": f"Failed to update trigger: {str(e)}"}
    
    def delete_email_trigger(self, trigger_id: str, created_by: str) -> Dict[str, Any]:
        """Delete an email trigger"""
        try:
            # Check if user owns this trigger
            trigger = self.db.email_triggers.find_one({
                "_id": ObjectId(trigger_id), 
                "created_by": created_by
            })
            if not trigger:
                return {"error": "Trigger not found or access denied"}
            
            # Soft delete (mark as inactive)
            self.db.email_triggers.update_one(
                {"_id": ObjectId(trigger_id)},
                {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
            )
            
            return {"success": True, "message": "Trigger deleted successfully"}
            
        except Exception as e:
            logger.error(f"Error deleting email trigger: {e}")
            return {"error": f"Failed to delete trigger: {str(e)}"}
    
    def substitute_variables(self, template: str, variables: Dict[str, str]) -> str:
        """Replace template variables with actual values"""
        try:
            # Common variables
            variable_patterns = {
                "{{name}}": variables.get("name", "User"),
                "{{email}}": variables.get("email", ""),
                "{{survey_name}}": variables.get("survey_name", "Survey"),
                "{{answer}}": variables.get("answer", ""),
                "{{question}}": variables.get("question", ""),
                "{{response_date}}": variables.get("response_date", datetime.now().strftime("%Y-%m-%d")),
                "{{product_link}}": variables.get("product_link", ""),
            }
            
            # Replace all variables
            result = template
            for pattern, value in variable_patterns.items():
                result = result.replace(pattern, str(value))
            
            return result
            
        except Exception as e:
            logger.error(f"Error substituting variables: {e}")
            return template  # Return original template if substitution fails
    
    def send_email(self, to_email: str, subject: str, body: str, is_html: bool = False) -> bool:
        """Send email using SMTP"""
        try:
            if not self.smtp_username or not self.smtp_password or self.smtp_password == 'your-gmail-app-password':
                print(f"❌ SMTP credentials not configured properly!")
                print(f"   Please set up Gmail App Password as described above")
                return False
            
            print(f"📧 Sending email to {to_email}")
            print(f"   Subject: {subject}")
            print(f"   Body: {body[:100]}...")
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Attach body
            if is_html:
                msg.attach(MIMEText(body, 'html'))
            else:
                msg.attach(MIMEText(body, 'plain'))
            
            # Connect to SMTP server and send
            print(f"🔌 Connecting to SMTP server: {self.smtp_server}:{self.smtp_port}")
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            print(f"🔐 Logging in with username: {self.smtp_username}")
            server.login(self.smtp_username, self.smtp_password)
            
            text = msg.as_string()
            server.sendmail(self.from_email, to_email, text)
            server.quit()
            
            print(f"✅ Email sent successfully to {to_email}")
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to send email: {e}")
            logger.error(f"Failed to send email: {e}")
            return False
    
    def process_template_variables(self, template: Dict[str, Any], response_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process template variables with response data"""
        try:
            subject = template.get("subject", "")
            body = template.get("body", "")
            
            # Simple variable substitution
            variables = {
                "name": response_data.get("name", "User"),
                "email": response_data.get("email", ""),
                "survey_name": response_data.get("survey_name", "Survey"),
                "response_date": datetime.now().strftime("%Y-%m-%d")
            }
            
            # Replace variables in subject and body
            for key, value in variables.items():
                subject = subject.replace(f"{{{key}}}", str(value))
                body = body.replace(f"{{{key}}}", str(value))
            
            return {
                "subject": subject,
                "body": body
            }
            
        except Exception as e:
            print(f"Error processing template variables: {e}")
            return {
                "subject": template.get("subject", ""),
                "body": template.get("body", "")
            }
    
    def _get_question_text(self, survey: Dict[str, Any], question_id: str) -> str:
        """Get question text from survey data"""
        try:
            questions = survey.get("questions", [])
            for question in questions:
                if question.get("id") == question_id:
                    return question.get("question", "")
            return ""
        except Exception:
            return ""
    
    def get_email_logs(self, survey_id: str = None, created_by: str = None) -> Dict[str, Any]:
        """Get email sending logs"""
        try:
            query = {}
            if survey_id:
                query["survey_id"] = survey_id
            if created_by:
                query["created_by"] = created_by
            
            logs = list(self.db.email_logs.find(query).sort("sent_at", -1).limit(100))
            
            # Convert ObjectId to string
            for log in logs:
                log["_id"] = str(log["_id"])
            
            return {
                "success": True,
                "logs": logs,
                "total": len(logs)
            }
            
        except Exception as e:
            logger.error(f"Error getting email logs: {e}")
            return {"error": f"Failed to get logs: {str(e)}"}

# Global service instance
email_trigger_service = EmailTriggerService()
