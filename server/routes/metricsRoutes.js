const express = require('express');
const router = express.Router();
const { getMetricsProvider } = require('../providers');
const PaidApiProvider = require('../providers/PaidApiProvider');
const Backlink = require('../models/Backlink');
const { runWeeklyMetricsRefresh } = require('../cron/cronScheduler');
const { authenticateToken, requireRole } = require('../utils/auth');

let currentActiveProviderName = process.env.ACTIVE_METRICS_PROVIDER || 'internal';

// Configurable pricing structures based on actual API provider plans
const PROVIDER_PRICING_MODELS = {
  internal: {
    model: 'Self-Hosted Free Engine',
    minMonthlySubscriptionUsd: 0,
    unitAllowance: 'Unlimited',
    costPerUnitUsd: 0,
    notes: 'No third-party API fees. Runs on self-hosted Common Crawl graph & Mongo.'
  },
  moz: {
    model: 'Monthly Subscription Tier (Moz API v2)',
    minMonthlySubscriptionUsd: 250, // Starter Tier
    unitAllowance: 25000,
    costPerUnitUsd: parseFloat(process.env.MOZ_COST_PER_CALL || '0.010'),
    notes: 'Moz API Starter plan begins at $250/mo for 25,000 rows (~$0.01/row). Overages billed at ~$0.01/row.'
  },
  ahrefs: {
    model: 'Enterprise Plan + API Units (Ahrefs v3)',
    minMonthlySubscriptionUsd: 999, // Enterprise Tier
    unitAllowance: 100000,
    costPerUnitUsd: parseFloat(process.env.AHREFS_COST_PER_CALL || '0.015'),
    notes: 'Ahrefs API v3 requires Enterprise Subscription ($999+/mo) plus API unit allocations.'
  },
  semrush: {
    model: 'Business Plan + API Units (SEMrush API)',
    minMonthlySubscriptionUsd: 499, // Business Tier
    unitAllowance: 1000000,
    costPerUnitUsd: parseFloat(process.env.SEMRUSH_COST_PER_CALL || '0.0005'),
    notes: 'SEMrush API requires Business Subscription ($499/mo) plus API unit packs ($50 per 1M units).'
  }
};

// 1. GET /api/metrics/provider — Get active provider details & budget usage
router.get('/provider', authenticateToken, async (req, res) => {
  const provider = getMetricsProvider(currentActiveProviderName);
  res.json({
    activeProvider: currentActiveProviderName,
    providerName: provider.name,
    paidCallCount: PaidApiProvider.getPaidCallCount(),
    budgetCap: parseInt(process.env.PAID_PROVIDER_BUDGET_CAP || '1000', 10),
    spamScoreOrangeThreshold: parseInt(process.env.SPAM_SCORE_ORANGE_THRESHOLD || '15', 10)
  });
});

// 2. POST /api/metrics/provider — Switch active provider (Admin/Team Leader)
router.post('/provider', authenticateToken, requireRole('admin', 'team_leader'), async (req, res) => {
  const { providerName } = req.body;
  const validProviders = ['internal', 'moz', 'ahrefs', 'semrush'];

  if (!providerName || !validProviders.includes(providerName.toLowerCase())) {
    return res.status(400).json({ error: `Invalid provider. Allowed: [${validProviders.join(', ')}]` });
  }

  currentActiveProviderName = providerName.toLowerCase();
  res.json({
    message: `Active Metrics Provider updated to '${currentActiveProviderName}'`,
    activeProvider: currentActiveProviderName
  });
});

// 3. GET /api/metrics/paid-estimate — Admin cost estimator with subscription tier modeling & disclaimers
router.get('/paid-estimate', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const totalActiveBacklinks = await Backlink.countDocuments({ status: { $ne: 'removed' } });
    const pricing = PROVIDER_PRICING_MODELS[currentActiveProviderName] || PROVIDER_PRICING_MODELS.moz;

    const estimatedVariableCostUsd = parseFloat((totalActiveBacklinks * pricing.costPerUnitUsd).toFixed(2));
    const estimatedTotalMonthlyCostUsd = currentActiveProviderName === 'internal'
      ? 0
      : Math.max(pricing.minMonthlySubscriptionUsd, estimatedVariableCostUsd);

    res.json({
      activeProvider: currentActiveProviderName,
      totalActiveBacklinks,
      expectedCalls: totalActiveBacklinks,
      pricingModel: pricing.model,
      minMonthlySubscriptionUsd: pricing.minMonthlySubscriptionUsd,
      costPerUnitUsd: pricing.costPerUnitUsd,
      estimatedVariableCostUsd,
      estimatedTotalMonthlyCostUsd,
      notes: pricing.notes,
      budgetCap: parseInt(process.env.PAID_PROVIDER_BUDGET_CAP || '1000', 10),
      currentPaidCallCount: PaidApiProvider.getPaidCallCount(),
      disclaimer: "IMPORTANT DISCLAIMER: This is an estimated cost projection based on configured provider plan models and your active backlink dataset. Real billing is governed by your active subscription plan with Moz/Ahrefs/SEMrush. Confirm actual pricing directly with the provider before enabling in production."
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute estimate', details: err.message });
  }
});

// 4. POST /api/metrics/refresh-weekly — Trigger weekly refresh job
router.post('/refresh-weekly', authenticateToken, requireRole('admin', 'team_leader'), async (req, res) => {
  try {
    const result = await runWeeklyMetricsRefresh();
    res.json({ message: 'Weekly metrics refresh completed', result });
  } catch (err) {
    res.status(500).json({ error: 'Refresh job failed', details: err.message });
  }
});

module.exports = router;
