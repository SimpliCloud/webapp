const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HealthCheck = sequelize.define('HealthCheck', {
  // Primary key with auto-increment
  check_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    comment: 'Unique identifier for each health check request'
  },
  
  // Timestamp field with UTC timezone and auto-population
  check_datetime: {
    type: DataTypes.DATE, // Maps to DATETIME in MySQL
    allowNull: false,
    defaultValue: DataTypes.NOW, // Database sets current timestamp
    comment: 'UTC timestamp when health check was performed'
  }
}, {
  // Table configuration
  tableName: 'health_checks',
  timestamps: false, // We're managing timestamps manually
  indexes: [
    {
      fields: ['check_datetime'],
      name: 'idx_health_checks_datetime'
    }
  ],
  
  // Hooks to ensure UTC timezone handling
  hooks: {
    // Ensure UTC timestamp is set before creating record
    beforeCreate: (healthCheck) => {
      if (!healthCheck.check_datetime) {
        healthCheck.check_datetime = new Date();
      }
    }
  }
});

// Static method to create a health check record - used by API endpoint
HealthCheck.createHealthCheckRecord = async () => {
  try {
    // Insert new record with current UTC timestamp
    const record = await HealthCheck.create({
      check_datetime: new Date() // Explicitly set UTC timestamp
    });
    console.log(`✓ Health check record created: ID ${record.check_id}`);
    return record;
  } catch (error) {
    console.error(`✗ Failed to create health check record: ${error.message}`);
    throw new Error(`Failed to create health check record: ${error.message}`);
  }
};

module.exports = HealthCheck;
