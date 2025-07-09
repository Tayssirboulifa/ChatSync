import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { authAPI } from '../utils/axiosConfig';
import './ChatRoom.css';

const ChatRoom = ({ room, onLeaveRoom }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  const { 
    socket, 
    isConnected, 
    activeUsers, 
    joinRoom, 
    leaveRoom, 
    sendMessage,
    startTyping,
    stopTyping
  } = useSocket();

  const roomActiveUsers = activeUsers[room._id] || [];

  useEffect(() => {
    if (room && isConnected) {
      joinRoom(room._id);
      setLoading(false);
    }

    return () => {
      if (room) {
        leaveRoom(room._id);
      }
    };
  }, [room, isConnected, joinRoom, leaveRoom]);

  useEffect(() => {
    if (socket) {
      // Listen for new messages
      const handleNewMessage = (messageData) => {
        if (messageData.roomId === room._id) {
          setMessages(prev => [...prev, messageData]);
        }
      };

      // Listen for typing indicators
      const handleUserTyping = (data) => {
        if (data.roomId === room._id) {
          setTypingUsers(prev => {
            if (!prev.find(user => user.userId === data.userId)) {
              return [...prev, { userId: data.userId, userName: data.userName }];
            }
            return prev;
          });
        }
      };

      const handleUserStoppedTyping = (data) => {
        if (data.roomId === room._id) {
          setTypingUsers(prev => prev.filter(user => user.userId !== data.userId));
        }
      };

      socket.on('new-message', handleNewMessage);
      socket.on('user-typing', handleUserTyping);
      socket.on('user-stopped-typing', handleUserStoppedTyping);

      return () => {
        socket.off('new-message', handleNewMessage);
        socket.off('user-typing', handleUserTyping);
        socket.off('user-stopped-typing', handleUserStoppedTyping);
      };
    }
  }, [socket, room._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !isConnected) return;

    sendMessage(room._id, newMessage.trim());
    setNewMessage('');
    
    // Stop typing indicator
    stopTyping(room._id);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!isConnected) return;

    // Start typing indicator
    startTyping(room._id);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(room._id);
    }, 1000);
  };

  const handleLeaveRoom = () => {
    leaveRoom(room._id);
    onLeaveRoom();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#27ae60';
      case 'away': return '#f39c12';
      case 'busy': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
          <div className="messages-container">
            <div className="messages-list">
              {messages.length === 0 ? (
                <div className="no-messages">
                  <h3>Welcome to {room.name}!</h3>
                  <p>Start the conversation by sending a message.</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="message">
                    <div className="message-avatar">
                      {message.sender.avatar ? (
                        <img src={message.sender.avatar} alt={message.sender.name} />
                      ) : (
                        <div className="avatar-placeholder">
                          {message.sender.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="message-content">
                      <div className="message-header">
                        <span className="sender-name">{message.sender.name}</span>
                        <span className="message-time">{formatTime(message.timestamp)}</span>
                      </div>
                      <div className="message-text">{message.content}</div>
                    </div>
                  </div>
                ))
              )}
              
              {/* Typing indicators */}
              {typingUsers.length > 0 && (
                <div className="typing-indicator">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="typing-text">
                    {typingUsers.map(user => user.userName).join(', ')} 
                    {typingUsers.length === 1 ? ' is' : ' are'} typing...
                  </span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message input */}
          <div className="message-input-container">
            <form onSubmit={handleSendMessage} className="message-form">
              <input
                type="text"
                value={newMessage}
                onChange={handleTyping}
                placeholder={isConnected ? "Type a message..." : "Connecting..."}
                className="message-input"
                disabled={!isConnected}
                maxLength={1000}
              />
              <button 
                type="submit" 
                className="send-button"
                disabled={!newMessage.trim() || !isConnected}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
