from app.database import SessionLocal
from app.models import User
from app.security import hash_password


db = SessionLocal()

admin_email = "admin@apnamate.com"

existing_admin = db.query(User).filter(
    User.email == admin_email
).first()

if existing_admin:
    print("Admin already exists!")
    print("Email:", existing_admin.email)
    print("Role:", existing_admin.role)

else:
    admin = User(
        name="ApnaMate Admin",
        email=admin_email,
        password=hash_password("Admin@123"),
        role="admin"
    )

    db.add(admin)
    db.commit()
    db.refresh(admin)

    print("Admin created successfully!")
    print("Email:", admin.email)
    print("Password: Admin@123")
    print("Role:", admin.role)

db.close()