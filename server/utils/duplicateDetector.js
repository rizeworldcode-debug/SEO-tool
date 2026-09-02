const { getDomain } = require('tldts');
const Backlink = require('../models/Backlink');

/**
 * Shared Root Domain Duplicate Detection Utility
 * Enforces Phase 1 decision:
 * - Collapses subdomains to rootDomain via tldts
 * - Ignores links with status 'removed' (allows fresh replacement resubmission)
 * - Counts links with status 'live' or 'broken' (keeps duplicate flag active)
 *
 * @param {string|ObjectId} projectId 
 * @param {string} urlOrDomain 
 * @returns {Promise<{ rootDomain: string, duplicateFlag: boolean, originalBacklinkId: string|null, existingActiveBacklink: Object|null }>}
 */
async function checkRootDomainDuplicate(projectId, urlOrDomain) {
  let parsedDomain;
  try {
    const u = new URL(urlOrDomain.includes('://') ? urlOrDomain : `https://${urlOrDomain}`);
    parsedDomain = getDomain(u.hostname) || u.hostname;
  } catch (e) {
    parsedDomain = getDomain(urlOrDomain) || urlOrDomain;
  }
  const cleanRootDomain = (parsedDomain || urlOrDomain).toLowerCase();

  const existingActive = await Backlink.findOne({
    projectId,
    rootDomain: cleanRootDomain,
    status: { $ne: 'removed' }
  }).sort({ createdAt: 1 });

  return {
    rootDomain: cleanRootDomain,
    duplicateFlag: !!existingActive,
    originalBacklinkId: existingActive ? existingActive._id : null,
    existingActiveBacklink: existingActive
  };
}

module.exports = {
  checkRootDomainDuplicate
};
