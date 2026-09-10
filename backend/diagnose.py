# backend/diagnose.py
import sqlite3
import json

print("=" * 60)
print("🔍 DIAGNOSTIC - REVIEW SUBMISSION ISSUE")
print("=" * 60)

conn = sqlite3.connect('apnamate.db')
cursor = conn.cursor()

# 1. Check User
print("\n1️⃣ CHECKING USER (ID: 2)")
print("-" * 40)

cursor.execute('SELECT id, email, name, role, is_active FROM users WHERE id = 2')
user = cursor.fetchone()

if user:
    print(f"✅ User found:")
    print(f"   ID: {user[0]}")
    print(f"   Email: {user[1]}")
    print(f"   Name: {user[2]}")
    print(f"   Role: {user[3]}")
    print(f"   Active: {user[4]}")
    
    if user[3] != "customer":
        print(f"❌ Role is '{user[3]}' - Should be 'customer'")
        print("   Fixing...")
        cursor.execute('UPDATE users SET role = "customer" WHERE id = 2')
        conn.commit()
        print("   ✅ Updated role to 'customer'")
    else:
        print("✅ Role is correct 'customer'")
    
    if user[4] == 0:
        print("❌ User is BLOCKED!")
        print("   Fixing...")
        cursor.execute('UPDATE users SET is_active = 1 WHERE id = 2')
        conn.commit()
        print("   ✅ User unblocked")
    else:
        print("✅ User is active")
else:
    print("❌ User not found!")

# 2. Check Booking
print("\n2️⃣ CHECKING BOOKING (ID: 4)")
print("-" * 40)

cursor.execute('SELECT id, customer_id, provider_id, status, service FROM bookings WHERE id = 4')
booking = cursor.fetchone()

if booking:
    print(f"✅ Booking found:")
    print(f"   ID: {booking[0]}")
    print(f"   Customer ID: {booking[1]}")
    print(f"   Provider ID: {booking[2]}")
    print(f"   Status: {booking[3]}")
    print(f"   Service: {booking[4]}")
    
    if booking[3].lower() != "completed":
        print(f"❌ Status is '{booking[3]}' - Should be 'Completed'")
        print("   Fixing...")
        cursor.execute('UPDATE bookings SET status = "Completed" WHERE id = 4')
        conn.commit()
        print("   ✅ Updated status to 'Completed'")
    else:
        print("✅ Status is correct 'Completed'")
    
    # Check if booking belongs to user
    if booking[1] == 2:
        print("✅ Booking belongs to this customer")
    else:
        print(f"❌ Booking belongs to customer {booking[1]}, not 2")
else:
    print("❌ Booking not found!")

# 3. Check if review already exists
print("\n3️⃣ CHECKING EXISTING REVIEW")
print("-" * 40)

cursor.execute('SELECT id, booking_id, customer_id, rating FROM reviews WHERE booking_id = 4')
review = cursor.fetchone()

if review:
    print(f"❌ Review already exists for this booking!")
    print(f"   Review ID: {review[0]}")
    print(f"   Rating: {review[2]}")
    print("   To fix: Delete this review first")
    print("   Run: DELETE FROM reviews WHERE booking_id = 4")
else:
    print("✅ No existing review for this booking")

# 4. Verify final state
print("\n4️⃣ FINAL STATE")
print("-" * 40)

cursor.execute('SELECT id, email, name, role, is_active FROM users WHERE id = 2')
user_final = cursor.fetchone()

cursor.execute('SELECT id, customer_id, status FROM bookings WHERE id = 4')
booking_final = cursor.fetchone()

print("👤 User:", user_final[1], "- Role:", user_final[3], "- Active:", user_final[4])
print("📋 Booking:", booking_final[0], "- Customer:", booking_final[1], "- Status:", booking_final[2])

conn.commit()
conn.close()

print("\n" + "=" * 60)
print("📋 SUMMARY")
print("=" * 60)
print("1. If user role was fixed → OK")
print("2. If booking status was fixed → OK")
print("3. If review exists → Delete it first")
print("4. Then LOGOUT and LOGIN again")
print("=" * 60)