// frontend/src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "./Dashboard.css";

const ROLE_META = {
  customer: { label: "Customer", emoji: "🙋" },
  provider: { label: "Provider", emoji: "🔧" },
  admin:    { label: "Admin",    emoji: "🛡️" },
};

function StatCard({ icon, label, value, accent = "#2563eb", onClick }) {
  return (
    <div
      className="dash-stat"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="dash-stat-icon" style={{ background: `${accent}1a`, color: accent }}>
        {icon}
      </div>
      <div className="dash-stat-body">
        <div className="dash-stat-value">{value}</div>
        <div className="dash-stat-label">{label}</div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick, primary }) {
  return (
    <button
      className={`dash-action ${primary ? "primary" : ""}`}
      onClick={onClick}
    >
      <span className="dash-action-icon">{icon}</span>
      <span className="dash-action-label">{label}</span>
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) { navigate("/login"); return; }
    const u = JSON.parse(raw);
    setUser(u);
    loadDashboard(u);
  }, [navigate]);

  const loadDashboard = async (u) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");

      if (u.role === "admin") {
        const [usersRes, bookingsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/bookings/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/bookings/admin/bookings`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const users = usersRes.ok ? await usersRes.json() : { users: [], total: 0 };
        const bookings = bookingsRes.ok ? await bookingsRes.json() : { bookings: [], total: 0 };

        setStats({
          users: users.total || 0,
          bookings: bookings.total || 0,
          providers: (users.users || []).filter((x) => x.role === "provider").length,
          customers: (users.users || []).filter((x) => x.role === "customer").length,
        });
        setRecent((bookings.bookings || []).slice(0, 5));
      } else if (u.role === "provider") {
        const res = await fetch(`${API_BASE_URL}/bookings/provider/${u.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.ok ? await res.json() : { bookings: [], stats: {} };
        const list = data.bookings || [];
        setStats({
          pending: list.filter((b) => b.status === "pending_quote").length,
          active: list.filter((b) => ["accepted", "paid"].includes(b.status)).length,
          completed: list.filter((b) => b.status === "completed").length,
          earnings: list.filter((b) => b.status === "completed").reduce((s, b) => s + (b.quoted_amount || 0) * 0.9, 0),
        });
        setRecent(list.slice(0, 5));
      } else {
        const res = await fetch(`${API_BASE_URL}/bookings/my-bookings/${u.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.ok ? await res.json() : { bookings: [], stats: {} };
        const list = data.bookings || [];
        setStats({
          active: list.filter((b) => ["pending_quote", "quoted", "accepted", "paid"].includes(b.status)).length,
          completed: list.filter((b) => b.status === "completed").length,
          pending: list.filter((b) => ["pending_quote", "quoted"].includes(b.status)).length,
          spent: list.filter((b) => ["paid", "completed"].includes(b.status)).reduce((s, b) => s + (Number(b.quoted_amount) || 0), 0),
        });
        setRecent(list.slice(0, 5));
      }
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="dash-root">
        <div className="dash-hero">
          <div className="dash-hero-inner">
            <div className="dash-skeleton" style={{ width: 200, height: 20 }} />
            <div className="dash-skeleton" style={{ width: 300, height: 32, marginTop: 10 }} />
          </div>
        </div>
        <div className="dash-body">
          <div className="dash-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="dash-skeleton" style={{ height: 100 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const role = user.role;
  const meta = ROLE_META[role] || ROLE_META.customer;
  const firstName = (user.name || "").split(" ")[0];

  const greeting =
    role === "customer" ? `Hi, ${firstName} 👋` :
    role === "provider" ? `Welcome back, ${firstName}` :
    `Platform Overview`;

  const subtitle =
    role === "customer" ? "Here's your activity on ApnaMate" :
    role === "provider" ? "Here's what's happening today" :
    "Live status of users, bookings & activity";

  return (
    <div className="dash-root">
      {/* HERO */}
      <div className="dash-hero">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <div className="dash-hero-badge">
              {meta.emoji} {meta.label}
            </div>
            <h1 className="dash-hero-title">{greeting}</h1>
            <p className="dash-hero-sub">{subtitle}</p>
          </div>
          <div className="dash-hero-art" aria-hidden="true">
            <svg width="120" height="120" viewBox="0 0 64 64" fill="none">
              <rect x="0" y="0" width="64" height="64" rx="16" fill="rgba(255,255,255,0.12)" />
              <path d="M32 12 L53 30 L48 30 L48 51 L16 51 L16 30 L11 30 Z" fill="white" opacity="0.9" />
              <path d="M34 24 L24 42 L31 42 L28 56 L40 36 L32 36 Z" fill="#fbbf24" />
            </svg>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="dash-body">

        {/* STATS */}
        <div className="dash-grid">
          {role === "customer" && (
            <>
              <StatCard icon="🟢" label="Active Bookings" value={stats.active || 0} accent="#16a34a" onClick={() => navigate("/my-bookings")} />
              <StatCard icon="✅" label="Completed" value={stats.completed || 0} accent="#2563eb" onClick={() => navigate("/my-bookings")} />
              <StatCard icon="⏳" label="Pending Quotes" value={stats.pending || 0} accent="#f59e0b" onClick={() => navigate("/my-bookings")} />
              <StatCard icon="💰" label="Total Spent" value={`₹${Math.round(stats.spent || 0)}`} accent="#7c3aed" onClick={() => navigate("/my-payments")} />
            </>
          )}

          {role === "provider" && (
            <>
              <StatCard icon="⏳" label="Awaiting Quote" value={stats.pending || 0} accent="#f59e0b" onClick={() => navigate("/my-bookings")} />
              <StatCard icon="📅" label="Active Jobs" value={stats.active || 0} accent="#2563eb" onClick={() => navigate("/my-bookings")} />
              <StatCard icon="✅" label="Completed" value={stats.completed || 0} accent="#16a34a" onClick={() => navigate("/my-bookings")} />
              <StatCard icon="💵" label="Est. Earnings" value={`₹${Math.round(stats.earnings || 0)}`} accent="#7c3aed" onClick={() => navigate("/my-bills")} />
            </>
          )}

          {role === "admin" && (
            <>
              <StatCard icon="👥" label="Total Users" value={stats.users || 0} accent="#2563eb" onClick={() => navigate("/admin/users")} />
              <StatCard icon="📋" label="Total Bookings" value={stats.bookings || 0} accent="#16a34a" onClick={() => navigate("/admin/bookings")} />
              <StatCard icon="🔧" label="Providers" value={stats.providers || 0} accent="#f59e0b" onClick={() => navigate("/admin/users")} />
              <StatCard icon="🙋" label="Customers" value={stats.customers || 0} accent="#7c3aed" onClick={() => navigate("/admin/users")} />
            </>
          )}
        </div>

        {/* TWO COLUMN BODY */}
        <div className="dash-columns">
          {/* LEFT: Recent */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h2 className="dash-card-title">
                {role === "admin" ? "Recent Bookings" : role === "provider" ? "Recent Jobs" : "Recent Activity"}
              </h2>
              <button
                className="dash-card-link"
                onClick={() => navigate(role === "admin" ? "/admin/bookings" : "/my-bookings")}
              >
                View all →
              </button>
            </div>

            {recent.length === 0 ? (
              <div className="dash-empty">
                <div className="dash-empty-icon">📭</div>
                <p className="dash-empty-title">Nothing here yet</p>
                <p className="dash-empty-sub">
                  {role === "admin"
                    ? "New bookings will appear here as users book services."
                    : role === "provider"
                    ? "New booking requests from customers will show up here."
                    : "Book your first service to get started."}
                </p>
                {role === "customer" && (
                  <button className="dash-empty-cta" onClick={() => navigate("/services")}>
                    Browse Services
                  </button>
                )}
              </div>
            ) : (
              <div className="dash-list">
                {recent.map((b) => (
                  <div className="dash-item" key={b.id}>
                    <div className="dash-item-left">
                      <div className="dash-item-title">
                        #{b.id} · {b.service}
                      </div>
                      <div className="dash-item-meta">
                        {b.date}
                        {b.time ? ` · ${b.time}` : ""}
                        {b.provider_name ? ` · ${b.provider_name}` : ""}
                      </div>
                    </div>
                    <span className={`dash-item-status status-${(b.status || "").toLowerCase().replace(/\s+/g, "_")}`}>
                      {b.status?.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Quick Actions */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h2 className="dash-card-title">Quick Actions</h2>
            </div>

            <div className="dash-actions">
              {role === "customer" && (
                <>
                  <QuickAction icon="🔧" label="Book a Service" primary onClick={() => navigate("/services")} />
                  <QuickAction icon="👨‍🔧" label="Find Providers" onClick={() => navigate("/providers")} />
                  <QuickAction icon="📋" label="My Bookings" onClick={() => navigate("/my-bookings")} />
                  <QuickAction icon="🧾" label="My Bills" onClick={() => navigate("/my-bills")} />
                </>
              )}

              {role === "provider" && (
                <>
                  <QuickAction icon="📋" label="My Bookings" primary onClick={() => navigate("/my-bookings")} />
                  <QuickAction icon="📊" label="Analytics" onClick={() => navigate("/provider-analytics")} />
                  <QuickAction icon="🧾" label="My Bills" onClick={() => navigate("/my-bills")} />
                  <QuickAction icon="👤" label="Edit Profile" onClick={() => navigate("/profile/edit")} />
                </>
              )}

              {role === "admin" && (
                <>
                  <QuickAction icon="👥" label="Manage Users" primary onClick={() => navigate("/admin/users")} />
                  <QuickAction icon="📋" label="All Bookings" onClick={() => navigate("/admin/bookings")} />
                  <QuickAction icon="💳" label="Payments" onClick={() => navigate("/admin/payments")} />
                  <QuickAction icon="⭐" label="Reviews" onClick={() => navigate("/admin/reviews")} />
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}