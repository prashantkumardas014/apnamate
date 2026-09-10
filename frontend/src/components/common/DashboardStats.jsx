// src/components/common/DashboardStats.jsx
import React from 'react';
import './DashboardStats.css';

const DashboardStats = ({ stats }) => {
  const statIcons = {
    bookings: '📅',
    services: '🛠️',
    messages: '💬',
    rating: '⭐',
    users: '👥',
    revenue: '💰',
    earnings: '💰',
    pending: '⏳',
    completed: '✅',
    total: '📊',
    active: '🟢'
  };

  const statColors = {
    bookings: 'booking',
    services: 'services',
    messages: 'messages',
    rating: 'rating',
    users: 'users',
    revenue: 'revenue',
    earnings: 'earnings',
    pending: 'pending',
    completed: 'completed',
    total: 'total',
    active: 'active'
  };

  return (
    <div className="stats-grid">
      {stats.map((stat, index) => (
        <div key={index} className="stat-card">
          <div className={`stat-icon ${statColors[stat.icon] || 'default'}`}>
            {statIcons[stat.icon] || '📊'}
          </div>
          <div className="stat-info">
            <h3>{stat.value}</h3>
            <p>{stat.label}</p>
          </div>
          {stat.change && (
            <span className={`stat-change ${stat.changeType || 'positive'}`}>
              {stat.changeType === 'positive' ? '↑' : stat.changeType === 'negative' ? '↓' : '•'} {stat.change}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;