const request = require('supertest');
const { exec } = require('child_process');
const app = require('../../server');

describe('503 Service Unavailable - Real Database Failure', () => {
  test('should return 503 when database is actually down', async (done) => {
    // Start checking health endpoint in a loop
    let gotError = false;
    const interval = setInterval(async () => {
      try {
        const response = await request(app)
          .get('/healthz');
        
        if (response.status === 503) {
          gotError = true;
          clearInterval(interval);
          
          // Restart MySQL
          exec('sudo service mysql start', (error) => {
            if (!error) {
              setTimeout(() => {
                expect(gotError).toBe(true);
                done();
              }, 2000);
            }
          });
        }
      } catch (err) {
        // Continue checking
      }
    }, 500);

    // Stop MySQL after 2 seconds
    setTimeout(() => {
      exec('sudo service mysql stop', (error, stdout, stderr) => {
        if (error) {
          console.error('Failed to stop MySQL:', error);
          clearInterval(interval);
          done();
        }
      });
    }, 2000);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(interval);
      if (!gotError) {
        done(new Error('Did not get 503 error'));
      }
    }, 10000);
  });
});