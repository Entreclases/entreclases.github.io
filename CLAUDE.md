# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Cuaderno de seguimiento" — a single-page PWA (in Spanish) for a math tutor to track students: exam dates, topic progress, class logs, and mock-exam ("simulacro") results. No backend server of its own; optional cross-device sync goes directly to a user-configured Supabase project. It also ships as a desktop app via Tauri (see "Desktop packaging (Tauri)" below).

There is no build system, no package manager, and no dependencies for the web app itself. The entire app is `web/index.html` (HTML + CSS + vanilla JS in inline `<style>`/`<script>` tags). `web/sw.js` is the service worker, `web/manifest.webmanifest` is the PWA manifest, `web/icon-*.png` are app icons. These files live in `web/` (rather than the repo root) so that `src-tauri/`'s `frontendDist` can point at a directory containing only the deployable web assets, without sweeping in `node_modules/`, `.git/`, or `src-tauri/target/`.

## Running / testing

There is no build, lint, or test tooling for the web app.

- Open `web/index.html` directly in a browser to run the app. `localStorage` and rendering work over `file://`.
- The service worker only registers over `http(s)://` and never inside Tauri/Capacitor (see `IS_NATIVE` and the guard at the bottom of `web/index.html`), so to exercise offline/PWA/caching behavior, serve the `web/` directory with any static file server (e.g. `python -m http.server`) rather than opening the file directly.
- After editing `web/sw.js`, bump `CACHE` (currently `"cuaderno-v3"`) — the service worker only picks up new/changed files on install, and stale caches are only evicted for keys that don't match `CACHE`.
- Manual testing only: exercise flows in the browser (create/edit/delete a student, cycle topic/semaforo state, log a class/simulacro, export/import JSON, and — if testing sync — the Supabase config/login flow).

## Desktop packaging (Tauri)

`src-tauri/` wraps `web/` as a native Windows/macOS/Linux app — no bundler, no build step for the web files, which remain the single source of truth. `src-tauri/tauri.conf.json` sets `build.frontendDist` to `../web` directly (no `devUrl`, no `beforeDevCommand`/`beforeBuildCommand`).

- `npm install` once to fetch `@tauri-apps/cli` locally (dev dependency only, no bundler for the app code).
- `npm run tauri dev` to run the desktop app against the live files in `web/`.
- `npm run tauri build` to produce an installable bundle.
- `window.__TAURI__` (injected by Tauri) and `window.Capacitor` (injected by Capacitor, if ever added) are detected via `IS_NATIVE` near the top of `web/index.html`'s script — used to skip service worker registration, since a native shell resolves local files itself and doesn't need it.
- If you regenerate icons from `web/icon-512.png`, run `npx tauri icon web/icon-512.png` from the repo root; it writes into `src-tauri/icons/`.

## Architecture

Everything lives in `index.html`'s `<script>` block as one flat, dependency-free program. There is no module system, framework, or router.

- **State**: a single mutable `state` object (students, catalog, current view/tab/filters, sync status). `state.students` is the source of truth for all tutoring data; `state.catalog` holds configurable careers/subjects/units.
- **Render loop**: `render()` rebuilds the *entire* `#app` innerHTML from `state` on every change (`vTablero`, `vLista`, `vDetalle`, `vSync`, `vCatalog`, `vModal` each return an HTML string for one view/section). There's no diffing — this is a from-scratch string-template re-render, not a vdom.
- **Events**: one delegated `click` listener and one delegated `change` listener on `document`, dispatching on `data-a` (action) and `data-f`/`data-cf` (field) attributes read off `e.target.closest(...)`. To add a new interactive action: give the element `data-a="my-action"`, handle it in the big `if/else if` chain in the click listener, then call `render()` (falling through to the bottom) or `return` early if you already re-rendered via `update()`/`touchCatalog()`.
- **Persistence**: `save()` writes `{students, catalog}` to `localStorage` under `KEY` on every mutation, then debounces a sync via `scheduleSync()`. `update(id, patch)` and `touchCatalog()` are the two mutation helpers — both stamp `updatedAt: Date.now()`, which is also the conflict-resolution field for sync.
- **Sync (optional, per-device opt-in)**: hand-rolled Supabase client using raw `fetch` against the Auth (`/auth/v1/...`) and PostgREST (`/rest/v1/cuaderno`) endpoints — no `supabase-js` SDK. Config (`CFG_KEY`, project URL + anon key) and session tokens (`SES_KEY`) live in `localStorage`, separate from the app data key so they don't round-trip through export/import or get wiped by a data restore. `syncNow()` fetches the remote row, merges students by `mergeStudents()` (last-write-wins per student via `updatedAt`), and upserts. It's called on load, on `online` events, on a 5-minute interval, and 1.5s after any local save (debounced via `scheduleSync()`). The app is fully usable offline; sync is best-effort and silently degrades to `offline`/`error` status shown in the header.
- **Catalog vs. per-student data**: `state.catalog.subjects[].units` defines the topic list for a subject; each student's `topics` map (topic name → status in `TOPIC_CYCLE`) is independent per-student data seeded from the catalog at creation time, so editing a subject's units later doesn't retroactively touch existing students' progress (see the hint text in `vCatalog`).
- **Soft delete**: students are never hard-deleted locally except by the 90-day sweep in `load()` (`s.deleted && updatedAt older than 90 days`); `confirm-del` just sets `deleted: true` so the deletion can propagate through sync before being purged.
- **PWA/offline**: `sw.js` cache-first serves same-origin GET requests (falling back to network, then to `./index.html` if both fail) and explicitly bypasses cross-origin requests so Supabase calls always hit the network.

## Conventions in this codebase

- Vanilla JS, no semicolons-optional style — existing code uses semicolons consistently; match it.
- All user-facing strings are in Spanish (Argentina locale, e.g. `toLocaleDateString("es-AR", ...)`); keep new UI text consistent with that.
- HTML is built via template strings; always run user-supplied text through `esc()` before interpolating into HTML to avoid XSS.
- Dates are stored as `YYYY-MM-DD` strings and compared/parsed via `daysTo()`/`fmtDate()`, which pin to noon local time to avoid timezone-boundary bugs — reuse these helpers rather than calling `new Date()` directly on stored date strings.
