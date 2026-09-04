import sqlite3

conn = sqlite3.connect("apnamate.db")
cursor = conn.cursor()
cursor.execute("SELECT id, name, email, role FROM users WHERE email = 'admin@apnamate.com'")
admin = cursor.fetchone()

if admin:
    print(f"✅ Admin found!")
    print(f"ID: {admin[0]}")
    print(f"Name: {admin[1]}")
    print(f"Email: {admin[2]}")
    print(f"Role: {admin[3]}")
else:
    print("❌ Admin not found!")

conn.close()