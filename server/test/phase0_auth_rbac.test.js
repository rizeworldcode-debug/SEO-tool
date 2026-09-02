require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(30000);

let mongoServer;
let app;

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '4d9eb34681886a42433611db286819300dc6d1dcdab782f9b69134fce97f7b2c';
process.env.JWT_SECRET = process.env.JWT_SECRET || '986b775c65dfc5a5afeda4acf398ef76cd00013df7a9b836e44ad36085a4eda4';

const { assertEncryptionConfigured } = require('../utils/encryption');
const { assertJwtConfigured } = require('../utils/auth');
const User = require('../models/User');

describe('Phase 0 — Complete 3x3 Role-Based Access Control (RBAC) Matrix Verification', () => {
  let adminToken, leaderToken, memberToken;
  let sampleProjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGO_URI = mongoUri;

    await mongoose.connect(mongoUri);
    app = require('../index');

    // 1. Create Admin user
    const adm = await request(app)
      .post('/api/auth/register')
      .send({ username: 'AdminMaster', email: 'adminmaster@example.com', password: 'Password123!' });
    await User.findByIdAndUpdate(adm.body.user.id, { role: 'admin' });
    adminToken = (await request(app).post('/api/auth/login').send({ email: 'adminmaster@example.com', password: 'Password123!' })).body.token;

    // 2. Create Team Leader user
    const ldr = await request(app)
      .post('/api/auth/register')
      .send({ username: 'TeamLeaderOne', email: 'leaderone@example.com', password: 'Password123!' });
    await User.findByIdAndUpdate(ldr.body.user.id, { role: 'team_leader' });
    leaderToken = (await request(app).post('/api/auth/login').send({ email: 'leaderone@example.com', password: 'Password123!' })).body.token;

    // 3. Create Team Member user
    const mem = await request(app)
      .post('/api/auth/register')
      .send({ username: 'TeamMemberOne', email: 'memberone@example.com', password: 'Password123!' });
    memberToken = mem.body.token;
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test('1. Environment Security: Startup assertions for missing/invalid keys', () => {
    const originalEnc = process.env.ENCRYPTION_KEY;
    const originalJwt = process.env.JWT_SECRET;

    delete process.env.ENCRYPTION_KEY;
    expect(() => assertEncryptionConfigured()).toThrow(/ENCRYPTION_KEY environment variable is required/);

    process.env.ENCRYPTION_KEY = 'short-key';
    expect(() => assertEncryptionConfigured()).toThrow(/ENCRYPTION_KEY must be exactly 32 bytes/);

    process.env.ENCRYPTION_KEY = originalEnc;

    delete process.env.JWT_SECRET;
    expect(() => assertJwtConfigured()).toThrow(/JWT_SECRET environment variable is required/);

    process.env.JWT_SECRET = originalJwt;
  });

  test('2. Registration Lockdown: POST /api/auth/register forces team_member role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'AttemptedAdmin',
        email: 'attemptedadmin@example.com',
        password: 'Password123!',
        role: 'admin'
      });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('team_member');
  });

  // --------------------------------------------------------------------------
  // Complete 3x3 Project CUD Matrix Tests
  // --------------------------------------------------------------------------

  // CREATE (POST /api/projects)
  test('3. RBAC Matrix - CREATE: Admin (Allowed 201), Team Leader (Allowed 201), Team Member (Blocked 403)', async () => {
    // admin create
    const admRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ businessName: 'Admin Project', projectUrl: 'https://adminproj.com' });
    expect(admRes.status).toBe(201);
    sampleProjectId = admRes.body.project._id || admRes.body.project.id;

    // team_leader create
    const ldrRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ businessName: 'Leader Project', projectUrl: 'https://leaderproj.com' });
    expect(ldrRes.status).toBe(201);

    // team_member create -> 403
    const memRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ businessName: 'Member Project', projectUrl: 'https://memberproj.com' });
    expect(memRes.status).toBe(403);
  });

  // UPDATE (PUT /api/projects/:id)
  test('4. RBAC Matrix - UPDATE: Admin (Allowed 200), Team Leader (Allowed 200), Team Member (Blocked 403)', async () => {
    // admin update
    const admRes = await request(app)
      .put(`/api/projects/${sampleProjectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ businessName: 'Admin Updated Name' });
    expect(admRes.status).toBe(200);

    // team_leader update
    const ldrRes = await request(app)
      .put(`/api/projects/${sampleProjectId}`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ businessName: 'Leader Updated Name' });
    expect(ldrRes.status).toBe(200);

    // team_member update -> 403
    const memRes = await request(app)
      .put(`/api/projects/${sampleProjectId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ businessName: 'Member Hacked Name' });
    expect(memRes.status).toBe(403);
  });

  // DELETE (DELETE /api/projects/:id)
  test('5. RBAC Matrix - DELETE: Admin (Allowed 200), Team Leader (Blocked 403), Team Member (Blocked 403)', async () => {
    // Create a temporary project for leader delete attempt
    const tempProjRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ businessName: 'Temp Delete Project', projectUrl: 'https://tempdelete.com' });
    const tempId = tempProjRes.body.project._id || tempProjRes.body.project.id;

    // team_member delete -> 403
    const memRes = await request(app)
      .delete(`/api/projects/${tempId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(memRes.status).toBe(403);

    // team_leader delete -> 403 (Explicit Decision: Team Leaders cannot delete projects)
    const ldrRes = await request(app)
      .delete(`/api/projects/${tempId}`)
      .set('Authorization', `Bearer ${leaderToken}`);
    expect(ldrRes.status).toBe(403);

    // admin delete -> 200
    const admRes = await request(app)
      .delete(`/api/projects/${tempId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(admRes.status).toBe(200);
  });

  // Sanitization & Off-Page Login Access
  test('6. Credential Read RBAC: Admin and Team Leader view decrypted credentials; Team Member receives redacted badge', async () => {
    // Create project with encrypted credentials
    const projRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        businessName: 'Secret Project',
        projectUrl: 'https://secret.com',
        offPageLogin: { email: 'secret@secret.com', password: 'SecretPassword999!' }
      });
    const pid = projRes.body.project._id || projRes.body.project.id;

    // team_member GET -> redacted
    const memRes = await request(app)
      .get(`/api/projects/${pid}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(memRes.status).toBe(200);
    expect(memRes.body.project.offPageLogin.email).toBe('[REDACTED - Admin/TL Only]');
    expect(memRes.body.project.offPageLogin.password).toBeUndefined();

    // team_leader GET -> decrypted
    const ldrRes = await request(app)
      .get(`/api/projects/${pid}`)
      .set('Authorization', `Bearer ${leaderToken}`);
    expect(ldrRes.status).toBe(200);
    expect(ldrRes.body.project.offPageLogin.email).toBe('secret@secret.com');
    expect(ldrRes.body.project.offPageLogin.password).toBe('SecretPassword999!');

    // admin GET -> decrypted
    const admRes = await request(app)
      .get(`/api/projects/${pid}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(admRes.status).toBe(200);
    expect(admRes.body.project.offPageLogin.email).toBe('secret@secret.com');
    expect(admRes.body.project.offPageLogin.password).toBe('SecretPassword999!');
  });
});
