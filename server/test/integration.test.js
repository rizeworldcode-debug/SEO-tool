const { describe, it } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const config = require('../config');

const API_BASE = config.BACKEND_API_URL || 'http://localhost:5005';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

describe('Full-Stack Integration Test (Parquet -> JSON -> Express API -> Response Shape)', () => {
  const JSON_DATA_PATH = path.join(__dirname, '../../pipeline/data/domain_scores_mongo.json');

  it('should verify domain_scores_mongo.json exists and contains correct scored domains', () => {
    assert.strictEqual(fs.existsSync(JSON_DATA_PATH), true, 'domain_scores_mongo.json must exist');
    const raw = fs.readFileSync(JSON_DATA_PATH, 'utf-8');
    const list = JSON.parse(raw);
    assert.ok(list.length >= 90, 'Synced data must contain at least 90 domains');
    
    const domainMap = new Map(list.map(d => [d.domain, d]));
    
    // 1. site-domain-33.com should have SS = 0.7
    const dom33 = domainMap.get('site-domain-33.com');
    assert.ok(dom33, 'site-domain-33.com must exist');
    assert.strictEqual(dom33.spamScore, 0.7, 'site-domain-33.com spamScore must be 0.7');
    assert.strictEqual(dom33.subSignals.ageSpamRiskPts, 3.8, 'site-domain-33.com ageSpamRiskPts must be 3.8');

    // 2. google.com should have SS = 0
    const google = domainMap.get('google.com');
    assert.ok(google, 'google.com must exist');
    assert.strictEqual(google.spamScore, 0, 'google.com spamScore must be 0');

    // 3. spam-test-domain.xyz should have SS = 100
    const spamDom = domainMap.get('spam-test-domain.xyz');
    assert.ok(spamDom, 'spam-test-domain.xyz must exist');
    assert.strictEqual(spamDom.spamScore, 100, 'spam-test-domain.xyz spamScore must be 100');
    assert.strictEqual(spamDom.subSignals.blocklistHit, true, 'spam-test-domain.xyz blocklistHit must be true');
  });

  it('should query Express API endpoint GET /api/domain/site-domain-33.com and receive SS = 0.7', async () => {
    const json = await fetchJson(`${API_BASE}/api/domain/site-domain-33.com`);
    assert.strictEqual(json.domain, 'site-domain-33.com');
    assert.strictEqual(json.spamScore, 0.7);
    assert.strictEqual(json.subSignals.ageSpamRiskPts, 3.8);
  });

  it('should query Express API endpoint GET /api/domain/spam-test-domain.xyz and receive SS = 100', async () => {
    const json = await fetchJson(`${API_BASE}/api/domain/spam-test-domain.xyz`);
    assert.strictEqual(json.domain, 'spam-test-domain.xyz');
    assert.strictEqual(json.spamScore, 100);
    assert.strictEqual(json.subSignals.blocklistHit, true);
  });

  it('should query Express API endpoint GET /api/domain/google.com and receive SS = 0', async () => {
    const json = await fetchJson(`${API_BASE}/api/domain/google.com`);
    assert.strictEqual(json.domain, 'google.com');
    assert.strictEqual(json.spamScore, 0);
  });
});
