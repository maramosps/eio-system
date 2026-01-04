/*
═══════════════════════════════════════════════════════════
  E.I.O - TESTES DE AUTENTICAÇÃO
  Testes unitários e de integração
═══════════════════════════════════════════════════════════
*/

const request = require('supertest');
const { app } = require('../src/server');
const { User } = require('../src/models');
const bcrypt = require('bcryptjs');

describe('Auth API', () => {
    describe('POST /api/v1/auth/register', () => {
        it('should register a new user', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    name: 'Test User'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user.email).toBe('test@example.com');
            expect(res.body.data.accessToken).toBeDefined();
        });

        it('should not register user with existing email', async () => {
            // First registration
            await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'duplicate@example.com',
                    password: 'password123'
                });

            // Duplicate registration
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'duplicate@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Email already registered');
        });

        it('should validate email format', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'invalid-email',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(400);
        });
    });

    describe('POST /api/v1/auth/login', () => {
        beforeEach(async () => {
            const passwordHash = await bcrypt.hash('password123', 12);
            await User.create({
                email: 'login@example.com',
                password_hash: passwordHash,
                name: 'Login User'
            });
        });

        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.accessToken).toBeDefined();
        });

        it('should not login with wrong password', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'wrongpassword'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.error).toBe('Invalid credentials');
        });

        it('should not login with non-existent email', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /api/v1/users/me', () => {
        let token;

        beforeEach(async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'profile@example.com',
                    password: 'password123',
                    name: 'Profile User'
                });

            token = res.body.data.accessToken;
        });

        it('should get user profile with valid token', async () => {
            const res = await request(app)
                .get('/api/v1/users/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.user.email).toBe('profile@example.com');
        });

        it('should not get profile without token', async () => {
            const res = await request(app)
                .get('/api/v1/users/me');

            expect(res.statusCode).toBe(401);
        });

        it('should not get profile with invalid token', async () => {
            const res = await request(app)
                .get('/api/v1/users/me')
                .set('Authorization', 'Bearer invalid-token');

            expect(res.statusCode).toBe(401);
        });
    });
});

// Mock para execução sem servidor rodando
if (process.env.NODE_ENV !== 'test') {
    console.log('⚠️  Testes devem ser executados com NODE_ENV=test');
    console.log('📝 Execute: NODE_ENV=test npm test');
}
