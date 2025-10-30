#!/usr/bin/env python3

"""
CORS Configuration Fix for Deployed Environment
This ensures proper CORS handling for all endpoints
"""

from flask_cors import CORS

def setup_cors(app):
    """
    Setup comprehensive CORS configuration for production deployment
    """
    
    # Configure CORS for the entire app
    CORS(app, 
         supports_credentials=True,
         origins=[
             "http://localhost:5173",
             "http://localhost:5174", 
             "http://127.0.0.1:5173",
             "http://127.0.0.1:5174",
             "https://pepperadsresponses.web.app",
             "https://hostsliceresponse.web.app", 
             "https://theinterwebsite.space",
             "https://api.theinterwebsite.space"
         ],
         allow_headers=[
             "Content-Type", 
             "Authorization", 
             "Access-Control-Allow-Origin",
             "X-User-ID"
         ],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         expose_headers=["Content-Type", "Authorization"]
    )
    
    # Add OPTIONS handler for all routes
    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            response = make_response()
            response.headers.add("Access-Control-Allow-Origin", "*")
            response.headers.add('Access-Control-Allow-Headers', "*")
            response.headers.add('Access-Control-Allow-Methods', "*")
            return response

    # Add CORS headers to all responses
    @app.after_request
    def after_request(response):
        origin = request.headers.get('Origin')
        allowed_origins = [
            "http://localhost:5173",
            "http://localhost:5174", 
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            "https://pepperadsresponses.web.app",
            "https://hostsliceresponse.web.app", 
            "https://theinterwebsite.space"
        ]
        
        if origin in allowed_origins:
            response.headers.add('Access-Control-Allow-Origin', origin)
        
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-User-ID')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    print("✅ CORS configuration applied for production deployment")

# Test endpoint to verify CORS is working
def add_cors_test_endpoint(app):
    """Add a test endpoint to verify CORS is working"""
    
    @app.route('/api/cors-test', methods=['GET', 'POST', 'OPTIONS'])
    def cors_test():
        if request.method == 'OPTIONS':
            return '', 200
        
        return jsonify({
            "message": "CORS is working!",
            "origin": request.headers.get('Origin', 'No origin'),
            "method": request.method,
            "timestamp": datetime.utcnow().isoformat()
        })

if __name__ == "__main__":
    print("CORS Fix Module - Import this in your main app.py file")
    print("Usage:")
    print("  from cors_fix import setup_cors")
    print("  setup_cors(app)")
