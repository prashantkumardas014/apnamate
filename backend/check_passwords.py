from app.database import SessionLocal
from app.models import User

db = SessionLocal()

users = db.query(User).all()

print(f"Found {len(users)} users in the database:\n")

for user in users:
    # Truncate the password to avoid printing the full hash if it's long
    # DO NOT run this on real production data with real passwords!
    short_pass = str(user.password)[:20] if user.password else "None"
    print(f"ID: {user.id} | Email: {user.email} | Password (first 20 chars): {short_pass}")

db.close()