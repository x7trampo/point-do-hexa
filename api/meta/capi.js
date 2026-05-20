'use strict';

const crypto = require('crypto');
const { handleCors } = require('../../lib/cors');

const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN || '';
const API_VERSION = process.env.META_API_VERSION || 'v20.0';
const PIXEL_IDS = (process.env.META_PIXEL_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function sha256(value) {
  if (value == null || value === '') return undefined;
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

function buildUserData(payload) {
  const ud = payload.user_data || {};
  return {
    em: sha256(ud.em),
    ph: sha256(ud.ph),
    fn: sha256(ud.fn),
    ln: sha256(ud.ln),
    ct: sha256(ud.ct),
    st: sha256(ud.st),
    zp: sha256(ud.zp),
    country: sha256(ud.country),
    external_id: sha256(ud.external_id),
    // Campos não hasheados
    client_ip_address: payload.client_ip || undefined,
    client_user_agent: payload.client_user_agent || undefined,
    fbp: payload.fbp || undefined,
    fbc: payload.fbc || undefined,
  };
}

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ACCESS_TOKEN || !PIXEL_IDS.length) {
    // Não é erro fatal — apenas ignora silenciosamente se não configurado
    return res.status(200).json({ ok: false, reason: 'CAPI não configurado no servidor' });
  }

  const payload = req.body || {};
  const event_time = Math.floor(Date.now() / 1000);

  const metaEvent = {
    event_name: payload.event_name,
    event_time,
    event_id: payload.event_id,
    event_source_url: payload.event_source_url,
    action_source: 'website',
    user_data: buildUserData(payload),
    custom_data: payload.custom_data || {},
  };

  // Remove campos undefined para não enviar null ao Meta
  metaEvent.user_data = JSON.parse(JSON.stringify(metaEvent.user_data));

  const results = await Promise.allSettled(
    PIXEL_IDS.map(async (pixelId) => {
      const url = `https://graph.facebook.com/${API_VERSION}/${pixelId}/events?access_token=${ACCESS_TOKEN}`;
      const upstream = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [metaEvent] }),
      });
      const json = await upstream.json().catch(() => ({}));
      return { pixelId, status: upstream.status, body: json };
    })
  );

  const responses = results.map((r) =>
    r.status === 'fulfilled' ? r.value : { error: r.reason?.message || 'unknown' }
  );

  return res.status(200).json({ ok: true, results: responses });
};
