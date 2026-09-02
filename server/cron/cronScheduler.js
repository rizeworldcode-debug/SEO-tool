const Backlink = require('../models/Backlink');
const { getMetricsProvider } = require('../providers');
const { checkBacklinkStatus } = require('../services/statusChecker');
const { checkGoogleSafeBrowsing } = require('../services/safeBrowsingService');

/**
 * Execute Weekly Metrics Refresh across all submitted backlinks using active provider
 */
async function runWeeklyMetricsRefresh() {
  console.log('[Cron] Starting Weekly Metrics Refresh Job...');
  try {
    const activeProvider = getMetricsProvider();
    const backlinks = await Backlink.find({ status: { $ne: 'removed' } });

    let updatedCount = 0;
    for (const bl of backlinks) {
      const metrics = await activeProvider.getDomainMetrics(bl.rootDomain);
      if (metrics && !metrics.error) {
        bl.lastDa = metrics.authority_score;
        bl.lastPa = metrics.page_score;
        bl.lastSs = metrics.spam_score;
        bl.lastRefreshedAt = new Date();
        await bl.save();
        updatedCount++;
      }
    }
    console.log(`[Cron] Weekly Metrics Refresh Completed: Updated ${updatedCount} backlink records via provider '${activeProvider.name}'.`);
    return { updatedCount, provider: activeProvider.name };
  } catch (err) {
    console.error('[Cron] Weekly Metrics Refresh Job Failed:', err.message);
    throw err;
  }
}

/**
 * Execute Daily HTTP Live/Broken Status & Safe Browsing Check
 */
async function runDailyStatusCheck() {
  console.log('[Cron] Starting Daily Status & Malware Check Job...');
  try {
    const backlinks = await Backlink.find({ status: { $ne: 'removed' } });

    let checkedCount = 0;
    for (const bl of backlinks) {
      const statusRes = await checkBacklinkStatus(bl.url);
      const safeRes = await checkGoogleSafeBrowsing(bl.rootDomain);

      bl.status = statusRes.status;
      if (!safeRes.isSafe) {
        bl.lastSs = Math.max(bl.lastSs, 65.0); // Flag high toxicity on malware hit
      }
      await bl.save();
      checkedCount++;
    }
    console.log(`[Cron] Daily Status & Malware Check Completed: Processed ${checkedCount} backlinks.`);
    return { checkedCount };
  } catch (err) {
    console.error('[Cron] Daily Status Check Job Failed:', err.message);
    throw err;
  }
}

module.exports = {
  runWeeklyMetricsRefresh,
  runDailyStatusCheck
};
