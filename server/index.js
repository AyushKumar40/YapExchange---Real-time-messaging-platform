const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");
const messageRoutes = require("./routes/messages");
const uploadRoutes = require("./routes/upload");
const { setupSocketHandlers } = require("./socket/socketHandlers");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? [
            "https://your-netlify-app.netlify.app",
            "https://your-custom-domain.com",
          ]
        : [
            "http://localhost:3000",
            "http://localhost:3006",
            "http://localhost:3008",
          ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("trust proxy", 1);

// CORS middleware should come before rate limiting
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [
            "https://your-netlify-app.netlify.app",
            "https://your-custom-domain.com",
          ]
        : [
            "http://localhost:3000",
            "http://localhost:3006",
            "http://localhost:3008",
          ],
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased for development
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);
app.use(express.json());

// Serve static files from uploads directory (use absolute path for reliability)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/chatroom")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", uploadRoutes);

setupSocketHandlers(io);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
