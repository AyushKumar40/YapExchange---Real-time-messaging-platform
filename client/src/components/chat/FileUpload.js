import React, { useState, useRef } from "react";
import { FiUpload, FiImage, FiFile, FiX, FiPlay } from "react-icons/fi";
import "./FileUpload.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5001";

const FileUpload = ({ onFileSelect, onClose }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files) => {
    const validFiles = files.filter((file) => {
      const maxSize = 50 * 1024 * 1024; // 50MB
      const allowedTypes =
        /jpeg|jpg|png|gif|mp4|webm|mp3|wav|pdf|doc|docx|txt|zip|rar/;
      const isValidType =
        allowedTypes.test(file.type) || allowedTypes.test(file.name);

      if (!isValidType) {
        alert(`${file.name} is not a supported file type.`);
        return false;
      }

      if (file.size > maxSize) {
        alert(`${file.name} is too large. Maximum size is 50MB.`);
        return false;
      }

      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`${API_BASE_URL}/api/upload/multiple`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const result = await response.json();

      if (result.success && Array.isArray(result.files)) {
        onFileSelect(result.files);
        setSelectedFiles([]);
        onClose();
      } else {
        alert("Upload failed. Please try again.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith("image/")) return <FiImage />;
    if (file.type.startsWith("video/")) return <FiPlay />;
    if (file.type.startsWith("audio/")) return <FiPlay />;
    return <FiFile />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="file-upload-overlay">
      <div className="file-upload-modal">
        <div className="file-upload-header">
          <h3>Upload Files</h3>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="file-upload-content">
          <div
            className={`file-drop-zone ${dragActive ? "drag-active" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <FiUpload className="upload-icon" />
            <p>Drag and drop files here or click to browse</p>
            <p className="file-info">
              Images, videos, audio, documents (max 50MB each)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInput}
              style={{ display: "none" }}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="selected-files">
              <h4>Selected Files ({selectedFiles.length})</h4>
              <div className="file-list">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="file-item">
                    <div className="file-info">
                      {getFileIcon(file)}
                      <div className="file-details">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="remove-file-btn"
                      onClick={() => removeFile(index)}
                    >
                      <FiX />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="file-upload-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="upload-btn"
            onClick={uploadFiles}
            disabled={selectedFiles.length === 0 || uploading}
          >
            {uploading
              ? "Uploading..."
              : `Upload ${selectedFiles.length} file${selectedFiles.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
