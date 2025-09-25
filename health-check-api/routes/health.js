const express = require('express');
const HealthCheck = require('../models/HealthCheck');
const router = express.Router();

// Health check endpoint: GET /healthz - core API functionality
router.get('/healthz', async (req, res) => {
  try {
    // Payload validation - reject any request with body or query parameters
    const hasQueryParams = Object.keys(req.query).length > 0;
    const hasBody = req.body && Object.keys(req.body).length > 0;
    const hasContentLength = req.get('content-length') && parseInt(req.get('content-length')) > 0;

    if (req.method === 'HEAD') {
      return res.status(405)
        .set('Cache-Control', 'no-cache, no-store, must-revalidate')
        .set('Pragma', 'no-cache')
        .set('X-Content-Type-Options', 'nosniff')
        .end();
    }

    // Reject any request that contains query parameters, body, or content-length
    if (hasQueryParams || hasBody || hasContentLength) {
      const payloadType = hasQueryParams ? 'query parameters' : 'request body';
      console.log(`✗ Health check request rejected: contains ${payloadType}`);

      // Return 400 Bad Request with required headers
      return res.status(400)
        .set('Cache-Control', 'no-cache, no-store, must-revalidate')
        .set('Pragma', 'no-cache')
        .set('X-Content-Type-Options', 'nosniff')
        .end(); // No response body as per requirements
    }

    // Database connectivity test - attempt to insert record
    await HealthCheck.createHealthCheckRecord();

    console.log('✓ Health check successful: database insert completed');

    // Return 200 OK with required headers and no body
    res.status(200)
      .set('Cache-Control', 'no-cache, no-store, must-revalidate')  // Prevent caching
      .set('Pragma', 'no-cache')                                    // HTTP/1.0 cache control
      .set('X-Content-Type-Options', 'nosniff')                     // Security header
      .end(); // Empty response body as required

  } catch (error) {
    console.error('✗ Health check failed:', error.message);

    // Return 503 Service Unavailable if database insert fails
    // This indicates the service cannot handle requests due to database issues
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
    return res.status(405)
      .set('Cache-Control', 'no-cache, no-store, must-revalidate')
      .set('Pragma', 'no-cache')
      .set('X-Content-Type-Options', 'nosniff')
      .end();
  }
  // Only GET method is allowed - all others return 405
  if (req.method !== 'GET') {
    console.log(`✗ Health check request rejected: method ${req.method} not allowed`);

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