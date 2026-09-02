require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(30000);

let mongoServer;
let app;

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '4d9eb34681886a42433611db286819300dc6d1dcdab782f9b69134fce97f7b2c';
process.env.JWT_SECRET = process.env.JWT_SECRET || '986b775c65dfc5a5afeda4acf398ef76cd00013df7a9b836e44ad36085a4eda4';

const User = require('../models/User');
const Prospect = require('../models/Prospect');
const Outreach = require('../models/Outreach');
const PaidApiProvider = require('../providers/PaidApiProvider');

describe('Phase 3 — Prospect List & Promote to Outreach Verification', () => {
  let adminToken, memberToken;
  let projectId;
  let prospectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGO_URI = mongoUri;

    await mongoose.connect(mongoUri);
    app = require('../index');

    // Create Admin User
    const adm = await request(app)
      .post('/api/auth/register')
      .send({ username: 'ProspectAdmin', email: 'prospectadmin@example.com', password: 'Password123!' });
    await User.findByIdAndUpdate(adm.body.user.id, { role: 'admin' });
    adminToken = (await request(app).post('/api/auth/login').send({ email: 'prospectadmin@example.com', password: 'Password123!' })).body.token;

    // Create Team Member User
    const mem = await request(app)
      .post('/api/auth/register')
      .send({ username: 'ProspectMember', email: 'prospectmember@example.com', password: 'Password123!' });
    memberToken = mem.body.token;

    // Create Project
    const projRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ businessName: 'Prospect Test Agency', projectUrl: 'https://prospectagency.com' });
    projectId = projRes.body.project._id || projRes.body.project.id;
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test('1. Add Prospect auto-checks DA/PA/SS via MetricsProvider', async () => {
    const res = await request(app)
      .post('/api/prospects')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        projectId,
        site: 'https://techcrunch.com/guest-posts',
        priority: 'high',
        notes: 'Targeting guest article feature'
      });

    expect(res.status).toBe(201);
    expect(res.body.prospect.rootDomain).toBe('techcrunch.com');
    expect(res.body.prospect.daSnapshot).toBeGreaterThan(0);
    expect(res.body.prospect.contactStatus).toBe('new');
    expect(res.body.prospect.priority).toBe('high');

    prospectId = res.body.prospect._id || res.body.prospect.id;
  });

  test('2. Filterable & Sortable Prospect List', async () => {
    // Add second prospect
    await request(app)
      .post('/api/prospects')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        projectId,
        site: 'https://smallblog.com/contact',
        priority: 'low',
        notes: 'Low priority site'
      });

    const res = await request(app)
      .get(`/api/prospects?projectId=${projectId}&contactStatus=new&sortBy=da&sortOrder=desc`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.prospects.length).toBe(2);
    expect(res.body.prospects[0].daSnapshot).toBeGreaterThanOrEqual(res.body.prospects[1].daSnapshot);
  });

  test('3. Promote Prospect to Outreach creates Outreach record and updates Prospect contactStatus', async () => {
    const res = await request(app)
      .post(`/api/prospects/${prospectId}/promote-to-outreach`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        contactEmail: 'editor@techcrunch.com',
        notes: 'Promoting to outreach pitch list'
      });

    expect(res.status).toBe(201);
    expect(res.body.outreach.status).toBe('no_reply');
    expect(res.body.outreach.contactEmail).toBe('editor@techcrunch.com');
    expect(res.body.prospect.contactStatus).toBe('contacted');

    // Confirm DB Outreach record created
    const dbOutreach = await Outreach.findById(res.body.outreach._id || res.body.outreach.id);
    expect(dbOutreach).toBeDefined();
    expect(dbOutreach.prospectId.toString()).toBe(prospectId.toString());

    // Confirm DB Prospect status updated to 'contacted'
    const dbProspect = await Prospect.findById(prospectId);
    expect(dbProspect.contactStatus).toBe('contacted');
  });

  test('4. test_prospect_creation_respects_budget_cap: Paid provider fallback correctly applies on cap exhaustion', async () => {
    const originalProvider = process.env.ACTIVE_METRICS_PROVIDER;
    process.env.ACTIVE_METRICS_PROVIDER = 'moz';
    process.env.MOZ_API_KEY = 'mock-test-key';

    PaidApiProvider.resetPaidCallCount();
    process.env.PAID_PROVIDER_BUDGET_CAP = '1';

    // 1st Prospect -> Uses Moz paid provider (call 1 of 1)
    const res1 = await request(app)
      .post('/api/prospects')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        projectId,
        site: 'https://moz-paid-prospect1.com',
        priority: 'high'
      });

    expect(res1.status).toBe(201);
    expect(res1.body.providerSource).toBe('moz');

    // 2nd Prospect -> Cap (1/1) hit -> Falls back to internal engine with explicit source label
    const res2 = await request(app)
      .post('/api/prospects')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        projectId,
        site: 'https://moz-paid-prospect2.com',
        priority: 'medium'
      });

    expect(res2.status).toBe(201);
    expect(res2.body.providerSource).toBe('internal (fallback from moz)');

    // Reset env
    process.env.ACTIVE_METRICS_PROVIDER = originalProvider || 'internal';
    PaidApiProvider.resetPaidCallCount();
  });
});
