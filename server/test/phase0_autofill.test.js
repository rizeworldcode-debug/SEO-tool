require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(30000);

let mongoServer;
let app;

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '4d9eb34681886a42433611db286819300dc6d1dcdab782f9b69134fce97f7b2c';
process.env.JWT_SECRET = process.env.JWT_SECRET || '986b775c65dfc5a5afeda4acf398ef76cd00013df7a9b836e44ad36085a4eda4';

const Project = require('../models/Project');
const User = require('../models/User');

describe('Phase 0 — Project Profile Auto-Fill & Master Doc Immutability Tests', () => {
  let adminToken;
  let projectAId, projectBId;

  const originalProjectA = {
    businessName: 'Master Business A',
    projectUrl: 'https://site-a.com',
    address: '100 Primary Way',
    phone: '555-1111',
    businessEmail: 'masterA@site.com',
    category: 'Education',
    goal: 'Increase Traffic',
    targetLocation: 'United States',
    socialLinks: { twitter: '@masterA', facebook: 'fb/masterA' },
    offPageLogin: { email: 'loginA@site.com', password: 'PasswordA123!' }
  };

  const originalProjectB = {
    businessName: 'Master Business B',
    projectUrl: 'https://site-b.com',
    address: '200 Secondary Ave',
    phone: '555-2222',
    businessEmail: 'masterB@site.com',
    category: 'E-commerce',
    goal: 'Boost Sales',
    targetLocation: 'Global',
    socialLinks: { twitter: '@masterB', facebook: 'fb/masterB' },
    offPageLogin: { email: 'loginB@site.com', password: 'PasswordB123!' }
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGO_URI = mongoUri;

    await mongoose.connect(mongoUri);
    app = require('../index');

    // Create Admin user
    const adm = await request(app)
      .post('/api/auth/register')
      .send({ username: 'AutoFillTester', email: 'autofilltester@example.com', password: 'Password123!' });
    await User.findByIdAndUpdate(adm.body.user.id, { role: 'admin' });
    adminToken = (await request(app).post('/api/auth/login').send({ email: 'autofilltester@example.com', password: 'Password123!' })).body.token;

    // Create Project A
    const resA = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(originalProjectA);
    projectAId = resA.body.project._id || resA.body.project.id;

    // Create Project B
    const resB = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(originalProjectB);
    projectBId = resB.body.project._id || resB.body.project.id;
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // Split Test 1: Auto-Fill fields populating correctly
  test('test_autofill_populates_correct_fields: fetching /api/projects/:id/autofill returns correct master profile fields', async () => {
    const autofillRes = await request(app)
      .get(`/api/projects/${projectAId}/autofill`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(autofillRes.status).toBe(200);
    expect(autofillRes.body.projectId).toBe(projectAId);
    expect(autofillRes.body.businessName).toBe(originalProjectA.businessName);
    expect(autofillRes.body.projectUrl).toBe(originalProjectA.projectUrl);
    expect(autofillRes.body.address).toBe(originalProjectA.address);
    expect(autofillRes.body.phone).toBe(originalProjectA.phone);
    expect(autofillRes.body.businessEmail).toBe(originalProjectA.businessEmail);
    expect(autofillRes.body.category).toBe(originalProjectA.category);
    expect(autofillRes.body.goal).toBe(originalProjectA.goal);
    expect(autofillRes.body.targetLocation).toBe(originalProjectA.targetLocation);
    expect(autofillRes.body.socialLinks).toEqual(expect.objectContaining(originalProjectA.socialLinks));
  });

  // Split Test 2: Manual overwrite immutability check
  test('test_manual_overwrite_does_not_mutate_master_project: backlink manual overwrite leaves master Project document 100% unchanged', async () => {
    // Submit backlink with manual profile overwrites
    const backlinkRes = await request(app)
      .post('/api/backlinks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        projectId: projectAId,
        url: 'https://techcrunch.com/features/project-a-review',
        anchorText: 'Project A Review',
        targetSite: originalProjectA.projectUrl,
        manualProfileOverwrites: {
          businessName: 'MUTATION ATTEMPT NAME',
          address: '999 OVERWRITE ST',
          phone: '555-9999',
          businessEmail: 'overwritten@hacked.com'
        }
      });

    expect(backlinkRes.status).toBe(201);
    expect(backlinkRes.body.backlink.manualProfileOverwrites.businessName).toBe('MUTATION ATTEMPT NAME');

    // Re-fetch Project A master document directly from database and perform byte-for-byte / field-by-field verification
    const fetchedMasterA = await Project.findById(projectAId);
    expect(fetchedMasterA.businessName).toBe(originalProjectA.businessName);
    expect(fetchedMasterA.projectUrl).toBe(originalProjectA.projectUrl);
    expect(fetchedMasterA.address).toBe(originalProjectA.address);
    expect(fetchedMasterA.phone).toBe(originalProjectA.phone);
    expect(fetchedMasterA.businessEmail).toBe(originalProjectA.businessEmail);
    expect(fetchedMasterA.category).toBe(originalProjectA.category);
    expect(fetchedMasterA.goal).toBe(originalProjectA.goal);
    expect(fetchedMasterA.targetLocation).toBe(originalProjectA.targetLocation);
  });

  // Split Test 3: Dropdown switch reloads correct profile
  test('test_project_dropdown_switch_reloads_correct_profile: switching selected project loads newly selected project profile data', async () => {
    // 1. Fetch profile for Project A
    const resA = await request(app)
      .get(`/api/projects/${projectAId}/autofill`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resA.body.businessName).toBe('Master Business A');

    // 2. Switch dropdown to Project B
    const resB = await request(app)
      .get(`/api/projects/${projectBId}/autofill`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resB.body.businessName).toBe('Master Business B');
    expect(resB.body.projectUrl).toBe('https://site-b.com');
    expect(resB.body.address).toBe('200 Secondary Ave');
    expect(resB.body.phone).toBe('555-2222');
    expect(resB.body.businessEmail).toBe('masterB@site.com');

    // Ensure it did not return stale data from Project A
    expect(resB.body.businessName).not.toBe(resA.body.businessName);
  });
});
