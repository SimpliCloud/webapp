const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');
const { publishToSNS } = require('../config/snsClient');
const {
  validateUserCreate,
  validateUserUpdate,
  checkValidation,
  checkNoPayload,
  rejectUnknownFields
} = require('../middleware/validation');

// Allowed fields for user creation
const CREATE_FIELDS = ['email', 'password', 'first_name', 'last_name'];
// Allowed fields for user update
const UPDATE_FIELDS = ['password', 'first_name', 'last_name'];

// POST /v1/user - Create new user (public endpoint)
router.post('/v1/user',
  rejectUnknownFields(CREATE_FIELDS),
  validateUserCreate,
  checkValidation,
  async (req, res) => {
    try {
      const { email, password, first_name, last_name } = req.body;
      
      logger.info('User creation request received', {
        email,
        first_name,
        last_name
      });
      
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        logger.warn('User creation failed - email already exists', {
          email
        });
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      
      // Create new user
      // Note: beforeCreate hook automatically generates verification_token
      const user = await User.create({
        email,
        password,
        first_name,
        last_name
      });
      
      logger.info('User created successfully', {
        userId: user.id,
        email: user.email,
        email_verified: user.email_verified
      });

      // Send SNS notification for email verification
      try {
        const snsMessage = {
          userId: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          verification_token: user.verification_token,
          domain: process.env.DOMAIN_NAME || `${process.env.AWS_REGION}.amazonaws.com`
        };

        await publishToSNS(snsMessage, 'New User Registration - Email Verification');

        logger.info('SNS notification sent for user registration', {
          userId: user.id,
          email: user.email
        });

      } catch (snsError) {
        // Log SNS error but don't fail user creation
        logger.error('Failed to send SNS notification', {
          error: snsError.message,
          userId: user.id,
          email: user.email
        });
        
        // User is still created successfully even if SNS fails
        // This prevents SNS issues from blocking user registration
      }
      
      // Return user data (password excluded by toJSON method)
      res.status(201).json(user);
      
    } catch (error) {
      logger.error('User creation error', {
        error: error.message,
        stack: error.stack,
        email: req.body?.email
      });
      
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message);
        return res.status(400).json({ errors: messages });
      }
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      
      res.status(400).json({ error: 'Failed to create user' });
    }
});

