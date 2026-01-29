import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { FiImage, FiUsers, FiSettings, FiSearch } from "react-icons/fi";
import useChatStore from "../../store/chatStore";
import useAuthStore from "../../store/authStore";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import RoomSettings from "./RoomSettings";
import MemberList from "./MemberList";
import SearchMessages from "./SearchMessages";
import LoadingScreen from "../common/LoadingScreen";
import "./ChatRoom.css";

const ChatRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const {
    currentRoom,
    messages,
    setCurrentRoom,
    fetchMessages,
    fetchRoom,
    error,
    typingUsers,
    joinRoomSocket,
    leaveRoom,
  } = useChatStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [selectedBackground, setSelectedBackground] = useState(() => {
    return localStorage.getItem("chatBackground") || "default";
  });
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showMemberList, setShowMemberList] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const messagesEndRef = useRef(null);

  const backgroundOptions = [
    {
      id: "default",
      name: "Default",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    },
    {
      id: "nature",
      name: "Nature",
      gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    },
    {
      id: "sunset",
      name: "Sunset",
      gradient: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    },
    {
      id: "ocean",
      name: "Ocean",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    },
    {
      id: "forest",
      name: "Forest",
      gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    },
    {
      id: "space",
      name: "Space",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    },
  ];

  useEffect(() => {
    const loadRoom = async () => {
      try {
        setLoading(true);

        // First, find the room in the rooms list
        const { rooms } = useChatStore.getState();
        const room = rooms.find((r) => r._id === roomId);

        if (room) {
          // Set the current room
          setCurrentRoom(room);
          // Join the room via socket only
          joinRoomSocket(roomId);
          // Fetch messages for the room
          await fetchMessages(roomId);
        } else {
          // If room not found in list, try to fetch it
          const fetchedRoom = await fetchRoom(roomId);
          if (fetchedRoom) {
            setCurrentRoom(fetchedRoom);
            // Join the room via socket only
            joinRoomSocket(roomId);
            // Fetch messages for the room
            await fetchMessages(roomId);
          } else {
            toast.error("Room not found");
            navigate("/dashboard");
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading room:", error);
        if (error.response?.status === 401) {
          // User not authenticated, redirect to login
          navigate("/login");
        } else {
          toast.error("Failed to load room");
          navigate("/dashboard");
        }
      }
    };

    if (roomId && user) {
      loadRoom();
    } else if (roomId && !user) {
      navigate("/login");
    }
  }, [
    roomId,
    fetchMessages,
    fetchRoom,
    setCurrentRoom,
    navigate,
    user,
    joinRoomSocket,
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup: leave room when component unmounts
  useEffect(() => {
    return () => {
      if (roomId) {
        leaveRoom(roomId);
      }
    };
  }, [roomId, leaveRoom]);

  if (loading) {
    return <LoadingScreen message="Loading chat room..." />;
  }

  if (error) {
    return (
      <div className="chat-container">
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/dashboard")}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const getRoomInitials = (roomName) => {
    return roomName
      ? roomName
          .split(" ")
          .map((word) => word[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "RM";
  };

  const getMemberCount = () => {
    return currentRoom?.members?.length || 0;
  };

  const handleReply = (message) => {
    setReplyingTo(message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  return (
    <div className="chat-container">
      {/* Enhanced Chat Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="room-avatar">
            {getRoomInitials(currentRoom?.name)}
          </div>
          <div className="room-details">
            <h3>{currentRoom?.name || "Loading..."}</h3>
            <p>
              {getMemberCount()} members • {messages.length} messages
            </p>
          </div>
        </div>
        <div className="chat-header-actions">
          <button
            className="header-action-btn"
            onClick={() => setShowSearch(true)}
            title="Search Messages"
          >
            <FiSearch />
          </button>
          <button
            className="header-action-btn"
            onClick={() => setShowBackgroundSelector(!showBackgroundSelector)}
            title="Change Background"
          >
            <FiImage />
          </button>
          <button
            className="header-action-btn"
            onClick={() => setShowRoomSettings(true)}
            title="Room Settings"
          >
            <FiSettings />
          </button>
          <button
            className="header-action-btn"
            onClick={() => setShowMemberList(true)}
            title="View Members"
          >
            <FiUsers />
          </button>
        </div>
      </div>

      {/* Background Selector */}
      {showBackgroundSelector && (
        <div className="background-selector">
          <div className="bg-options">
            {backgroundOptions.map((bg) => (
              <div
                key={bg.id}
                className={`bg-option bg-${bg.id} ${selectedBackground === bg.id ? "active" : ""}`}
                onClick={() => {
                  setSelectedBackground(bg.id);
                  localStorage.setItem("chatBackground", bg.id);
                  setShowBackgroundSelector(false);
                  toast.success(`${bg.name} background applied!`);
                }}
                title={bg.name}
              />
            ))}
          </div>
        </div>
      )}

      <div className={`chat-messages bg-${selectedBackground}`}>
        <MessageList messages={messages} onReply={handleReply} />

        {/* Typing Indicator */}
        {typingUsers && typingUsers.size > 0 && (
          <div className="typing-indicator">
            <span>{Array.from(typingUsers).join(", ")} is typing</span>
            <div className="typing-dots">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        roomId={roomId}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
      />

      {/* Room Settings Modal */}
      {showRoomSettings && (
        <RoomSettings
          room={currentRoom}
          onClose={() => setShowRoomSettings(false)}
          onUpdate={(updatedRoom) => {
            // Update the current room in the store
            useChatStore.getState().setCurrentRoom(updatedRoom);
            setShowRoomSettings(false);
          }}
        />
      )}

      {/* Member List Modal */}
      {showMemberList && (
        <MemberList
          room={currentRoom}
          onClose={() => setShowMemberList(false)}
        />
      )}

      {/* Search Messages Modal */}
      {showSearch && (
        <SearchMessages
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          currentRoomId={roomId}
          localMessages={messages}
          currentRoomName={currentRoom?.name}
        />
      )}
    </div>
  );
};

export default ChatRoom;
