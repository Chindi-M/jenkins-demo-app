const request = require('supertest');
const server = require('./server');

describe('API Tests', () => {
  afterAll(() => {
    server.close();
  });

  test('GET / returns welcome message', async () => {
    const response = await request(server).get('/');
    expect(response.status).toBe(200);
    expect(response.body.message).toContain('Hello');
  });

  test('GET /health returns healthy status', async () => {
    const response = await request(server).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });
});