import { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './AppLayout.css';

const AppLayout = ({ children, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { isConnected, activeUsers } = useSocket();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="app-layout">
      <Navbar
        user={user}
        isConnected={isConnected}
        onToggleSidebar={toggleSidebar}
        isMobile={isMobile}
        onLogout={onLogout}
      />
      
      <div className="app-content">
        {user && (
          <Sidebar 
            user={user}
            activeUsers={activeUsers}
            isOpen={sidebarOpen}
            onClose={closeSidebar}
            isMobile={isMobile}
          />
        )}
        
        <main className={`main-content ${user ? 'with-sidebar' : 'full-width'} ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="content-wrapper">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}
    </div>
  );
};

export default AppLayout;
