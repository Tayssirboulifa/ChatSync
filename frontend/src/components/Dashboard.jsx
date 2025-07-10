import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="simple-dashboard">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>Welcome back, {user?.name || 'User'}!</h1>
          <p>Here's your ChatSync dashboard</p>
        </header>

        <div className="dashboard-cards">
          <div className="dashboard-card">
            <div className="card-icon">💬</div>
            <h3>Chat Rooms</h3>
            <p>Join conversations and connect with others</p>
            <button
              className="card-button"
              onClick={() => navigate('/chat-rooms')}
            >
              Go to Chat Rooms
            </button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">👤</div>
            <h3>Your Profile</h3>
            <p>Manage your account and preferences</p>
            <button
              className="card-button"
              onClick={() => navigate('/profile')}
            >
              View Profile
            </button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">📊</div>
            <h3>Statistics</h3>
            <p>View your activity and usage stats</p>
            <button
              className="card-button"
              onClick={() => navigate('/stats')}
            >
              View Stats
            </button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">⚙️</div>
            <h3>Settings</h3>
            <p>Customize your ChatSync experience</p>
            <button
              className="card-button"
              onClick={() => navigate('/settings')}
            >
              Open Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
