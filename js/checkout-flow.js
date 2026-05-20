/**
 * Gateways: BuckPay (ativo) + Primecash (legado), proxy same-origin + UTMify + formulário PIX.
 * HEXA_CHECKOUT.paymentGateway: 'buckpay' | 'primecash'
 * HEXA_CHECKOUT.apiBase: proxy local ou '' (Vercel).
 * BuckPay: https://docs.buckpay.com.br/docs — env BUCKPAY_API_TOKEN + BUCKPAY_USER_AGENT no servidor.
 */
(function () {
  var LS_FORM = 'hexaPayFormV1';
  var LS_PIX = 'hexaPayPixSessionV1';

  function cfg() {
    return window.HEXA_CHECKOUT || {};
  }

  function isBuckPay() {
    return (cfg().paymentGateway || 'buckpay') !== 'primecash';
  }

  function apiBase() {
    var b = String(cfg().apiBase || '').replace(/\/$/, '');
    return b;
  }

  function pcUrl(path) {
    var base = apiBase();
    if (!base) return path.charAt(0) === '/' ? path : '/' + path;
    return base + path;
  }

  function parseErrPrimecash(j, t, fallback) {
    if (j && j.message) return String(j.message);
    if (j && j.error) return typeof j.error === 'string' ? j.error : JSON.stringify(j.error);
    return t || fallback;
  }

  function parseErrBuck(j, t, fallback) {
    if (j && j.error) {
      var e = j.error;
      if (typeof e.message === 'string' && e.message) return String(e.message);
      if (typeof e.detail === 'string' && e.detail) return String(e.detail);
      if (e.detail && typeof e.detail === 'object') {
        try {
          return JSON.stringify(e.detail);
        } catch (err) {}
      }
    }
    if (j && j.message) return String(j.message);
    if (t && String(t).trim() && String(t).length < 600) return String(t).trim();
    return fallback;
  }

  function postPrimecashOnly(body) {
    var url = pcUrl('/api/primecash/transaction');
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = {};
        try {
          j = JSON.parse(t);
        } catch (e) {}
        if (!r.ok) {
          throw new Error(parseErrPrimecash(j, t, 'Erro Primecash'));
        }
        return j;
      });
    });
  }

  function postBuckpayOnly(body) {
    var url = pcUrl('/api/buckpay/transaction');
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = {};
        try {
          j = JSON.parse(t);
        } catch (e) {}
        if (!r.ok) {
          var msg = parseErrBuck(j, t, 'Erro ao gerar PIX (BuckPay)');
          if (r.status === 403 || r.status === 401) {
            msg = 'Gateway recusou (' + r.status + '). ' + msg;
          }
          throw new Error(msg);
        }
        return j;
      });
    });
  }

  function getPrimecashOnly(id) {
    var url = pcUrl('/api/primecash/transaction/' + encodeURIComponent(id));
    return fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = {};
        try {
          j = JSON.parse(t);
        } catch (e) {}
        if (!r.ok) throw new Error(parseErrPrimecash(j, t, 'Erro ao consultar transação'));
        return j;
      });
    });
  }

  /** Normaliza resposta GET BuckPay para o mesmo formato usado pelo painel (status no topo). */
  function normalizeBuckGet(j) {
    var d = j && j.data;
    if (!d) return j;
    return {
      id: d.id,
      status: d.status,
      payment_method: d.payment_method,
      pix: d.pix,
      total_amount: d.total_amount,
    };
  }

  function getBuckpayOnly(externalId) {
    var url = pcUrl('/api/buckpay/transaction/' + encodeURIComponent(externalId));
    return fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = {};
        try {
          j = JSON.parse(t);
        } catch (e) {}
        if (!r.ok) throw new Error(parseErrBuck(j, t, 'Erro ao consultar transação'));
        return normalizeBuckGet(j);
      });
    });
  }

  window.hexaFetchClientIp = function () {
    return fetch('https://api.ipify.org?format=json')
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        return (j && j.ip) || '';
      })
      .catch(function () {
        return '';
      });
  };

  /** Roteador: com paymentGateway=buckpay chama BuckPay; com primecash chama Primecash. */
  window.hexaPostPrimecashTransaction = function (body) {
    if (isBuckPay()) return postBuckpayOnly(body);
    return postPrimecashOnly(body);
  };

  window.hexaGetPrimecashTransaction = function (id) {
    if (isBuckPay()) return getBuckpayOnly(id);
    return getPrimecashOnly(id);
  };

  window.hexaPostUtmifyOrder = function (body) {
    var tok = cfg().utmifyToken;
    var url;
    var headers = { 'Content-Type': 'application/json' };
    if (tok) {
      url = 'https://api.utmify.com.br/api-credentials/orders';
      headers['x-api-token'] = tok;
    } else {
      url = pcUrl('/api/utmify/order');
    }
    return fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = {};
        try {
          j = JSON.parse(t);
        } catch (e) {}
        if (!r.ok) {
          var msg =
            (j && (j.message || j.error)) ||
            (j && j.errors && (typeof j.errors === 'string' ? j.errors : JSON.stringify(j.errors))) ||
            t ||
            'Erro UTMify';
          throw new Error(typeof msg === 'string' ? msg : 'Erro UTMify');
        }
        return j;
      });
    });
  };

  function savePayForm(fields) {
    try {
      localStorage.setItem(LS_FORM, JSON.stringify({ v: 1, t: Date.now(), fields: fields }));
    } catch (e) {}
  }

  window.hexaRestorePayForm = function (ids) {
    try {
      var raw = localStorage.getItem(LS_FORM);
      if (!raw) return;
      var o = JSON.parse(raw);
      if (!o || o.v !== 1 || !o.fields) return;
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && o.fields[id] != null) el.value = o.fields[id];
      });
    } catch (e) {}
  };

  window.hexaCollectPayForm = function (ids) {
    var fields = {};
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) fields[id] = el.value;
    });
    return fields;
  };

  window.hexaWatchPayForm = function (ids) {
    var t;
    function flush() {
      clearTimeout(t);
      t = setTimeout(function () {
        savePayForm(window.hexaCollectPayForm(ids));
      }, 400);
    }
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', flush);
      el.addEventListener('change', flush);
    });
  };

  window.hexaSavePixSession = function (obj) {
    try {
      localStorage.setItem(LS_PIX, JSON.stringify(obj));
    } catch (e) {}
  };

  window.hexaLoadPixSession = function () {
    try {
      return JSON.parse(localStorage.getItem(LS_PIX) || 'null');
    } catch (e) {
      return null;
    }
  };

  window.hexaClearPixSession = function () {
    try {
      localStorage.removeItem(LS_PIX);
    } catch (e) {}
  };
})();
