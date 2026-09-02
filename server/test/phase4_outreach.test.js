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
const Outreach = require('../models/Outreach');
const Backlink = require('../models/Backlink');
const PaidApiProvider = require('../providers/PaidApiProvider');

describe('Phase 4 — Outreach Tracker & Auto-Backlink Creation Verification', () => {
  let adminToken, memberToken;
  let projectId;
  let outreachId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGO_URI = mongoUri;

    await mongoose.connect(mongoUri);
    app = require('../index');

    // Create Admin User
    const adm = await request(app)
      .post('/api/auth/register')
      .send({ username: 'OutreachAdmin', email: 'outreachadmin@example.com', password: 'Password123!' });
    await User.findByIdAndUpdate(adm.body.user.id, { role: 'admin' });
    adminToken = (await request(app).post('/api/auth/login').send({ email: 'outreachadmin@example.com', password: 'Password123!' })).body.token;

    // Create Team Member User
    const mem = await request(app)
      .post('/api/auth/register')
      .send({ username: 'OutreachMember', email: 'outreachmember@example.com', password: 'Password123!' });
    memberToken = mem.body.token;

    // Create Project
    const projRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ businessName: 'Outreach Test Client', projectUrl: 'https://outreachclient.com' });
    projectId = projRes.body.project._id || projRes.body.project.id;
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test('1. Record Outreach pitch with contact email, pitch date, and follow-up date', async () => {
    const pitchDate = new Date().toISOString();
    const followUpDate = new Date(Date.now() + 7 * 86400000).toISOString();

    const res = await request(app)
      .post('/api/outreach')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        projectId,
        site: 'https://techcrunch.com/pitch',
        contactEmail: 'editor@techcrunch.com',
        pitchDate,
        followUpDate,
        notes: 'Pitched guest article on AI tools'
      });

    expect(res.status).toBe(201);
    expect(res.body.outreach.site).toBe('https://techcrunch.com/pitch');
    expect(res.body.outreach.contactEmail).toBe('editor@techcrunch.com');
    expect(res.body.outreach.status).toBe('no_reply');

    outreachId = res.body.outreach._id || res.body.outreach.id;
  });

  test('2. Update Outreach status to in_discussion', async () => {
    const res = await request(app)
      .put(`/api/outreach/${outreachId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        status: 'in_discussion',
        notes: 'Editor expressed interest in guest post draft'
      });

    expect(res.status).toBe(200);
    expect(res.body.outreach.status).toBe('in_discussion');
    expect(res.body.autoCreatedBacklink).toBeNull();
  });

  test('3. Auto-Backlink Creation: Updating Outreach status to published creates live Backlink record', async () => {
    const publishedUrl = 'https://techcrunch.com/2026/08/published-ai-article';

    const res = await request(app)
      .put(`/api/outreach/${outreachId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        status: 'published',
        publishedUrl,
        notes: 'Guest post published on TechCrunch!'
      });

    expect(res.status).toBe(200);
    expect(res.body.outreach.status).toBe('published');
    expect(res.body.autoCreatedBacklink).toBeDefined();

    const createdBacklink = res.body.autoCreatedBacklink;
    expect(createdBacklink.url).toBe(publishedUrl);
    expect(createdBacklink.rootDomain).toBe('techcrunch.com');
    expect(createdBacklink.status).toBe('live');
    expect(createdBacklink.lastDa).toBeGreaterThan(0);

    // Confirm outreach record backlinkId is linked
    expect(res.body.outreach.backlinkId._id || res.body.outreach.backlinkId).toBe(createdBacklink._id);

    // Confirm Backlink document exists in DB
    const dbBacklink = await Backlink.findById(createdBacklink._id);
    expect(dbBacklink).toBeDefined();
    expect(dbBacklink.status).toBe('live');
  });

  test('4. test_outreach_publish_metrics_fetch_respects_budget_cap: Budget cap exhaustion applies fallback during publish', async () => {
    const originalProvider = process.env.ACTIVE_METRICS_PROVIDER;
    process.env.ACTIVE_METRICS_PROVIDER = 'moz';
    process.env.MOZ_API_KEY = 'mock-test-key';

    PaidApiProvider.resetPaidCallCount();
    process.env.PAID_PROVIDER_BUDGET_CAP = '1';

    // Exhaust budget cap with 1st call
    const paid = new PaidApiProvider('moz', { apiKey: 'mock-test-key', budgetCap: 1 });
    await paid.getDomainMetrics('initial-call.com');

    // Create & Publish Outreach Record
    const pitch = await request(app)
      .post('/api/outreach')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ projectId, site: 'https://moz-capped-publisher.com' });

    const publishRes = await request(app)
      .put(`/api/outreach/${pitch.body.outreach._id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'published', publishedUrl: 'https://moz-capped-publisher.com/article' });

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.autoCreatedBacklink).toBeDefined();
    // Verify metrics fallback was safely applied
    expect(publishRes.body.autoCreatedBacklink.lastDa).toBeGreaterThan(0);

    process.env.ACTIVE_METRICS_PROVIDER = originalProvider || 'internal';
    PaidApiProvider.resetPaidCallCount();
  });

  test('5. test_outreach_publish_flags_duplicate_when_active_backlink_exists: Subdomain variant outreach publish flags duplicate', async () => {
    // Create live backlink under root domain example.com
    const blRes = await request(app)
      .post('/api/backlinks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ projectId, url: 'https://example.com/original-live-link' });

    const originalId = blRes.body.backlink._id || blRes.body.backlink.id;

    // Pitch outreach targeting blog.example.com (subdomain variant)
    const pitch = await request(app)
      .post('/api/outreach')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ projectId, site: 'https://blog.example.com/pitch' });

    const pubRes = await request(app)
      .put(`/api/outreach/${pitch.body.outreach._id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'published', publishedUrl: 'https://blog.example.com/guest-post' });

    expect(pubRes.status).toBe(200);
    expect(pubRes.body.autoCreatedBacklink.duplicateFlag).toBe(true);
    const origId = pubRes.body.autoCreatedBacklink.originalBacklinkId._id || pubRes.body.autoCreatedBacklink.originalBacklinkId;
    expect(origId.toString()).toBe(originalId.toString());
  });

  test('6. test_outreach_publish_treats_removed_original_as_fresh: Removed original allows fresh unflagged link', async () => {
    // Create link under fresh-outreach.com and mark as removed
    const blRes = await request(app)
      .post('/api/backlinks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ projectId, url: 'https://fresh-outreach.com/deleted-link' });

    await Backlink.findByIdAndUpdate(blRes.body.backlink._id, { status: 'removed' });

    // Pitch and publish outreach targeting fresh-outreach.com
    const pitch = await request(app)
      .post('/api/outreach')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ projectId, site: 'https://fresh-outreach.com/new-pitch' });

    const pubRes = await request(app)
      .put(`/api/outreach/${pitch.body.outreach._id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'published', publishedUrl: 'https://fresh-outreach.com/new-replacement-article' });

    expect(pubRes.status).toBe(200);
    expect(pubRes.body.autoCreatedBacklink.duplicateFlag).toBe(false);
  });
});
