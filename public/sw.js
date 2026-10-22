/**
 * Service Worker — OnStyle Barbearia
 * Cache-first para assets estáticos, network-first para API/SSR.
 * Garante carregamento mesmo em redes WiFi com DNS restritivo.
 */

const CACHE_NAME = "onstyle-v2";

// Assets que sempre devem ser cacheados após o primeiro acesso
const STATIC_PATTERNS = [
  /\.js(\?|$)/,
  /\.css(\?|$)/,
  /\.woff2?(\?|$)/,
  /\.png(\?|$)/,
  /\.jpe?g(\?|$)/,
  /\.svg(\?|$)/,
  /\.ico(\?|$)/,
  /\.webmanifest(\?|$)/,
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
];

// Rotas que NUNCA devem ser interceptadas pelo SW
const BYPASS_PATTERNS = [
  /\/_build\//,
  /\/api\//,
  /supabase/,
  /lovable\.cloud/,
];

function isStatic(url) {
  return STATIC_PATTERNS.some((re) => re.test(url));
}

function shouldBypass(url) {
  return BYPASS_PATTERNS.some((re) => re.test(url));
}

// ─── Install: pré-cacheia o shell mínimo ─────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        "/",
        "/manifest.webmanifest",
        "/logoonstyle.png",
        "/onstylefundo.jpeg",
      ]).catch(() => {
        // Ignora se algum asset não estiver disponível no install
      })
    )
  );
  self.skipWaiting();
});

// ─── Activate: limpa caches antigos ──────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch: estratégia híbrida ────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = req.url;

  // Ignora requisições não-GET e rotas de bypass
  if (req.method !== "GET" || shouldBypass(url)) return;

  if (isStatic(url)) {
    // Cache-first para assets estáticos (CSS, JS, fontes, imagens)
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          if (fresh.ok) cache.put(req, fresh.clone());
          return fresh;
        } catch {
          return cached || new Response("Offline", { status: 503 });
        }
      })
    );
  } else {
    // Network-first para páginas HTML (SSR) — fallback para cache
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            caches.open(CACHE_NAME).then((c) => c.put(req, res.clone()));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return (
            cached ||
            caches.match("/") ||
            new Response("Sem conexão. Reconecte-se e tente novamente.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        })
    );
  }
});
