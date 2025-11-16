const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const logger = require('./logger');

// Create SNS client
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'us-east-1'
  // Credentials automatically loaded from IAM role
});

/**
 * Publish message to SNS topic
 * @param {Object} message - Message object to publish
 * @param {string} subject - Message subject
 * @returns {Promise<Object>} - SNS publish response
 */
const publishToSNS = async (message, subject = 'User Registration') => {
  const topicArn = process.env.SNS_TOPIC_ARN;

  if (!topicArn) {
    logger.error('SNS topic ARN not configured', {
      error: 'SNS_TOPIC_ARN environment variable is missing'
    });
    throw new Error('SNS topic not configured');
  }

  const params = {
    TopicArn: topicArn,
    Message: JSON.stringify(message),
    Subject: subject,
    MessageAttributes: {
      email: {
        DataType: 'String',
        StringValue: message.email
      },
      userId: {
        DataType: 'String',
        StringValue: message.userId
      },
      messageType: {
        DataType: 'String',
        StringValue: 'USER_REGISTRATION'
      }
    }
  };

  try {
    logger.info('Publishing message to SNS', {
      topicArn,
      email: message.email,
      userId: message.userId
    });

    const command = new PublishCommand(params);
    const response = await snsClient.send(command);

    logger.info('SNS message published successfully', {
      messageId: response.MessageId,
      email: message.email
    });

    return response;

  } catch (error) {
    logger.error('Failed to publish SNS message', {
      error: error.message,
      stack: error.stack,
      topicArn,
      email: message.email
    });

    throw error;
  }
};

module.exports = {
  snsClient,
  publishToSNS
};