# backend/test_providers_api.py
import requests

# Login as customer or admin
login = requests.post('http://localhost:8000/login', json={
    'email': 'customer@example.com',  # Change to your email
    'password': 'password123'  # Change to your password
})

if login.status_code != 200:
    print('❌ Login failed. Try with a different user.')
    print('💡 Register a customer first or use admin login')
    exit()

token = login.json().get('token')
print('✅ Logged in')

# Get providers
response = requests.get(
    'http://localhost:8000/bookings/providers',
    headers={'Authorization': f'Bearer {token}'}
)

print(f'Status: {response.status_code}')
if response.status_code == 200:
    data = response.json()
    print(f'✅ Found {data.get("count", 0)} providers')
    for p in data.get('providers', [])[:5]:
        print(f'  - {p["name"]}: {p["service"]} ({p["location"]}) ⭐{p["rating"]}')
else:
    print(f'❌ Error: {response.text}')