// GET /v1/user/verify - Verify user email
router.get('/v1/user/verify', async (req, res) => {
  try {
    const { email, token } = req.query;

    logger.info('Email verification request received', {
      email,
      tokenProvided: !!token
    });

    // Validate required parameters
    if (!email || !token) {
      logger.warn('Email verification failed - missing parameters', {
        email: !!email,
        token: !!token
      });
      return res.status(400).json({
        error: 'Email and token parameters are required'
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

    // Check if already verified
    if (user.email_verified) {
      logger.info('Email already verified', {
        userId: user.id,
        email: user.email
      });
      return res.status(200).json({
        message: 'Email already verified',
        email_verified: true
      });
    }

    // Validate token matches
    if (user.verification_token !== token) {
      logger.warn('Email verification failed - invalid token', {
        userId: user.id,
        email: user.email
      });
      return res.status(400).json({
        error: 'Invalid verification token'
      });
    }

    // Check if token is expired (1 minute expiry)
    if (user.isTokenExpired()) {
      logger.warn('Email verification failed - token expired', {
        userId: user.id,
        email: user.email,
        tokenAge: Date.now() - new Date(user.token_created_at).getTime()
      });
      return res.status(400).json({
        error: 'Verification token has expired. Please request a new verification email.'
      });
    }

    // Token is valid - verify the email
    user.email_verified = true;
    user.verification_token = null;  // Clear token after use
    user.token_created_at = null;
    await user.save();

    logger.info('Email verified successfully', {
      userId: user.id,
      email: user.email
    });

    res.status(200).json({
      message: 'Email verified successfully',
      email_verified: true
    });

  } catch (error) {
    logger.error('Email verification error', {
      error: error.message,
      stack: error.stack,
      email: req.query?.email
    });
    
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// GET /v1/user/{userId} - Get user info by ID (requires authentication)
router.get('/v1/user/:userId',
  authenticate,
  checkNoPayload,
  async (req, res) => {
    try {
      const { userId } = req.params;
      
      logger.info('Get user request received', {
        requestedUserId: userId,
        authenticatedUserId: req.user.id
      });
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        logger.warn('Get user failed - invalid UUID format', {
          userId
        });
        return res.status(400).json({ error: 'Invalid user ID format' });
      }
      
      // Check if user is requesting their own information
      if (userId !== req.user.id) {
        logger.warn('Get user failed - unauthorized access attempt', {
          requestedUserId: userId,
          authenticatedUserId: req.user.id
        });
        return res.status(403).json({ error: 'You can only access your own user information' });
      }
      
      // Get user information
      const user = await User.findByPk(userId);
      
      if (!user) {
        logger.warn('Get user failed - user not found', {
          userId
        });
        return res.status(404).json({ error: 'User not found' });
      }
      
      logger.info('User retrieved successfully', {
        userId: user.id
      });
      
      res.status(200).json(user);
    } catch (error) {
      logger.error('Get user error', {
        error: error.message,
        stack: error.stack,
        userId: req.params.userId
      });
      res.status(500).json({ error: 'Failed to retrieve user information' });
    }
});

// PUT /v1/user/{userId} - Update user (full update)
router.put('/v1/user/:userId',
  authenticate,
  rejectUnknownFields(UPDATE_FIELDS),
  validateUserUpdate,
  checkValidation,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { password, first_name, last_name } = req.body;
      
      logger.info('User update (PUT) request received', {
        userId,
        authenticatedUserId: req.user.id,
        fieldsToUpdate: Object.keys(req.body)
      });
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        logger.warn('User update failed - invalid UUID format', {
          userId
        });
        return res.status(400).json({ error: 'Invalid user ID format' });
      }
      
      // Check if user is updating their own information
      if (userId !== req.user.id) {
        logger.warn('User update failed - unauthorized access attempt', {
          requestedUserId: userId,
          authenticatedUserId: req.user.id
        });
        return res.status(403).json({ error: 'You can only update your own user information' });
      }
      
      // Check that all required fields are provided for PUT
      if (!password || !first_name || !last_name) {
        logger.warn('User update failed - missing required fields for PUT', {
          userId,
          providedFields: Object.keys(req.body)
        });
        return res.status(400).json({ 
          error: 'PUT requires all updatable fields: password, first_name, last_name' 
        });
      }
      
      // Get user
      const user = await User.findByPk(userId);
      
      if (!user) {
        logger.warn('User update failed - user not found', {
          userId
        });
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Build update object
      const updates = {
        password,
        first_name,
        last_name
      };
      
      // Update user
      await user.update(updates);
      
      logger.info('User updated successfully (PUT)', {
        userId: user.id
      });
      
      res.status(204).send(); // No content response for successful update
      
    } catch (error) {
      logger.error('User update error', {
        error: error.message,
        stack: error.stack,
        userId: req.params.userId
      });
      
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message);
        return res.status(400).json({ errors: messages });
      }
      
      res.status(400).json({ error: 'Failed to update user' });
    }
});

// PATCH /v1/user/{userId} - Partial update user
router.patch('/v1/user/:userId',
  authenticate,
  rejectUnknownFields(UPDATE_FIELDS),
  validateUserUpdate,
  checkValidation,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { password, first_name, last_name } = req.body;
      
      logger.info('User update (PATCH) request received', {
        userId,
        authenticatedUserId: req.user.id,
        fieldsToUpdate: Object.keys(req.body)
      });
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        logger.warn('User update failed - invalid UUID format', {
          userId
        });
        return res.status(400).json({ error: 'Invalid user ID format' });
      }
      
      // Check if user is updating their own information
      if (userId !== req.user.id) {
        logger.warn('User update failed - unauthorized access attempt', {
          requestedUserId: userId,
          authenticatedUserId: req.user.id
        });
        return res.status(403).json({ error: 'You can only update your own user information' });
      }
      
      // Get user
      const user = await User.findByPk(userId);
      
      if (!user) {
        logger.warn('User update failed - user not found', {
          userId
        });
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Build update object with only provided fields
      const updates = {};
      if (password !== undefined) updates.password = password;
      if (first_name !== undefined) updates.first_name = first_name;
      if (last_name !== undefined) updates.last_name = last_name;
      
      // Check if any valid fields were provided
      if (Object.keys(updates).length === 0) {
        logger.warn('User update failed - no valid fields to update', {
          userId
        });
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      
      // Update user
      await user.update(updates);
      
      logger.info('User updated successfully (PATCH)', {
        userId: user.id,
        updatedFields: Object.keys(updates)
      });
      
      res.status(204).send(); // No content response for successful update
      
    } catch (error) {
      logger.error('User update error', {
        error: error.message,
        stack: error.stack,
        userId: req.params.userId
      });
      
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message);
        return res.status(400).json({ errors: messages });
      }
      
      res.status(400).json({ error: 'Failed to update user' });
    }
});

// Handle unsupported methods for user endpoints
router.all('/v1/user', (req, res) => {
  logger.warn('Method not allowed on /v1/user', {
    method: req.method,
    ip: req.ip
  });
  res.status(405).json({ error: 'Method not allowed' });
});

router.all('/v1/user/:userId', (req, res) => {
  if (!['GET', 'PUT', 'PATCH'].includes(req.method)) {
    logger.warn('Method not allowed on /v1/user/:userId', {
      method: req.method,
      userId: req.params.userId,
      ip: req.ip
    });
    res.status(405).json({ error: 'Method not allowed' });
  }
});

module.exports = router;