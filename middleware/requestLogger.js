const logger = require('../config/logger');
const { metricsHelper } = require('../config/metrics');

// Request logging and metrics middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log incoming request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Capture response to log and track metrics
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    const endpoint = req.route ? req.route.path : req.path;
    
    // Log response
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });

    // Send metrics to CloudWatch via StatsD
    metricsHelper.incrementApiCall(endpoint, req.method, res.statusCode);
    metricsHelper.timingApiResponse(endpoint, req.method, duration);

    // Track errors
    if (res.statusCode >= 400) {
      metricsHelper.incrementError(
        res.statusCode >= 500 ? 'server_error' : 'client_error',
        endpoint
      );
    }

    originalSend.call(this, data);
  };

  next();
};

module.exports = requestLogger;