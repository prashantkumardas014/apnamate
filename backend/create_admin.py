# create_admin.py
import sys
from pathlib import Path

# Add the project root to Python path if running from different directory
sys.path.append(str(Path(__file__).parent))

from app.database import SessionLocal
from app.models import User
from app.security import hash_password


def create_admin():
    """Create admin user if it doesn't exist"""
    db = SessionLocal()
    
    try:
        admin_email = "admin@apnamate.com"
        
        # Check if admin already exists
        existing_admin = db.query(User).filter(
            User.email == admin_email
        ).first()
        
        if existing_admin:
            print("✅ Admin already exists!")
            print(f"   Email: {existing_admin.email}")
            print(f"   Role: {existing_admin.role}")
            print(f"   Status: {'Active' if existing_admin.is_active else 'Blocked'}")
            return True
        
        # Create new admin user
        admin = User(
            name="ApnaMate Admin",
            email=admin_email,
            password=hash_password("Admin@123"),
            role="admin",
            is_active=1,
            rating="New"
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print("✅ Admin created successfully!")
        print("=" * 40)
        print(f"   Email: {admin.email}")
        print(f"   Password: Admin@123")
        print(f"   Role: {admin.role}")
        print(f"   User ID: {admin.id}")
        print("=" * 40)
        print("⚠️  Please change the password after first login!")
        return True
        
    except Exception as e:
        print(f"❌ Error creating admin: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def create_test_provider():
    """Create a test provider account"""
    db = SessionLocal()
    
    try:
        provider_email = "provider@apnamate.com"
        
        # Check if provider already exists
        existing_provider = db.query(User).filter(
            User.email == provider_email
        ).first()
        
        if existing_provider:
            print("ℹ️  Test provider already exists")
            return True
        
        provider = User(
            name="Test Provider",
            email=provider_email,
            password=hash_password("Provider@123"),
            role="provider",
            is_active=1,
            service="Plumbing Services",
            location="Mumbai, India",
            experience="5+ years",
            price="₹500/hour",
            category="Home Services",
            rating="4.5"
        )
        
        db.add(provider)
        db.commit()
        db.refresh(provider)
        
        print("✅ Test provider created successfully!")
        print(f"   Email: {provider.email}")
        print(f"   Password: Provider@123")
        return True
        
    except Exception as e:
        print(f"❌ Error creating provider: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def create_test_user():
    """Create a test regular user account"""
    db = SessionLocal()
    
    try:
        user_email = "user@apnamate.com"
        
        # Check if user already exists
        existing_user = db.query(User).filter(
            User.email == user_email
        ).first()
        
        if existing_user:
            print("ℹ️  Test user already exists")
            return True
        
        user = User(
            name="Test User",
            email=user_email,
            password=hash_password("User@123"),
            role="user",
            is_active=1,
            rating="New"
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print("✅ Test user created successfully!")
        print(f"   Email: {user.email}")
        print(f"   Password: User@123")
        return True
        
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def list_all_users():
    """List all users in the database"""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        if not users:
            print("📋 No users found in database")
            return
        
        print("\n📋 All Users in Database:")
        print("-" * 80)
        print(f"{'ID':<5} {'Name':<20} {'Email':<30} {'Role':<12} {'Status':<8} {'Rating':<8}")
        print("-" * 80)
        for user in users:
            status = "Active" if user.is_active else "Blocked"
            rating = user.rating if hasattr(user, 'rating') and user.rating else "N/A"
            print(f"{user.id:<5} {user.name[:20]:<20} {user.email[:30]:<30} {user.role:<12} {status:<8} {rating:<8}")
        print("-" * 80)
        print(f"Total users: {len(users)}")
    except Exception as e:
        print(f"❌ Error listing users: {e}")
    finally:
        db.close()


def reset_password(email, new_password):
    """Reset password for any user"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.password = hash_password(new_password)
            db.commit()
            print(f"✅ Password reset successfully for {email}")
            print(f"   New Password: {new_password}")
            return True
        else:
            print(f"❌ User with email '{email}' not found")
            return False
    except Exception as e:
        print(f"❌ Error resetting password: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def delete_user(email):
    """Delete a user by email"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            db.delete(user)
            db.commit()
            print(f"✅ User '{email}' deleted successfully")
            return True
        else:
            print(f"❌ User with email '{email}' not found")
            return False
    except Exception as e:
        print(f"❌ Error deleting user: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def create_custom_user(name, email, password, role, **kwargs):
    """Create a custom user with specified details"""
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"❌ User with email '{email}' already exists")
            return False
        
        # Create user with provided details
        user = User(
            name=name,
            email=email,
            password=hash_password(password),
            role=role,
            is_active=1,
            rating="New"
        )
        
        # Add optional fields if provided
        if 'service' in kwargs:
            user.service = kwargs['service']
        if 'location' in kwargs:
            user.location = kwargs['location']
        if 'experience' in kwargs:
            user.experience = kwargs['experience']
        if 'price' in kwargs:
            user.price = kwargs['price']
        if 'category' in kwargs:
            user.category = kwargs['category']
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"✅ User created successfully!")
        print(f"   Name: {user.name}")
        print(f"   Email: {user.email}")
        print(f"   Role: {user.role}")
        print(f"   Password: {password}")
        return True
        
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def show_help():
    """Show available commands"""
    print("=" * 60)
    print("🔧 ApnaMate - Database Management Script")
    print("=" * 60)
    print("\n📌 Available Commands:")
    print("-" * 60)
    print("  python create_admin.py                    # Run complete setup")
    print("  python create_admin.py create-admin       # Create admin only")
    print("  python create_admin.py create-provider    # Create test provider")
    print("  python create_admin.py create-user        # Create test user")
    print("  python create_admin.py list               # List all users")
    print("  python create_admin.py reset <email> <new_password>  # Reset password")
    print("  python create_admin.py delete <email>     # Delete a user")
    print("  python create_admin.py custom <name> <email> <password> <role>  # Create custom user")
    print("  python create_admin.py help               # Show this help")
    print("-" * 60)


# ============================================
# MAIN EXECUTION BLOCK
# ============================================
if __name__ == "__main__":
    # Parse command line arguments
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "create-admin":
            create_admin()
            
        elif command == "create-provider":
            create_test_provider()
            
        elif command == "create-user":
            create_test_user()
            
        elif command == "list":
            list_all_users()
            
        elif command == "reset":
            if len(sys.argv) >= 4:
                email = sys.argv[2]
                new_password = sys.argv[3]
                reset_password(email, new_password)
            else:
                print("❌ Usage: python create_admin.py reset <email> <new_password>")
                
        elif command == "delete":
            if len(sys.argv) >= 3:
                email = sys.argv[2]
                delete_user(email)
            else:
                print("❌ Usage: python create_admin.py delete <email>")
                
        elif command == "custom":
            if len(sys.argv) >= 6:
                name = sys.argv[2]
                email = sys.argv[3]
                password = sys.argv[4]
                role = sys.argv[5]
                create_custom_user(name, email, password, role)
            else:
                print("❌ Usage: python create_admin.py custom <name> <email> <password> <role>")
                
        elif command == "help":
            show_help()
            
        else:
            print(f"❌ Unknown command: {command}")
            show_help()
    
    else:
        # No command provided - run complete setup
        print("=" * 60)
        print("🔧 ApnaMate - Database Setup Script")
        print("=" * 60)
        
        # Create admin
        print("\n📝 Creating admin user...")
        admin_created = create_admin()
        
        # Create test provider
        print("\n📝 Creating test provider...")
        provider_created = create_test_provider()
        
        # Create test user
        print("\n📝 Creating test user...")
        user_created = create_test_user()
        
        # List all users
        list_all_users()
        
        print("\n" + "=" * 60)
        if admin_created and provider_created and user_created:
            print("✅ Setup completed successfully!")
        else:
            print("⚠️  Setup completed with warnings")
        print("=" * 60)
        print("\n💡 Login Credentials:")
        print("   Admin:    admin@apnamate.com / Admin@123")
        print("   Provider: provider@apnamate.com / Provider@123")
        print("   User:     user@apnamate.com / User@123")
        print("\n⚠️  Please change default passwords after first login!")
        print("\n📌 Run 'python create_admin.py help' for more commands")