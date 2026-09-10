# backend/add_test_data.py
from app.database import SessionLocal
from app.models import User, Booking
from app.security import hash_password

def add_test_data():
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("📝 Adding Test Data to ApnaMate")
        print("=" * 60)
        
        # Check existing users
        users = db.query(User).all()
        print(f"\n✅ Found {len(users)} existing users")
        
        # Check existing bookings
        bookings = db.query(Booking).all()
        print(f"✅ Found {len(bookings)} existing bookings")
        
        # If no bookings, create some
        if len(bookings) == 0:
            print("\n📝 Creating test bookings...")
            
            # Find or create customer
            customer = db.query(User).filter(User.role == "customer").first()
            if not customer:
                print("   Creating test customer...")
                customer = User(
                    name="Test Customer",
                    email="customer@test.com",
                    password=hash_password("password123"),
                    role="customer",
                    is_active=1
                )
                db.add(customer)
                db.commit()
                db.refresh(customer)
                print(f"   ✅ Created customer: {customer.name} (ID: {customer.id})")
            else:
                print(f"   ✅ Found customer: {customer.name} (ID: {customer.id})")
            
            # Find or create provider
            provider = db.query(User).filter(User.role == "provider").first()
            if not provider:
                print("   Creating test provider...")
                provider = User(
                    name="Test Provider",
                    email="provider@test.com",
                    password=hash_password("password123"),
                    role="provider",
                    is_active=1,
                    service="Plumbing Services",
                    location="Mumbai, India",
                    experience="5 years",
                    price="₹500/hour",
                    category="Home Services"
                )
                db.add(provider)
                db.commit()
                db.refresh(provider)
                print(f"   ✅ Created provider: {provider.name} (ID: {provider.id})")
            else:
                print(f"   ✅ Found provider: {provider.name} (ID: {provider.id})")
            
            # Create test bookings
            if customer and provider:
                # Pending booking
                booking1 = Booking(
                    customer_id=customer.id,
                    provider_id=provider.id,
                    provider_name=provider.name,
                    service="Plumbing Repair",
                    date="2026-09-15",
                    time="10:00 AM",
                    address="123 Main Street, Mumbai",
                    description="Kitchen sink repair needed",
                    status="Pending"
                )
                db.add(booking1)
                print("   ✅ Created Pending booking")
                
                # Accepted booking
                booking2 = Booking(
                    customer_id=customer.id,
                    provider_id=provider.id,
                    provider_name=provider.name,
                    service="AC Installation",
                    date="2026-09-12",
                    time="2:00 PM",
                    address="456 Park Avenue, Mumbai",
                    description="New AC installation",
                    status="Accepted"
                )
                db.add(booking2)
                print("   ✅ Created Accepted booking")
                
                # Completed booking
                booking3 = Booking(
                    customer_id=customer.id,
                    provider_id=provider.id,
                    provider_name=provider.name,
                    service="Electrical Work",
                    date="2026-09-05",
                    time="9:00 AM",
                    address="789 Lake Road, Mumbai",
                    description="Wiring and lighting installation",
                    status="Completed"
                )
                db.add(booking3)
                print("   ✅ Created Completed booking")
                
                db.commit()
                print("\n✅ All test bookings created successfully!")
            else:
                print("   ❌ Could not create bookings: missing customer or provider")
        else:
            print("\n✅ Bookings already exist! No new data added.")
        
        # Show final stats
        final_users = db.query(User).all()
        final_bookings = db.query(Booking).all()
        
        print("\n" + "=" * 60)
        print("📊 Final Statistics:")
        print(f"   Total Users: {len(final_users)}")
        print(f"   Total Bookings: {len(final_bookings)}")
        print("=" * 60)
        
        # Show users
        print("\n👥 Users:")
        for u in final_users:
            print(f"   ID: {u.id} | Name: {u.name} | Role: {u.role} | Status: {'✅ Active' if u.is_active else '❌ Blocked'}")
        
        # Show bookings
        if final_bookings:
            print("\n📅 Bookings:")
            for b in final_bookings:
                print(f"   ID: {b.id} | Service: {b.service} | Status: {b.status} | Date: {b.date}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_test_data()