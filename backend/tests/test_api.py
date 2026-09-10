import requests
import unittest

class TestApi(unittest.TestCase):
    def test_health_check(self):
        response = requests.get("http://127.0.0.1:8000/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "healthy")

if __name__ == "__main__":
    unittest.main()