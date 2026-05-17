// ============================================
// Telegram Bot — initialization and lifecycle
// ============================================
const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');
const { registerHandlers } = require('./handlers');
const logger = require('../utils/logger');

let bot = null;

/**
 * Initialize the Telegram bot in polling mode.
 * Returns the bot instance.
 */
function initBot() {
  bot = new TelegramBot(config.telegram.token, {
    polling: {
      autoStart: true,
      interval: 1000,
      params: {
        timeout: 30,
      },
    },
  });

  // Error handling
  bot.on('polling_error', (err) => {
    logger.error('Telegram polling error:', err.message);
  });

  bot.on('error', (err) => {
    logger.error('Telegram bot error:', err.message);
  });

  // Register command & message handlers
  registerHandlers(bot);

  logger.info('🤖 Telegram bot initialized and polling for messages');
  return bot;
}

/**
 * Gracefully stop the bot.
 */
function stopBot() {
  if (bot) {
    bot.stopPolling();
    logger.info('🛑 Telegram bot polling stopped');
  }
}

module.exports = { initBot, stopBot };
