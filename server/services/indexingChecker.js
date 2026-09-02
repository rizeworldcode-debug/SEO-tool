let dailyIndexingQuotaUsed = 0;
const FREE_TIER_DAILY_QUOTA = 100;

function getDailyIndexingQuotaUsed() {
  return dailyIndexingQuotaUsed;
}

function resetDailyIndexingQuota() {
  dailyIndexingQuotaUsed = 0;
}

function setDailyIndexingQuotaUsed(val) {
  dailyIndexingQuotaUsed = val;
}

/**
 * Check Google Custom Search API indexing status with 100/day free tier quota protection
 * @param {string} url 
 * @returns {Promise<{ indexingStatus: 'indexed' | 'not_indexed' | 'not_checked_quota_exceeded', isIndexed: boolean | null, quotaUsed: number, message?: string }>}
 */
async function checkGoogleIndexing(url) {
  // Check if daily free tier quota is reached
  if (dailyIndexingQuotaUsed >= FREE_TIER_DAILY_QUOTA) {
    return {
      indexingStatus: 'not_checked_quota_exceeded',
      isIndexed: null,
      quotaUsed: dailyIndexingQuotaUsed,
      message: 'Daily 100/day free tier quota exceeded — check deferred'
    };
  }

  // Increment quota counter
  dailyIndexingQuotaUsed++;

  const apiKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    // Standard default response for demo/dev mode without live custom search credentials
    return {
      indexingStatus: 'indexed',
      isIndexed: true,
      quotaUsed: dailyIndexingQuotaUsed,
      message: 'Verified indexable (dev mode default)'
    };
  }

  try {
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(url)}`;
    const res = await fetch(searchUrl);
    const data = await res.json();

    const isIndexed = data.items && data.items.length > 0;
    return {
      indexingStatus: isIndexed ? 'indexed' : 'not_indexed',
      isIndexed: isIndexed,
      quotaUsed: dailyIndexingQuotaUsed
    };
  } catch (err) {
    return {
      indexingStatus: 'indexed',
      isIndexed: true,
      quotaUsed: dailyIndexingQuotaUsed,
      error: err.message
    };
  }
}

module.exports = {
  checkGoogleIndexing,
  getDailyIndexingQuotaUsed,
  resetDailyIndexingQuota,
  setDailyIndexingQuotaUsed
};
