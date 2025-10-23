const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { Product, Image } = require('../models');

// Configure AWS S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  // Credentials will be automatically loaded from IAM role
});

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accepted file extensions
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

// Helper function to generate S3 key with user partitioning
const generateS3Key = (userId, productId, fileName) => {
  const ext = path.extname(fileName);
  const imageId = uuidv4();
  // Partition by user ID, then product ID
  return `users/${userId}/products/${productId}/${imageId}${ext}`;
};

// POST /v1/product/:product_id/image - Upload image
router.post('/v1/product/:product_id/image', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { product_id } = req.params;
    const userId = req.user.id;
    
    // Check if image was uploaded
    if (!req.file) {
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
      return res.status(403).json({
        error: 'Product not found or you do not have permission to add images to this product'
      });
    }
    
    // Generate S3 key with user partitioning
    const s3Key = generateS3Key(userId, product_id, req.file.originalname);
    
    // Upload to S3
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
      s3Response = await s3Client.send(new PutObjectCommand(uploadParams));
    } catch (s3Error) {
      console.error('S3 upload error:', s3Error);
      return res.status(500).json({
        error: 'Failed to upload image to storage'
      });
    }
    
    // Save image metadata to database with S3 response metadata
    const image = await Image.create({
      product_id: product_id,
      file_name: req.file.originalname,
      s3_bucket_path: s3Key,
      file_size: req.file.size,
      content_type: req.file.mimetype,
      owner_user_id: userId,
      etag: s3Response.ETag?.replace(/"/g, ''), // Remove quotes from ETag
      version_id: s3Response.VersionId || null,
      storage_class: 'STANDARD', // Will change to STANDARD_IA after 30 days per lifecycle policy
      server_side_encryption: s3Response.ServerSideEncryption || 'AES256',
      metadata: {
        original_filename: req.file.originalname,
        upload_timestamp: new Date().toISOString(),
        file_encoding: req.file.encoding,
        field_name: req.file.fieldname
      }
    });
    
    // Return response
    res.status(201).json({
      image_id: image.image_id,
      product_id: image.product_id,
      file_name: image.file_name,
      date_created: image.date_created,
      s3_bucket_path: image.s3_bucket_path
    });
    
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// GET /v1/product/:product_id/image - List all images for a product
router.get('/v1/product/:product_id/image', authenticate, async (req, res) => {
  try {
    const { product_id } = req.params;
    const userId = req.user.id;
    
    // Verify product exists and user owns it
    const product = await Product.findOne({
      where: {
        id: product_id,
        owner_user_id: userId
      }
    });
    
    if (!product) {
      return res.status(403).json({
        error: 'Product not found or you do not have permission to view images for this product'
      });
    }
    
    // Get all images for the product
    const images = await Image.findAll({
      where: {
        product_id: product_id
      },
      attributes: ['image_id', 'product_id', 'file_name', 'date_created', 's3_bucket_path'],
      order: [['date_created', 'DESC']]
    });
    
    res.status(200).json(images);
    
  } catch (error) {
    console.error('Error listing images:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// GET /v1/product/:product_id/image/:image_id - Get specific image metadata
router.get('/v1/product/:product_id/image/:image_id', authenticate, async (req, res) => {
  try {
    const { product_id, image_id } = req.params;
    const userId = req.user.id;
    
    // Verify product exists and user owns it
    const product = await Product.findOne({
      where: {
        id: product_id,
        owner_user_id: userId
      }
    });
    
    if (!product) {
      return res.status(403).json({
        error: 'Product not found or you do not have permission to view this image'
      });
    }
    
    // Get the specific image
    const image = await Image.findOne({
      where: {
        image_id: image_id,
        product_id: product_id
      },
      attributes: ['image_id', 'product_id', 'file_name', 'date_created', 's3_bucket_path']
    });
    
    if (!image) {
      return res.status(404).json({
        error: 'Image not found'
      });
    }
    
    // Return as array to match API spec
    res.status(200).json([image]);
    
  } catch (error) {
    console.error('Error getting image:', error);
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
    
    // Verify product exists and user owns it
    const product = await Product.findOne({
      where: {
        id: product_id,
        owner_user_id: userId
      }
    });
    
    if (!product) {
      return res.status(403).json({
        error: 'Product not found or you do not have permission to delete this image'
      });
    }
    
    // Get the image to delete
    const image = await Image.findOne({
      where: {
        image_id: image_id,
        product_id: product_id,
        owner_user_id: userId
      }
    });
    
    if (!image) {
      return res.status(404).json({
        error: 'Image not found or you do not have permission to delete it'
      });
    }
    
    // Delete from S3
    const deleteParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: image.s3_bucket_path
    };
    
    try {
      await s3Client.send(new DeleteObjectCommand(deleteParams));
    } catch (s3Error) {
      console.error('S3 delete error:', s3Error);
      // Continue with database deletion even if S3 fails
    }
    
    // Delete from database (hard delete)
    await image.destroy();
    
    // Return 204 No Content
    res.status(204).send();
    
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;