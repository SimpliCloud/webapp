const StatsD = require('hot-shots');
const logger = require('./logger');

// Create StatsD client
const metrics = new StatsD({
  host: process.env.STATSD_HOST || 'localhost',
  port: parseInt(process.env.STATSD_PORT) || 8125,
  prefix: 'webapp.',
  globalTags: {
    environment: process.env.NODE_ENV || 'production',
    service: 'csye6225-webapp'
  },
  errorHandler: (error) => {
    logger.error('StatsD error', { error: error.message });
  },
  // Use UDP for performance
  protocol: 'udp',
  // Buffer metrics for efficiency
  cacheDns: true,
  maxBufferSize: 1000
});

// Metric helper functions
const metricsHelper = {
  // Increment API call counter
  incrementApiCall: (endpoint, method, statusCode) => {
    metrics.increment('api.calls', 1, {
      endpoint,
      method,
      status_code: statusCode.toString()
    });
  },

  // Time API response
  timingApiResponse: (endpoint, method, duration) => {
    metrics.timing('api.response_time', duration, {
      endpoint,
      method
    });
  },

  // Time database query
  timingDbQuery: (operation, duration) => {
    metrics.timing('db.query_time', duration, {
      operation
    });
  },

  // Time S3 operation
  timingS3Operation: (operation, duration) => {
    metrics.timing('s3.operation_time', duration, {
      operation
    });
  },

  // Increment error counter
  incrementError: (type, endpoint) => {
    metrics.increment('errors', 1, {
      type,
      endpoint
    });
  },

  // Gauge for active connections (optional)
  gaugeActiveConnections: (count) => {
    metrics.gauge('connections.active', count);
  }
};

module.exports = {
  metrics,
  metricsHelper
};