# 🚀 Telegram Lead Gen Bot

> AI-powered lead generation bot that scrapes Google Maps, enriches data with NVIDIA NIM AI, and delivers results via Google Sheets — all through Telegram.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express)
![Telegram](https://img.shields.io/badge/Telegram-Bot%20API-26A5E4?logo=telegram)

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [API Setup Guide](#-api-setup-guide)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Folder Structure](#-folder-structure)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 Google Maps Scraping | Scrape business data via Apify |
| 🤖 AI Lead Scoring | Score and categorize leads with NVIDIA NIM |
| 📊 Google Sheets Export | Auto-create shareable spreadsheets |
| 📁 CSV Export | Download leads as CSV files |
| 🧹 Data Cleaning | Dedup, phone validation, website filtering |
| 📡 Live Progress | Real-time Telegram status updates |
| 🛡️ Production Ready | Error handling, retries, rate limiting |
| 🐳 Docker Support | One-command deployment |

---

## 🏗️ Architecture

```
User sends "dentists in delhi" on Telegram
        │
        ▼
┌─────────────────┐
│  Telegram Bot    │ ← Parses niche + area
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Apify Scraper   │ ← Google Maps data
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Data Cleaner    │ ← Dedup, validate, normalize
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  NVIDIA NIM AI   │ ← Score, summarize, outreach
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Google Sheets   │ ← Create & share spreadsheet
└────────┬────────┘
         │
         ▼
User receives Sheet link + CSV on Telegram
```

---

## 📦 Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **Telegram Bot Token** (from [@BotFather](https://t.me/BotFather))
- **Apify Account** ([sign up](https://apify.com/))
- **NVIDIA NIM API Key** ([get one](https://build.nvidia.com/))
- **Google Cloud Service Account** ([console](https://console.cloud.google.com/))

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
cd telegram-lead-gen-bot
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Add Google Credentials

```bash
mkdir credentials
# Place your service-account.json in the credentials/ folder
```

### 4. Run

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

### 5. Test on Telegram

Open your bot on Telegram and send:
```
dentists in delhi
```

---

## 🔐 API Setup Guide

### 1. Telegram Bot Token

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Follow the prompts to name your bot
4. Copy the **HTTP API Token**
5. Paste into `.env` as `TELEGRAM_BOT_TOKEN`

### 2. Apify API Token

1. Create an account at [apify.com](https://apify.com/)
2. Go to **Settings → Integrations**
3. Copy your **API Token**
4. Paste into `.env` as `APIFY_API_TOKEN`

> The bot uses the [Google Maps Scraper](https://apify.com/nwua9Gu5YrADL7ZDj) actor.

### 3. NVIDIA NIM API Key

1. Go to [build.nvidia.com](https://build.nvidia.com/)
2. Sign up / Log in
3. Navigate to an LLM model (e.g., LLaMA 3.1 8B Instruct)
4. Generate an **API Key**
5. Paste into `.env` as `NVIDIA_NIM_API_KEY`

### 4. Google Sheets Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable these APIs:
   - **Google Sheets API**
   - **Google Drive API**
4. Go to **IAM & Admin → Service Accounts**
5. Create a service account
6. Click **Keys → Add Key → Create New Key → JSON**
7. Download the JSON file
8. Save it as `credentials/service-account.json`

---

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ | Bot token from @BotFather |
| `APIFY_API_TOKEN` | ✅ | Apify API token |
| `NVIDIA_NIM_API_KEY` | ❌ | NVIDIA NIM key (for AI enrichment) |
| `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` | ❌ | Path to service account JSON |
| `PORT` | ❌ | Server port (default: 3000) |
| `NODE_ENV` | ❌ | `production` or `development` |
| `MAX_LEADS_PER_SEARCH` | ❌ | Max leads to scrape (default: 100) |
| `AI_ENRICHMENT_ENABLED` | ❌ | Enable AI scoring (default: true) |

---

## 🚢 Deployment

### Docker

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Railway

1. Push to GitHub
2. Go to [railway.app](https://railway.app/)
3. Connect your repo
4. Add environment variables in the dashboard
5. Upload `service-account.json` as a Railway volume or use base64-encoded env var
6. Deploy!

Railway start command: `npm start`

### Render

1. Push to GitHub
2. Go to [render.com](https://render.com/)
3. Create a **Web Service**
4. Connect your repo
5. Set:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Add environment variables
7. Deploy!

---

## 📁 Folder Structure

```
telegram-lead-gen-bot/
├── src/
│   ├── ai/
│   │   └── nvidia.js          # NVIDIA NIM AI enrichment
│   ├── apify/
│   │   └── scraper.js         # Google Maps scraper via Apify
│   ├── config/
│   │   └── index.js           # Centralized configuration
│   ├── google/
│   │   └── sheets.js          # Google Sheets creation & export
│   ├── services/
│   │   └── leadPipeline.js    # Main pipeline orchestrator
│   ├── telegram/
│   │   ├── bot.js             # Bot initialization
│   │   └── handlers.js        # Message & command handlers
│   ├── utils/
│   │   ├── csv.js             # CSV export utility
│   │   ├── helpers.js         # Shared helpers (parse, clean, dedup)
│   │   └── logger.js          # Winston logger
│   └── index.js               # Entry point (Express + Bot)
├── credentials/                # Google service account (gitignored)
├── exports/                    # Generated CSV files (gitignored)
├── .env.example                # Environment variable template
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

---

## 🧪 Testing the Bot

| Send this | Expected result |
|-----------|----------------|
| `/start` | Welcome message with usage instructions |
| `/help` | Full help text |
| `/status` | Bot uptime and active requests |
| `dentists in delhi` | Lead generation starts |
| `hello` | "I didn't understand" prompt |

---

## 📄 License

MIT — use it however you want.

---

Built with ❤️ by Manmeet Singh
