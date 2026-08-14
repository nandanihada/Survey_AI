"""
IP utility helpers — use these everywhere instead of request.environ.get('REMOTE_ADDR').
Render (and most reverse proxies) set X-Forwarded-For with the real client IP.
"""
import requests as _req


def get_real_ip(request) -> str:
    """
    Extract the real client IP from a Flask request object.
    Checks X-Forwarded-For first (set by Render / Nginx / Cloudflare),
    then X-Real-IP, then falls back to REMOTE_ADDR.
    """
    forwarded = request.headers.get('X-Forwarded-For', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    real_ip = request.headers.get('X-Real-IP', '')
    if real_ip:
        return real_ip.strip()
    return request.environ.get('REMOTE_ADDR', 'unknown') or 'unknown'


def geo_from_ip(ip: str) -> dict:
    """
    Resolve city/country from a public IP via ip-api.com (free, 45 req/min).
    Returns {} for private / unknown IPs.
    """
    PRIVATE = {'unknown', '127.0.0.1', '::1', 'localhost', '0.0.0.0', ''}
    if not ip or ip in PRIVATE or ip.startswith('10.') or ip.startswith('192.168.') or ip.startswith('172.'):
        return {}
    try:
        r = _req.get(
            f"http://ip-api.com/json/{ip}?fields=status,country,regionName,city",
            timeout=3
        )
        if r.status_code == 200:
            d = r.json()
            if d.get('status') == 'success':
                return {
                    'city': d.get('city', ''),
                    'region': d.get('regionName', ''),
                    'country': d.get('country', ''),
                }
    except Exception:
        pass
    return {}
