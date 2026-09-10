# backend/complete_fix.py
import sqlite3

print("=" * 60)
print("🔧 COMPLETE FIX - REVIEW SUBMISSION")
print("=" * 60)

conn = sqlite3.connect('apnamate.db')
cursor = conn.cursor()

# 1. Fix user (ID 2)
print("\n1️⃣ Fixing user...")
cursor.execute('UPDATE users SET role = "customer", is_active = 1 WHERE id = 2')
print("✅ User fixed")

# 2. Fix booking (ID 4)
print("\n2️⃣ Fixing booking...")
cursor.execute('UPDATE bookings SET status = "Completed" WHERE id = 4')
print("✅ Booking fixed")

# 3. Delete any existing review
print("\n3️⃣ Removing existing reviews...")
cursor.execute('DELETE FROM reviews WHERE booking_id = 4')
print("✅ Reviews removed")

# 4. Commit all changes
conn.commit()

# 5. Verify
print("\n4️⃣ Verification:")

cursor.execute('SELECT id, role, is_active FROM users WHERE id = 2')
user = cursor.fetchone()
print(f"   User {user[0]}: Role={user[1]}, Active={user[2]}")

cursor.execute('SELECT id, status FROM bookings WHERE id = 4')
booking = cursor.fetchone()
print(f"   Booking {booking[0]}: Status={booking[1]}")

cursor.execute('SELECT COUNT(*) FROM reviews WHERE booking_id = 4')
review_count = cursor.fetchone()[0]
print(f"   Reviews for booking: {review_count}")

conn.close()

print("\n" + "=" * 60)
print("✅ COMPLETE!")
print("=" * 60)
print("\n📋 NEXT STEPS:")
print("1. Refresh your browser")
print("2. Logout (if logged in)")
print("3. Login again as Prashant Kumar Das")
print("4. Go to My Bookings")
print("5. Try submitting the review again")
print("=" * 60)