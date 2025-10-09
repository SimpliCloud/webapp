const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');
const {
  validateProductCreate,
  validateProductUpdate,
  checkValidation,
  checkNoPayload,
  rejectUnknownFields
} = require('../middleware/validation');

// Allowed fields for product creation/update
const PRODUCT_FIELDS = ['name', 'description', 'sku', 'manufacturer', 'quantity'];

// POST /v1/product - Create new product (requires authentication)
router.post('/v1/product',
  authenticate,
  rejectUnknownFields(PRODUCT_FIELDS),
  validateProductCreate,
  checkValidation,
  async (req, res) => {
    try {
      const { name, description, sku, manufacturer, quantity } = req.body;

      // Check if SKU already exists
      const existingProduct = await Product.findOne({ where: { sku } });
      if (existingProduct) {
        return res.status(400).json({ error: 'Product with this SKU already exists' });
      }

      // Create product with authenticated user as owner
      const product = await Product.create({
        name,
        description,
        sku,
        manufacturer,
        quantity: quantity !== undefined ? quantity : 0,
        owner_user_id: req.user.id
      });

      res.status(201).json(product);

    } catch (error) {
      console.error('Product creation error:', error);

      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message);
        return res.status(400).json({ errors: messages });
      }

      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ error: 'Product with this SKU already exists' });
      }

      res.status(400).json({ error: 'Failed to create product' });
    }
  });

// GET /v1/product/:productId - Get product by ID (public endpoint)
router.get('/v1/product/:productId',
  checkNoPayload,
  async (req, res) => {
    try {
      const { productId } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(productId)) {
        return res.status(400).json({ error: 'Invalid product ID format' });
      }

      const product = await Product.findByPk(productId);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.status(200).json(product);

    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: 'Failed to retrieve product' });
    }
  });

// PUT /v1/product/:productId - Full update product (requires authentication and ownership)
router.put('/v1/product/:productId',
  authenticate,
  rejectUnknownFields(PRODUCT_FIELDS),
  validateProductUpdate,
  checkValidation,
  async (req, res) => {
    try {
      const { productId } = req.params;
      const { name, description, sku, manufacturer, quantity } = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(productId)) {
        return res.status(400).json({ error: 'Invalid product ID format' });
      }

      // Check that all required fields are provided for PUT
      if (!name || !description || !sku || !manufacturer || quantity === undefined) {
        return res.status(400).json({
          error: 'PUT requires all fields: name, description, sku, manufacturer, quantity'
        });
      }

      const product = await Product.findByPk(productId);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check ownership
      if (product.owner_user_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to update this product' });
      }

      // Check if new SKU conflicts with existing product
      if (sku !== product.sku) {
        const existingProduct = await Product.findOne({ where: { sku } });
        if (existingProduct) {
          return res.status(400).json({ error: 'Product with this SKU already exists' });
        }
      }

      // Update product
      await product.update({
        name,
        description,
        sku,
        manufacturer,
        quantity
      });

      res.status(204).send();

    } catch (error) {
      console.error('Product update error:', error);

      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message);
        return res.status(400).json({ errors: messages });
      }

      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ error: 'Product with this SKU already exists' });
      }

      res.status(400).json({ error: 'Failed to update product' });
    }
  });

// PATCH /v1/product/:productId - Partial update product (requires authentication and ownership)
router.patch('/v1/product/:productId',
  authenticate,
  rejectUnknownFields(PRODUCT_FIELDS),
  validateProductUpdate,
  checkValidation,
  async (req, res) => {
    try {
      const { productId } = req.params;
      const updates = {};
      const { name, description, sku, manufacturer, quantity } = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(productId)) {
        return res.status(400).json({ error: 'Invalid product ID format' });
      }

      const product = await Product.findByPk(productId);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check ownership
      if (product.owner_user_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to update this product' });
      }

      // Build update object with only provided fields
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (sku !== undefined) updates.sku = sku;
      if (manufacturer !== undefined) updates.manufacturer = manufacturer;
      if (quantity !== undefined) updates.quantity = quantity;

      // Check if any valid fields were provided
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      // Check if new SKU conflicts with existing product
      if (sku && sku !== product.sku) {
        const existingProduct = await Product.findOne({ where: { sku } });
        if (existingProduct) {
          return res.status(400).json({ error: 'Product with this SKU already exists' });
        }
      }

      // Update product
      await product.update(updates);

      res.status(204).send();

    } catch (error) {
      console.error('Product update error:', error);

      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message);
        return res.status(400).json({ errors: messages });
      }

      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ error: 'Product with this SKU already exists' });
      }

      res.status(400).json({ error: 'Failed to update product' });
    }
  });

// DELETE /v1/product/:productId - Delete product (requires authentication and ownership)
router.delete('/v1/product/:productId',
  authenticate,
  async (req, res) => {
    try {
      const { productId } = req.params;

      // Check for request body INSIDE the handler
      if (req.body && Object.keys(req.body).length > 0) {
        return res.status(400).json({ error: 'Request body not allowed' });
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(productId)) {
        return res.status(400).json({ error: 'Invalid product ID format' });
      }

      // Find product
      const product = await Product.findByPk(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check ownership
      if (product.owner_user_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to delete this product' });
      }

      // Delete product
      await product.destroy();

      res.status(204).send();

    } catch (error) {
      console.error('Product deletion error:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

// Handle unsupported methods
router.all('/v1/product', (req, res) => {
  res.status(405).json({ error: 'Method not allowed' });
});

router.all('/v1/product/:productId', (req, res) => {
  if (!['GET', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    res.status(405).json({ error: 'Method not allowed' });
  }
});

module.exports = router;