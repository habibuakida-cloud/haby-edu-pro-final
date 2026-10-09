#!/usr/bin/env node
// AUTO CLEAR CACHE & DEPLOY - HABY EDU PRO
// Netlify Build & Clear Cache Deployment Script

import dotenv from 'dotenv';
dotenv.config();

const NETLIFY_TOKEN = process.env.NETLIFY_TOKEN || process.env.VITE_NETLIFY_TOKEN || process.argv[2] || '';
const SITE_ID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID || process.env.VITE_NETLIFY_SITE_ID || process.argv[3] || 'habyedupro';

async function clearCacheDeploy() {
  if (!NETLIFY_TOKEN || NETLIFY_TOKEN.includes('WEKA TOKEN')) {
    console.error('❌ Error: Netlify token haijapatikana.');
    console.error('Tafadhali weka NETLIFY_TOKEN kwenye .env au ingiza kama parameter:');
    console.error('node scripts/netlify-deploy.mjs <NETLIFY_TOKEN> <SITE_ID>');
    process.exit(1);
  }

  console.log(`🚀 Inaanza ku-deploy kwa Netlify (Site ID: ${SITE_ID}) na kufuta cache (clear_cache: true)...`);

  try {
    const res = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}/builds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NETLIFY_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ clear_cache: true })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Netlify API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    console.log('✅ Deploy started with clear cache successfully!');
    console.log('Build ID:', data.id);
    console.log('Deploy URL:', `https://app.netlify.com/sites/${SITE_ID}/deploys/${data.id || ''}`);
    return data;
  } catch (err) {
    console.error('❌ Failed to trigger Netlify deploy:', err.message || err);
    process.exit(1);
  }
}

clearCacheDeploy();
