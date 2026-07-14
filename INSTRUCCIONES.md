# Cuaderno de seguimiento — Guía completa de puesta en marcha

Esta carpeta contiene tu aplicación terminada. Para dejarla funcionando con
sincronización entre el celular y la PC hay que hacer **3 partes, una sola vez**:

- **Parte 1:** crear el servidor gratuito donde se guardan los datos (Supabase) — 15 min
- **Parte 2:** publicar la aplicación en internet gratis (GitHub Pages) — 10 min
- **Parte 3:** instalar y conectar la app en cada dispositivo — 5 min por dispositivo

No hace falta saber programar: son pasos de "hacer clic y copiar/pegar".
Seguilos en orden y no te saltees ninguno.

---

## PARTE 1 — Crear el servidor gratuito (Supabase)

Supabase es un servicio con un plan gratuito permanente. Acá va a vivir la
copia "en la nube" de tu cuaderno, que es la que mantiene sincronizados
tus dispositivos.

### Paso 1.1 — Crear la cuenta y el proyecto

1. Entrá a **https://supabase.com** y tocá **"Start your project"**.
2. Registrate (lo más fácil: botón **"Continue with GitHub"**, con la cuenta
   de GitHub que ya tenés).
3. Una vez adentro, tocá **"New project"**:
   - **Name:** `cuaderno` (o el nombre que quieras)
   - **Database Password:** inventá una contraseña y **guardala en un lugar
     seguro** (no la vas a usar a diario, pero puede hacer falta).
   - **Region:** elegí **South America (São Paulo)** — es la más cercana.
   - Tocá **"Create new project"** y esperá 1-2 minutos a que termine de crearse.

### Paso 1.2 — Preparar la base de datos (copiar y pegar un texto)

1. En el menú de la izquierda, tocá el ícono **"SQL Editor"** (parece una hojita
   con símbolos, o buscalo por nombre).
2. Abrí el archivo **`supabase-setup.sql`** que está en esta carpeta con el
   Bloc de notas, seleccioná TODO su contenido y copialo.
3. Pegalo en el recuadro grande del SQL Editor y tocá el botón **"Run"**
   (abajo a la derecha).
4. Tiene que decir **"Success. No rows returned"**. Listo: eso creó la tabla
   donde se guarda tu cuaderno y las reglas de seguridad para que **solo tu
   usuario** pueda leerla y escribirla.

### Paso 1.3 — Permitir crear tu usuario sin confirmación por correo

1. En el menú de la izquierda, andá a **Authentication**.
2. Buscá la sección de configuración de inicio de sesión: según la versión
   del panel se llama **"Sign In / Providers"**, **"Providers"** o está en
   **Settings** dentro de Authentication.
3. Entrá a **Email** y **desactivá** la opción **"Confirm email"**.
4. Guardá con **"Save"**.

(Esto hace que puedas crear tu usuario directamente desde la app, sin el paso
extra de confirmar un correo. Sos el único usuario del sistema, así que no
tiene riesgo.)

### Paso 1.4 — Copiar los dos valores que la app necesita

1. En el menú de la izquierda, andá a **Settings** (engranaje) → **API**
   (o "API Keys" / "Data API" según la versión del panel).
2. Vas a ver dos cosas. Copialas en un archivo de texto para tenerlas a mano:
   - **Project URL**: una dirección tipo `https://abcdefgh.supabase.co`
   - **anon public** (o "publishable key"): un texto largo que empieza con
     `eyJ...` o `sb_publishable_...`
3. Estos dos valores los vas a pegar dentro de la app en la Parte 3. No son
   una contraseña: son la "dirección" de tu servidor. La seguridad real la
   dan tu correo y contraseña de usuario.

---

## PARTE 2 — Publicar la aplicación (GitHub Pages)

El repositorio (`cuaderno-seguimiento` en tu cuenta de GitHub) ya existe y ya
tiene los archivos de la app dentro de la carpeta `web/`. No hace falta crear
nada a mano ni arrastrar archivos: cada vez que se suba una actualización al
repositorio, un robot de GitHub ("GitHub Actions") publica automáticamente el
contenido de `web/` en tu dirección pública. Solo falta activar esto una vez.

### Paso 2.1 — Activar la publicación automática

1. Entrá a **https://github.com/manugandini53-design/cuaderno-seguimiento**
   con tu cuenta.
2. **Settings → Pages** (menú de la izquierda).
3. En "Build and deployment": **Source: GitHub Actions** (si dice
   "Deploy from a branch", cambialo a esta opción) → se guarda solo, no hace
   falta más.
4. Andá a la pestaña **Actions** (arriba del repositorio). Va a haber una
   publicación en curso o ya terminada, con un tilde verde ✓.
