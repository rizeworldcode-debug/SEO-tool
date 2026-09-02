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
const Backlink = require('../models/Backlink');

describe('Phase 1 — Root Domain Extraction & Duplicate Detection Verification', () => {
  let adminToken, memberToken;
  let projectId;
  let firstBacklinkId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGO_URI = mongoUri;

    await mongoose.connect(mongoUri);
    app = require('../index');

    // Create Admin User
    const adm = await request(app)
      .post('/api/auth/register')
      .send({ username: 'DupAdmin', email: 'dupadmin@example.com', password: 'Password123!' });
    await User.findByIdAndUpdate(adm.body.user.id, { role: 'admin' });
    adminToken = (await request(app).post('/api/auth/login').send({ email: 'dupadmin@example.com', password: 'Password123!' })).body.token;

    // Create Team Member User
    const mem = await request(app)
      .post('/api/auth/register')
      .send({ username: 'TeammateUser', email: 'teammate@example.com', password: 'Password123!' });
    memberToken = mem.body.token;

    // Create Project
    const projRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ businessName: 'Duplicate Test Client', projectUrl: 'https://duptest.com' });
    projectId = projRes.body.project._id || projRes.body.project.id;
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test('1. First submission under root domain is clean (duplicateFlag: false)', async () => {
    const res = await request(app)
      .post('/api/backlinks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        projectId,
        url: 'https://techcrunch.com/2026/08/ai-tools-review',
        anchorText: 'AI Tools Review'
      });

    expect(res.status).toBe(201);
    expect(res.body.isDuplicate).toBe(false);
    expect(res.body.backlink.duplicateFlag).toBe(false);
    expect(res.body.backlink.rootDomain).toBe('techcrunch.com');
    expect(res.body.backlink.originalBacklinkId).toBeNull();

    firstBacklinkId = res.body.backlink._id || res.body.backlink.id;
  });

  test('2. Submitting same root domain again (even different URL/subdomain) gets flagged and linked', async () => {
    const res = await request(app)
      .post('/api/backlinks')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        projectId,
        url: 'https://gadgets.techcrunch.com/mobile-software-trends',
        anchorText: 'Mobile Tech Software'
      });

    expect(res.status).toBe(201);
    expect(res.body.isDuplicate).toBe(true);
    expect(res.body.backlink.duplicateFlag).toBe(true);
    expect(res.body.backlink.rootDomain).toBe('techcrunch.com');

    const origId = res.body.backlink.originalBacklinkId._id || res.body.backlink.originalBacklinkId;
    expect(origId.toString()).toBe(firstBacklinkId.toString());
  });

  test('3. Subdomain Variant Test: blog.site1.com, www.site1.com, site1.com all collapse to site1.com', async () => {
    const res1 = await request(app)
      .post('/api/backlinks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        projectId,
        url: 'https://blog.site1.com/article1',
        anchorText: 'Site1 Blog'
      });
    expect(res1.status).toBe(201);
    expect(res1.body.backlink.rootDomain).toBe('site1.com');
    expect(res1.body.backlink.duplicateFlag).toBe(false);
    const site1OriginalId = res1.body.backlink._id || res1.body.backlink.id;

    const res2 = await request(app)
      .post('/api/backlinks')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        projectId,
        url: 'https://www.site1.com/pricing',
        anchorText: 'Site1 Pricing'
      });
    expect(res2.status).toBe(201);
    expect(res2.body.backlink.rootDomain).toBe('site1.com');
    expect(res2.body.backlink.duplicateFlag).toBe(true);

    const res3 = await request(app)
      .post('/api/backlinks')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        projectId,
        url: 'https://site1.com/features',
        anchorText: 'Site1 Features'
      });
    expect(res3.status).toBe(201);
    expect(res3.body.backlink.rootDomain).toBe('site1.com');
    expect(res3.body.backlink.duplicateFlag).toBe(true);
  });

  test('4. Removed-Entry Logic: resubmitting a root domain whose prior entries are all removed treats new link as fresh', async () => {
    const res1 = await request(app)
      .post('/api/backlinks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        projectId,
        url: 'https://removed-domain.com/page1',
        anchorText: 'Original Removed Link'
      });
    expect(res1.status).toBe(201);
    const linkId = res1.body.backlink._id || res1.body.backlink.id;

    await Backlink.findByIdAndUpdate(linkId, { status: 'removed' });

    const res2 = await request(app)
      .post('/api/backlinks')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        projectId,
        url: 'https://removed-domain.com/page2-fresh',
        anchorText: 'Replacement Fresh Link'
      });

    expect(res2.status).toBe(201);
    expect(res2.body.isDuplicate).toBe(false);
    expect(res2.body.backlink.duplicateFlag).toBe(false);
  });

  test('5. Broken-Entry Logic: a broken-status original STILL blocks duplicate submission (cautions against transient HTTP downtime)', async () => {
    const res1 = await request(app)
      .post('/api/backlinks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        projectId,
        url: 'https://broken-domain.com/page1',
        anchorText: 'Original Broken Link'
      });
    expect(res1.status).toBe(201);
    const linkId = res1.body.backlink._id || res1.body.backlink.id;

    // Mark link as broken (e.g. transient 500 error)
    await Backlink.findByIdAndUpdate(linkId, { status: 'broken' });

    // New submission under broken-domain.com SHOULD be flagged as duplicate
    const res2 = await request(app)
      .post('/api/backlinks')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        projectId,
        url: 'https://broken-domain.com/page2',
        anchorText: 'Attempted Duplicate Link'
      });

    expect(res2.status).toBe(201);
    expect(res2.body.isDuplicate).toBe(true);
    expect(res2.body.backlink.duplicateFlag).toBe(true);
  });
});
