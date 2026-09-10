import os
os.environ["DATABASE_URL"] = "sqlite:///../test.db"

import requests
import unittest
from app.main import app
from app.database import engine, Base
from app.models import User

class TestAuth(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.client = requests.Session()

    def tearDown(self):
        Base.metadata.drop_all(bind=engine)

    def test_register_and_login(self):
        # Register a new user
        response = self.client.post("http://127.0.0.1:8000/register", json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "password",
            "role": "customer"
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], "User registered successfully")

        # Try to log in with the new user
        response = self.client.post("http://127.0.0.1:8000/login", json={
            "email": "test@example.com",
            "password": "password"
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn("token", response.json())
        token = response.json()["token"]

        # Verify the token is valid by accessing a protected route
        response = self.client.get("http://127.0.0.1:8000/users/me", headers={
            "Authorization": f"Bearer {token}"
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["email"], "test@example.com")

    def test_unsuccessful_login(self):
        # Try to log in with incorrect credentials
        response = self.client.post("http://127.0.0.1:8000/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Invalid email or password")

if __name__ == "__main__":
    unittest.main()