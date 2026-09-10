# booking_utils.py
from datetime import datetime, date, timedelta
from typing import List

def get_available_dates(start_date=None, days=30):
    """Get available dates for booking (future dates only)"""
    today = date.today()
    
    if start_date and start_date < today:
        start_date = today
    
    if not start_date:
        start_date = today
    
    available_dates = []
    for i in range(days):
        current_date = start_date + timedelta(days=i)
        # Skip weekends if needed
        # if current_date.weekday() < 5:  # Monday to Friday
        available_dates.append(current_date)
    
    return available_dates

def is_date_available(booking_date):
    """Check if a date is available for booking"""
    today = date.today()
    
    if isinstance(booking_date, str):
        booking_date = datetime.strptime(booking_date, '%Y-%m-%d').date()
    
    # Not in past
    if booking_date < today:
        return False, "❌ Cannot book past dates"
    
    # Not too far in future (max 60 days)
    max_date = today + timedelta(days=60)
    if booking_date > max_date:
        return False, "❌ Cannot book more than 60 days in advance"
    
    return True, "✅ Date available"

def validate_and_format_date(date_str):
    """Validate and format date string"""
    try:
        # Parse date
        booking_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        today = date.today()
        
        # Check if past
        if booking_date < today:
            return None, "❌ Past dates are not allowed"
        
        # Check if too far
        max_date = today + timedelta(days=60)
        if booking_date > max_date:
            return None, f"❌ Cannot book beyond {max_date.strftime('%Y-%m-%d')}"
        
        return booking_date, "✅ Valid date"
        
    except ValueError:
        return None, "❌ Invalid date format. Use YYYY-MM-DD"