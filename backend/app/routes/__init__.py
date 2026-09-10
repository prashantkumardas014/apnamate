# backend/app/routes/__init__.py
from . import bookings
from . import reviews
# Payments will be imported directly in main.py
# Don't import payments here to avoid circular import