const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const logger = require('./logger');
const { metricsHelper } = require('./metrics');

// Create SNS client
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

/**
 * Publish user verification message to SNS topic
 * @param {Object} userData - User data to include in message
 * @returns {Promise<Object>} - SNS publish response
 */
const publishUserVerification = async (userData) => {
  const startTime = Date.now();
  
  try {
    const message = {
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      verification_token: userData.verification_token,
      token_created_at: userData.token_created_at,
      user_id: userData.id
    };
    
    logger.info('Publishing user verification message to SNS', {
      email: userData.email,
      user_id: userData.id,
      topic: process.env.SNS_TOPIC_ARN
    });
    
    const command = new PublishCommand({
      TopicArn: process.env.SNS_TOPIC_ARN,
      Message: JSON.stringify(message),
      Subject: 'New User Verification Required',
      MessageAttributes: {
        email: {
          DataType: 'String',
          StringValue: userData.email
        },
        user_id: {
          DataType: 'String',
          StringValue: userData.id
        },
        event_type: {
          DataType: 'String',
          StringValue: 'user_verification'
        }
      }
    });
    
    const response = await snsClient.send(command);
    
    const duration = Date.now() - startTime;
    
    logger.info('SNS message published successfully', {
      email: userData.email,
      user_id: userData.id,
      message_id: response.MessageId,
      duration: `${duration}ms`
    });
    
    // Track SNS publish timing
    metricsHelper.timingSnsPublish('user_verification', duration);
    
    return response;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Failed to publish SNS message', {
      error: error.message,
      stack: error.stack,
      email: userData.email,
      user_id: userData.id,
      duration: `${duration}ms`
    });
    
    // Track SNS publish failure
    metricsHelper.incrementError('sns_publish_failed', 'user_verification');
    
    throw error;
  }
};

module.exports = {
  snsClient,
  publishUserVerification
};