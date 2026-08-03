# browser-check

Herramienta de desarrollo interna — **no forma parte de la app publicada**
(`web/`). Reemplaza a `chromium-cli` (no instalable en este entorno Windows)
para poder abrir `web/app/` en Chromium headless, clickear, y sacar capturas
antes de dar un cambio de UI por probado.

## Instalación (una sola vez por máquina)

```bash
cd tools/browser-check
npm install
npx playwright install chromium
```

## Uso

1. Levantar el server de la app (desde la raíz del repo):
   ```bash
   npx serve web -l 8000
   ```
2. Escribir un script de comandos (uno por línea) y pipearlo:
   ```bash
   cd tools/browser-check
   node check.js <<'EOF'
   nav http://localhost:8000/app/?demo=1
   wait-for text=Tablero
   screenshot tablero
   console-errors
   EOF
   ```

Las capturas quedan en `tools/browser-check/screenshots/` (gitignoreado).

## Comandos soportados

| Comando | Qué hace |
|---|---|
| `nav <url>` | Navega a esa URL |
| `wait-for text=<texto>` | Espera hasta que ese texto aparezca en la página |
| `wait-for <selector css>` | Espera hasta que ese selector exista |
| `click <selector>` | Click en el selector (CSS) |
| `fill <selector> <valor>` | Escribe un valor en un input/textarea |
| `press <tecla>` | Simula una tecla (`Enter`, `Escape`, etc.) |
| `eval <código JS>` | Corre ese código como statements en la página (no envuelve en `return`, escribilo vos si necesitás el valor) — útil para inyectar datos de prueba, ej: `eval state.students[0].subjectId="no-existe"; render();` |
| `screenshot [nombre]` | Captura de página completa |
| `console-errors` | Imprime los errores de consola acumulados hasta ahora |
| `sleep <ms>` | Espera fija (usar sólo si `wait-for` no aplica) |

## Notas

- Esta app es vanilla JS sin build: `state`, `render()`, `esc()`, etc. son
  globales, así que `eval` puede leerlos/llamarlos directo (ver
  `ARQUITECTURA.md` del repo para qué función vive en qué archivo).
- `localhost`/`127.0.0.1` usa automáticamente el backend `entreclases-dev`
  (ver `CLAUDE.md` — "Cómo trabajamos"), nunca producción.
- Para simular datos sin loguearse, `?demo=1` carga `buildDemoData()` fresco
  en cada `nav` (no persiste en `localStorage`) — para probar contra datos
  reales hace falta loguearse con una cuenta de prueba en `entreclases-dev`.
