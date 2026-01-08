import { create } from "zustand";
import io from "socket.io-client";
import axios from "axios";
import notificationService from "../services/notificationService";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5001";
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5001";

const useChatStore = create((set, get) => ({
  // State
  rooms: [],
  currentRoom: null,
  messages: [],
  users: [],
  socket: null,
  isConnected: false,
  isLoading: false,
  error: null,
  typingUsers: new Set(),

  // Socket connection
  initializeSocket: () => {
    if (get().socket) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: {
        token: token,
      },
    });

    socket.on("connect", () => {
      console.log("Connected to server");
      set({ socket, isConnected: true });
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      set({ isConnected: false });
    });

    socket.on("new_message", (data) => {
      const { messages, currentRoom } = get();
      const message = data.message; // Extract message from data.message
      const messageExists = messages.some((m) => m._id === message._id);
      if (!messageExists) {
        set({ messages: [...messages, message] });

        // Show notification if not in current room or page not visible
        if (currentRoom?._id !== message.room) {
          const roomName = currentRoom?.name || "Unknown Room";

          // Check if message mentions current user
          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          const isMention = message.mentions?.some(
            (mention) => mention._id === currentUser._id
          );

          if (isMention) {
            notificationService.showMentionNotification(message, roomName);
          } else if (message.attachment) {
            notificationService.showFileNotification(message, roomName);
          } else {
            notificationService.showMessageNotification(message, roomName);
          }

          // Play sound and vibrate
          notificationService.playNotificationSound();
          notificationService.vibrate();
        }
      }
    });

    socket.on("user_joined", (data) => {
      console.log("User joined:", data);
    });

    socket.on("user_left", (data) => {
      console.log("User left:", data);
    });

    socket.on("typing_start", (data) => {
      const { typingUsers } = get();
      const newTypingUsers = new Set(typingUsers);
      newTypingUsers.add(data.username);
      set({ typingUsers: newTypingUsers });
    });

    socket.on("typing_stop", (data) => {
      const { typingUsers } = get();
      const newTypingUsers = new Set(typingUsers);
      newTypingUsers.delete(data.username);
      set({ typingUsers: newTypingUsers });
    });

    socket.on("reaction_added", (data) => {
      const { messageId, reactions } = data;
      const { messages, currentRoom } = get();
      const updatedMessages = messages.map((msg) =>
        msg._id === messageId ? { ...msg, reactions } : msg
      );
      set({ messages: updatedMessages });

      // Show notification for reactions on your messages
      const message = messages.find((m) => m._id === messageId);
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const isOwnMessage = message?.sender?._id === currentUser._id;

      if (isOwnMessage && reactions.length > 0) {
        const latestReaction = reactions[reactions.length - 1];
        const roomName = currentRoom?.name || "Unknown Room";
        notificationService.showReactionNotification(
          message,
          latestReaction,
          roomName
        );
        notificationService.playNotificationSound();
      }
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  // Room management
  fetchRooms: async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/api/rooms/my-rooms`);
      set({ rooms: response.data });
    } catch (error) {
      console.error("Fetch rooms error:", error);
      if (error.response?.status === 401) {
        set({ rooms: [] });
      }
    }
  },

  fetchPublicRooms: async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      set({ rooms: [], isLoading: false });
      return;
    }

    try {
      set({ isLoading: true, error: null, rooms: [] });
      const response = await axios.get(`${API_BASE_URL}/api/rooms/public`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const rooms = response.data.rooms || [];
      set({ rooms: Array.isArray(rooms) ? rooms : [], isLoading: false });
    } catch (error) {
      console.error("Fetch public rooms error:", error);
      set({
        rooms: [],
        isLoading: false,
        error: error.response?.data?.message || "Failed to fetch rooms",
      });
    }
  },

  createRoom: async (roomData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/rooms`, roomData);
      const newRoom = response.data.room;

      // Ensure rooms is iterable
      const currentRooms = Array.isArray(get().rooms) ? get().rooms : [];

      set({ rooms: [...currentRooms, newRoom] });

      await get().fetchPublicRooms();

      return { success: true, room: newRoom };
    } catch (error) {
      console.error("Create room error:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to create room",
      };
    }
  },

  setCurrentRoom: (room) => {
    if (room && room._id) {
      set({ currentRoom: room });
      get().fetchMessages(room._id);
    }
  },

  fetchRoom: async (roomId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/rooms/${roomId}`);
      return response.data;
    } catch (error) {
      console.error("Fetch room error:", error);
      return null;
    }
  },

  // Message management
  fetchMessages: async (roomId, page = 1) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/messages/room/${roomId}?page=${page}`
      );
      set({ messages: response.data.messages || [] });
    } catch (error) {
      console.error("Fetch messages error:", error);
      if (error.response?.status === 401) {
        set({ messages: [] });
      }
    }
  },

  searchMessages: async (query, roomId = null, page = 1) => {
    const token = localStorage.getItem("token");
    if (!token) return { success: false, error: "Not authenticated" };

    try {
      const params = new URLSearchParams({
        q: query,
        page: page,
        limit: 20,
      });

      if (roomId) {
        params.append("roomId", roomId);
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/messages/search?${params}`
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error("Search messages error:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Search failed",
      };
    }
  },

  sendMessage: async (
    content,
    roomId,
    messageType = "text",
    attachment = null,
    replyTo = null
  ) => {
    const { socket } = get();
    if (!socket) return { success: false, error: "Socket not connected" };

    try {
      // Emit message via socket for real-time delivery
      socket.emit("send_message", {
        roomId,
        content,
        messageType,
        attachment,
        replyTo,
      });

      return { success: true };
    } catch (error) {
      console.error("Send message error:", error);
      return {
        success: false,
        error: "Failed to send message",
      };
    }
  },

  addReaction: (messageId, emoji) => {
    const { socket } = get();
    if (!socket) return { success: false, error: "Socket not connected" };

    try {
      // Emit reaction via socket for real-time delivery
      socket.emit("add_reaction", {
        messageId,
        emoji,
      });
      return { success: true };
    } catch (error) {
      console.error("Add reaction error:", error);
      return {
        success: false,
        error: "Failed to add reaction",
      };
    }
  },

  // User management
  fetchUsers: async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      set({ users: [] });
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/users`);
      const users = response.data.users || [];
      set({ users: Array.isArray(users) ? users : [] });
    } catch (error) {
      console.error("Fetch users error:", error);
      set({ users: [] });
      if (error.response?.status === 401) {
        set({ users: [] });
      }
    }
  },

  // Room functions
  joinRoom: async (roomId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/rooms/${roomId}/join`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { socket } = get();
      if (socket) {
        socket.emit("join_room", { roomId });
      }

      // Refresh the rooms list to update membership status
      await get().fetchPublicRooms();

      return { success: true, room: response.data.room };
    } catch (error) {
      console.error("Join room error:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to join room",
      };
    }
  },

  // Socket-only room joining (for when user is already a member)
  joinRoomSocket: (roomId) => {
    const { socket } = get();
    if (socket) {
      socket.emit("join_room", { roomId });
    }
  },

  leaveRoom: (roomId) => {
    const { socket } = get();
    if (socket) {
      socket.emit("leave_room", { roomId });
    }
  },

  // Typing functions
  startTyping: () => {
    const { socket, currentRoom } = get();
    if (socket && currentRoom) {
      socket.emit("typing_start", { roomId: currentRoom._id });
    }
  },

  stopTyping: () => {
    const { socket, currentRoom } = get();
    if (socket && currentRoom) {
      socket.emit("typing_stop", { roomId: currentRoom._id });
    }
  },

  // Clear state
  clearMessages: () => {
    set({ messages: [] });
  },

  clearCurrentRoom: () => {
    set({ currentRoom: null, messages: [] });
  },
}));

export default useChatStore;
