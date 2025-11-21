const User = require('../models/User');
const logger = require('../config/logger');

// Basic Authentication Middleware with Email Verification Check
const authenticate = async (req, res, next) => {
  try {
    // Check for Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401)
        .set('WWW-Authenticate', 'Basic realm="User Authentication"')
        .json({ error: 'Authentication required' });
    }
    
    // Parse Basic Authentication header
    const authType = authHeader.split(' ')[0];
    const authValue = authHeader.split(' ')[1];
    
    if (authType !== 'Basic') {
      return res.status(401)
        .set('WWW-Authenticate', 'Basic realm="User Authentication"')
        .json({ error: 'Basic authentication required' });
    }
    
    // Decode base64 credentials
    const credentials = Buffer.from(authValue, 'base64').toString('utf-8');
    const [email, password] = credentials.split(':');
    
    if (!email || !password) {
      return res.status(401)
        .set('WWW-Authenticate', 'Basic realm="User Authentication"')
        .json({ error: 'Invalid credentials format' });
    }
    
    // Authenticate user
    const user = await User.authenticate(email, password);
    
    if (!user) {
      return res.status(401)
        .set('WWW-Authenticate', 'Basic realm="User Authentication"')
        .json({ error: 'Invalid email or password' });
    }
    // Check if email is verified
    if (!user.email_verified) {
      logger.warn('Access denied - email not verified', {
        userId: user.id,
        email: user.email
      });
      
      return res.status(403).json({
        error: 'Email not verified. Please verify your email before accessing this resource.',
        email_verified: false
      });
    }
    
    // Attach user to request object for use in routes
    req.user = user;
    next();
    
  } catch (error) {
    logger.error('Authentication error', {
      error: error.message,
      stack: error.stack
    });
    return res.status(401)
      .set('WWW-Authenticate', 'Basic realm="User Authentication"')
      .json({ error: 'Authentication failed' });
  }
};

// Optional authentication - doesn't fail if no auth provided
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      req.user = null;
      return next();
    }
    
    const authType = authHeader.split(' ')[0];
    const authValue = authHeader.split(' ')[1];
    
    if (authType === 'Basic') {
      const credentials = Buffer.from(authValue, 'base64').toString('utf-8');
      const [email, password] = credentials.split(':');
      
      if (email && password) {
        const user = await User.authenticate(email, password);
        
        // Check email verification for optional auth too
        if (user && user.email_verified) {
          req.user = user;
        } else {
          req.user = null;
        }
      }
    }
    
    next();
    
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth
};