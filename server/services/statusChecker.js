const http = require('http');
const https = require('https');

/**
 * Perform HTTP GET check on backlink URL
 * Rules:
 * - HTTP 200–399: status = 'live' (Approved / Green)
 * - HTTP 404 / 410: status = 'removed' (Removed / Red)
 * - HTTP 429, 5xx, timeouts, or network errors: status = 'broken' (Broken / Orange)
 * 
 * @param {string} targetUrl 
 * @returns {Promise<{ status: 'live' | 'broken' | 'removed', httpCode: number, responseTimeMs: number, checkedAt: string, reason?: string }>}
 */
async function checkBacklinkStatus(targetUrl) {
  const startTime = Date.now();

  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(targetUrl.includes('://') ? targetUrl : `https://${targetUrl}`);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const req = client.get(parsedUrl, {
        timeout: 7000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }, (res) => {
        const responseTimeMs = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Rule 1: HTTP 404 or 410 -> Removed (Red)
        if (statusCode === 404 || statusCode === 410) {
          return resolve({
            status: 'removed',
            httpCode: statusCode,
            responseTimeMs,
            checkedAt: new Date().toISOString(),
            reason: `HTTP ${statusCode} Not Found`
          });
        }

        // Rule 2: HTTP 429 or Server Errors (5xx) -> Broken (Orange)
        if (statusCode === 429 || statusCode >= 500) {
          return resolve({
            status: 'broken',
            httpCode: statusCode,
            responseTimeMs,
            checkedAt: new Date().toISOString(),
            reason: statusCode === 429 ? 'HTTP 429 Too Many Requests (Rate Limited)' : `HTTP ${statusCode} Server Error`
          });
        }

        // Rule 3: HTTP 200–399 -> Live / Approved (Green)
        if (statusCode >= 200 && statusCode < 400) {
          return resolve({
            status: 'live',
            httpCode: statusCode,
            responseTimeMs,
            checkedAt: new Date().toISOString()
          });
        }

        // Rule 4: Other non-200 status codes -> Broken (Orange)
        resolve({
          status: 'broken',
          httpCode: statusCode,
          responseTimeMs,
          checkedAt: new Date().toISOString(),
          reason: `HTTP ${statusCode}`
        });
      });

      req.on('error', (err) => {
        resolve({
          status: 'broken',
          httpCode: 0,
          responseTimeMs: Date.now() - startTime,
          checkedAt: new Date().toISOString(),
          error: err.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          status: 'broken',
          httpCode: 408,
          responseTimeMs: Date.now() - startTime,
          checkedAt: new Date().toISOString(),
          error: 'Connection Timeout'
        });
      });
    } catch (e) {
      resolve({
        status: 'broken',
        httpCode: 0,
        responseTimeMs: Date.now() - startTime,
        checkedAt: new Date().toISOString(),
        error: e.message
      });
    }
  });
}

module.exports = {
  checkBacklinkStatus
};

