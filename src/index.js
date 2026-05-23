// ============================================
// Entry Point — Express server + Telegram bot
// ============================================
const express = require('express');
const config = require('./config');
const { initBot, stopBot } = require('./telegram/bot');
const { cleanupOldExports } = require('./utils/csv');
const logger = require('./utils/logger');

const app = express();
app.use(express.json());

// ---- Health check endpoint ----
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Telegram Lead Gen Bot',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// ---- Start server ----
const server = app.listen(config.server.port, () => {
  logger.info(`🌐 Express server running on port ${config.server.port}`);
  logger.info(`📡 Environment: ${config.server.env}`);
});

// ---- Start Telegram bot ----
const bot = initBot();

// ---- Periodic cleanup of old CSV exports (every hour) ----
setInterval(() => {
  try {
    cleanupOldExports();
  } catch (err) {
    logger.error('Cleanup error:', err);
  }
}, 60 * 60 * 1000);

// ---- Keep-alive ping for Render Free Tier (every 14 mins) ----
if (process.env.RENDER_EXTERNAL_URL) {
  setInterval(() => {
    logger.info('Self-pinging to keep Render instance awake...');
    const url = `${process.env.RENDER_EXTERNAL_URL}/health`;
    const httpModule = url.startsWith('https') ? require('https') : require('http');
    
    httpModule.get(url).on('error', (err) => {
      logger.error('Self-ping failed:', err.message);
    });
  }, 14 * 60 * 1000);
}

// ---- Graceful shutdown ----
function shutdown(signal) {
  logger.info(`\n${signal} received. Shutting down gracefully...`);
  stopBot();
  server.close(() => {
    logger.info('Express server closed');
    process.exit(0);
  });
  // Force exit after 10s
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection:', err);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  shutdown('uncaughtException');
});

module.exports = app;
