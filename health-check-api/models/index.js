const User = require('./User');
const Product = require('./Product');
const HealthCheck = require('./HealthCheck');

// Define associations
User.hasMany(Product, {
  foreignKey: 'owner_user_id',
  as: 'products',
  onDelete: 'CASCADE'
});

Product.belongsTo(User, {
  foreignKey: 'owner_user_id',
  as: 'owner'
});

// Export all models
module.exports = {
  User,
  Product,
  HealthCheck
};