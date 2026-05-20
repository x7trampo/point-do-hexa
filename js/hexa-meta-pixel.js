/**
 * Meta Pixel + CAPI (servidor) — vários pixels, user_data avançado, IPv6 na CAPI.
 * @see https://developers.facebook.com/docs/meta-pixel/get-started
 */
(function () {
  var cfg = window.HEXA_META || {};

  function getPixelIds() {
    if (cfg.pixelIds && cfg.pixelIds.length) return cfg.pixelIds.slice();
    if (cfg.pixelId) return [String(cfg.pixelId)];
    return [];
  }

  var pixelIds = getPixelIds();
  if (!pixelIds.length) return;

  function normPixelId(pid) {
    return String(pid || '').replace(/\D/g, '');
  }

  function capiUrl() {
    var b = (window.HEXA_CHECKOUT && String(window.HEXA_CHECKOUT.apiBase || '').replace(/\/$/, '')) || '';
    return (b ? b : '') + '/api/meta/capi';
  }

  function normEmail(e) {
    return String(e || '').trim().toLowerCase();
  }

  function normPhoneDigits(p) {
    var d = String(p || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.length >= 12 && d.slice(0, 2) === '55') return d;
    if (d.length === 10 || d.length === 11) return '55' + d;
    return d;
  }

  function payVal(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function splitName(full) {
    var n = String(full || '').replace(/\s+/g, ' ').trim();
    var parts = n.split(' ').filter(Boolean);
    if (!parts.length) return { fn: '', ln: '' };
    if (parts.length === 1) return { fn: parts[0], ln: '' };
    return { fn: parts[0], ln: parts.slice(1).join(' ') };
  }

  function buildUserDataFromDom() {
    var names = splitName(payVal('pay-name'));
    var o = {};
    var em = normEmail(payVal('pay-email'));
    var ph = normPhoneDigits(payVal('pay-phone'));
    if (em) o.em = em;
    if (ph) o.ph = ph;
    if (names.fn) o.fn = names.fn.toLowerCase();
    if (names.ln) o.ln = names.ln.toLowerCase();
    var ct = payVal('pay-cidade');
    if (ct) {
      o.ct = ct
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z]/g, '');
    }
    var st = payVal('pay-uf').replace(/\s/g, '').toLowerCase();
    if (st.length === 2) o.st = st;
    var zp = payVal('pay-cep').replace(/\D/g, '');
    if (zp.length >= 5) o.zp = zp;
    o.country = 'br';
    try {
      var ext = sessionStorage.getItem('hexaMetaExternalId');
      if (ext) o.external_id = ext;
    } catch (eExt) {}
    return o;
  }

  function applyUserDataFromDom() {
    if (typeof fbq !== 'function') return;
    var o = buildUserDataFromDom();
    if (!Object.keys(o).length) return;
    for (var i = 0; i < pixelIds.length; i++) {
      var pid = normPixelId(pixelIds[i]);
      if (!pid) continue;
      try {
        fbq('set', 'userData', o, pid);
      } catch (e) {}
    }
  }

  var clientIpPromise = null;

  /** IPv6 preferido (api64); fallback IPv4 — alinha CAPI com recomendação Meta. */
  window.hexaFetchClientIpv6 = function () {
    if (window.__hexaCachedClientIp) return Promise.resolve(window.__hexaCachedClientIp);
    if (clientIpPromise) return clientIpPromise;
    clientIpPromise = fetch('https://api64.ipify.org?format=json')
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        window.__hexaCachedClientIp = (j && j.ip) || '';
        return window.__hexaCachedClientIp;
      })
      .catch(function () {
        return fetch('https://api.ipify.org?format=json')
          .then(function (r) {
            return r.json();
          })
          .then(function (j) {
            window.__hexaCachedClientIp = (j && j.ip) || '';
            return window.__hexaCachedClientIp;
          })
          .catch(function () {
            return '';
          });
      });
    return clientIpPromise;
  };

  function loadFbq(cb) {
    if (window.fbq) return cb();
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    var iv = setInterval(function () {
      if (typeof fbq === 'function') {
        clearInterval(iv);
        cb();
      }
    }, 20);
    setTimeout(function () {
      clearInterval(iv);
      cb();
    }, 4000);
  }

  window.hexaMetaTrack = function (eventName, customData, eventOptions) {
    if (typeof fbq !== 'function') return;
    try {
      fbq('track', eventName, customData || {}, eventOptions || {});
    } catch (e) {}
  };

  function metaCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  }

  window.hexaMetaSendCapi = function (payload) {
    payload = payload || {};
    var fbp = metaCookie('_fbp');
    var fbc = metaCookie('_fbc');
    if (fbp && !payload.fbp) payload.fbp = fbp;
    if (fbc && !payload.fbc) payload.fbc = fbc;
    if (!payload.client_user_agent && typeof navigator !== 'undefined') {
      payload.client_user_agent = navigator.userAgent || '';
    }
    var url = capiUrl();

    function post() {
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
        keepalive: true,
      }).catch(function () {});
    }

    if (payload.client_ip) return post();
    return window.hexaFetchClientIpv6().then(function (ip) {
      if (ip) payload.client_ip = ip;
      return post();
    });
  };

  function boot() {
    if (window.__hexaMetaPixelBoot) return;
    window.__hexaMetaPixelBoot = true;

    loadFbq(function () {
      if (typeof fbq !== 'function') return;
      try {
        var inited = window.__HEXA_FBQ_INITED || (window.__HEXA_FBQ_INITED = {});
        for (var i = 0; i < pixelIds.length; i++) {
          var raw = normPixelId(pixelIds[i]);
          if (!raw || inited[raw]) continue;
          inited[raw] = true;
          fbq('init', raw);
        }
        fbq('track', 'PageView');
      } catch (e) {}

      if (/\/pagamento\.html/i.test(location.pathname) || document.getElementById('pay-email')) {
        applyUserDataFromDom();
        var bindIds = ['pay-name', 'pay-email', 'pay-phone', 'pay-cep', 'pay-cidade', 'pay-uf'];
        function bind() {
          applyUserDataFromDom();
        }
        bindIds.forEach(function (id) {
          var el = document.getElementById(id);
          if (!el) return;
          el.addEventListener('input', bind);
          el.addEventListener('blur', bind);
          el.addEventListener('change', bind);
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
