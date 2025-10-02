const { body, validationResult } = require('express-validator');

// Validation rules for user creation
const validateUserCreate = [
  body('email')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .notEmpty().withMessage('Password is required'),
  body('first_name')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 255 }).withMessage('First name too long'),
  body('last_name')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ max: 255 }).withMessage('Last name too long'),
  // Ignore these fields if provided
  body('account_created').optional().custom(() => true),
  body('account_updated').optional().custom(() => true),
  body('id').optional().custom(() => true)
];

// Validation rules for user update
const validateUserUpdate = [
  body('email').optional().custom((value) => {
    throw new Error('Email cannot be updated');
  }),
  body('password').optional()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('first_name').optional()
    .trim()
    .notEmpty().withMessage('First name cannot be empty')
    .isLength({ max: 255 }).withMessage('First name too long'),
  body('last_name').optional()
    .trim()
    .notEmpty().withMessage('Last name cannot be empty')
    .isLength({ max: 255 }).withMessage('Last name too long'),
  // Reject these fields
  body('account_created').optional().custom(() => {
    throw new Error('account_created cannot be updated');
  }),
  body('account_updated').optional().custom(() => {
    throw new Error('account_updated cannot be updated');
  }),
  body('id').optional().custom(() => {
    throw new Error('id cannot be updated');
  })
];

// Validation rules for product creation
const validateProductCreate = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ max: 255 }).withMessage('Product name too long'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required'),
  body('sku')
    .trim()
    .notEmpty().withMessage('SKU is required')
    .isLength({ max: 255 }).withMessage('SKU too long'),
  body('manufacturer')
    .trim()
    .notEmpty().withMessage('Manufacturer is required')
    .isLength({ max: 255 }).withMessage('Manufacturer name too long'),
  body('quantity')
    .optional()  // Make quantity optional
    .isInt({ min: 0, max: 100 }).withMessage('Quantity must be an integer between 0 and 100'),
  // Ignore these fields if provided
  body('date_added').optional().custom(() => true),
  body('date_last_updated').optional().custom(() => true),
  body('owner_user_id').optional().custom(() => true),
  body('id').optional().custom(() => true)
];

// Validation rules for product update
const validateProductUpdate = [
  body('name').optional()
    .trim()
    .notEmpty().withMessage('Product name cannot be empty')
    .isLength({ max: 255 }).withMessage('Product name too long'),
  body('description').optional()
    .trim()
    .notEmpty().withMessage('Description cannot be empty'),
  body('sku').optional()
    .trim()
    .notEmpty().withMessage('SKU cannot be empty')
    .isLength({ max: 255 }).withMessage('SKU too long'),
  body('manufacturer').optional()
    .trim()
    .notEmpty().withMessage('Manufacturer cannot be empty')
    .isLength({ max: 255 }).withMessage('Manufacturer name too long'),
  body('quantity').optional()
    .isInt({ min: 0, max: 100 }).withMessage('Quantity must be an integer between 0 and 100'),
  // Reject these fields
  body('date_added').optional().custom(() => {
    throw new Error('date_added cannot be updated');
  }),
  body('date_last_updated').optional().custom(() => {
    throw new Error('date_last_updated cannot be updated');
  }),
  body('owner_user_id').optional().custom(() => {
    throw new Error('owner_user_id cannot be updated');
  }),
  body('id').optional().custom(() => {
    throw new Error('id cannot be updated');
  })
];

// Check validation results middleware
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Check for empty body
const checkNoPayload = (req, res, next) => {
  const hasBody = req.body && Object.keys(req.body).length > 0;
  const hasContentLength = req.get('content-length') && parseInt(req.get('content-length')) > 0;
  
  if (hasBody || hasContentLength) {
    return res.status(400).json({ error: 'Request body not allowed' });
  }
  next();
};

// Reject unknown fields in request body
const rejectUnknownFields = (allowedFields) => {
  return (req, res, next) => {
    const bodyKeys = Object.keys(req.body || {});
    const unknownFields = bodyKeys.filter(key => !allowedFields.includes(key));
    
    if (unknownFields.length > 0) {
      return res.status(400).json({
        error: `Unknown fields: ${unknownFields.join(', ')}`
      });
    }
    next();
  };
};

module.exports = {
  validateUserCreate,
  validateUserUpdate,
  validateProductCreate,
  validateProductUpdate,
  checkValidation,
  checkNoPayload,
  rejectUnknownFields
};