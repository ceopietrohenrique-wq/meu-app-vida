// Service worker mínimo da Fase 0: app shell + página offline + cache de
// assets estáticos. Sem Web Push ainda (chega na Fase 7) e sem cachear
// nenhuma resposta que possa conter dado privado do usuário.
const CACHE_NAME = "app-shell-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [OFFLINE_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Nunca interceptar chamadas de terceiros (Supabase, etc.) — evita cachear
  // dado privado e evita quebrar autenticação/CORS.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request)
          .then((response) => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached ?? networkFetch;
      }),
    );
  }
});

// Fase 7 — Web Push. O payload é sempre JSON assinado/enviado pela Edge
// Function de envio (supabase/functions/send-push), nunca lido de outra
// fonte. Falha de parse não pode quebrar o listener — mostra um fallback
// genérico em vez de não mostrar nada.
self.addEventListener("push", (event) => {
  let payload = { title: "Nova notificação", body: "", url: "/" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // payload não era JSON válido — mantém o fallback.
  }

  const options = {
    body: payload.body,
    // Mesmo ícone gerado dinamicamente do manifest (src/app/icons/icon-192)
    // — nunca um asset estático paralelo para o mesmo ícone.
    icon: "/icons/icon-192",
    badge: "/icons/icon-192",
    data: { url: payload.url || "/" },
    tag: payload.tag,
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

// Clique na notificação: foca uma janela já aberta na mesma origem quando
// existir, em vez de sempre abrir uma nova aba — e navega para a URL de
// destino nela. Só abre uma nova janela quando nenhuma está aberta.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsList) => {
        for (const client of clientsList) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            client.postMessage({ type: "notification-click", url: targetUrl });
            return client.focus().then(() => {
              if ("navigate" in client) return client.navigate(targetUrl);
            });
          }
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});
