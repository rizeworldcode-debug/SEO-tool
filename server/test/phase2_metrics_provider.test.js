require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(30000);

let mongoServer;
let app;

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '4d9eb34681886a42433611db286819300dc6d1dcdab782f9b69134fce97f7b2c';
process.env.JWT_SECRET = process.env.JWT_SECRET || '986b775c65dfc5a5afeda4acf398ef76cd00013df7a9b836e44ad36085a4eda4';

const { InternalEngineProvider, PaidApiProvider, getMetricsProvider, assertActiveMetricsProviderConfigured } = require('../providers');
const { checkBacklinkStatus } = require('../services/statusChecker');
const { checkGoogleIndexing, setDailyIndexingQuotaUsed, resetDailyIndexingQuota } = require('../services/indexingChecker');

describe('Phase 2 — Metrics Provider Abstraction, Quota Safeguards & Services Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGO_URI = mongoUri;

    await mongoose.connect(mongoUri);
    app = require('../index');
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test('1. Startup API Key Assertion: fails when ACTIVE_METRICS_PROVIDER=moz but MOZ_API_KEY missing', () => {
    const originalProvider = process.env.ACTIVE_METRICS_PROVIDER;
    const originalKey = process.env.MOZ_API_KEY;

    process.env.ACTIVE_METRICS_PROVIDER = 'moz';
    delete process.env.MOZ_API_KEY;

    expect(() => assertActiveMetricsProviderConfigured()).toThrow(/FATAL METRICS PROVIDER ERROR/);

    process.env.ACTIVE_METRICS_PROVIDER = originalProvider || 'internal';
    if (originalKey) process.env.MOZ_API_KEY = originalKey;
  });

  test('2. Normalized Payload Shape: Internal and Paid providers return matching normalized shape', async () => {
    const internal = new InternalEngineProvider();
    const internalRes = await internal.getDomainMetrics('wikipedia.org');

    expect(internalRes).toHaveProperty('domain', 'wikipedia.org');
    expect(internalRes).toHaveProperty('authority_score');
    expect(internalRes).toHaveProperty('page_score');
    expect(internalRes).toHaveProperty('spam_score');
    expect(internalRes.source).toBe('internal');

    const paid = new PaidApiProvider('moz', { apiKey: 'mock-moz-key-123' });
    const paidRes = await paid.getDomainMetrics('wikipedia.org');

    expect(paidRes).toHaveProperty('domain', 'wikipedia.org');
    expect(paidRes).toHaveProperty('authority_score', 55.0);
    expect(paidRes.source).toBe('moz');
  });

  test('3. Strict Fallback Formatting: Paid provider fallback explicitly labels source as internal (fallback from moz)', async () => {
    const paidNoKey = new PaidApiProvider('moz', { apiKey: '', allowFallback: true });
    const fallbackRes = await paidNoKey.getDomainMetrics('github.com');

    expect(fallbackRes.source).toBe('internal (fallback from moz)');
    expect(fallbackRes.apiKeyMissing).toBe(true);
  });

  test('4. Paid Provider Budget Cap Safeguard: Stops requests and applies fallback once budget cap reached', async () => {
    PaidApiProvider.resetPaidCallCount();
    const paidCapped = new PaidApiProvider('moz', { apiKey: 'valid-key', budgetCap: 2, allowFallback: true });

    // Call 1 & 2 -> success under budget
    const call1 = await paidCapped.getDomainMetrics('site1.com');
    const call2 = await paidCapped.getDomainMetrics('site2.com');
    expect(call1.source).toBe('moz');
    expect(call2.source).toBe('moz');

    // Call 3 -> Budget cap reached (2/2) -> returns fallback with explicit source label
    const call3 = await paidCapped.getDomainMetrics('site3.com');
    expect(call3.source).toBe('internal (fallback from moz)');
    expect(call3.budgetExceeded).toBe(true);
  });

  test('5. Indexing Quota Deferral: 100/day quota exhaustion defers indexing check with explicit status', async () => {
    resetDailyIndexingQuota();
    setDailyIndexingQuotaUsed(100); // Exhaust 100/day free tier quota

    const indexRes = await checkGoogleIndexing('https://example.com/article');
    expect(indexRes.indexingStatus).toBe('not_checked_quota_exceeded');
    expect(indexRes.isIndexed).toBeNull();
    expect(indexRes.message).toContain('100/day free tier quota exceeded');

    resetDailyIndexingQuota();
  });

  test('6. HTTP Status Checker: resolves status for URLs', async () => {
    const res = await checkBacklinkStatus('https://google.com');
    expect(res).toHaveProperty('status');
    expect(['live', 'broken', 'removed']).toContain(res.status);
    expect(res).toHaveProperty('httpCode');
  });
});
