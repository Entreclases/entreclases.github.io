# Auditoría de seguridad — Cuaderno de seguimiento

Fecha: 2026-07-14. Alcance: todo el repo (`web/`, `android/`, `src-tauri/`, historial
de git). No incluye una revisión del propio proyecto Supabase más allá de lo que se
puede inferir del código y de `supabase-setup.sql` — ver la sección 5 para lo que
falta confirmar a mano en el dashboard.

## Resumen ejecutivo

- **Historial de git**: limpio. Nunca se commiteó un keystore, clave privada ni
  contraseña.
- **Gitignores**: cubrían lo pedido; se agregó una capa extra a nivel raíz.
- **XSS**: se encontraron y arreglaron **dos huecos reales** (ver sección 3).
- **CSP**: agregada a `web/app/index.html`, probada de punta a punta contra un
  build real de la app de escritorio (screenshot + consola de DevTools).
- **Supabase**: hay **dos cosas para confirmar a mano en el dashboard** que son
  las de mayor impacto de todo este informe — ver sección 5, están marcadas como
  prioridad alta.
- **Sesión**: diseño documentado en la sección 6; la limitación de no poder usar
  cookies `HttpOnly` es estructural (no hay servidor propio), no un descuido.

---

## 1. Historial de git

Se revisaron los 23 commits del historial (`git rev-list --all`), buscando:

- Cualquier archivo que alguna vez se haya llamado `*.keystore`, `*.jks`, `*.p12`,
  `*.pem`, `keystore.properties`, `local.properties`, `google-services.json` o
  `.env*` (incluyendo archivos borrados después) → **ninguno existió jamás**.
- Contenido con `-----BEGIN ... PRIVATE KEY-----`, tokens con forma de clave de
  AWS (`AKIA...`), de Slack (`xox...`), de GitHub (`ghp_...`), de Google
  (`AIza...`), o de Supabase `service_role`/`secret` → **ningún commit los
  contiene**.
- Todas las apariciones de "password"/"contraseña" en el historial son texto de
  interfaz (labels, mensajes de error) o el nombre de las variables de Gradle que
  leen `keystore.properties` (un archivo externo, gitignorado, nunca commiteado)
  — no hay ningún valor real de contraseña en ningún commit.

La `SUPA_ANON_KEY` embebida en `web/app/index.html` **no es un secreto** — es la
clave pública ("anon"/"publishable") de Supabase, diseñada para vivir en el
cliente; la seguridad real la dan las políticas RLS (sección 5), no el secreto de
esa clave. Está documentado así en `CLAUDE.md` y es el diseño esperado.

**No hay nada que rotar ni limpiar del historial.**

## 2. Gitignores

- `android/.gitignore` ya cubría `*.jks`, `*.keystore`, `keystore.properties`,
  `local.properties`, `.idea/`, `build/`, `.gradle/` — completo para ese árbol.
- `.gitignore` de la raíz cubría `node_modules/`, `src-tauri/target/`,
  `src-tauri/gen/` — pero **no** tenía ninguna regla de claves/certificados a
  nivel raíz. Como los patrones de un `.gitignore` anidado (como el de
  `android/`) sólo aplican dentro de su propio subárbol, un `.keystore` o `.pem`
  creado por error en la raíz o dentro de `src-tauri/` no habría sido ignorado.
  **Corregido**: se agregaron `*.keystore`, `*.jks`, `*.p12`, `*.pem`, `*.key`,
  `keystore.properties`, `.env`, `.env.*` al `.gitignore` de la raíz, como
  defensa en profundidad (el proyecto no usa hoy ninguno de estos fuera de
  `android/`, pero tampoco cuesta nada cubrirlo).

## 3. XSS — texto de usuario sin escapar

Se revisó cada interpolación `${...}` dentro de un template HTML en
`web/app/index.html` (más de cien puntos) contra la lista de campos que el
usuario puede escribir: nombre/carrera/materia/cátedra/notas de alumno, temas y
notas de clases y simulacros, nombres de carreras/materias/unidades del
catálogo, mensaje/email de reportes, y el email de la cuenta. Se encontraron y
arreglaron dos huecos reales:

1. **El helper `opt()`** (usado para las opciones de "Carrera" en la ficha del
   alumno y para el estado del alumno) interpolaba `value` y el texto de la
   opción **sin pasar por `esc()`**. Como las carreras son texto libre que el
   profesor carga en "Materias y carreras", una carrera con un nombre como
   `x"><script>...` rompía el atributo `value="..."` e inyectaba HTML/JS en la
   ficha del alumno. Arreglado escapando ambos parámetros dentro del helper
   (cubre los dos lugares donde se usa).
2. **`syncStatusText()`** interpolaba `state.syncMsg` sin `esc()`, y esa función
   se inyecta con `innerHTML` en dos lugares (el header y el patch en vivo de
   `setStatus()`) que no envolvían el resultado en `esc()` — solo uno de los tres
   call sites lo hacía. Hoy no es explotable (`state.syncMsg` siempre sale de
   `friendlyAuthError()`, que sólo devuelve frases fijas en español, nunca el
   texto crudo del error), pero es una trampa latente: si mañana alguien hace que
   `friendlyAuthError` devuelva el mensaje real del error (algo tentador para
   debug), los dos call sites sin `esc()` quedan expuestos. Arreglado escapando
   adentro de la función (single source of truth) y sacando el `esc()` ahora
   redundante del único call site que ya lo tenía, para no escapar doble.

