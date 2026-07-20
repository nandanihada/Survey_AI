"""
User Tracking API
Comprehensive user behavior tracking with 15-day auto-delete (TTL)
Tracks: login events, page visits, pricing clicks, sessions, geolocation,
button clicks, and premium feature attempts.
"""

from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, g
from mongodb_config import db
from auth_middleware import requireAuth, requireAdmin
import uuid
import requests as http_requests

user_tracking_bp = Blueprint('user_tracking', __name__, url_prefix='/api/tracking')

# ==================== TTL Index Setup ====================
def setup_tracking_indexes():
    """Setup TTL indexes for 15-day auto-delete on all tracking collections"""
    try:
        collections_with_ttl = [
            'login_events',
            'page_visits',
            'pricing_clicks',
            'user_sessions',
            'user_geolocations',
            'button_clicks',
            'premium_feature_attempts'
        ]
        
        for collection_name in collections_with_ttl:
            collection = db[collection_name]
            # Create TTL index - documents expire after 15 days (1296000 seconds)
            collection.create_index(
                "created_at",
                expireAfterSeconds=1296000  # 15 days
            )
            # Create useful query indexes
            collection.create_index("user_id")
            collection.create_index("user_email")
        
        # Additional indexes for specific collections
        db.page_visits.create_index("page")
        db.button_clicks.create_index("button_id")
        db.pricing_clicks.create_index("source")
        db.user_sessions.create_index("session_id")
        db.user_geolocations.create_index([("latitude", 1), ("longitude", 1)])
        
        print("✅ Tracking TTL indexes created (15-day auto-delete)")
    except Exception as e:
        print(f"⚠️ TTL index setup warning: {e}")


