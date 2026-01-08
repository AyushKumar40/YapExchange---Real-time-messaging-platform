# 🚀 Deployment Guide

This guide will help you deploy your Real-Time Chatroom application to Netlify (Frontend) and Railway (Backend).

## 📋 Prerequisites

- [GitHub Account](https://github.com)
- [Netlify Account](https://netlify.com)
- [Railway Account](https://railway.app)
- [MongoDB Atlas Account](https://mongodb.com/atlas) (for database)

## 🗄️ Step 1: Set Up MongoDB Atlas

1. **Create MongoDB Atlas Account**

   - Go to [MongoDB Atlas](https://mongodb.com/atlas)
   - Sign up for a free account
   - Create a new cluster (M0 Free tier)

2. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database password

## 🚂 Step 2: Deploy Backend to Railway

### 2.1 Connect to Railway

1. Go to [Railway](https://railway.app)
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your `Real_TimeChatroom` repository

### 2.2 Configure Backend

1. **Set Root Directory**: `server`
2. **Add Environment Variables**:

   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatroom
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   NODE_ENV=production
   PORT=5001
   ```

3. **Deploy**
   - Railway will automatically detect the Node.js app
   - Wait for deployment to complete
   - Copy the generated URL (e.g., `https://your-app.railway.app`)

### 2.3 Update CORS Settings

After getting your Railway URL, update the CORS settings in `server/index.js`:

```javascript
const io = socketIo(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://your-netlify-app.netlify.app"]
        : "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
```

## 🌐 Step 3: Deploy Frontend to Netlify

### 3.1 Connect to Netlify

1. Go to [Netlify](https://netlify.com)
2. Sign in with GitHub
3. Click "New site from Git"
4. Choose your `Real_TimeChatroom` repository

### 3.2 Configure Frontend

1. **Build Settings**:

   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `build`

2. **Environment Variables**:

   ```
   REACT_APP_API_URL=https://your-railway-app.railway.app
   REACT_APP_SOCKET_URL=https://your-railway-app.railway.app
   REACT_APP_ENV=production
   ```

3. **Deploy**
   - Click "Deploy site"
   - Wait for build to complete
   - Your site will be available at `https://your-app.netlify.app`

## 🔧 Step 4: Update Environment Variables

### 4.1 Update Frontend Environment

After getting your Railway URL, update the environment variables in Netlify:

1. Go to your Netlify site dashboard
2. Navigate to "Site settings" > "Environment variables"
3. Update the values:
   ```
   REACT_APP_API_URL=https://your-actual-railway-url.railway.app
   REACT_APP_SOCKET_URL=https://your-actual-railway-url.railway.app
   ```

### 4.2 Update Backend CORS

Update the CORS settings in Railway:

1. Go to your Railway project
2. Navigate to "Variables"
3. Add/update:
   ```
   FRONTEND_URL=https://your-actual-netlify-url.netlify.app
   ```

## 🔄 Step 5: Test Your Deployment

1. **Test Frontend**: Visit your Netlify URL
2. **Test Backend**: Visit `https://your-railway-url.railway.app/health`
3. **Test Authentication**: Try registering and logging in
4. **Test Real-time Features**: Create a room and send messages

## 🛠️ Troubleshooting

### Common Issues

1. **CORS Errors**

   - Ensure CORS origins are correctly set
   - Check that both URLs use HTTPS in production

2. **Socket Connection Issues**

   - Verify Socket.io URL is correct
   - Check Railway logs for connection errors

3. **MongoDB Connection Issues**

   - Verify MongoDB Atlas connection string
   - Check IP whitelist in MongoDB Atlas

4. **Build Failures**
   - Check Netlify build logs
   - Verify all dependencies are in package.json

### Useful Commands

```bash
# Check Railway logs
railway logs

# Check Netlify build logs
# (Available in Netlify dashboard)

# Test backend locally with production env
cd server
NODE_ENV=production npm start

# Test frontend locally with production env
cd client
REACT_APP_API_URL=https://your-railway-url.railway.app npm start
```

## 📊 Monitoring

### Railway Monitoring

- **Logs**: Available in Railway dashboard
- **Metrics**: CPU, memory usage
- **Health Checks**: Automatic health check at `/health`

### Netlify Monitoring

- **Build Logs**: Available in Netlify dashboard
- **Analytics**: Site analytics and performance
- **Forms**: Form submissions (if any)

## 🔒 Security Considerations

1. **Environment Variables**: Never commit sensitive data
2. **JWT Secret**: Use a strong, unique secret
3. **MongoDB**: Use strong passwords and IP whitelisting
4. **HTTPS**: Both Netlify and Railway provide HTTPS by default

## 📈 Scaling

### Railway Scaling

- Upgrade to paid plan for more resources
- Add multiple instances for load balancing
- Use Railway's auto-scaling features

### Netlify Scaling

- Netlify automatically scales
- Consider upgrading for more build minutes
- Use Netlify Functions for serverless features

## 🎉 Success!

Your Real-Time Chatroom is now deployed and accessible worldwide!

- **Frontend**: https://your-app.netlify.app
- **Backend**: https://your-app.railway.app
- **Health Check**: https://your-app.railway.app/health

---

**Need Help?** Check the troubleshooting section or create an issue in your GitHub repository.
