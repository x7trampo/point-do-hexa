/**
 * apiBase: em localhost aponta para o backend local (porta 3001);
 *          em produção aponta para o backend Vercel separado.
 *
 * IMPORTANTE: após fazer deploy do hexa-api no Vercel, substitua
 * HEXA_API_PROD_URL pelo URL real (ex.: https://hexa-api.vercel.app).
 */
(function () {
  var host = typeof location !== 'undefined' ? location.hostname : '';
  var isLocal = host === 'localhost' || host === '127.0.0.1';

  window.HEXA_CHECKOUT = {
    apiBase: isLocal ? 'http://localhost:3000' : '',
    utmifyToken: '',
    /** PIX: 'primecash' | 'buckpay' — ativo: BuckPay */
    paymentGateway: 'buckpay',
  };
})();
