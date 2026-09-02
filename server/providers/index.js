const InternalEngineProvider = require('./InternalEngineProvider');
const PaidApiProvider = require('./PaidApiProvider');

const internalProviderInstance = new InternalEngineProvider();

/**
 * Get active MetricsProvider instance based on provider name
 * @param {string} providerName 'internal' | 'moz' | 'ahrefs' | 'semrush'
 * @returns {MetricsProvider}
 */
function getMetricsProvider(providerName) {
  const activeName = (providerName || process.env.ACTIVE_METRICS_PROVIDER || 'internal').toLowerCase();

  if (activeName === 'internal') {
    return internalProviderInstance;
  }

  if (['moz', 'ahrefs', 'semrush'].includes(activeName)) {
    const paidProvider = new PaidApiProvider(activeName);
    return paidProvider;
  }

  console.warn(`[MetricsProviderFactory] Unknown provider '${activeName}'. Falling back to internal engine.`);
  return internalProviderInstance;
}

/**
 * Validate active provider setup on server startup
 */
function assertActiveMetricsProviderConfigured() {
  const activeName = (process.env.ACTIVE_METRICS_PROVIDER || 'internal').toLowerCase();
  if (['moz', 'ahrefs', 'semrush'].includes(activeName)) {
    const provider = new PaidApiProvider(activeName);
    provider.assertApiKeyPresent();
  }
}

module.exports = {
  getMetricsProvider,
  assertActiveMetricsProviderConfigured,
  InternalEngineProvider,
  PaidApiProvider
};
