const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../config/database');

describe('Health Check Endpoint', () => {
  // Clean up after tests
  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /healthz', () => {
    test('should return 200 when database is connected', async () => {
      const response = await request(app)
        .get('/healthz')
        .expect(200);
      
      expect(response.body).toEqual({});
      expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
    });

    test('should return 400 when query parameters are provided', async () => {
      const response = await request(app)
        .get('/healthz?test=true')
        .expect(400);
      
      expect(response.body).toEqual({});
    });

    test('should return 400 when request body is provided', async () => {
      const response = await request(app)
        .get('/healthz')
        .send({ test: 'data' })
        .expect(400);
      
      expect(response.body).toEqual({});
    });
  });

  describe('Other methods on /healthz', () => {
    test('POST /healthz should return 405', async () => {
      const response = await request(app)
        .post('/healthz')
        .expect(405);
      
      expect(response.body).toEqual({});
    });

    test('PUT /healthz should return 405', async () => {
      const response = await request(app)
        .put('/healthz')
        .expect(405);
      
      expect(response.body).toEqual({});
    });

    test('DELETE /healthz should return 405', async () => {
      const response = await request(app)
        .delete('/healthz')
        .expect(405);
      
      expect(response.body).toEqual({});
    });
  });
});