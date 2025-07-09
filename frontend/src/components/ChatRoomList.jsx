import { useState, useEffect } from 'react';
import { authAPI, chatRoomAPI } from '../utils/axiosConfig';
import CreateChatRoomForm from './CreateChatRoomForm';
import './ChatRoomList.css';

const ChatRoomList = ({ user, onRoomSelect }) => {
  const [chatRooms, setChatRooms] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('public');
  const [joinLoading, setJoinLoading] = useState(new Set());

  useEffect(() => {
    fetchChatRooms();
    fetchMyRooms();
  }, []);

  const fetchChatRooms = async () => {
    try {
      const response = await chatRoomAPI.getChatRooms({ search: searchTerm });
      setChatRooms(response.data.chatRooms);
    } catch (error) {
      console.error('Fetch chat rooms error:', error);
      setError('Failed to load chat rooms');
    }
  };

  const fetchMyRooms = async () => {
    try {
      const response = await chatRoomAPI.getMyRooms();
      setMyRooms(response.data);
    } catch (error) {
      console.error('Fetch my rooms error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (activeTab === 'public') {
        fetchChatRooms();
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, activeTab]);

  const handleJoinRoom = async (roomId) => {
    setJoinLoading(prev => new Set(prev).add(roomId));

    try {
      await chatRoomAPI.joinRoom(roomId);
      await fetchMyRooms();
      await fetchChatRooms();
    } catch (error) {
      console.error('Join room error:', error);
      setError(error.response?.data?.message || 'Failed to join room');
    } finally {
      setJoinLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(roomId);
        return newSet;
      });
    }
  };

  const handleLeaveRoom = async (roomId) => {
    setJoinLoading(prev => new Set(prev).add(roomId));

    try {
      await chatRoomAPI.leaveRoom(roomId);
      await fetchMyRooms();
      await fetchChatRooms();
    } catch (error) {
      console.error('Leave room error:', error);
      setError(error.response?.data?.message || 'Failed to leave room');
    } finally {
      setJoinLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(roomId);
        return newSet;
      });
    }
  };

  const handleRoomCreated = (newRoom) => {
    setMyRooms(prev => [newRoom, ...prev]);
    setShowCreateForm(false);
    setActiveTab('my-rooms');
  };

  const isUserMember = (room) => {
    return room.members.some(member => member.user._id === user.id);
  };

  const formatLastActivity = (date) => {
    const now = new Date();
    const activity = new Date(date);
    const diffInHours = (now - activity) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Active now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  const renderRoomCard = (room, showJoinLeave = true) => (
    <div key={room._id} className="room-card">
      <div className="room-header">
        <div className="room-info">
          <h3 className="room-name">{room.name}</h3>
          <div className="room-meta">
            <span className="room-type">{room.type}</span>
            <span className="room-members">{room.memberCount} members</span>
            <span className="room-active">{room.activeUserCount} online</span>
          </div>
        </div>
        <div className="room-actions">
          {showJoinLeave && (
            <>
              {isUserMember(room) ? (
                <>
                  <button
                    className="join-button"
                    onClick={() => onRoomSelect && onRoomSelect(room)}
                  >
                    Enter
                  </button>
                  {room.creator._id !== user.id && (
                    <button
                      className="leave-button"
                      onClick={() => handleLeaveRoom(room._id)}
                      disabled={joinLoading.has(room._id)}
                    >
                      {joinLoading.has(room._id) ? 'Leaving...' : 'Leave'}
                    </button>
                  )}
                </>
              ) : (
                <button
                  className="join-button"
                  onClick={() => handleJoinRoom(room._id)}
                  disabled={joinLoading.has(room._id)}
                >
                  {joinLoading.has(room._id) ? 'Joining...' : 'Join'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      
      {room.description && (
        <p className="room-description">{room.description}</p>
      )}
      
      <div className="room-footer">
        <div className="room-creator">
          Created by {room.creator.name}
        </div>
        <div className="room-activity">
          {formatLastActivity(room.lastActivity)}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="chat-rooms-container">
        <div className="loading">Loading chat rooms...</div>
      </div>
    );
  }

  return (
    <div className="chat-rooms-container">
      <div className="chat-rooms-header">
        <h2>Chat Rooms</h2>
        <button
          className="create-room-button"
          onClick={() => setShowCreateForm(true)}
        >
          + Create Room
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')} className="close-error">×</button>
        </div>
      )}

      <div className="chat-rooms-tabs">
        <button
          className={`tab-button ${activeTab === 'public' ? 'active' : ''}`}
          onClick={() => setActiveTab('public')}
        >
          Public Rooms
        </button>
        <button
          className={`tab-button ${activeTab === 'my-rooms' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-rooms')}
        >
          My Rooms ({myRooms.length})
        </button>
      </div>

      {activeTab === 'public' && (
        <div className="search-container">
          <input
            type="text"
            placeholder="Search rooms..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
      )}

      <div className="rooms-list">
        {activeTab === 'public' ? (
          chatRooms.length > 0 ? (
            chatRooms.map(room => renderRoomCard(room))
          ) : (
            <div className="no-rooms">
              {searchTerm ? 'No rooms found matching your search.' : 'No public rooms available.'}
            </div>
          )
        ) : (
          myRooms.length > 0 ? (
            myRooms.map(room => renderRoomCard(room, false))
          ) : (
            <div className="no-rooms">
              You haven't joined any rooms yet. Join a public room or create your own!
            </div>
          )
        )}
      </div>

      {showCreateForm && (
        <CreateChatRoomForm
          onRoomCreated={handleRoomCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
};

export default ChatRoomList;
