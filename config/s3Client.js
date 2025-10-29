const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const logger = require('./logger');
const { metricsHelper } = require('./metrics');

// Create S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  // Credentials automatically loaded from IAM role
});

/**
 * Wrapper for S3 PutObject with timing and logging
 */
const putObject = async (params) => {
  const startTime = Date.now();
  const operation = 'put_object';
  
  try {
    logger.info('Starting S3 upload', {
      bucket: params.Bucket,
      key: params.Key,
      contentType: params.ContentType
    });

    const command = new PutObjectCommand(params);
    const response = await s3Client.send(command);
    
    const duration = Date.now() - startTime;
    
    // Send timing metric
    metricsHelper.timingS3Operation(operation, duration);
    
    logger.info('S3 upload completed', {
      bucket: params.Bucket,
      key: params.Key,
      duration: `${duration}ms`,
      etag: response.ETag
    });
    
    return response;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Track failed operation
    metricsHelper.timingS3Operation(`${operation}_failed`, duration);
    metricsHelper.incrementError('s3_error', 'put_object');
    
    logger.error('S3 upload failed', {
      bucket: params.Bucket,
      key: params.Key,
      duration: `${duration}ms`,
      error: error.message
    });
    
    throw error;
  }
};

/**
 * Wrapper for S3 GetObject with timing and logging
 */
const getObject = async (params) => {
  const startTime = Date.now();
  const operation = 'get_object';
  
  try {
    logger.debug('Starting S3 download', {
      bucket: params.Bucket,
      key: params.Key
    });

    const command = new GetObjectCommand(params);
    const response = await s3Client.send(command);
    
    const duration = Date.now() - startTime;
    
    // Send timing metric
    metricsHelper.timingS3Operation(operation, duration);
    
    logger.info('S3 download completed', {
      bucket: params.Bucket,
      key: params.Key,
      duration: `${duration}ms`,
      contentLength: response.ContentLength
    });
    
    return response;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Track failed operation
    metricsHelper.timingS3Operation(`${operation}_failed`, duration);
    metricsHelper.incrementError('s3_error', 'get_object');
    
    logger.error('S3 download failed', {
      bucket: params.Bucket,
      key: params.Key,
      duration: `${duration}ms`,
      error: error.message
    });
    
    throw error;
  }
};

/**
 * Wrapper for S3 DeleteObject with timing and logging
 */
const deleteObject = async (params) => {
  const startTime = Date.now();
  const operation = 'delete_object';
  
  try {
    logger.info('Starting S3 delete', {
      bucket: params.Bucket,
      key: params.Key
    });

    const command = new DeleteObjectCommand(params);
    const response = await s3Client.send(command);
    
    const duration = Date.now() - startTime;
    
    // Send timing metric
    metricsHelper.timingS3Operation(operation, duration);
    
    logger.info('S3 delete completed', {
      bucket: params.Bucket,
      key: params.Key,
      duration: `${duration}ms`
    });
    
    return response;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Track failed operation
    metricsHelper.timingS3Operation(`${operation}_failed`, duration);
    metricsHelper.incrementError('s3_error', 'delete_object');
    
    logger.error('S3 delete failed', {
      bucket: params.Bucket,
      key: params.Key,
      duration: `${duration}ms`,
      error: error.message
    });
    
    throw error;
  }
};

module.exports = {
  s3Client,
  putObject,
  getObject,
  deleteObject
};