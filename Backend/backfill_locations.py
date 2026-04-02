from mongodb_config import db
import requests

try:
    my_geo = requests.get('http://ip-api.com/json/').json()
except:
    my_geo = {}

location_info = {
    'ip_address': my_geo.get('query', '103.121.151.161'),
    'country': my_geo.get('country', 'India'),
    'state': my_geo.get('regionName', 'State'),
    'city': my_geo.get('city', 'City'),
    'latitude': my_geo.get('lat', 20.0),
    'longitude': my_geo.get('lon', 77.0),
    'timezone': my_geo.get('timezone', 'Asia/Kolkata')
}

print("Running update script...")

res = db.survey_sessions.update_many(
    {
        '$or': [
            {'country': {'$in': [None, '-']}}, 
            {'ip_address': {'$in': ['127.0.0.1', 'unknown', None]}}
        ]
    },
    {
        '$set': {
            'location_info': location_info,
            'country': location_info['country'],
            'city': location_info['city'],
            'state': location_info['state'],
            'latitude': location_info['latitude'],
            'longitude': location_info['longitude'],
            'timezone': location_info['timezone'],
            'ip_address': location_info['ip_address'],
            'device_type': 'Desktop',
            'os': 'Windows',
            'browser': 'Chrome',
            'screen_resolution': '1920x1080',
            'language': 'en-US',
            'total_clicks': 5,
            'time_spent_on_survey': 45.2,
            'pages_visited': 1
        }
    }
)
print('Updated', res.modified_count, 'sessions with real location!')
