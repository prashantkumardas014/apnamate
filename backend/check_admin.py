import sqlite3
import os
from pathlib import Path

def check_admin_user():
    """Check if admin user exists in the database"""
    
    # Get the database path (adjust if needed)
    db_path = "apnamate.db"
    
    # Check if database file exists
    if not os.path.exists(db_path):
        print(f"❌ Database file '{db_path}' not found!")
        print(f"   Current directory: {os.getcwd()}")
        return False
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if users table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='users'
        """)
        
        if not cursor.fetchone():
            print("❌ 'users' table does not exist in the database!")
            print("   Please run migrations first.")
            return False
        
        # Query admin user
        cursor.execute("""
            SELECT id, email, password, name, role, is_active, rating 
            FROM users 
            WHERE email = 'admin@apnamate.com'
        """)
        result = cursor.fetchone()
        
        if result:
            print("=" * 60)
            print("✅ Admin User Found!")
            print("=" * 60)
            print(f"   ID:           {result[0]}")
            print(f"   Email:        {result[1]}")
            print(f"   Password Hash: {result[2][:30]}... (length: {len(result[2])})")
            print(f"   Name:         {result[3]}")
            print(f"   Role:         {result[4]}")
            print(f"   Status:       {'Active' if result[5] == 1 else 'Blocked'}")
            print(f"   Rating:       {result[6] if result[6] else 'N/A'}")
            print("=" * 60)
            
            # Check if password is hashed (basic check)
            if result[2].startswith('$2b$') or result[2].startswith('$2a$'):
                print("✅ Password is properly hashed (bcrypt format)")
            else:
                print("⚠️  Password might not be hashed properly!")
            
            return True
        else:
            print("❌ Admin user not found!")
            print("   Email 'admin@apnamate.com' does not exist in the database.")
            print("\n💡 To create admin, run:")
            print("   python create_admin.py")
            return False
            
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

def list_all_users():
    """List all users in the database"""
    
    db_path = "apnamate.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Database file '{db_path}' not found!")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if users table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='users'
        """)
        
        if not cursor.fetchone():
            print("❌ 'users' table does not exist!")
            return
        
        # Get all users
        cursor.execute("""
            SELECT id, name, email, role, is_active, rating 
            FROM users 
            ORDER BY id
        """)
        
        users = cursor.fetchall()
        
        if not users:
            print("📋 No users found in the database!")
            return
        
        print("\n" + "=" * 80)
        print("📋 All Users in Database")
        print("=" * 80)
        print(f"{'ID':<5} {'Name':<20} {'Email':<30} {'Role':<12} {'Status':<8} {'Rating':<8}")
        print("-" * 80)
        
        for user in users:
            status = "Active" if user[4] == 1 else "Blocked"
            rating = user[5] if user[5] else "N/A"
            print(f"{user[0]:<5} {user[1][:20]:<20} {user[2][:30]:<30} {user[3]:<12} {status:<8} {rating:<8}")
        
        print("-" * 80)
        print(f"Total users: {len(users)}")
        print("=" * 80)
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

def get_user_by_email(email):
    """Get user details by email"""
    
    db_path = "apnamate.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Database file '{db_path}' not found!")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, email, role, is_active, rating, created_at 
            FROM users 
            WHERE email = ?
        """, (email,))
        
        user = cursor.fetchone()
        
        if user:
            print("\n" + "=" * 60)
            print(f"👤 User Details: {email}")
            print("=" * 60)
            print(f"   ID:        {user[0]}")
            print(f"   Name:      {user[1]}")
            print(f"   Email:     {user[2]}")
            print(f"   Role:      {user[3]}")
            print(f"   Status:    {'Active' if user[4] == 1 else 'Blocked'}")
            print(f"   Rating:    {user[5] if user[5] else 'N/A'}")
            print(f"   Created:   {user[6] if user[6] else 'N/A'}")
            print("=" * 60)
        else:
            print(f"❌ User with email '{email}' not found!")
            
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

def get_database_info():
    """Get database statistics"""
    
    db_path = "apnamate.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Database file '{db_path}' not found!")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table'
        """)
        
        tables = cursor.fetchall()
        
        print("\n" + "=" * 60)
        print("📊 Database Information")
        print("=" * 60)
        print(f"   Database: {db_path}")
        print(f"   Size:     {os.path.getsize(db_path) / 1024:.2f} KB")
        print(f"   Tables:   {len(tables)}")
        print("-" * 60)
        
        for table in tables:
            table_name = table[0]
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"   {table_name}: {count} rows")
        
        print("=" * 60)
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

def delete_user_by_email(email):
    """Delete a user by email (with confirmation)"""
    
    db_path = "apnamate.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Database file '{db_path}' not found!")
        return
    
    # Confirm deletion
    confirm = input(f"⚠️  Are you sure you want to delete user '{email}'? (yes/no): ")
    
    if confirm.lower() != 'yes':
        print("❌ Deletion cancelled.")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM users WHERE email = ?", (email,))
        rows_affected = cursor.rowcount
        conn.commit()
        
        if rows_affected > 0:
            print(f"✅ User '{email}' deleted successfully!")
        else:
            print(f"❌ User '{email}' not found!")
            
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        conn.rollback()
    finally:
        if 'conn' in locals():
            conn.close()

# ============================================
# MAIN EXECUTION
# ============================================
if __name__ == "__main__":
    import sys
    
    # Check for command line arguments
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "list":
            list_all_users()
        elif command == "info":
            get_database_info()
        elif command == "find":
            if len(sys.argv) >= 3:
                get_user_by_email(sys.argv[2])
            else:
                print("❌ Usage: python check_admin.py find <email>")
        elif command == "delete":
            if len(sys.argv) >= 3:
                delete_user_by_email(sys.argv[2])
            else:
                print("❌ Usage: python check_admin.py delete <email>")
        elif command == "help":
            print("\n📌 Available Commands:")
            print("  python check_admin.py           # Check admin user")
            print("  python check_admin.py list      # List all users")
            print("  python check_admin.py info      # Show database info")
            print("  python check_admin.py find <email>  # Find user by email")
            print("  python check_admin.py delete <email> # Delete user")
            print("  python check_admin.py help      # Show this help")
        else:
            print(f"❌ Unknown command: {command}")
            print("   Run 'python check_admin.py help' for available commands")
    else:
        # Default: check admin user
        check_admin_user()