// src/components/common/DashboardActivity.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import SafeHtml from './SafeHtml';
import './DashboardActivity.css';

const DashboardActivity = ({ 
  activities, 
  viewAllLink = '/my-bookings',
  title = 'Recent Activity'
}) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="content-card activity-card">
        <div className="card-header">
          <h2>{title}</h2>
          <Link to={viewAllLink} className="view-all">View All →</Link>
        </div>
        <div className="activity-empty">
          <span className="empty-icon">📭</span>
          <p>No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-card activity-card">
      <div className="card-header">
        <h2>{title}</h2>
        <Link to={viewAllLink} className="view-all">View All →</Link>
      </div>
      <div className="activity-list">
        {activities.map((activity, index) => (
          <div key={index} className="activity-item">
            <div className="activity-icon">{activity.icon || '📌'}</div>
            <div className="activity-content">
              <p><SafeHtml html={activity.text} /></p>
              <span className="activity-time">{activity.time || 'Just now'}</span>
            </div>
            {activity.badge && (
              <span className="activity-badge">{activity.badge}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardActivity;