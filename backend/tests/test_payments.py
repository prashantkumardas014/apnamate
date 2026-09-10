import os
os.environ["DATABASE_URL"] = "sqlite:///../test.db"

import requests
import unittest
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.database import engine, Base
from app.models import User, Booking
from datetime import date, timedelta

class TestPayments(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.client = requests.Session()

        # Create a test customer
        response = self.client.post("http://127.0.0.1:8000/register", json={
            "name": "Test Customer",
            "email": "customer@example.com",
            "password": "password",
            "role": "customer"
        })
        self.assertEqual(response.status_code, 200)
        self.customer_token = self.client.post("http://127.0.0.1:8000/login", json={
            "email": "customer@example.com",
            "password": "password"
        }).json()["token"]
        self.customer_id = response.json()["user_id"]

        # Create a test provider
        response = self.client.post("http://127.0.0.1:8000/register", json={
            "name": "Test Provider",
            "email": "provider@example.com",
            "password": "password",
            "role": "provider",
            "service": "Plumbing",
            "location": "Test Location"
        })
        self.assertEqual(response.status_code, 200)
        self.provider_id = response.json()["user_id"]

    def tearDown(self):
        # Clean up the database after each test
        Base.metadata.drop_all(bind=engine)

    def test_create_upi_payment(self):
        # Create a booking first
        booking_date = (date.today() + timedelta(days=1)).isoformat()
        create_response = self.client.post("http://127.0.0.1:8000/bookings/", json={
            "customer_id": self.customer_id,
            "provider_id": self.provider_id,
            "provider_name": "Test Provider",
            "service": "Plumbing",
            "date": booking_date,
            "time": "10:00 AM",
            "address": "Test Address",
            "description": "Test Description"
        }, headers={"Authorization": f"Bearer {self.customer_token}"})
        booking_id = create_response.json()["booking_id"]

        # Create a UPI payment
        response = self.client.post("http://127.0.0.1:8000/bookings/payments/create", json={
            "booking_id": booking_id,
            "amount": 100,
            "gateway": "upi"
        }, headers={"Authorization": f"Bearer {self.customer_token}"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("qr_code", response.json())

    def test_create_cash_payment(self):
        # Create a booking first
        booking_date = (date.today() + timedelta(days=1)).isoformat()
        create_response = self.client.post("http://127.0.0.1:8000/bookings/", json={
            "customer_id": self.customer_id,
            "provider_id": self.provider_id,
            "provider_name": "Test Provider",
            "service": "Plumbing",
            "date": booking_date,
            "time": "10:00 AM",
            "address": "Test Address",
            "description": "Test Description"
        }, headers={"Authorization": f"Bearer {self.customer_token}"})
        booking_id = create_response.json()["booking_id"]

        # Create a cash payment
        response = self.client.post("http://127.0.0.1:8000/bookings/payments/create", json={
            "booking_id": booking_id,
            "amount": 100,
            "gateway": "cash"
        }, headers={"Authorization": f"Bearer {self.customer_token}"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.json())

if __name__ == "__main__":
    unittest.main()