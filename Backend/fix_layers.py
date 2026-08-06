"""One-time script to fix surveys where layers field is not a list (e.g. ' ', '', None)"""
from mongodb_config import db

surveys = list(db.surveys.find({}))
fixed = 0
for survey in surveys:
    changed = False
    questions = survey.get('questions', [])
    for q in questions:
        layers = q.get('layers')
        if not isinstance(layers, list):
            q['layers'] = []
            changed = True
    if changed:
        db.surveys.update_one({'_id': survey['_id']}, {'$set': {'questions': questions}})
        fixed += 1

print(f'Fixed {fixed} surveys with bad layers field')
