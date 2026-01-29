import React, { useState } from "react";
import {
  FiDownload,
  FiImage,
  FiFile,
  FiPlay,
  FiFileText,
} from "react-icons/fi";
import "./FileMessage.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5001";

const FileMessage = ({ attachment, messageType }) => {
  const [imageError, setImageError] = useState(false);

  if (!attachment) return null;

  const getFileIcon = () => {
    if (messageType === "image") return <FiImage />;
    if (messageType === "video") return <FiPlay />;
    if (messageType === "audio") return <FiPlay />;
    if (messageType === "document") return <FiFileText />;
    return <FiFile />;
  };

  const formatFileSize = (bytes = 0) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const buildFileUrl = () => {
    if (attachment.url) {
      return attachment.url.startsWith("http")
        ? attachment.url
        : `${API_BASE_URL}${attachment.url}`;
    }
    if (attachment.filename) {
      return `${API_BASE_URL}/api/upload/${attachment.filename}`;
    }
    return "";
  };

  const fileUrl = buildFileUrl();

  const handleDownload = () => {
    if (!fileUrl) return;
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download =
      attachment.originalName || attachment.filename || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isImage = messageType === "image";
  const isVideo = messageType === "video";
  const isAudio = messageType === "audio";

  return (
    <div className="file-message">
      {isImage && !imageError && fileUrl ? (
        <div className="image-container">
          <img
            src={fileUrl}
            alt={attachment.originalName || attachment.filename || "Image"}
            className="file-image"
            onError={() => setImageError(true)}
            loading="lazy"
          />
          <div className="image-overlay">
            <button className="download-btn" onClick={handleDownload}>
              <FiDownload />
            </button>
          </div>
        </div>
      ) : (
        <div className="file-preview">
          <div className="file-icon">{getFileIcon()}</div>
          <div className="file-info">
            <div className="file-name">
              {attachment.originalName || attachment.filename || "File"}
            </div>
            <div className="file-meta">
              <span className="file-size">
                {formatFileSize(attachment.size)}
              </span>
              {isVideo && <span className="file-type">Video</span>}
              {isAudio && <span className="file-type">Audio</span>}
              {messageType === "document" && (
                <span className="file-type">Document</span>
              )}
            </div>
          </div>
          <button className="download-btn" onClick={handleDownload}>
            <FiDownload />
          </button>
        </div>
      )}
    </div>
  );
};

export default FileMessage;
