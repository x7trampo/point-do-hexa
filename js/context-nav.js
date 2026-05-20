/**
 * Repassa parâmetros utm_* da URL atual para links internos (.html)
 * e força o topo da página ao carregar (sem restaurar scroll do navegador).
 */
(function () {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  function scrollToTop() {
    window.scrollTo(0, 0);
    try {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch (e) {}
    requestAnimationFrame(function () {
      window.scrollTo(0, 0);
    });
  }

  function utmParamsFromSearch(search) {
    var src = new URLSearchParams(search || (typeof location !== 'undefined' ? location.search : '') || '');
    var out = new URLSearchParams();
    src.forEach(function (val, key) {
      var k = key.toLowerCase();
      if (/^utm_/i.test(key) || k === 'src' || k === 'sck') out.set(key, val);
    });
    return out;
  }

  function hasUtmKeys(params) {
    var keys = params.keys ? Array.from(params.keys()) : [];
    return keys.length > 0;
  }

  function isInternalHtmlHref(href) {
    if (!href || typeof href !== 'string') return false;
    var h = href.trim();
    if (!h || h === '#' || h.charAt(0) === '#') return false;
    if (/^(mailto:|tel:)/i.test(h)) return false;
    if (/^https?:\/\//i.test(h)) return false;
    return /\.html(\?|#|$)/i.test(h);
  }

  function mergeUtmIntoHref(href, searchSource) {
    var utm = utmParamsFromSearch(searchSource);
    if (!hasUtmKeys(utm)) return href;
    try {
      var resolved = new URL(href, location.href);
      utm.forEach(function (v, k) {
        resolved.searchParams.set(k, v);
      });
      var cur = new URL(location.href);
      if (resolved.origin !== cur.origin) return href;
      var curDir = cur.pathname.slice(0, cur.pathname.lastIndexOf('/') + 1);
      var path = resolved.pathname;
      var relPath = path.indexOf(curDir) === 0 ? path.slice(curDir.length) : path.slice(path.lastIndexOf('/') + 1);
      if (!relPath) relPath = href.split('?')[0].split('#')[0].replace(/^\.\//, '');
      return relPath + (resolved.search || '') + (resolved.hash || '');
    } catch (e) {
      return href;
    }
  }

  function augmentLocalLinks() {
    Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (a) {
      var href = a.getAttribute('href');
      if (!isInternalHtmlHref(href)) return;
      if (typeof window.hexaAugmentInternalLinkHref === 'function') {
        a.setAttribute('href', window.hexaAugmentInternalLinkHref(href));
      } else {
        var utm = utmParamsFromSearch();
        if (hasUtmKeys(utm)) a.setAttribute('href', mergeUtmIntoHref(href));
      }
    });
  }

  scrollToTop();

  function boot() {
    augmentLocalLinks();
    scrollToTop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.hexaScrollToTop = scrollToTop;
})();
