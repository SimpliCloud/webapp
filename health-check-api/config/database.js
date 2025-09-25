const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration with environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'health_check_db',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  dialect: 'mysql',
  // Logging SQL queries only in development mode
  logging: process.env.NODE_ENV === 'development' ? console.log : false,

  // Connection pooling configuration for performance
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 10, // Max connections
    min: parseInt(process.env.DB_POOL_MIN) || 0,  // Min connections
    acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000, // Max time to get connection
    idle: parseInt(process.env.DB_POOL_IDLE) || 10000, // Max idle time
  },
  dialectOptions: {
    timezone: '+00:00', // Store all timestamps in UTC
    charset: 'utf8mb4', // Support full UTF-8 including emojis
  },
  timezone: '+00:00', // Set Sequelize timezone to UTC
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  }
};

// Create Sequelize instance
const sequelize = new Sequelize(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected.');
    return true;
  } catch (error) {
    console.error('✗ Unable to connect to the database:', error.message);
    return false;
  }
};

// Initialize database and sync models
const initializeDatabase = async () => {
  try {
    // Import all models to ensure associations are set up
    require('../models/index');
    
    // This will create tables if they don't exist
    // In production, you might want to use migrations instead
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✓ Database synchronized successfully.');
    return true;
  } catch (error) {
    console.error('✗ Error synchronizing database:', error.message);
    return false;
  }
};

// Export functions for use in server initialization
module.exports = {
  sequelize,
  testConnection,
  initializeDatabase
};