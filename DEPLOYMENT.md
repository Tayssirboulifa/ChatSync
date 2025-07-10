# 🚀 ChatSync Deployment Guide

## Frontend Deployment to Vercel

### Prerequisites
- GitHub account with ChatSync repository
- Vercel account (free tier available)
- Backend deployed and accessible via HTTPS

### Step 1: Prepare Your Repository
✅ **Already Done:**
- Environment variables configured
- Build scripts optimized
- Vercel configuration file created
- Production build tested

### Step 2: Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard (Recommended)
1. **Go to [vercel.com](https://vercel.com) and sign in**
2. **Click "New Project"**
3. **Import your GitHub repository:**
   - Select "ChatSync" repository
   - Choose the `frontend` folder as the root directory
4. **Configure build settings:**
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Set Environment Variables:**
   ```
   VITE_API_URL=https://your-backend-url.com
   VITE_SOCKET_URL=https://your-backend-url.com
   VITE_NODE_ENV=production
   ```
6. **Click "Deploy"**

#### Option B: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend directory
cd frontend

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Step 3: Configure Environment Variables in Vercel
1. Go to your project dashboard on Vercel
2. Click "Settings" → "Environment Variables"
3. Add these variables:
   - `VITE_API_URL`: Your backend URL (e.g., `https://your-app.herokuapp.com`)
   - `VITE_SOCKET_URL`: Same as API URL
   - `VITE_NODE_ENV`: `production`

### Step 4: Update Backend CORS Settings
Make sure your backend allows your Vercel domain:
```javascript
// In backend/server.js
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:5173", 
      "http://localhost:5174",
      "https://your-vercel-app.vercel.app"  // Add your Vercel URL
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});
```

### Step 5: Test Your Deployment
1. Visit your Vercel URL
2. Test user registration/login
3. Test chat room creation and joining
4. Test real-time messaging
5. Check browser console for errors

## Backend Deployment Options

### Option 1: Heroku (Recommended)
1. Create Heroku account
2. Install Heroku CLI
3. Deploy backend to Heroku
4. Configure MongoDB Atlas connection
5. Set environment variables

### Option 2: Railway
1. Connect GitHub repository
2. Select backend folder
3. Configure environment variables
4. Deploy

### Option 3: Render
1. Connect GitHub repository
2. Create web service
3. Configure build and start commands
4. Set environment variables

## Environment Variables Summary

### Frontend (.env.production)
```
VITE_API_URL=https://your-backend-url.com
VITE_SOCKET_URL=https://your-backend-url.com
VITE_NODE_ENV=production
```

### Backend
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
NODE_ENV=production
PORT=5000
```

## Troubleshooting

### Common Issues:
1. **CORS Errors**: Update backend CORS settings with your Vercel URL
2. **Environment Variables**: Ensure all required variables are set in Vercel
3. **Build Failures**: Check build logs in Vercel dashboard
4. **Socket.IO Connection**: Verify VITE_SOCKET_URL is correct

### Build Commands:
```bash
# Test build locally
npm run build

# Preview build locally
npm run preview

# Check for build errors
npm run lint
```

## Post-Deployment Checklist
- [ ] Frontend deployed to Vercel
- [ ] Backend deployed and accessible
- [ ] Environment variables configured
- [ ] CORS settings updated
- [ ] Database connection working
- [ ] Authentication working
- [ ] Real-time features working
- [ ] All pages accessible
- [ ] Mobile responsive
- [ ] Performance optimized

## Support
If you encounter issues, check:
1. Vercel deployment logs
2. Browser console errors
3. Network tab for failed requests
4. Backend server logs
