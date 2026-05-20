/**
 * Persiste utm_* (e src/sck) no localStorage + sessionStorage.
 * hexaAugmentInternalLinkHref: mescla UTMs persistidos + URL atual + query no href.
 */
(function () {
  var KEY = 'hexaUtmParams';
  var LOCK_KEY = 'hexaUtmifyTrackingLock';

  function isTrackingKey(k) {
    k = String(k || '').toLowerCase();
    return k.indexOf('utm_') === 0 || k === 'src' || k === 'sck';
  }

  function parseJsonStore(storage, key) {
    try {
      return JSON.parse(storage.getItem(key) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function parseStored() {
    var loc = parseJsonStore(localStorage, KEY);
    var ses = parseJsonStore(sessionStorage, KEY);
    var merged = Object.assign({}, loc);
    Object.keys(ses).forEach(function (k) {
      if (ses[k] != null && String(ses[k]).length) merged[k] = ses[k];
    });
    return merged;
  }

  function saveStored(obj) {
    try {
      var raw = JSON.stringify(obj);
      localStorage.setItem(KEY, raw);
      sessionStorage.setItem(KEY, raw);
    } catch (e) {}
  }

  function mergeParamsIntoStored(params) {
    if (!params || !params.forEach) return parseStored();
    var stored = parseStored();
    var changed = false;
    params.forEach(function (val, key) {
      var k = String(key).toLowerCase();
      if (isTrackingKey(k) && val != null && String(val).length) {
        stored[k] = val;
        changed = true;
      }
    });
    if (changed) saveStored(stored);
    return stored;
  }

  function captureFromUrl() {
    mergeParamsIntoStored(new URLSearchParams(typeof location !== 'undefined' ? location.search : ''));
    try {
      var ref = document.referrer;
      if (ref) {
        var refUrl = new URL(ref);
        if (refUrl.hostname !== location.hostname) {
          mergeParamsIntoStored(refUrl.searchParams);
        }
      }
    } catch (e) {}
    return parseStored();
  }

  function pickParam(o, key) {
    if (!o || typeof o !== 'object') return null;
    if (o[key] != null && String(o[key]).length) return o[key];
    var low = key.toLowerCase();
    for (var p in o) {
      if (!Object.prototype.hasOwnProperty.call(o, p)) continue;
      if (p.toLowerCase() === low && o[p] != null && String(o[p]).length) return o[p];
    }
    return null;
  }

  function objectToTrackingParams(o) {
    return {
      src: pickParam(o, 'src'),
      sck: pickParam(o, 'sck'),
      utm_source: pickParam(o, 'utm_source'),
      utm_campaign: pickParam(o, 'utm_campaign'),
      utm_medium: pickParam(o, 'utm_medium'),
      utm_content: pickParam(o, 'utm_content'),
      utm_term: pickParam(o, 'utm_term'),
    };
  }

  function hasAnyTracking(t) {
    if (!t || typeof t !== 'object') return false;
    return (
      (t.src != null && String(t.src).length) ||
      (t.sck != null && String(t.sck).length) ||
      (t.utm_source != null && String(t.utm_source).length) ||
      (t.utm_campaign != null && String(t.utm_campaign).length) ||
      (t.utm_medium != null && String(t.utm_medium).length) ||
      (t.utm_content != null && String(t.utm_content).length) ||
      (t.utm_term != null && String(t.utm_term).length)
    );
  }

  function getLockedTracking() {
    try {
      var raw = sessionStorage.getItem(LOCK_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  captureFromUrl();

  if (typeof window !== 'undefined') {
    window.addEventListener('pageshow', function () {
      captureFromUrl();
    });
  }

  window.hexaCaptureUtmsFromUrl = captureFromUrl;

  /** Formato UTMify: src, sck, utm_source, … (null se ausente) */
  window.hexaUtmToTrackingParams = function () {
    var locked = getLockedTracking();
    if (hasAnyTracking(locked)) return locked;
    return objectToTrackingParams(parseStored());
  };

  /** Congela UTMs no checkout (não perde entre waiting_payment e paid) */
  window.hexaLockUtmifyTracking = function () {
    var t = objectToTrackingParams(parseStored());
    try {
      sessionStorage.setItem(LOCK_KEY, JSON.stringify(t));
    } catch (e) {}
    return t;
  };

  window.hexaHasUtmTracking = hasAnyTracking;

  window.hexaAugmentInternalLinkHref = function (href) {
    if (!href || typeof href !== 'string') return href;
    var h = href.trim();
    if (!h || h.charAt(0) === '#' || /^mailto:|^tel:/i.test(h)) return h;
    if (/^https?:\/\//i.test(h)) return h;
    if (!/\.html(\?|#|$)/i.test(h)) return h;
    try {
      var resolved = new URL(href, location.href);
      var merged = new URLSearchParams();
      var stored = parseStored();
      resolved.searchParams.forEach(function (v, k) {
        var kl = k.toLowerCase();
        if (!isTrackingKey(kl)) merged.set(k, v);
      });
      Object.keys(stored).forEach(function (k) {
        merged.set(k, stored[k]);
      });
      new URLSearchParams(location.search).forEach(function (v, k) {
        var kl = k.toLowerCase();
        if (isTrackingKey(kl)) merged.set(k, v);
      });
      var cur = new URL(location.href);
      var curDir = cur.pathname.slice(0, cur.pathname.lastIndexOf('/') + 1);
      var path = resolved.pathname;
      var relPath = path.indexOf(curDir) === 0 ? path.slice(curDir.length) : path.slice(path.lastIndexOf('/') + 1);
      if (!relPath) relPath = href.split('?')[0].split('#')[0].replace(/^\.\//, '');
      var qs = merged.toString();
      if (!qs) return href;
      
      return relPath + (qs ? '?' + qs : '') + (resolved.hash || '');
    } catch (e) {
      return href;
    }
  };
})();

