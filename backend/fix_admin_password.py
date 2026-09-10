# fix_admin_password.py
import sqlite3
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Connect to database
conn = sqlite3.connect("apnamate.db")
cursor = conn.cursor()

# Check if admin exists
cursor.execute("SELECT id, email, password FROM users WHERE email = 'admin@apnamate.com'")
admin = cursor.fetchone()

if admin:
    # Hash the password properly
    hashed_password = pwd_context.hash("Admin@123")
    
    # Update the password
    cursor.execute(
        "UPDATE users SET password = ? WHERE email = 'admin@apnamate.com'",
        (hashed_password,)
    )
    conn.commit()
    print("✅ Admin password fixed!")
else:
    print("❌ Admin not found!")

conn.close()