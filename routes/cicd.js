const express = require('express');
const router = express.Router();
const logger = require('../config/logger');

// CICD check endpoint: GET /cicd - demonstrates instance refresh
router.get('/cicc', async (req, res) => {
  try {
    // Payload validation - same as healthz
    const hasQueryParams = Object.keys(req.query).length > 0;
    const hasBody = req.body && Object.keys(req.body).length > 0;
    const hasContentLength = req.get('content-length') && parseInt(req.get('content-length')) > 0;

    if (req.method === 'HEAD') {
      logger.warn('CICD check - HEAD method not allowed', {
        method: req.method,
        ip: req.ip
      });
      return res.status(405)
        .set('Cache-Control', 'no-cache, no-store, must-revalidate')
        .set('Pragma', 'no-cache')
        .set('X-Content-Type-Options', 'nosniff')
        .end();
    }

    // Reject any request with query params, body, or content-length
    if (hasQueryParams || hasBody || hasContentLength) {
      const payloadType = hasQueryParams ? 'query parameters' : 'request body';
      logger.warn('CICD check request rejected - contains payload', {
        payloadType,
        ip: req.ip
      });

      return res.status(400)
        .set('Cache-Control', 'no-cache, no-store, must-revalidate')
        .set('Pragma', 'no-cache')
        .set('X-Content-Type-Options', 'nosniff')
        .end();
    }

    // Simple success response - no database check needed
    logger.info('CICD check successful', {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Return 200 OK with no body
    res.status(200)
      .set('Cache-Control', 'no-cache, no-store, must-revalidate')
      .set('Pragma', 'no-cache')
      .set('X-Content-Type-Options', 'nosniff')
      .end();

  } catch (error) {
    logger.error('CICD check failed', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });

    res.status(503)
      .set('Cache-Control', 'no-cache, no-store, must-revalidate')
      .set('Pragma', 'no-cache')
      .set('X-Content-Type-Options', 'nosniff')
      .end();
  }
});

// Handle all other HTTP methods
router.all('/cicc', (req, res) => {
  if (req.method === 'HEAD') {
    logger.warn('CICD check - HEAD method not allowed', {
      method: req.method,
      ip: req.ip
    });
    return res.status(405)
      .set('Cache-Control', 'no-cache, no-store, must-revalidate')
      .set('Pragma', 'no-cache')
      .set('X-Content-Type-Options', 'nosniff')
      .end();
  }

  if (req.method !== 'GET') {
    logger.warn('CICD check - method not allowed', {
      method: req.method,
      ip: req.ip
    });

    return res.status(405)
      .set('Cache-Control', 'no-cache, no-store, must-revalidate')
      .set('Pragma', 'no-cache')
      .set('X-Content-Type-Options', 'nosniff')
      .end();
  }
});

module.exports = router;