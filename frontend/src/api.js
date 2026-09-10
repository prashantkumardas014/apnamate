// src/services/api.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// =========================================================
// API HELPER FUNCTIONS
// =========================================================

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || error.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

const getHeaders = (customHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  return headers;
};

// =========================================================
// AUTH API
// =========================================================

export const authAPI = {
  // Register a new user
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  // Login user
  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(credentials),
    });
    return handleResponse(response);
  },

  // Get current user
  getCurrentUser: async (token) => {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'GET',
      headers: getHeaders({
        'Authorization': `Bearer ${token}`,
      }),
    });
    return handleResponse(response);
  },

  // Change password
  changePassword: async (data, token) => {
    const response = await fetch(`${API_BASE_URL}/change-password`, {
      method: 'POST',
      headers: getHeaders({
        'Authorization': `Bearer ${token}`,
      }),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Forgot password
  forgotPassword: async (email) => {
    const response = await fetch(`${API_BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email }),
    });
    return handleResponse(response);
  },

  // Reset password
  resetPassword: async (data) => {
    const response = await fetch(`${API_BASE_URL}/reset-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
};

// =========================================================
// USER API
// =========================================================

export const userAPI = {
  // Get user by ID
  getUserById: async (userId, token) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'GET',
      headers: getHeaders({
        'Authorization': `Bearer ${token}`,
      }),
    });
    return handleResponse(response);
  },

  // Update user
  updateUser: async (userId, data, token) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: getHeaders({
        'Authorization': `Bearer ${token}`,
      }),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Delete user (soft delete - admin only)
  deleteUser: async (userId, token) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders({
        'Authorization': `Bearer ${token}`,
      }),
    });
    return handleResponse(response);
  },

  // Get all users (admin only)
  getAllUsers: async (token) => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'GET',
      headers: getHeaders({
        'Authorization': `Bearer ${token}`,
      }),
    });
    return handleResponse(response);
  },
};

// =========================================================
// PROVIDER API
// =========================================================

