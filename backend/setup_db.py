# backend/setup_db.py
import sqlite3
from app.security import hash_password
from datetime import datetime

print("=" * 60)
print("🔧 SETTING UP DATABASE")
print("=" * 60)

conn = sqlite3.connect('apnamate.db')
cursor = conn.cursor()

# 1. Create Admin
print("\n1️⃣ Creating Admin...")
hashed = hash_password('Admin@123')
cursor.execute('''
    INSERT OR IGNORE INTO users (name, email, password, role, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
''', ('Admin', 'admin@apnamate.com', hashed, 'admin', 1, datetime.now()))
print("✅ Admin created: admin@apnamate.com / Admin@123")

# 2. Create Customer
print("\n2️⃣ Creating Customer...")
hashed = hash_password('customer123')
cursor.execute('''
    INSERT OR IGNORE INTO users (name, email, password, role, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
''', ('Test Customer', 'customer@example.com', hashed, 'customer', 1, datetime.now()))
print("✅ Customer created: customer@example.com / customer123")

# 3. Create Providers
print("\n3️⃣ Creating Providers...")
hashed = hash_password('provider123')
providers = [
    ('Rajesh Bhai', 'rajesh@example.com', 'Electrician', 'Silvassa'),
    ('Priya Patel', 'priya@example.com', 'Plumber', 'Silvassa'),
    ('Amit Singh', 'amit@example.com', 'Carpenter', 'Dadra and Nagar Haveli'),
]

for name, email, service, location in providers:
    cursor.execute('''
        INSERT OR IGNORE INTO users (name, email, password, role, is_active, service, location, rating, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (name, email, hashed, 'provider', 1, service, location, 'New', datetime.now()))
    print(f"✅ Provider created: {name} ({service})")

conn.commit()

# 4. Show all users
print("\n" + "=" * 60)
print("📋 ALL USERS IN DATABASE")
print("=" * 60)
cursor.execute('SELECT id, email, name, role FROM users')
users = cursor.fetchall()
for u in users:
    print(f"ID: {u[0]}, Email: {u[1]}, Name: {u[2]}, Role: {u[3]}")

conn.close()
print("\n" + "=" * 60)
print("✅ Database setup complete!")
print("=" * 60)