const express = require('express');
const HealthCheck = require('../models/HealthCheck');
const logger = require('../config/logger');
const router = express.Router();

// Health check endpoint: GET /healthz - core API functionality
router.get('/healthz', async (req, res) => {
  try {
    // Payload validation - reject any request with body or query parameters
    const hasQueryParams = Object.keys(req.query).length > 0;
    const hasBody = req.body && Object.keys(req.body).length > 0;
    const hasContentLength = req.get('content-length') && parseInt(req.get('content-length')) > 0;

    if (req.method === 'HEAD') {
      logger.warn('Health check - HEAD method not allowed', {
        method: req.method,
        ip: req.ip
      });
      return res.status(405)
        .set('Cache-Control', 'no-cache, no-store, must-revalidate')
        .set('Pragma', 'no-cache')
        .set('X-Content-Type-Options', 'nosniff')
        .end();
    }

    // Reject any request that contains query parameters, body, or content-length
    if (hasQueryParams || hasBody || hasContentLength) {
      const payloadType = hasQueryParams ? 'query parameters' : 'request body';
      logger.warn('Health check request rejected - contains payload', {
        payloadType,
        hasQueryParams,
        hasBody,
        hasContentLength,
        ip: req.ip
      });

      // Return 400 Bad Request with required headers
      return res.status(400)
        .set('Cache-Control', 'no-cache, no-store, must-revalidate')
        .set('Pragma', 'no-cache')
        .set('X-Content-Type-Options', 'nosniff')
        .end(); // No response body as per requirements
    }

    // Database connectivity test - attempt to insert record
    logger.debug('Health check - testing database connection');
    
    await HealthCheck.createHealthCheckRecord();

    logger.info('Health check successful - database connection verified', {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Return 200 OK with required headers and no body
    res.status(200)
      .set('Cache-Control', 'no-cache, no-store, must-revalidate')
      .set('Pragma', 'no-cache')
      .set('X-Content-Type-Options', 'nosniff')
      .end(); // Empty response body as required

  } catch (error) {
    logger.error('Health check failed - database connection error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });

    // Return 503 Service Unavailable if database insert fails
    res.status(503)
      .set('Cache-Control', 'no-cache, no-store, must-revalidate')
      .set('Pragma', 'no-cache')
      .set('X-Content-Type-Options', 'nosniff')
      .end(); // No response body
  }
});

// Handle all other HTTP methods on /healthz endpoint
router.all('/healthz', (req, res) => {

  if (req.method === 'HEAD') {
    logger.warn('Health check - HEAD method not allowed', {
      method: req.method,
      ip: req.ip
    });
    return res.status(405)
      .set('Cache-Control', 'no-cache, no-store, must-revalidate')
      .set('Pragma', 'no-cache')
      .set('X-Content-Type-Options', 'nosniff')
      .end();
  }

  // Only GET method is allowed - all others return 405
  if (req.method !== 'GET') {
    logger.warn('Health check - method not allowed', {
      method: req.method,
      ip: req.ip
    });

    // Return 405 Method Not Allowed for POST, PUT, DELETE, PATCH, etc.
    return res.status(405)
      .set('Cache-Control', 'no-cache, no-store, must-revalidate')
      .set('Pragma', 'no-cache')
      .set('X-Content-Type-Options', 'nosniff')
      .end(); // No response body
  }
});

// Export router for mounting in main server
module.exports = router;