// Quick test script to verify Google credentials, Apify token, and Telegram token
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load env
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

console.log('🔍 Checking Environment and Credentials...');
console.log('------------------------------------------');

// 1. Check Env Values existence
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const apifyToken = process.env.APIFY_API_TOKEN;
const nvidiaKey = process.env.NVIDIA_NIM_API_KEY;
const googleKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || './credentials/service-account.json';

console.log(`Telegram Bot Token: ${telegramToken ? '✅ LOADED (ends with ' + telegramToken.slice(-6) + ')' : '❌ MISSING'}`);
console.log(`Apify API Token: ${apifyToken ? '✅ LOADED (ends with ' + apifyToken.slice(-6) + ')' : '❌ MISSING'}`);
console.log(`NVIDIA NIM API Key: ${nvidiaKey ? '✅ LOADED (ends with ' + nvidiaKey.slice(-6) + ')' : '❌ MISSING'}`);
console.log(`Google Credential Path Configured: ${googleKeyPath}`);

// 2. Verify Google Credentials file
const resolvedGooglePath = path.resolve(path.join(__dirname, googleKeyPath));
if (fs.existsSync(resolvedGooglePath)) {
  console.log(`Google Credential File: ✅ FOUND at ${resolvedGooglePath}`);
  try {
    const creds = JSON.parse(fs.readFileSync(resolvedGooglePath, 'utf8'));
    console.log(`- Project ID: ${creds.project_id}`);
    console.log(`- Client Email: ${creds.client_email}`);
    console.log(`- Private Key format: ${creds.private_key ? '✅ Valid' : '❌ Invalid'}`);
  } catch (e) {
    console.log(`❌ Failed to parse Google credentials JSON: ${e.message}`);
  }
} else {
  console.log(`❌ Google Credential File: NOT FOUND at ${resolvedGooglePath}`);
}

console.log('------------------------------------------');
console.log('Done!');
