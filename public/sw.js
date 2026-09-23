// Service worker do app shell (Fase 0) + Web Push (Fase 7) + offline shell
// refinado (Fase 8). Ver docs/business-rules.md > Fase 8 > Service worker
// para a estratégia de cache completa e o racional de cada regra.
//
// ESTRATÉGIA DE CACHE (resumo — nunca mude sem atualizar a doc):
//   - Navegação (HTML de página): network-first, cai para /offline.html se
//     a rede falhar. Nunca cacheia o HTML das páginas em si — são todas
//     dinâmicas/autenticadas (ƒ no build do Next.js), cachear a resposta
//     arriscaria mostrar dado de um usuário para outro no mesmo browser.
//   - `/_next/static/*` (JS/CSS com hash no nome, imutável por definição):
//     stale-while-revalidate — serve do cache na hora, atualiza em
//     background. Seguro porque o nome do arquivo muda a cada build.
//   - Ícones do manifest (`/icons/*`) e o próprio manifest: cache-first com
//     fallback de rede — são assets públicos, iguais para todo usuário,
//     raramente mudam, e são o que garante o ícone aparecer mesmo offline.
//   - Chamadas de outra origem (Supabase — API REST, Auth, Storage): NUNCA
//     interceptadas. Nunca cacheadas. Garante que nenhum dado privado do
//     usuário fica em cache do service worker.
//   - Qualquer request que não seja GET: nunca interceptado (mutations
//     sempre vão direto pra rede — cachear POST/PUT/DELETE não faz
//     sentido e poderia mascarar falha real de escrita).
//
// CACHE_NAME muda a cada mudança de estratégia — `activate` já limpa
// qualquer cache com nome antigo, então trocar a versão aqui é a forma
// correta de invalidar o que os usuários já instalaram (nunca editar o
// conteúdo de um cache existente in-place).
const CACHE_NAME = "app-shell-v2";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192",
  "/icons/icon-512",
];

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
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
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
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
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
    return;
  }

  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        cache.put(request, response.clone());
        return response;
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
