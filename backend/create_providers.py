# backend/create_providers.py
import sqlite3
from app.security import hash_password
from datetime import datetime

conn = sqlite3.connect('apnamate.db')
cursor = conn.cursor()

# Sample providers data
providers = [
    {
        "name": "Rajesh Bhai",
        "email": "rajesh@example.com",
        "password": "provider123",
        "service": "Electrician",
        "location": "Silvassa",
        "experience": "8 years",
        "price": "₹300 - ₹500",
        "category": "Electrical",
        "availability": "Available"
    },
    {
        "name": "Priya Patel",
        "email": "priya@example.com",
        "password": "provider123",
        "service": "Plumber",
        "location": "Silvassa",
        "experience": "6 years",
        "price": "₹400 - ₹600",
        "category": "Plumbing",
        "availability": "Available"
    },
    {
        "name": "Amit Singh",
        "email": "amit@example.com",
        "password": "provider123",
        "service": "Carpenter",
        "location": "Dadar",
        "experience": "10 years",
        "price": "₹500 - ₹800",
        "category": "Carpentry",
        "availability": "Busy"
    },
    {
        "name": "Sneha Reddy",
        "email": "sneha@example.com",
        "password": "provider123",
        "service": "Painter",
        "location": "Andheri",
        "experience": "5 years",
        "price": "₹200 - ₹400",
        "category": "Painting",
        "availability": "Available"
    },
    {
        "name": "Vikram Sharma",
        "email": "vikram@example.com",
        "password": "provider123",
        "service": "AC Repair",
        "location": "Bandra",
        "experience": "7 years",
        "price": "₹500 - ₹1000",
        "category": "HVAC",
        "availability": "Available"
    },
    {
        "name": "Meera Iyer",
        "email": "meera@example.com",
        "password": "provider123",
        "service": "Interior Designer",
        "location": "Colaba",
        "experience": "4 years",
        "price": "₹800 - ₹1500",
        "category": "Design",
        "availability": "Available"
    }
]

# Check existing providers
cursor.execute('SELECT email FROM users WHERE role = "provider"')
existing = [row[0] for row in cursor.fetchall()]

created_count = 0
for provider in providers:
    if provider["email"] in existing:
        print(f"⚠️ Provider {provider['email']} already exists")
        continue
    
    hashed_password = hash_password(provider["password"])
    
    cursor.execute('''
        INSERT INTO users (
            name, email, password, role, is_active,
            service, location, experience, price, category, availability,
            rating, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        provider["name"],
        provider["email"],
        hashed_password,
        "provider",
        1,
        provider["service"],
        provider["location"],
        provider["experience"],
        provider["price"],
        provider["category"],
        provider["availability"],
        "New",
        datetime.now()
    ))
    created_count += 1
    print(f"✅ Created provider: {provider['name']} ({provider['service']})")

conn.commit()
conn.close()

print("\n" + "=" * 60)
print(f"✅ Created {created_count} new providers!")
print("=" * 60)
print("\n📋 Provider Login Credentials:")
print("   Email: any provider email (e.g., rajesh@example.com)")
print("   Password: provider123")
print("=" * 60)