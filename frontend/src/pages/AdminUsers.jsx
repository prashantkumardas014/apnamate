// frontend/src/pages/AdminUsers.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "./AdminUsers.css";

function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/admin/users/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to update role");
      
      setMessage(`✅ ${data.message}`);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem("accessToken");
      const endpoint = currentStatus === 1 ? "block" : "unblock";
      const response = await fetch(
        `${API_BASE_URL}/admin/users/${userId}/${endpoint}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to update status");
      
      setMessage(`✅ ${data.message}`);
      fetchUsers();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: { bg: "#dc2626", text: "white" },
      provider: { bg: "#2563eb", text: "white" },
      customer: { bg: "#16a34a", text: "white" }
    };
    const style = colors[role] || colors.customer;
    return (
      <span style={{
        padding: "4px 12px",
        borderRadius: "20px",
        background: style.bg,
        color: style.text,
        fontSize: "12px",
        fontWeight: "bold",
        textTransform: "uppercase"
      }}>
        {role}
      </span>
    );
  };

  if (loading) return <div className="loading">Loading users...</div>;

  return (
    <div className="admin-users">
      <div className="admin-header">
        <button onClick={() => navigate("/admin-dashboard")} className="back-btn">
          ← Back to Dashboard
        </button>
        <h1>👥 Manage Users</h1>
        <p>View and manage all registered users</p>
      </div>

      {message && (
        <div className={`message ${message.includes("✅") ? "success" : "error"}`}>
          {message}
        </div>
      )}

      <div className="user-stats">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-number">{users.length}</p>
        </div>
        <div className="stat-card">
          <h3>Admins</h3>
          <p className="stat-number">{users.filter(u => u.role === "admin").length}</p>
        </div>
        <div className="stat-card">
          <h3>Providers</h3>
          <p className="stat-number">{users.filter(u => u.role === "provider").length}</p>
        </div>
        <div className="stat-card">
          <h3>Customers</h3>
          <p className="stat-number">{users.filter(u => u.role === "customer").length}</p>
        </div>
      </div>

      <div className="user-table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  {editingUser === user.id ? (
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                      className="role-select"
                    >
                      <option value="admin">Admin</option>
                      <option value="provider">Provider</option>
                      <option value="customer">Customer</option>
                    </select>
                  ) : (
                    getRoleBadge(user.role)
                  )}
                </td>
                <td>
                  <span className={`status ${user.is_active === 1 ? "active" : "blocked"}`}>
                    {user.is_active === 1 ? "✅ Active" : "🚫 Blocked"}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    {editingUser === user.id ? (
                      <button onClick={() => setEditingUser(null)} className="btn-cancel">
                        Cancel
                      </button>
                    ) : (
                      <button onClick={() => setEditingUser(user.id)} className="btn-edit">
                        Edit Role
                      </button>
                    )}
                    <button
                      onClick={() => toggleUserStatus(user.id, user.is_active)}
                      className={user.is_active === 1 ? "btn-block" : "btn-unblock"}
                    >
                      {user.is_active === 1 ? "Block" : "Unblock"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminUsers;