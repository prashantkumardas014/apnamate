// frontend/src/pages/MyPayments.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import './MyPayments.css';

const MyPayments = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // ==============================
  // FETCH PAYMENTS
  // ==============================
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/login');
      return;
    }
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/bookings/payments/my-payments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }

      const data = await response.json();
      if (data.success) {
        setPayments(data.payments || []);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // STATUS BADGE
  // ==============================
  const getStatusBadge = (status) => {
    const styles = {
      pending: { background: '#fef3c7', color: '#92400e' },
      pending_cash: { background: '#fef3c7', color: '#92400e' },
      pending_card: { background: '#fef3c7', color: '#92400e' },
      completed: { background: '#dcfce7', color: '#166534' },
      failed: { background: '#fee2e2', color: '#991b1b' },
      refunded: { background: '#f3f4f6', color: '#4b5563' },
    };
    const style = styles[status] || styles.pending;
    return (
      <span
        style={{
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          ...style,
        }}
      >
        {status ? status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ') : 'Pending'}
      </span>
    );
  };

  // ==============================
  // FORMAT DATE
  // ==============================
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ==============================
  // LOADING
  // ==============================
  if (loading) {
    return (
      <div className="my-payments">
        <div className="loading">Loading your payments...</div>
      </div>
    );
  }

  // ==============================
  // RENDER
  // ==============================
  return (
    <div className="my-payments">
      {/* Header */}
      <div className="payments-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          ← Back to Dashboard
        </button>
        <h1>💳 My Payments</h1>
        <p>View all your payment history</p>
      </div>

      {/* Error Message */}
      {message && <div className="message">{message}</div>}

      {/* Payments List */}
      {payments.length === 0 ? (
        <div className="no-payments">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
          <h2>No payments yet</h2>
          <p>You haven't made any payments yet.</p>
          <button onClick={() => navigate('/services')} className="book-btn">
            Book a Service
          </button>
        </div>
      ) : (
        <div className="payments-list">
          {payments.map((payment) => (
            <div key={payment.id} className="payment-card">
              <div className="payment-header">
                <span className="payment-id">Payment #{payment.id}</span>
                {getStatusBadge(payment.status)}
              </div>

              <div className="payment-details">
                <div className="detail-item">
                  <span className="label">Booking ID</span>
                  <span className="value">#{payment.booking_id}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Amount</span>
                  <span className="value amount">₹{payment.amount}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Gateway</span>
                  <span className="value">{payment.gateway || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Date</span>
                  <span className="value">{formatDate(payment.created_at)}</span>
                </div>
                {payment.completed_at && (
                  <div className="detail-item">
                    <span className="label">Completed</span>
                    <span className="value">{formatDate(payment.completed_at)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPayments;