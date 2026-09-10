# backend/test_review_fix.py
import requests
import json
import sqlite3

print("=" * 60)
print("🔧 REVIEW FIX TEST")
print("=" * 60)

# =========================================================
# STEP 1: Check booking status in database
# =========================================================

print("\n1️⃣ Checking booking status in database...")
booking_id = 9

conn = sqlite3.connect('apnamate.db')
cursor = conn.cursor()

cursor.execute("SELECT id, customer_id, provider_id, status, service FROM bookings WHERE id = ?", (booking_id,))
booking = cursor.fetchone()

if booking:
    print(f"✅ Booking #{booking[0]}:")
    print(f"   Status: '{booking[3]}'")
    print(f"   Service: {booking[4]}")
    print(f"   Customer ID: {booking[1]}")
    print(f"   Provider ID: {booking[2]}")
    
    if booking[3].lower() != "completed":
        print(f"\n⚠️ Status is '{booking[3]}', updating to 'Completed'...")
        cursor.execute("UPDATE bookings SET status = 'Completed' WHERE id = ?", (booking_id,))
        conn.commit()
        print(f"✅ Booking #{booking_id} status updated to 'Completed'")
else:
    print(f"❌ Booking #{booking_id} not found!")
    conn.close()
    exit()

conn.close()

# =========================================================
# STEP 2: Login to get token
# =========================================================

print("\n2️⃣ Logging in...")
EMAIL = input("Enter your email: ")
PASSWORD = input("Enter your password: ")

login_data = {"email": EMAIL, "password": PASSWORD}

try:
    response = requests.post("http://localhost:8000/login", json=login_data)
    if response.status_code == 200:
        data = response.json()
        token = data.get('token')
        user_id = data.get('user_id')
        user_name = data.get('name')
        print(f"✅ Logged in as: {user_name} (ID: {user_id})")
        print(f"   Token: {token[:30]}...")
    else:
        print(f"❌ Login failed: {response.json()}")
        exit()
except Exception as e:
    print(f"❌ Error: {e}")
    exit()

# =========================================================
# STEP 3: Submit review
# =========================================================

print(f"\n3️⃣ Submitting review for booking #{booking_id}...")

review_data = {
    "booking_id": booking_id,
    "rating": 5,
    "comment": "Good"
}

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

print(f"📤 Sending: {json.dumps(review_data, indent=2)}")

try:
    response = requests.post(
        "http://localhost:8000/bookings/reviews",
        json=review_data,
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    
    try:
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        
        if response.status_code == 200:
            print("\n✅ REVIEW SUBMITTED SUCCESSFULLY!")
        else:
            print(f"\n❌ Review failed: {result.get('detail')}")
    except:
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "=" * 60)