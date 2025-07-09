import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = ({ user }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user && !localStorage.getItem('token')) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user && !localStorage.getItem('token')) {
    return null;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.name || 'User'}!</p>
        </div>
        
        <div className="dashboard-content">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Profile</h3>
              <div className="stat-info">
                <p><strong>Name:</strong> {user?.name || 'N/A'}</p>
                <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
                <p><strong>Role:</strong> {user?.role || 'user'}</p>
              </div>
            </div>
            
            <div className="stat-card">
              <h3>Quick Actions</h3>
              <div className="action-buttons">
                <button className="action-btn">Update Profile</button>
                <button className="action-btn">Settings</button>
                <button className="action-btn">Help</button>
              </div>
            </div>
            
            <div className="stat-card">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                <p>No recent activity</p>
              </div>
            </div>
            
            <div className="stat-card">
              <h3>System Status</h3>
              <div className="status-info">
                <div className="status-item">
                  <span className="status-dot green"></span>
                  <span>API Connected</span>
                </div>
                <div className="status-item">
                  <span className="status-dot green"></span>
                  <span>Database Online</span>
                </div>
                <div className="status-item">
                  <span className="status-dot green"></span>
                  <span>All Systems Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
