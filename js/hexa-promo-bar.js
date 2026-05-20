/**
 * Barra de avisos — Semana do frete grátis (todas as páginas que incluem este script).
 */
(function () {
  if (typeof document === 'undefined') return;
  if (document.getElementById('hexa-promo-bar')) return;
  var bar = document.createElement('div');
  bar.id = 'hexa-promo-bar';
  bar.setAttribute('role', 'status');
  bar.className =
    'w-full bg-jade text-white text-center border-b border-black/10 shadow-sm';
  bar.innerHTML =
    '<div class="max-w-5xl mx-auto py-2.5 px-3 sm:px-4 text-[10px] sm:text-sm font-bold tracking-wide leading-none whitespace-nowrap">' +
    'Semana do frete grátis — frete grátis em todos os pedidos no Brasil.' +
    '</div>';
  document.body.insertBefore(bar, document.body.firstChild);
})();
