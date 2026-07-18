# Entreclases — Guía de uso

## Qué es

Una app para llevar el progreso de tus alumnos: temas por materia, registro
de clases, simulacros y alertas de examen. Funciona con o sin internet, y se
sincroniza sola entre tus dispositivos con una cuenta.

No hay nada que instalar en un servidor ni configurar a mano: todo el mundo
usa la misma app, y tus datos quedan separados y protegidos con tu propia
cuenta (correo + contraseña).

## Empezar a usarla

Entrá a **https://entreclases.github.io/** y elegí cómo instalarla,
o abrila directo desde el navegador.

### Versión web (sin instalar nada)

Abrí **https://entreclases.github.io/app/** en cualquier navegador.
Anda igual, con o sin conexión.

### Instalar en Windows

1. En la landing, tocá **"Descargar para Windows"** (o entrá directo a la
   pestaña **Releases** del repositorio) y descargá el instalador (`.msi` o
   `setup.exe`).
2. Al abrirlo, es posible que **Windows SmartScreen** muestre una advertencia
   porque la app todavía no tiene firma digital: tocá **"Más información"** y
   después **"Ejecutar de todas formas"** para continuar. Es esperable.
3. Seguí el instalador. Queda en el menú Inicio como cualquier aplicación.

### Instalar en Android

Todavía no está publicada (próximamente). Mientras tanto, podés usar la
versión web y "agregarla a la pantalla de inicio" desde Chrome (menú ⋮ →
**"Instalar aplicación"**) para tenerla como un ícono más.

## Crear tu cuenta

La primera vez que abrís la app (en cualquier plataforma) vas a ver la
pantalla de inicio de sesión:

1. Tocá **"Crear cuenta"**, escribí tu correo y una contraseña (mínimo 6
   caracteres).
2. Ya estás adentro. No hace falta confirmar el correo.

**¿Olvidaste tu contraseña?** Tocá **"¿Olvidaste tu contraseña?"** en la
pantalla de inicio de sesión, escribí tu correo, y te va a llegar un mail
con un link para elegir una nueva.

## Usar la app en más de un dispositivo

En cada dispositivo nuevo, instalá o abrí la app y **iniciá sesión** con el
mismo correo y contraseña que usaste para crear la cuenta (no crees una
cuenta nueva). A partir de ahí, sincroniza sola.

## Cómo funciona la sincronización

- **Sin internet la app funciona igual**: podés cargar alumnos, clases,
  simulacros, todo. Vas a ver el estado "Sin conexión — trabajando offline".
  Cuando el dispositivo recupere internet, sube todo solo.
- **La combinación es automática**: si editaste en dos dispositivos, se
  mezclan los cambios; si tocaste el mismo alumno en los dos, queda la
  edición más reciente.
- **Quedás con la sesión iniciada**: una vez que iniciaste sesión en un
  dispositivo, la app se abre directo aunque no haya internet. Solo te pide
  volver a iniciar sesión si la sesión se invalida estando online (por
  ejemplo, si cambiaste la contraseña desde otro lado).
- **Materias y carreras**: en el botón "Materias y carreras" administrás las
  listas de materias y unidades. Se crean una sola vez; al dar de alta un
  alumno elegís la materia del desplegable y su grilla de temas se arma
  sola. Esto también se sincroniza entre dispositivos.
- **Respaldo**: además de la sincronización, bajate cada tanto la copia
  `.json` desde el tablero (por ejemplo, después de cada mesa de examen).
  Es un seguro extra ante cualquier accidente.

## Si algún día hay una versión nueva de la app

La actualización se publica sola en la dirección de siempre — no hay que
reinstalar nada para la versión web. Cerrá y volvé a abrir la app un par de
veces para que tome los cambios. En Windows, la app de escritorio revisa sola
si hay una versión nueva al abrirse y te pregunta si querés instalarla ahora;
si aceptás, se actualiza y reinicia sola, sin descargar nada a mano.
