import uuid
import time
import threading
import requests
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from mongodb_config import db
import json

postback_testing_bp = Blueprint('postback_testing', __name__)

# Global dictionary to store active tests
active_tests = {}

class PostbackTester:
    def __init__(self, test_id, config):
        self.test_id = test_id
        self.config = config
        self.is_running = False
        self.logs = []
        self.start_time = None
        self.request_count = 0
        self.success_count = 0
        self.error_count = 0
        
    def log_event(self, event_type, message, details=None):
        """Add a log entry with timestamp"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "type": event_type,  # 'info', 'success', 'error', 'warning'
            "message": message,
            "details": details or {},
            "request_number": self.request_count
        }
        self.logs.append(log_entry)
        
        # Keep only last 100 logs to prevent memory issues
        if len(self.logs) > 100:
            self.logs = self.logs[-100:]
    
    def make_request(self):
        """Make a single postback request"""
        try:
            self.request_count += 1
            url = self.config['url']
            method = self.config['method'].upper()
            params = self.config.get('parameters', {})
            
            self.log_event('info', f'Making {method} request #{self.request_count}', {'url': url, 'params': params})
            
            start_time = time.time()
            
            if method == 'GET':
                response = requests.get(url, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, data=params, timeout=30)
            else:
                response = requests.request(method, url, params=params, timeout=30)
            
            response_time = round((time.time() - start_time) * 1000, 2)  # Convert to milliseconds
            
            if response.status_code == 200:
                self.success_count += 1
                self.log_event('success', f'Request #{self.request_count} successful', {
                    'status_code': response.status_code,
                    'response_time_ms': response_time,
                    'response_text': response.text[:200]  # First 200 chars
                })
            else:
                self.error_count += 1
                self.log_event('error', f'Request #{self.request_count} failed', {
                    'status_code': response.status_code,
                    'response_time_ms': response_time,
                    'response_text': response.text[:200]
                })
                
        except requests.exceptions.Timeout:
            self.error_count += 1
            self.log_event('error', f'Request #{self.request_count} timed out', {'timeout': '30s'})
        except requests.exceptions.ConnectionError:
            self.error_count += 1
            self.log_event('error', f'Request #{self.request_count} connection error', {'error': 'Connection failed'})
        except Exception as e:
            self.error_count += 1
            self.log_event('error', f'Request #{self.request_count} unexpected error', {'error': str(e)})
    
    def run_test(self):
        """Run the postback test with specified interval and duration"""
        self.is_running = True
        self.start_time = datetime.utcnow()
        interval = self.config['interval']
        duration = self.config.get('duration')
        max_requests = self.config.get('max_requests')
        
        self.log_event('info', 'Test started', {
            'interval': f'{interval}s',
            'duration': f'{duration}s' if duration else 'unlimited',
            'max_requests': max_requests or 'unlimited'
        })
        
        try:
            while self.is_running:
                # Check if we should stop based on duration
                if duration and (datetime.utcnow() - self.start_time).total_seconds() >= duration:
                    self.log_event('info', 'Test completed - duration reached')
                    break
                
                # Check if we should stop based on max requests
                if max_requests and self.request_count >= max_requests:
                    self.log_event('info', 'Test completed - max requests reached')
                    break
                
                # Make the request
                self.make_request()
                
                # Wait for the interval (unless stopping)
                if self.is_running:
                    time.sleep(interval)
                    
        except Exception as e:
            self.log_event('error', 'Test crashed', {'error': str(e)})
        finally:
            self.is_running = False
            self.log_event('info', 'Test stopped', {
                'total_requests': self.request_count,
                'successful': self.success_count,
                'failed': self.error_count,
                'duration': str(datetime.utcnow() - self.start_time) if self.start_time else 'unknown'
            })

@postback_testing_bp.route('/postback/test/start', methods=['POST', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "https://pepperadsresponses.web.app",
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["POST", "OPTIONS"]
)
def start_postback_test():
    """Start a new postback test"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['url', 'method', 'interval']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Validate URL
        url = data['url'].strip()
        if not url.startswith(('http://', 'https://')):
            return jsonify({"error": "URL must start with http:// or https://"}), 400
        
        # Validate method
        method = data['method'].upper()
        if method not in ['GET', 'POST', 'PUT', 'DELETE']:
            return jsonify({"error": "Method must be GET, POST, PUT, or DELETE"}), 400
        
        # Validate interval
        try:
            interval = float(data['interval'])
            if interval < 1:
                return jsonify({"error": "Interval must be at least 1 second"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Interval must be a valid number"}), 400
        
        # Optional fields with validation
        duration = None
        if data.get('duration'):
            try:
                duration = float(data['duration'])
                if duration < 1:
                    return jsonify({"error": "Duration must be at least 1 second"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Duration must be a valid number"}), 400
        
        max_requests = None
        if data.get('max_requests'):
            try:
                max_requests = int(data['max_requests'])
                if max_requests < 1:
                    return jsonify({"error": "Max requests must be at least 1"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Max requests must be a valid number"}), 400
        
        # Parse parameters
        parameters = {}
        if data.get('parameters'):
            try:
                if isinstance(data['parameters'], dict):
                    parameters = data['parameters']
                elif isinstance(data['parameters'], list):
                    # Convert list of key-value pairs to dict
                    for param in data['parameters']:
                        if isinstance(param, dict) and 'key' in param and 'value' in param:
                            if param['key'].strip():  # Only add non-empty keys
                                parameters[param['key']] = param['value']
            except Exception as e:
                return jsonify({"error": f"Invalid parameters format: {str(e)}"}), 400
        
        # Create test configuration
        test_id = str(uuid.uuid4())
        config = {
            'url': url,
            'method': method,
            'interval': interval,
            'duration': duration,
            'max_requests': max_requests,
            'parameters': parameters
        }
        
        # Check if there's already an active test
        for existing_test_id, existing_tester in active_tests.items():
            if existing_tester.is_running:
                return jsonify({
                    "error": "Another test is already running. Please stop it first.",
                    "active_test_id": existing_test_id
                }), 409
        
        # Create and start the tester
        tester = PostbackTester(test_id, config)
        active_tests[test_id] = tester
        
        # Start the test in a separate thread
        test_thread = threading.Thread(target=tester.run_test)
        test_thread.daemon = True
        test_thread.start()
        
        return jsonify({
            "message": "Test started successfully",
            "test_id": test_id,
            "config": config
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@postback_testing_bp.route('/postback/test/stop/<test_id>', methods=['POST', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "https://pepperadsresponses.web.app",
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["POST", "OPTIONS"]
)
def stop_postback_test(test_id):
    """Stop a running postback test"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        if test_id not in active_tests:
            return jsonify({"error": "Test not found"}), 404
        
        tester = active_tests[test_id]
        if not tester.is_running:
            return jsonify({"error": "Test is not running"}), 400
        
        tester.is_running = False
        
        return jsonify({
            "message": "Test stopped successfully",
            "test_id": test_id,
            "stats": {
                "total_requests": tester.request_count,
                "successful": tester.success_count,
                "failed": tester.error_count
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@postback_testing_bp.route('/postback/test/status/<test_id>', methods=['GET', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "https://pepperadsresponses.web.app",
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "OPTIONS"]
)
def get_test_status(test_id):
    """Get the current status and logs of a test"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        if test_id not in active_tests:
            return jsonify({"error": "Test not found"}), 404
        
        tester = active_tests[test_id]
        
        return jsonify({
            "test_id": test_id,
            "is_running": tester.is_running,
            "start_time": tester.start_time.isoformat() if tester.start_time else None,
            "stats": {
                "total_requests": tester.request_count,
                "successful": tester.success_count,
                "failed": tester.error_count
            },
            "logs": tester.logs[-20:],  # Return last 20 logs
            "config": tester.config
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@postback_testing_bp.route('/postback/test/logs/<test_id>', methods=['GET', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "https://pepperadsresponses.web.app",
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "OPTIONS"]
)
def get_test_logs(test_id):
    """Get all logs for a test"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        if test_id not in active_tests:
            return jsonify({"error": "Test not found"}), 404
        
        tester = active_tests[test_id]
        
        return jsonify({
            "test_id": test_id,
            "logs": tester.logs,
            "total_logs": len(tester.logs)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@postback_testing_bp.route('/postback/test/history', methods=['GET', 'OPTIONS'])
@cross_origin(
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "https://pepperadsresponses.web.app",
        "https://hostsliceresponse.web.app",
        "https://theinterwebsite.space"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "OPTIONS"]
)
def get_test_history():
    """Get history of all tests"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        history = []
        for test_id, tester in active_tests.items():
            history.append({
                "test_id": test_id,
                "url": tester.config['url'],
                "method": tester.config['method'],
                "is_running": tester.is_running,
                "start_time": tester.start_time.isoformat() if tester.start_time else None,
                "stats": {
                    "total_requests": tester.request_count,
                    "successful": tester.success_count,
                    "failed": tester.error_count
                }
            })
        
        # Sort by start time (most recent first)
        history.sort(key=lambda x: x['start_time'] or '', reverse=True)
        
        return jsonify({
            "tests": history,
            "total_tests": len(history)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
