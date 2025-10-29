const logger = require('./logger');
const { metricsHelper } = require('./metrics');

/**
 * Add timing hooks to a Sequelize model
 * Tracks create, update, delete operations with detailed metrics
 */
const addModelHooks = (model, modelName) => {
  // Before create hook
  model.addHook('beforeCreate', (instance, options) => {
    options.hookStartTime = Date.now();
    logger.debug(`Creating ${modelName}`, {
      id: instance.id || 'new'
    });
  });

  // After create hook
  model.addHook('afterCreate', (instance, options) => {
    if (options.hookStartTime) {
      const duration = Date.now() - options.hookStartTime;
      metricsHelper.timingDbQuery(`${modelName.toLowerCase()}_create`, duration);
      
      logger.info(`${modelName} created`, {
        id: instance.id,
        duration: `${duration}ms`
      });
    }
  });

  // Before update hook
  model.addHook('beforeUpdate', (instance, options) => {
    options.hookStartTime = Date.now();
    logger.debug(`Updating ${modelName}`, {
      id: instance.id
    });
  });

  // After update hook
  model.addHook('afterUpdate', (instance, options) => {
    if (options.hookStartTime) {
      const duration = Date.now() - options.hookStartTime;
      metricsHelper.timingDbQuery(`${modelName.toLowerCase()}_update`, duration);
      
      logger.info(`${modelName} updated`, {
        id: instance.id,
        duration: `${duration}ms`
      });
    }
  });

  // Before destroy hook
  model.addHook('beforeDestroy', (instance, options) => {
    options.hookStartTime = Date.now();
    logger.debug(`Deleting ${modelName}`, {
      id: instance.id
    });
  });

  // After destroy hook
  model.addHook('afterDestroy', (instance, options) => {
    if (options.hookStartTime) {
      const duration = Date.now() - options.hookStartTime;
      metricsHelper.timingDbQuery(`${modelName.toLowerCase()}_delete`, duration);
      
      logger.info(`${modelName} deleted`, {
        id: instance.id,
        duration: `${duration}ms`
      });
    }
  });

  // Before find hook (for SELECT operations)
  model.addHook('beforeFind', (options) => {
    options.hookStartTime = Date.now();
  });

  // After find hook
  model.addHook('afterFind', (instances, options) => {
    if (options.hookStartTime) {
      const duration = Date.now() - options.hookStartTime;
      const count = Array.isArray(instances) ? instances.length : (instances ? 1 : 0);
      
      metricsHelper.timingDbQuery(`${modelName.toLowerCase()}_find`, duration);
      
      logger.debug(`${modelName} query completed`, {
        resultsCount: count,
        duration: `${duration}ms`
      });
    }
  });
};

module.exports = { addModelHooks };