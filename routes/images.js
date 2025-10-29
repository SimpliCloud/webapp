const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { Product, Image } = require('../models');
const logger = require('../config/logger');

// UPDATED: Use the S3 wrapper instead of direct client
const { putObject, getObject, deleteObject } = require('../config/s3Client');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'];
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'image/webp'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();
  
  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(mimeType)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, GIF, BMP, TIFF, and WEBP images are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Helper function to generate S3 key
const generateS3Key = (userId, productId, fileName) => {
  const ext = path.extname(fileName);
  const imageId = uuidv4();
  return `users/${userId}/products/${productId}/${imageId}${ext}`;
};

// POST /v1/product/:product_id/image - Upload image
router.post('/v1/product/:product_id/image', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { product_id } = req.params;
    const userId = req.user.id;
    
    logger.info('Image upload request received', {
      productId: product_id,
      userId: userId,
      fileName: req.file?.originalname
    });
    
    if (!req.file) {
      logger.warn('Image upload failed - no file provided', {
        productId: product_id,
        userId: userId
      });
      return res.status(400).json({
        error: 'No image file provided'
      });
    }
    
    // Verify product exists and user owns it
    const product = await Product.findOne({
      where: {
        id: product_id,
        owner_user_id: userId
      }
    });
    
    if (!product) {
      logger.warn('Image upload failed - product not found or unauthorized', {
        productId: product_id,
        userId: userId
      });
      return res.status(403).json({
        error: 'Product not found or you do not have permission to add images to this product'
      });
    }
    
    // Generate S3 key
    const s3Key = generateS3Key(userId, product_id, req.file.originalname);
    
    // UPDATED: Use wrapper function with automatic timing
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ServerSideEncryption: 'AES256',
      Metadata: {
        'user-id': userId,
        'product-id': product_id,
        'original-filename': req.file.originalname,
        'uploaded-at': new Date().toISOString()
      }
    };
    
    let s3Response;
    try {
      s3Response = await putObject(uploadParams);
    } catch (s3Error) {
      logger.error('S3 upload error', {
        productId: product_id,
        userId: userId,
        error: s3Error.message
      });
      return res.status(500).json({
        error: 'Failed to upload image to storage'
      });
    }
    
    // Save image metadata to database
    const image = await Image.create({
      product_id: product_id,
      file_name: req.file.originalname,
      s3_bucket_path: s3Key,
      file_size: req.file.size,
      content_type: req.file.mimetype,
      owner_user_id: userId,
      etag: s3Response.ETag?.replace(/"/g, ''),
      version_id: s3Response.VersionId || null,
      storage_class: 'STANDARD',
      server_side_encryption: s3Response.ServerSideEncryption || 'AES256',
      metadata: {
        original_filename: req.file.originalname,
        upload_timestamp: new Date().toISOString(),
        file_encoding: req.file.encoding,
        field_name: req.file.fieldname
      }
    });
    
    logger.info('Image uploaded successfully', {
      imageId: image.image_id,
      productId: product_id,
      userId: userId,
      s3Key: s3Key
    });
    
    res.status(201).json({
      image_id: image.image_id,
      product_id: image.product_id,
      file_name: image.file_name,
      date_created: image.date_created,
      s3_bucket_path: image.s3_bucket_path
    });
    
  } catch (error) {
    logger.error('Error uploading image', {
      error: error.message,
      stack: error.stack,
      productId: req.params.product_id
    });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// GET /v1/product/:product_id/image - List all images
router.get('/v1/product/:product_id/image', authenticate, async (req, res) => {
  try {
    const { product_id } = req.params;
    const userId = req.user.id;
    
    logger.info('List images request received', {
      productId: product_id,
      userId: userId
    });
    
    const product = await Product.findOne({
      where: {
        id: product_id,
        owner_user_id: userId
      }
    });
    
    if (!product) {
      logger.warn('List images failed - product not found or unauthorized', {
        productId: product_id,
        userId: userId
      });
      return res.status(403).json({
        error: 'Product not found or you do not have permission to view images for this product'
      });
    }
    
    const images = await Image.findAll({
      where: {
        product_id: product_id
      },
      attributes: ['image_id', 'product_id', 'file_name', 'date_created', 's3_bucket_path'],
      order: [['date_created', 'DESC']]
    });
    
    logger.info('Images listed successfully', {
      productId: product_id,
      userId: userId,
      count: images.length
    });
    
    res.status(200).json(images);
    
  } catch (error) {
    logger.error('Error listing images', {
      error: error.message,
      stack: error.stack,
      productId: req.params.product_id
    });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// GET /v1/product/:product_id/image/:image_id - Get specific image
router.get('/v1/product/:product_id/image/:image_id', authenticate, async (req, res) => {
  try {
    const { product_id, image_id } = req.params;
    const userId = req.user.id;
    
    logger.info('Get image request received', {
      productId: product_id,
      imageId: image_id,
      userId: userId
    });
    
    const product = await Product.findOne({
      where: {
        id: product_id,
        owner_user_id: userId
      }
    });
    
    if (!product) {
      logger.warn('Get image failed - product not found or unauthorized', {
        productId: product_id,
        userId: userId
      });
      return res.status(403).json({
        error: 'Product not found or you do not have permission to view this image'
      });
    }
    
    const image = await Image.findOne({
      where: {
        image_id: image_id,
        product_id: product_id
      },
      attributes: ['image_id', 'product_id', 'file_name', 'date_created', 's3_bucket_path']
    });
    
    if (!image) {
      logger.warn('Get image failed - image not found', {
        productId: product_id,
        imageId: image_id,
        userId: userId
      });
      return res.status(404).json({
        error: 'Image not found'
      });
    }
    
    logger.info('Image retrieved successfully', {
      productId: product_id,
      imageId: image_id,
      userId: userId
    });
    
    res.status(200).json([image]);
    
  } catch (error) {
    logger.error('Error getting image', {
      error: error.message,
      stack: error.stack,
      productId: req.params.product_id,
      imageId: req.params.image_id
    });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// DELETE /v1/product/:product_id/image/:image_id - Delete image
router.delete('/v1/product/:product_id/image/:image_id', authenticate, async (req, res) => {
  try {
    const { product_id, image_id } = req.params;
    const userId = req.user.id;
    
    logger.info('Delete image request received', {
      productId: product_id,
      imageId: image_id,
      userId: userId
    });
    
    const product = await Product.findOne({
      where: {
        id: product_id,
        owner_user_id: userId
      }
    });
    
    if (!product) {
      logger.warn('Delete image failed - product not found or unauthorized', {
        productId: product_id,
        userId: userId
      });
      return res.status(403).json({
        error: 'Product not found or you do not have permission to delete this image'
      });
    }
    
    const image = await Image.findOne({
      where: {
        image_id: image_id,
        product_id: product_id,
        owner_user_id: userId
      }
    });
    
    if (!image) {
      logger.warn('Delete image failed - image not found', {
        productId: product_id,
        imageId: image_id,
        userId: userId
      });
      return res.status(404).json({
        error: 'Image not found or you do not have permission to delete it'
      });
    }
    
    // UPDATED: Use wrapper function with automatic timing
    const deleteParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: image.s3_bucket_path
    };
    
    try {
      await deleteObject(deleteParams);
    } catch (s3Error) {
      logger.error('S3 delete error', {
        productId: product_id,
        imageId: image_id,
        error: s3Error.message
      });
      // Continue with database deletion even if S3 fails
    }
    
    // Delete from database
    await image.destroy();
    
    logger.info('Image deleted successfully', {
      productId: product_id,
      imageId: image_id,
      userId: userId
    });
    
    res.status(204).send();
    
  } catch (error) {
    logger.error('Error deleting image', {
      error: error.message,
      stack: error.stack,
      productId: req.params.product_id,
      imageId: req.params.image_id
    });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;