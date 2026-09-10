// frontend/src/components/Payment/PaymentModal.jsx
import { useState } from 'react';
import { API_BASE_URL } from '../../config';
import './PaymentModal.css';

const PaymentModal = ({ booking, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedGateway, setSelectedGateway] = useState('upi');
  const [qrCode, setQrCode] = useState(null);
  const [upiDetails, setUpiDetails] = useState(null);
  const [copied, setCopied] = useState('');

  // ✅ NEW: proof-of-payment state
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // ==============================
  // FALLBACK UPI DETAILS
  // ==============================
  const FALLBACK_UPI_ID = 'pd5935306@oksbi';
  const FALLBACK_UPI_PHONE = '7069112526';

  // ==============================
  // ✅ GET AMOUNT — quote-first
  // ==============================
  const getAmount = () => {
    if (booking?.quoted_amount !== undefined && booking?.quoted_amount !== null) {
      const q = Number(booking.quoted_amount);
      if (!isNaN(q) && q > 0) return q;
    }
    if (booking?.price) {
      const num = parseInt(String(booking.price).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num) && num > 0) return num;
    }
    return 500;
  };

  // ==============================
  // IS PAYMENT ALLOWED?
  // ==============================
  const hasQuote = () => {
    if (booking?.quoted_amount === undefined || booking?.quoted_amount === null) {
      return false;
    }
    return Number(booking.quoted_amount) > 0;
  };

  // ==============================
  // OPEN UPI APP
  // ==============================
  const openUpiApp = () => {
    const amount = getAmount();
    const upiId = upiDetails?.upi_id || FALLBACK_UPI_ID;
    const name = 'ApnaMate';
    const transactionNote = `Booking-${booking.id}`;

    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;

    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isMobile = /android|iPad|iPhone|iPod/i.test(userAgent);

    if (isMobile) {
      window.location.href = upiUrl;
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          alert('⚠️ Could not open UPI app. Please scan the QR code or use the UPI ID below.');
        }
      }, 2000);
    } else {
      alert('📱 UPI apps work on mobile devices. Please scan the QR code below with your phone.');
    }
  };

  // ==============================
  // COPY
  // ==============================
  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(''), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy. Please manually copy the text.');
    });
  };

  // ==============================
  // INITIALIZE PAYMENT
  // ==============================
  const initializePayment = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Please login again');

      if (!hasQuote()) {
        throw new Error('No quote found for this booking. Please contact your provider.');
      }

      const amount = getAmount();

      const response = await fetch(`${API_BASE_URL}/bookings/payments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          booking_id: booking.id,
          gateway: selectedGateway,
          amount: amount,
          currency: 'INR',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to initialize payment');
      }

      if (selectedGateway === 'upi') {
        setQrCode(data.qr_code);
        setUpiDetails({
          upi_id: data.upi_id || FALLBACK_UPI_ID,
          upi_phone: data.upi_phone || FALLBACK_UPI_PHONE,
          upi_url: data.upi_url,
          reference: data.gateway_order_id,
        });
        setLoading(false);
        return;
      }

      if (selectedGateway === 'cash') {
        if (onSuccess) onSuccess(data);
        onClose();
        return;
      }

      if (selectedGateway === 'razorpay') {
        if (typeof window.Razorpay === 'undefined') {
          setError('Razorpay SDK not loaded. Please refresh the page.');
          setLoading(false);
          return;
        }
        if (data.key_id) {
          openRazorpayCheckout(data);
        }
      }
    } catch (err) {
      console.error("❌ Payment error:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  // ==============================
  // ✅ SUBMIT UPI PAYMENT FOR VERIFICATION
  // ==============================
  const submitUpiPayment = async () => {
    try {
      setLoading(true);
      setError('');

      if (!utrNumber.trim()) {
        throw new Error('Please enter the UTR / Transaction ID from your UPI app');
      }

      const token = localStorage.getItem('accessToken');

      // 1. Tell backend the customer claims to have paid
      const response = await fetch(`${API_BASE_URL}/bookings/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gateway: 'upi',
          payment_id: booking.id,
          transaction_id: utrNumber.trim(),
          action: 'submit',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to submit payment');
      }

      // 2. Upload screenshot if provided
      if (screenshotFile && data.payment_id) {
        const fd = new FormData();
        fd.append('file', screenshotFile);
        try {
          await fetch(`${API_BASE_URL}/bookings/payments/${data.payment_id}/screenshot`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          });
        } catch (uploadErr) {
          console.warn('Screenshot upload failed:', uploadErr);
          // Not fatal — continue
        }
      }

      // 3. Open WhatsApp with prefilled message
      const phone = upiDetails?.upi_phone || FALLBACK_UPI_PHONE;
      const amount = getAmount();
      const waText = encodeURIComponent(
        `Hi, I paid ₹${amount} for booking #${booking.id}. UTR: ${utrNumber.trim()}. Screenshot attached.`
      );

      if (/android|iPhone|iPad/i.test(navigator.userAgent)) {
        window.open(`https://wa.me/91${phone}?text=${waText}`, '_blank');
      } else {
        navigator.clipboard?.writeText(phone).catch(() => {});
      }

      setSubmitted(true);

      alert(
        `✅ Payment submitted!\n\n` +
        `Amount: ₹${amount}\n` +
        `Booking: #${booking.id}\n` +
        `UTR: ${utrNumber}\n\n` +
        `📸 Please send your screenshot on WhatsApp:\n${phone}\n\n` +
        `Admin will verify and confirm your booking shortly.`
      );

      if (onSuccess) onSuccess(data);
      onClose();
    } catch (err) {
      console.error("❌ Submit error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // RAZORPAY CHECKOUT
  // ==============================
  const openRazorpayCheckout = (data) => {
    try {
      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: 'ApnaMate',
        description: `Booking #${booking.id} - ${booking.service}`,
        order_id: data.gateway_order_id,
        handler: function (response) {
          verifyPayment('razorpay', response);
        },
        prefill: {
          name: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).name : '',
          email: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).email : '',
        },
        theme: { color: '#2563eb' },
        modal: { ondismiss: () => setLoading(false) },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setError('Failed to open payment gateway: ' + err.message);
      setLoading(false);
    }
  };

  // ==============================
  // VERIFY RAZORPAY (auto-confirm)
  // ==============================
  const verifyPayment = async (gateway, response) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const verifyResponse = await fetch(`${API_BASE_URL}/bookings/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gateway: gateway,
          payment_id: response.razorpay_payment_id,
          transaction_id: response.razorpay_order_id,
        }),
      });

      const data = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(data.detail || 'Payment verification failed');
      }

      if (onSuccess) onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // ==============================
  // RENDER UPI
  // ==============================
  const renderUpiSection = () => {
    // Initial state — show "Generate QR" button
    if (!qrCode && !upiDetails) {
      return (
        <button className="pay-now-btn" onClick={initializePayment} disabled={loading}>
          {loading ? 'Generating...' : `📱 Pay ₹${getAmount()} via UPI`}
        </button>
      );
    }

    return (
      <div className="upi-payment-section">
        <div className="upi-header">
          <h3>📱 Pay with UPI</h3>
          <p>Step 1: Pay the amount below. Step 2: Submit UTR + screenshot.</p>
        </div>

        {/* Open UPI app button */}
        <button
          className="open-upi-app-btn"
          onClick={openUpiApp}
          disabled={loading}
        >
          <span className="upi-app-icon">📲</span>
          <span className="upi-app-text">
            <strong>Open UPI App & Pay ₹{getAmount()}</strong>
            <small>GPay / PhonePe / Paytm / BHIM</small>
          </span>
        </button>

        <div className="upi-divider">
          <span>OR scan QR code</span>
        </div>

        {qrCode && (
          <div className="qr-section">
            <img
              src={`data:image/png;base64,${qrCode}`}
              alt="UPI QR Code"
              className="qr-code"
            />
            <p className="qr-hint">📸 Scan with any UPI app</p>
          </div>
        )}

        <div className="upi-details">
          <div className="upi-detail-item">
            <label>UPI ID</label>
            <div className="upi-value-row">
              <span className="upi-value">{upiDetails?.upi_id || FALLBACK_UPI_ID}</span>
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(upiDetails?.upi_id || FALLBACK_UPI_ID, 'upi')}
                disabled={loading}
              >
                {copied === 'upi' ? '✅' : '📋'} Copy
              </button>
            </div>
          </div>

          <div className="upi-detail-item">
            <label>WhatsApp (for screenshot)</label>
            <div className="upi-value-row">
              <span className="upi-value">{upiDetails?.upi_phone || FALLBACK_UPI_PHONE}</span>
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(upiDetails?.upi_phone || FALLBACK_UPI_PHONE, 'phone')}
                disabled={loading}
              >
                {copied === 'phone' ? '✅' : '📋'} Copy
              </button>
            </div>
          </div>

          <div className="upi-detail-item">
            <label>Amount to Pay</label>
            <div className="upi-value-row">
              <span className="upi-value amount" style={{ fontSize: 22, fontWeight: 'bold', color: '#16a34a' }}>
                ₹{getAmount()}
              </span>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* NEW: Step 2 — Submit proof of payment       */}
        {/* ============================================ */}
        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 10,
          }}
        >
          <h4 style={{ margin: '0 0 12px', color: '#075985' }}>
            ✅ Step 2: Submit Payment Proof
          </h4>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6, color: '#0c4a6e' }}>
              UTR / Transaction ID <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              placeholder="e.g. 412345678901"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
              Find this 12-digit number in your UPI app's payment history.
            </p>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6, color: '#0c4a6e' }}>
              Payment Screenshot (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              disabled={loading}
              onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
              style={{ fontSize: 13 }}
            />
            {screenshotFile && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#16a34a' }}>
                ✅ {screenshotFile.name}
              </p>
            )}
          </div>
        </div>

        <p className="upi-note">
          ⚠️ After submitting, share the screenshot on WhatsApp:{' '}
          <strong>{upiDetails?.upi_phone || FALLBACK_UPI_PHONE}</strong>
        </p>

        <button
          className="confirm-payment-btn"
          onClick={submitUpiPayment}
          disabled={loading || !utrNumber.trim() || submitted}
          style={{
            opacity: (!utrNumber.trim() || submitted) ? 0.5 : 1,
            cursor: (!utrNumber.trim() || submitted) ? 'not-allowed' : 'pointer',
          }}
        >
          {loading
            ? 'Submitting...'
            : submitted
              ? '✅ Submitted'
              : '✅ I Have Paid — Submit for Verification'}
        </button>

        <button
          className="back-btn"
          onClick={() => {
            setQrCode(null);
            setUpiDetails(null);
            setError('');
            setUtrNumber('');
            setScreenshotFile(null);
          }}
          disabled={loading}
          style={{
            marginTop: 10,
            background: 'none',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          ← Back to payment methods
        </button>
      </div>
    );
  };

  // ==============================
  // RENDER COD
  // ==============================
  const renderCodSection = () => (
    <div className="cod-section">
      <div className="cod-info">
        <h3>💰 Cash on Delivery</h3>
        <p>Pay <strong>₹{getAmount()}</strong> in cash when the service is completed.</p>
        <p className="cod-note">
          The provider will collect payment directly from you.
        </p>
      </div>

      <button className="pay-now-btn" onClick={initializePayment} disabled={loading}>
        {loading ? 'Confirming...' : '✅ Confirm Booking (Pay Later)'}
      </button>
    </div>
  );

  // ==============================
  // RENDER RAZORPAY
  // ==============================
  const renderRazorpaySection = () => (
    <button className="pay-now-btn" onClick={initializePayment} disabled={loading}>
      {loading ? 'Processing...' : `💳 Pay ₹${getAmount()} with Razorpay`}
    </button>
  );

  // ==============================
  // NO-QUOTE GUARD
  // ==============================
  if (!hasQuote()) {
    return (
      <div className="payment-modal-overlay" onClick={onClose}>
        <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
          <div className="payment-modal-header">
            <h2>💳 Complete Payment</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="payment-modal-body">
            <div
              style={{
                padding: '20px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                borderRadius: '8px',
                border: '2px solid #f59e0b',
                fontWeight: 'bold',
                textAlign: 'center',
              }}
            >
              ⚠️ No quote found for this booking.
              <p style={{ marginTop: '10px', fontWeight: 'normal', color: '#78350f' }}>
                Please wait for your provider to send a quote and accept it before paying.
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                marginTop: '20px',
                width: '100%',
                padding: '12px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==============================
  // MAIN RENDER
  // ==============================
  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-header">
          <h2>💳 Complete Payment</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="payment-modal-body">
          {/* Booking Summary */}
          <div className="booking-summary">
            <h3>Booking Summary</h3>
            <p><strong>Service:</strong> {booking.service}</p>
            <p><strong>Provider:</strong> {booking.provider_name}</p>
            <p><strong>Date:</strong> {booking.date}</p>
            <p>
              <strong>Quoted Amount:</strong>{' '}
              <span style={{ color: '#16a34a', fontWeight: 'bold' }}>
                ₹{getAmount()}
              </span>
            </p>
            {booking.quote_note && (
              <p style={{ fontStyle: 'italic', color: '#666', fontSize: '13px' }}>
                "{booking.quote_note}"
              </p>
            )}
          </div>

          {/* Gateway Selection */}
          <div className="payment-gateway-select">
            <label>Select Payment Method</label>
            <div className="gateway-options">
              <button
                className={`gateway-btn ${selectedGateway === 'upi' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedGateway('upi');
                  setQrCode(null);
                  setUpiDetails(null);
                  setError('');
                  setUtrNumber('');
                  setScreenshotFile(null);
                }}
                disabled={loading}
              >
                <span>📱</span> UPI
              </button>

              <button
                className={`gateway-btn ${selectedGateway === 'cash' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedGateway('cash');
                  setQrCode(null);
                  setUpiDetails(null);
                  setError('');
                }}
                disabled={loading}
              >
                <span>💰</span> Cash
              </button>

              <button
                className={`gateway-btn ${selectedGateway === 'razorpay' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedGateway('razorpay');
                  setQrCode(null);
                  setUpiDetails(null);
                  setError('');
                }}
                disabled={loading}
              >
                <span>💳</span> Card
              </button>
            </div>
          </div>

          {/* Error */}
          {error && <div className="payment-error">❌ {error}</div>}

          {/* Loading */}
          {loading && !qrCode && (
            <div className="payment-loading">
              <div className="spinner"></div>
              <p>Processing payment...</p>
            </div>
          )}

          {/* Payment Section */}
          {!loading && (
            <>
              {selectedGateway === 'upi' && renderUpiSection()}
              {selectedGateway === 'cash' && renderCodSection()}
              {selectedGateway === 'razorpay' && renderRazorpaySection()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;