const User = require('../models/User');

// Basic Authentication Middleware
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
    
    // Attach user to request object for use in routes
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Authentication error:', error);
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
      // No authentication provided, continue without user
      req.user = null;
      return next();
    }
    
    // Try to authenticate
    const authType = authHeader.split(' ')[0];
    const authValue = authHeader.split(' ')[1];
    
    if (authType === 'Basic') {
      const credentials = Buffer.from(authValue, 'base64').toString('utf-8');
      const [email, password] = credentials.split(':');
      
      if (email && password) {
        const user = await User.authenticate(email, password);
        req.user = user;
      }
    }
    
    next();
    
  } catch (error) {
    // If authentication fails, continue without user
    req.user = null;
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth
};