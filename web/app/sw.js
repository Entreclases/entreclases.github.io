/* Entreclases — funcionamiento sin conexión */
const CACHE = "cuaderno-v87";
const FILES = ["./", "./index.html", "./styles.css", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  "./fonts/inter-latin.woff2", "./fonts/poppins-600.woff2", "./fonts/poppins-700.woff2", "./fonts/poppins-800.woff2",
  "./js/qrcode.js", "./js/config.js", "./js/helpers.js", "./js/auth.js", "./js/sync.js", "./js/views.js", "./js/events.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Solo la app propia se guarda en caché. Las llamadas al servidor de
  // sincronización (Supabase) van siempre directo a la red.
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  // Portal de invitados: página pública sin sesión, pensada para gente sin la app instalada —
  // fuera del precache y de la interceptación a propósito, para que siempre pegue a la red.
  if (url.pathname.endsWith("/portal.html") || url.pathname.endsWith("/js/portal.js")) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(
      (hit) => hit || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
