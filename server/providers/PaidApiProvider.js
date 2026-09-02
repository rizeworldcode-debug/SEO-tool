const MetricsProvider = require('./MetricsProvider');
const InternalEngineProvider = require('./InternalEngineProvider');
const { getDomain } = require('tldts');

// In-memory counter for budget safeguard (resets monthly or via method)
let globalPaidCallCount = 0;

class PaidApiProvider extends MetricsProvider {
  /**
   * @param {string} providerName 'moz' | 'ahrefs' | 'semrush'
   * @param {Object} options
   */
  constructor(providerName = 'moz', options = {}) {
    super(providerName);
    this.providerName = providerName.toLowerCase();
    this.apiKey = options.apiKey || process.env[`${this.providerName.toUpperCase()}_API_KEY`] || '';
    this.budgetCap = options.budgetCap !== undefined ? options.budgetCap : parseInt(process.env.PAID_PROVIDER_BUDGET_CAP || '1000', 10);
    this.allowFallback = options.allowFallback !== undefined ? options.allowFallback : (process.env.ALLOW_INTERNAL_METRICS_FALLBACK === 'true' || true);
    this.internalFallback = new InternalEngineProvider();
  }

  // Method to check startup key validity
  assertApiKeyPresent() {
    if (!this.apiKey) {
      throw new Error(
        `FATAL METRICS PROVIDER ERROR: Active provider is set to '${this.providerName}', but required environment variable '${this.providerName.toUpperCase()}_API_KEY' is missing!`
      );
    }
  }

  static getPaidCallCount() {
    return globalPaidCallCount;
  }

  static resetPaidCallCount() {
    globalPaidCallCount = 0;
  }

  async getDomainMetrics(rawDomain) {
    const domain = (getDomain(rawDomain) || rawDomain).toLowerCase();

    // 1. Budget Cap Safeguard Check
    if (globalPaidCallCount >= this.budgetCap) {
      console.warn(`[PaidApiProvider] Budget cap reached (${globalPaidCallCount}/${this.budgetCap}) for ${this.providerName}.`);
      if (this.allowFallback) {
        const fallback = await this.internalFallback.getDomainMetrics(domain);
        return {
          ...fallback,
          source: `internal (fallback from ${this.providerName})`,
          isStale: true,
          budgetExceeded: true
        };
      }
      return {
        domain,
        authority_score: 0,
        page_score: 0,
        spam_score: 0,
        source: `${this.providerName} (budget_exceeded)`,
        error: true,
        message: `Paid API request budget cap reached (${globalPaidCallCount}/${this.budgetCap})`,
        fetched_at: new Date().toISOString()
      };
    }

    // 2. API Key Check
    if (!this.apiKey) {
      if (this.allowFallback) {
        const fallback = await this.internalFallback.getDomainMetrics(domain);
        return {
          ...fallback,
          source: `internal (fallback from ${this.providerName})`,
          apiKeyMissing: true
        };
      }
      return {
        domain,
        authority_score: 0,
        page_score: 0,
        spam_score: 0,
        source: `${this.providerName} (error)`,
        error: true,
        message: `Missing API key for ${this.providerName}`,
        fetched_at: new Date().toISOString()
      };
    }

    // Increment budget counter
    globalPaidCallCount++;

    // Simulated / Paid API call payload
    return {
      domain,
      authority_score: 55.0,
      page_score: 48.0,
      spam_score: 1.2,
      source: this.providerName,
      fetched_at: new Date().toISOString()
    };
  }

  async getPageMetrics(targetUrl) {
    const domainMetrics = await this.getDomainMetrics(targetUrl);
    return {
      url: targetUrl,
      domain: domainMetrics.domain,
      page_score: domainMetrics.page_score,
      parent_authority_score: domainMetrics.authority_score,
      source: domainMetrics.source,
      fetched_at: new Date().toISOString()
    };
  }
}

module.exports = PaidApiProvider;
