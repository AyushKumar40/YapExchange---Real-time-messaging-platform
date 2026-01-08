const express = require("express");
const Message = require("../models/Message");
const Room = require("../models/Room");
const auth = require("../middleware/auth");

const router = express.Router();

// Create a new message
router.post("/", auth, async (req, res) => {
  try {
    const { content, roomId, replyTo } = req.body;

    if (!content || !roomId) {
      return res
        .status(400)
        .json({ message: "Content and roomId are required" });
    }

    // Check if user is a member of the room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const isMember = room.members.some(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (room.isPrivate && !isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Create the message
    const message = new Message({
      content,
      sender: req.user._id,
      room: roomId,
      replyTo: replyTo || null,
    });

    await message.save();
    await message.populate("sender", "username avatar");
    if (replyTo) {
      await message.populate("replyTo", "content sender");
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error("Create message error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get messages for a room
router.get("/room/:roomId", auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const roomId = req.params.roomId;

    // Check if user is a member of the room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const isMember = room.members.some(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (room.isPrivate && !isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get messages with pagination
    const messages = await Message.find({
      room: roomId,
      deleted: false,
    })
      .populate("sender", "username avatar")
      .populate("replyTo", "content sender")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count
    const total = await Message.countDocuments({
      room: roomId,
      deleted: false,
    });

    res.json({
      messages: messages.reverse(), // Show oldest first
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get direct messages between two users
router.get("/direct/:userId", auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const otherUserId = req.params.userId;

    // Find or create direct message room
    let room = await Room.findOne({
      isDirectMessage: true,
      participants: { $all: [req.user._id, otherUserId] },
      "members.user": { $all: [req.user._id, otherUserId] },
    });

    if (!room) {
      return res.json({
        messages: [],
        totalPages: 0,
        currentPage: 1,
        total: 0,
      });
    }

    // Get messages with pagination
    const messages = await Message.find({
      room: room._id,
      deleted: false,
    })
      .populate("sender", "username avatar")
      .populate("replyTo", "content sender")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count
    const total = await Message.countDocuments({
      room: room._id,
      deleted: false,
    });

    res.json({
      messages: messages.reverse(),
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Get direct messages error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Edit a message
router.put("/:messageId", auth, async (req, res) => {
  try {
    const { content } = req.body;
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Cannot edit this message" });
    }

    message.content = content;
    message.edited = true;
    message.editedAt = new Date();

    await message.save();
    await message.populate("sender", "username avatar");

    res.json({ message });
  } catch (error) {
    console.error("Edit message error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a message
router.delete("/:messageId", auth, async (req, res) => {
  try {
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user is the sender or admin
    const room = await Room.findById(message.room);
    const isAdmin = room.members.some(
      (member) =>
        member.user.toString() === req.user._id.toString() &&
        member.role === "admin"
    );

    if (message.sender.toString() !== req.user._id.toString() && !isAdmin) {
      return res.status(403).json({ message: "Cannot delete this message" });
    }

    message.deleted = true;
    message.deletedAt = new Date();
    await message.save();

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Search messages
router.get("/search", auth, async (req, res) => {
  try {
    const { q, roomId, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res
        .status(400)
        .json({ message: "Search query must be at least 2 characters" });
    }

    // Build search query
    const searchQuery = {
      content: { $regex: q, $options: "i" },
      deleted: false,
    };

    // If roomId is provided, search only in that room
    if (roomId) {
      // Check if user is a member of the room
      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const isMember = room.members.some(
        (member) => member.user.toString() === req.user._id.toString()
      );

      if (room.isPrivate && !isMember) {
        return res.status(403).json({ message: "Access denied" });
      }

      searchQuery.room = roomId;
    } else {
      // Search in all rooms user has access to
      const userRooms = await Room.find({
        "members.user": req.user._id,
        isActive: true,
      }).select("_id");

      const roomIds = userRooms.map((room) => room._id);
      searchQuery.room = { $in: roomIds };
    }

    // Execute search
    const messages = await Message.find(searchQuery)
      .populate("sender", "username avatar")
      .populate("room", "name")
      .populate("replyTo", "content sender")
      .populate("mentions", "username avatar")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count
    const total = await Message.countDocuments(searchQuery);

    res.json({
      messages,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      query: q,
    });
  } catch (error) {
    console.error("Search messages error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add reaction to message
router.post("/:messageId/reactions", auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      (reaction) =>
        reaction.user.toString() === req.user._id.toString() &&
        reaction.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction
      message.reactions = message.reactions.filter(
        (reaction) =>
          !(
            reaction.user.toString() === req.user._id.toString() &&
            reaction.emoji === emoji
          )
      );
    } else {
      // Add reaction
      message.reactions.push({
        user: req.user._id,
        emoji,
      });
    }

    await message.save();
    await message.populate("reactions.user", "username avatar");

    res.json({ message });
  } catch (error) {
    console.error("Add reaction error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
