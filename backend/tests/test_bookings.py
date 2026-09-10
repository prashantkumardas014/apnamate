import os
os.environ["DATABASE_URL"] = "sqlite:///../test.db"

import requests
import unittest
from app.main import app
from app.database import engine, Base
from app.models import User, Booking
from datetime import date, timedelta

class TestBookings(unittest.TestCase):
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

    def test_create_booking(self):
        # Create a new booking
        booking_date = (date.today() + timedelta(days=1)).isoformat()
        response = self.client.post("http://127.0.0.1:8000/bookings/", json={
            "customer_id": self.customer_id,
            "provider_id": self.provider_id,
            "provider_name": "Test Provider",
            "service": "Plumbing",
            "date": booking_date,
            "time": "10:00 AM",
            "address": "Test Address",
            "description": "Test Description"
        }, headers={"Authorization": f"Bearer {self.customer_token}"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], "Booking created successfully! ✅")

    def test_create_booking_with_invalid_date(self):
        # Try to create a booking with a past date
        booking_date = (date.today() - timedelta(days=1)).isoformat()
        response = self.client.post("http://127.0.0.1:8000/bookings/", json={
            "customer_id": self.customer_id,
            "provider_id": self.provider_id,
            "provider_name": "Test Provider",
            "service": "Plumbing",
            "date": booking_date,
            "time": "10:00 AM",
            "address": "Test Address",
            "description": "Test Description"
        }, headers={"Authorization": f"Bearer {self.customer_token}"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("Cannot book past dates", response.json()["detail"])

    def test_get_available_dates(self):
        # Get available dates for the provider
        response = self.client.get(f"http://127.0.0.1:8000/bookings/available-dates/{self.provider_id}")
        self.assertEqual(response.status_code, 200)
        self.assertIn("available_dates", response.json())

    def test_get_available_time_slots(self):
        # Get available time slots for a specific date
        booking_date = (date.today() + timedelta(days=1)).isoformat()
        response = self.client.get(f"http://127.0.0.1:8000/bookings/time-slots/{self.provider_id}/{booking_date}")
        self.assertEqual(response.status_code, 200)
        self.assertIn("available_slots", response.json())

    def test_get_customer_bookings(self):
        # Create a booking first
        booking_date = (date.today() + timedelta(days=1)).isoformat()
        self.client.post("http://127.0.0.1:8000/bookings/", json={
            "customer_id": self.customer_id,
            "provider_id": self.provider_id,
            "provider_name": "Test Provider",
            "service": "Plumbing",
            "date": booking_date,
            "time": "10:00 AM",
            "address": "Test Address",
            "description": "Test Description"
        }, headers={"Authorization": f"Bearer {self.customer_token}"})

        # Get the customer's bookings
        response = self.client.get(f"http://127.0.0.1:8000/bookings/my-bookings/{self.customer_id}", headers={"Authorization": f"Bearer {self.customer_token}"})
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json()["bookings"], list)

    def test_update_booking(self):
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

        # Update the booking
        new_address = "New Test Address"
        response = self.client.put(f"http://127.0.0.1:8000/bookings/{booking_id}", json={"address": new_address}, headers={"Authorization": f"Bearer {self.customer_token}"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], "Booking updated successfully ✅")

    def test_cancel_booking(self):
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

        # Cancel the booking
        response = self.client.delete(f"http://127.0.0.1:8000/bookings/{booking_id}", headers={"Authorization": f"Bearer {self.customer_token}"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], "Booking cancelled successfully ✅")

    def test_provider_actions(self):
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

        # Provider confirms the booking
        provider_token = self.client.post("http://127.0.0.1:8000/login", json={
            "email": "provider@example.com",
            "password": "password"
        }).json()["token"]
        response = self.client.patch(f"http://127.0.0.1:8000/bookings/{booking_id}/confirm", headers={"Authorization": f"Bearer {provider_token}"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "Confirmed")

        # Provider completes the booking
        response = self.client.patch(f"http://127.0.0.1:8000/bookings/{booking_id}/complete", headers={"Authorization": f"Bearer {provider_token}"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "Completed")

        # Create another booking to test rejection
        create_response = self.client.post("http://127.0.0.1:8000/bookings/", json={
            "customer_id": self.customer_id,
            "provider_id": self.provider_id,
            "provider_name": "Test Provider",
            "service": "Plumbing",
            "date": booking_date,
            "time": "11:00 AM",
            "address": "Test Address",
            "description": "Test Description"
        }, headers={"Authorization": f"Bearer {self.customer_token}"})
        booking_id = create_response.json()["booking_id"]

        # Provider rejects the booking
        response = self.client.patch(f"http://127.0.0.1:8000/bookings/{booking_id}/reject", headers={"Authorization": f"Bearer {provider_token}"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "Rejected")

if __name__ == "__main__":
    unittest.main()