Ambos arreglos se probaron con un payload malicioso simulado
(`x"><script>alert(1)</script>`) confirmando que queda completamente
neutralizado en el HTML resultante.

El resto de la superficie (alumnos, clases, simulacros, catálogo, reportes,
emails, backups) ya pasaba por `esc()` correctamente.

## 4. Content-Security-Policy

Se agregó a `web/app/index.html`:

```
default-src 'none';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self';
font-src 'self';
manifest-src 'self';
worker-src 'self';
connect-src https://*.supabase.co https://api.github.com ipc: http://ipc.localhost;
base-uri 'none';
form-action 'self';
object-src 'none';
```

Decisiones de diseño:

- **`connect-src`** sólo permite Supabase y la API de GitHub (para el chequeo de
  nueva versión) — exactamente lo pedido. Se verificó contra **todos** los
  `fetch()` del archivo que no hay ningún otro destino.
- **`ipc: http://ipc.localhost`** en `connect-src` es lo que pide la
  documentación oficial de Tauri v2 para que su canal de comunicación
  interno (webview ↔ backend Rust) siga funcionando cuando la CSP se escribe a
  mano en el HTML en vez de vía `tauri.conf.json` (que la auto-genera). Sin esto
  el auto-update y cualquier otra llamada nativa se hubiera roto en la app de
  escritorio.
- **`script-src`/`style-src` necesitan `'unsafe-inline'`**: toda la app es un
  único `<script>` y cientos de atributos `style="..."` inline, sin build ni
  bundler que pueda generar nonces/hashes automáticamente en cada edición. Es la
  concesión más importante de esta política — significa que la CSP **no
  protege contra XSS si ya se coló un `<script>` inyectado** (por eso la
  sección 3 es la defensa real contra XSS, no esta CSP). Donde la CSP sí ayuda
  incluso con `unsafe-inline` en `script-src` es en **`connect-src`**: aunque un
  atacante lograra inyectar y ejecutar JS, no podría mandar datos robados a un
  servidor propio — sólo a Supabase o a la API de GitHub.
- **No se incluyó `frame-ancestors`**: el spec de CSP ignora esa directiva (y
  `sandbox`/`report-uri`) cuando la política se manda por `<meta>` en vez de por
  header HTTP — como el sitio es estático (GitHub Pages, sin servidor propio),
  no hay forma de mandar headers custom. Incluirla igual sólo generaría una
  advertencia de consola sin ningún efecto real.

**Verificación real hecha** (no sólo análisis estático):

1. Se armó la app de escritorio (`cargo build`, target fuera de OneDrive) con el
   CSP nuevo y se la lanzó de verdad.
2. Screenshot de la ventana: la app renderiza completa — estilos, datos de
   alumnos, botones — nada bloqueado.
3. Se abrió DevTools (F12) adentro de la app y se revisó la consola: el único
   error de CSP es un intento de Chromium de conectarse a
   `.well-known/appspecific/com.chrome.devtools.json` (un auto-descubrimiento
   propio de las DevTools, no algo que la app pida) — bloqueado correctamente,
   sin ningún efecto sobre la app. No hay ningún otro error de CSP: ni de
   script, ni de estilos, ni de las llamadas reales a Supabase.
4. Como la versión web/PWA y Android (Capacitor) cargan exactamente el mismo
   `index.html` con la misma CSP, esta prueba da bastante confianza para las
   tres plataformas — pero **no se pudo probar Android** (no hay un dispositivo/
   emulador conectado en este entorno) ni abrir un navegador de escritorio con
   una ventana visible para repetir el mismo chequeo de consola ahí. Recomiendo
   una pasada rápida manual en el navegador y en el celular la próxima vez que
   tengas ambos a mano — debería ser un no-evento dado lo anterior, pero no está
   de más confirmarlo.

## 5. Tablas de Supabase y qué garantiza cada RLS

| Tabla | Usada para | RLS según lo que hay en el repo |
|---|---|---|
| `cuaderno` | Datos de alumnos/catálogo, una fila por usuario | **Confirmado** en `supabase-setup.sql`: select/insert/update sólo con `auth.uid() = user_id`. Sin policy de `delete` (a propósito — el borrado es lógico, `deleted:true`, nunca `DELETE`). |
| `cuaderno_respaldos` | Snapshots diarios + respaldo antes de restaurar | **No está en ningún `.sql` del repo** — existe directo en el proyecto de Supabase. El cliente nunca filtra por `user_id` en sus lecturas (`select=id,created_at,data`), así que la separación entre cuentas depende 100% de que la RLS filtre por `auth.uid() = user_id` en select/insert/delete. |
| `reportes` | "Reportar un problema" (cualquier usuario) + panel de administración (sólo admin) | **No está en ningún `.sql` del repo.** El cliente pide `select=*` sin filtrar por usuario ni por admin — la app **depende enteramente de la RLS** para que un usuario común sólo pueda insertar (nunca leer) reportes ajenos, y para que sólo el admin pueda hacer `select=*` y el `PATCH` de `estado`. La pantalla de "Reportes" está oculta en la interfaz para quien no es admin, pero eso es sólo UI — cualquiera con su propio token podría pegarle directo al endpoint REST si la RLS no lo bloquea server-side. |
| `perfiles` | Rol del usuario (`profesor`/`admin`), leído una vez por sesión | Descripta en el pedido de esta tarea: cada usuario lee su fila, el admin lee todas, y sólo se puede actualizar `plataforma`/`version`/`last_seen_at` (nunca `rol`). El cliente (`loadRole()`) sólo hace `select=rol` — nunca escribe esa tabla. |

