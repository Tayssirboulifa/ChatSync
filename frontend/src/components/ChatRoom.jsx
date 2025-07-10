import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { authAPI } from '../utils/axiosConfig';
import MessageList from './MessageList';
import MessageForm from './MessageForm';
import './ChatRoom.css';

const ChatRoom = ({ room, onLeaveRoom, user }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  
  const {
    socket,
    isConnected,
    activeUsers,
    joinRoom,
    leaveRoom
  } = useSocket();

  // Get unique active users to prevent duplicate keys
  const roomActiveUsers = (activeUsers[room._id] || []).filter((user, index, array) =>
    array.findIndex(u => u.user._id === user.user._id) === index
  );

  useEffect(() => {
    if (room && isConnected) {
      console.log('ChatRoom: Joining room', room._id);
      joinRoom(room._id);
      setLoading(false);
    }

    return () => {
      if (room) {
        console.log('ChatRoom: Leaving room', room._id);
        leaveRoom(room._id);
      }
    };
  }, [room?._id]);

  const handleLeaveRoom = () => {
    leaveRoom(room._id);
    onLeaveRoom();
  };

  const handleReply = (message) => {
    setReplyTo(message);
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#27ae60';
      case 'away': return '#f39c12';
      case 'busy': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  if (loading) {
    return (
      <div className="chat-room-container">
        <div className="loading">Loading chat room...</div>
      </div>
    );
  }

  return (
    <div className="chat-room-container">
      {/* Header */}
      <div className="chat-room-header">
        <div className="room-info">
          <h2>{room.name}</h2>
          <div className="room-stats">
            <span className="member-count">{room.memberCount} members</span>
            <span className="online-count">{roomActiveUsers.length} online</span>
          </div>
        </div>
        <div className="header-actions">
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button className="leave-room-button" onClick={handleLeaveRoom}>
            Leave Room
          </button>
        </div>
      </div>

      <div className="chat-room-content">
        {/* Sidebar with active users */}
        <div className="chat-sidebar">
          <div className="sidebar-section">
            <h3>Online Users ({roomActiveUsers.length})</h3>
            <div className="users-list">
              {roomActiveUsers.map((activeUser) => (
                <div key={activeUser.user._id} className="user-item">
                  <div className="user-avatar">
                    {activeUser.user.avatar ? (
                      <img src={activeUser.user.avatar} alt={activeUser.user.name} />
                    ) : (
                      <div className="avatar-placeholder">
                        {activeUser.user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div 
                      className="status-dot"
                      style={{ backgroundColor: getStatusColor(activeUser.user.status) }}
                    ></div>
                  </div>
                  <div className="user-info">
                    <div className="user-name">{activeUser.user.name}</div>
                    <div className="user-status">{activeUser.user.status || 'online'}</div>
                  </div>
                </div>
              ))}
              {roomActiveUsers.length === 0 && (
                <div className="no-users">No users online</div>
              )}
            </div>
          </div>
        </div>

        {/* Main chat area */}
        <div className="chat-main">
          {error && (
            <div className="error-message">
              {error}
              <button onClick={() => setError('')} className="close-error">×</button>
            </div>
          )}

          {/* Messages area */}
          <MessageList
            roomId={room._id}
            user={user}
            onReply={handleReply}
          />

          {/* Message input */}
          <MessageForm
            roomId={room._id}
            replyTo={replyTo}
            onCancelReply={handleCancelReply}
            user={user}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
