const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
    allowNull: false,
    readOnly: true
  },
  
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      msg: 'Email address already exists'
    },
    validate: {
      isEmail: {
        msg: 'Must be a valid email address'
      },
      notEmpty: {
        msg: 'Email cannot be empty'
      }
    }
  },
  
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Password cannot be empty'
      },
      len: {
        args: [6, 100],
        msg: 'Password must be at least 6 characters long'
      }
    }
  },
  
  first_name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'First name cannot be empty'
      }
    }
  },
  
  last_name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Last name cannot be empty'
      }
    }
  },
  
  // NEW: Email verification fields
  email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  
  verification_token: {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null
  },
  
  token_created_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null
  },
  
  account_created: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    readOnly: true
  },
  
  account_updated: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    readOnly: true
  }
}, {
  tableName: 'users',
  timestamps: false,
  
  hooks: {
    // Hash password before creating user
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10);
        user.password = await bcrypt.hash(user.password, salt);
      }
      
      // Generate verification token on user creation
      user.verification_token = uuidv4();
      user.token_created_at = new Date();
      user.email_verified = false;
    },
    
    // Hash password before updating user
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10);
        user.password = await bcrypt.hash(user.password, salt);
      }
      user.account_updated = new Date();
    },
    
    // Update account_updated timestamp before save
    beforeSave: (user) => {
      if (!user.isNewRecord) {
        user.account_updated = new Date();
      }
    }
  }
});

// Instance method to compare password
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Static method to authenticate user
User.authenticate = async function(email, password) {
  const user = await User.findOne({ where: { email } });
  
  if (!user) {
    return null;
  }
  
  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    return null;
  }
  
  return user;
};

// Method to check if verification token is expired
User.prototype.isTokenExpired = function() {
  if (!this.token_created_at) {
    return true;
  }
  
  const tokenAge = Date.now() - new Date(this.token_created_at).getTime();
  const expiryTime = parseInt(process.env.VERIFICATION_TOKEN_EXPIRY) || 60; // 60 seconds default
  
  return tokenAge > (expiryTime * 1000); // Convert to milliseconds
};

// Method to generate new verification token
User.prototype.generateVerificationToken = function() {
  this.verification_token = uuidv4();
  this.token_created_at = new Date();
  return this.verification_token;
};

// Customize JSON output to exclude sensitive fields
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  
  // Remove sensitive fields
  delete values.password;
  
  // Don't expose internal verification fields in normal responses
  delete values.verification_token;
  delete values.token_created_at;
  
  return values;
};

module.exports = User;