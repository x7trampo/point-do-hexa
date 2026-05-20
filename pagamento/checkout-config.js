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
    supabaseUrl: 'https://wtrfiavkprduixwolstk.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0cmZpYXZrcHJkdWl4d29sc3RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTkyMjIsImV4cCI6MjA5NDg5NTIyMn0.5dMz9YXT41xN8LOFsH_1GWD88ZU1Ae42AdVKB_PAYQM',
  };
})();
