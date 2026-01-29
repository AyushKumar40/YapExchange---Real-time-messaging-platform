import React, { useState, useEffect } from "react";
import {
  FiSearch,
  FiX,
  FiMessageSquare,
  FiClock,
  FiUser,
} from "react-icons/fi";
import "./SearchMessages.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5001";

const SearchMessages = ({
  isOpen,
  onClose,
  currentRoomId,
  localMessages = [],
  currentRoomName = "Current Room",
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const searchMessages = async (searchQuery, pageNum = 1) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    // Always provide instant "search in current chat" results
    runLocalSearch(searchQuery);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        q: searchQuery,
        page: pageNum,
        limit: 20,
      });

      if (currentRoomId) {
        params.append("roomId", currentRoomId);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/messages/search?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        const serverMessages = data.messages || [];
        // Prefer server results if present (lets you search older messages not loaded)
        if (Array.isArray(serverMessages) && serverMessages.length > 0) {
          setResults(serverMessages);
          setTotalPages(data.totalPages || 0);
          setTotal(data.total || 0);
          setPage(data.currentPage || 1);
        }
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Search failed" }));
        console.error("Search error:", errorData);
        // keep local results already shown
      }
    } catch (error) {
      console.error("Search error:", error);
      // keep local results already shown
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    searchMessages(query, 1);
  };

  const handleLoadMore = () => {
    if (page < totalPages) {
      searchMessages(query, page + 1);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const escapeRegExp = (string) => {
    return String(string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  const highlightText = (text, query) => {
    if (!query) return text;
    const safe = escapeRegExp(query);
    const regex = new RegExp(`(${safe})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  };

  const runLocalSearch = (searchQuery) => {
    const q = (searchQuery || "").trim().toLowerCase();
    if (q.length < 2) {
      setResults([]);
      setTotal(0);
      setTotalPages(0);
      setPage(1);
      return;
    }

    const matches = (Array.isArray(localMessages) ? localMessages : [])
      .filter((m) => {
        const content = (m?.content || "").toLowerCase();
        const attachmentName = (
          m?.attachment?.originalName ||
          m?.attachment?.filename ||
          ""
        ).toLowerCase();
        return content.includes(q) || attachmentName.includes(q);
      })
      .slice()
      .reverse()
      .map((m) => ({
        ...m,
        room:
          typeof m.room === "object" && m.room?.name
            ? m.room
            : { name: currentRoomName },
        sender:
          typeof m.sender === "object" && m.sender?.username
            ? m.sender
            : { username: "Unknown" },
      }));

    setResults(matches);
    setTotal(matches.length);
    setTotalPages(1);
    setPage(1);
  };

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="search-overlay">
      <div className="search-container">
        <div className="search-header">
          <h3>Search Messages</h3>
          <button className="close-button" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-container">
            <FiSearch className="search-icon" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages..."
              className="search-input"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
                className="clear-button"
              >
                <FiX />
              </button>
            )}
          </div>
          <button type="submit" className="search-button" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {results.length > 0 && (
          <div className="search-results">
            <div className="results-header">
              <span className="results-count">
                {total} result{total !== 1 ? "s" : ""} found
              </span>
              {currentRoomId && (
                <span className="search-scope">
                  <FiMessageSquare /> In current room
                </span>
              )}
            </div>

            <div className="results-list">
              {results.map((message) => (
                <div key={message._id} className="search-result-item">
                  <div className="result-header">
                    <div className="result-sender">
                      <FiUser className="user-icon" />
                      <span className="sender-name">
                        {message.sender.username}
                      </span>
                    </div>
                    <div className="result-meta">
                      <span className="result-room">{message.room.name}</span>
                      <span className="result-time">
                        <FiClock className="time-icon" />
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="result-content">
                    {message.content && (
                      <div
                        className="result-text"
                        dangerouslySetInnerHTML={{
                          __html: highlightText(message.content, query),
                        }}
                      />
                    )}
                    {message.attachment && (
                      <div className="result-attachment">
                        📎{" "}
                        {message.attachment.originalName ||
                          message.attachment.filename}
                      </div>
                    )}
                  </div>

                  {message.replyTo && (
                    <div className="result-reply">
                      <span className="reply-label">Replying to:</span>
                      <span className="reply-content">
                        {message.replyTo.content?.substring(0, 100)}
                        {message.replyTo.content?.length > 100 && "..."}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {page < totalPages && (
              <button onClick={handleLoadMore} className="load-more-button">
                Load More Results
              </button>
            )}
          </div>
        )}

        {query && results.length === 0 && !loading && (
          <div className="no-results">
            <FiSearch className="no-results-icon" />
            <p>No messages found for "{query}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchMessages;
