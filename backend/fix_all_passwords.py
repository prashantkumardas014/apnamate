# fix_all_passwords.py
import sqlite3
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

conn = sqlite3.connect("apnamate.db")
cursor = conn.cursor()

# Get all users
cursor.execute("SELECT id, email, password FROM users")
users = cursor.fetchall()

for user in users:
    user_id, email, password = user
    
    # Check if password is already hashed (starts with $2b$)
    if password.startswith("$2b$"):
        print(f"✅ Password already hashed for {email}")
        continue
    
    # Hash the password
    try:
        hashed_password = pwd_context.hash(password)
        cursor.execute(
            "UPDATE users SET password = ? WHERE id = ?",
            (hashed_password, user_id)
        )
        print(f"✅ Password fixed for {email}")
    except Exception as e:
        print(f"❌ Error fixing password for {email}: {e}")

conn.commit()
conn.close()
print("✅ All passwords fixed!")