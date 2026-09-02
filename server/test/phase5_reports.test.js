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
const Project = require('../models/Project');
const Backlink = require('../models/Backlink');
const { categorizeAnchorText, analyzeAnchorDistribution } = require('../services/anchorAnalyzer');
const { analyzeLinkVelocity } = require('../services/velocityTracker');

describe('Phase 5 — Anchor Text Distribution & Link Velocity Tracker Verification', () => {
  let adminToken;
  let projectId;

  const projectConfig = {
    businessName: 'Apex SEO Agency',
    projectUrl: 'https://apexseo.com',
    targetKeywords: ['best ai tools', 'seo audit software']
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGO_URI = mongoUri;

    await mongoose.connect(mongoUri);
    app = require('../index');

    // Create Admin User
    const adm = await request(app)
      .post('/api/auth/register')
      .send({ username: 'ReportAdmin', email: 'reportadmin@example.com', password: 'Password123!' });
    await User.findByIdAndUpdate(adm.body.user.id, { role: 'admin' });
    adminToken = (await request(app).post('/api/auth/login').send({ email: 'reportadmin@example.com', password: 'Password123!' })).body.token;

    // Create Project with Target Keywords
    const projRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(projectConfig);
    projectId = projRes.body.project._id || projRes.body.project.id;
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test('1. test_anchor_classification_naked_url: raw URL or domain structure correctly classifies as naked_url', () => {
    expect(categorizeAnchorText('https://apexseo.com/features', projectConfig)).toBe('naked_url');
    expect(categorizeAnchorText('www.apexseo.com', projectConfig)).toBe('naked_url');
  });

  test('2. test_anchor_classification_generic: generic phrases correctly classify as generic', () => {
    expect(categorizeAnchorText('Click Here', projectConfig)).toBe('generic');
    expect(categorizeAnchorText('learn more', projectConfig)).toBe('generic');
  });

  test('3. test_anchor_classification_branded: brand or business name correctly classifies as branded', () => {
    expect(categorizeAnchorText('Apex SEO Agency official site', projectConfig)).toBe('branded');
    expect(categorizeAnchorText('visit apexseo', projectConfig)).toBe('branded');
  });

  test('4. test_anchor_classification_exact_match: matching real targetKeywords correctly classifies as exact_match', () => {
    expect(categorizeAnchorText('Try the best ai tools today', projectConfig)).toBe('exact_match');
    expect(categorizeAnchorText('top rated seo audit software', projectConfig)).toBe('exact_match');
  });

  test('5. test_anchor_classification_other: non-matching anchors classify strictly as other (not exact_match or generic)', () => {
    expect(categorizeAnchorText('unrelated contextual text snippet', projectConfig)).toBe('other');
    expect(categorizeAnchorText('unrelated contextual text snippet', projectConfig)).not.toBe('exact_match');
    expect(categorizeAnchorText('unrelated contextual text snippet', projectConfig)).not.toBe('generic');
  });

  test('6. test_missing_target_keywords_notice: empty targetKeywords surfaces notice banner and sets exact_match to 0', () => {
    const configNoKeywords = {
      businessName: 'Apex SEO Agency',
      projectUrl: 'https://apexseo.com',
      targetKeywords: []
    };

    const sampleBacklinks = [
      { anchorText: 'https://apexseo.com' },
      { anchorText: 'click here' },
      { anchorText: 'unrelated contextual text snippet' }
    ];

    const report = analyzeAnchorDistribution(sampleBacklinks, configNoKeywords);
    expect(report.hasTargetKeywords).toBe(false);
    expect(report.notice).toContain('Configure target keywords');
    expect(report.counts.exact_match).toBe(0);
    expect(report.counts.other).toBe(1);
  });

  test('7. test_over_optimization_threshold_alert: exact match ratio > 20% triggers over-optimization warning', async () => {
    // Submit 5 backlinks: 2 exact match (40%), 1 branded, 1 generic, 1 naked url
    await request(app).post('/api/backlinks').set('Authorization', `Bearer ${adminToken}`).send({ projectId, url: 'https://site1.com/a', anchorText: 'best ai tools' });
    await request(app).post('/api/backlinks').set('Authorization', `Bearer ${adminToken}`).send({ projectId, url: 'https://site2.com/b', anchorText: 'seo audit software' });
    await request(app).post('/api/backlinks').set('Authorization', `Bearer ${adminToken}`).send({ projectId, url: 'https://site3.com/c', anchorText: 'Apex SEO Agency' });
    await request(app).post('/api/backlinks').set('Authorization', `Bearer ${adminToken}`).send({ projectId, url: 'https://site4.com/d', anchorText: 'click here' });
    await request(app).post('/api/backlinks').set('Authorization', `Bearer ${adminToken}`).send({ projectId, url: 'https://site5.com/e', anchorText: 'https://apexseo.com' });

    const res = await request(app)
      .get(`/api/reports/anchor-distribution?projectId=${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.report.hasTargetKeywords).toBe(true);
    expect(res.body.report.percentages.exact_match).toBeGreaterThan(20.0);
    expect(res.body.report.isOverOptimized).toBe(true);
  });

  test('8. test_velocity_spike_alert: weekly link volume > 2x max target pace triggers spike alert', async () => {
    const backlinks = [];
    const now = new Date();

    // Normal week 1: 5 links
    for (let i = 0; i < 5; i++) {
      backlinks.push({ createdAt: new Date(now.getTime() - 2 * 7 * 86400000) });
    }

    // Current week spike: 35 links (> 2 * 15 max pace = 30)
    for (let i = 0; i < 35; i++) {
      backlinks.push({ createdAt: new Date(now.getTime() - 1000) });
    }

    const report = analyzeLinkVelocity(backlinks, { minPace: 5, maxPace: 15 });
    expect(report.currentWeekVelocity).toBe(35);
    expect(report.hasSpikeAlert).toBe(true);
  });
});
