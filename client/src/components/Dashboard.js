import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import ChatRoom from "./chat/ChatRoom";
import DirectMessages from "./chat/DirectMessages";
import RoomList from "./rooms/RoomList";
import CreateRoom from "./rooms/CreateRoom";
import UserProfile from "./profile/UserProfile";
import LoadingScreen from "./common/LoadingScreen";
import CallComponent from "./call/CallComponent";
import useAuthStore from "../store/authStore";
import useChatStore from "../store/chatStore";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { fetchRooms, fetchUsers } = useChatStore();
  const [activeTab, setActiveTab] = useState("rooms");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeDashboard = async () => {
      if (user && isAuthenticated) {
        try {
          await Promise.all([fetchRooms(), fetchUsers()]);
          // Add a small delay to show the loading screen
          setTimeout(() => {
            setIsInitializing(false);
          }, 1500);
        } catch (error) {
          console.error("Error initializing dashboard:", error);
          setIsInitializing(false);
        }
      } else if (!isAuthenticated || !user) {
        // Redirect to login if not authenticated or no user
        navigate("/login");
      }
    };

    initializeDashboard();
  }, [fetchRooms, fetchUsers, user, isAuthenticated, navigate]);

  const handleLogout = async () => {
    await logout();
  };

  if (isInitializing) {
    return <LoadingScreen message="Loading your chat rooms..." />;
  }

  return (
    <div className="dashboard-container">
      {/* Mobile hamburger menu button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        <span className={`hamburger ${sidebarOpen ? "open" : ""}`}>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-content">
        <Routes>
          <Route path="/" element={<RoomList />} />
          <Route path="/room/:roomId" element={<ChatRoom />} />
          <Route path="/direct-messages" element={<DirectMessages />} />
          <Route path="/create-room" element={<CreateRoom />} />
          <Route path="/profile" element={<UserProfile />} />
        </Routes>
      </div>

      {/* Global call UI: outgoing (from store) and incoming (from socket) */}
      <CallComponent />
    </div>
  );
};

export default Dashboard;
