# 💀 DL SMS Client — Team Death Legion

The most advanced SMS & OTP monitoring platform.

## Features
- 📱 **Numbers Management** — Sync and manage iVASMS numbers
- 📨 **SMS History** — Full SMS log with OTP extraction
- ✅ **Verification Sessions** — Real-time OTP monitoring
- 💬 **WhatsApp BETA** — Create WhatsApp accounts via iVASMS numbers
- ✈️ **Telegram Bot** — OTP notifications via Telegram
- 🟢 **Status Page** — Real-time system health monitoring
- 📱 **DLChat PWA** — Mobile WhatsApp client

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Default Credentials

```
Email: admin@dlsms.com
Password: admin123
```

## Configuration

### iVASMS Setup
1. Go to **Settings → iVASMS Connection**
2. Enter your ivasms.com email and password
3. Click **Test Connection** to verify
4. Go to **Numbers** page and click **Sync from iVASMS**

### Telegram Bot Setup
1. Open **@BotFather** on Telegram
2. Send `/newbot` and follow instructions
3. Copy the bot token
4. Open **@userinfobot**, send any message, copy your Chat ID
5. Go to **Telegram Bot** page, enter token + Chat ID
6. Click **Save & Activate**

### WhatsApp BETA
1. Make sure you have active iVASMS numbers synced
2. Go to **WhatsApp** page
3. Select a number from dropdown
4. Click **Create WhatsApp Account**
5. The app will:
   - Request WA verification code to your iVASMS number
   - Auto-read the OTP from iVASMS
   - Complete WhatsApp registration
   - Generate your DLChat token

### DLChat Mobile App
1. Go to **Settings → DLChat Mobile App**
2. Copy your token or scan the QR code
3. Open `/mobile` on your phone (or add to home screen as PWA)
4. Enter your token to connect

## Deploy to Cloudflare Pages

```bash
npm run build
export CLOUDFLARE_API_TOKEN=your_token_here
npx wrangler pages project create dl-sms-client --production-branch main
npx wrangler pages deploy out --project-name dl-sms-client --branch main --no-bundle
```

## Tech Stack
- **Next.js 14** — React framework with App Router
- **TypeScript** — Type safety
- **Tailwind CSS** — Styling
- **better-sqlite3** — Local database
- **jose** — JWT authentication
- **Grammy** — Telegram bot framework
- **Cheerio** — HTML parsing for iVASMS
- **QRCode** — QR code generation

## Team
💀 **TEAM DEATH LEGION** — DL SMSTEAM

---
DL SMS Client © 2025
