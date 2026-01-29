import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMessageCircle, FiSearch } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import './DirectMessages.css';

const DirectMessages = () => {
  const navigate = useNavigate();
  const { users, fetchUsers, startDirectMessage } = useChatStore();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (!Array.isArray(users) || !user || !user._id) {
      setFilteredUsers([]);
      return;
    }

    const search = searchTerm.toLowerCase();
    const filtered = users.filter((userItem) =>
      userItem &&
      userItem.username &&
      userItem._id &&
      userItem._id !== user._id &&
      userItem.username.toLowerCase().includes(search)
    );

    setFilteredUsers(filtered);
  }, [users, searchTerm, user]);

  const handleStartConversation = async (otherUser) => {
    try {
      const result = await startDirectMessage(otherUser._id, otherUser.username);
      if (result?.success && result.room?._id) {
        navigate(`/dashboard/room/${result.room._id}`);
      } else {
        toast.error(result?.error || 'Could not start direct message');
      }
    } catch (error) {
      console.error('Start conversation error:', error);
      toast.error('Something went wrong starting the conversation');
    }
  };

  return (
    <div className="direct-messages-container">
      <div className="direct-messages-header">
        <h1>Direct Messages</h1>
        <p>Start private conversations with other users</p>
      </div>

      <div className="search-container">
        <div className="search-input-wrapper">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="users-list">
        {filteredUsers.length === 0 ? (
          <div className="empty-state">
            <FiMessageCircle className="empty-icon" />
            <h3>No users found</h3>
            <p>
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'No other users available at the moment'
              }
            </p>
          </div>
        ) : (
          filteredUsers.map((otherUser) => (
            <div key={otherUser._id} className="user-item">
              <div className="user-avatar">
                {otherUser.avatar ? (
                  <img src={otherUser.avatar} alt={otherUser.username} />
                ) : (
                  <div className="avatar-placeholder">
                    {otherUser.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={`status-indicator ${otherUser.isOnline ? 'online' : 'offline'}`}></div>
              </div>
              
              <div className="user-info">
                <h3 className="user-name">{otherUser.username}</h3>
                <span className="user-status">
                  {otherUser.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              <button
                className="message-button"
                onClick={() => handleStartConversation(otherUser)}
              >
                <FiMessageCircle />
                Message
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DirectMessages;
