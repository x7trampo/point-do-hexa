'use strict';

const { handleCors } = require('../../lib/cors');

const API_URL = process.env.BUCKPAY_API_URL || 'https://api.buckpay.com.br';
const API_TOKEN = process.env.BUCKPAY_API_TOKEN || '';
const USER_AGENT = process.env.BUCKPAY_USER_AGENT || 'EstacaoDoHexa/1.0';

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!API_TOKEN) {
    return res.status(500).json({ error: 'BUCKPAY_API_TOKEN não configurado no servidor.' });
  }

  try {
    const upstream = await fetch(`${API_URL}/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify(req.body),
    });

    const text = await upstream.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    return res.status(upstream.status).json(json);
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Erro ao contatar BuckPay' });
  }
};
