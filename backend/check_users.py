import sqlite3

conn = sqlite3.connect("apnamate.db")
cursor = conn.cursor()
cursor.execute("SELECT id, name, email, role FROM users")
users = cursor.fetchall()

print("All users in database:")
for user in users:
    print(f"ID: {user[0]}, Name: {user[1]}, Email: {user[2]}, Role: {user[3]}")

conn.close()