import React, { useState, useEffect, useRef } from "react";
import { FiSend, FiSmile, FiPaperclip, FiMic } from "react-icons/fi";
import useChatStore from "../../store/chatStore";
import FileUpload from "./FileUpload";
import VoiceRecorder from "./VoiceRecorder";

import "./MessageInput.css";

const MessageInput = ({ roomId, replyingTo, onCancelReply }) => {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const { sendMessage, startTyping, stopTyping } = useChatStore();
  const emojiPickerRef = useRef(null);

  // Popular emojis array
  const popularEmojis = [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "😂",
    "🤣",
    "😊",
    "😇",
    "🙂",
    "🙃",
    "😉",
    "😌",
    "😍",
    "🥰",
    "😘",
    "😗",
    "😙",
    "😚",
    "😋",
    "😛",
    "😝",
    "😜",
    "🤪",
    "🤨",
    "🧐",
    "🤓",
    "😎",
    "🤩",
    "🥳",
    "😏",
    "😒",
    "😞",
    "😔",
    "😟",
    "😕",
    "🙁",
    "☹️",
    "😣",
    "😖",
    "😫",
    "😩",
    "🥺",
    "😢",
    "😭",
    "😤",
    "😠",
    "😡",
    "🤬",
    "🤯",
    "😳",
    "🥵",
    "🥶",
    "😱",
    "😨",
    "😰",
    "😥",
    "😓",
    "🤗",
    "🤔",
    "🤭",
    "🤫",
    "🤥",
    "😶",
    "😐",
    "😑",
    "😯",
    "😦",
    "😧",
    "😮",
    "😲",
    "🥱",
    "😴",
    "🤤",
    "😪",
    "😵",
    "🤐",
    "🥴",
    "🤢",
    "🤮",
    "🤧",
    "😷",
    "🤒",
    "🤕",
    "🤑",
    "🤠",
    "👍",
    "👎",
    "👌",
    "✌️",
    "🤞",
    "🤟",
    "🤘",
    "🤙",
    "👈",
    "👉",
    "👆",
    "🖕",
    "👇",
    "☝️",
    "👋",
    "🤚",
    "🖐️",
    "✋",
    "🖖",
    "👌",
    "🤌",
    "🤏",
    "✌️",
  ];

  useEffect(() => {
    let typingTimer;

    if (isTyping) {
      startTyping();
      typingTimer = setTimeout(() => {
        setIsTyping(false);
        stopTyping();
      }, 3000);
    }

    return () => {
      if (typingTimer) {
        clearTimeout(typingTimer);
      }
    };
  }, [isTyping, startTyping, stopTyping]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    if (value && !isTyping) {
      setIsTyping(true);
    } else if (!value && isTyping) {
      setIsTyping(false);
      stopTyping();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!message.trim()) return;

    sendMessage(message.trim(), roomId, "text", null, replyingTo?._id);
    setMessage("");
    setIsTyping(false);
    stopTyping();
    if (onCancelReply) onCancelReply();
  };

  const handleFileSelect = (files) => {
    // Send each file as a separate message
    files.forEach((file) => {
      // Determine messageType based on mimeType
      let messageType = "file";
      if (file.mimeType) {
        if (file.mimeType.startsWith("image/")) {
          messageType = "image";
        } else if (file.mimeType.startsWith("video/")) {
          messageType = "video";
        } else if (file.mimeType.startsWith("audio/")) {
          messageType = "audio";
        } else if (
          file.mimeType.includes("pdf") ||
          file.mimeType.includes("document") ||
          file.mimeType.includes("text") ||
          file.mimeType.includes("msword") ||
          file.mimeType.includes("spreadsheet")
        ) {
          messageType = "document";
        }
      }

      // Send message with attachment
      sendMessage("", roomId, messageType, file, replyingTo?._id);
    });

    // Clear reply if any
    if (onCancelReply) onCancelReply();
  };

  const handleVoiceSend = async (audioBlob) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", audioBlob, "voice-message.webm");

      // Upload the voice message
      const token = localStorage.getItem("token");
      const uploadResponse = await fetch("/api/upload/single", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();

        // Send message with voice attachment
        await sendMessage(
          "", // No text content for voice messages
          roomId,
          "audio",
          {
            filename: uploadData.file.filename,
            originalName: uploadData.file.originalName,
            mimeType: uploadData.file.mimeType,
            size: uploadData.file.size,
            url: uploadData.file.url,
          },
          replyingTo?._id,
        );

        setShowVoiceRecorder(false);
        if (onCancelReply) onCancelReply();
      } else {
        console.error("Voice upload failed");
      }
    } catch (error) {
      console.error("Error sending voice message:", error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleEmojiClick = (emoji, e) => {
    e.preventDefault();
    e.stopPropagation();

    // Use a ref to prevent double clicks
    if (emojiPickerRef.current?.isProcessing) return;

    emojiPickerRef.current.isProcessing = true;

    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);

    // Reset after a short delay
    setTimeout(() => {
      if (emojiPickerRef.current) {
        emojiPickerRef.current.isProcessing = false;
      }
    }, 200);
  };

  const toggleEmojiPicker = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowEmojiPicker(!showEmojiPicker);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="message-input-container">
      <form onSubmit={handleSubmit} className="message-input-form">
        <div className="input-wrapper">
          <textarea
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="message-input"
            rows="1"
            maxLength="1000"
          />
          <div className="input-actions">
            <button
              type="button"
              className="file-button"
              onClick={() => setShowFileUpload(true)}
              title="Attach file"
            >
              <FiPaperclip />
            </button>

            <button
              type="button"
              className="voice-button"
              onClick={() => setShowVoiceRecorder(true)}
              title="Record voice message"
            >
              <FiMic />
            </button>

            <div className="emoji-picker-container" ref={emojiPickerRef}>
              <button
                type="button"
                className="emoji-button"
                onClick={toggleEmojiPicker}
              >
                <FiSmile />
              </button>
              {showEmojiPicker && (
                <div className="emoji-picker">
                  {popularEmojis.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      className="emoji-item"
                      onClick={(e) => handleEmojiClick(emoji, e)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              className="send-button"
              disabled={!message.trim()}
            >
              <FiSend />
            </button>
          </div>
        </div>
      </form>

      {showFileUpload && (
        <FileUpload
          onFileSelect={handleFileSelect}
          onClose={() => setShowFileUpload(false)}
        />
      )}

      {showVoiceRecorder && (
        <VoiceRecorder
          onSend={handleVoiceSend}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      )}
    </div>
  );
};

export default MessageInput;
