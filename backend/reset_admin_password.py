import sqlite3
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

conn = sqlite3.connect("apnamate.db")
cursor = conn.cursor()

# Check if admin exists
cursor.execute("SELECT id, email FROM users WHERE email = 'admin@apnamate.com'")
admin = cursor.fetchone()

if admin:
    # Hash the password (truncate to 72 bytes)
    password = "Admin@123"[:72]
    hashed_password = pwd_context.hash(password)
    
    # Update password
    cursor.execute(
        "UPDATE users SET password = ? WHERE email = 'admin@apnamate.com'",
        (hashed_password,)
    )
    conn.commit()
    print("✅ Admin password reset successfully!")
    print(f"Email: admin@apnamate.com")
    print(f"Password: Admin@123")
else:
    # Create admin if not exists
    password = "Admin@123"[:72]
    hashed_password = pwd_context.hash(password)
    cursor.execute(
        "INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)",
        ("ApnaMate Admin", "admin@apnamate.com", hashed_password, "admin", 1)
    )
    conn.commit()
    print("✅ Admin created successfully!")
    print(f"Email: admin@apnamate.com")
    print(f"Password: Admin@123")

conn.close()