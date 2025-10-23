const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
    comment: 'Unique identifier for the user'
  },
  
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: {
        msg: 'Must be a valid email address'
      },
      notEmpty: {
        msg: 'Email is required'
      }
    },
    comment: 'User email address (used as username)'
  },
  
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Password is required'
      },
      len: {
        args: [6, 255],
        msg: 'Password must be at least 6 characters long'
      }
    },
    comment: 'Hashed password using BCrypt'
  },
  
  first_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'First name is required'
      }
    },
    comment: 'User first name'
  },
  
  last_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Last name is required'
      }
    },
    comment: 'User last name'
  },
  
  account_created: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Timestamp when account was created'
  },
  
  account_updated: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Timestamp when account was last updated'
  }
}, {
  tableName: 'users',
  timestamps: false, // We're managing timestamps manually
  indexes: [
    {
      unique: true,
      fields: ['email'],
      name: 'idx_users_email'
    }
  ],
  
  hooks: {
    // Hash password before creating user
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
      user.account_created = new Date();
      user.account_updated = new Date();
    },
    
    // Hash password if it's being updated
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
      user.account_updated = new Date();
    }
  }
});

// Instance method to validate password
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Instance method to return user data without password
User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

// Static method for authentication
User.authenticate = async function(email, password) {
  try {
    // Find user by email
    const user = await this.findOne({
      where: { email: email }
    });
    
    if (!user) {
      return null;
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return null;
    }
    
    // Return user data without password
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      account_created: user.account_created,
      account_updated: user.account_updated
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
};

module.exports = User;