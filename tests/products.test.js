const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../config/database');
const User = require('../models/User');
const Product = require('../models/Product');

describe('Product Management Endpoints', () => {
    let user1 = {
        email: 'user1@example.com',
        password: 'Password123!',
        first_name: 'User',
        last_name: 'One'
    };

    let user2 = {
        email: 'user2@example.com',
        password: 'Password456!',
        first_name: 'User',
        last_name: 'Two'
    };

    let authToken1, authToken2;
    let productId;

    const testProduct = {
        name: 'Test Product',
        description: 'This is a test product description',
        sku: 'TEST-SKU-001',
        manufacturer: 'Test Manufacturer',
        quantity: 50
    };

    beforeAll(async () => {
        // Clean database
        await Product.destroy({ where: {} });
        await User.destroy({ where: {} });

        // Create test users
        await request(app).post('/v1/user').send(user1);
        await request(app).post('/v1/user').send(user2);

        // Create auth tokens
        authToken1 = Buffer.from(`${user1.email}:${user1.password}`).toString('base64');
        authToken2 = Buffer.from(`${user2.email}:${user2.password}`).toString('base64');
    });

    afterEach(async () => {
        // Clean products after each test
        await Product.destroy({ where: {} });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    describe('POST /v1/product', () => {
        test('should create a product with authentication', async () => {
            const response = await request(app)
                .post('/v1/product')
                .set('Authorization', `Basic ${authToken1}`)
                .send(testProduct)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe(testProduct.name);
            expect(response.body.description).toBe(testProduct.description);
            expect(response.body.sku).toBe(testProduct.sku);
            expect(response.body.manufacturer).toBe(testProduct.manufacturer);
            expect(response.body.quantity).toBe(testProduct.quantity);
            expect(response.body).toHaveProperty('owner_user_id');
            expect(response.body).toHaveProperty('date_added');
            expect(response.body).toHaveProperty('date_last_updated');

            productId = response.body.id;
        });

        test('should return 401 without authentication', async () => {
            await request(app)
                .post('/v1/product')
                .send(testProduct)
                .expect(401);
        });

        test('should return 400 for duplicate SKU', async () => {
            // Create first product
            await request(app)
                .post('/v1/product')
                .set('Authorization', `Basic ${authToken1}`)
                .send(testProduct)
                .expect(201);

            // Try to create duplicate
            const response = await request(app)
                .post('/v1/product')
                .set('Authorization', `Basic ${authToken1}`)
                .send(testProduct)
                .expect(400);

            expect(response.body.error).toContain('SKU already exists');
        });

        test('should return 400 for negative quantity', async () => {
            const invalidProduct = { ...testProduct, sku: 'UNIQUE-SKU', quantity: -1 };

            const response = await request(app)
                .post('/v1/product')
                .set('Authorization', `Basic ${authToken1}`)
                .send(invalidProduct)
                .expect(400);

            expect(response.body.errors).toBeDefined();
        });

        test('should return 400 for quantity over 100', async () => {
            const invalidProduct = { ...testProduct, sku: 'UNIQUE-SKU', quantity: 101 };

            const response = await request(app)
                .post('/v1/product')
                .set('Authorization', `Basic ${authToken1}`)
                .send(invalidProduct)
                .expect(400);

            expect(response.body.errors).toBeDefined();
        });

        test('should default quantity to 0 if not provided', async () => {
            const productWithoutQuantity = {
                name: 'No Quantity Product',
                description: 'Product without quantity',
                sku: 'NO-QTY-001',
                manufacturer: 'Test Manufacturer'
            };

            const response = await request(app)
                .post('/v1/product')
                .set('Authorization', `Basic ${authToken1}`)
                .send(productWithoutQuantity)
                .expect(201);

            expect(response.body.quantity).toBe(0);
        });
    });

    describe('GET /v1/product/:productId', () => {
        beforeEach(async () => {
            // Create a product
            const response = await request(app)
                .post('/v1/product')
                .set('Authorization', `Basic ${authToken1}`)
                .send(testProduct);

            productId = response.body.id;
        });

        test('should return product without authentication', async () => {
            const response = await request(app)
                .get(`/v1/product/${productId}`)
                .expect(200);

            expect(response.body.id).toBe(productId);
            expect(response.body.name).toBe(testProduct.name);
        });

        test('should return 404 for non-existent product', async () => {
            const fakeId = '00000000-0000-4000-8000-000000000000';

            const response = await request(app)
                .get(`/v1/product/${fakeId}`)
                .expect(404);

            expect(response.body.error).toContain('not found');
        });

        test('should return 400 for invalid UUID format', async () => {
            const response = await request(app)
                .get('/v1/product/invalid-id')
                .expect(400);

            expect(response.body.error).toContain('Invalid product ID');
        });

        test('should return 400 with request body', async () => {
            await request(app)
                .get(`/v1/product/${productId}`)
                .send({ some: 'data' })
                .expect(400);
        });
    });

    describe('PUT /v1/product/:productId', () => {
        beforeEach(async () => {
            // Create a product with user1
            const response = await request(app)
                .post('/v1/product')
                .set('Authorization', `Basic ${authToken1}`)
                .send(testProduct);

            productId = response.body.id;
        });

        test('should update product with owner authentication', async () => {
            const updates = {
                name: 'Updated Product',
                description: 'Updated description',
                sku: 'UPDATED-SKU',
                manufacturer: 'Updated Manufacturer',
                quantity: 75
            };

            await request(app)
                .put(`/v1/product/${productId}`)
                .set('Authorization', `Basic ${authToken1}`)
                .send(updates)
                .expect(204);

            // Verify update
            const response = await request(app)
                .get(`/v1/product/${productId}`)
                .expect(200);

            expect(response.body.name).toBe(updates.name);
            expect(response.body.sku).toBe(updates.sku);
            expect(response.body.quantity).toBe(updates.quantity);
        });

        test('should return 400 for missing required fields in PUT', async () => {
            const partialUpdate = {
                name: 'Only Name'
                // Missing other required fields
            };

            const response = await request(app)
                .put(`/v1/product/${productId}`)
                .set('Authorization', `Basic ${authToken1}`)
                .send(partialUpdate)
                .expect(400);

            expect(response.body.error).toContain('PUT requires all fields');
        });

        test('should return 403 when non-owner tries to update', async () => {
            const updates = {
                name: 'Hacked Product',
                description: 'Should not work',
                sku: 'HACKED-SKU',
                manufacturer: 'Hacker',
                quantity: 99
            };

            const response = await request(app)
                .put(`/v1/product/${productId}`)
                .set('Authorization', `Basic ${authToken2}`)
                .send(updates)
                .expect(403);

            expect(response.body.error).toContain('permission');
        });

        test('should return 401 without authentication', async () => {
            const updates = {
                name: 'Updated Product',
                description: 'Updated description',
                sku: 'UPDATED-SKU',
                manufacturer: 'Updated Manufacturer',
                quantity: 75
            };

            await request(app)
                .put(`/v1/product/${productId}`)
                .send(updates)
                .expect(401);
        });

        test('should return 404 for non-existent product', async () => {
            const fakeId = '00000000-0000-4000-8000-000000000000';
            const updates = {
                name: 'Updated Product',
                description: 'Updated description',
                sku: 'UPDATED-SKU',
                manufacturer: 'Updated Manufacturer',
                quantity: 75
            };

            await request(app)
                .put(`/v1/product/${fakeId}`)
                .set('Authorization', `Basic ${authToken1}`)
                .send(updates)
                .expect(404);
        });
    });

    describe('PATCH /v1/product/:productId', () => {
        beforeEach(async () => {
            // Create a product with user1
            const response = await request(app)
                .post('/v1/product')
                .set('Authorization', `Basic ${authToken1}`)
                .send(testProduct);

            productId = response.body.id;
        });

        test('should partially update product with owner authentication', async () => {
            await request(app)
                .patch(`/v1/product/${productId}`)
                .set('Authorization', `Basic ${authToken1}`)
                .send({ quantity: 30 })
                .expect(204);

            // Verify update
            const response = await request(app)
                .get(`/v1/product/${productId}`)
                .expect(200);

            expect(response.body.quantity).toBe(30);
            expect(response.body.name).toBe(testProduct.name); // Unchanged
        });

        test('should update multiple fields', async () => {
            const updates = {
                name: 'Partially Updated',
                quantity: 25
            };

            await request(app)
                .patch(`/v1/product/${productId}`)
                .set('Authorization', `Basic ${authToken1}`)
                .send(updates)
                .expect(204);

            // Verify update
            const response = await request(app)
                .get(`/v1/product/${productId}`)
                .expect(200);

            expect(response.body.name).toBe(updates.name);
            expect(response.body.quantity).toBe(updates.quantity);
            expect(response.body.description).toBe(testProduct.description); // Unchanged
        });

        test('should return 403 when non-owner tries to update', async () => {
            await request(app)
                .patch(`/v1/product/${productId}`)
                .set('Authorization', `Basic ${authToken2}`)
                .send({ name: 'Unauthorized Update' })
                .expect(403);
        });

        test('should return 400 when trying to update restricted fields', async () => {
            const response = await request(app)
                .patch(`/v1/product/${productId}`)
                .set('Authorization', `Basic ${authToken1}`)
                .send({ owner_user_id: '00000000-0000-4000-8000-000000000000' })
                .expect(400);

            // Change this line:
            expect(response.body.error).toBeDefined(); // Instead of response.body.errors
        });
    });

    describe('DELETE /v1/product/:productId', () => {
        beforeEach(async () => {
            // Create a product with user1
            const response = await request(app)
                .post('/v1/product')
                .set('Authorization', `Basic ${authToken1}`)
                .send(testProduct);

            productId = response.body.id;
        });

        test('should delete product with owner authentication', async () => {
            await request(app)
                .delete(`/v1/product/${productId}`)
                .set('Authorization', `Basic ${authToken1}`)
                .expect(204);

            // Verify deletion
            await request(app)
                .get(`/v1/product/${productId}`)
                .expect(404);
        });

        test('should return 403 when non-owner tries to delete', async () => {
            const response = await request(app)
                .delete(`/v1/product/${productId}`)
                .set('Authorization', `Basic ${authToken2}`)
                .expect(403);

            expect(response.body.error).toContain('permission');
        });

        test('should return 401 without authentication', async () => {
            await request(app)
                .delete(`/v1/product/${productId}`)
                .expect(401);
        });

        test('should return 404 for non-existent product', async () => {
            const fakeId = '00000000-0000-4000-8000-000000000000';

            await request(app)
                .delete(`/v1/product/${fakeId}`)
                .set('Authorization', `Basic ${authToken1}`)
                .expect(404);
        });

        test('should return 400 with request body', async () => {
            await request(app)
                .delete(`/v1/product/${productId}`)
                .set('Authorization', `Basic ${authToken1}`)
                .send({ some: 'data' })
                .expect(400);
        });
    });
});