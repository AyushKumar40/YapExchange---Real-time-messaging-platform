# 🚀 Real-Time Chat Application 💬

A modern, feature-rich real-time chat application built with React, Node.js, Socket.io, and MongoDB. Experience professional-grade messaging with advanced features like voice messages, file sharing, message search, and more!

## ✨ Features

### 🔐 Authentication & Security

- **Secure Authentication** - JWT-based login/register system
- **User Management** - Profile management and user discovery
- **Session Management** - Persistent login with token refresh

### 💬 Real-Time Messaging

- **Instant Messaging** - Real-time message delivery with Socket.io
- **Typing Indicators** - See when someone is typing
- **Online Status** - Real-time user presence
- **Message History** - Persistent chat history with MongoDB
- **Message Reactions** - React to messages with emojis
- **Message Threading** - Reply to specific messages
- **Message Search** - Search messages by content and room

### 🎤 Voice Messages

- **Voice Recording** - Record and send voice messages like WhatsApp
- **Audio Playback** - Professional audio controls with progress bar
- **Download Support** - Download voice messages
- **Cross-browser Compatibility** - Works on all modern browsers

### 📎 File Sharing

- **File Upload** - Upload and share files (images, documents, etc.)
- **File Preview** - Preview uploaded files
- **Download Support** - Download shared files
- **File Type Support** - Images, videos, audio, documents

### 🎨 Rich Text & Formatting

- **Rich Text Formatting** - Bold, italic, code formatting
- **@Mentions** - Mention users with @username
- **Emoji Support** - Rich emoji picker
- **Message Formatting** - Professional text formatting toolbar

### 🔔 Notifications

- **Push Notifications** - Browser notifications for new messages
- **Sound Notifications** - Audio notifications with Web Audio API
- **Vibration Support** - Mobile vibration notifications
- **Notification Settings** - Customizable notification preferences

### 🏠 Room Management

- **Public Rooms** - Join public chat rooms
- **Private Rooms** - Create and manage private rooms
- **Direct Messages** - One-on-one conversations
- **Room Settings** - Manage room details and members
- **Member Management** - View room members and roles

### 📱 Mobile & UI/UX

- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Dark/Light Mode** - Toggle between themes
- **Loading Screens** - Professional loading animations
- **Modern UI** - Clean, intuitive interface
- **Mobile-First** - Optimized for mobile devices

## 🛠️ Tech Stack

### Frontend

- **React 18** - Modern UI framework
- **Socket.io Client** - Real-time communication
- **Zustand** - Lightweight state management
- **React Router** - Client-side routing
- **React Icons** - Comprehensive icon library
- **React Hot Toast** - Beautiful notifications
- **Date-fns** - Date formatting utilities
- **Web Audio API** - Audio processing and notifications

### Backend

- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **Socket.io** - Real-time bidirectional communication
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Token authentication
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn**

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Vibhorkothari/Real_TimeChatroom.git
   cd Real_TimeChatroom
   ```

2. **Install dependencies**

   ```bash
   # Install root dependencies
   npm install

   # Install client dependencies
   cd client && npm install

   # Install server dependencies
   cd ../server && npm install
   ```

3. **Environment Setup**

   ```bash
   # Create .env file in root directory
   cp .env.example .env
   ```

   Add your environment variables:

   ```env
   MONGODB_URI=mongodb://localhost:27017/chatroom
   JWT_SECRET=your_super_secret_jwt_key
   PORT=5001
   NODE_ENV=development
   ```

4. **Start the application**

   ```bash
   # From root directory
   npm run dev
   ```

   This will start both:

   - **Backend server** on http://localhost:5001
   - **Frontend client** on http://localhost:3006

## 📁 Project Structure

```
Real_TimeChatroom/
├── client/                     # React frontend
│   ├── public/
│   │   ├── favicon.ico        # App favicon
│   │   └── index.html
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── chat/         # Chat-related components
│   │   │   │   ├── VoiceMessage.js      # Voice message player
│   │   │   │   ├── VoiceRecorder.js     # Voice recording
│   │   │   │   ├── FileUpload.js        # File upload
│   │   │   │   ├── SearchMessages.js    # Message search
│   │   │   │   ├── ReactionButton.js    # Message reactions
│   │   │   │   ├── ThreadedMessage.js   # Message threading
│   │   │   │   └── ...
│   │   │   ├── common/       # Common components
│   │   │   │   ├── LoadingScreen.js     # Loading animations
│   │   │   │   └── NotificationSettings.js
│   │   │   └── rooms/        # Room management
│   │   ├── store/            # Zustand stores
│   │   │   ├── authStore.js  # Authentication state
│   │   │   └── chatStore.js  # Chat state
│   │   ├── services/         # Services
│   │   │   └── notificationService.js  # Notifications
│   │   ├── utils/            # Utilities
│   │   │   ├── messageUtils.js        # Message utilities
│   │   │   └── textFormatting.js      # Text formatting
│   │   └── ...
│   └── package.json
├── server/                    # Node.js backend
│   ├── models/               # Mongoose models
│   │   ├── User.js          # User schema
│   │   ├── Room.js          # Room schema
│   │   └── Message.js       # Message schema
│   ├── routes/               # API routes
│   │   ├── auth.js          # Authentication routes
│   │   ├── rooms.js         # Room routes
│   │   ├── messages.js      # Message routes
│   │   └── upload.js        # File upload routes
│   ├── socket/               # Socket.io handlers
│   │   └── socketHandlers.js
│   ├── uploads/              # Uploaded files
│   └── index.js
├── package.json              # Root package.json
├── .env                      # Environment variables
└── README.md
```

## 🔧 Available Scripts

### Root Directory

- `npm run dev` - Start both client and server in development mode
- `npm run client` - Start only the React client
- `npm run server` - Start only the Node.js server

### Client Directory

- `npm start` - Start React development server
- `npm run build` - Build for production
- `npm test` - Run tests

### Server Directory

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

## 🌐 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `GET /api/auth/users` - Get all users

### Rooms

- `GET /api/rooms/my-rooms` - Get user's rooms
- `GET /api/rooms/public` - Get public rooms
- `POST /api/rooms` - Create new room
- `GET /api/rooms/:roomId` - Get room details
- `PUT /api/rooms/:roomId` - Update room
- `DELETE /api/rooms/:roomId` - Delete room
- `POST /api/rooms/:roomId/join` - Join room
- `POST /api/rooms/:roomId/leave` - Leave room

### Messages

- `GET /api/messages/room/:roomId` - Get room messages
- `GET /api/messages/search` - Search messages
- `POST /api/messages` - Send message
- `POST /api/messages/:messageId/reactions` - Add reaction

### File Upload

- `POST /api/upload/single` - Upload single file
- `POST /api/upload/multiple` - Upload multiple files
- `GET /uploads/:filename` - Serve uploaded files

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/chatroom

# Authentication
JWT_SECRET=your_super_secret_jwt_key

# Server
PORT=5001
NODE_ENV=development

# CORS
CLIENT_URL=http://localhost:3006
```

