const { DataTypes } = require('sequelize');


const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
    comment: 'Unique identifier for the product'
  },
  
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Product name is required'
      }
    },
    comment: 'Product name'
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Product description is required'
      }
    },
    comment: 'Product description'
  },
  
  sku: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: {
        msg: 'SKU is required'
      }
    },
    comment: 'Stock Keeping Unit - unique product identifier'
  },
  
  manufacturer: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Manufacturer is required'
      }
    },
    comment: 'Product manufacturer'
  },
  
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: {
        args: [0],
        msg: 'Quantity cannot be less than 0'
      },
      max: {
        args: [100],
        msg: 'Quantity cannot be more than 100'
      },
      isInt: {
        msg: 'Quantity must be an integer'
      }
    },
    comment: 'Available quantity (0-100)'
  },
  
  date_added: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Timestamp when product was added'
  },
  
  date_last_updated: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Timestamp when product was last updated'
  },
  
  owner_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID of the user who created this product'
  }
}, {
  tableName: 'products',
  timestamps: false, // We're managing timestamps manually
  indexes: [
    {
      unique: true,
      fields: ['sku'],
      name: 'idx_products_sku'
    },
    {
      fields: ['owner_user_id'],
      name: 'idx_products_owner'
    }
  ],
  
  hooks: {
    beforeCreate: (product) => {
      product.date_added = new Date();
      product.date_last_updated = new Date();
    },
    
    beforeUpdate: (product) => {
      product.date_last_updated = new Date();
    }
  }
});

// Define associations (will be called in models/index.js)
Product.associate = function(models) {
  Product.belongsTo(models.User, {
    foreignKey: 'owner_user_id',
    as: 'owner'
  });
};

module.exports = Product;
