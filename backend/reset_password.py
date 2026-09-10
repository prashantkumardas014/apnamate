# backend/reset_password.py
import sqlite3
from app.security import hash_password

print("=" * 60)
print("🔑 APNAMATE PASSWORD RESET TOOL")
print("=" * 60)

# Show all users first
conn = sqlite3.connect('apnamate.db')
c = conn.cursor()
c.execute('SELECT id, email, name, role FROM users')
users = c.fetchall()

print("\n📋 Available Users:")
print("-" * 60)
for u in users:
    print(f"  ID: {u[0]} | {u[1]} | {u[2]} ({u[3]})")
print("-" * 60)

# Ask for email
email = input("\n📧 Enter email to reset: ").strip()
new_password = input("🔐 Enter new password: ").strip()

if not email or not new_password:
    print("❌ Email and password are required!")
    conn.close()
    exit()

# Check if user exists
c.execute('SELECT id, name FROM users WHERE email = ?', (email,))
user = c.fetchone()

if not user:
    print(f"❌ User not found: {email}")
    conn.close()
    exit()

# Update password
hashed = hash_password(new_password)
c.execute('UPDATE users SET password = ? WHERE email = ?', (hashed, email))
conn.commit()

print("\n" + "=" * 60)
print(f"✅ Password reset successfully!")
print(f"   User: {user[1]} ({email})")
print(f"   New Password: {new_password}")
print("=" * 60)

conn.close()