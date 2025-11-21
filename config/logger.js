const winston = require('winston');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    if (Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

const transports = [];

// ============= PRODUCTION LOGGING (EC2) =============
if (process.env.NODE_ENV === "production") {
  transports.push(
    new winston.transports.File({
      filename: '/opt/csye6225/logs/webapp.log',
      maxsize: 10485760,
      maxFiles: 5,
      tailable: true
    })
  );

  transports.push(
    new winston.transports.File({
      filename: '/opt/csye6225/logs/exceptions.log'
    })
  );

  transports.push(
    new winston.transports.File({
      filename: '/opt/csye6225/logs/rejections.log'
    })
  );
}

// ============= DEV + TEST LOGGING (CI, local) =============
if (process.env.NODE_ENV !== "production") {
  transports.push(
    new winston.transports.Console({
      format: winston.format.simple()
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
});

module.exports = logger;
