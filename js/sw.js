/* Service worker: guarda os arquivos do jogo no aparelho para abrir rápido.
   O nome da cópia vem da versão (?v= que o mobile.js manda, lida do js/versao.js):
   versão nova = cópia nova, e a antiga é apagada. */
const VERSAO_SW = new URL(self.location).searchParams.get('v') || 'dev';
const CACHE = 'arena-v' + VERSAO_SW;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(nomes => Promise.all(nomes.filter(n => n.startsWith('arena-') && n !== CACHE).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

function guardar(pedido, resposta){
  if (resposta.ok) { const copia = resposta.clone(); caches.open(CACHE).then(c => c.put(pedido, copia)); }
  return resposta;
}

self.addEventListener('fetch', e => {
  const pedido = e.request, url = new URL(pedido.url);
  if (pedido.method !== 'GET' || url.origin !== self.location.origin) return;   // fontes e imagens de fora: direto da internet
  // a página e o versao.js: internet primeiro (para achar versão nova); sem internet, a cópia
  if (pedido.mode === 'navigate' || url.pathname.endsWith('/js/versao.js')) {
    e.respondWith(fetch(pedido).then(r => guardar(pedido, r)).catch(() => caches.match(pedido)));
    return;
  }
  // o resto (js, css, modelos): a cópia; se ainda não tem, baixa e guarda
  e.respondWith(caches.match(pedido).then(salvo => salvo || fetch(pedido).then(r => guardar(pedido, r))));
});
