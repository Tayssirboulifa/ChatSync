const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// In-memory store for refresh tokens (in production, use Redis or database)
const refreshTokens = new Set();

/**
 * Generate access token
 * @param {Object} payload - User payload
 * @returns {String} JWT access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'chatsync-app',
    audience: 'chatsync-users'
  });
};

/**
 * Generate refresh token
 * @param {String} userId - User ID
 * @returns {String} Refresh token
 */
const generateRefreshToken = (userId) => {
  const refreshToken = crypto.randomBytes(40).toString('hex');
  
  // Store refresh token with user ID and expiration
  const tokenData = {
    token: refreshToken,
    userId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  };
  
  refreshTokens.add(JSON.stringify(tokenData));
  return refreshToken;
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} Token pair
 */
const generateTokenPair = (user) => {
  const payload = {
    user: {
      id: user.id,
      role: user.role,
      email: user.email
    }
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY
  };
};

/**
 * Verify access token
 * @param {String} token - JWT token
 * @returns {Object} Decoded payload
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'chatsync-app',
      audience: 'chatsync-users'
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Verify refresh token
 * @param {String} token - Refresh token
 * @returns {String} User ID if valid
 */
const verifyRefreshToken = (token) => {
  for (const tokenDataStr of refreshTokens) {
    const tokenData = JSON.parse(tokenDataStr);
    
    if (tokenData.token === token) {
      if (new Date() > new Date(tokenData.expiresAt)) {
        refreshTokens.delete(tokenDataStr);
        throw new Error('Refresh token expired');
      }
      return tokenData.userId;
    }
  }
  
  throw new Error('Invalid refresh token');
};

/**
 * Revoke refresh token
 * @param {String} token - Refresh token to revoke
 */
const revokeRefreshToken = (token) => {
  for (const tokenDataStr of refreshTokens) {
    const tokenData = JSON.parse(tokenDataStr);
    if (tokenData.token === token) {
      refreshTokens.delete(tokenDataStr);
      break;
    }
  }
};

/**
 * Revoke all refresh tokens for a user
 * @param {String} userId - User ID
 */
const revokeAllUserTokens = (userId) => {
  for (const tokenDataStr of refreshTokens) {
    const tokenData = JSON.parse(tokenDataStr);
    if (tokenData.userId === userId) {
      refreshTokens.delete(tokenDataStr);
    }
  }
};

/**
 * Clean expired refresh tokens
 */
const cleanExpiredTokens = () => {
  const now = new Date();
  for (const tokenDataStr of refreshTokens) {
    const tokenData = JSON.parse(tokenDataStr);
    if (new Date(tokenData.expiresAt) < now) {
      refreshTokens.delete(tokenDataStr);
    }
  }
};

// Clean expired tokens every hour
setInterval(cleanExpiredTokens, 60 * 60 * 1000);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanExpiredTokens
};
