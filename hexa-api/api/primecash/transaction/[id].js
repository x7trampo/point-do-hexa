'use strict';

const { handleCors } = require('../../../lib/cors');

const API_URL = process.env.PRIMECASH_API_URL || 'https://api.primecash.com.br';
const API_KEY = process.env.PRIMECASH_API_KEY || '';

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'PRIMECASH_API_KEY não configurado no servidor.' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'ID da transação é obrigatório' });
  }

  try {
    const upstream = await fetch(`${API_URL}/v1/transactions/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
    });

    const text = await upstream.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    return res.status(upstream.status).json(json);
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Erro ao consultar Primecash' });
  }
};
