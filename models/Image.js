const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Image = sequelize.define('Image', {
  image_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
    comment: 'Unique identifier for the image'
  },
  
  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    },
    comment: 'ID of the product this image belongs to'
  },
  
  file_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'File name is required'
      }
    },
    comment: 'Original file name of the uploaded image'
  },
  
  date_created: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Timestamp when image was uploaded'
  },
  
  s3_bucket_path: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'S3 bucket path is required'
      }
    },
    comment: 'S3 path where the image is stored'
  },
  
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'File size in bytes'
  },
  
  content_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'MIME type of the image'
  },
  
  etag: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'S3 ETag for the object'
  },
  
  version_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'S3 version ID if versioning is enabled'
  },
  
  storage_class: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'STANDARD',
    comment: 'S3 storage class'
  },
  
  server_side_encryption: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'AES256',
    comment: 'Encryption method used'
  },
  
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Custom metadata as JSON'
  },
  
  owner_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID of the user who uploaded this image'
  }
}, {
  tableName: 'images',
  timestamps: false, // We're managing timestamps manually
  indexes: [
    {
      fields: ['product_id'],
      name: 'idx_images_product'
    },
    {
      fields: ['owner_user_id'],
      name: 'idx_images_owner'
    }
  ]
});

// Define associations (will be called in models/index.js)
Image.associate = function(models) {
  Image.belongsTo(models.Product, {
    foreignKey: 'product_id',
    as: 'product',
    onDelete: 'CASCADE'
  });
  
  Image.belongsTo(models.User, {
    foreignKey: 'owner_user_id',
    as: 'owner'
  });
};

module.exports = Image;