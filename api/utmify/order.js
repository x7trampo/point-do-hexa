'use strict';

const { handleCors } = require('../../lib/cors');

const UTMIFY_TOKEN = process.env.UTMIFY_TOKEN || '';
const UTMIFY_URL = 'https://api.utmify.com.br/api-credentials/orders';

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!UTMIFY_TOKEN) {
    return res.status(500).json({ error: 'UTMIFY_TOKEN não configurado no servidor.' });
  }

  try {
    const upstream = await fetch(UTMIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': UTMIFY_TOKEN,
      },
      body: JSON.stringify(req.body),
    });

    const text = await upstream.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    return res.status(upstream.status).json(json);
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Erro ao contatar UTMify' });
  }
};
