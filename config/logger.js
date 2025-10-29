const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Write all logs to file
    new winston.transports.File({
      filename: '/opt/csye6225/logs/webapp.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    // Also log to console in development
    ...(process.env.NODE_ENV === 'development' 
      ? [new winston.transports.Console({ format: winston.format.simple() })] 
      : []
    )
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: '/opt/csye6225/logs/exceptions.log' 
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: '/opt/csye6225/logs/rejections.log' 
    })
  ]
});

module.exports = logger;