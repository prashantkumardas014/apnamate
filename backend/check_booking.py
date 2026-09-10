# backend/check_booking.py
import sqlite3

conn = sqlite3.connect('apnamate.db')
cursor = conn.cursor()

# Check booking 9
cursor.execute('SELECT id, customer_id, provider_id, status, service FROM bookings WHERE id = 9')
booking = cursor.fetchone()

print("=" * 60)
print("📋 BOOKING DETAILS")
print("=" * 60)
if booking:
    print(f"ID: {booking[0]}")
    print(f"Customer ID: {booking[1]}")
    print(f"Provider ID: {booking[2]}")
    print(f"Status: {booking[3]}")
    print(f"Service: {booking[4]}")
    print("=" * 60)
    
    if booking[3].lower() != "completed":
        print(f"❌ Booking status is '{booking[3]}', should be 'Completed'")
    else:
        print("✅ Booking status is correct!")
else:
    print("❌ Booking not found!")

conn.close()