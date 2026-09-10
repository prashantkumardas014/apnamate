# backend/app/email_service.py
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os
from dotenv import load_dotenv
import logging

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Email Configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USERNAME)
APP_URL = os.getenv("APP_URL", "http://localhost:5173")
API_URL = os.getenv("API_URL", "http://localhost:8000")

def send_email(to_email: str, subject: str, body: str, html_body: str = None):
    """
    Send an email using SMTP
    """
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        logger.warning("⚠️ Email credentials not configured. Email not sent.")
        return False
    
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = FROM_EMAIL
        message["To"] = to_email

        # Add plain text body
        part1 = MIMEText(body, "plain")
        message.attach(part1)

        # Add HTML body if provided
        if html_body:
            part2 = MIMEText(html_body, "html")
            message.attach(part2)

        # Create secure connection
        context = ssl.create_default_context()
        
        # Connect to SMTP server
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_email, message.as_string())
        
        logger.info(f"✅ Email sent to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to send email: {str(e)}")
        return False

def send_password_reset_email(to_email: str, reset_token: str, user_name: str = ""):
    """
    Send password reset email with link
    """
    reset_link = f"{APP_URL}/reset-password?token={reset_token}"
    
    subject = "🔐 Password Reset Request - ApnaMate"
    
    body = f"""
Hello {user_name},

We received a request to reset your password for your ApnaMate account.

To reset your password, click the link below:
{reset_link}

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email.

Regards,
ApnaMate Team
"""
    
    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ padding: 30px; background: #f8fafc; border-radius: 0 0 8px 8px; }}
        .button {{ display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0; }}
        .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
        .warning {{ color: #dc2626; font-size: 13px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 ApnaMate</h1>
        </div>
        <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello <strong>{user_name}</strong>,</p>
            <p>We received a request to reset your password for your ApnaMate account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
                <a href="{reset_link}" class="button">🔑 Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p><code style="background: #e5e7eb; padding: 8px; border-radius: 4px; word-break: break-all;">{reset_link}</code></p>
            <p class="warning">⚠️ This link will expire in 1 hour.</p>
            <p>If you did not request this password reset, please ignore this email.</p>
            <hr>
            <p style="font-size: 14px;">Regards,<br><strong>ApnaMate Team</strong></p>
        </div>
        <div class="footer">
            <p>&copy; 2026 ApnaMate. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""
    
    return send_email(to_email, subject, body, html_body)

def send_welcome_email(to_email: str, user_name: str):
    """
    Send welcome email to new users
    """
    subject = "🎉 Welcome to ApnaMate!"
    
    body = f"""
Hello {user_name},

Welcome to ApnaMate! We're excited to have you on board.

With ApnaMate, you can:
✅ Book trusted service providers
✅ Get quality services at your doorstep
✅ Track your bookings easily
✅ Rate and review providers

Get started today by exploring services in your area.

Regards,
ApnaMate Team
"""
    
    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ padding: 30px; background: #f8fafc; border-radius: 0 0 8px 8px; }}
        .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 ApnaMate</h1>
        </div>
        <div class="content">
            <h2>Welcome to ApnaMate! 🎉</h2>
            <p>Hello <strong>{user_name}</strong>,</p>
            <p>Welcome to ApnaMate! We're excited to have you on board.</p>
            <p>With ApnaMate, you can:</p>
            <ul>
                <li>✅ Book trusted service providers</li>
                <li>✅ Get quality services at your doorstep</li>
                <li>✅ Track your bookings easily</li>
                <li>✅ Rate and review providers</li>
            </ul>
            <p>Get started today by exploring services in your area.</p>
            <hr>
            <p>Regards,<br><strong>ApnaMate Team</strong></p>
        </div>
        <div class="footer">
            <p>&copy; 2026 ApnaMate. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""
    
    return send_email(to_email, subject, body, html_body)

def send_booking_confirmation(to_email: str, user_name: str, booking_data: dict):
    """
    Send booking confirmation email
    """
    subject = f"✅ Booking Confirmed - {booking_data.get('service', 'Service')}"
    
    body = f"""
Hello {user_name},

Your booking has been confirmed!

Booking Details:
- Service: {booking_data.get('service', 'N/A')}
- Provider: {booking_data.get('provider_name', 'N/A')}
- Date: {booking_data.get('date', 'N/A')}
- Time: {booking_data.get('time', 'N/A')}
- Address: {booking_data.get('address', 'N/A')}

Booking ID: #{booking_data.get('booking_id', 'N/A')}

The provider will contact you shortly to confirm the details.

Regards,
ApnaMate Team
"""
    
    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ padding: 30px; background: #f8fafc; border-radius: 0 0 8px 8px; }}
        .details {{ background: white; padding: 15px; border-radius: 6px; margin: 10px 0; }}
        .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 ApnaMate</h1>
        </div>
        <div class="content">
            <h2>✅ Booking Confirmed!</h2>
            <p>Hello <strong>{user_name}</strong>,</p>
            <p>Your booking has been confirmed!</p>
            <div class="details">
                <h3>Booking Details:</h3>
                <p><strong>Service:</strong> {booking_data.get('service', 'N/A')}</p>
                <p><strong>Provider:</strong> {booking_data.get('provider_name', 'N/A')}</p>
                <p><strong>Date:</strong> {booking_data.get('date', 'N/A')}</p>
                <p><strong>Time:</strong> {booking_data.get('time', 'N/A')}</p>
                <p><strong>Address:</strong> {booking_data.get('address', 'N/A')}</p>
                <p><strong>Booking ID:</strong> #{booking_data.get('booking_id', 'N/A')}</p>
            </div>
            <p>The provider will contact you shortly to confirm the details.</p>
            <hr>
            <p>Regards,<br><strong>ApnaMate Team</strong></p>
        </div>
        <div class="footer">
            <p>&copy; 2026 ApnaMate. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""
    
    return send_email(to_email, subject, body, html_body)