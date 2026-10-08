import { fetchAndParseNectaUrl } from '../../src/server/nectaFetchLogic.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    const result = await fetchAndParseNectaUrl(url);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Vercel function error in /api/necta/fetch-url:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error fetching NECTA URL'
    });
  }
}
