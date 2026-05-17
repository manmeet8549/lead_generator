// ============================================
// Lead Pipeline — orchestrates the full workflow
// ============================================
const { scrapeGoogleMaps } = require('../apify/scraper');
const { enrichLeadsWithAI } = require('../ai/nvidia');
const { saveToGoogleSheets } = require('../google/sheets');
const { exportToCsv } = require('../utils/csv');
const { cleanLead, deduplicateLeads, formatLeadSummary } = require('../utils/helpers');
const { getQueryHistoryCount, filterNewLeads, saveNewLeadsToHistory } = require('../utils/history');
const logger = require('../utils/logger');

/**
 * Full lead generation pipeline:
 * 1. Scrape Google Maps via Apify
 * 2. Clean and deduplicate
 * 3. Enrich with NVIDIA NIM AI
 * 4. Save to Google Sheets
 * 5. Export CSV
 * 6. Return results
 *
 * @param {string} niche - business type (e.g. "dentists")
 * @param {string} area - location (e.g. "delhi")
 * @param {Function} onProgress - callback for progress updates
 * @returns {Promise<Object>} - { leads, sheetUrl, csvPath, summary }
 */
async function runLeadPipeline(niche, area, onProgress = () => {}) {
  const searchQuery = `${niche} in ${area}`;
  const startTime = Date.now();

  try {
    // ---- Step 1: History Check & Scrape ----
    const historyCount = getQueryHistoryCount(niche, area);
    const targetResultsCount = historyCount + 50;
    
    await onProgress(`🔍 Searching Google Maps (looking for ${targetResultsCount} total places to extract 50 new ones)...`);
    const rawResults = await scrapeGoogleMaps(searchQuery, targetResultsCount);

    if (!rawResults || rawResults.length === 0) {
      return {
        leads: [],
        sheetUrl: null,
        csvPath: null,
        summary: '❌ No results found. Try a different search.',
        error: false,
      };
    }

    // ---- Step 2: Clean, Deduplicate & Filter History ----
    await onProgress(`📋 Filtering out duplicates and previously scraped leads...`);
    let leads = rawResults.map(cleanLead);
    leads = deduplicateLeads(leads);
    
    // Filter out previously scraped leads
    const totalBeforeFilter = leads.length;
    leads = filterNewLeads(niche, area, leads);
    const duplicatesRemoved = totalBeforeFilter - leads.length;
    
    if (duplicatesRemoved > 0) {
      logger.info(`✨ Filtered out ${duplicatesRemoved} previously scraped leads.`);
    }

    // Slice to exactly 50 leads per message
    leads = leads.slice(0, 50);
    logger.info(`Cleaned new leads: ${leads.length} (from ${rawResults.length} raw results)`);

    if (leads.length === 0) {
      return {
        leads: [],
        sheetUrl: null,
        csvPath: null,
        summary: '⚠️ No new leads found! All businesses found in this area have already been scraped in your previous runs.',
        error: false,
      };
    }

    // Save newly scraped leads to history so they won't be returned next time
    saveNewLeadsToHistory(niche, area, leads);

    // ---- Step 3: AI Enrichment ----
    await onProgress('🤖 Analyzing leads with AI...');
    leads = await enrichLeadsWithAI(leads);

    // ---- Step 4: Save to Google Sheets ----
    let sheetUrl = null;
    try {
      await onProgress('📊 Saving to Google Sheets...');
      sheetUrl = await saveToGoogleSheets(leads, searchQuery);
    } catch (err) {
      logger.error('Google Sheets save failed:', err);
      await onProgress('⚠️ Google Sheets save failed — generating CSV instead...');
    }

    // ---- Step 5: CSV Export ----
    let csvPath = null;
    try {
      const filename = `${niche}_${area}_${Date.now()}`;
      csvPath = await exportToCsv(leads, filename);
    } catch (err) {
      logger.error('CSV export failed:', err);
    }

    // ---- Step 6: Summary ----
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const summary = formatLeadSummary(leads);

    logger.info(`Pipeline complete in ${elapsed}s — ${leads.length} leads`);

    return {
      leads,
      sheetUrl,
      csvPath,
      summary,
      elapsed,
      error: false,
    };
  } catch (err) {
    logger.error('Lead pipeline failed:', err);
    return {
      leads: [],
      sheetUrl: null,
      csvPath: null,
      summary: `❌ Error: ${err.message}`,
      error: true,
    };
  }
}

module.exports = { runLeadPipeline };
