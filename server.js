const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

// Import database configuration
const { testConnection, initializeDatabase } = require('./config/database');

// Import routes
const healthRoutes = require('./routes/health');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const imageRoutes = require('./routes/images');

const app = express();
const PORT = process.env.PORT || 8080;

console.log('Starting application');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Port: ${PORT}`);

// Security middleware - adds security headers to all responses
app.use(helmet());

// CORS configuration for API access
app.use(cors({
  origin: false, // No frontend, but keeping for API clients
  credentials: true // Allow credentials for Basic Auth
}));

// JSON parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Disable Express server identification
app.disable('x-powered-by');

// Request logging middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Mount routes
app.use('/', healthRoutes);  // Health check endpoint
app.use('/', userRoutes);    // User management endpoints
app.use('/', productRoutes);
app.use('/', imageRoutes);  // Product management endpoints

// 404 handler for undefined routes
app.use('*', (req, res) => {
  console.log(`✗ 404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404)
    .set('Cache-Control', 'no-cache, no-store, must-revalidate')
    .set('Pragma', 'no-cache')
    .set('X-Content-Type-Options', 'nosniff')
    .json({ error: 'Endpoint not found' });
});

// Global error handler - prevents 500 errors from crashing the application
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  // Don't expose error details in production
  const message = process.env.NODE_ENV === 'development' 
    ? error.message 
    : 'Internal Server Error';
    
  res.status(500)
    .set('Cache-Control', 'no-cache, no-store, must-revalidate')
    .set('Pragma', 'no-cache')
    .set('X-Content-Type-Options', 'nosniff')
    .json({ error: message });
});

// Graceful shutdown handler - ensures clean shutdown for SIGTERM/SIGINT
const gracefulShutdown = (server) => {
  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    server.close(() => {
      console.log('✓ Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    server.close(() => {
      console.log('✓ Server closed');
      process.exit(0);
    });
  });
};

// Main application initialization function
const startServer = async () => {
  try {
    console.log('Testing database connection...');
    
    // Test database connection first - fails fast if database unavailable
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }
    
    console.log('Initializing database schema...');
    
    // Initialize database schema automatically - no manual SQL scripts needed
    const dbInitialized = await initializeDatabase();
    if (!dbInitialized) {
      console.error('Failed to initialize database. Exiting...');
      process.exit(1);
    }
    
    // Start the HTTP server only after database is ready
    const server = app.listen(PORT, () => {
      console.log('\n✓ Cloud-Native Web Application is running!');
      console.log(`📍 Server URL: http://localhost:${PORT}`);
      console.log('\nAvailable endpoints:');
      console.log('  Health Check:');
      console.log('    GET /healthz');
      console.log('  User Management:');
      console.log('    POST   /v1/user        - Create user');
      console.log('    GET    /v1/user/self   - Get user info (auth required)');
      console.log('    PUT    /v1/user/self   - Update user (auth required)');
      console.log('    PATCH  /v1/user/self   - Partial update (auth required)');
      console.log('  Product Management:');
      console.log('    POST   /v1/product     - Create product (auth required)');
      console.log('    GET    /v1/product/:id - Get product');
      console.log('    PUT    /v1/product/:id - Update product (auth required)');
      console.log('    PATCH  /v1/product/:id - Partial update (auth required)');
      console.log('    DELETE /v1/product/:id - Delete product (auth required)');
      console.log('\n✓ Ready to accept requests\n');
    });
    
    // Set up graceful shutdown
    gracefulShutdown(server);
    
    return server;
    
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;