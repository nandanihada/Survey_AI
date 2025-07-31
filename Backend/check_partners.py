from mongodb_config import db

print('=== CHECKING PARTNERS ===')
partners = list(db.partners.find({}))
print(f'Total partners: {len(partners)}')

for p in partners:
    print(f'Name: {p.get("name", "No name")}')
    print(f'Status: {p.get("status", "No status")}') 
    print(f'URL: {p.get("url", "No URL")}')
    print('---')

print('\n=== CHECKING ACTIVE PARTNERS ===')
active_partners = list(db.partners.find({'status': 'active'}))
print(f'Active partners: {len(active_partners)}')

if active_partners:
    for ap in active_partners:
        print(f'Active Partner: {ap.get("name")} - {ap.get("url")}')
else:
    print('No active partners found!')
    
print('\n=== SOLUTION ===')
print('If no active partners, you need to either:')
print('1. Add partners with status "active"')
print('2. Update existing partners to have status "active"')
