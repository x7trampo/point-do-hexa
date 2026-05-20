'use strict';

const { handleCors } = require('../../lib/cors');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const digits = String(req.query.cep || '').replace(/\D/g, '');

  if (digits.length !== 8) {
    return res.status(400).json({ erro: true, message: 'CEP inválido' });
  }

  try {
    const upstream = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      headers: { 'Accept': 'application/json' },
    });

    const text = await upstream.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { erro: true }; }

    if (!upstream.ok || json.erro) {
      return res.status(404).json({ erro: true });
    }

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    return res.status(200).json(json);
  } catch (err) {
    return res.status(502).json({ erro: true, message: 'Falha ao consultar ViaCEP' });
  }
};
