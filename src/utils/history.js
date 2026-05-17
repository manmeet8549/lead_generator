// ============================================
// History Manager — track already found leads
// ============================================
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const HISTORY_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(HISTORY_DIR, 'history.json');

/**
 * Initialize history storage directory and file.
 */
function initHistory() {
  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
  }
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify({}), 'utf8');
  }
}

/**
 * Get unique key for a lead to identify uniqueness.
 */
function getLeadKey(lead) {
  if (lead.phone && lead.phone !== 'N/A') {
    return lead.phone.replace(/[^\d+]/g, '');
  }
  return `${(lead.name || '').toLowerCase()}|${(lead.address || '').toLowerCase()}`;
}

/**
 * Get lead count history for a search query.
 */
function getQueryHistoryCount(niche, area) {
  initHistory();
  try {
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    const queryKey = `${niche.trim().toLowerCase()}_${area.trim().toLowerCase()}`;
    return data[queryKey] ? data[queryKey].length : 0;
  } catch (err) {
    logger.error('Failed to read history file:', err);
    return 0;
  }
}

/**
 * Filter out leads that have already been scraped in previous searches for this query.
 *
 * @param {string} niche
 * @param {string} area
 * @param {Array} leads - array of cleaned lead objects
 * @returns {Array} - only the new leads
 */
function filterNewLeads(niche, area, leads) {
  initHistory();
  try {
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    const queryKey = `${niche.trim().toLowerCase()}_${area.trim().toLowerCase()}`;
    const historyList = data[queryKey] || [];
    const historySet = new Set(historyList);

    return leads.filter((lead) => {
      const key = getLeadKey(lead);
      return !historySet.has(key);
    });
  } catch (err) {
    logger.error('Error filtering leads against history:', err);
    return leads; // fallback to returning all if read fails
  }
}

/**
 * Save newly scraped leads to history so they won't be returned next time.
 *
 * @param {string} niche
 * @param {string} area
 * @param {Array} newLeads - array of cleaned lead objects
 */
function saveNewLeadsToHistory(niche, area, newLeads) {
  initHistory();
  try {
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    const queryKey = `${niche.trim().toLowerCase()}_${area.trim().toLowerCase()}`;
    if (!data[queryKey]) {
      data[queryKey] = [];
    }

    newLeads.forEach((lead) => {
      const key = getLeadKey(lead);
      if (!data[queryKey].includes(key)) {
        data[queryKey].push(key);
      }
    });

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), 'utf8');
    logger.info(`💾 Saved ${newLeads.length} new leads to history for "${niche} in ${area}" (Total tracked: ${data[queryKey].length})`);
  } catch (err) {
    logger.error('Failed to save leads to history file:', err);
  }
}

module.exports = {
  getQueryHistoryCount,
  filterNewLeads,
  saveNewLeadsToHistory,
};
