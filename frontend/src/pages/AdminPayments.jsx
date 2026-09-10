// src/pages/AdminPayments.jsx
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

export default function AdminPayments() {
  const [tab, setTab] = useState("verify");
  const [pending, setPending] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [owedTotal, setOwedTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("accessToken")}` });

  const load = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        fetch(`${API_BASE_URL}/bookings/payments/admin/pending-verification`, { headers: headers() }).then(r => r.json()),
        fetch(`${API_BASE_URL}/bookings/payments/admin/payouts`, { headers: headers() }).then(r => r.json()),
      ]);
      setPending(a.payments || []);
      setPayouts(b.payouts || []);
      setOwedTotal(b.owed_total || 0);
    } catch {
      setMsg("Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const confirmPayment = async (id) => {
    const res = await fetch(`${API_BASE_URL}/bookings/payments/verify`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ gateway: 'upi', payment_id: id, action: 'admin_confirm' }),
    });
    const data = await res.json();
    setMsg(res.ok ? `✅ ${data.message}` : `❌ ${data.detail}`);
    load();
  };

  const rejectPayment = async (id) => {
    const reason = prompt('Rejection reason?');
    if (reason === null) return;
    const res = await fetch(`${API_BASE_URL}/bookings/payments/verify`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ gateway: 'upi', payment_id: id, action: 'reject', notes: reason }),
    });
    const data = await res.json();
    setMsg(res.ok ? `❌ Rejected` : `❌ ${data.detail}`);
    load();
  };

  const markPaid = async (payoutId) => {
    const ref = prompt('Enter the UPI transaction ID you used to pay the provider:');
    if (!ref) return;
    const res = await fetch(
      `${API_BASE_URL}/bookings/payments/admin/payouts/${payoutId}/mark-paid?payout_ref=${encodeURIComponent(ref)}`,
      { method: 'POST', headers: headers() }
    );
    const data = await res.json();
    setMsg(res.ok ? `✅ Marked paid` : `❌ ${data.detail}`);
    load();
  };

  return (
    <div style={{ padding: 30, background: '#f5f7fb', minHeight: '100vh' }}>
      <h1>💳 Payment Management</h1>

      {msg && (
        <div style={{ padding: 12, background: '#dbeafe', color: '#1e40af', borderRadius: 8, marginBottom: 20, fontWeight: 'bold' }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setTab('verify')}
          style={{
            padding: '12px 20px',
            background: tab === 'verify' ? '#2563eb' : 'white',
            color: tab === 'verify' ? 'white' : '#333',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          🔔 Awaiting Verification ({pending.length})
        </button>
        <button
          onClick={() => setTab('payouts')}
          style={{
            padding: '12px 20px',
            background: tab === 'payouts' ? '#2563eb' : 'white',
            color: tab === 'payouts' ? 'white' : '#333',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          💰 Provider Payouts (₹{owedTotal} owed)
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {tab === 'verify' && (
        <>
          {pending.length === 0 && !loading && <p style={{ color: '#888' }}>No payments waiting.</p>}
          {pending.map(p => (
            <div key={p.payment_id} style={{ background: 'white', padding: 20, borderRadius: 10, marginBottom: 15, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 15 }}>
                <div>
                  <h3 style={{ margin: '0 0 8px' }}>Booking #{p.booking_id} — {p.booking?.service}</h3>
                  <p style={{ margin: '4px 0' }}><strong>Customer:</strong> {p.customer?.name}</p>
                  <p style={{ margin: '4px 0' }}><strong>Amount:</strong> <span style={{ color: '#16a34a', fontSize: 20, fontWeight: 'bold' }}>₹{p.amount}</span></p>
                  <p style={{ margin: '4px 0' }}><strong>UTR:</strong> <code>{p.utr || 'not provided'}</code></p>
                  <p style={{ margin: '4px 0', color: '#888', fontSize: 13 }}>Submitted: {new Date(p.submitted_at).toLocaleString()}</p>
                  {p.screenshot_url && (
                    <a href={`${API_BASE_URL}${p.screenshot_url}`} target="_blank" rel="noreferrer">📸 View screenshot</a>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <button onClick={() => confirmPayment(p.payment_id)} style={{ padding: '12px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>
                    ✅ I Received ₹{p.amount}
                  </button>
                  <button onClick={() => rejectPayment(p.payment_id)} style={{ padding: '12px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>
                    ❌ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'payouts' && (
        <>
          {payouts.length === 0 && !loading && <p style={{ color: '#888' }}>No payouts yet.</p>}
          {payouts.map(p => (
            <div key={p.payout_id} style={{ background: 'white', padding: 20, borderRadius: 10, marginBottom: 15, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 15 }}>
                <div>
                  <h3 style={{ margin: '0 0 8px' }}>Payout #{p.payout_id} — Booking #{p.booking_id}</h3>
                  <p style={{ margin: '4px 0' }}><strong>Provider:</strong> {p.provider_name}</p>
                  <p style={{ margin: '4px 0' }}><strong>Provider UPI:</strong> {p.provider_upi || <em style={{color:'#dc2626'}}>Not set</em>}</p>
                  <p style={{ margin: '4px 0' }}><strong>Customer paid:</strong> ₹{p.amount}</p>
                  <p style={{ margin: '4px 0' }}><strong>Commission:</strong> ₹{p.commission}</p>
                  <p style={{ margin: '4px 0', fontSize: 18 }}><strong>Send to provider:</strong> <span style={{ color: '#16a34a', fontWeight: 'bold' }}>₹{p.net_amount}</span></p>
                  {p.payout_ref && <p style={{ margin: '4px 0', color: '#16a34a' }}>✅ Paid via {p.payout_ref}</p>}
                </div>
                <div>
                  {p.status === 'owed' ? (
                    <button onClick={() => markPaid(p.payout_id)} style={{ padding: '12px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>
                      💸 Mark Paid to Provider
                    </button>
                  ) : (
                    <span style={{ padding: '10px 16px', background: '#dcfce7', color: '#166534', borderRadius: 6, fontWeight: 'bold' }}>
                      ✅ Paid
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}