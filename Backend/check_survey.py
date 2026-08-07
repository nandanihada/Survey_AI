from mongodb_config import db

survey_id = "L0HZ4"
s1 = db.surveys.find_one({"id": survey_id})
s2 = db.surveys.find_one({"short_id": survey_id})
s3 = db.surveys.find_one({"_id": survey_id})

print("By id:", "FOUND -", s1.get("title","")[:50] if s1 else "NOT FOUND")
print("By short_id:", "FOUND -", s2.get("title","")[:50] if s2 else "NOT FOUND")
print("By _id:", "FOUND -", s3.get("title","")[:50] if s3 else "NOT FOUND")
