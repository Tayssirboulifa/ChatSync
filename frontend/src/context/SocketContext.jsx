import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children, user }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState({});
  const [currentRoom, setCurrentRoom] = useState(null);
  const [joinedRooms, setJoinedRooms] = useState(new Set());

  // Get token from localStorage
  const getToken = () => localStorage.getItem('accessToken');

  useEffect(() => {
    const token = getToken();
    if (token && user) {
      // Initialize socket connection
      const newSocket = io('http://localhost:5000', {
        auth: {
          token: token
        },
        autoConnect: true
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
        setActiveUsers({});
        setCurrentRoom(null);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setIsConnected(false);
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        // Don't show join/leave errors to user as they're handled internally
        if (!error.message.includes('Failed to join room') && !error.message.includes('Failed to leave room')) {
          // Handle other errors
        }
      });

      // Chat room event handlers
      newSocket.on('joined-room', (data) => {
        console.log('Joined room:', data);
        setCurrentRoom(data.roomId);
        setActiveUsers(prev => ({
          ...prev,
          [data.roomId]: data.activeUsers
        }));
      });

      newSocket.on('left-room', (data) => {
        console.log('Left room:', data);
        if (currentRoom === data.roomId) {
          setCurrentRoom(null);
        }
        setActiveUsers(prev => {
          const updated = { ...prev };
          delete updated[data.roomId];
          return updated;
        });
      });

      newSocket.on('user-joined-room', (data) => {
        console.log('User joined room:', data);
        setActiveUsers(prev => ({
          ...prev,
          [data.roomId]: data.activeUsers
        }));
      });

      newSocket.on('user-left-room', (data) => {
        console.log('User left room:', data);
        setActiveUsers(prev => ({
          ...prev,
          [data.roomId]: data.activeUsers
        }));
      });

      newSocket.on('user-status-updated', (data) => {
        console.log('User status updated:', data);
        setActiveUsers(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(roomId => {
            updated[roomId] = updated[roomId].map(activeUser => 
              activeUser.user._id === data.userId 
                ? { ...activeUser, user: { ...activeUser.user, status: data.status } }
                : activeUser
            );
          });
          return updated;
        });
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
        setActiveUsers({});
        setCurrentRoom(null);
      };
    }
  }, [user]);

  const joinRoom = (roomId) => {
    if (socket && isConnected && roomId) {
      // Prevent multiple join calls for the same room
      if (joinedRooms.has(roomId)) {
        console.log('Already in room:', roomId);
        return;
      }

      console.log('Joining room:', roomId);
      socket.emit('join-room', { roomId });
      setJoinedRooms(prev => new Set([...prev, roomId]));
    }
  };

  const leaveRoom = (roomId) => {
    if (socket && roomId) {
      // Only leave if we're actually in the room
      if (!joinedRooms.has(roomId)) {
        console.log('Not in room:', roomId);
        return;
      }

      console.log('Leaving room:', roomId);
      socket.emit('leave-room', { roomId });
      setJoinedRooms(prev => {
        const newSet = new Set(prev);
        newSet.delete(roomId);
        return newSet;
      });
    }
  };

  const sendMessage = (roomId, message) => {
    if (socket && isConnected) {
      socket.emit('send-message', { roomId, message });
    }
  };

  const updateStatus = (status) => {
    if (socket && isConnected) {
      socket.emit('update-status', { status });
    }
  };

  const startTyping = (roomId) => {
    if (socket && isConnected) {
      socket.emit('typing-start', { roomId });
    }
  };

  const stopTyping = (roomId) => {
    if (socket && isConnected) {
      socket.emit('typing-stop', { roomId });
    }
  };

  const value = {
    socket,
    isConnected,
    activeUsers,
    currentRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    updateStatus,
    startTyping,
    stopTyping
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
