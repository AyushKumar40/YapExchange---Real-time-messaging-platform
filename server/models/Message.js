const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: function () {
        return this.messageType === "text" || this.messageType === "system";
      },
      trim: true,
      maxlength: 1000,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "video", "audio", "document", "system"],
      default: "text",
    },
    // File attachment information
    attachment: {
      filename: String,
      originalName: String,
      mimeType: String,
      size: Number,
      url: String,
      thumbnail: String, // For images/videos
    },
    // For direct messages
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // For message reactions
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        emoji: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // For message editing
    edited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
    // For message deletion
    deleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    // For message threading/replies
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    // For @username mentions
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// TTL index - messages will be automatically deleted after 30 days
messageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

// Indexes for faster queries
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, createdAt: -1 });

// Virtual for reaction count
messageSchema.virtual("reactionCount").get(function () {
  return this.reactions.length;
});

// Ensure virtuals are serialized
messageSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Message", messageSchema);
