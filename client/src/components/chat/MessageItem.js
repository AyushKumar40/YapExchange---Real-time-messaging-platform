import React, { useState } from "react";
import { format } from "date-fns";
import { FiMoreVertical } from "react-icons/fi";
import { toast } from "react-hot-toast";
import ReactionButton from "./ReactionButton";
import FileMessage from "./FileMessage";
import VoiceMessage from "./VoiceMessage";
import ReplyButton from "./ReplyButton";
import { parseMessageContent } from "../../utils/messageUtils";
import useAuthStore from "../../store/authStore";
import useChatStore from "../../store/chatStore";
import "./MessageItem.css";

const MessageItem = ({ message, isOwnMessage, onReply }) => {
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useAuthStore();
  const { updateMessage, deleteMessage } = useChatStore();

  const formatTime = (date) => {
    return format(new Date(date), "HH:mm");
  };

  const handleCopy = async () => {
    const text = message?.content || "";
    if (!text) {
      toast.error("Nothing to copy");
      setShowMenu(false);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch (e) {
      // Fallback for older browsers / blocked clipboard
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        toast.success("Copied");
      } catch (err) {
        toast.error("Copy failed");
      }
    } finally {
      setShowMenu(false);
    }
  };

  const handleEdit = async () => {
    const current = message?.content || "";
    const next = window.prompt("Edit message:", current);
    if (next === null) {
      setShowMenu(false);
      return;
    }
    const trimmed = next.trim();
    if (!trimmed) {
      toast.error("Message cannot be empty");
      setShowMenu(false);
      return;
    }

    const res = await updateMessage(message._id, trimmed);
    if (!res.success) {
      toast.error(res.error || "Edit failed");
    }
    setShowMenu(false);
  };

  const handleDelete = async () => {
    const ok = window.confirm("Delete this message?");
    if (!ok) {
      setShowMenu(false);
      return;
    }
    const res = await deleteMessage(message._id);
    if (!res.success) {
      toast.error(res.error || "Delete failed");
    } else {
      toast.success("Deleted");
    }
    setShowMenu(false);
  };

  return (
    <div className={`message-item ${isOwnMessage ? "own-message" : ""}`}>
      <div className="message-avatar">
        {message.sender.avatar ? (
          <img
            src={message.sender.avatar}
            alt={message.sender.username || "User"}
          />
        ) : (
          <div className="avatar-placeholder">
            {(message.sender.username || "U").charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="message-content">
        <div className="message-header">
          <span className="message-username">
            {message.sender.username || "Unknown User"}
          </span>
          <span className="message-time">{formatTime(message.createdAt)}</span>
          {message.edited && <span className="edited-indicator">(edited)</span>}
        </div>

        {message.content && (
          <div className="message-text">
            {parseMessageContent(
              message.content,
              message.mentions || [],
              user?._id,
            )}
          </div>
        )}

        {message.attachment && message.messageType === "audio" && (
          <VoiceMessage
            attachment={message.attachment}
            isOwnMessage={isOwnMessage}
          />
        )}

        {message.attachment && message.messageType !== "audio" && (
          <FileMessage
            attachment={message.attachment}
            messageType={message.messageType}
          />
        )}

        <ReactionButton
          messageId={message._id}
          reactions={message.reactions || []}
        />
      </div>

      <div className="message-actions">
        {onReply && (
          <ReplyButton
            message={message}
            onReply={onReply}
            onCancel={() => {}}
          />
        )}

        <button
          className="action-button"
          onClick={() => setShowMenu(!showMenu)}
        >
          <FiMoreVertical />
        </button>

        {showMenu && (
          <div className="message-menu">
            <button className="menu-item" onClick={handleCopy}>
              Copy
            </button>
            {isOwnMessage && (
              <button className="menu-item" onClick={handleEdit}>
                Edit
              </button>
            )}
            {isOwnMessage && (
              <button className="menu-item" onClick={handleDelete}>
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;
