class MetricsProvider {
  constructor(name = 'abstract') {
    this.name = name;
  }

  /**
   * Get domain authority, page, and spam score metrics
   * @param {string} domain 
   * @returns {Promise<{ domain: string, authority_score: number, page_score: number, spam_score: number, source: string, fetched_at: string, isStale?: boolean, error?: boolean, message?: string }>}
   */
  async getDomainMetrics(domain) {
    throw new Error(`getDomainMetrics() not implemented for provider '${this.name}'`);
  }

  /**
   * Get page-level score metrics
   * @param {string} url 
   * @returns {Promise<{ url: string, domain: string, page_score: number, parent_authority_score: number, source: string, fetched_at: string }>}
   */
  async getPageMetrics(url) {
    throw new Error(`getPageMetrics() not implemented for provider '${this.name}'`);
  }
}

module.exports = MetricsProvider;
