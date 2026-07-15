# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Cuaderno de seguimiento" — a product (in Spanish) for a math tutor to track students: exam dates, topic progress, class logs, and mock-exam ("simulacro") results, with accounts and cross-device sync backed by a single shared Supabase project (multi-tenant via RLS — see `web/app/js/config.js`'s `SUPA_URL`/`SUPA_ANON_KEY`). It ships as a PWA, a desktop app via Tauri (packaging lives in a separate repo, `cuaderno-desktop`, currently paused — see below), and (in progress) an Android app via Capacitor.

`web/` is the site published to GitHub Pages, and has two independent, self-contained parts:
- `web/index.html` — the marketing/landing page (product site root). Static HTML/CSS/JS, no shared state with the app, links to `./app/` and to GitHub Releases for downloads.
- `web/app/` — the actual application: `index.html` (HTML skeleton only — no inline CSS/JS, see "Architecture" below), `styles.css`, `js/*.js` (vanilla JS split into six classic scripts), `sw.js` (service worker), `manifest.webmanifest` (PWA manifest), `icon-*.png`. This is what the Capacitor build wraps directly, and what the separate `cuaderno-desktop` repo's Tauri build wraps as a sibling-repo directory.

There is no build system, no package manager, and no dependencies for either the landing page or the app — both are hand-authored, self-contained files. `web/` lives outside the repo root (rather than files sitting at the repo root) so that a directory containing only deployable web assets can be pointed at directly — originally so this repo's own `src-tauri/frontendDist` wouldn't sweep in `node_modules/`/`.git/`/`src-tauri/target/`, and now so `cuaderno-desktop`'s `tauri.conf.json` can reference `../../manugandini53-design.github.io/web/app` as a clean sibling path with nothing extra in it.

## Running / testing

There is no build, lint, or test tooling.

