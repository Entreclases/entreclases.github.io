/* Entreclases — funcionamiento sin conexión */
const CACHE = "cuaderno-v127";
const FILES = ["./", "./index.html", "./styles.css", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  "./fonts/inter-latin.woff2", "./fonts/poppins-600.woff2", "./fonts/poppins-700.woff2", "./fonts/poppins-800.woff2",
  "./js/qrcode.js", "./js/config.js", "./js/helpers.js", "./js/auth.js", "./js/sync.js", "./js/views.js", "./js/events.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  // Ya no hay skipWaiting() acá: el SW nuevo se queda "esperando" (registration.waiting)
  // hasta que la app lo pide explícitamente (ver el mensaje SKIP_WAITING más abajo) —
  // así la pestaña abierta puede avisar antes de recargar, en vez de cambiar el código
  // por debajo sin avisar (paso 99, "Actualización asistida").
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

// Recordatorio de las clases del día (paso 108): payload simple {title, body} armado por la
// Edge Function enviar-push (cuaderno-supabase) — sin datos sensibles adentro, así que no hace
// falta descifrar nada especial más allá de lo que ya resuelve el navegador (cifrado del
// transporte, RFC 8291). Si el push llega sin body parseable, se muestra un texto genérico.
self.addEventListener("push", (e) => {
  let data = { title: "Entreclases", body: "Tenés novedades." };
  try{ if(e.data) data = { ...data, ...e.data.json() }; }catch(err){}
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: "./icon-192.png",
    badge: "./icon-192.png",
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for(const c of list) if("focus" in c) return c.focus();
      return self.clients.openWindow("./");
    })
  );
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
