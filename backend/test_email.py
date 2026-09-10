# backend/test_email.py
from app.email_service import send_password_reset_email

# Test sending email
result = send_password_reset_email(
    to_email="your_email@gmail.com",  # Replace with your email
    reset_token="test-token-123",
    user_name="Test User"
)

if result:
    print("✅ Email sent successfully!")
else:
    print("❌ Failed to send email. Check your configuration.")