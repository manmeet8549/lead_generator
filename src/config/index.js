// ============================================
// Configuration — centralized env loader
// ============================================
require('dotenv').config();

const config = {
  // Telegram
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
  },

  // Apify
  apify: {
    token: process.env.APIFY_API_TOKEN,
    actorId: 'nwua9Gu5YrADL7ZDj', // Apify Google Maps Scraper actor ID
    maxResults: parseInt(process.env.MAX_LEADS_PER_SEARCH, 10) || 100,
    timeoutMs: 15 * 60 * 1000, // 15 minutes max wait
    pollIntervalMs: 5000,      // poll every 5s
  },

  // NVIDIA NIM
  nvidia: {
    apiKey: process.env.NVIDIA_NIM_API_KEY,
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    model: 'meta/llama-3.1-8b-instruct',
    enabled: process.env.AI_ENRICHMENT_ENABLED === 'true',
  },

  // Google Sheets
  google: {
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || './credentials/service-account.json',
  },

  // Server
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    env: process.env.NODE_ENV || 'development',
  },

  // Rate limiting
  rateLimit: {
    maxPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE, 10) || 10,
  },
};

// ---- Validation ----
const required = [
  ['TELEGRAM_BOT_TOKEN', config.telegram.token],
  ['APIFY_API_TOKEN', config.apify.token],
];

for (const [name, value] of required) {
  if (!value) {
    console.error(`❌ Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

module.exports = config;
