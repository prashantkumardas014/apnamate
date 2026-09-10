# backend/test_review.py
import requests
import json

print("=" * 60)
print("🔧 REVIEW API TEST TOOL")
print("=" * 60)

# 1. First, let's login to get a token
print("\n1️⃣ Logging in...")
login_data = {
    "email": "prashant2026@gmail.com",  # CHANGE THIS to your email
    "password": "Prashant123"  # CHANGE THIS to your password
}

try:
    login_response = requests.post("http://localhost:8000/login", json=login_data)
    print(f"Login Status: {login_response.status_code}")
    
    if login_response.status_code == 200:
        login_result = login_response.json()
        token = login_result.get('token')
        user_id = login_result.get('user_id')
        user_role = login_result.get('role')
        print(f"✅ Logged in successfully!")
        print(f"   User ID: {user_id}")
        print(f"   Role: {user_role}")
        print(f"   Token: {token[:20]}...")
    else:
        print(f"❌ Login failed: {login_response.json()}")
        exit()
except Exception as e:
    print(f"❌ Login error: {e}")
    exit()

# 2. Get all bookings for this user
print("\n2️⃣ Fetching your bookings...")
try:
    bookings_response = requests.get(
        f"http://localhost:8000/bookings/my-bookings/{user_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if bookings_response.status_code == 200:
        bookings_data = bookings_response.json()
        if bookings_data.get('success'):
            bookings = bookings_data.get('bookings', [])
            print(f"✅ Found {len(bookings)} bookings:")
            for b in bookings:
                print(f"   Booking #{b['id']}: {b['service']} - {b['status']} (Provider: {b['provider_name']})")
        else:
            print(f"❌ No bookings found")
    else:
        print(f"❌ Failed to fetch bookings: {bookings_response.json()}")
except Exception as e:
    print(f"❌ Error: {e}")

# 3. Test the debug endpoint
print("\n3️⃣ Testing debug endpoint...")
debug_data = {
    "booking_id": 9,
    "rating": 5,
    "comment": "Good"
}

try:
    debug_response = requests.post(
        "http://localhost:8000/bookings/reviews/debug",
        json=debug_data
    )
    print(f"Debug Status: {debug_response.status_code}")
    print(f"Debug Response: {json.dumps(debug_response.json(), indent=2)}")
except Exception as e:
    print(f"❌ Debug error: {e}")

# 4. Try to submit a real review
print("\n4️⃣ Submitting a real review...")
review_data = {
    "booking_id": 9,
    "rating": 5,
    "comment": "Good"
}

try:
    review_response = requests.post(
        "http://localhost:8000/bookings/reviews",
        json=review_data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )
    print(f"Review Status: {review_response.status_code}")
    print(f"Review Response: {json.dumps(review_response.json(), indent=2)}")
except Exception as e:
    print(f"❌ Review error: {e}")

print("\n" + "=" * 60)
print("✅ Test complete!")