5. Esperá a que termine (1-2 minutos) y abrí:
   `https://manugandini53-design.github.io/cuaderno-seguimiento/`
6. Esa dirección es tuya, gratis y permanente. Se va a actualizar sola cada
   vez que haya cambios nuevos en la carpeta `web/` del repositorio.

---

## PARTE 3 — Instalar y conectar en cada dispositivo

### Paso 3.1 — Instalar

La dirección del Paso 2.1 (`https://manugandini53-design.github.io/cuaderno-seguimiento/`)
ahora es la página de presentación del producto, no la app instalable — la app
en sí vive en la subdirección **`.../cuaderno-seguimiento/app/`** (tocá el botón
"Abrir la aplicación web" desde esa página, o entrá directo a esa URL). Usá
siempre esa dirección con `/app/` para instalar — instalar desde la raíz no
funciona.

**En el celular (Android):** abrí esa dirección (`.../app/`) en **Chrome** →
menú (⋮) → **"Instalar aplicación"** (o "Agregar a pantalla principal"). Queda
el ícono como cualquier app y abre a pantalla completa.

**En la PC (Windows 11):** abrí la misma dirección (`.../app/`) en **Chrome o
Edge** → en la barra de direcciones aparece un ícono de instalar (monitor con
flecha) → **Instalar**. Queda en el menú Inicio y podés anclarla a la barra de
tareas.

**Si ya la habías instalado antes** desde la dirección raíz (sin `/app/`):
desinstalá esa versión vieja (clic derecho sobre el ícono → Desinstalar) y
volvé a instalarla desde `.../app/` — la instalación anterior va a quedar
mostrando la página de presentación en vez de la app.

### Paso 3.2 — Conectar la sincronización (en cada dispositivo)

1. Abrí la app y tocá el botón **"Sincronización"** (arriba a la derecha).
2. Pegá los dos valores que copiaste en el Paso 1.4 (**Project URL** y
   **clave anon public**) → **Guardar configuración**.
3. **La primera vez (en un solo dispositivo):** escribí tu correo y una
   contraseña (mínimo 6 caracteres) y tocá **"Crear cuenta nueva"**.
4. **En el otro dispositivo:** repetí los pasos 1 y 2, y después
   **"Iniciar sesión"** con ese mismo correo y contraseña.
5. Arriba a la izquierda vas a ver el estado: **"Sincronizado ✓"** con la hora.
   Cargá un alumno de prueba en un dispositivo y verificá que aparece en el
   otro (tocá "Sincronizar ahora" si no querés esperar).

---

## Cómo funciona en el día a día

- **Sin internet la app funciona igual**: podés cargar clases, alumnos,
  simulacros, todo. El estado va a decir "Sin conexión — trabajando offline".
  Cuando el dispositivo recupere internet, sube todo solo.
- **La combinación es automática**: si editaste en los dos dispositivos,
  se mezclan los cambios; si tocaste el MISMO alumno en los dos, queda la
  edición más reciente.
- **Materias y carreras**: en el botón "Materias y carreras" administrás las
  listas. Creá cada materia con sus unidades una sola vez; al dar de alta un
  alumno la elegís del desplegable y su grilla de temas se arma sola. Esto
  también se sincroniza entre dispositivos.
- **Respaldo**: aunque tengas sincronización, bajate cada tanto la copia
  .json desde el tablero (por ejemplo, después de cada mesa de examen).
  Es tu seguro ante cualquier accidente.

## Dos avisos importantes del plan gratuito

1. **Supabase pausa los proyectos gratuitos tras ~1 semana sin uso.** Con uso
   normal (la app sincroniza sola al abrirla) no pasa nada. Si dejás de usarla
   un tiempo largo y al volver no sincroniza, entrá a supabase.com → tu
   proyecto → botón **"Restore"** y en unos minutos vuelve a andar. Los datos
   no se pierden con la pausa, y además siempre están completos en tus
   dispositivos.
2. **No borres el repositorio de GitHub ni el proyecto de Supabase**: son la
   app publicada y el servidor. Si algún día borrás datos de navegación en
   Chrome, la app instalada puede pedirte iniciar sesión de nuevo: es normal,
   los datos vuelven solos del servidor al sincronizar.

## Si algún día te paso una versión nueva de la app

1. La actualización se sube directamente al repositorio (no hace falta que
   subas nada a mano) y la publicación en tu dirección de GitHub Pages se
   actualiza sola en 1-2 minutos (podés verlo en la pestaña **Actions** del
   repositorio, con un tilde verde ✓ cuando termina).
2. En cada dispositivo, cerrá y abrí la app un par de veces para que tome
   la versión nueva.
