import unittest

from app.main import app


class BackendSecurityTests(unittest.TestCase):
    def setUp(self):
        self.routes = {}
        for route in app.routes:
            if hasattr(route, "original_router"):
                prefix = route.include_context.prefix
                for child in route.original_router.routes:
                    for method in child.methods or set():
                        self.routes[(prefix + child.path, method)] = child
            elif hasattr(route, "methods"):
                for method in route.methods or set():
                    self.routes[(route.path, method)] = route

    def test_health_route_is_registered(self):
        self.assertIn(("/health", "GET"), self.routes)

    def test_admin_routes_require_dependencies(self):
        for path in ("/bookings/admin/users", "/bookings/admin/bookings"):
            route = self.routes[(path, "GET")]
            self.assertTrue(route.dependant.dependencies)

    def test_profile_and_notification_routes_require_authentication(self):
        for path, method in (
            ("/bookings/profile/{user_id}", "GET"),
            ("/bookings/notifications/{user_id}", "GET"),
        ):
            route = self.routes[(path, method)]
            self.assertTrue(route.dependant.dependencies)

    def test_completion_and_review_routes_require_authentication(self):
        for path, method in (
            ("/bookings/{booking_id}/complete", "PATCH"),
            ("/bookings/reviews", "POST"),
        ):
            route = self.routes[(path, method)]
            self.assertTrue(route.dependant.dependencies)


if __name__ == "__main__":
    unittest.main()