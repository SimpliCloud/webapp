const { Sequelize } = require('sequelize');
require('dotenv').config();
const logger = require('./logger');
const { metricsHelper } = require('./metrics');

// Database configuration with environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'health_check_db',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  dialect: 'mysql',
  
  // Custom logging function that tracks query timing
  logging: (sql, timing) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Database query executed', {
        sql: sql.substring(0, 200), // Limit SQL length in logs
        duration: timing ? `${timing}ms` : 'N/A'
      });
    }
    
    // Send query timing to CloudWatch
    if (timing) {
      metricsHelper.timingDbQuery('query', timing);
    }
  },
  
  // Enable benchmark to get query execution time
  benchmark: true,

  // Connection pooling configuration
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    min: parseInt(process.env.DB_POOL_MIN) || 0,
    acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
    idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
  },
  
  dialectOptions: {
    timezone: '+00:00',
    charset: 'utf8mb4',
  },
  
  timezone: '+00:00',
  
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  }
};

// Create Sequelize instance
const sequelize = new Sequelize(dbConfig);

// Add global hooks for query timing and logging
sequelize.addHook('beforeQuery', (options) => {
  options.startTime = Date.now();
  
  // Log query start in development
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Starting database query', {
      type: options.type,
      model: options.model ? options.model.name : 'N/A'
    });
  }
});

sequelize.addHook('afterQuery', (options, query) => {
  const duration = Date.now() - options.startTime;
  
  // Determine operation type for better metrics
  let operationType = 'unknown';
  if (options.type) {
    const type = options.type.toLowerCase();
    if (type.includes('select')) operationType = 'select';
    else if (type.includes('insert')) operationType = 'insert';
    else if (type.includes('update')) operationType = 'update';
    else if (type.includes('delete')) operationType = 'delete';
    else if (type.includes('bulkupdate')) operationType = 'bulk_update';
    else if (type.includes('bulkdelete')) operationType = 'bulk_delete';
    else operationType = type;
  }
  
  // Send timing metric to CloudWatch
  metricsHelper.timingDbQuery(operationType, duration);
  
  // Log slow queries (over 1 second)
  if (duration > 1000) {
    logger.warn('Slow database query detected', {
      duration: `${duration}ms`,
      type: operationType,
      model: options.model ? options.model.name : 'N/A',
      sql: query ? query.substring(0, 200) : 'N/A'
    });
  }
});

// Test database connection
const testConnection = async () => {
  try {
    const startTime = Date.now();
    await sequelize.authenticate();
    const duration = Date.now() - startTime;
    
    logger.info('Database connected successfully', {
      host: dbConfig.host,
      database: dbConfig.database,
      connectionTime: `${duration}ms`
    });
    
    // Track connection establishment time
    metricsHelper.timingDbQuery('connection', duration);
    
    return true;
  } catch (error) {
    logger.error('Unable to connect to database', {
      error: error.message,
      host: dbConfig.host,
      database: dbConfig.database
    });
    return false;
  }
};

// Initialize database and sync models
const initializeDatabase = async () => {
  try {
    const startTime = Date.now();
    
    // Import all models to ensure associations are set up
    require('../models/index');
    
    // Sync database schema
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    
    const duration = Date.now() - startTime;
    
    logger.info('Database synchronized successfully', {
      duration: `${duration}ms`
    });
    
    return true;
  } catch (error) {
    logger.error('Error synchronizing database', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
};

// Export functions and sequelize instance
module.exports = {
  sequelize,
  testConnection,
  initializeDatabase
};