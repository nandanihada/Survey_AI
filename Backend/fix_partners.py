from mongodb_config import db

# Activate test partner
result = db.partners.update_one(
    {'name': 'test1'}, 
    {'$set': {'status': 'active'}}
)
print(f'Updated {result.modified_count} partners to active status')

# Show all partners
partners = list(db.partners.find({}))
print(f'\nCurrent partners ({len(partners)} total):')
for p in partners:
    print(f'  - {p["name"]}: {p["status"]} -> {p["url"][:50]}...')
