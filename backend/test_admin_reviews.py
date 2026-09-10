# backend/test_admin_reviews.py
import requests
import json

# Login as admin
login = requests.post('http://localhost:8000/login', json={
    'email': 'admin@apnamate.com',
    'password': 'Admin@123'
})

if login.status_code != 200:
    print('❌ Login failed')
    print(login.json())
    exit()

token = login.json().get('token')
print('✅ Logged in as admin')

# Test admin reviews endpoint
response = requests.get(
    'http://localhost:8000/bookings/admin/reviews',
    headers={'Authorization': f'Bearer {token}'}
)

print(f'Status: {response.status_code}')

if response.status_code == 200:
    data = response.json()
    print(f'✅ Found {data.get("total", 0)} reviews')
    for review in data.get('reviews', [])[:3]:
        print(f'  - {review["customer_name"]} rated {review["provider_name"]}: {review["rating"]}⭐')
else:
    print(f'❌ Error: {response.text}')