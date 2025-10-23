const User = require('./User');
const Product = require('./Product');
const Image = require('./Image');
const HealthCheck = require('./HealthCheck');
const { sequelize } = require('../config/database');

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

// Image associations
Product.hasMany(Image, {
  foreignKey: 'product_id',
  as: 'images',
  onDelete: 'CASCADE'
});

Image.belongsTo(Product, {
  foreignKey: 'product_id',
  as: 'product',
  onDelete: 'CASCADE'
});

Image.belongsTo(User, {
  foreignKey: 'owner_user_id',
  as: 'owner'
});

User.hasMany(Image, {
  foreignKey: 'owner_user_id',
  as: 'uploadedImages'
});

// Export all models
module.exports = {
  User,
  Product,
  Image,
  HealthCheck,
  sequelize
};