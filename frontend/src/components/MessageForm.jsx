import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import './MessageForm.css';

const MessageForm = ({ roomId, replyTo, onCancelReply, user }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { socket, isConnected, sendMessage, startTyping, stopTyping } = useSocket();

  useEffect(() => {
    // Auto-focus the textarea when component mounts or reply changes
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyTo]);

  useEffect(() => {
    // Listen for message sent confirmation
    if (socket) {
      const handleMessageSent = (data) => {
        setIsSending(false);
        setMessage('');
        if (onCancelReply) {
          onCancelReply();
        }
      };

      const handleError = (error) => {
        setIsSending(false);
        console.error('Message error:', error);
        // Only show message-related errors to user
        if (error.message && !error.message.includes('Failed to join room') && !error.message.includes('Failed to leave room')) {
          // Show error to user for actual message failures
          alert(`Failed to send message: ${error.message}`);
        }
      };

      socket.on('message-sent', handleMessageSent);
      socket.on('error', handleError);

      return () => {
        socket.off('message-sent', handleMessageSent);
        socket.off('error', handleError);
      };
    }
  }, [socket, onCancelReply]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }

    // Handle typing indicators
    if (value.trim() && isConnected) {
      if (!isTyping) {
        setIsTyping(true);
        startTyping(roomId);
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        stopTyping(roomId);
      }, 1000);
    } else if (isTyping) {
      setIsTyping(false);
      stopTyping(roomId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!message.trim() || !isConnected || isSending) {
      return;
    }

    if (message.length > 2000) {
      alert('Message is too long. Maximum 2000 characters allowed.');
      return;
    }

    setIsSending(true);

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      stopTyping(roomId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }

    // Generate temporary ID for tracking
    const tempId = Date.now().toString();

    // Send message via Socket.IO
    if (socket) {
      socket.emit('send-message', {
        roomId,
        content: message.trim(),
        messageType: 'text',
        replyTo: replyTo?._id || null,
        tempId
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCancelReply = () => {
    if (onCancelReply) {
      onCancelReply();
    }
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const getPlaceholderText = () => {
    if (!isConnected) return 'Connecting...';
    if (replyTo) return `Reply to ${replyTo.sender.name}...`;
    return 'Type a message...';
  };

  return (
    <div className="message-form-container">
      {replyTo && (
        <div className="reply-preview">
          <div className="reply-content">
            <div className="reply-header">
              <span className="reply-icon">↳</span>
              <span className="reply-to">Replying to {replyTo.sender.name}</span>
              <button 
                className="cancel-reply-btn"
                onClick={handleCancelReply}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="reply-message">
              {replyTo.content.length > 100 
                ? `${replyTo.content.substring(0, 100)}...` 
                : replyTo.content
              }
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="message-form">
        <div className="message-input-wrapper">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={getPlaceholderText()}
            className="message-textarea"
            disabled={!isConnected || isSending}
            maxLength={2000}
            rows={1}
          />
          
          <div className="message-actions">
            <div className="character-count">
              <span className={message.length > 1800 ? 'warning' : ''}>
                {message.length}/2000
              </span>
            </div>
            
            <button 
              type="submit" 
              className="send-button"
              disabled={!message.trim() || !isConnected || isSending}
            >
              {isSending ? (
                <div className="sending-spinner"></div>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
        
        {!isConnected && (
          <div className="connection-warning">
            <span className="warning-icon">⚠️</span>
            Connection lost. Trying to reconnect...
          </div>
        )}
      </form>
    </div>
  );
};

export default MessageForm;
