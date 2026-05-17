// ============================================
// CSV Export — generate CSV files from leads
// ============================================
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

const EXPORTS_DIR = path.join(process.cwd(), 'exports');

/**
 * Export leads array to a CSV file.
 * Returns the absolute path to the generated file.
 */
async function exportToCsv(leads, filename) {
  // Ensure exports directory exists
  if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  }

  const sanitized = filename.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filePath = path.join(EXPORTS_DIR, `${sanitized}.csv`);

  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'name', title: 'Name' },
      { id: 'phone', title: 'Phone' },
      { id: 'website', title: 'Website' },
      { id: 'address', title: 'Address' },
      { id: 'rating', title: 'Rating' },
      { id: 'reviews', title: 'Reviews' },
      { id: 'category', title: 'Category' },
      { id: 'aiScore', title: 'AI Score' },
      { id: 'aiSummary', title: 'AI Summary' },
      { id: 'outreachMessage', title: 'Outreach Message' },
    ],
  });

  await csvWriter.writeRecords(leads);
  logger.info(`CSV exported: ${filePath} (${leads.length} leads)`);
  return filePath;
}

/**
 * Clean up old CSV exports (older than 24 hours)
 */
function cleanupOldExports() {
  if (!fs.existsSync(EXPORTS_DIR)) return;

  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  const files = fs.readdirSync(EXPORTS_DIR);
  for (const file of files) {
    const filePath = path.join(EXPORTS_DIR, file);
    const stat = fs.statSync(filePath);
    if (now - stat.mtimeMs > maxAge) {
      fs.unlinkSync(filePath);
      logger.debug(`Cleaned up old export: ${file}`);
    }
  }
}

module.exports = { exportToCsv, cleanupOldExports };
