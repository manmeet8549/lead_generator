// ============================================
// Apify Google Maps Scraper — integration
// ============================================
const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { sleep, withRetry } = require('../utils/helpers');

const APIFY_BASE = 'https://api.apify.com/v2';

/**
 * Run the Google Maps Scraper actor on Apify and return raw results.
 *
 * @param {string} searchQuery - e.g. "dentists in delhi"
 * @returns {Promise<Array>} - raw place data from Google Maps
 */
async function scrapeGoogleMaps(searchQuery, maxResults) {
  logger.info(`🔍 Starting Apify scrape: "${searchQuery}" (Target: ${maxResults || config.apify.maxResults} places)`);

  // 1. Start the actor run
  const runId = await startActorRun(searchQuery, maxResults);
  logger.info(`▶️  Actor run started: ${runId}`);

  // 2. Poll until completion
  const run = await waitForCompletion(runId);
  logger.info(`✅ Actor run completed — status: ${run.status}`);

  if (run.status !== 'SUCCEEDED') {
    throw new Error(`Apify actor run failed with status: ${run.status}`);
  }

  // 3. Fetch dataset results
  const results = await fetchDatasetResults(run.defaultDatasetId);
  logger.info(`📦 Fetched ${results.length} raw results from Apify`);

  return results;
}

/**
 * Start the Apify Google Maps Scraper actor.
 */
async function startActorRun(searchQuery, maxResults) {
  const url = `${APIFY_BASE}/acts/${config.apify.actorId}/runs`;

  const input = {
    searchStringsArray: [searchQuery],
    maxCrawledPlacesPerSearch: maxResults || config.apify.maxResults,
    language: 'en',
    deeperCityScrape: true,
    oneReviewPerRow: false,
    scrapeReviewerName: false,
    scrapeReviewerId: false,
    scrapeReviewerUrl: false,
    scrapeReviewId: false,
    scrapeReviewUrl: false,
    scrapeResponseFromOwnerText: false,
  };

  const response = await withRetry(
    () =>
      axios.post(url, input, {
        params: { token: config.apify.token },
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }),
    { retries: 3, label: 'Apify actor start' }
  );

  return response.data.data.id;
}

/**
 * Poll the actor run until it finishes or times out.
 */
async function waitForCompletion(runId) {
  const url = `${APIFY_BASE}/actor-runs/${runId}`;
  const startTime = Date.now();

  while (Date.now() - startTime < config.apify.timeoutMs) {
    const response = await axios.get(url, {
      params: { token: config.apify.token },
      timeout: 15000,
    });

    const run = response.data.data;
    const status = run.status;

    if (['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      return run;
    }

    logger.debug(`⏳ Actor run ${runId} status: ${status}, waiting...`);
    await sleep(config.apify.pollIntervalMs);
  }

  throw new Error(`Apify actor run timed out after ${config.apify.timeoutMs / 1000}s`);
}

/**
 * Fetch all results from the dataset (handles pagination).
 */
async function fetchDatasetResults(datasetId) {
  const allItems = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `${APIFY_BASE}/datasets/${datasetId}/items`;

    const response = await withRetry(
      () =>
        axios.get(url, {
          params: {
            token: config.apify.token,
            format: 'json',
            limit,
            offset,
          },
          timeout: 30000,
        }),
      { retries: 3, label: 'Apify dataset fetch' }
    );

    const items = response.data;
    if (!items || items.length === 0) break;

    allItems.push(...items);
    offset += limit;

    // If we got fewer items than the limit, we've reached the end
    if (items.length < limit) break;
  }

  return allItems;
}

module.exports = { scrapeGoogleMaps };
