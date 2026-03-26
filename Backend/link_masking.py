"""
Link Masking System for PepperAds Platform
Provides URL shortening and masking capabilities with analytics tracking
"""

from datetime import datetime, timezone
from flask import request, jsonify, redirect
from mongodb_config import db
import uuid
import string
import random
from urllib.parse import urlparse

class LinkMaskingHandler:
    """Handler for link masking and shortening operations"""
    
    def __init__(self):
        self.db = db
        # Use localhost for testing, change back to production when ready
        self.base_url = "http://127.0.0.1:5000"  # Testing URL
    
    def generate_short_id(self, length=6):
        """Generate a unique short ID for the link"""
        characters = string.ascii_letters + string.digits
        while True:
            short_id = ''.join(random.choices(characters, k=length))
            # Check if ID already exists
            existing = self.db.masked_links.find_one({"short_id": short_id})
            if not existing:
                return short_id
    
    def create_masked_link(self, original_url, custom_alias=None, user_id=None):
        """Create a new masked link"""
        try:
            # Validate URL format
            parsed = urlparse(original_url)
            if not parsed.scheme or not parsed.netloc:
                return {"error": "Invalid URL format"}

            # Ensure scheme is http or https
            if parsed.scheme not in ("http", "https"):
                return {"error": "URL must start with http:// or https://"}

            # Check the domain actually resolves
            import socket
            try:
                socket.setdefaulttimeout(5)
                socket.getaddrinfo(parsed.netloc.split(":")[0], None)
            except socket.gaierror:
                return {"error": f"Domain '{parsed.netloc}' could not be found. Please check the URL and try again."}
            
            # Generate or use custom alias
            if custom_alias:
                # Check if custom alias already exists
                existing = self.db.masked_links.find_one({"short_id": custom_alias})
                if existing:
                    return {"error": "Custom alias already exists"}
                short_id = custom_alias.lower()
            else:
                short_id = self.generate_short_id()
            
            # Create link document
            link_data = {
                "short_id": short_id,
                "original_url": original_url,
                "created_by": user_id,
                "created_at": datetime.now(timezone.utc),
                "clicks": 0,
                "unique_clicks": 0,
                "last_clicked": None,
                "is_active": True,
                "analytics": {
                    "daily_clicks": {},
                    "referrers": {},
                    "countries": {},
                    "devices": {},
                    "browsers": {}
                }
            }
            
            # Insert into database
            result = self.db.masked_links.insert_one(link_data)
            
            # Return success response
            masked_url = f"{self.base_url}/l/{short_id}"
            return {
                "success": True,
                "short_id": short_id,
                "masked_url": masked_url,
                "original_url": original_url,
                "link_id": str(result.inserted_id)
            }
            
        except Exception as e:
            return {"error": f"Failed to create masked link: {str(e)}"}
    
    def get_original_url(self, short_id, request_obj=None):
        """Get original URL and track analytics"""
        try:
            # Find the link
            link = self.db.masked_links.find_one({"short_id": short_id, "is_active": True})
            if not link:
                return None
            
            # Update click analytics if request is provided
            if request_obj:
                self._track_click(link, request_obj)
            else:
                # Just update click count without detailed analytics
                self.db.masked_links.update_one(
                    {"short_id": short_id},
                    {
                        "$inc": {"clicks": 1},
                        "$set": {"last_clicked": datetime.now(timezone.utc)}
                    }
                )
            
            return link["original_url"]
            
        except Exception as e:
            print(f"Error retrieving link: {e}")
            return None
    
    def _track_click(self, link, request):
        """Track click analytics for the link"""
        try:
            short_id = link["short_id"]
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

            user_agent = ''
            referrer = 'direct'
            ip_address = 'unknown'

            if request:
                user_agent = request.headers.get('User-Agent', '')
                raw_ref = request.headers.get('Referer', '') or ''
                referrer = raw_ref.replace('.', '_').replace('/', '_').replace(':', '_')[:50] if raw_ref else 'direct'
                ip_address = request.remote_addr or 'unknown'

            device = self._parse_device(user_agent)
            browser = self._parse_browser(user_agent)
            country = self._get_country_from_ip(ip_address)

            inc_fields = {
                "clicks": 1,
                f"analytics.daily_clicks.{today}": 1,
                f"analytics.referrers.{referrer}": 1,
                f"analytics.countries.{country}": 1,
                f"analytics.devices.{device}": 1,
                f"analytics.browsers.{browser}": 1,
            }

            if link.get("clicks", 0) == 0:
                inc_fields["unique_clicks"] = 1

            self.db.masked_links.update_one(
                {"short_id": short_id},
                {
                    "$inc": inc_fields,
                    "$set": {"last_clicked": datetime.now(timezone.utc)},
                }
            )

        except Exception as e:
            print(f"Error tracking click: {e}")
    
    def _parse_device(self, user_agent):
        """Parse device type from user agent"""
        user_agent = user_agent.lower()
        if 'mobile' in user_agent or 'android' in user_agent or 'iphone' in user_agent:
            return 'mobile'
        elif 'tablet' in user_agent or 'ipad' in user_agent:
            return 'tablet'
        else:
            return 'desktop'
    
    def _parse_browser(self, user_agent):
        """Parse browser from user agent"""
        user_agent = user_agent.lower()
        if 'chrome' in user_agent:
            return 'chrome'
        elif 'firefox' in user_agent:
            return 'firefox'
        elif 'safari' in user_agent:
            return 'safari'
        elif 'edge' in user_agent:
            return 'edge'
        else:
            return 'other'
    
    def _get_country_from_ip(self, ip_address):
        """Get country from IP (simplified - in production use GeoIP database)"""
        # For now, return default - implement GeoIP lookup in production
        return 'Unknown'
    
    def get_link_analytics(self, short_id):
        """Get analytics for a specific link"""
        try:
            link = self.db.masked_links.find_one({"short_id": short_id})
            if not link:
                return {"error": "Link not found"}
            
            return {
                "short_id": link["short_id"],
                "original_url": link["original_url"],
                "masked_url": f"{self.base_url}/l/{link['short_id']}",
                "created_at": link["created_at"],
                "clicks": link["clicks"],
                "unique_clicks": link["unique_clicks"],
                "last_clicked": link["last_clicked"],
                "is_active": link["is_active"],
                "analytics": link.get("analytics", {})
            }
            
        except Exception as e:
            return {"error": f"Failed to get analytics: {str(e)}"}
    
    def get_user_links(self, user_id, limit=50, offset=0):
        """Get all links created by a user"""
        try:
            links = self.db.masked_links.find(
                {"created_by": user_id}
            ).sort("created_at", -1).skip(offset).limit(limit)
            
            result = []
            for link in links:
                result.append({
                    "short_id": link["short_id"],
                    "original_url": link["original_url"],
                    "masked_url": f"{self.base_url}/l/{link['short_id']}",
                    "created_at": link["created_at"],
                    "clicks": link["clicks"],
                    "unique_clicks": link["unique_clicks"],
                    "last_clicked": link["last_clicked"],
                    "is_active": link["is_active"]
                })
            
            return {"links": result, "total": len(result)}
            
        except Exception as e:
            return {"error": f"Failed to get user links: {str(e)}"}
    
    def update_link(self, short_id, user_id, updates):
        """Update link settings"""
        try:
            # Check if user owns this link
            link = self.db.masked_links.find_one({"short_id": short_id, "created_by": user_id})
            if not link:
                return {"error": "Link not found or access denied"}
            
            # Allowed updates
            allowed_updates = ["is_active", "original_url"]
            update_data = {}
            
            for key, value in updates.items():
                if key in allowed_updates:
                    update_data[key] = value
            
            if not update_data:
                return {"error": "No valid updates provided"}
            
            # Update the link
            self.db.masked_links.update_one(
                {"short_id": short_id},
                {"$set": update_data}
            )
            
            return {"success": True, "message": "Link updated successfully"}
            
        except Exception as e:
            return {"error": f"Failed to update link: {str(e)}"}
    
    def delete_link(self, short_id, user_id):
        """Delete a masked link"""
        try:
            # Check if user owns this link
            link = self.db.masked_links.find_one({"short_id": short_id, "created_by": user_id})
            if not link:
                return {"error": "Link not found or access denied"}
            
            # Delete the link
            self.db.masked_links.delete_one({"short_id": short_id})
            
            return {"success": True, "message": "Link deleted successfully"}
            
        except Exception as e:
            return {"error": f"Failed to delete link: {str(e)}"}

# Global handler instance
link_handler = LinkMaskingHandler()