### Verificar a mano en el dashboard de Supabase (en criollo)

Esto es lo único de todo el informe que **yo no puedo confirmar desde acá** —
necesita que entres al SQL Editor o al panel de Authentication → Policies de
Supabase:

1. **Lo más importante: que un usuario común no pueda cambiarse el rol a
   "admin" a mano.** Desde que el rol de admin ahora sale de la columna `rol` de
   `perfiles` (antes era un email hardcodeado en el código), si la política de
   `UPDATE` de esa tabla no excluye específicamente la columna `rol` — o el
   `GRANT` no está limitado a columnas concretas — cualquier usuario logueado
   podría mandar un pedido con su propio token cambiando su fila a
   `rol: "admin"` y quedar con acceso de administrador. Fijate que el permiso de
   `UPDATE` sobre `perfiles` esté limitado por columna (algo como
   `grant update (plataforma, version, last_seen_at) on perfiles to
   authenticated`, sin incluir `rol` en esa lista), no sólo protegido por una
   política de fila.
2. **Que "reportes" y "cuaderno_respaldos" realmente aíslen a cada usuario, y
   que "reportes" realmente le dé al admin (y sólo al admin) acceso a todo.**
   Como la separación entre "profesor" y "admin" para `reportes` cambió de base
   (antes probablemente comparaba el email contra uno fijo, ahora tendría que
   apoyarse en `perfiles.rol`), vale la pena releer esa policy puntual y
   confirmar que sigue funcionando con el nuevo esquema de roles — si quedó
   comparando el email viejo a mano, el panda de administración podría dejar de
   funcionar, o peor, seguir siendo accesible a un email que ya no es el admin
   real.

Ninguna de las dos cosas se puede arreglar desde el código de este repo — son
configuración que vive sólo en Supabase.

## 6. Diseño de la sesión

- **Dónde vive el token**: en apps nativas (Tauri/Capacitor), en `localStorage`.
  En la web, en una **cookie** (`document.cookie`, con `SameSite=Lax` y
  `Secure` cuando es https) — legible por JavaScript, no `HttpOnly`.
- **Por qué no puede ser `HttpOnly`**: una cookie `HttpOnly` sólo la puede poner
  el *servidor* vía el header `Set-Cookie` de una respuesta HTTP — esta app no
  tiene servidor propio (es un sitio estático en GitHub Pages, sin backend);
  todo el login habla directo entre el navegador y la API de Supabase. Además,
  aunque hubiera forma de que la cookie fuera `HttpOnly`, el token de acceso
  igual tiene que estar disponible para el JavaScript de la app, porque las
  llamadas a la API REST de Supabase necesitan mandarlo a mano en el header
  `Authorization: Bearer <token>` — Supabase no lo lee de una cookie
  automáticamente. Es una limitación estructural del "sin servidor propio", no
  un descuido: la mitigación real contra robo de token vía XSS es que no haya
  XSS (sección 3), no una cookie `HttpOnly` que en este diseño no puede existir.
- **Techo de 24hs**: además de la expiración normal del token de Supabase (que
  se refresca solo mientras la sesión sigue viva), la app se auto-impone un
  techo de 24 horas desde el login, sólo en la versión web (`SES_MAX_AGE_MS`,
  en `getSes()`). Existe porque algunos navegadores (la función "continuar donde
  lo dejé" de Chrome/Edge) preservan las cookies de sesión aunque se cierre el
  navegador entero — algo que la página no puede controlar ni detectar. Pasadas
  24hs desde el login, la sesión se invalida sola sin importar si el refresh
  token de Supabase seguiría siendo válido. **No aplica a las apps nativas**
  (Tauri/Capacitor): ahí el dispositivo entero es "de confianza" (es una
  instalación, no una pestaña de navegador compartible), así que la sesión dura
  hasta que el usuario cierra sesión a mano o el refresh token se revoca del
  lado de Supabase.
- **Qué protege y qué no protege esto**: el techo de 24hs limita el daño de una
  sesión "abandonada" en una compu compartida (no se puede resucitar
  reabriendo el navegador días después). No protege contra un atacante que ya
  tiene acceso al navegador/`localStorage` *durante* esas 24hs — para eso la
  única defensa real es que no haya XSS, cubierto en la sección 3.
