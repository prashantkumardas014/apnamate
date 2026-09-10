// src/components/common/DashboardActions.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './DashboardActions.css';

const DashboardActions = ({ 
  actions, 
  title = 'Quick Actions',
  columns = 2
}) => {
  if (!actions || actions.length === 0) {
    return (
      <div className="content-card actions-card">
        <div className="card-header">
          <h2>{title}</h2>
        </div>
        <div className="actions-empty">
          <p>No actions available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-card actions-card">
      <div className="card-header">
        <h2>{title}</h2>
      </div>
      <div className={`actions-grid columns-${columns}`}>
        {actions.map((action, index) => (
          <Link 
            key={index} 
            to={action.path} 
            className={`action-btn ${action.variant || ''}`}
            onClick={action.onClick}
          >
            <span className="action-icon">{action.icon || '📌'}</span>
            <span className="action-label">{action.label}</span>
            {action.description && (
              <span className="action-description">{action.description}</span>
            )}
            {action.badge && (
              <span className="action-badge">{action.badge}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DashboardActions;