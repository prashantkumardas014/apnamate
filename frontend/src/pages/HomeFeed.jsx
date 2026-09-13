// src/pages/HomeFeed.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "./HomeFeed.css";

export default function HomeFeed({ user }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("accessToken");

    const load = async () => {
      setLoading(true);
      try {
        if (user.role === "admin") {
          const [usersRes, bookRes] = await Promise.all([
            fetch(`${API_BASE_URL}/bookings/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_BASE_URL}/bookings/admin/bookings`, { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          const users = usersRes.ok ? await usersRes.json() : { users: [] };
          const bookings = bookRes.ok ? await bookRes.json() : { bookings: [] };
          setData({
            userCount: users.total || 0,
            bookingCount: bookings.total || 0,
            recentBookings: (bookings.bookings || []).slice(0, 5),
          });
        } else if (user.role === "provider") {
          const res = await fetch(`${API_BASE_URL}/bookings/provider/${user.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const b = res.ok ? await res.json() : { bookings: [] };
          const list = b.bookings || [];
          setData({
            pendingQuotes: list.filter((x) => x.status === "pending_quote").length,
            todayJobs: list.filter((x) => x.status === "paid" || x.status === "accepted").length,
            completed: list.filter((x) => x.status === "completed").length,
            recent: list.slice(0, 5),
          });
        } else {
          const res = await fetch(`${API_BASE_URL}/bookings/my-bookings/${user.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const b = res.ok ? await res.json() : { bookings: [] };
          const list = b.bookings || [];
          setData({
            active: list.filter((x) => ["pending_quote", "quoted", "accepted", "paid"].includes(x.status)).length,
            completed: list.filter((x) => x.status === "completed").length,
            recent: list.slice(0, 5),
          });
        }
      } catch (e) {
        console.error("HomeFeed load error:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  if (!user) return null;

  const role = user.role;

  const heroTitle =
    role === "admin"
      ? "Platform Overview"
      : role === "provider"
      ? `Welcome back, ${user.name?.split(" ")[0] || "there"}`
      : `Hi ${user.name?.split(" ")[0] || "there"}, ready to book?`;

  const heroSubtitle =
    role === "admin"
      ? "Live status of users, bookings, and payments"
      : role === "provider"
      ? "Here's what needs your attention today"
      : "Find trusted pros near you — quick, safe, and easy";

  const badge =
    role === "admin" ? "🛡️ Admin" : role === "provider" ? "🔧 Provider" : "🙋 Customer";

  const recentList = data?.recentBookings || data?.recent || [];

  return (
    <div className="homefeed-root">

      {/* HERO — flush with navbar, no gap */}
      <div className="homefeed-hero">
        <div className="homefeed-hero-inner">
          <div className="homefeed-badge">{badge}</div>
          <h1 className="homefeed-title">{heroTitle}</h1>
          <p className="homefeed-sub">{heroSubtitle}</p>
        </div>
      </div>

      {/* BODY */}
      <div className="homefeed-body">

        {/* STATS */}
        <div className="homefeed-stats">
          {role === "admin" && (
            <>
              <Stat icon="👥" label="Total Users" value={data?.userCount} color="#2563eb" />
              <Stat icon="📋" label="Bookings" value={data?.bookingCount} color="#16a34a" />
              <Stat icon="💳" label="Payments" action={() => navigate("/admin/payments")} color="#7c3aed" />
              <Stat icon="⭐" label="Reviews" action={() => navigate("/admin/reviews")} color="#f59e0b" />
            </>
          )}
          {role === "provider" && (
            <>
              <Stat icon="⏳" label="Awaiting Quote" value={data?.pendingQuotes} color="#f59e0b" />
              <Stat icon="📅" label="Today's Jobs" value={data?.todayJobs} color="#2563eb" />
              <Stat icon="✅" label="Completed" value={data?.completed} color="#16a34a" />
              <Stat icon="💼" label="Manage Bookings" action={() => navigate("/my-bookings")} color="#7c3aed" />
            </>
          )}
          {role === "customer" && (
            <>
              <Stat icon="🟢" label="Active Bookings" value={data?.active} color="#16a34a" />
              <Stat icon="✅" label="Completed" value={data?.completed} color="#2563eb" />
              <Stat icon="🔍" label="Browse Services" action={() => navigate("/services")} color="#7c3aed" />
              <Stat icon="👨‍🔧" label="Find Providers" action={() => navigate("/providers")} color="#f59e0b" />
            </>
          )}
        </div>

        {/* RECENT */}
        <div className="homefeed-card">
          <div className="homefeed-card-header">
            <h2 className="homefeed-card-title">
              {role === "admin"
                ? "Recent Bookings"
                : role === "provider"
                ? "Your Recent Jobs"
                : "Your Recent Activity"}
            </h2>
            <button
              className="homefeed-card-link"
              onClick={() =>
                navigate(role === "admin" ? "/admin/bookings" : "/my-bookings")
              }
            >
              View all →
            </button>
          </div>

          {loading ? (
            <p style={{ color: "#64748b", padding: "10px 0" }}>Loading…</p>
          ) : recentList.length === 0 ? (
            <div className="homefeed-empty">
              <div style={{ fontSize: 42, marginBottom: 8 }}>📭</div>
              <p style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>
                Nothing here yet
              </p>
              <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>
                {role === "customer"
                  ? "Book your first service to get started."
                  : role === "provider"
                  ? "New booking requests will appear here."
                  : "New bookings will appear here as users book."}
              </p>
              {role === "customer" && (
                <button
                  onClick={() => navigate("/services")}
                  style={{
                    marginTop: 14,
                    padding: "10px 20px",
                    background: "linear-gradient(135deg, #2563eb, #1e40af)",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Browse Services
                </button>
              )}
            </div>
          ) : (
            <div className="homefeed-list">
              {recentList.map((b) => {
                const c = statusColor(b.status);
                return (
                  <div className="homefeed-item" key={b.id}>
                    <div className="homefeed-item-left">
                      <div className="homefeed-item-title">
                        #{b.id} · {b.service}
                      </div>
                      <div className="homefeed-item-meta">
                        {b.date}
                        {b.time ? ` · ${b.time}` : ""}
                        {b.provider_name ? ` · ${b.provider_name}` : ""}
                        {b.customer_name ? ` · ${b.customer_name}` : ""}
                      </div>
                    </div>
                    <span
                      className="homefeed-item-status"
                      style={{ background: c.bg, color: c.fg }}
                    >
                      {b.status?.replace(/_/g, " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function Stat({ icon, label, value, color = "#2563eb", action }) {
  return (
    <div
      className={`homefeed-stat ${action ? "clickable" : ""}`}
      onClick={action}
    >
      <div
        className="homefeed-stat-icon"
        style={{ background: `${color}1a`, color }}
      >
        {icon}
      </div>
      <div className="homefeed-stat-body">
        {typeof value === "number" ? (
          <>
            <div className="homefeed-stat-value">{value}</div>
            <div className="homefeed-stat-label">{label}</div>
          </>
        ) : (
          <div className="homefeed-stat-label" style={{ color, fontWeight: 800 }}>
            {label}
          </div>
        )}
      </div>
    </div>
  );
}

function statusColor(s) {
  const n = (s || "").toLowerCase();
  if (n.includes("complete") || n === "paid") return { bg: "#dcfce7", fg: "#166534" };
  if (n.includes("accept") || n === "confirmed") return { bg: "#dbeafe", fg: "#1e40af" };
  if (n.includes("quote") || n.includes("pending")) return { bg: "#fef3c7", fg: "#92400e" };
  if (n.includes("cancel") || n.includes("reject")) return { bg: "#fee2e2", fg: "#991b1b" };
  return { bg: "#e5e7eb", fg: "#374151" };
}