# ==================== Helper Functions ====================
def get_ip_from_request():
    """Get client IP from request"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr or 'unknown'


def get_geo_from_ip(ip_address):
    """Get geolocation from IP address"""
    if not ip_address or ip_address in ['unknown', '127.0.0.1', '::1', 'localhost', '0.0.0.0']:
        # For local development, try to get public IP for geolocation
        try:
            pub_ip_response = http_requests.get("https://api.ipify.org?format=json", timeout=3)
            if pub_ip_response.status_code == 200:
                public_ip = pub_ip_response.json().get("ip")
                if public_ip:
                    geo_response = http_requests.get(
                        f"http://ip-api.com/json/{public_ip}?fields=status,country,regionName,city,lat,lon",
                        timeout=3
                    )
                    if geo_response.status_code == 200:
                        data = geo_response.json()
                        if data.get('status') == 'success':
                            return {
                                "country": data.get("country", "Unknown"),
                                "region": data.get("regionName", ""),
                                "city": data.get("city", "Unknown"),
                                "latitude": data.get("lat"),
                                "longitude": data.get("lon")
                            }
        except:
            pass
        return {"country": "Local", "city": "Local", "latitude": None, "longitude": None}
    try:
        response = http_requests.get(
            f"http://ip-api.com/json/{ip_address}?fields=status,country,regionName,city,lat,lon",
            timeout=3
        )
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                return {
                    "country": data.get("country", "Unknown"),
                    "region": data.get("regionName", ""),
                    "city": data.get("city", "Unknown"),
                    "latitude": data.get("lat"),
                    "longitude": data.get("lon")
                }
    except:
        pass
    return {"country": "Unknown", "city": "Unknown", "latitude": None, "longitude": None}


def get_device_info():
    """Extract device info from user agent"""
    ua = request.headers.get('User-Agent', '').lower()
    device = 'desktop'
    if 'mobile' in ua or 'android' in ua or 'iphone' in ua:
        device = 'mobile'
    elif 'tablet' in ua or 'ipad' in ua:
        device = 'tablet'
    
    browser = 'unknown'
    if 'chrome' in ua and 'edg' not in ua:
        browser = 'chrome'
    elif 'firefox' in ua:
        browser = 'firefox'
    elif 'safari' in ua and 'chrome' not in ua:
        browser = 'safari'
    elif 'edg' in ua:
        browser = 'edge'
    
    return {"device": device, "browser": browser, "user_agent": request.headers.get('User-Agent', '')}


# ==================== Tracking Endpoints (Data Collection) ====================

@user_tracking_bp.route('/page-visit', methods=['POST'])
def track_page_visit():
    """Track a page visit"""
    try:
        data = request.json or {}
        ip = get_ip_from_request()
        geo = get_geo_from_ip(ip)
        device_info = get_device_info()
        
        record = {
            "user_id": data.get("user_id", "anonymous"),
            "user_email": data.get("user_email", ""),
            "user_name": data.get("user_name", ""),
            "page": data.get("page", "/"),
            "page_title": data.get("page_title", ""),
            "referrer": data.get("referrer", ""),
            "session_id": data.get("session_id", ""),
            "ip_address": ip,
            "geo": geo,
            "device_info": device_info,
            "created_at": datetime.now(timezone.utc)
        }
        
        db.page_visits.insert_one(record)
        return jsonify({"status": "ok"}), 200
    except Exception as e:
        print(f"❌ Page visit tracking error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@user_tracking_bp.route('/button-click', methods=['POST'])
def track_button_click():
    """Track a button click"""
    try:
        data = request.json or {}
        ip = get_ip_from_request()
        geo = get_geo_from_ip(ip)
        
        record = {
            "user_id": data.get("user_id", "anonymous"),
            "user_email": data.get("user_email", ""),
            "user_name": data.get("user_name", ""),
            "button_id": data.get("button_id", "unknown"),
            "button_text": data.get("button_text", ""),
            "page": data.get("page", "/"),
            "section": data.get("section", ""),
            "ip_address": ip,
            "geo": geo,
            "created_at": datetime.now(timezone.utc)
        }
        
        db.button_clicks.insert_one(record)
        return jsonify({"status": "ok"}), 200
    except Exception as e:
        print(f"❌ Button click tracking error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@user_tracking_bp.route('/pricing-click', methods=['POST'])
def track_pricing_click():
    """Track pricing page/CTA click"""
    try:
        data = request.json or {}
        ip = get_ip_from_request()
        geo = get_geo_from_ip(ip)
        
        record = {
            "user_id": data.get("user_id", "anonymous"),
            "user_email": data.get("user_email", ""),
            "user_name": data.get("user_name", ""),
            "source": data.get("source", "pricing_page"),  # pricing_page, header_cta, dashboard_cta, etc.
            "plan_clicked": data.get("plan_clicked", ""),  # free, pro, enterprise
            "button_text": data.get("button_text", ""),
            "page": data.get("page", "/pricing"),
            "ip_address": ip,
            "geo": geo,
            "created_at": datetime.now(timezone.utc)
        }
        
        db.pricing_clicks.insert_one(record)
        return jsonify({"status": "ok"}), 200
    except Exception as e:
        print(f"❌ Pricing click tracking error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@user_tracking_bp.route('/premium-attempt', methods=['POST'])
def track_premium_attempt():
    """Track premium feature click attempt by non-premium user"""
    try:
        data = request.json or {}
        ip = get_ip_from_request()
        
        record = {
            "user_id": data.get("user_id", "anonymous"),
            "user_email": data.get("user_email", ""),
            "user_name": data.get("user_name", ""),
            "user_role": data.get("user_role", "basic"),
            "feature_name": data.get("feature_name", ""),
            "feature_description": data.get("feature_description", ""),
            "page": data.get("page", "/"),
            "ip_address": ip,
            "created_at": datetime.now(timezone.utc)
        }
        
        db.premium_feature_attempts.insert_one(record)
        return jsonify({"status": "ok"}), 200
    except Exception as e:
        print(f"❌ Premium attempt tracking error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@user_tracking_bp.route('/session-start', methods=['POST'])
def track_session_start():
    """Track session start"""
    try:
        data = request.json or {}
        ip = get_ip_from_request()
        geo = get_geo_from_ip(ip)
        device_info = get_device_info()
        
        session_id = data.get("session_id", str(uuid.uuid4()))
        
        record = {
            "session_id": session_id,
            "user_id": data.get("user_id", "anonymous"),
            "user_email": data.get("user_email", ""),
            "user_name": data.get("user_name", ""),
            "ip_address": ip,
            "geo": geo,
            "device_info": device_info,
            "started_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        }
        
        db.user_sessions.insert_one(record)
        
        # Also store geolocation separately for map view
        if geo.get("latitude") and geo.get("longitude"):
            geo_record = {
                "user_id": data.get("user_id", "anonymous"),
                "user_email": data.get("user_email", ""),
                "user_name": data.get("user_name", ""),
                "ip_address": ip,
                "latitude": geo["latitude"],
                "longitude": geo["longitude"],
                "country": geo.get("country", ""),
                "city": geo.get("city", ""),
                "region": geo.get("region", ""),
                "source": "ip",
                "created_at": datetime.now(timezone.utc)
            }
            db.user_geolocations.insert_one(geo_record)
        
        return jsonify({"status": "ok", "session_id": session_id}), 200
    except Exception as e:
        print(f"❌ Session start tracking error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@user_tracking_bp.route('/login-event', methods=['POST'])
def track_login_event():
    """Track login event (called from auth on successful login)"""
    try:
        data = request.json or {}
        ip = get_ip_from_request()
        geo = get_geo_from_ip(ip)
        device_info = get_device_info()
        
        record = {
            "user_id": data.get("user_id", ""),
            "user_email": data.get("user_email", ""),
            "user_name": data.get("user_name", ""),
            "login_method": data.get("login_method", "email"),  # email, google, microsoft
            "ip_address": ip,
            "geo": geo,
            "device_info": device_info,
            "created_at": datetime.now(timezone.utc)
        }
        
        db.login_events.insert_one(record)
        return jsonify({"status": "ok"}), 200
    except Exception as e:
        print(f"❌ Login event tracking error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ==================== Admin Endpoints (Data Retrieval) ====================

@user_tracking_bp.route('/admin/overview', methods=['GET'])
@requireAdmin
def get_tracking_overview():
    """Get overview stats for tracking dashboard"""
    try:
        now = datetime.now(timezone.utc)
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        
        overview = {
            "login_events": {
                "total": db.login_events.count_documents({}),
                "last_24h": db.login_events.count_documents({"created_at": {"$gte": last_24h}}),
                "last_7d": db.login_events.count_documents({"created_at": {"$gte": last_7d}})
            },
            "page_visits": {
                "total": db.page_visits.count_documents({}),
                "last_24h": db.page_visits.count_documents({"created_at": {"$gte": last_24h}}),
                "last_7d": db.page_visits.count_documents({"created_at": {"$gte": last_7d}})
            },
            "pricing_clicks": {
                "total": db.pricing_clicks.count_documents({}),
                "last_24h": db.pricing_clicks.count_documents({"created_at": {"$gte": last_24h}}),
                "last_7d": db.pricing_clicks.count_documents({"created_at": {"$gte": last_7d}})
            },
            "sessions": {
                "total": db.user_sessions.count_documents({}),
                "last_24h": db.user_sessions.count_documents({"created_at": {"$gte": last_24h}}),
                "last_7d": db.user_sessions.count_documents({"created_at": {"$gte": last_7d}})
            },
            "button_clicks": {
                "total": db.button_clicks.count_documents({}),
                "last_24h": db.button_clicks.count_documents({"created_at": {"$gte": last_24h}}),
                "last_7d": db.button_clicks.count_documents({"created_at": {"$gte": last_7d}})
            },
            "premium_attempts": {
                "total": db.premium_feature_attempts.count_documents({}),
                "last_24h": db.premium_feature_attempts.count_documents({"created_at": {"$gte": last_24h}}),
                "last_7d": db.premium_feature_attempts.count_documents({"created_at": {"$gte": last_7d}})
            },
            "unique_locations": db.user_geolocations.count_documents({})
        }
        
        return jsonify({"overview": overview}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@user_tracking_bp.route('/admin/login-events', methods=['GET'])
@requireAdmin
def get_login_events():
    """Get login events for admin"""
    try:
        days = int(request.args.get('days', 7))
        since = datetime.now(timezone.utc) - timedelta(days=days)
        
        events = list(db.login_events.find(
            {"created_at": {"$gte": since}},
            {"_id": 0}
        ).sort("created_at", -1).limit(500))
        
        # Convert datetime to string for JSON
        for event in events:
            if event.get("created_at"):
                event["created_at"] = event["created_at"].isoformat()
        
        # Aggregate logins per user
        pipeline = [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {
                "_id": "$user_email",
                "login_count": {"$sum": 1},
                "last_login": {"$max": "$created_at"},
                "user_name": {"$first": "$user_name"}
            }},
            {"$sort": {"login_count": -1}},
            {"$limit": 50}
        ]
        per_user = list(db.login_events.aggregate(pipeline))
        for item in per_user:
            if item.get("last_login"):
                item["last_login"] = item["last_login"].isoformat()
        
        # Logins per day
        day_pipeline = [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        per_day = list(db.login_events.aggregate(day_pipeline))
        
        return jsonify({
            "events": events,
            "per_user": per_user,
            "per_day": per_day
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@user_tracking_bp.route('/admin/page-visits', methods=['GET'])
@requireAdmin
def get_page_visits():
    """Get page visit data for admin"""
    try:
        days = int(request.args.get('days', 7))
        since = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Visits per page
        page_pipeline = [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {
                "_id": "$page",
                "visit_count": {"$sum": 1},
                "unique_users": {"$addToSet": "$user_id"}
            }},
            {"$project": {
                "page": "$_id",
                "visit_count": 1,
                "unique_user_count": {"$size": "$unique_users"}
            }},
            {"$sort": {"visit_count": -1}},
            {"$limit": 30}
        ]
        per_page = list(db.page_visits.aggregate(page_pipeline))
        
        # Visits per user (who logged in and visited pages)
        user_pipeline = [
            {"$match": {"created_at": {"$gte": since}, "user_id": {"$ne": "anonymous"}}},
            {"$group": {
                "_id": {"user_id": "$user_id", "user_email": "$user_email"},
                "pages_visited": {"$addToSet": "$page"},
                "total_visits": {"$sum": 1},
                "user_name": {"$first": "$user_name"}
            }},
            {"$project": {
                "user_email": "$_id.user_email",
                "user_name": 1,
                "pages_visited": 1,
                "page_count": {"$size": "$pages_visited"},
                "total_visits": 1
            }},
            {"$sort": {"total_visits": -1}},
            {"$limit": 50}
        ]
        per_user = list(db.page_visits.aggregate(user_pipeline))
        
        # Visits per day
        day_pipeline = [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        per_day = list(db.page_visits.aggregate(day_pipeline))
        
        return jsonify({
            "per_page": per_page,
            "per_user": per_user,
            "per_day": per_day
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@user_tracking_bp.route('/admin/pricing-clicks', methods=['GET'])
@requireAdmin
def get_pricing_clicks():
    """Get pricing click data for admin"""
    try:
        days = int(request.args.get('days', 7))
        since = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Clicks per source
        source_pipeline = [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {
                "_id": "$source",
                "click_count": {"$sum": 1}
            }},
            {"$sort": {"click_count": -1}}
        ]
        per_source = list(db.pricing_clicks.aggregate(source_pipeline))
        
        # Clicks per plan
        plan_pipeline = [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {
                "_id": "$plan_clicked",
                "click_count": {"$sum": 1}
            }},
            {"$sort": {"click_count": -1}}
        ]
        per_plan = list(db.pricing_clicks.aggregate(plan_pipeline))
        
        # Recent clicks with user info
        recent = list(db.pricing_clicks.find(
            {"created_at": {"$gte": since}},
            {"_id": 0}
        ).sort("created_at", -1).limit(100))
        
        for item in recent:
            if item.get("created_at"):
                item["created_at"] = item["created_at"].isoformat()
        
        # Clicks per day
        day_pipeline = [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        per_day = list(db.pricing_clicks.aggregate(day_pipeline))
        
        return jsonify({
            "per_source": per_source,
            "per_plan": per_plan,
            "recent": recent,
            "per_day": per_day
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@user_tracking_bp.route('/admin/sessions', methods=['GET'])
@requireAdmin
def get_sessions():
    """Get session data for admin"""
    try:
        days = int(request.args.get('days', 7))
        since = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Sessions per day
        day_pipeline = [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        per_day = list(db.user_sessions.aggregate(day_pipeline))
        
        # Sessions per user
        user_pipeline = [
            {"$match": {"created_at": {"$gte": since}, "user_id": {"$ne": "anonymous"}}},
            {"$group": {
                "_id": "$user_email",
                "session_count": {"$sum": 1},
                "user_name": {"$first": "$user_name"},
                "last_session": {"$max": "$created_at"}
            }},
            {"$sort": {"session_count": -1}},
            {"$limit": 50}
        ]
        per_user = list(db.user_sessions.aggregate(user_pipeline))
        for item in per_user:
            if item.get("last_session"):
                item["last_session"] = item["last_session"].isoformat()
        
        # Recent sessions
        recent = list(db.user_sessions.find(
            {"created_at": {"$gte": since}},
            {"_id": 0}
        ).sort("created_at", -1).limit(100))
        for item in recent:
            if item.get("created_at"):
                item["created_at"] = item["created_at"].isoformat()
            if item.get("started_at"):
                item["started_at"] = item["started_at"].isoformat()
        
        return jsonify({
            "per_day": per_day,
            "per_user": per_user,
            "recent": recent
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@user_tracking_bp.route('/admin/geo', methods=['GET'])
@requireAdmin
def get_geo_data():
    """Get geolocation data for map"""
    try:
        days = int(request.args.get('days', 7))
        since = datetime.now(timezone.utc) - timedelta(days=days)
        
        # All locations with coordinates
        locations = list(db.user_geolocations.find(
            {"created_at": {"$gte": since}, "latitude": {"$ne": None}},
            {"_id": 0}
        ).sort("created_at", -1).limit(500))
        
        for loc in locations:
            if loc.get("created_at"):
                loc["created_at"] = loc["created_at"].isoformat()
        
        # Aggregate by country
        country_pipeline = [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {
                "_id": "$country",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}}
        ]
        per_country = list(db.user_geolocations.aggregate(country_pipeline))
        
        # Aggregate by city
        city_pipeline = [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {
                "_id": {"city": "$city", "country": "$country"},
                "count": {"$sum": 1},
                "lat": {"$first": "$latitude"},
                "lon": {"$first": "$longitude"}
            }},
            {"$sort": {"count": -1}},
            {"$limit": 50}
        ]
        per_city = list(db.user_geolocations.aggregate(city_pipeline))
        
        return jsonify({
            "locations": locations,
            "per_country": per_country,
            "per_city": per_city
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@user_tracking_bp.route('/admin/button-clicks', methods=['GET'])
@requireAdmin
def get_button_clicks():
    """Get button click data for admin"""
    try:
        days = int(request.args.get('days', 7))
        since = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Clicks per button
        button_pipeline = [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {
                "_id": {"button_id": "$button_id", "button_text": "$button_text"},
                "click_count": {"$sum": 1},
                "unique_users": {"$addToSet": "$user_id"}
            }},
            {"$project": {
                "button_id": "$_id.button_id",
                "button_text": "$_id.button_text",
                "click_count": 1,
                "unique_user_count": {"$size": "$unique_users"}
            }},
            {"$sort": {"click_count": -1}},
            {"$limit": 50}
        ]
        per_button = list(db.button_clicks.aggregate(button_pipeline))
        
        # Clicks per page
        page_pipeline = [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {
                "_id": "$page",
                "click_count": {"$sum": 1}
            }},
            {"$sort": {"click_count": -1}}
        ]
        per_page = list(db.button_clicks.aggregate(page_pipeline))
        
        # Clicks per user
        user_pipeline = [
            {"$match": {"created_at": {"$gte": since}, "user_id": {"$ne": "anonymous"}}},
            {"$group": {
                "_id": "$user_email",
                "click_count": {"$sum": 1},
                "user_name": {"$first": "$user_name"},
                "buttons_clicked": {"$addToSet": "$button_text"}
            }},
            {"$sort": {"click_count": -1}},
            {"$limit": 50}
        ]
        per_user = list(db.button_clicks.aggregate(user_pipeline))
        
        return jsonify({
            "per_button": per_button,
            "per_page": per_page,
            "per_user": per_user
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@user_tracking_bp.route('/admin/premium-attempts', methods=['GET'])
@requireAdmin
def get_premium_attempts():
    """Get premium feature attempt data for admin"""
    try:
        days = int(request.args.get('days', 7))
        since = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Recent attempts
        attempts = list(db.premium_feature_attempts.find(
            {"created_at": {"$gte": since}},
            {"_id": 0}
        ).sort("created_at", -1).limit(200))
        
        for item in attempts:
            if item.get("created_at"):
                item["created_at"] = item["created_at"].isoformat()
        
        # Per feature
        feature_pipeline = [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {
                "_id": "$feature_name",
                "attempt_count": {"$sum": 1},
                "unique_users": {"$addToSet": "$user_email"}
            }},
            {"$project": {
                "feature_name": "$_id",
                "attempt_count": 1,
                "unique_user_count": {"$size": "$unique_users"}
            }},
            {"$sort": {"attempt_count": -1}}
        ]
        per_feature = list(db.premium_feature_attempts.aggregate(feature_pipeline))
        
        # Per user
        user_pipeline = [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {
                "_id": "$user_email",
                "attempt_count": {"$sum": 1},
                "user_name": {"$first": "$user_name"},
                "user_role": {"$first": "$user_role"},
                "features_attempted": {"$addToSet": "$feature_name"}
            }},
            {"$sort": {"attempt_count": -1}},
            {"$limit": 50}
        ]
        per_user = list(db.premium_feature_attempts.aggregate(user_pipeline))
        
        return jsonify({
            "attempts": attempts,
            "per_feature": per_feature,
            "per_user": per_user
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== User-Centric Endpoints ====================

@user_tracking_bp.route('/admin/users-list', methods=['GET'])
@requireAdmin
def get_tracked_users_list():
    """Get list of all tracked users with summary activity counts"""
    try:
        days = int(request.args.get('days', 7))
        since = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Get all unique users from page_visits (most comprehensive source)
        pipeline = [
            {"$match": {"created_at": {"$gte": since}, "user_id": {"$ne": "anonymous"}, "user_email": {"$ne": "landing@pepperwahl.com"}}},
            {"$group": {
                "_id": "$user_email",
                "user_id": {"$first": "$user_id"},
                "user_name": {"$first": "$user_name"},
                "page_visits": {"$sum": 1},
                "unique_pages": {"$addToSet": "$page"},
                "last_seen": {"$max": "$created_at"}
            }},
            {"$project": {
                "user_email": "$_id",
                "user_id": 1,
                "user_name": 1,
                "page_visits": 1,
                "unique_page_count": {"$size": "$unique_pages"},
                "last_seen": 1
            }},
            {"$sort": {"last_seen": -1}},
            {"$limit": 100}
        ]
        users_from_visits = list(db.page_visits.aggregate(pipeline))
        
        # Enrich with login counts, button clicks, session counts
        user_emails = [u["user_email"] for u in users_from_visits]
        
        # Login counts per user
        login_pipeline = [
            {"$match": {"created_at": {"$gte": since}, "user_email": {"$in": user_emails}}},
            {"$group": {"_id": "$user_email", "login_count": {"$sum": 1}}}
        ]
        login_counts = {item["_id"]: item["login_count"] for item in db.login_events.aggregate(login_pipeline)}
        
        # Button click counts per user
        button_pipeline = [
            {"$match": {"created_at": {"$gte": since}, "user_email": {"$in": user_emails}}},
            {"$group": {"_id": "$user_email", "button_clicks": {"$sum": 1}}}
        ]
        button_counts = {item["_id"]: item["button_clicks"] for item in db.button_clicks.aggregate(button_pipeline)}
        
        # Session counts per user
        session_pipeline = [
            {"$match": {"created_at": {"$gte": since}, "user_email": {"$in": user_emails}}},
            {"$group": {"_id": "$user_email", "session_count": {"$sum": 1}}}
        ]
        session_counts = {item["_id"]: item["session_count"] for item in db.user_sessions.aggregate(session_pipeline)}
        
        # Pricing click counts per user
        pricing_pipeline = [
            {"$match": {"created_at": {"$gte": since}, "user_email": {"$in": user_emails}}},
            {"$group": {"_id": "$user_email", "pricing_clicks": {"$sum": 1}}}
        ]
        pricing_counts = {item["_id"]: item["pricing_clicks"] for item in db.pricing_clicks.aggregate(pricing_pipeline)}
        
        # Premium attempt counts per user
        premium_pipeline = [
            {"$match": {"created_at": {"$gte": since}, "user_email": {"$in": user_emails}}},
            {"$group": {"_id": "$user_email", "premium_attempts": {"$sum": 1}}}
        ]
        premium_counts = {item["_id"]: item["premium_attempts"] for item in db.premium_feature_attempts.aggregate(premium_pipeline)}
        
        # Build enriched user list
        users = []
        for u in users_from_visits:
            email = u["user_email"]
            users.append({
                "user_email": email,
                "user_id": u.get("user_id", ""),
                "user_name": u.get("user_name", ""),
                "page_visits": u.get("page_visits", 0),
                "unique_pages": u.get("unique_page_count", 0),
                "login_count": login_counts.get(email, 0),
                "button_clicks": button_counts.get(email, 0),
                "sessions": session_counts.get(email, 0),
                "pricing_clicks": pricing_counts.get(email, 0),
                "premium_attempts": premium_counts.get(email, 0),
                "last_seen": u.get("last_seen", "").isoformat() if u.get("last_seen") else ""
            })
        
        return jsonify({"users": users}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@user_tracking_bp.route('/admin/user-detail', methods=['GET'])
@requireAdmin
def get_user_detail():
    """Get full tracking detail for a specific user"""
    try:
        user_email = request.args.get('email', '')
        days = int(request.args.get('days', 15))
        since = datetime.now(timezone.utc) - timedelta(days=days)
        
        if not user_email:
            return jsonify({"error": "email parameter is required"}), 400
        
        # Page visits for this user
        page_visits = list(db.page_visits.find(
            {"user_email": user_email, "created_at": {"$gte": since}},
            {"_id": 0}
        ).sort("created_at", -1).limit(200))
        for v in page_visits:
            if v.get("created_at"):
                v["created_at"] = v["created_at"].isoformat()
        
        # Login events
        login_events = list(db.login_events.find(
            {"user_email": user_email, "created_at": {"$gte": since}},
            {"_id": 0}
        ).sort("created_at", -1).limit(100))
        for e in login_events:
            if e.get("created_at"):
                e["created_at"] = e["created_at"].isoformat()
        
        # Button clicks
        button_clicks = list(db.button_clicks.find(
            {"user_email": user_email, "created_at": {"$gte": since}},
            {"_id": 0}
        ).sort("created_at", -1).limit(200))
        for b in button_clicks:
            if b.get("created_at"):
                b["created_at"] = b["created_at"].isoformat()
        
        # Pricing clicks
        pricing_clicks = list(db.pricing_clicks.find(
            {"user_email": user_email, "created_at": {"$gte": since}},
            {"_id": 0}
        ).sort("created_at", -1).limit(50))
        for p in pricing_clicks:
            if p.get("created_at"):
                p["created_at"] = p["created_at"].isoformat()
        
        # Sessions
        sessions = list(db.user_sessions.find(
            {"user_email": user_email, "created_at": {"$gte": since}},
            {"_id": 0}
        ).sort("created_at", -1).limit(50))
        for s in sessions:
            if s.get("created_at"):
                s["created_at"] = s["created_at"].isoformat()
            if s.get("started_at"):
                s["started_at"] = s["started_at"].isoformat()
        
        # Geolocation
        geolocations = list(db.user_geolocations.find(
            {"user_email": user_email, "created_at": {"$gte": since}},
            {"_id": 0}
        ).sort("created_at", -1).limit(50))
        for g_item in geolocations:
            if g_item.get("created_at"):
                g_item["created_at"] = g_item["created_at"].isoformat()
        
        # Premium attempts
        premium_attempts = list(db.premium_feature_attempts.find(
            {"user_email": user_email, "created_at": {"$gte": since}},
            {"_id": 0}
        ).sort("created_at", -1).limit(50))
        for pa in premium_attempts:
            if pa.get("created_at"):
                pa["created_at"] = pa["created_at"].isoformat()
        
        # Page visit summary (grouped by page)
        page_summary_pipeline = [
            {"$match": {"user_email": user_email, "created_at": {"$gte": since}}},
            {"$group": {
                "_id": "$page",
                "count": {"$sum": 1},
                "last_visit": {"$max": "$created_at"}
            }},
            {"$sort": {"count": -1}}
        ]
        page_summary = list(db.page_visits.aggregate(page_summary_pipeline))
        for ps in page_summary:
            if ps.get("last_visit"):
                ps["last_visit"] = ps["last_visit"].isoformat()
        
        return jsonify({
            "user_email": user_email,
            "page_visits": page_visits,
            "page_summary": page_summary,
            "login_events": login_events,
            "button_clicks": button_clicks,
            "pricing_clicks": pricing_clicks,
            "sessions": sessions,
            "geolocations": geolocations,
            "premium_attempts": premium_attempts
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== Session Linking (Landing → User) ====================

@user_tracking_bp.route('/link-session', methods=['POST'])
def link_landing_session():
    """
    Link landing page anonymous session data to a real user after login.
    Called from the main app after successful login if a landing session ID is present.
    Updates all tracking records from that session to the user's real identity.
    """
    try:
        data = request.json or {}
        session_id = data.get("session_id", "")
        user_id = data.get("user_id", "")
        user_email = data.get("user_email", "")
        user_name = data.get("user_name", "")
        
        if not session_id or not user_email:
            return jsonify({"status": "skipped", "reason": "missing session_id or user_email"}), 200
        
        # Update all landing page records with this session_id to the real user
        update_filter = {"session_id": session_id, "user_email": "landing@pepperwahl.com"}
        update_data = {
            "$set": {
                "user_id": user_id,
                "user_email": user_email,
                "user_name": user_name
            }
        }
        
        # Update across all tracking collections
        collections = ['page_visits', 'button_clicks', 'user_sessions', 'user_geolocations', 'pricing_clicks']
        total_updated = 0
        
        for coll_name in collections:
            result = db[coll_name].update_many(update_filter, update_data)
            total_updated += result.modified_count
        
        # Also prefix landing page paths with /landing to distinguish them
        # Update page visits: /features → /landing/features
        page_visits_to_update = list(db.page_visits.find({
            "session_id": session_id,
            "user_email": user_email,
            "page": {"$not": {"$regex": "^/landing"}}
        }))
        
        for pv in page_visits_to_update:
            page = pv.get("page", "/")
            # Only prefix if it doesn't already start with /landing or /dashboard etc (main app pages)
            if not page.startswith("/dashboard") and not page.startswith("/admin") and not page.startswith("/login") and not page.startswith("/signup") and not page.startswith("/pricing") and not page.startswith("/analytics"):
                db.page_visits.update_one(
                    {"_id": pv["_id"]},
                    {"$set": {"page": "/landing" + page}}
                )
        
        print(f"✅ Linked session {session_id[:20]}... → {user_email} ({total_updated} records updated)")
        return jsonify({"status": "ok", "records_updated": total_updated}), 200
    except Exception as e:
        print(f"❌ Session linking error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ==================== Contact Form Submissions ====================

@user_tracking_bp.route('/admin/contact-submissions', methods=['GET'])
@requireAdmin
def get_contact_submissions():
    """Get contact form submissions from landing page"""
    try:
        # Contact form submissions are stored as button_clicks with section=landing:contact_form
        submissions_raw = list(db.button_clicks.find(
            {"section": "landing:contact_form"},
            {"_id": 0}
        ).sort("created_at", -1).limit(200))
        
        submissions = []
        for item in submissions_raw:
            # Parse the form data from button_text
            button_text = item.get("button_text", "")
            form_data = {}
            
            # Format: "Contact Form | {json}" or "Contact Form Submitted | {json}"
            if "|" in button_text:
                json_part = button_text.split("|", 1)[1].strip()
                try:
                    import json
                    form_data = json.loads(json_part)
                except:
                    form_data = {"raw": json_part}
            
            geo = item.get("geo", {})
            
            submissions.append({
                "name": form_data.get("name", ""),
                "email": form_data.get("email", ""),
                "message": form_data.get("message", ""),
                "page": item.get("page", ""),
                "ip_address": item.get("ip_address", ""),
                "city": geo.get("city", ""),
                "country": geo.get("country", ""),
                "created_at": item.get("created_at").isoformat() if item.get("created_at") else ""
            })
        
        return jsonify({"submissions": submissions}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== GPS Geolocation Update ====================

@user_tracking_bp.route('/geo-update', methods=['POST'])
def track_geo_update():
    """Receive GPS-based geolocation from browser (more precise than IP)"""
    try:
        data = request.json or {}
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        accuracy = data.get("accuracy", 0)
        source = data.get("source", "gps")
        
        if not latitude or not longitude:
            return jsonify({"status": "skipped", "reason": "no coords"}), 200
        
        # Reverse geocode GPS coordinates to get city/town name
        city = "Unknown"
        country = "Unknown"
        region = ""
        try:
            # Use OpenStreetMap Nominatim for reverse geocoding (free, no API key)
            geo_response = http_requests.get(
                f"https://nominatim.openstreetmap.org/reverse?lat={latitude}&lon={longitude}&format=json&zoom=10&addressdetails=1",
                headers={"User-Agent": "PeppperwahlTracking/1.0"},
                timeout=5
            )
            if geo_response.status_code == 200:
                geo_data = geo_response.json()
                address = geo_data.get("address", {})
                # Try to get the most precise location name
                city = address.get("city") or address.get("town") or address.get("village") or address.get("suburb") or address.get("county") or "Unknown"
                region = address.get("state", "")
                country = address.get("country", "Unknown")
        except Exception as geo_err:
            print(f"  Reverse geocoding failed: {geo_err}")
        
        user_email = data.get("user_email", "")
        session_id = data.get("session_id", "")
        
        # Store GPS geolocation record
        geo_record = {
            "user_id": data.get("user_id", "anonymous"),
            "user_email": user_email,
            "user_name": data.get("user_name", ""),
            "session_id": session_id,
            "ip_address": get_ip_from_request(),
            "latitude": latitude,
            "longitude": longitude,
            "accuracy_meters": accuracy,
            "city": city,
            "region": region,
            "country": country,
            "source": source,  # "gps" = precise, "ip" = approximate
            "created_at": datetime.now(timezone.utc)
        }
        
        db.user_geolocations.insert_one(geo_record)
        
        # Also update the session record with GPS location
        if session_id:
            db.user_sessions.update_many(
                {"session_id": session_id},
                {"$set": {
                    "geo": {
                        "city": city,
                        "region": region,
                        "country": country,
                        "latitude": latitude,
                        "longitude": longitude,
                        "source": source,
                        "accuracy_meters": accuracy
                    }
                }}
            )
        
        print(f"  GPS location: {city}, {region}, {country} (accuracy: {accuracy}m)")
        return jsonify({"status": "ok", "city": city, "country": country}), 200
    except Exception as e:
        print(f"  GPS tracking error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ==================== GPS Geolocation Update ====================

@user_tracking_bp.route('/geo-update', methods=['POST'])
def track_geo_update():
    """Receive GPS-based geolocation from browser (user allowed location access)"""
    try:
        data = request.json or {}
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        accuracy = data.get("accuracy")
        source = data.get("source", "gps")
        
        if not latitude or not longitude:
            return jsonify({"status": "skipped"}), 200
        
        # Reverse geocode GPS coordinates to get city/town name
        city = "Unknown"
        country = "Unknown"
        region = ""
        try:
            geo_response = http_requests.get(
                f"https://nominatim.openstreetmap.org/reverse?lat={latitude}&lon={longitude}&format=json&addressdetails=1&zoom=14",
                headers={"User-Agent": "PepperwhalTracker/1.0"},
                timeout=5
            )
            if geo_response.status_code == 200:
                geo_data = geo_response.json()
                address = geo_data.get("address", {})
                # Get the most specific locality
                city = address.get("town") or address.get("city") or address.get("village") or address.get("suburb") or address.get("county") or "Unknown"
                region = address.get("state", "")
                country = address.get("country", "Unknown")
        except Exception as geo_err:
            print(f"  GPS reverse geocode failed: {geo_err}")
        
        ip = get_ip_from_request()
        
        record = {
            "user_id": data.get("user_id", "anonymous"),
            "user_email": data.get("user_email", ""),
            "user_name": data.get("user_name", ""),
            "session_id": data.get("session_id", ""),
            "ip_address": ip,
            "latitude": latitude,
            "longitude": longitude,
            "accuracy_meters": accuracy,
            "city": city,
            "region": region,
            "country": country,
            "source": source,  # "gps" or "ip"
            "created_at": datetime.now(timezone.utc)
        }
        
        db.user_geolocations.insert_one(record)
        
        # Also update the user's session with GPS location
        if data.get("session_id"):
            db.user_sessions.update_one(
                {"session_id": data.get("session_id")},
                {"$set": {
                    "geo": {
                        "city": city,
                        "region": region,
                        "country": country,
                        "latitude": latitude,
                        "longitude": longitude,
                        "source": source
                    }
                }}
            )
        
        print(f"  GPS location: {city}, {region}, {country} (accuracy: {accuracy}m)")
        return jsonify({"status": "ok", "city": city}), 200
    except Exception as e:
        print(f"  GPS update error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
