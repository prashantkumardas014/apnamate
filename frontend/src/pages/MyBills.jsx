// src/pages/MyBills.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

function MyBills() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const showMessage = (text, type = "info") => {
    setMessage(text);
    setMessageType(type);
    if (type !== "error") setTimeout(() => setMessage(""), 4000);
  };

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
  });

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      navigate("/login");
      return;
    }
    try {
      const u = JSON.parse(stored);
      setUser(u);
      fetchBills();
    } catch (e) {
      console.error(e);
      navigate("/login");
    }
  }, [navigate]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/bookings/payments/bills/all`, {
        headers: authHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to load bills");
      setBills(data.bills || []);
      if (data.backfilled > 0) {
        showMessage(`📄 Generated ${data.backfilled} missing bill(s)`, "success");
      }
    } catch (err) {
      console.error("Bills fetch error:", err);
      showMessage(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const downloadBill = async (billId, billNumber) => {
    setDownloadingId(billId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/bookings/payments/bills/${billId}/download`,
        { headers: authHeader() }
      );
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ApnaMate-Bill-${billNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showMessage("📄 Bill downloaded!", "success");
    } catch (err) {
      console.error("Bill download error:", err);
      showMessage("Unable to download: " + err.message, "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  if (!user) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f7fb", padding: "30px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Header */}
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
          <div>
            <h1 style={{ margin: 0 }}>🧾 My Bills</h1>
            <p style={{ color: "#64748b", marginTop: 6 }}>
              All your payment receipts, ready to download anytime.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={fetchBills}
              style={{
                padding: "10px 18px",
                backgroundColor: "#16a34a",
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
              onClick={() =>
                navigate(user.role === "provider" ? "/provider-dashboard" : "/dashboard")
              }
              style={{
                padding: "10px 18px",
                backgroundColor: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: 6,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ← Dashboard
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            style={{
              padding: 12,
              marginBottom: 20,
              backgroundColor: messageType === "error" ? "#fee2e2" : "#dcfce7",
              color: messageType === "error" ? "#991b1b" : "#166534",
              borderRadius: 8,
              fontWeight: "bold",
              borderLeft: `4px solid ${messageType === "error" ? "#dc2626" : "#16a34a"}`,
            }}
          >
            {message}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ backgroundColor: "white", padding: 40, borderRadius: 12, textAlign: "center" }}>
            <div
              style={{
                width: 40,
                height: 40,
                border: "4px solid #e5e7eb",
                borderTopColor: "#2563eb",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 12px",
              }}
            ></div>
            <p>Loading your bills...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* No bills */}
        {!loading && bills.length === 0 && (
          <div style={{ backgroundColor: "white", padding: 40, borderRadius: 12, textAlign: "center" }}>
            <div style={{ fontSize: 48 }}>🧾</div>
            <h3 style={{ margin: "12px 0" }}>No bills yet</h3>
            <p style={{ color: "#64748b" }}>
              Bills appear here once your payments are approved by the admin.
            </p>
          </div>
        )}

        {/* Bills list */}
        {!loading &&
          bills.map((b) => {
            const isDownloading = downloadingId === b.bill_id;
            return (
              <div
                key={b.bill_id}
                style={{
                  backgroundColor: "white",
                  padding: 20,
                  borderRadius: 12,
                  marginBottom: 14,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <h3 style={{ margin: "0 0 6px", color: "#2563eb" }}>
                      {b.service} — Booking #{b.booking_id}
                    </h3>
                    <p style={{ margin: "4px 0", color: "#334155" }}>
                      <strong>Bill #:</strong> <code>{b.bill_number}</code>
                    </p>
                    <p style={{ margin: "4px 0", color: "#334155" }}>
                      <strong>Amount:</strong>{" "}
                      <span style={{ color: "#16a34a", fontSize: 20, fontWeight: "bold" }}>
                        ₹{b.paid_amount}
                      </span>
                    </p>
                    <p style={{ margin: "4px 0", color: "#64748b", fontSize: 13 }}>
                      {user.role === "provider"
                        ? `Customer: ${b.customer_name}`
                        : `Provider: ${b.provider_name || "—"}`}
                    </p>
                    <p style={{ margin: "4px 0", color: "#64748b", fontSize: 13 }}>
                      Issued: {formatDate(b.issued_at)}
                    </p>
                    {b.utr_number && (
                      <p style={{ margin: "4px 0", color: "#64748b", fontSize: 13 }}>
                        UTR: <code>{b.utr_number}</code>
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={() => downloadBill(b.bill_id, b.bill_number)}
                    style={{
                      padding: "12px 22px",
                      backgroundColor: isDownloading ? "#94a3b8" : "#2563eb",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      cursor: isDownloading ? "not-allowed" : "pointer",
                      fontWeight: "bold",
                      fontSize: 14,
                      minWidth: 180,
                    }}
                  >
                    {isDownloading ? "Downloading..." : "📄 Download PDF"}
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default MyBills;