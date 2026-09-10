# backend/fix_user.py
import sqlite3

def fix_user():
    try:
        conn = sqlite3.connect('apnamate.db')
        cursor = conn.cursor()
        
        # Check all users first
        print("=" * 60)
        print("👤 ALL USERS")
        print("=" * 60)
        
        cursor.execute('SELECT id, email, name, role, is_active FROM users')
        users = cursor.fetchall()
        
        for user in users:
            status = '✅ Active' if user[4] == 1 else '🚫 Blocked'
            print(f'ID: {user[0]}, Email: {user[1]}, Name: {user[2]}, Role: {user[3]}, Status: {status}')
        
        print("=" * 60)
        
        # Fix user with ID 2
        user_id = 2
        cursor.execute('UPDATE users SET role = "customer", is_active = 1 WHERE id = ?', (user_id,))
        conn.commit()
        
        print(f'✅ User {user_id} updated to customer role and activated!')
        
        # Verify
        cursor.execute('SELECT id, email, name, role, is_active FROM users WHERE id = ?', (user_id,))
        updated = cursor.fetchone()
        
        if updated:
            print(f'📋 Verified: ID: {updated[0]}, Email: {updated[1]}, Name: {updated[2]}, Role: {updated[3]}, Active: {updated[4]}')
        
        conn.close()
        print("\n✅ Now logout and login again to submit your review!")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    fix_user()