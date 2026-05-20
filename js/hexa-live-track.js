/**
 * Presença ao vivo — envia heartbeat para /api/hexa-sessions (mesma origem ou localhost:8787).
 */
(function () {
  function apiBase() {
    var h = typeof location !== 'undefined' ? location.hostname : '';
    var local = h === 'localhost' || h === '127.0.0.1';
    if (local) return 'http://localhost:8787';
    return '';
  }

  function sid() {
    try {
      var k = 'hexaLiveSidV1';
      var x = sessionStorage.getItem(k);
      if (x && x.length > 8) return x;
      var n =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now()) + Math.random().toString(36).slice(2);
      sessionStorage.setItem(k, n);
      return n;
    } catch (e) {
      return 'anon_' + String(Date.now());
    }
  }

  function readLive() {
    var L = window.__HEXA_LIVE || {};
    return {
      payStage: L.payStage != null ? L.payStage : null,
      montarStep: L.montarStep != null ? L.montarStep : null,
    };
  }

  function tick() {
    var path = typeof location !== 'undefined' ? location.pathname || '/' : '/';
    var ex = readLive();
    var tz = '';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch (eTz) {}
    var payload = {
      op: 'heartbeat',
      sessionId: sid(),
      page: path,
      payStage: ex.payStage,
      montarStep: ex.montarStep,
      ua: typeof navigator !== 'undefined' ? String(navigator.userAgent || '').slice(0, 280) : '',
      tz: tz,
    };
    var url = apiBase() + '/api/hexa-sessions';
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(function () {});
  }

  tick();
  setInterval(tick, 12000);
})();
