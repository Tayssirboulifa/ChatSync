import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ user, isConnected, onToggleSidebar, isMobile, onLogout }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      if (onLogout) {
        await onLogout();
      }
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Dashboard';
      case '/chat-rooms':
        return 'Chat Rooms';
      case '/profile':
        return 'Profile';
      default:
        return 'ChatSync';
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        {user && isMobile && (
          <button 
            className="sidebar-toggle"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        )}
        
        <div className="navbar-brand" onClick={() => navigate('/')}>
          <div className="brand-icon">💬</div>
          <span className="brand-text">ChatSync</span>
        </div>
        
        <div className="page-title">
          <h1>{getPageTitle()}</h1>
        </div>
      </div>

      <div className="navbar-center">
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className="status-indicator"></div>
          <span className="status-text">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </div>

      <div className="navbar-right">
        {user ? (
          <>
            {/* Navigation Links */}
            <div className="nav-links">
              <button 
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                onClick={() => navigate('/')}
              >
                <span className="nav-icon">🏠</span>
                {!isMobile && <span>Home</span>}
              </button>
              
              <button 
                className={`nav-link ${location.pathname === '/chat-rooms' ? 'active' : ''}`}
                onClick={() => navigate('/chat-rooms')}
              >
                <span className="nav-icon">💬</span>
                {!isMobile && <span>Chat Rooms</span>}
              </button>
            </div>

            {/* Notifications */}
            <div className="notification-container" ref={notificationRef}>
              <button 
                className="notification-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications"
              >
                <span className="notification-icon">🔔</span>
                <span className="notification-badge">3</span>
              </button>
              
              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <h3>Notifications</h3>
                  </div>
                  <div className="notification-list">
                    <div className="notification-item">
                      <span className="notification-text">New message in General</span>
                      <span className="notification-time">2m ago</span>
                    </div>
                    <div className="notification-item">
                      <span className="notification-text">John joined Tech Talk</span>
                      <span className="notification-time">5m ago</span>
                    </div>
                    <div className="notification-item">
                      <span className="notification-text">Welcome to ChatSync!</span>
                      <span className="notification-time">1h ago</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="user-menu-container" ref={userMenuRef}>
              <button 
                className="user-menu-trigger"
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-label="User menu"
              >
                <div className="user-avatar">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} />
                  ) : (
                    <span className="avatar-text">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {!isMobile && (
                  <div className="user-info">
                    <span className="user-name">{user.name}</span>
                    <span className="user-status">Online</span>
                  </div>
                )}
                <span className="dropdown-arrow">▼</span>
              </button>

              {showUserMenu && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <div className="user-avatar-large">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} />
                      ) : (
                        <span className="avatar-text">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="user-details">
                      <span className="user-name">{user.name}</span>
                      <span className="user-email">{user.email}</span>
                    </div>
                  </div>
                  
                  <div className="dropdown-menu">
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        navigate('/profile');
                        setShowUserMenu(false);
                      }}
                    >
                      <span className="item-icon">👤</span>
                      Profile
                    </button>
                    
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        navigate('/settings');
                        setShowUserMenu(false);
                      }}
                    >
                      <span className="item-icon">⚙️</span>
                      Settings
                    </button>
                    
                    <div className="dropdown-divider"></div>
                    
                    <button 
                      className="dropdown-item logout"
                      onClick={handleLogout}
                    >
                      <span className="item-icon">🚪</span>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="auth-buttons">
            <button 
              className="auth-btn login-btn"
              onClick={() => navigate('/login')}
            >
              Login
            </button>
            <button 
              className="auth-btn register-btn"
              onClick={() => navigate('/register')}
            >
              Register
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
