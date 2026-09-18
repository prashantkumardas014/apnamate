// src/pages/AdminPayments.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

export default function AdminPayments() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("verify");
  const [pending, setPending] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [owedTotal, setOwedTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("info");

  const headers = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
  });

  const showMsg = (text, type = "info") => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(""), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        fetch(
          `${API_BASE_URL}/bookings/payments/admin/pending-verification`,
          { headers: headers() }
        ).then((r) => r.json()),
        fetch(`${API_BASE_URL}/bookings/payments/admin/payouts`, {
          headers: headers(),
        }).then((r) => r.json()),
      ]);
      setPending(a.payments || []);
      setPayouts(b.payouts || []);
      setOwedTotal(b.owed_total || 0);
    } catch (err) {
      showMsg("Failed to load: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ==============================
  // CONFIRM PAYMENT (admin_confirm)
  // ==============================
  const confirmPayment = async (paymentId, amount) => {
    if (!window.confirm(`Confirm you received ₹${amount}?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/bookings/payments/verify`, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway: "upi",
          payment_id: paymentId, // ← Payment.id (backend resolves correctly)
          action: "admin_confirm",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`✅ ${data.message || "Payment confirmed"}`, "success");
        load();
      } else {
        showMsg(`❌ ${data.detail || "Failed"}`, "error");
      }
    } catch (err) {
      showMsg(`❌ ${err.message}`, "error");
    }
  };

  // ==============================
  // REJECT PAYMENT
  // ==============================
  const rejectPayment = async (paymentId) => {
    const reason = window.prompt("Rejection reason?", "");
    if (reason === null) return;

    try {
      const res = await fetch(`${API_BASE_URL}/bookings/payments/verify`, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway: "upi",
          payment_id: paymentId,
          action: "reject",
          notes: reason || "Payment proof invalid",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg("❌ Payment rejected — customer notified", "success");
        load();
      } else {
        showMsg(`❌ ${data.detail || "Failed"}`, "error");
      }
    } catch (err) {
      showMsg(`❌ ${err.message}`, "error");
    }
  };

  // ==============================
  // MARK PAYOUT PAID
  // ==============================
  const markPaid = async (payoutId) => {
    const ref = window.prompt(
      "Enter the UPI transaction ID you used to pay the provider:"
    );
    if (!ref) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/bookings/payments/admin/payouts/${payoutId}/mark-paid?payout_ref=${encodeURIComponent(
          ref
        )}`,
        { method: "POST", headers: headers() }
      );
      const data = await res.json();
      if (res.ok) {
        showMsg("✅ Marked as paid", "success");
        load();
      } else {
        showMsg(`❌ ${data.detail || "Failed"}`, "error");
      }
    } catch (err) {
      showMsg(`❌ ${err.message}`, "error");
    }
  };

  // ==============================
  // HELPERS
  // ==============================
  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    window.location.replace("#/login"); window.location.reload();
  };

  // ==============================
  // RENDER
  // ==============================
  return (
    <div style={{ padding: 30, background: "#f5f7fb", minHeight: "100vh" }}>
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <h1 style={{ margin: 0 }}>💳 Payment Management</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={load}
            style={{
              padding: "10px 16px",
              background: "#16a34a",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => navigate("/admin")}
            style={{
              padding: "10px 16px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            📊 Admin Dashboard
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: "10px 16px",
              background: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* MESSAGE */}
      {msg && (
        <div
          style={{
            padding: 12,
            background: msgType === "error" ? "#fee2e2" : "#dbeafe",
            color: msgType === "error" ? "#991b1b" : "#1e40af",
            borderRadius: 8,
            marginBottom: 20,
            fontWeight: "bold",
            borderLeft: `4px solid ${msgType === "error" ? "#dc2626" : "#2563eb"}`,
          }}
        >
          {msg}
        </div>
      )}

      {/* TABS */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          onClick={() => setTab("verify")}
          style={{
            padding: "12px 20px",
            background: tab === "verify" ? "#2563eb" : "white",
            color: tab === "verify" ? "white" : "#333",
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          🔔 Awaiting Verification ({pending.length})
        </button>
        <button
          onClick={() => setTab("payouts")}
          style={{
            padding: "12px 20px",
            background: tab === "payouts" ? "#2563eb" : "white",
            color: tab === "payouts" ? "white" : "#333",
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          💰 Provider Payouts (₹{owedTotal} owed)
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {/* ---- VERIFY TAB ---- */}
      {tab === "verify" && !loading && (
        <>
          {pending.length === 0 ? (
            <div
              style={{
                background: "white",
                padding: 40,
                borderRadius: 10,
                textAlign: "center",
                color: "#666",
              }}
            >
              <div style={{ fontSize: 42 }}>✅</div>
              <h3 style={{ margin: "10px 0" }}>No payments waiting</h3>
              <p style={{ margin: 0 }}>All caught up!</p>
            </div>
          ) : (
            pending.map((p) => (
              <div
                key={p.payment_id}
                style={{
                  background: "white",
                  padding: 20,
                  borderRadius: 10,
                  marginBottom: 15,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 15,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <h3 style={{ margin: "0 0 8px" }}>
                      Booking #{p.booking_id} — {p.booking?.service || "Service"}
                    </h3>
                    <p style={{ margin: "4px 0" }}>
                      <strong>Customer:</strong> {p.customer?.name || "Unknown"}
                    </p>
                    <p style={{ margin: "4px 0" }}>
                      <strong>Amount:</strong>{" "}
                      <span
                        style={{ color: "#16a34a", fontSize: 20, fontWeight: "bold" }}
                      >
                        ₹{p.amount}
                      </span>
                    </p>
                    <p style={{ margin: "4px 0" }}>
                      <strong>UTR:</strong> <code>{p.utr || "not provided"}</code>
                    </p>
                    <p style={{ margin: "4px 0", color: "#888", fontSize: 13 }}>
                      Submitted: {formatDate(p.submitted_at)}
                    </p>
                    {p.screenshot_url && (
                      <div style={{ marginTop: 10 }}>
                        <a
                          href={`${API_BASE_URL}${p.screenshot_url}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#2563eb", fontWeight: "bold" }}
                        >
                          📸 Open screenshot in new tab
                        </a>
                        <div style={{ marginTop: 8 }}>
                          <img
                            src={`${API_BASE_URL}${p.screenshot_url}`}
                            alt="Payment proof"
                            style={{
                              maxWidth: 220,
                              maxHeight: 220,
                              borderRadius: 8,
                              border: "1px solid #e2e8f0",
                              objectFit: "contain",
                              background: "#f8fafc",
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() => confirmPayment(p.payment_id, p.amount)}
                      style={{
                        padding: "12px 20px",
                        background: "#16a34a",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      ✅ I Received ₹{p.amount}
                    </button>
                    <button
                      onClick={() => rejectPayment(p.payment_id)}
                      style={{
                        padding: "12px 20px",
                        background: "#dc2626",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* ---- PAYOUTS TAB ---- */}
      {tab === "payouts" && !loading && (
        <>
          {payouts.length === 0 ? (
            <div
              style={{
                background: "white",
                padding: 40,
                borderRadius: 10,
                textAlign: "center",
                color: "#666",
              }}
            >
              <div style={{ fontSize: 42 }}>💰</div>
              <h3 style={{ margin: "10px 0" }}>No payouts yet</h3>
              <p style={{ margin: 0 }}>
                Payouts appear here once payments are approved.
              </p>
            </div>
          ) : (
            payouts.map((p) => (
              <div
                key={p.payout_id}
                style={{
                  background: "white",
                  padding: 20,
                  borderRadius: 10,
                  marginBottom: 15,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 15,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <h3 style={{ margin: "0 0 8px" }}>
                      Payout #{p.payout_id} — Booking #{p.booking_id}
                    </h3>
                    <p style={{ margin: "4px 0" }}>
                      <strong>Provider:</strong> {p.provider_name}
                    </p>
                    <p style={{ margin: "4px 0" }}>
                      <strong>Provider UPI:</strong>{" "}
                      {p.provider_upi || (
                        <em style={{ color: "#dc2626" }}>Not set</em>
                      )}
                    </p>
                    <p style={{ margin: "4px 0" }}>
                      <strong>Customer paid:</strong> ₹{p.amount}
                    </p>
                    <p style={{ margin: "4px 0" }}>
                      <strong>Commission:</strong> ₹{p.commission}
                    </p>
                    <p style={{ margin: "4px 0", fontSize: 18 }}>
                      <strong>Send to provider:</strong>{" "}
                      <span style={{ color: "#16a34a", fontWeight: "bold" }}>
                        ₹{p.net_amount}
                      </span>
                    </p>
                    <p style={{ margin: "4px 0", color: "#888", fontSize: 13 }}>
                      Created: {formatDate(p.created_at)}
                    </p>
                    {p.payout_ref && (
                      <p style={{ margin: "4px 0", color: "#16a34a" }}>
                        ✅ Paid via <code>{p.payout_ref}</code> on{" "}
                        {formatDate(p.paid_out_at)}
                      </p>
                    )}
                  </div>

                  <div>
                    {p.status === "owed" ? (
                      <button
                        onClick={() => markPaid(p.payout_id)}
                        style={{
                          padding: "12px 20px",
                          background: "#2563eb",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          fontWeight: "bold",
                          cursor: "pointer",
                        }}
                      >
                        💸 Mark Paid to Provider
                      </button>
                    ) : (
                      <span
                        style={{
                          padding: "10px 16px",
                          background: "#dcfce7",
                          color: "#166534",
                          borderRadius: 6,
                          fontWeight: "bold",
                        }}
                      >
                        ✅ Paid
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}