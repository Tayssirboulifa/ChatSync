import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ user, activeUsers, isOpen, onClose, isMobile }) => {
  const [activeTab, setActiveTab] = useState('rooms');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Auto-close sidebar on route change for mobile
    if (isMobile) {
      onClose();
    }
  }, [location.pathname, isMobile, onClose]);

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '🏠',
      path: '/',
      badge: null
    },
    {
      id: 'rooms',
      label: 'Chat Rooms',
      icon: '💬',
      path: '/chat-rooms',
      badge: '5'
    },
    {
      id: 'direct',
      label: 'Direct Messages',
      icon: '📩',
      path: '/direct-messages',
      badge: '2'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: '👤',
      path: '/profile',
      badge: null
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      path: '/settings',
      badge: null
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  };

  const getOnlineUsersCount = () => {
    return Object.values(activeUsers).reduce((total, roomUsers) => {
      return total + roomUsers.length;
    }, 0);
  };

  const getRecentRooms = () => {
    // Mock data - replace with actual recent rooms
    return [
      { id: '1', name: 'General', lastMessage: 'Hello everyone!', time: '2m ago', unread: 3 },
      { id: '2', name: 'Tech Talk', lastMessage: 'New React features...', time: '5m ago', unread: 0 },
      { id: '3', name: 'Random', lastMessage: 'Anyone up for coffee?', time: '1h ago', unread: 1 }
    ];
  };

  const getOnlineUsers = () => {
    // Mock data - replace with actual online users
    return [
      { id: '1', name: 'John Doe', status: 'online', avatar: null },
      { id: '2', name: 'Jane Smith', status: 'away', avatar: null },
      { id: '3', name: 'Mike Johnson', status: 'busy', avatar: null }
    ];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#27ae60';
      case 'away': return '#f39c12';
      case 'busy': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${isMobile ? 'mobile' : ''}`}>
      <div className="sidebar-header">
        <div className="user-profile">
          <div className="user-avatar">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              <span className="avatar-text">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="status-indicator online"></div>
          </div>
          <div className="user-info">
            <h3 className="user-name">{user.name}</h3>
            <p className="user-status">Online</p>
          </div>
        </div>
        
        {isMobile && (
          <button className="close-sidebar" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item) => (
            <li key={item.id} className="nav-item">
              <button
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => handleNavigation(item.path)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.badge && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-content">
        <div className="content-tabs">
          <button
            className={`tab-button ${activeTab === 'rooms' ? 'active' : ''}`}
            onClick={() => setActiveTab('rooms')}
          >
            Recent Rooms
          </button>
          <button
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Online ({getOnlineUsersCount()})
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'rooms' && (
            <div className="recent-rooms">
              <h4 className="section-title">Recent Activity</h4>
              <div className="rooms-list">
                {getRecentRooms().map((room) => (
                  <div key={room.id} className="room-item">
                    <div className="room-info">
                      <div className="room-name">{room.name}</div>
                      <div className="room-message">{room.lastMessage}</div>
                    </div>
                    <div className="room-meta">
                      <span className="room-time">{room.time}</span>
                      {room.unread > 0 && (
                        <span className="unread-badge">{room.unread}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="online-users">
              <h4 className="section-title">Online Users</h4>
              <div className="users-list">
                {getOnlineUsers().map((user) => (
                  <div key={user.id} className="user-item">
                    <div className="user-avatar-small">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} />
                      ) : (
                        <span className="avatar-text">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div 
                        className="status-dot"
                        style={{ backgroundColor: getStatusColor(user.status) }}
                      ></div>
                    </div>
                    <div className="user-details">
                      <span className="user-name">{user.name}</span>
                      <span className="user-status">{user.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="stats">
          <div className="stat-item">
            <span className="stat-icon">👥</span>
            <span className="stat-text">{getOnlineUsersCount()} Online</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">💬</span>
            <span className="stat-text">5 Rooms</span>
          </div>
        </div>
        
        <div className="quick-actions">
          <button 
            className="quick-action-btn"
            onClick={() => handleNavigation('/chat-rooms')}
            title="Create Room"
          >
            ➕
          </button>
          <button 
            className="quick-action-btn"
            onClick={() => handleNavigation('/direct-messages')}
            title="New Message"
          >
            ✉️
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
