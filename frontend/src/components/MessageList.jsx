import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { messageAPI } from '../utils/axiosConfig';
import './MessageList.css';

const MessageList = ({ roomId, user, onReply }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const { socket, isConnected } = useSocket();

  // Fetch initial messages
  useEffect(() => {
    if (roomId) {
      fetchMessages(1, true);
    }
  }, [roomId]);

  // Socket event listeners
  useEffect(() => {
    if (socket) {
      const handleNewMessage = (messageData) => {
        if (messageData.chatRoom === roomId) {
          setMessages(prev => [...prev, messageData]);
          scrollToBottom();
        }
      };

      const handleMessageEdited = (data) => {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, content: data.content, edited: data.edited }
            : msg
        ));
      };

      const handleMessageDeleted = (data) => {
        setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
      };

      const handleUserTyping = (data) => {
        if (data.roomId === roomId && data.userId !== user.id) {
          setTypingUsers(prev => {
            if (!prev.find(u => u.userId === data.userId)) {
              return [...prev, { userId: data.userId, userName: data.userName }];
            }
            return prev;
          });
        }
      };

      const handleUserStoppedTyping = (data) => {
        if (data.roomId === roomId) {
          setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
        }
      };

      const handleReactionAdded = (data) => {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, reactions: data.reactions }
            : msg
        ));
      };

      socket.on('new-message', handleNewMessage);
      socket.on('message-edited', handleMessageEdited);
      socket.on('message-deleted', handleMessageDeleted);
      socket.on('user-typing', handleUserTyping);
      socket.on('user-stopped-typing', handleUserStoppedTyping);
      socket.on('reaction-added', handleReactionAdded);

      return () => {
        socket.off('new-message', handleNewMessage);
        socket.off('message-edited', handleMessageEdited);
        socket.off('message-deleted', handleMessageDeleted);
        socket.off('user-typing', handleUserTyping);
        socket.off('user-stopped-typing', handleUserStoppedTyping);
        socket.off('reaction-added', handleReactionAdded);
      };
    }
  }, [socket, roomId, user.id]);

  const fetchMessages = async (pageNum = 1, isInitial = false) => {
    try {
      if (!isInitial) setLoadingMore(true);
      
      const response = await messageAPI.getMessages(roomId, { page: pageNum, limit: 50 });
      const { messages: newMessages, pagination } = response.data;

      if (isInitial) {
        setMessages(newMessages);
        setLoading(false);
        setTimeout(scrollToBottom, 100);
      } else {
        // Prepend older messages
        setMessages(prev => [...newMessages, ...prev]);
      }

      setHasMore(pagination.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error('Fetch messages error:', error);
      setError('Failed to load messages');
      setLoading(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const loadMoreMessages = () => {
    if (hasMore && !loadingMore) {
      fetchMessages(page + 1);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
    return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const shouldShowDateSeparator = (currentMsg, prevMsg) => {
    if (!prevMsg) return true;
    
    const currentDate = new Date(currentMsg.createdAt).toDateString();
    const prevDate = new Date(prevMsg.createdAt).toDateString();
    
    return currentDate !== prevDate;
  };

  const shouldGroupMessage = (currentMsg, prevMsg) => {
    if (!prevMsg) return false;
    
    const timeDiff = new Date(currentMsg.createdAt) - new Date(prevMsg.createdAt);
    const fiveMinutes = 5 * 60 * 1000;
    
    return (
      prevMsg.sender._id === currentMsg.sender._id &&
      timeDiff < fiveMinutes &&
      !shouldShowDateSeparator(currentMsg, prevMsg)
    );
  };

  const handleReply = (message) => {
    if (onReply) {
      onReply(message);
    }
  };

  const handleEditMessage = (messageId, newContent) => {
    if (socket) {
      socket.emit('edit-message', { messageId, content: newContent });
    }
  };

  const handleDeleteMessage = (messageId) => {
    if (socket && window.confirm('Are you sure you want to delete this message?')) {
      socket.emit('delete-message', { messageId });
    }
  };

  const handleAddReaction = (messageId, emoji) => {
    if (socket) {
      socket.emit('add-reaction', { messageId, emoji });
    }
  };

  if (loading) {
    return (
      <div className="messages-container">
        <div className="loading-messages">
          <div className="loading-spinner"></div>
          <span>Loading messages...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="messages-container">
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => fetchMessages(1, true)}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-container" ref={messagesContainerRef}>
      {hasMore && (
        <div className="load-more-container">
          <button 
            className="load-more-btn"
            onClick={loadMoreMessages}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Load older messages'}
          </button>
        </div>
      )}

      <div className="messages-list">
        {messages.length === 0 ? (
          <div className="no-messages">
            <div className="no-messages-icon">💬</div>
            <h3>No messages yet</h3>
            <p>Be the first to start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const isGrouped = shouldGroupMessage(message, prevMessage);
            const showDateSeparator = shouldShowDateSeparator(message, prevMessage);
            const isOwnMessage = message.sender._id === user.id;

            return (
              <div key={message._id}>
                {showDateSeparator && (
                  <div className="date-separator">
                    <span>{formatDate(message.createdAt)}</span>
                  </div>
                )}
                
                <div className={`message ${isGrouped ? 'grouped' : ''} ${isOwnMessage ? 'own' : ''}`}>
                  {!isGrouped && (
                    <div className="message-avatar">
                      {message.sender.avatar ? (
                        <img src={message.sender.avatar} alt={message.sender.name} />
                      ) : (
                        <div className="avatar-placeholder">
                          {message.sender.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="message-content">
                    {!isGrouped && (
                      <div className="message-header">
                        <span className="sender-name">{message.sender.name}</span>
                        <span className="message-time">{formatTime(message.createdAt)}</span>
                        {message.edited.isEdited && (
                          <span className="edited-indicator" title={`Edited ${formatTime(message.edited.editedAt)}`}>
                            (edited)
                          </span>
                        )}
                      </div>
                    )}
                    
                    {message.replyTo && (
                      <div className="reply-reference">
                        <div className="reply-line"></div>
                        <div className="reply-content">
                          <span className="reply-author">{message.replyTo.sender.name}</span>
                          <span className="reply-text">{message.replyTo.content}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="message-text">
                      {message.content}
                    </div>
                    
                    <div className="message-actions">
                      <button 
                        className="action-btn reply-btn"
                        onClick={() => handleReply(message)}
                        title="Reply"
                      >
                        ↳
                      </button>
                      
                      <button 
                        className="action-btn reaction-btn"
                        onClick={() => handleAddReaction(message._id, '👍')}
                        title="Add reaction"
                      >
                        👍
                      </button>
                      
                      {isOwnMessage && (
                        <>
                          <button 
                            className="action-btn edit-btn"
                            onClick={() => {/* TODO: Implement edit modal */}}
                            title="Edit message"
                          >
                            ✏️
                          </button>
                          
                          <button 
                            className="action-btn delete-btn"
                            onClick={() => handleDeleteMessage(message._id)}
                            title="Delete message"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            <div className="typing-avatar">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <span className="typing-text">
              {typingUsers.map(u => u.userName).join(', ')} 
              {typingUsers.length === 1 ? ' is' : ' are'} typing...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;
