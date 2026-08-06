from mongodb_config import db
count = 0
for s in db.surveys.find({}):
    for i, q in enumerate(s.get('questions', [])):
        layers = q.get('layers', [])
        if isinstance(layers, list) and len(layers) > 0:
            sid = s.get('id', str(s.get('_id', '')))
            print(f"Survey {sid} Q{i+1}({q.get('id')}): {len(layers)} layers -> {layers}")
            count += 1
print(f"\nTotal questions with layers: {count}")
