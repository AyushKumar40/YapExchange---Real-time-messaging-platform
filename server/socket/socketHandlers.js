const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Room = require("../models/Room");
const Message = require("../models/Message");

const setupSocketHandlers = (io) => {
  // Store connected users
  const connectedUsers = new Map();

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket) => {
    console.log(`User connected: ${socket.user.username}`);

    // Store user connection
    connectedUsers.set(socket.user._id.toString(), {
      socketId: socket.id,
      user: socket.user,
    });

    // Update user online status
    await User.findByIdAndUpdate(socket.user._id, {
      isOnline: true,
      lastSeen: new Date(),
    });

    // Join user's rooms
    const userRooms = await Room.find({
      "members.user": socket.user._id,
      isActive: true,
    });

    userRooms.forEach((room) => {
      socket.join(room._id.toString());
    });

    // Notify others that user is online
    socket.broadcast.emit("user_online", {
      userId: socket.user._id,
      username: socket.user.username,
    });

    // Handle joining a room
    socket.on("join_room", async (data) => {
      try {
        const { roomId } = data;
        const room = await Room.findById(roomId);

        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        // Check if user is a member
        const isMember = room.members.some(
          (member) => member.user.toString() === socket.user._id.toString(),
        );

        if (room.isPrivate && !isMember) {
          socket.emit("error", { message: "Access denied" });
          return;
        }

        socket.join(roomId);
        socket.emit("room_joined", { roomId });

        // Notify room members
        socket.to(roomId).emit("user_joined_room", {
          roomId,
          user: {
            _id: socket.user._id,
            username: socket.user.username,
            avatar: socket.user.avatar,
          },
        });
      } catch (error) {
        console.error("Join room error:", error);
        socket.emit("error", { message: "Server error" });
      }
    });

    // Handle leaving a room
    socket.on("leave_room", async (data) => {
      try {
        const { roomId } = data;
        socket.leave(roomId);
        socket.emit("room_left", { roomId });

        // Notify room members
        socket.to(roomId).emit("user_left_room", {
          roomId,
          user: {
            _id: socket.user._id,
            username: socket.user.username,
          },
        });
      } catch (error) {
        console.error("Leave room error:", error);
        socket.emit("error", { message: "Server error" });
      }
    });

    // Handle sending a message
    socket.on("send_message", async (data) => {
      try {
        const {
          roomId,
          content,
          messageType = "text",
          replyTo,
          attachment,
        } = data;

        // Validate room access
        const room = await Room.findById(roomId);
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        const isMember = room.members.some(
          (member) => member.user.toString() === socket.user._id.toString(),
        );

        if (room.isPrivate && !isMember) {
          socket.emit("error", { message: "Access denied" });
          return;
        }

        // Process mentions
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
          const username = match[1];
          const user = await User.findOne({ username });
          if (user) {
            mentions.push(user._id);
          }
        }

        // Create message
        const message = new Message({
          content,
          sender: socket.user._id,
          room: roomId,
          messageType,
          replyTo: replyTo || null,
          attachment: attachment || null,
          mentions,
        });

        await message.save();
        await message.populate("sender", "username avatar");
        await message.populate("replyTo", "content sender");
        await message.populate("mentions", "username avatar");

        // Emit to room
        io.to(roomId).emit("new_message", { message });

        // Store message in database (already done above)
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("error", { message: "Server error" });
      }
    });

    // Handle typing indicator
    socket.on("typing_start", (data) => {
      const { roomId } = data;
      socket.to(roomId).emit("typing_start", {
        roomId,
        username: socket.user.username,
      });
    });

    socket.on("typing_stop", (data) => {
      const { roomId } = data;
      socket.to(roomId).emit("typing_stop", {
        roomId,
        username: socket.user.username,
      });
    });

    // Handle message reactions
    socket.on("add_reaction", async (data) => {
      try {
        const { messageId, emoji } = data;

        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit("error", { message: "Message not found" });
          return;
        }

        // Check if user already reacted with this emoji
        const existingReaction = message.reactions.find(
          (reaction) =>
            reaction.user.toString() === socket.user._id.toString() &&
            reaction.emoji === emoji,
        );

        if (existingReaction) {
          // Remove reaction
          message.reactions = message.reactions.filter(
            (reaction) =>
              !(
                reaction.user.toString() === socket.user._id.toString() &&
                reaction.emoji === emoji
              ),
          );
        } else {
          // Add reaction
          message.reactions.push({
            user: socket.user._id,
            emoji,
          });
        }

        await message.save();
        await message.populate("reactions.user", "username avatar");

        // Emit to room
        io.to(message.room.toString()).emit("reaction_added", {
          messageId: message._id,
          reactions: message.reactions,
        });
      } catch (error) {
        console.error("Add reaction error:", error);
        socket.emit("error", { message: "Server error" });
      }
    });

    // Handle direct messages
    socket.on("send_direct_message", async (data) => {
      try {
        const {
          recipientId,
          content = "",
          messageType = "text",
          attachment = null,
          replyTo = null,
        } = data || {};

        if (!recipientId) {
          socket.emit("error", { message: "Recipient is required" });
          return;
        }

        // Find or create direct message room
        let room = await Room.findOne({
          isDirectMessage: true,
          participants: { $all: [socket.user._id, recipientId] },
          "members.user": { $all: [socket.user._id, recipientId] },
        });

        if (!room) {
          // Create new direct message room
          room = new Room({
            name: `DM-${socket.user._id}-${recipientId}`,
            isDirectMessage: true,
            creator: socket.user._id,
            participants: [socket.user._id, recipientId],
            members: [
              { user: socket.user._id, role: "member" },
              { user: recipientId, role: "member" },
            ],
          });
          await room.save();
        }

        // Process @mentions in DM text content (optional but consistent with rooms)
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
          const username = match[1];
          const mentionedUser = await User.findOne({ username });
          if (mentionedUser) {
            mentions.push(mentionedUser._id);
          }
        }

        // Create message (supports text, audio, files, replies)
        const message = new Message({
          content,
          sender: socket.user._id,
          room: room._id,
          messageType,
          recipient: recipientId,
          attachment: attachment || null,
          replyTo: replyTo || null,
          mentions,
        });

        await message.save();
        await message.populate("sender", "username avatar");
        await message.populate("replyTo", "content sender");
        await message.populate("mentions", "username avatar");

        // Emit to both users
        const recipientSocket = connectedUsers.get(recipientId.toString());
        if (recipientSocket) {
          io.to(recipientSocket.socketId).emit("new_direct_message", {
            message,
          });
        }
        socket.emit("message_sent", { message });
      } catch (error) {
        console.error("Send direct message error:", error);
        socket.emit("error", { message: "Server error" });
      }
    });

    // Handle message reactions
    socket.on("add_reaction", async (data) => {
      try {
        const { messageId, emoji } = data;

        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit("error", { message: "Message not found" });
          return;
        }

        // Check if user already reacted
        const existingReaction = message.reactions.find(
          (reaction) =>
            reaction.user.toString() === socket.user._id.toString() &&
            reaction.emoji === emoji,
        );

        if (existingReaction) {
          // Remove reaction
          message.reactions = message.reactions.filter(
            (reaction) =>
              !(
                reaction.user.toString() === socket.user._id.toString() &&
                reaction.emoji === emoji
              ),
          );
        } else {
          // Add reaction
          message.reactions.push({
            user: socket.user._id,
            emoji,
          });
        }

        await message.save();
        await message.populate("reactions.user", "username avatar");

        // Emit to room
        io.to(message.room.toString()).emit("message_reaction_updated", {
          message,
        });
      } catch (error) {
        console.error("Add reaction error:", error);
        socket.emit("error", { message: "Server error" });
      }
    });

    // WebRTC call signaling (use userId; server resolves to socketId via connectedUsers)
    socket.on("call-user", ({ userToCall, signalData, from, isVideoCall }) => {
      const target = connectedUsers.get(userToCall?.toString());
      if (!target) {
        socket.emit("call-failed", {
          message: "User is offline or unavailable",
        });
        return;
      }
      io.to(target.socketId).emit("incoming-call", {
        signal: signalData,
        from: socket.user._id,
        fromUsername: socket.user.username,
        isVideoCall: !!isVideoCall,
      });
    });

    socket.on("answer-call", ({ to, signal }) => {
      const target = connectedUsers.get(to?.toString());
      if (!target) return;
      io.to(target.socketId).emit("call-accepted", signal);
    });

    socket.on("ice-candidate", ({ to, candidate }) => {
      const target = connectedUsers.get(to?.toString());
      if (!target) return;
      io.to(target.socketId).emit("ice-candidate", candidate);
    });

    socket.on("reject-call", ({ to }) => {
      const target = connectedUsers.get(to?.toString());
      if (!target) return;
      io.to(target.socketId).emit("call-rejected");
    });

    socket.on("end-call", ({ to }) => {
      const target = connectedUsers.get(to?.toString());
      if (target) io.to(target.socketId).emit("call-ended");
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.user.username}`);

      // Remove from connected users
      connectedUsers.delete(socket.user._id.toString());

      // Update user offline status
      await User.findByIdAndUpdate(socket.user._id, {
        isOnline: false,
        lastSeen: new Date(),
      });

      // Notify others that user is offline
      socket.broadcast.emit("user_offline", {
        userId: socket.user._id,
        username: socket.user.username,
      });
    });
  });

  return io;
};

module.exports = { setupSocketHandlers };
