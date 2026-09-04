import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from dotenv import load_dotenv

load_dotenv()

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@apnamate.com")

def send_email(to_email, subject, html_content):
    """Send email using SendGrid"""
    if not SENDGRID_API_KEY:
        print("⚠️ SendGrid API key not configured. Email not sent.")
        print(f"📧 Would have sent to: {to_email}")
        print(f"📧 Subject: {subject}")
        return False
    
    try:
        message = Mail(
            from_email=FROM_EMAIL,
            to_emails=to_email,
            subject=subject,
            html_content=html_content
        )
        
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        
        print(f"✅ Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"❌ Email error: {e}")
        return False

def send_booking_confirmation_email(user_email, user_name, booking):
    """Send booking confirmation email"""
    subject = f"Booking Confirmed - {booking.service}"
    html_content = f"""
    <h2>Hello {user_name},</h2>
    <p>Your booking has been confirmed!</p>
    <h3>Booking Details:</h3>
    <ul>
        <li><strong>Service:</strong> {booking.service}</li>
        <li><strong>Provider:</strong> {booking.provider_name}</li>
        <li><strong>Date:</strong> {booking.date}</li>
        <li><strong>Time:</strong> {booking.time}</li>
        <li><strong>Address:</strong> {booking.address}</li>
        <li><strong>Status:</strong> {booking.status}</li>
    </ul>
    <p>Thank you for using ApnaMate!</p>
    <p>Visit your dashboard to manage your bookings: <a href="http://localhost:5173/my-bookings">My Bookings</a></p>
    """
    return send_email(user_email, subject, html_content)

def send_booking_status_update_email(user_email, user_name, booking, new_status):
    """Send booking status update email"""
    subject = f"Booking Update - {booking.service}"
    html_content = f"""
    <h2>Hello {user_name},</h2>
    <p>Your booking status has been updated.</p>
    <h3>Booking Details:</h3>
    <ul>
        <li><strong>Service:</strong> {booking.service}</li>
        <li><strong>Provider:</strong> {booking.provider_name}</li>
        <li><strong>Date:</strong> {booking.date}</li>
        <li><strong>New Status:</strong> {new_status}</li>
    </ul>
    <p>Visit your dashboard to view details: <a href="http://localhost:5173/my-bookings">My Bookings</a></p>
    """
    return send_email(user_email, subject, html_content)

def send_account_status_email(user_email, user_name, status):
    """Send account status change email"""
    if status == "blocked":
        subject = "Account Blocked"
        html_content = f"""
        <h2>Hello {user_name},</h2>
        <p>Your ApnaMate account has been <strong>blocked</strong>.</p>
        <p>If you believe this is a mistake, please contact support.</p>
        """
    else:
        subject = "Account Unblocked"
        html_content = f"""
        <h2>Hello {user_name},</h2>
        <p>Your ApnaMate account has been <strong>unblocked</strong>.</p>
        <p>You can now log in and use the platform again.</p>
        """
    return send_email(user_email, subject, html_content)