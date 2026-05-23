// ============================================
// Helpers — shared utility functions
// ============================================

/**
 * Parse "<count>, <niche>, <area>" from a message.
 * Returns { count, niche, area } or null if the pattern doesn't match.
 */
function parseQuery(text) {
  if (!text || typeof text !== 'string') return null;

  const cleaned = text.trim();
  // Match: "50, dentists, delhi" or "100, yoga studios, new york"
  // It allows optional spaces around commas, and an optional trailing period
  const match = cleaned.match(/^(\d+)\s*,\s*(.+?)\s*,\s*(.+?)\.?$/i);
  if (!match) return null;

  const count = parseInt(match[1], 10);
  const niche = match[2].trim();
  const area = match[3].trim();

  if (!count || !niche || !area) return null;
  return { count, niche, area };
}

/**
 * Remove duplicate leads by phone number or name+address combo.
 */
function deduplicateLeads(leads) {
  const seen = new Set();
  return leads.filter((lead) => {
    // Primary key: phone number (if exists and is valid)
    if (lead.phone && lead.phone !== 'N/A') {
      const normalizedPhone = lead.phone.replace(/[\s\-\(\)]/g, '');
      if (seen.has(normalizedPhone)) return false;
      seen.add(normalizedPhone);
      return true;
    }
    // Fallback key: name + address
    const key = `${(lead.name || '').toLowerCase()}|${(lead.address || '').toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Clean and validate a single lead object.
 */
function cleanLead(raw) {
  return {
    name: raw.title || raw.name || raw.searchString || 'N/A',
    phone: cleanPhone(raw.phone || raw.phoneUnformatted || ''),
    website: cleanWebsite(raw.website || raw.url || ''),
    email: extractEmail(raw),
    address: raw.address || raw.street || 'N/A',
    rating: raw.totalScore ?? raw.rating ?? 'N/A',
    reviews: raw.reviewsCount ?? raw.reviews ?? 0,
    category: raw.categoryName || raw.category || 'N/A',
    city: raw.city || raw.locality || '',
  };
}

/**
 * Extract email string from raw lead if available.
 */
function extractEmail(raw) {
  if (typeof raw.email === 'string' && raw.email.includes('@')) {
    return raw.email;
  }
  if (Array.isArray(raw.emails) && raw.emails.length > 0) {
    return raw.emails.join(', ');
  }
  return 'N/A';
}

/**
 * Normalize phone number — strip non-digits except leading +
 */
function cleanPhone(phone) {
  if (!phone) return 'N/A';
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.length >= 7 ? cleaned : 'N/A';
}

/**
 * Validate and clean website URL
 */
function cleanWebsite(url) {
  if (!url) return 'N/A';
  // Filter out invalid/placeholder URLs
  const invalid = ['facebook.com', 'instagram.com', 'twitter.com', 'google.com/maps'];
  const lower = url.toLowerCase();
  if (invalid.some((domain) => lower.includes(domain))) return 'N/A';
  // Ensure protocol
  if (!url.startsWith('http')) return `https://${url}`;
  return url;
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry(fn, { retries = 3, baseDelay = 1000, label = 'operation' } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`⚠️ ${label} attempt ${attempt}/${retries} failed, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}

/**
 * Format lead count for Telegram messages
 */
function formatLeadSummary(leads) {
  const withPhone = leads.filter((l) => l.phone !== 'N/A').length;
  const withWeb = leads.filter((l) => l.website !== 'N/A').length;
  return [
    `📊 *Lead Summary*`,
    `━━━━━━━━━━━━━━━━━━`,
    `📋 Total leads: *${leads.length}*`,
    `📞 With phone: *${withPhone}*`,
    `🌐 With website: *${withWeb}*`,
    `⭐ Avg rating: *${avgRating(leads)}*`,
  ].join('\n');
}

function avgRating(leads) {
  const rated = leads.filter((l) => typeof l.rating === 'number' && l.rating > 0);
  if (rated.length === 0) return 'N/A';
  const avg = rated.reduce((sum, l) => sum + l.rating, 0) / rated.length;
  return avg.toFixed(1);
}

module.exports = {
  parseQuery,
  deduplicateLeads,
  cleanLead,
  cleanPhone,
  cleanWebsite,
  sleep,
  withRetry,
  formatLeadSummary,
};
