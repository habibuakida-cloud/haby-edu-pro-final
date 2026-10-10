# Deploying Haby Edu Pro to Surge.sh

Surge provides fast, free static web publishing.

## Prerequisites
Surge requires Node.js and npm installed.

```bash
npm install -g surge
```

---

## Deployment Steps

### Step 1: Build the Project
Build the production assets into `./dist`:
```bash
npm run build
cp dist/index.html dist/200.html
```
*(Note: `dist/200.html` ensures client-side React SPA routing works without 404 errors on page refresh).*

### Step 2: Deploy to Surge
Run the deploy command:
```bash
surge dist --domain haby-edu-pro-final.surge.sh
```
Or simply:
```bash
npm run deploy
```

### Step 3: First-time Login / Account Creation
- **Email**: Enter your email address (e.g. `habibuakida@gmail.com`).
- **Password**: Create a password (characters are hidden while typing).
- **Domain**: When prompted for `domain:`, enter:
  ```text
  haby-edu-pro-final.surge.sh
  ```

---

## Current Deployment Status
- **Domain**: [https://haby-edu-pro-final.surge.sh](https://haby-edu-pro-final.surge.sh)
- **Status**: **LIVE & ACTIVE** (HTTP 200 OK)
- **Account**: `habibuakida@gmail.com`
- **Notice**: Please check your email (`habibuakida@gmail.com`) to click the Surge email verification link to keep the domain permanently active.

---

## Non-Interactive / CI Deployment (Automated Token)
If you want to deploy without typing credentials each time:

1. Get your Surge login token:
```bash
surge token
```
2. Deploy directly using your token:
```bash
SURGE_LOGIN=habibuakida@gmail.com SURGE_TOKEN=your_token surge dist --domain haby-edu-pro-final.surge.sh
```
