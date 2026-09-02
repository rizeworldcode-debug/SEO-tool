const { getDomain } = require('tldts');

// Configurable list of generic anchor phrases
const DEFAULT_GENERIC_ANCHORS = [
  'click here', 'click', 'here', 'website', 'visit website', 'visit site',
  'source', 'link', 'read more', 'learn more', 'this page', 'view site',
  'check out', 'homepage', 'url', 'article', 'details', 'webpage'
];

/**
 * Classify anchor text according to 5-category ordered precedence chain:
 * 1. naked_url -> raw URL or domain structure
 * 2. generic -> generic dictionary match
 * 3. branded -> brand name / business name match
 * 4. exact_match -> target keywords match
 * 5. other -> distinct category for unclassified / non-matching anchors
 *
 * @param {string} rawAnchor 
 * @param {Object} projectConfig { businessName, projectUrl, targetKeywords: [] }
 * @param {Array<string>} customGenericList 
 * @returns {'naked_url' | 'generic' | 'branded' | 'exact_match' | 'other'}
 */
function categorizeAnchorText(rawAnchor, projectConfig = {}, customGenericList = null) {
  if (!rawAnchor || !rawAnchor.trim()) {
    return 'other';
  }

  const anchor = rawAnchor.trim().toLowerCase();
  const businessName = (projectConfig.businessName || '').trim().toLowerCase();
  const projectUrl = (projectConfig.projectUrl || '').trim().toLowerCase();
  const targetKeywords = (projectConfig.targetKeywords || []).map(k => String(k).trim().toLowerCase()).filter(Boolean);
  const genericList = customGenericList || DEFAULT_GENERIC_ANCHORS;

  // Step 1: naked_url Precedence Check
  const urlPattern = /^(https?:\/\/|www\.)|[a-z0-9-]+\.(com|org|net|io|co|edu|gov|biz|info)(\/[^\s]*)?$/i;
  if (urlPattern.test(anchor) || anchor.includes('://') || anchor.startsWith('www.')) {
    return 'naked_url';
  }

  // Step 2: generic Precedence Check
  if (genericList.some(g => {
    const cleanG = g.trim().toLowerCase();
    if (anchor === cleanG) return true;
    try {
      const regex = new RegExp(`\\b${cleanG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(anchor);
    } catch (e) {
      return anchor.includes(cleanG);
    }
  })) {
    return 'generic';
  }

  // Step 3: branded Precedence Check
  const cleanBrandDomain = (getDomain(projectUrl) || projectUrl).replace(/\.[^/.]+$/, '').toLowerCase();
  if (
    (businessName && (anchor.includes(businessName) || businessName.includes(anchor))) ||
    (cleanBrandDomain && cleanBrandDomain.length > 2 && anchor.includes(cleanBrandDomain))
  ) {
    return 'branded';
  }

  // Step 4: exact_match Precedence Check
  if (targetKeywords.length > 0) {
    const isExactMatch = targetKeywords.some(kw => anchor.includes(kw) || kw.includes(anchor));
    if (isExactMatch) {
      return 'exact_match';
    }
  }

  // Step 5: other Precedence Check (Distinct 5th category — NOT merged into exact_match or generic)
  return 'other';
}

/**
 * Generate Anchor Text Distribution Analysis Report for a collection of backlinks
 * @param {Array<Object>} backlinks 
 * @param {Object} projectConfig { businessName, projectUrl, targetKeywords }
 * @returns {Object} Report details including breakdown percentages and over-optimization alert
 */
function analyzeAnchorDistribution(backlinks = [], projectConfig = {}) {
  const targetKeywords = projectConfig.targetKeywords || [];
  const hasTargetKeywords = Array.isArray(targetKeywords) && targetKeywords.length > 0;

  const counts = {
    naked_url: 0,
    generic: 0,
    branded: 0,
    exact_match: 0,
    other: 0
  };

  backlinks.forEach(bl => {
    const category = categorizeAnchorText(bl.anchorText, projectConfig);
    counts[category] = (counts[category] || 0) + 1;
  });

  const total = backlinks.length;
  const percentages = {
    naked_url: total > 0 ? parseFloat(((counts.naked_url / total) * 100).toFixed(1)) : 0,
    generic: total > 0 ? parseFloat(((counts.generic / total) * 100).toFixed(1)) : 0,
    branded: total > 0 ? parseFloat(((counts.branded / total) * 100).toFixed(1)) : 0,
    exact_match: total > 0 ? parseFloat(((counts.exact_match / total) * 100).toFixed(1)) : 0,
    other: total > 0 ? parseFloat(((counts.other / total) * 100).toFixed(1)) : 0
  };

  const threshold = parseFloat(process.env.ANCHOR_OVER_OPTIMIZATION_THRESHOLD || '20.0');
  const isOverOptimized = percentages.exact_match > threshold;

  return {
    totalBacklinks: total,
    hasTargetKeywords,
    notice: hasTargetKeywords
      ? null
      : 'Configure target keywords for this project in Project Profile to enable exact-match tracking.',
    threshold,
    isOverOptimized,
    counts,
    percentages
  };
}

module.exports = {
  categorizeAnchorText,
  analyzeAnchorDistribution,
  DEFAULT_GENERIC_ANCHORS
};
