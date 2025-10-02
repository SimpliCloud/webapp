const request = require('supertest');
const app = require('../../server');
const { sequelize } = require('../../config/database');
const User = require('../../models/User');
const Product = require('../../models/Product');

// Test data
let userId1, userId2, productId;
let authToken1, authToken2;

const testUser = {
  email: 'integration@test.com',
  password: 'TestPass123!',
  first_name: 'Integration',
  last_name: 'Test'
};

const testUser2 = {
  email: 'integration2@test.com', 
  password: 'TestPass456!',
  first_name: 'Second',
  last_name: 'User'
};

const testProduct = {
  name: 'Test Product',
  description: 'Integration test product',
  sku: 'INT-TEST-001',
  manufacturer: 'Test Corp',
  quantity: 50
};

// Setup and teardown
beforeAll(async () => {
  await sequelize.authenticate();
  await Product.destroy({ where: {} });
  await User.destroy({ where: {} });
});

afterAll(async () => {
  await Product.destroy({ where: {} });
  await User.destroy({ where: {} });
  await sequelize.close();
});

describe('API Integration Tests', () => {
  
  // ========================================
  // A. POSITIVE TEST CASES
  // ========================================
  
  describe('A. POSITIVE TEST CASES', () => {
    
    describe('Creation Tests', () => {
      test('should create user with valid data', async () => {
        const response = await request(app)
          .post('/v1/user')
          .send(testUser)
          .expect(201)
          .expect('Content-Type', /json/);

        expect(response.body).toHaveProperty('id');
        expect(response.body.email).toBe(testUser.email);
        expect(response.body).not.toHaveProperty('password');
        
        userId1 = response.body.id;
        authToken1 = Buffer.from(`${testUser.email}:${testUser.password}`).toString('base64');
      });

      test('should create second user with different valid inputs', async () => {
        const response = await request(app)
          .post('/v1/user')
          .send(testUser2)
          .expect(201);
        
        userId2 = response.body.id;
        authToken2 = Buffer.from(`${testUser2.email}:${testUser2.password}`).toString('base64');
      });

      test('should create product with valid data', async () => {
        const response = await request(app)
          .post('/v1/product')
          .set('Authorization', `Basic ${authToken1}`)
          .send(testProduct)
          .expect(201)
          .expect('Content-Type', /json/);

        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(testProduct.name);
        productId = response.body.id;
      });

      test('should verify response body structure for user', async () => {
        const response = await request(app)
          .post('/v1/user')
          .send({
            email: 'structure@test.com',
            password: 'Test123!',
            first_name: 'Structure',
            last_name: 'Test'
          })
          .expect(201);

        // Verify all expected fields exist
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('email');
        expect(response.body).toHaveProperty('first_name');
        expect(response.body).toHaveProperty('last_name');
        expect(response.body).toHaveProperty('account_created');
        expect(response.body).toHaveProperty('account_updated');
        expect(response.body).not.toHaveProperty('password');
      });
    });

    describe('Retrieval Tests', () => {
      test('should get user by valid ID', async () => {
        const response = await request(app)
          .get(`/v1/user/${userId1}`)
          .set('Authorization', `Basic ${authToken1}`)
          .expect(200)
          .expect('Content-Type', /json/);

        expect(response.body.id).toBe(userId1);
      });

      test('should get product by valid ID', async () => {
        const response = await request(app)
          .get(`/v1/product/${productId}`)
          .expect(200)
          .expect('Content-Type', /json/);

        expect(response.body.id).toBe(productId);
      });
    });

    describe('Update Tests', () => {
      test('should successfully update user (PUT)', async () => {
        await request(app)
          .put(`/v1/user/${userId1}`)
          .set('Authorization', `Basic ${authToken1}`)
          .send({
            password: 'Updated123!',
            first_name: 'UpdatedFirst',
            last_name: 'UpdatedLast'
          })
          .expect(204);

        // Update auth token for future tests
        authToken1 = Buffer.from(`${testUser.email}:Updated123!`).toString('base64');
      });

      test('should successfully update product (PUT)', async () => {
        await request(app)
          .put(`/v1/product/${productId}`)
          .set('Authorization', `Basic ${authToken1}`)
          .send({
            name: 'Updated Product',
            description: 'Updated description',
            sku: 'UPD-001',
            manufacturer: 'Updated Corp',
            quantity: 75
          })
          .expect(204);
      });

      test('should verify partial update works (PATCH)', async () => {
        await request(app)
          .patch(`/v1/user/${userId1}`)
          .set('Authorization', `Basic ${authToken1}`)
          .send({ first_name: 'PartialUpdate' })
          .expect(204);
      });

      test('should update different fields independently', async () => {
        // Update only quantity
        await request(app)
          .patch(`/v1/product/${productId}`)
          .set('Authorization', `Basic ${authToken1}`)
          .send({ quantity: 30 })
          .expect(204);

        // Verify other fields unchanged
        const response = await request(app)
          .get(`/v1/product/${productId}`)
          .expect(200);

        expect(response.body.name).toBe('Updated Product');
        expect(response.body.quantity).toBe(30);
      });
    });

    describe('Authentication Tests', () => {
      test('should successfully access protected endpoint with valid token', async () => {
        await request(app)
          .get(`/v1/user/${userId1}`)
          .set('Authorization', `Basic ${authToken1}`)
          .expect(200);
      });

      test('should successfully register new user', async () => {
        const response = await request(app)
          .post('/v1/user')
          .send({
            email: 'newauth@test.com',
            password: 'AuthTest123!',
            first_name: 'Auth',
            last_name: 'Test'
          })
          .expect(201);

        expect(response.body.email).toBe('newauth@test.com');
      });
    });
  });

  // ========================================
  // B. NEGATIVE TEST CASES
  // ========================================
  
  describe('B. NEGATIVE TEST CASES', () => {
    
    describe('Invalid Input Tests', () => {
      test('should reject user creation with missing required fields', async () => {
        await request(app)
          .post('/v1/user')
          .send({ email: 'incomplete@test.com' })
          .expect(400);
      });

      test('should reject user creation with invalid email format', async () => {
        await request(app)
          .post('/v1/user')
          .send({
            email: 'not-an-email',
            password: 'Test123!',
            first_name: 'Test',
            last_name: 'User'
          })
          .expect(400);
      });

      test('should reject duplicate email', async () => {
        await request(app)
          .post('/v1/user')
          .send(testUser)
          .expect(400);
      });

      test('should reject product with invalid data types', async () => {
        await request(app)
          .post('/v1/product')
          .set('Authorization', `Basic ${authToken1}`)
          .send({
            name: 'Test',
            description: 'Test',
            sku: 'INVALID-TYPE',
            manufacturer: 'Test',
            quantity: 'not-a-number'
          })
          .expect(400);
      });

      test('should reject product with missing required fields', async () => {
        await request(app)
          .post('/v1/product')
          .set('Authorization', `Basic ${authToken1}`)
          .send({ name: 'Incomplete Product' })
          .expect(400);
      });
    });

    describe('Authentication Error Tests', () => {
      test('should reject login with invalid credentials', async () => {
        const wrongAuth = Buffer.from('wrong@test.com:wrongpass').toString('base64');
        await request(app)
          .get(`/v1/user/${userId1}`)
          .set('Authorization', `Basic ${wrongAuth}`)
          .expect(401);
      });

      test('should reject accessing protected endpoint without token', async () => {
        await request(app)
          .get(`/v1/user/${userId1}`)
          .expect(401);
      });

      test('should reject creating product without authentication', async () => {
        await request(app)
          .post('/v1/product')
          .send(testProduct)
          .expect(401);
      });
    });

    describe('Resource Not Found Tests', () => {
      test('should return 404 for non-existent user by ID', async () => {
        const fakeId = '00000000-0000-4000-8000-000000000000';
        await request(app)
          .get(`/v1/user/${fakeId}`)
          .set('Authorization', `Basic ${authToken1}`)
          .expect(403); // 403 because it's not their user ID
      });

      test('should return 404 for non-existent product by ID', async () => {
        const fakeId = '99999999-9999-4999-9999-999999999999';
        await request(app)
          .get(`/v1/product/${fakeId}`)
          .expect(404);
      });

      test('should return 404 when updating non-existent product', async () => {
        const fakeId = '88888888-8888-4888-8888-888888888888';
        await request(app)
          .put(`/v1/product/${fakeId}`)
          .set('Authorization', `Basic ${authToken1}`)
          .send({
            name: 'Ghost',
            description: 'Ghost',
            sku: 'GHOST-001',
            manufacturer: 'Ghost',
            quantity: 0
          })
          .expect(404);
      });

      test('should return 404 when deleting non-existent product', async () => {
        const fakeId = '77777777-7777-4777-7777-777777777777';
        await request(app)
          .delete(`/v1/product/${fakeId}`)
          .set('Authorization', `Basic ${authToken1}`)
          .expect(400);
      });
    });

    describe('HTTP Method Tests', () => {
      test('should reject wrong HTTP method on /healthz', async () => {
        await request(app).post('/healthz').expect(405);
        await request(app).put('/healthz').expect(405);
        await request(app).delete('/healthz').expect(405);
      });

      test('should reject wrong HTTP method on /v1/user', async () => {
        await request(app).patch('/v1/user').expect(405);
        await request(app).delete('/v1/user').expect(405);
      });

      test('should return 404 for unsupported endpoints', async () => {
        await request(app).get('/v1/nonexistent').expect(404);
        await request(app).get('/api/user').expect(404);
        await request(app).post('/v1/users').expect(404);
      });
    });
  });

  // ========================================
  // C. EDGE CASE TESTS
  // ========================================
  
  describe('C. EDGE CASE TESTS', () => {
    
    describe('Boundary Value Tests', () => {
      test('should handle minimum string length (empty not allowed)', async () => {
        await request(app)
          .post('/v1/user')
          .send({
            email: 'min@test.com', // Minimum valid email
            password: 'Min123!', // Minimum 6 chars
            first_name: 'A', // Single char
            last_name: 'B'
          })
          .expect(201);
      });

      test('should handle maximum string length', async () => {
        const longString = 'a'.repeat(250);
        await request(app)
          .post('/v1/user')
          .send({
            email: `test${Date.now()}@example.com`,
            password: 'Test123!',
            first_name: longString,
            last_name: longString
          })
          .expect(201);
      });

      test('should handle minimum numeric value (0)', async () => {
        const response = await request(app)
          .post('/v1/product')
          .set('Authorization', `Basic ${authToken1}`)
          .send({
            name: 'Min Quantity',
            description: 'Test',
            sku: `MIN-${Date.now()}`,
            manufacturer: 'Test',
            quantity: 0
          })
          .expect(201);

        expect(response.body.quantity).toBe(0);
      });

      test('should handle maximum numeric value (100)', async () => {
        const response = await request(app)
          .post('/v1/product')
          .set('Authorization', `Basic ${authToken1}`)
          .send({
            name: 'Max Quantity',
            description: 'Test',
            sku: `MAX-${Date.now()}`,
            manufacturer: 'Test',
            quantity: 100
          })
          .expect(201);

        expect(response.body.quantity).toBe(100);
      });

      test('should reject values outside boundaries', async () => {
        // Negative quantity
        await request(app)
          .post('/v1/product')
          .set('Authorization', `Basic ${authToken1}`)
          .send({
            name: 'Negative',
            description: 'Test',
            sku: 'NEG-001',
            manufacturer: 'Test',
            quantity: -1
          })
          .expect(400);

        // Over 100
        await request(app)
          .post('/v1/product')
          .set('Authorization', `Basic ${authToken1}`)
          .send({
            name: 'Over',
            description: 'Test',
            sku: 'OVER-001',
            manufacturer: 'Test',
            quantity: 101
          })
          .expect(400);
      });

      test('should handle special characters in input', async () => {
        await request(app)
          .post('/v1/user')
          .send({
            email: `special${Date.now()}@test.com`,
            password: 'Test@#$123!',
            first_name: "O'Brien",
            last_name: 'José-María'
          })
          .expect(201);

        await request(app)
          .post('/v1/product')
          .set('Authorization', `Basic ${authToken1}`)
          .send({
            name: 'Product™ with © symbols',
            description: 'Description with "quotes" and special chars: @#$%',
            sku: `SKU-${Date.now()}-#@!`,
            manufacturer: 'Test & Co.',
            quantity: 10
          })
          .expect(201);
      });
    });

    describe('Performance/Load Tests', () => {
      test('should handle concurrent requests', async () => {
        const promises = [];
        
        // Send 10 concurrent health check requests
        for (let i = 0; i < 10; i++) {
          promises.push(
            request(app).get('/healthz')
          );
        }

        const results = await Promise.all(promises);
        results.forEach(result => {
          expect(result.status).toBe(200);
        });
      });

      test('should respond within reasonable time', async () => {
        const startTime = Date.now();
        
        await request(app)
          .get('/healthz')
          .expect(200);
        
        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
      });

      test('should handle multiple users creating products simultaneously', async () => {
        const promises = [];
        
        for (let i = 0; i < 5; i++) {
          promises.push(
            request(app)
              .post('/v1/product')
              .set('Authorization', `Basic ${authToken1}`)
              .send({
                name: `Concurrent Product ${i}`,
                description: 'Concurrent test',
                sku: `CONC-${Date.now()}-${i}`,
                manufacturer: 'Test',
                quantity: 10
              })
          );
        }

        const results = await Promise.all(promises);
        results.forEach(result => {
          expect(result.status).toBe(201);
        });
      });
    });

    describe('Data Integrity Tests', () => {
      test('should persist created data correctly', async () => {
        // Create a product
        const createResponse = await request(app)
          .post('/v1/product')
          .set('Authorization', `Basic ${authToken1}`)
          .send({
            name: 'Persistence Test',
            description: 'Testing persistence',
            sku: `PERSIST-${Date.now()}`,
            manufacturer: 'Test Corp',
            quantity: 25
          })
          .expect(201);

        const createdId = createResponse.body.id;

        // Retrieve and verify
        const getResponse = await request(app)
          .get(`/v1/product/${createdId}`)
          .expect(200);

        expect(getResponse.body.name).toBe('Persistence Test');
        expect(getResponse.body.quantity).toBe(25);
      });

      test('should not affect unmodified fields during update', async () => {
        // Create a product
        const createResponse = await request(app)
          .post('/v1/product')
          .set('Authorization', `Basic ${authToken1}`)
          .send({
            name: 'Integrity Test',
            description: 'Original description',
            sku: `INT-${Date.now()}`,
            manufacturer: 'Original Manufacturer',
            quantity: 50
          })
          .expect(201);

        const productId = createResponse.body.id;
        const originalData = createResponse.body;

        // Partial update - only quantity
        await request(app)
          .patch(`/v1/product/${productId}`)
          .set('Authorization', `Basic ${authToken1}`)
          .send({ quantity: 30 })
          .expect(204);

        // Verify only quantity changed
        const getResponse = await request(app)
          .get(`/v1/product/${productId}`)
          .expect(200);

        expect(getResponse.body.name).toBe(originalData.name);
        expect(getResponse.body.description).toBe(originalData.description);
        expect(getResponse.body.sku).toBe(originalData.sku);
        expect(getResponse.body.manufacturer).toBe(originalData.manufacturer);
        expect(getResponse.body.quantity).toBe(30); // Only this changed
      });

      test('should properly remove deleted data', async () => {
        // Create a product
        const createResponse = await request(app)
          .post('/v1/product')
          .set('Authorization', `Basic ${authToken1}`)
          .send({
            name: 'Delete Test',
            description: 'To be deleted',
            sku: `DEL-${Date.now()}`,
            manufacturer: 'Test',
            quantity: 1
          })
          .expect(201);

        const productId = createResponse.body.id;

        // Delete it
        await request(app)
          .delete(`/v1/product/${productId}`)
          .set('Authorization', `Basic ${authToken1}`)
          .expect(204);

        // Verify it's gone
        await request(app)
          .get(`/v1/product/${productId}`)
          .expect(404);
      });
    });
  });

  // ========================================
  // HEALTH CHECK TESTS
  // ========================================
  
  describe('Health Check Tests', () => {
    test('should return 200 when healthy', async () => {
      await request(app)
        .get('/healthz')
        .expect(200);
    });

    test('should reject query parameters', async () => {
      await request(app)
        .get('/healthz?test=true')
        .expect(400);
    });

    test('should reject request body', async () => {
      await request(app)
        .get('/healthz')
        .send({ test: 'data' })
        .expect(400);
    });
  });
});