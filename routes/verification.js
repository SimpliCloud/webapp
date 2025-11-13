const express = require('express');
const router = express.Router();
const User = require('../models/User');
const logger = require('../config/logger');
const { metricsHelper } = require('../config/metrics');

/**
 * GET /v1/user/verify
 * Verify user email with token
 * Query params: email, token
 */
router.get('/v1/user/verify', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { email, token } = req.query;
    
    logger.info('Email verification request received', {
      email,
      token: token ? 'provided' : 'missing'
    });
    
    // Validate required parameters
    if (!email || !token) {
      logger.warn('Email verification failed - missing parameters', {
        email: email ? 'provided' : 'missing',
        token: token ? 'provided' : 'missing'
      });
      
      return res.status(400).json({
        error: 'Missing required parameters: email and token are required'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn('Email verification failed - invalid email format', {
        email
      });
      
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }
    
    // Validate UUID format for token
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      logger.warn('Email verification failed - invalid token format', {
        email,
        token
      });
      
      return res.status(400).json({
        error: 'Invalid verification token format'
      });
    }
    
    // Find user by email
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      logger.warn('Email verification failed - user not found', {
        email
      });
      
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Check if email is already verified
    if (user.email_verified) {
      logger.info('Email already verified', {
        email,
        userId: user.id
      });
      
      return res.status(200).json({
        message: 'Email already verified'
      });
    }
    
    // Check if token matches
    if (user.verification_token !== token) {
      logger.warn('Email verification failed - token mismatch', {
        email,
        userId: user.id,
        providedToken: token
      });
      
      metricsHelper.incrementError('verification_failed', 'token_mismatch');
      
      return res.status(400).json({
        error: 'Invalid verification token'
      });
    }
    
    // Check if token has expired (1 minute)
    if (user.isTokenExpired()) {
      const tokenAge = Date.now() - new Date(user.token_created_at).getTime();
      
      logger.warn('Email verification failed - token expired', {
        email,
        userId: user.id,
        tokenCreatedAt: user.token_created_at,
        tokenAgeSeconds: Math.floor(tokenAge / 1000)
      });
      
      metricsHelper.incrementError('verification_failed', 'token_expired');
      
      return res.status(400).json({
        error: 'Verification link has expired. Please request a new verification email.'
      });
    }
    
    // Verify the email
    user.email_verified = true;
    user.verification_token = null; // Clear token after successful verification
    user.token_created_at = null;
    await user.save();
    
    const duration = Date.now() - startTime;
    
    logger.info('Email verified successfully', {
      email,
      userId: user.id,
      duration: `${duration}ms`
    });
    
    // Track successful verification
    metricsHelper.incrementApiCall('/v1/user/verify', 'GET', 200);
    metricsHelper.timingApiResponse('/v1/user/verify', 'GET', duration);
    
    res.status(200).json({
      message: 'Email verified successfully',
      email_verified: true
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Email verification error', {
      error: error.message,
      stack: error.stack,
      email: req.query.email,
      duration: `${duration}ms`
    });
    
    metricsHelper.incrementError('server_error', '/v1/user/verify');
    
    res.status(500).json({
      error: 'Failed to verify email. Please try again later.'
    });
  }
});

// Handle unsupported methods
router.all('/v1/user/verify', (req, res) => {
  if (req.method !== 'GET') {
    logger.warn('Method not allowed on /v1/user/verify', {
      method: req.method,
      ip: req.ip
    });
    res.status(405).json({ error: 'Method not allowed. Only GET is supported.' });
  }
});

module.exports = router;