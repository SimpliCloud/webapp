const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
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
      
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      
      // Create new user
      const user = await User.create({
        email,
        password,
        first_name,
        last_name
      });
      
      // Return user data (password excluded by toJSON method)
      res.status(201).json(user);
      
    } catch (error) {
      console.error('User creation error:', error);
      
      // Handle Sequelize validation errors
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message);
        return res.status(400).json({ errors: messages });
      }
      
      // Handle unique constraint violation
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      
      res.status(400).json({ error: 'Failed to create user' });
    }
});

// GET /v1/user/{userId} - Get user info by ID (requires authentication)
router.get('/v1/user/:userId',
  authenticate,
  checkNoPayload,
  async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }
      
      // Check if user is requesting their own information
      if (userId !== req.user.id) {
        return res.status(403).json({ error: 'You can only access your own user information' });
      }
      
      // Get user information
      const user = await User.findByPk(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.status(200).json(user);
    } catch (error) {
      console.error('Get user error:', error);
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
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }
      
      // Check if user is updating their own information
      if (userId !== req.user.id) {
        return res.status(403).json({ error: 'You can only update your own user information' });
      }
      
      // Check that all required fields are provided for PUT
      if (!password || !first_name || !last_name) {
        return res.status(400).json({ 
          error: 'PUT requires all updatable fields: password, first_name, last_name' 
        });
      }
      
      // Get user
      const user = await User.findByPk(userId);
      
      if (!user) {
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
      
      // Reload to get updated data
      await user.reload();
      
      res.status(204).send(); // No content response for successful update
      
    } catch (error) {
      console.error('User update error:', error);
      
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
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }
      
      // Check if user is updating their own information
      if (userId !== req.user.id) {
        return res.status(403).json({ error: 'You can only update your own user information' });
      }
      
      // Get user
      const user = await User.findByPk(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Build update object with only provided fields
      const updates = {};
      if (password !== undefined) updates.password = password;
      if (first_name !== undefined) updates.first_name = first_name;
      if (last_name !== undefined) updates.last_name = last_name;
      
      // Check if any valid fields were provided
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      
      // Update user
      await user.update(updates);
      
      // Reload to get updated data
      await user.reload();
      
      res.status(204).send(); // No content response for successful update
      
    } catch (error) {
      console.error('User update error:', error);
      
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message);
        return res.status(400).json({ errors: messages });
      }
      
      res.status(400).json({ error: 'Failed to update user' });
    }
});

// Handle unsupported methods for user endpoints
router.all('/v1/user', (req, res) => {
  res.status(405).json({ error: 'Method not allowed' });
});

router.all('/v1/user/:userId', (req, res) => {
  if (!['GET', 'PUT', 'PATCH'].includes(req.method)) {
    res.status(405).json({ error: 'Method not allowed' });
  }
});

module.exports = router;