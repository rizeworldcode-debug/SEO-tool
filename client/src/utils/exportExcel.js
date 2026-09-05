import * as XLSX from 'xlsx';

/**
 * Extracts the clean main domain URL from any URL string.
 * Example: "https://sub.blog.hashnode.com/devendra/post-1" => "https://hashnode.com"
 */
export function extractMainDomainUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    let clean = rawUrl.trim().toLowerCase();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    const parsed = new URL(clean);
    let hostname = parsed.hostname.replace(/^www\./, '');
    const parts = hostname.split('.');
    let rootDomain = hostname;
    if (parts.length > 2) {
      const lastTwo = parts.slice(-2).join('.');
      if (['co.uk', 'com.au', 'co.in', 'org.uk', 'gov.in'].includes(lastTwo)) {
        rootDomain = parts.slice(-3).join('.');
      } else {
        rootDomain = parts.slice(-2).join('.');
      }
    }
    return `https://${rootDomain}`;
  } catch (e) {
    return rawUrl.trim().toLowerCase();
  }
}

/**
 * Processes backlinks array, removes duplicate main domains,
 * extracts main domain URLs, and downloads an Excel file.
 */
export function exportFinalBacklinksExcel(backlinks, fileName = 'Final_Unique_Main_Domains_Backlinks.xlsx') {
  if (!Array.isArray(backlinks) || backlinks.length === 0) {
    alert('No backlinks available to export.');
    return;
  }

  const seenDomains = new Set();
  const exportRows = [];

  backlinks.forEach((item) => {
    let rootDomain = (item.rootDomain || '').toLowerCase().trim();
    const originalUrl = item.url || '';
    
    let mainDomainUrl = '';
    if (rootDomain) {
      mainDomainUrl = `https://${rootDomain}`;
    } else {
      mainDomainUrl = extractMainDomainUrl(originalUrl);
      try {
        rootDomain = new URL(mainDomainUrl).hostname;
      } catch (e) {
        rootDomain = mainDomainUrl;
      }
    }

    const domainKey = rootDomain.toLowerCase();

    // Remove duplicate domains
    if (domainKey && !seenDomains.has(domainKey)) {
      seenDomains.add(domainKey);

      const submissionDate = item.submissionDate || item.createdAt
        ? new Date(item.submissionDate || item.createdAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })
        : 'N/A';

      const responsiblePerson = item.responsiblePersonName || (item.submittedBy?.username ? item.submittedBy.username.toUpperCase() : 'N/A');

      exportRows.push({
        'S.No': exportRows.length + 1,
        'Main Domain URL': mainDomainUrl,
        'Root Domain': rootDomain,
        'DA': item.daSnapshot || 0,
        'PA': item.paSnapshot || 0,
        'Link Type': item.linkType || 'Profile',
        'Follow Type': item.followType || 'Do-Follow',
        'Status': item.status || 'Approved',
        'Original Backlink URL': originalUrl,
        'Responsible Person': responsiblePerson,
        'Submission Date': submissionDate,
        'Target Project': item.projectId?.businessName || 'N/A'
      });
    }
  });

  if (exportRows.length === 0) {
    alert('No valid unique domains found for export.');
    return;
  }

  // Generate Excel workbook
  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  // Set auto column widths for neat display
  const colWidths = [
    { wch: 6 },  // S.No
    { wch: 32 }, // Main Domain URL
    { wch: 25 }, // Root Domain
    { wch: 8 },  // DA
    { wch: 8 },  // PA
    { wch: 15 }, // Link Type
    { wch: 14 }, // Follow Type
    { wch: 12 }, // Status
    { wch: 45 }, // Original Backlink URL
    { wch: 20 }, // Responsible Person
    { wch: 16 }, // Submission Date
    { wch: 25 }  // Target Project
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Unique Main Domains');

  // Trigger Excel file download
  XLSX.writeFile(workbook, fileName);
}
