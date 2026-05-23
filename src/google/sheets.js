// ============================================
// Google Sheets — dynamic spreadsheet creation
// ============================================
const { google } = require('googleapis');
const config = require('../config');
const logger = require('../utils/logger');
const fs = require('fs');

let sheetsClient = null;
let driveClient = null;

/**
 * Initialize Google API clients using service account credentials.
 */
async function initGoogleClients() {
  if (sheetsClient && driveClient) return;

  let authOptions = {
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  };

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      let credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON.trim();
      // Auto-decode base64 if it's encoded
      if (!credentialsJson.startsWith('{')) {
        credentialsJson = Buffer.from(credentialsJson, 'base64').toString('utf8');
      }
      authOptions.credentials = JSON.parse(credentialsJson);
      logger.info('🔑 Loaded Google credentials from GOOGLE_SERVICE_ACCOUNT_JSON env var');
    } catch (e) {
      logger.error('❌ Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON environment variable:', e);
      throw new Error(`Invalid GOOGLE_SERVICE_ACCOUNT_JSON env variable format: ${e.message}`);
    }
  } else {
    const keyFilePath = config.google.keyFile;
    if (!fs.existsSync(keyFilePath)) {
      throw new Error(
        `Google credentials missing! Service account key file not found at "${keyFilePath}", ` +
          'and "GOOGLE_SERVICE_ACCOUNT_JSON" environment variable is not defined.'
      );
    }
    authOptions.keyFile = keyFilePath;
    logger.info(`🔑 Loaded Google credentials from key file: ${keyFilePath}`);
  }

  const auth = new google.auth.GoogleAuth(authOptions);

  const authClient = await auth.getClient();
  sheetsClient = google.sheets({ version: 'v4', auth: authClient });
  driveClient = google.drive({ version: 'v3', auth: authClient });

  logger.info('✅ Google API clients initialized');
}

/**
 * Create a new spreadsheet, populate it with leads, and return a shareable link.
 *
 * @param {Array} leads - array of lead objects
 * @param {string} title - spreadsheet title
 * @returns {Promise<string>} - shareable spreadsheet URL
 */
async function saveToGoogleSheets(leads, title) {
  await initGoogleClients();

  const spreadsheetTitle = `🎯 Leads: ${title} — ${new Date().toLocaleDateString('en-IN')}`;

  // 1. Create spreadsheet
  logger.info(`📝 Creating spreadsheet: "${spreadsheetTitle}"`);
  const spreadsheet = await sheetsClient.spreadsheets.create({
    requestBody: {
      properties: {
        title: spreadsheetTitle,
      },
      sheets: [
        {
          properties: {
            title: 'Leads',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId;
  const sheetId = spreadsheet.data.sheets[0].properties.sheetId;

  // 2. Add headers + data
  const headers = [
    'Name',
    'Phone',
    'Website',
    'Email',
    'Address',
    'Rating',
    'Reviews',
    'Category',
  ];

  const rows = leads.map((lead) => [
    lead.name,
    lead.phone,
    lead.website,
    lead.email,
    lead.address,
    lead.rating,
    lead.reviews,
    lead.category,
  ]);

  await sheetsClient.spreadsheets.values.update({
    spreadsheetId,
    range: 'Leads!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers, ...rows],
    },
  });

  // 3. Format the header row
  await sheetsClient.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        // Bold header row
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.1, green: 0.1, blue: 0.3, alpha: 1 },
                textFormat: {
                  bold: true,
                  fontSize: 11,
                  foregroundColor: { red: 1, green: 1, blue: 1, alpha: 1 },
                },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        // Auto-resize columns
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: headers.length,
            },
          },
        },
      ],
    },
  });

  // 4. Make it shareable (anyone with the link can view)
  await driveClient.permissions.create({
    fileId: spreadsheetId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  logger.info(`✅ Spreadsheet created: ${sheetUrl}`);

  return sheetUrl;
}

module.exports = { saveToGoogleSheets, initGoogleClients };
