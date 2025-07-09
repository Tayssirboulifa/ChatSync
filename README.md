# MERN Stack Application

A complete full-stack web application built with the MERN stack (MongoDB, Express.js, React, Node.js).

## 🚀 Features

- **Frontend**: React with Vite for fast development
- **Backend**: Express.js REST API
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based authentication
- **Styling**: Modern CSS with responsive design
- **Development**: Hot reload for both frontend and backend

## 📁 Project Structure

```
mern-stack-app/
├── backend/                 # Express.js API server
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   ├── .env               # Environment variables
│   ├── server.js          # Main server file
│   └── package.json       # Backend dependencies
├── frontend/               # React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.jsx        # Main App component
│   │   └── main.jsx       # Entry point
│   ├── public/            # Static assets
│   └── package.json       # Frontend dependencies
├── package.json           # Root package.json with scripts
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

## 🛠️ Prerequisites

Before running this application, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/) (local installation or MongoDB Atlas)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

## ⚡ Quick Start

### 1. Clone and Install Dependencies

```bash
# Install all dependencies (root, frontend, and backend)
npm run install-all
```

### 2. Environment Setup

Create a `.env` file in the `backend` directory:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mernapp
JWT_SECRET=your_jwt_secret_key_here
```

### 3. Start Development Servers

```bash
# Start both frontend and backend concurrently
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend development server on `http://localhost:5173`

## 📝 Available Scripts

### Root Level Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run install-all` - Install dependencies for root, frontend, and backend
- `npm run build` - Build the frontend for production
- `npm start` - Start the backend in production mode

### Backend Scripts

```bash
cd backend
npm start        # Start server in production mode
npm run dev      # Start server with nodemon (development)
```

### Frontend Scripts

```bash
cd frontend
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## 🔧 API Endpoints

### Authentication Routes

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Request/Response Examples

#### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Login User
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

## 🎨 Frontend Components

- **Home** - Landing page with features overview
- **Login** - User authentication form
- **Register** - User registration form
- **Dashboard** - Protected user dashboard
- **Navbar** - Navigation component

## 🔐 Authentication

The application uses JWT (JSON Web Tokens) for authentication:

1. User registers/logs in
2. Server returns JWT token
3. Token is stored in localStorage
4. Token is sent in Authorization header for protected routes

## 🗄️ Database Schema

### User Model

```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  role: String (default: 'user'),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

## 🚀 Deployment

### Backend Deployment

1. Set environment variables on your hosting platform
2. Build and deploy the backend
3. Ensure MongoDB connection is configured

### Frontend Deployment

1. Build the frontend: `npm run build`
2. Deploy the `dist` folder to your hosting platform
3. Update API URLs in the frontend code

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`

2. **Port Already in Use**
   - Change PORT in `.env` file
   - Kill existing processes on the port

3. **CORS Issues**
   - Backend includes CORS middleware
   - Check frontend API URLs

### Getting Help

- Check the console for error messages
- Ensure all dependencies are installed
- Verify environment variables are set correctly

---

Happy coding! 🎉
