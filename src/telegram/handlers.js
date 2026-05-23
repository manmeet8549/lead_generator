// ============================================
// Telegram Bot — handlers for user messages
// ============================================
const { parseQuery } = require('../utils/helpers');
const { runLeadPipeline } = require('../services/leadPipeline');
const logger = require('../utils/logger');
const fs = require('fs');

// In-flight requests tracker (prevent duplicate concurrent requests)
const activeRequests = new Map();

/**
 * Register all bot message handlers.
 *
 * @param {TelegramBot} bot
 */
function registerHandlers(bot) {
  // ---- /start command ----
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'there';

    bot.sendMessage(
      chatId,
      `👋 Hey ${firstName}! Welcome to *Lead Gen Bot* 🚀\n\n` +
        `I find business leads from Google Maps and deliver them to your Google Sheet.\n\n` +
        `*How to use:*\n` +
        `Just send me a message like:\n\n` +
        `\`50, dentists, delhi\`\n` +
        `\`100, plumbers, mumbai\`\n` +
        `\`20, gyms, london\`\n\n` +
        `I'll scrape, clean, and deliver a spreadsheet link! 📊`,
      { parse_mode: 'Markdown' }
    );
  });

  // ---- /help command ----
  bot.onText(/\/help/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      `📖 *Lead Gen Bot — Help*\n\n` +
        `*Commands:*\n` +
        `• /start — Welcome message\n` +
        `• /help — This help text\n` +
        `• /status — Check if bot is online\n\n` +
        `*Usage:*\n` +
        `Send \`<count>, <niche>, <area>\`\n\n` +
        `*Examples:*\n` +
        `• \`50, dentists, delhi\`\n` +
        `• \`100, yoga studios, bangalore\`\n` +
        `• \`20, restaurants, new york\`\n\n` +
        `*What you get:*\n` +
        `📊 Google Sheet with all leads\n` +
        `📁 CSV file download`,
      { parse_mode: 'Markdown' }
    );
  });

  // ---- /status command ----
  bot.onText(/\/status/, (msg) => {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const mins = Math.floor((uptime % 3600) / 60);

    bot.sendMessage(
      msg.chat.id,
      `✅ *Bot Status: Online*\n\n` +
        `⏱ Uptime: ${hours}h ${mins}m\n` +
        `📡 Active requests: ${activeRequests.size}`,
      { parse_mode: 'Markdown' }
    );
  });

  // ---- Main message handler (lead queries) ----
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Skip commands
    if (!text || text.startsWith('/')) return;

    // Parse the query
    const parsed = parseQuery(text);
    if (!parsed) {
      bot.sendMessage(
        chatId,
        `🤔 I didn't understand that.\n\nPlease use the format:\n\`<count>, <niche>, <area>\`\n\nExample: \`50, dentists, delhi\``,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const { count, niche, area } = parsed;

    // Check for duplicate in-flight request
    if (activeRequests.has(chatId)) {
      bot.sendMessage(
        chatId,
        `⏳ You already have a search in progress!\nPlease wait for it to finish before starting another.`
      );
      return;
    }

    // Mark request as active
    activeRequests.set(chatId, { niche, area, startedAt: Date.now() });

    try {
      // Initial acknowledgment
      const statusMsg = await bot.sendMessage(
        chatId,
        `🚀 *Generating leads...*\n\n` +
          `🔎 Searching: *${niche}* in *${area}* (Target: ${count} leads)\n\n` +
          `This may take a few minutes. I'll update you on progress!`,
        { parse_mode: 'Markdown' }
      );

      // Progress updater — edits the status message
      const onProgress = async (update) => {
        try {
          await bot.editMessageText(
            `🚀 *Generating leads...*\n\n` +
              `🔎 *${niche}* in *${area}* (Target: ${count} leads)\n\n` +
              `${update}`,
            {
              chat_id: chatId,
              message_id: statusMsg.message_id,
              parse_mode: 'Markdown',
            }
          );
        } catch (e) {
          // Ignore edit errors (e.g. message not modified)
        }
      };

      // ---- Run the pipeline ----
      const result = await runLeadPipeline(count, niche, area, onProgress);

      if (result.error || result.leads.length === 0) {
        await bot.sendMessage(chatId, result.summary, { parse_mode: 'Markdown' });
        return;
      }

      // ---- Send results ----
      let responseText =
        `✅ *Lead generation complete!*\n\n` +
        `${result.summary}\n` +
        `⏱ Time taken: *${result.elapsed}s*\n\n`;

      if (result.sheetUrl) {
        responseText += `📊 *Google Sheet:*\n${result.sheetUrl}\n\n`;
      }

      await bot.sendMessage(chatId, responseText, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      });

      // Send CSV file if available
      if (result.csvPath && fs.existsSync(result.csvPath)) {
        await bot.sendDocument(chatId, result.csvPath, {
          caption: `📁 CSV export: ${niche} in ${area} (${result.leads.length} leads)`,
        });
      }

      logger.info(`✅ Delivered ${result.leads.length} leads to chat ${chatId}`);
    } catch (err) {
      logger.error(`Pipeline error for chat ${chatId}:`, err);
      await bot.sendMessage(
        chatId,
        `❌ Something went wrong:\n\`${err.message}\`\n\nPlease try again later.`,
        { parse_mode: 'Markdown' }
      );
    } finally {
      activeRequests.delete(chatId);
    }
  });
}

module.exports = { registerHandlers };