- Open `web/index.html` (landing) or `web/app/index.html` (app) directly in a browser. `localStorage` and rendering work over `file://`; the app's JS is six classic `<script src>` files (no `type="module"`), so `file://` loads them all without hitting the CORS restrictions that ES modules run into locally.
- The app's service worker only registers over `http(s)://` and never inside Tauri/Capacitor (see `IS_NATIVE` in `web/app/js/config.js` and the guard at the bottom of `web/app/js/events.js`), so to exercise offline/PWA/caching behavior, serve the `web/` directory with any static file server (e.g. `python -m http.server` from `web/`, or `npx serve web` from the repo root) rather than opening the file directly. The service worker's default scope is `/app/` (it's registered via a bare relative `"sw.js"` from a script that lives in `app/`), so it never intercepts requests for the landing page.
- After editing anything under `web/app/` (`index.html`, `styles.css`, or any `js/*.js`), bump `CACHE` in `web/app/sw.js` and make sure its `FILES` array still lists every precached file — the service worker only picks up new/changed files on install, and stale caches are only evicted for keys that don't match `CACHE`.
- Manual testing only: exercise flows in the browser (login/signup, create/edit/delete a student, cycle topic/semaforo state, log a class/simulacro, export/import JSON, offline behavior, logout).

## PWA deployment (GitHub Pages)

`.github/workflows/deploy-pages.yml` publishes the whole `web/` directory (landing at the site root, app at `/app/`) to GitHub Pages automatically on every push to `main` that touches `web/**` (via `actions/upload-pages-artifact` + `actions/deploy-pages`). The repo's Settings → Pages → Source must be set to "GitHub Actions" (not "Deploy from a branch") for this to take effect.

Note: any PWA installed from the site root *before* the landing page existed will keep opening to the landing page under its old install, since its service worker scope was `/`. Users need to uninstall that and reinstall from `/app/` instead — the current app can only be installed from within `/app/`.

## Desktop packaging (Tauri) — moved to its own repo, currently paused

The Tauri wrapper (`src-tauri/`, `scripts/generate-latest-json.js`, and the desktop-only `package.json`/`@tauri-apps/cli` dependency) used to live in this repo but was moved out to its own repo, [`cuaderno-desktop`](https://github.com/manugandini53-design/cuaderno-desktop), so its build tooling has its own history separate from the app's. **That repo is currently paused** — its README documents how to resume (cloning both repos as siblings, where the private signing key lives, which env vars a release build needs) and flags a pending decision about whether future desktop releases keep publishing from this repo or move to `cuaderno-desktop`. Nothing about `identifier`, the updater `pubkey`, or the updater `endpoints` changed in that move.

What stays in *this* repo, because it's part of the app's own JS rather than native build tooling:

- `window.__TAURI__` (injected by Tauri) and `window.Capacitor` (injected by Capacitor) are detected via `IS_NATIVE` in `web/app/js/config.js` — used to skip service worker registration, since a native shell resolves local files itself and doesn't need it.
- `web/app/js/events.js`'s `checkTauriUpdate()` (called on startup, Tauri-only) calls `window.__TAURI__.updater.check()` — exposed globally because `cuaderno-desktop`'s `tauri.conf.json` sets `app.withGlobalTauri: true`, no bundler/import needed — and if an update is found, asks the user via `confirm()` before downloading, installing, and relaunching. The pre-existing generic "nueva versión disponible" banner (`checkForNewVersion()`) only runs on Capacitor/Android, which still has no in-app updater.
- The already-published desktop releases (v1.1.0, v1.2.0, with their `.msi`/`setup.exe` installers) live in this repo's GitHub Releases, same as before — they weren't moved or touched, and the updater `endpoints` in `cuaderno-desktop`'s `tauri.conf.json` still point here.

## Android packaging (Capacitor)

`android/` wraps `web/app/` as a native Android app via Capacitor. `capacitor.config.json` at the repo root sets `webDir: "web/app"` — same source files as the PWA and the Tauri build, no separate copy to maintain by hand.

- Capacitor does not serve `web/app/` live like Tauri does — it **copies** it into `android/app/src/main/assets/public` (gitignored, regenerated) whenever you run `npx cap sync` or `npx cap copy android`. Run that after editing anything in `web/app/` and before rebuilding the Android app; otherwise the APK ships stale assets.
- `window.Capacitor` (checked by `IS_NATIVE` in `web/app/js/config.js`, alongside `window.__TAURI__`) makes the service worker registration skip itself inside the Android app too.
- Building an APK requires Android Studio (JDK + Android SDK); open the project with `npx cap open android` or directly at `android/`. Verified working: builds and installs on a physical device. Gradle/AGP versions in `android/build.gradle` and `android/gradle/wrapper/gradle-wrapper.properties` are pinned to whatever Android Studio's Upgrade Assistant last set them to — don't hand-edit those versions down, Android Studio will just re-upgrade them on next open.
- `android/.idea/` is gitignored (IDE/machine-local state — deployment target, run configs, etc.); each contributor's Android Studio regenerates it on first open.

## Landing page (`web/index.html`)

Pure static marketing page, entirely separate from the app's code/state — no shared JS, no localStorage use. Links to `./app/` for the web app and to GitHub Releases for native downloads. Its only dynamic behavior: a small inline script calls the public GitHub API (`GET /repos/manugandini53-design/manugandini53-design.github.io/releases/latest`) to populate the Windows download button with the actual latest `.exe` asset URL, version tag, and size, falling back to a link to the releases page if that call fails (offline, rate-limited, no release yet, etc.). Reuses the app's CSS custom properties (colors, font stack) for visual consistency but duplicates them locally, same as every other file in this repo — there's no shared stylesheet.

## Architecture (`web/app/`)

`index.html` is HTML only: `<head>` metadata (including the CSP `<meta>` tag), `<link rel="stylesheet" href="styles.css">`, `<div id="app">`, and six `<script src="js/...">` tags at the end of `<body>` — no inline `<style>` or `<script>`. There is no module system (`type="module"`), bundler, or router: the six files are classic scripts loaded in this exact order, sharing one global scope exactly as if they were still a single inline script:

1. **`js/config.js`** — constants only: storage keys, Supabase/GitHub URLs, `APP_VERSION`, `IS_NATIVE`/`detectPlatform()`, and static metadata objects (`TOPIC_META`, `STATUS_META`, `SEM_META`, `TAREA_META`, `defaultCatalog()`).
2. **`js/helpers.js`** — generic, feature-agnostic utilities: `esc()`, date helpers (`daysTo`/`fmtDate`/`fmtDateTime`), `uid()`; the mutable `state` object itself and its core mutators (`load`/`save`/`update`/`emptyStudent`/`touchCatalog`/`studentAlerts`); and session-token storage (cookie helpers, `getSes`/`setSes`/`sesIsAdmin`, `jwtSub`, remembered emails).
3. **`js/auth.js`** — login, signup, password recovery, email confirmation, token refresh: `doLogin`, `doSignup`, `ensureToken`, `storeSession`, `loadRole`, `setNewPassword`, `parseRecoveryHash`, `friendlyAuthError`.
4. **`js/sync.js`** — the Supabase sync cycle (`syncNow` and its merge helpers), automatic backups, and the "reportar un problema" / admin-reportes API calls.
5. **`js/views.js`** — every `v*()` view-builder, the small presentation helpers they share (`semDot`/`pill`/`tabbtn`/`syncStatusText`), and `render()` itself.
6. **`js/events.js`** — the startup version-check/auto-update logic, the two delegated `document` listeners (`click`/`change`), and the bootstrap block at the very end (`load(); render(); syncNow(); ...` plus the service worker registration guard).

Load order matters for top-level `const`/`let` only (e.g. `state = {catalog: defaultCatalog()}` in `helpers.js` needs `defaultCatalog` from `config.js`, already loaded). Code *inside a function body* can reference anything from any of the six files regardless of order, since nothing actually calls those functions until well after all six have finished loading (a click, the sync timer, or the bootstrap calls at the end of `events.js`). When adding new code, put it in the file matching its theme above rather than wherever's convenient — that's the whole point of the split.

- **State**: a single mutable `state` object (students, catalog, current view/tab/filters, sync/auth status), defined in `helpers.js`. `state.students` is the source of truth for all tutoring data; `state.catalog` holds configurable careers/subjects/units.
- **Render loop**: `render()` (`views.js`) rebuilds the *entire* `#app` innerHTML from `state` on every change. It gates on auth first: if `state.recovery` is set it shows only `vSetPassword()`; else if there's no saved session (`!getSes()`) it shows only `vAuth()` (login/signup) — no other view is reachable without a session. Once authenticated, it renders the normal app shell (`vTablero`, `vLista`, `vDetalle`, `vCuenta`, `vCatalog`, `vModal`). There's no diffing — this is a from-scratch string-template re-render, not a vdom.
- **Events**: one delegated `click` listener and one delegated `change` listener on `document` (`events.js`), dispatching on `data-a` (action) and `data-f`/`data-cf` (field) attributes read off `e.target.closest(...)`. To add a new interactive action: give the element `data-a="my-action"`, handle it in the big `if/else if` chain in the click listener, then call `render()` (falling through to the bottom) or `return` early if you already re-rendered via `update()`/`touchCatalog()`.
- **Persistence**: `save()` (`helpers.js`) writes `{students, catalog}` to `localStorage` under `KEY` on every mutation, then debounces a sync via `scheduleSync()` (`sync.js`). `update(id, patch)` and `touchCatalog()` are the two mutation helpers — both stamp `updatedAt: Date.now()`, which is also the conflict-resolution field for sync.
- **Backend / auth (single shared Supabase project, multi-tenant)**: `SUPA_URL`/`SUPA_ANON_KEY` (`config.js`) are embedded constants — every install of the app talks to the same Supabase project; per-user data isolation comes entirely from Supabase Auth + RLS on the `cuaderno` table (see `migraciones/001_cuaderno.sql` in the separate `cuaderno-supabase` repo, which versions the whole backend), not from per-device config. There is no `supabase-js` SDK — it's a hand-rolled client using raw `fetch` against the Auth (`/auth/v1/...`) and PostgREST (`/rest/v1/cuaderno`) endpoints. Session tokens live in a cookie on the web (`SES_KEY`, not `HttpOnly` — there's no backend of its own to set that flag, see `SEGURIDAD.md`) and in `localStorage` on native (Tauri/Capacitor) — separate either way from the app data key (`KEY`) so they don't round-trip through export/import or get wiped by a data restore.
- **Offline-first after login**: the auth gate in `render()` only checks whether a session is *saved* (`getSes()`), never whether its token is currently valid — so a device with no internet still opens straight to the app if it was logged in before. `syncNow()` checks `!navigator.onLine` **before** interpreting any fetch error, so a failed token refresh while offline degrades to an `"offline"` status instead of clearing the session; the session is only cleared (forcing re-login) when a refresh genuinely fails *while online* (revoked/invalid refresh token).
- **Password recovery**: `auth-forgot` POSTs to `/auth/v1/recover` with a `redirect_to` pointing back at the app's own URL. On load, `parseRecoveryHash()` looks for `#access_token=...&type=recovery` in the URL (set by Supabase's email link), stashes it in `state.recovery`, and strips the hash. While `state.recovery` is set, `render()` shows only `vSetPassword()`, which calls `setNewPassword()` (`PUT /auth/v1/user`) and then logs the user in with those tokens.
- **Error messages**: `friendlyAuthError(err)` (`auth.js`) maps known Supabase Auth error strings (bad credentials, already-registered email, unconfirmed email, offline, rate limits, etc.) to short Spanish messages; used everywhere an auth/sync `fetch` can fail. Prefer extending this over surfacing raw error text.
- **Catalog vs. per-student data**: `state.catalog.subjects[].units` defines the topic list for a subject; each student's `topics` map (topic name → status in `TOPIC_CYCLE`) is independent per-student data seeded from the catalog at creation time, so editing a subject's units later doesn't retroactively touch existing students' progress (see the hint text in `vCatalog`).
- **Soft delete**: students are never hard-deleted locally except by the 90-day sweep in `load()` (`s.deleted && updatedAt older than 90 days`); `confirm-del` just sets `deleted: true` so the deletion can propagate through sync before being purged.
- **PWA/offline**: `sw.js` cache-first serves same-origin GET requests (falling back to network, then to `./index.html` if both fail) and explicitly bypasses cross-origin requests so Supabase calls always hit the network. Its `FILES` precache list must include every file in `web/app/` that the app actually loads (`styles.css`, all six `js/*.js`) — a file missing from that list still works online (network fallback) but breaks offline.

## Conventions in this codebase

- Vanilla JS, no semicolons-optional style — existing code uses semicolons consistently; match it.
- All user-facing strings are in Spanish (Argentina locale, e.g. `toLocaleDateString("es-AR", ...)`); keep new UI text consistent with that.
- HTML is built via template strings; always run user-supplied text through `esc()` before interpolating into HTML to avoid XSS.
- Dates are stored as `YYYY-MM-DD` strings and compared/parsed via `daysTo()`/`fmtDate()`, which pin to noon local time to avoid timezone-boundary bugs — reuse these helpers rather than calling `new Date()` directly on stored date strings.