export const providerAPI = {
  // Get all providers
  getAllProviders: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.service) params.append('service', filters.service);
    if (filters.location) params.append('location', filters.location);
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    if (filters.min_rating) params.append('min_rating', filters.min_rating);

    const url = `${API_BASE_URL}/providers${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Get provider details by ID
  getProviderDetails: async (providerId) => {
    const response = await fetch(`${API_BASE_URL}/providers/${providerId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Get providers for booking page
  getProvidersForBooking: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.service) params.append('service', filters.service);
    if (filters.location) params.append('location', filters.location);
    if (filters.search) params.append('search', filters.search);

    const url = `${API_BASE_URL}/bookings/providers${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

// =========================================================
// BOOKING API
// =========================================================

export const bookingAPI = {
  // Create booking
  createBooking: async (bookingData) => {
    const response = await fetch(`${API_BASE_URL}/bookings/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(bookingData),
    });
    return handleResponse(response);
  },

  // Get user bookings
  getUserBookings: async (customerId) => {
    const response = await fetch(`${API_BASE_URL}/bookings/my-bookings/${customerId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Get provider bookings
  getProviderBookings: async (providerId) => {
    const response = await fetch(`${API_BASE_URL}/bookings/provider/${providerId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Get upcoming bookings
  getUpcomingBookings: async (customerId) => {
    const response = await fetch(`${API_BASE_URL}/bookings/upcoming/${customerId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Get booking history
  getBookingHistory: async (customerId) => {
    const response = await fetch(`${API_BASE_URL}/bookings/history/${customerId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Update booking
  updateBooking: async (bookingId, data) => {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Cancel booking
  cancelBooking: async (bookingId) => {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Confirm booking
  confirmBooking: async (bookingId) => {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/confirm`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Reject booking
  rejectBooking: async (bookingId) => {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/reject`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Get available dates
  getAvailableDates: async (providerId, daysAhead = 60) => {
    const response = await fetch(`${API_BASE_URL}/bookings/available-dates/${providerId}?days_ahead=${daysAhead}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Get available time slots
  getAvailableTimeSlots: async (providerId, date) => {
    const response = await fetch(`${API_BASE_URL}/bookings/time-slots/${providerId}/${date}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Check date availability
  checkAvailability: async (providerId, date) => {
    const response = await fetch(`${API_BASE_URL}/bookings/check-availability/${providerId}/${date}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Get provider stats
  getProviderStats: async (providerId) => {
    const response = await fetch(`${API_BASE_URL}/bookings/stats/provider/${providerId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

// =========================================================
// NOTIFICATION API
// =========================================================

export const notificationAPI = {
  // Get user notifications
  getUserNotifications: async (userId, limit = 50, offset = 0) => {
    const response = await fetch(`${API_BASE_URL}/bookings/notifications/${userId}?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    const response = await fetch(`${API_BASE_URL}/bookings/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Mark all notifications as read
  markAllAsRead: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/bookings/notifications/read-all/${userId}`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    const response = await fetch(`${API_BASE_URL}/bookings/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Clear all notifications
  clearAllNotifications: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/bookings/notifications/clear-all/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

// =========================================================
// ADMIN API
// =========================================================

export const adminAPI = {
  // Get all bookings (admin only)
  getAllBookings: async (token, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status_filter', filters.status);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const url = `${API_BASE_URL}/bookings/admin/bookings${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders({
        'Authorization': `Bearer ${token}`,
      }),
    });
    return handleResponse(response);
  },

  // Get all users (admin only)
  getAllUsers: async (token, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.role) params.append('role', filters.role);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const url = `${API_BASE_URL}/bookings/admin/users${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders({
        'Authorization': `Bearer ${token}`,
      }),
    });
    return handleResponse(response);
  },

  // Get booking details (admin only)
  getBookingDetails: async (bookingId, token) => {
    const response = await fetch(`${API_BASE_URL}/bookings/admin/bookings/${bookingId}`, {
      method: 'GET',
      headers: getHeaders({
        'Authorization': `Bearer ${token}`,
      }),
    });
    return handleResponse(response);
  },

  // Update booking (admin only)
  updateBookingAdmin: async (bookingId, data, token) => {
    const response = await fetch(`${API_BASE_URL}/bookings/admin/bookings/${bookingId}`, {
      method: 'PUT',
      headers: getHeaders({
        'Authorization': `Bearer ${token}`,
      }),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Delete booking (admin only)
  deleteBookingAdmin: async (bookingId, token) => {
    const response = await fetch(`${API_BASE_URL}/bookings/admin/bookings/${bookingId}`, {
      method: 'DELETE',
      headers: getHeaders({
        'Authorization': `Bearer ${token}`,
      }),
    });
    return handleResponse(response);
  },

  // Block user (admin only)
  blockUser: async (userId, token) => {
    const response = await fetch(`${API_BASE_URL}/bookings/admin/users/${userId}/block`, {
      method: 'PUT',
      headers: getHeaders({
        'Authorization': `Bearer ${token}`,
      }),
    });
    return handleResponse(response);
  },

  // Unblock user (admin only)
  unblockUser: async (userId, token) => {
    const response = await fetch(`${API_BASE_URL}/bookings/admin/users/${userId}/unblock`, {
      method: 'PUT',
      headers: getHeaders({
        'Authorization': `Bearer ${token}`,
      }),
    });
    return handleResponse(response);
  },

  // Delete user (admin only)
  deleteUserAdmin: async (userId, token) => {
    const response = await fetch(`${API_BASE_URL}/bookings/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders({
        'Authorization': `Bearer ${token}`,
      }),
    });
    return handleResponse(response);
  },

  // Accept booking (admin only)
  acceptBooking: async (bookingId, token) => {
    const response = await fetch(`${API_BASE_URL}/bookings/admin/bookings/${bookingId}/accept`, {
      method: 'PUT',
      headers: getHeaders({
        'Authorization': `Bearer ${token}`,
      }),
    });
    return handleResponse(response);
  },

  // Reject booking (admin only)
  rejectBooking: async (bookingId, token) => {
    const response = await fetch(`${API_BASE_URL}/bookings/admin/bookings/${bookingId}/reject`, {
      method: 'PUT',
      headers: getHeaders({
        'Authorization': `Bearer ${token}`,
      }),
    });
    return handleResponse(response);
  },

  // Cancel booking (admin only)
  cancelBookingAdmin: async (bookingId, token) => {
    const response = await fetch(`${API_BASE_URL}/bookings/admin/bookings/${bookingId}/cancel`, {
      method: 'PUT',
      headers: getHeaders({
        'Authorization': `Bearer ${token}`,
      }),
    });
    return handleResponse(response);
  },

  // Update user (admin only)
  updateUserAdmin: async (userId, data, token) => {
    const response = await fetch(`${API_BASE_URL}/bookings/admin/users/${userId}`, {
      method: 'PUT',
      headers: getHeaders({
        'Authorization': `Bearer ${token}`,
      }),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
};

// =========================================================
// REVIEW API
// =========================================================

export const reviewAPI = {
  // Create review
  createReview: async (reviewData) => {
    const response = await fetch(`${API_BASE_URL}/bookings/reviews`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(reviewData),
    });
    return handleResponse(response);
  },

  // Get reviews for provider
  getProviderReviews: async (providerId) => {
    const response = await fetch(`${API_BASE_URL}/providers/${providerId}/reviews`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

// =========================================================
// EXPORT ALL API SERVICES
// =========================================================

const api = {
  auth: authAPI,
  user: userAPI,
  provider: providerAPI,
  booking: bookingAPI,
  notification: notificationAPI,
  admin: adminAPI,
  review: reviewAPI,
};

export default api;