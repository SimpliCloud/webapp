const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

// Import logger and metrics
const logger = require('./config/logger');
const { metrics } = require('./config/metrics');
const requestLogger = require('./middleware/requestLogger');

// Import database configuration
const { testConnection, initializeDatabase } = require('./config/database');

// Import routes
const healthRoutes = require('./routes/health');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const imageRoutes = require('./routes/images');
const verificationRoutes = require('./routes/verification'); // ADD THIS LINE

const app = express();
const PORT = process.env.PORT || 8080;

logger.info('Starting application', {
  environment: process.env.NODE_ENV || 'development',
  port: PORT,
  nodeVersion: process.version
});

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: false,
  credentials: true
}));

// JSON parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Disable Express server identification
app.disable('x-powered-by');

// Request logging and metrics middleware
app.use(requestLogger);

// Mount routes
app.use('/', healthRoutes);
app.use('/', userRoutes);
app.use('/', productRoutes);
app.use('/', imageRoutes);
app.use('/', verificationRoutes); // ADD THIS LINE

// 404 handler
app.use('*', (req, res) => {
  logger.warn('404 Not Found', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip
  });
  
  res.status(404)
    .set('Cache-Control', 'no-cache, no-store, must-revalidate')
    .set('Pragma', 'no-cache')
    .set('X-Content-Type-Options', 'nosniff')
    .json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });
  
  const message = process.env.NODE_ENV === 'development' 
    ? error.message 
    : 'Internal Server Error';
    
  res.status(500)
    .set('Cache-Control', 'no-cache, no-store, must-revalidate')
    .set('Pragma', 'no-cache')
    .set('X-Content-Type-Options', 'nosniff')
    .json({ error: message });
});

// Graceful shutdown
const gracefulShutdown = (server) => {
  const shutdown = (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    
    server.close(() => {
      logger.info('HTTP server closed');
      
      // Close metrics client
      metrics.close(() => {
        logger.info('Metrics client closed');
        process.exit(0);
      });
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

// Main application initialization
const startServer = async () => {
  try {
    logger.info('Testing database connection...');
    
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database');
      process.exit(1);
    }
    
    logger.info('Initializing database schema...');
    
    const dbInitialized = await initializeDatabase();
    if (!dbInitialized) {
      logger.error('Failed to initialize database');
      process.exit(1);
    }
    
    const server = app.listen(PORT, () => {
      logger.info('Application started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
      });
    });
    
    gracefulShutdown(server);
    
    return server;
    
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;