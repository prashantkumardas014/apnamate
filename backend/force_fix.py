# backend/force_fix.py
import sqlite3

conn = sqlite3.connect('apnamate.db')
cursor = conn.cursor()

# Force update user 2
cursor.execute('''
    UPDATE users 
    SET role = 'customer', 
        is_active = 1 
    WHERE id = 2
''')
conn.commit()

# Verify
cursor.execute('SELECT id, email, name, role, is_active FROM users WHERE id = 2')
user = cursor.fetchone()

print("=" * 60)
print("✅ USER UPDATED")
print("=" * 60)
print(f"ID: {user[0]}")
print(f"Email: {user[1]}")
print(f"Name: {user[2]}")
print(f"Role: {user[3]}")
print(f"Active: {user[4]}")
print("=" * 60)

conn.close()