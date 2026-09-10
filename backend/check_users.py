# backend/check_user.py
import sqlite3

conn = sqlite3.connect('apnamate.db')
cursor = conn.cursor()

# Check user 2
cursor.execute('SELECT id, email, name, role, is_active FROM users WHERE id = 2')
user = cursor.fetchone()

print("=" * 60)
print("👤 USER DETAILS")
print("=" * 60)
if user:
    print(f"ID: {user[0]}")
    print(f"Email: {user[1]}")
    print(f"Name: {user[2]}")
    print(f"Role: {user[3]}")
    print(f"Active: {user[4]}")
    print("=" * 60)
    
    if user[3] != "customer":
        print(f"❌ User role is '{user[3]}', should be 'customer'")
    else:
        print("✅ User role is correct!")
    
    if user[4] == 0:
        print("❌ User is BLOCKED!")
    else:
        print("✅ User is active!")
else:
    print("❌ User not found!")

conn.close()