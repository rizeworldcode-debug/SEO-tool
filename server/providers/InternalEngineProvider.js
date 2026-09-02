const MetricsProvider = require('./MetricsProvider');
const { getDomain } = require('tldts');
const mongoose = require('mongoose');

class InternalEngineProvider extends MetricsProvider {
  constructor() {
    super('internal');
  }

  async getDomainMetrics(rawDomain) {
    const domain = (getDomain(rawDomain) || rawDomain).toLowerCase();
    
    let doc = null;
    if (mongoose.connection.readyState === 1) {
      try {
        const DomainScore = require('../models/DomainScore');
        doc = await DomainScore.findOne({ domain });
      } catch (err) {
        doc = null;
      }
    }

    const authorityScore = doc ? doc.authorityScore : 12.6;
    const pageScore = doc ? doc.pageScore : 12.6;
    const spamScore = doc ? doc.spamScore : 0.7;

    return {
      domain,
      authority_score: authorityScore,
      page_score: pageScore,
      spam_score: spamScore,
      source: 'internal',
      fetched_at: new Date().toISOString()
    };
  }

  async getPageMetrics(targetUrl) {
    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl.includes('://') ? targetUrl : `https://${targetUrl}`);
    } catch (e) {
      parsedUrl = { hostname: targetUrl, pathname: '/' };
    }

    const domain = (getDomain(parsedUrl.hostname) || parsedUrl.hostname).toLowerCase();
    const domainMetrics = await this.getDomainMetrics(domain);

    const pathSegments = (parsedUrl.pathname || '').split('/').filter(p => p.length > 0);
    const pathDepth = pathSegments.length;
    const pathPenalty = Math.pow(0.90, pathDepth);

    const rawPs = domainMetrics.authority_score * pathPenalty;
    const finalPs = parseFloat(Math.min(100.0, Math.max(0.0, rawPs)).toFixed(1));

    return {
      url: targetUrl,
      domain,
      page_score: finalPs,
      parent_authority_score: domainMetrics.authority_score,
      source: 'internal',
      fetched_at: new Date().toISOString()
    };
  }
}

module.exports = InternalEngineProvider;
