import axios from 'axios';

// Base URL for API - use environment variable or fallback to localhost
const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased to 30 seconds for Vercel cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for automatic token refresh
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;

          // Update stored tokens
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Update the authorization header for the original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          // Retry the original request
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API methods
export const authAPI = {
  // Authentication methods
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  logout: (refreshToken) => apiClient.post('/auth/logout', { refreshToken }),
  logoutAll: () => apiClient.post('/auth/logout-all'),
  refresh: (refreshToken) => apiClient.post('/auth/refresh', { refreshToken }),
  getMe: () => apiClient.get('/auth/me'),
  updateStatus: (status) => apiClient.put('/auth/status', { status }),
  updateProfile: (profileData) => apiClient.put('/auth/profile', profileData),

  // Generic HTTP methods for authenticated requests
  get: (url) => apiClient.get(url),
  post: (url, data) => apiClient.post(url, data),
  put: (url, data) => apiClient.put(url, data),
  delete: (url) => apiClient.delete(url),
};

// Chat Room API methods
export const chatRoomAPI = {
  // Get all public chat rooms
  getChatRooms: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/chatrooms${queryString ? `?${queryString}` : ''}`);
  },

  // Get user's chat rooms
  getMyRooms: () => apiClient.get('/chatrooms/my-rooms'),

  // Get specific chat room
  getChatRoom: (roomId) => apiClient.get(`/chatrooms/${roomId}`),

  // Create new chat room
  createChatRoom: (roomData) => apiClient.post('/chatrooms', roomData),

  // Join a chat room
  joinRoom: (roomId) => apiClient.post(`/chatrooms/${roomId}/join`),

  // Leave a chat room
  leaveRoom: (roomId) => apiClient.post(`/chatrooms/${roomId}/leave`),
};

// Message API methods
export const messageAPI = {
  // Get messages for a chat room
  getMessages: (roomId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/messages/${roomId}${queryString ? `?${queryString}` : ''}`);
  },

  // Send a message to a chat room
  sendMessage: (roomId, messageData) => apiClient.post(`/messages/${roomId}`, messageData),

  // Edit a message
  editMessage: (messageId, content) => apiClient.put(`/messages/${messageId}`, { content }),

  // Delete a message
  deleteMessage: (messageId) => apiClient.delete(`/messages/${messageId}`),

  // Add reaction to a message
  addReaction: (messageId, emoji) => apiClient.post(`/messages/${messageId}/react`, { emoji }),
};

// Chat API methods (for future use)
export const chatAPI = {
  getChats: () => apiClient.get('/chats'),
  getChat: (chatId) => apiClient.get(`/chats/${chatId}`),
  createChat: (chatData) => apiClient.post('/chats', chatData),
  sendMessage: (chatId, messageData) => apiClient.post(`/chats/${chatId}/messages`, messageData),
  getMessages: (chatId, page = 1, limit = 50) =>
    apiClient.get(`/chats/${chatId}/messages?page=${page}&limit=${limit}`),
};

// User API methods
export const userAPI = {
  getUsers: () => apiClient.get('/users'),
  getUser: (userId) => apiClient.get(`/users/${userId}`),
  searchUsers: (query) => apiClient.get(`/users/search?q=${query}`),
  updateUser: (userId, userData) => apiClient.put(`/users/${userId}`, userData),
};

// Export the configured axios instance as default
export default apiClient;
