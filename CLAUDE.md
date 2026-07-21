# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Cuaderno de seguimiento" — a product (in Spanish) for a math tutor to track students: exam dates, topic progress, class logs, and mock-exam ("simulacro") results, with accounts and cross-device sync backed by a single shared Supabase project (multi-tenant via RLS — see `web/app/js/config.js`'s `SUPA_URL`/`SUPA_ANON_KEY`). Ships as a PWA, plus desktop (Tauri) and Android (Capacitor) wrappers packaged in the sibling repos `cuaderno-desktop`/`cuaderno-android` — both currently paused, see their own READMEs to resume.

`web/` is what's published to GitHub Pages, with three independent parts: `web/index.html` (static landing, no shared state), `web/app/` (the actual PWA — `index.html` skeleton, `styles.css`, `js/*.js`, `sw.js`, `manifest.webmanifest`; see `ARQUITECTURA.md` for the JS layout), and `web/app/portal.html`+`js/portal.js` (public guest-student page, no session/localStorage, outside the service worker, via the RPC `portal_publico()` which never exposes the token or user_id).

No build system, no package manager, no dependencies anywhere in this repo — everything is hand-authored. The backend (schema, RLS, RPCs) lives entirely in the separate [`cuaderno-supabase`](https://github.com/manugandini53-design/cuaderno-supabase) repo as numbered SQL migrations; this repo can't run SQL directly, so any migration is handed to the user as a snippet to paste into the Supabase SQL Editor, and must never be assumed already applied just because the file exists there.

## REGLAS INQUEBRANTABLES

- Cualquier cambio a `web/app/styles.css`, a los assets (`icon-*.png`, fuentes, etc.) o a la lista de precache sube el número de `CACHE` en `web/app/sw.js` (y actualiza `FILES` si corresponde) — si no, el service worker sigue sirviendo la versión vieja.
- No tocar `js/sync.js`, `js/auth.js` ni el formato del JSON del cuaderno salvo pedido explícito del usuario. Todo cambio de formato debe ser retrocompatible con cuadernos viejos (el código que lee datos existentes tiene que seguir funcionando con el formato anterior).
- Una línea al `CHANGELOG.md` por paso.
- Un commit por paso, con push.
- Probar que lo viejo siga andando antes de commitear (no solo la funcionalidad nueva).
- Nada de librerías externas ni CDNs — la CSP del proyecto (`web/app/index.html`, `web/app/portal.html`) no las permite.
- Todos los textos de cara al usuario van SIEMPRE en castellano rioplatense (vos, tenés, agendá — nunca "tú"/"tienes"/"agenda" en tono neutro).

## Cómo trabajamos (dev/main)

- Todo el desarrollo pasa por la rama `dev`: un commit por paso, push a `origin dev` apenas termina cada paso.
- Nunca commitear/pushear/mergear a `main` salvo pedido explícito de Manuel — `main` es la versión estable publicada.
- Los checkpoints de versión (bump de `APP_VERSION`, línea de `CHANGELOG.md`, tag) se hacen en `dev`.
- El merge de `dev` a `main` lo dispara Manuel al cerrar una hoja de trabajo (o para un hotfix aprobado) — es lo único que dispara `deploy-pages.yml` y publica en GitHub Pages.
- Hay DOS proyectos Supabase: `entreclases-dev` (usado automáticamente en `localhost`/`127.0.0.1`, ver `SUPA_DEV`/`IS_BACKEND_DEV` en `config.js`) y producción (la web publicada). Toda migración SQL nueva se entrega primero para pegar en `entreclases-dev`, se acumula versionada en `cuaderno-supabase`, y recién va a producción en el cierre de hoja — deben ser aditivas y retrocompatibles (mismo criterio que el formato del JSON del cuaderno).
- Al arrancar una sesión nueva, levantar el servidor local (`npx serve web -l 8000`, ver "Running/testing") y avisar la URL sin que haga falta pedirlo.

## Cómo trabajar barato

- Antes de abrir un archivo de `web/app/js/`, consultá `ARQUITECTURA.md` para saber cuál lo tiene, y usá Grep para ubicar la función exacta — no abras un `views-*.js` entero a ciegas.
- Leé sólo el fragmento relevante (offset/limit de Read), no el archivo completo, salvo que necesites entender el contexto de toda una vista.
- No releas un archivo entero después de editarlo: si Edit no tiró error, el cambio ya aplicó.
- No repitas en la respuesta código que ya escribiste en una edición — la respuesta es un resumen breve más la sección CÓMO VERIFICAR, no un diff a mano.

## Architecture (`web/app/js/`)

Classic `<script src>` tags (no bundler, no `type="module"`), loaded in a fixed order from `index.html`, sharing one global scope: `config.js` → `helpers.js` → `auth.js` → `sync.js` → nine `views-*.js` files → `events.js`. Ver `ARQUITECTURA.md` para qué archivo tiene qué vista/función — es el índice para no tener que escanear todo. Load order only matters for top-level `const`/`let` init (functions can call anything regardless of file, since nothing runs until well after all scripts loaded).

- **State**: one mutable `state` object (`helpers.js`) — `state.students` is the source of truth, `state.catalog` holds careers/subjects/units.
- **Render**: `render()` (`views-core.js`) rebuilds the *entire* `#app` innerHTML from `state` on every change, no diffing. Gates on auth first (`vSetPassword`/`vAuth` if no session), then renders the normal shell.
- **Events**: one delegated `click` and one `change` listener on `document` (`events.js`), dispatching on `data-a`/`data-f`/`data-cf` attributes.
- **Persistence**: `save()` (`helpers.js`) writes to `localStorage` under `KEY`, then debounces a sync (`sync.js`). `updatedAt` is the conflict-resolution field.
- **Backend**: single shared Supabase project, hand-rolled `fetch` client (no SDK), isolation via Auth+RLS. Session tokens in a cookie (web) or `localStorage` (native), separate from `KEY`.
- **Offline-first after login**: the auth gate only checks a session is *saved*, not that it's valid — see `syncNow()`'s `navigator.onLine` check before treating a failed refresh as a real logout.
- **Papelera (soft delete)**: deleted students/subjects get `deleted`/`catalog.trash` instead of being removed, restorable for `TRASH_DAYS` days.
- **PWA/offline**: `sw.js` cache-first same-origin GETs; its `FILES` list must include every file the app loads.

## Conventions

- Vanilla JS, semicolons; match existing style.
- All user-facing strings in Spanish (Argentina locale).
- HTML via template strings; always `esc()` user-supplied text before interpolating.
- Dates are `YYYY-MM-DD` strings via `daysTo()`/`fmtDate()` (noon-pinned) — don't call `new Date()` directly on them.

## Running / testing

No build, lint, or test tooling.

- Open `web/index.html` or `web/app/index.html` directly in a browser for quick checks (`file://` works fine, no ES modules involved).
- For service worker/offline/PWA behavior, or for anything that talks to Supabase, serve `web/` with a static server instead: `npx serve web -l 8000` (no working Python in this environment; `python -m http.server` is the alternative where Python is available). On `localhost`/`127.0.0.1` the SW never registers (and any previous one auto-unregisters) and the backend switches automatically to `entreclases-dev` — see "Cómo trabajamos (dev/main)". Force production from localhost with `?backend=prod` (asks for confirmation first).
- After editing anything under `web/app/`, bump `CACHE` in `web/app/sw.js` and make sure `FILES` still lists every precached file.
- Manual testing only: login/signup, create/edit/delete a student, topic/semaforo cycling, log a class/simulacro, export/import JSON, offline, logout.

## PWA deployment (GitHub Pages)

`.github/workflows/deploy-pages.yml` publishes `web/` on every push to `main` touching `web/**`. Settings → Pages → Source must be "GitHub Actions". Desktop (Tauri, `cuaderno-desktop`) / Android (Capacitor, `cuaderno-android`) wrappers are paused sibling repos — what stays here is just `IS_NATIVE`/`detectPlatform()` (`config.js`) and `checkTauriUpdate()` (`events.js`).

### Rollback si una versión sale mal

1. `git revert` de los commits problemáticos (nunca `git reset --hard` sobre `main` ya pusheado); hay tags de versiones estables conocidas-buenas (ver `git tag`).
2. `git push` — el mismo workflow redeploya solo.
3. Bumpear `CACHE` en `sw.js` como parte del revert si no cambió solo.
4. Si había una migración SQL ya aplicada, evaluar si hace falta una migración inversa a mano (no hay rollback automático de SQL).
5. Verificar en `https://entreclases.github.io` (puede tardar en propagar y en que cada usuario vea el toast de actualización).

## Cómo prueba el usuario

La app publicada vive en https://entreclases.github.io (GitHub Pages, desplegada por `deploy-pages.yml` en cada push a `main` que toque `web/**`). Hay un modo demo en `/app/?demo=1`. El service worker cachea agresivo: si un cambio no se ve, hay que esperar el toast de "nueva versión disponible" o forzar con Ctrl+Shift+R.

## REGLA MÁS IMPORTANTE: CÓMO VERIFICAR

Toda respuesta, sin excepción a partir de este punto, termina con una sección `## CÓMO VERIFICAR`: un checklist paso a paso, click por click, para que el usuario confirme en la app publicada (o en local) que cada cambio de la respuesta funciona. Para cada cambio, incluir:
- Qué abrir (URL/pantalla) y qué tocar (botón, campo, acción).
- Qué tiene que ver si salió bien, y qué señal indica que algo está mal.
- Si el cambio es visual o toca algo usado en mobile, qué chequear específicamente en mobile.
- Si el cambio toca estilos/tema, qué chequear en modo oscuro.
- Si el paso incluyó una migración SQL, recordar explícitamente subirla al SQL Editor de Supabase (este repo no la aplica solo).
