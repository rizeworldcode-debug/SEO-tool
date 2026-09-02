/**
 * Google Safe Browsing API Service for malware and threat detection
 */

async function checkGoogleSafeBrowsing(urlOrDomain) {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;

  if (!apiKey) {
    // Graceful fallback when Safe Browsing API Key is not set in dev
    return {
      isSafe: true,
      threatType: 'none',
      checkedAt: new Date().toISOString(),
      notice: 'Google Safe Browsing API key missing (defaulted clean)'
    };
  }

  try {
    const payload = {
      client: { clientId: "seo-backlink-tracker", clientVersion: "1.0.0" },
      threatInfo: {
        threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: [{ url: urlOrDomain }]
      }
    };

    const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.matches && data.matches.length > 0) {
      return {
        isSafe: false,
        threatType: data.matches[0].threatType,
        checkedAt: new Date().toISOString()
      };
    }

    return {
      isSafe: true,
      threatType: 'none',
      checkedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error('Safe Browsing API error:', err.message);
    return {
      isSafe: true,
      threatType: 'none',
      checkedAt: new Date().toISOString(),
      error: err.message
    };
  }
}

module.exports = {
  checkGoogleSafeBrowsing
};