## 📱 Features in Detail

### 🎤 Voice Messages

- **Record & Send** - Record voice messages with one click
- **Audio Controls** - Play, pause, seek with progress bar
- **Download Support** - Download voice messages
- **Cross-browser** - Works on Chrome, Firefox, Safari, Edge

### 🔍 Message Search

- **Global Search** - Search across all messages
- **Room Search** - Search within specific rooms
- **Real-time Results** - Instant search results
- **Highlighted Matches** - Highlighted search terms

### 💝 Message Reactions

- **Emoji Reactions** - React with various emojis
- **Real-time Updates** - See reactions instantly
- **Reaction Counts** - View reaction statistics
- **Quick Reactions** - Common emoji shortcuts

### 🧵 Message Threading

- **Reply to Messages** - Reply to specific messages
- **Thread View** - Organized conversation threads
- **Thread Notifications** - Notify about thread replies
- **Thread Management** - Manage threaded conversations

### 📎 File Sharing

- **Multiple Formats** - Images, videos, audio, documents
- **File Preview** - Preview files before download
- **Progress Tracking** - Upload progress indicators
- **File Management** - Organize and manage files

### 🔔 Smart Notifications

- **Browser Notifications** - Native browser notifications
- **Sound Notifications** - Custom notification sounds
- **Vibration** - Mobile vibration alerts
- **Notification Settings** - Customize notification preferences

## 🎨 UI/UX Features

### 📱 Responsive Design

- **Mobile-First** - Optimized for mobile devices
- **Tablet Support** - Perfect tablet experience
- **Desktop Enhanced** - Rich desktop features
- **Touch Friendly** - Touch-optimized interactions

### 🌙 Theme Support

- **Dark Mode** - Easy on the eyes
- **Light Mode** - Clean and bright
- **Auto Detection** - System theme detection
- **Persistent** - Remembers your preference

### ⚡ Performance

- **Fast Loading** - Optimized bundle sizes
- **Lazy Loading** - Load components on demand
- **Caching** - Smart caching strategies
- **Real-time** - Instant updates

## 🤝 Contributing

1. **Fork the repository**
2. **Create your feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

## 🐛 Bug Reports

If you find a bug, please create an issue with:

- **Description** - Clear description of the bug
- **Steps to Reproduce** - How to reproduce the issue
- **Expected Behavior** - What should happen
- **Screenshots** - If applicable
- **Environment** - Browser, OS, etc.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Vibhor Kothari**

- 🚀 Full-stack developer
- 💬 Real-time messaging expert
- 📱 Mobile-first design advocate
- 🔧 Modern web technologies enthusiast

## 🌟 Acknowledgments

- **React** - For the amazing UI framework
- **Socket.io** - For real-time communication
- **MongoDB** - For flexible data storage
- **Node.js** - For the powerful backend
- **All Contributors** - Thank you for your contributions!

---

## 🎉 What's Next?

This chat application is feature-complete and production-ready! Some potential future enhancements:

- **Video Calls** - WebRTC video calling
- **Screen Sharing** - Share your screen
- **Message Encryption** - End-to-end encryption
- **Bot Integration** - Chat bot support
- **Message Translation** - Multi-language support
- **Advanced Analytics** - Usage analytics
- **Mobile App** - React Native mobile app

---

⭐ **Star this repository if you found it helpful!**

🔗 **Live Demo**: [Your deployed URL here]

📧 **Contact**: [Your email here]

🐦 **Follow**: [Your social media here]
# YapExchange---Real-time-messaging-platform
