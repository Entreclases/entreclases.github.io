"use strict";
/* ============ Tutoriales avanzados por sección (paso 207) ============
   Guía de referencia, pensada para volver cuando quieras — a diferencia del tour guiado (204,
   una sola pasada, de acción real), ésta es sólo consulta y se repite cuantas veces haga falta.
   Dos niveles por sección (Guía rápida / Guía completa, se recuerda el último elegido) y, en la
   completa, un acordeón de subtemas con un botón "Mostrame" opcional que resalta el elemento
   real de la app — reusando la MISMA geometría de spotlight del tour guiado (spotlightRectFor/
   spotlightMasksHtml/positionSpotlightCard, ver tour.js) en vez de duplicarla. Nunca se abre
   sola: sólo a pedido, desde el botón "¿Cómo se usa esto?" de cada sección (sectionHelpBtn(),
   sumado a pageHead() y a vCuentaGroup("portal", …)) o desde el índice de Cuenta → Ayuda
   (vTutorialesIndice(), dentro de vCentroAyuda()). Mientras el tour guiado esté activo, esta guía
   se hace a un lado del todo (ni el botón se muestra) para no competir con él. */

// Preferencia de nivel (Guía rápida/completa) — por dispositivo, mismo criterio que THEME_KEY/
// DENSITY_KEY (config.js): no viaja en el JSON del cuaderno, se recuerda la última elegida nomás.
const TUT_LEVEL_KEY = "tutoria-tut-level";
function getTutLevel(){ return localStorage.getItem(TUT_LEVEL_KEY)==="completa" ? "completa" : "rapida"; }
function setTutLevel(v){ localStorage.setItem(TUT_LEVEL_KEY, v); }

/* Contenido real de cada sección — nada inventado: cada dato/botón mencionado existe hoy en el
   views-*.js correspondiente (ver ARQUITECTURA.md para ubicar cada uno). "showme" (opcional, sólo
   en subtemas de la guía completa) describe cómo llegar hasta el elemento real antes de resaltarlo
   — mismas claves que entiende tutNavigateFor() más abajo (idéntico mecanismo de navegación que ya
   usa el tour guiado, target/navView/tab/group/…, nunca un atributo data-tour aparte). */
const HELP_SECTIONS = {
  tablero: {
    label: "Tablero",
    quick: [
      "Es la pantalla de arranque: qué mirar hoy — clases del día, para cobrar y lo próximo, de un vistazo.",
      "«Primeros pasos» te acompaña mientras el cuaderno está vacío; se tilda solo, sin marcar nada a mano.",
      "«Tu día» junta tus pendientes reales de hoy (clases, cobros, avisos) en una sola lista, con tu racha de días al día.",
      "Los pedidos y cancelaciones que te llegan desde el portal de tus alumnos aparecen acá para aceptar o responder.",
      "Las alertas avisan de alumnos sin clase hace rato, sin examen cargado o con deuda — tocá una para ir directo a la ficha.",
      "Al pie siempre tenés a mano «Descargar copia (.json)», tu respaldo manual aparte de la sincronización.",
    ],
    full: [
      {title:"Qué mirás primero", body:"El Tablero muestra tres bloques lado a lado: «Clases de hoy» (con acceso directo a registrarlas o entrar al link de videollamada), «Para cobrar» (el total pendiente de clases, mensualidades y señas) y «Próximo» (exámenes en los próximos 14 días, objetivos de clase por cerrar y las clases de mañana). Cada bloque tiene su propio botón para ir a la sección completa.",
        showme:{navView:"tablero", target:'[data-a="nav-tablero"]', text:"Este es el acceso al Tablero en la barra de navegación — siempre te trae de vuelta acá."}},
      {title:"«Primeros pasos» y el tour guiado", body:"Mientras te falte algún hito básico (alumno, materia, clase agendada, clase registrada, cobro marcado, portal activado) ves una checklist con esos pasos — se completa sola en base a lo que ya hiciste, nunca hay que tildar nada a mano. Si preferís un recorrido guiado paso a paso en vez de la checklist, podés volver a lanzarlo desde Cuenta → Ayuda → «Ver la guía de nuevo».",
        showme:{navView:"cuenta", group:"aplicacion", target:'[data-a="tour-restart"]', text:"Este botón repite el recorrido guiado interactivo desde el principio."}},
      {title:"«Tu día» y tu racha", body:"Con «Tu día» activado (Cuenta → Preferencias) ves una lista puntual de lo pendiente hoy — clases por registrar, cobros por marcar, exámenes por avisar — y un contador 🔥 de días consecutivos al día. Se apaga desde la misma pantalla si preferís sólo los tres bloques de arriba.",
        showme:{navView:"cuenta", group:"preferencias", target:'[data-a="toggle-tu-dia"]', text:"Acá prendés o apagás «Tu día» y la racha."}},
      {title:"Pedidos y cancelaciones del portal", body:"Si activaste que tus alumnos puedan pedir clases o avisar que no van a poder ir (Cuenta → Portal), esos pedidos aparecen en una tarjeta propia del Tablero — «Aceptar» agenda o cancela la clase de una, «Responder»/«Rechazar» te deja contestar sin confirmar. Nunca se agenda ni cancela nada solo, todo pasa por tu confirmación.",
        showme:{navView:"cuenta", group:"portal", sub:"reserva", loadPortal:true, target:'[data-a="reserva-modo-set"][data-f="confirmar"]', text:"Desde acá activás que tus alumnos puedan pedirte una clase."}},
      {title:"Alertas y exámenes próximos", body:"Debajo de los tres bloques, las Alertas juntan a los alumnos que necesitan tu atención (sin clase hace tiempo, examen cerca sin simulacro, deuda) con un botón para mandarles WhatsApp directo. Más abajo, las tarjetas de examen muestran a todos los que tienen fecha cargada, ordenados por cercanía."},
      {title:"Respaldo manual", body:"«Descargar copia (.json)» guarda todo tu cuaderno en un archivo aparte de la sincronización automática — conviene bajar una cada tanto, sobre todo antes de un cambio grande. «Restaurar desde archivo», al lado, reemplaza TODOS los datos actuales por los del archivo elegido.",
        showme:{navView:"tablero", target:'[data-a="export"]', text:"Este botón descarga la copia — siempre está al pie del Tablero."}},
    ],
  },
  alumnos: {
    label: "Alumnos",
    quick: [
      "«Estudiantes» es la lista completa de tus alumnos activos, pausados o de baja, con filtros y búsqueda.",
      "Tocar un alumno abre su ficha completa: Resumen, Clases, Pagos, Objetivos, Materiales y Portal, en pestañas.",
      "El ícono de WhatsApp manda un mensaje ya armado; el de link comparte el acceso a su portal individual.",
      "«Interesados» es una mini lista de espera para gente que preguntó pero todavía no es alumno.",
      "Alumnos y materias borrados quedan 7 días en la Papelera (Cuenta → Datos) antes de eliminarse para siempre.",
    ],
    full: [
      {title:"Filtros y búsqueda", body:"Buscá por nombre, filtrá por estado (activo/pausado/etc.), materia, carrera, semáforo, si debe plata o por etiqueta, y ordená por examen más próximo, última clase o nombre. «Limpiar filtros» aparece apenas tocás alguno.",
        showme:{navView:"lista", target:'#lista-search', text:"El buscador por nombre está siempre arriba de la lista."}},
      {title:"La ficha: sus seis pestañas", body:"Resumen concentra las unidades de la materia, datos de contacto, informe/contrato para imprimir y borrar el alumno. Clases registra cada clase dada (tarea, tema, asistencia). Pagos muestra el detalle de cobros con el check rápido para marcarlos pagados. Objetivos evalúa el cierre de cada clase. Materiales son los archivos de la materia. Portal genera y comparte la llave individual de ese alumno.",
        showme:{navView:"detalle", tab:"pagos", requires:"student", target:'[data-a="tab-pagos"]', text:"Estas son las pestañas de la ficha de un alumno."}},
      {title:"Interesados", body:"Antes de dar de alta a alguien de una, anotalo en «Interesados» con su contacto y materia — cuando confirma, «Convertir en alumno» crea la ficha real sin perder los datos que ya cargaste.",
        showme:{navView:"lista", target:'[data-a="estudiantes-tab-interesados"]', text:"Esta pestaña abre la lista de interesados."}},
      {title:"Compartir acceso al portal", body:"El ícono de link junto a cada alumno (o «Compartir acceso» dentro de su ficha) genera o comparte su llave individual del portal — la misma que gestionás en Cuenta → Portal → Llaves por alumno.",
        showme:{navView:"lista", requires:"student", target:'[data-a="share-open"][data-kind="alumno"]', text:"Este ícono comparte el acceso al portal de ese alumno en particular."}},
      {title:"Cierre de cuatrimestre", body:"En los meses de recambio, Estudiantes sugiere revisar a los alumnos activos sin clases hace rato — pausalos, despedite o dejalos como están, todo desde el mismo panel, junto con el «Resumen del período» comparado con el anterior."},
      {title:"Papelera", body:"Un alumno o materia borrados no se pierden al toque: quedan accesibles 7 días desde el link «Papelera» al pie de la lista, o desde Cuenta → Datos, con «Restaurar» completo."},
    ],
  },
  agenda: {
    label: "Agenda",
    quick: [
      "Vista semanal (grilla por hora) o mensual (calendario) — elegís arriba con las pestañas «Semana»/«Mes».",
      "Tocá un hueco vacío de la grilla para programar una clase ahí mismo, con alumno, hora y duración.",
      "Tocá una clase ya agendada para editar fecha/hora/duración/tema/link, cancelarla o borrarla.",
      "«Mi disponibilidad» marca tus horarios libres semana a semana — es lo que ven tus alumnos si les activaste pedir clase.",
      "«+ Clase grupal» agenda una clase para varios alumnos a la vez.",
      "«Exportar a mi calendario» descarga un .ics para importar en Google Calendar, Outlook o el calendario del teléfono.",
    ],
    full: [
      {title:"Semana vs. Mes", body:"La vista semanal muestra los 7 días con horario, ideal para el día a día; la mensual da panorama con una marca por cada día con clases — tocando un día del mes se abre su detalle abajo, con las mismas acciones.",
        showme:{navView:"agenda", agendaMode:"mes", target:'[data-a="agenda-view-mes"]', text:"Este botón cambia a la vista mensual."}},
      {title:"Programar una clase", body:"Un click en cualquier hueco vacío de la grilla semanal (o en el detalle de un día del mes) abre un mini formulario con alumno, hora y duración precargados — «+ Programar» la agenda al toque, sin salir de la Agenda.",
        showme:{navView:"agenda", agendaMode:"semana", target:'[data-a="agenda-grid-add"]', text:"Cualquier hueco vacío de la grilla abre el formulario rápido — este es un ejemplo."}},
      {title:"Editar o cancelar una clase", body:"Tocar una clase ya agendada abre su popover: cambiar fecha/hora/duración/tema/link, marcarla cancelada (con motivo) o borrarla. Si viene de un horario recurrente, elegís si el cambio aplica sólo a esa clase o a todas las de ese horario.",
        showme:{navView:"agenda", agendaMode:"semana", target:'.agenda-event', text:"Tocá cualquier clase de la grilla para editarla — este es un ejemplo, si ya tenés alguna agendada."}},
      {title:"Mi disponibilidad", body:"Con «Mi disponibilidad» activado, tocás las celdas de la grilla para marcar tus horarios libres semanales — no bloquea agendar clases fuera de ellos, es sólo lo que ofrecés a tus alumnos si activaste que puedan pedir clase desde el portal (Cuenta → Portal).",
        showme:{navView:"agenda", agendaMode:"semana", target:'[data-a="agenda-disp-edit-toggle"]', text:"Este botón activa el modo de marcar tu disponibilidad."}},
      {title:"Clases grupales", body:"Una clase grupal registra la asistencia de cada integrante por separado, pero se agenda, edita y cancela como una sola clase para todo el grupo. Armá grupos reutilizables en Cuenta → Grupos de clase, o elegí alumnos sueltos cada vez.",
        showme:{navView:"agenda", agendaMode:"semana", target:'[data-a="grupal-form-open-agenda"]', text:"Este botón agenda una clase grupal nueva."}},
      {title:"Exportar e imprimir", body:"«Exportar a mi calendario» descarga un .ics de la semana o el mes que estés mirando, para importar en cualquier calendario. «Imprimir semana» (sólo en la vista semanal) genera una agenda en blanco y negro pensada para pegar en la heladera o el aula.",
        showme:{navView:"agenda", agendaMode:"semana", target:'[data-a="export-agenda-ics"]', text:"Este botón descarga el archivo .ics."}},
    ],
  },
  materias: {
    label: "Materias",
    quick: [
      "El catálogo de materias es compartido por todos tus alumnos — armar sus unidades una vez arma sola la grilla de temas de cada alumno que la curse.",
      "Cada materia tiene su color propio (se ve en Agenda, Estadísticas y en todas las listas) y podés vincularla a una o más carreras.",
      "Las unidades se reordenan con las flechas, se renombran con el lápiz (o doble click) y pueden tener subunidades.",
      "«Packs» agrupa varias materias para dar de alta a un alumno en todas de una.",
      "Los materiales (archivos) de cada materia se suben desde su editor, con biblioteca por unidad si ya cargaste unidades.",
      "Empezar desde una plantilla ya carga las unidades típicas de esa materia — se editan después como cualquier otra.",
    ],
    full: [
      {title:"Unidades y subunidades", body:"Cada unidad se renombra con el lápiz o doble click, se borra (con confirmación si algún alumno ya tiene avance ahí) y se reordena con las flechas — nunca se pierde el historial de un alumno aunque saques una unidad después. Las subunidades son un nivel más de detalle opcional, mismo mecanismo.",
        showme:{navView:"catalog", target:'[data-a="cat-add-subject"]', text:"Este cuadro y botón crean una materia nueva — tocando una ya creada abrís su editor de unidades."}},
      {title:"Color y carreras", body:"El color de una materia se ve en toda la app: Agenda, Estadísticas, las listas. Vincularla a una o más carreras te permite agrupar «Materias y sus unidades» por carrera en vez de ver todo junto.",
        showme:{navView:"catalog", catGroupBy:"carrera", target:'[data-a="cat-materias-groupby"][data-mode="carrera"]', text:"Con al menos una carrera cargada, este botón agrupa las materias por carrera."}},
      {title:"Packs", body:"Un pack agrupa 2 o más materias — al dar de alta un alumno nuevo podés elegir el pack entero en vez de una materia sola. Borrar un pack no borra las materias que agrupaba.",
        showme:{navView:"catalog", target:'[data-a="cat-add-pack"]', text:"Este botón crea un pack nuevo con las materias que tildaste arriba."}},
      {title:"Materiales y biblioteca por unidad", body:"Dentro del editor de cada materia subís archivos (guías, resúmenes, ejercicios) con un tope de tamaño y cantidad. Tocar «Compartir» en un archivo lo incluye en la Biblioteca del portal — recordá tocar «Publicar cambios» en Cuenta → Portal para que se vea del otro lado. Con unidades cargadas, «Por unidad» agrupa los materiales en bloques plegables, uno por unidad."},
      {title:"Empezar desde una plantilla", body:"En vez de armar las unidades a mano, elegí una plantilla ya armada (ej. Análisis I, Álgebra) — crea la materia con sus unidades típicas cargadas, listas para editar como cualquier otra.",
        showme:{navView:"catalog", target:'[data-a="cat-add-from-template"]', text:"Estos botones crean una materia con sus unidades típicas ya cargadas."}},
    ],
  },
  pagos: {
    label: "Pagos",
    quick: [
      "Tres sub-pestañas: Resumen (quién debe qué, mes por mes), Rentabilidad (cuánto te queda neto después de costos) y Ajustar tarifas (aumento en lote).",
      "El check ✓ junto a un alumno marca TODO lo pendiente de ese mes como pagado de una — mismo botón que aparece en el Tablero.",
      "«Sin registrar» son clases ya dadas que todavía no marcaste — un atajo directo a registrarlas.",
      "«Exportar CSV» descarga el detalle contable del período elegido, terminando en el mes que estés mirando.",
      "En Rentabilidad cargás costos fijos mensuales y variables por clase, asignados a una materia, un alumno o al negocio en general.",
      "«Ajustar tarifas» aplica un aumento (% o monto fijo) a varios alumnos de una, con vista previa antes de confirmar.",
    ],
    full: [
      {title:"Resumen del mes", body:"Elegí el mes arriba para ver, por alumno, cuánto cobraste y cuánto falta — el check ✓ marca todo lo pendiente de ese alumno ese mes como pagado de una. «Sin registrar» lista clases ya terminadas que todavía no cargaste, con acceso directo a registrarlas.",
        showme:{navView:"pagos", pagosTab:"resumen", target:'[data-a="export-pagos-csv"]', text:"Este botón exporta el detalle a CSV, terminando en el mes elegido arriba."}},
      {title:"Señas", body:"Si activaste el cobro de seña (ficha del alumno → Pagos), acá ves cuánto cobraste en señas y cuánto queda retenido — según tu política de cancelación, una seña se devuelve o se acredita a la próxima clase."},
      {title:"Rentabilidad real", body:"El «neto por hora real» resta tus costos (fijos y variables) de lo cobrado, dividido por las horas dictadas — la cifra que de verdad importa, no sólo lo facturado. Desglosado por materia y por alumno, más el histórico de los últimos 12 meses.",
        showme:{navView:"pagos", pagosTab:"rentabilidad", target:'[data-a="pagos-tab"][data-t="rentabilidad"]', text:"Esta pestaña muestra tu rentabilidad real."}},
      {title:"Costos", body:"Un costo fijo se descuenta completo cada mes (alquiler de aula, por ejemplo), dicten o no clases; uno variable se descuenta por cada clase dictada dentro de su alcance (viáticos, material impreso). A cada costo le podés asignar una materia, un alumno o dejarlo general.",
        showme:{navView:"pagos", pagosTab:"rentabilidad", target:'[data-a="add-costo-fijo"]', text:"Este botón agrega un costo fijo mensual."}},
      {title:"Ajustar tarifas en lote", body:"Elegí porcentaje o monto fijo, un redondeo opcional, y vas viendo la vista previa por alumno antes de aplicar — podés destildar a alguno o a toda una materia. Las clases ya registradas y los recibos ya emitidos no cambian de precio.",
        showme:{navView:"pagos", pagosTab:"ajustar", target:'[data-a="pagos-tab"][data-t="ajustar"]', text:"Esta pestaña aplica un aumento a varios alumnos de una."}},
    ],
  },
  portal: {
    label: "Portal",
    quick: [
      "El portal es una página pública, sin login, para que tus alumnos vean lo que quieras compartirles.",
      "Hay tres tipos de llave: general (todos ven lo mismo), individual por alumno (su avance y clases) y grupal por materia (biblioteca y próximas clases del grupo, sin datos de un alumno en particular).",
      "«Ver como alumno» te deja previsualizar el portal real con cualquiera de esas llaves, sin salir de la app.",
      "Podés activar que te pidan clases (siempre con tu confirmación) y que avisen cancelaciones, según tu disponibilidad declarada en Agenda.",
      "Los avisos son mensajes cortos dirigidos a todos, a una materia o a un alumno puntual, que aparecen arriba de todo en su portal.",
      "No te olvides de «Publicar cambios» después de tocar algo — es lo que actualiza lo que ven tus alumnos del otro lado.",
    ],
    full: [
      {title:"Activar el portal", body:"Con el portal activado te da un link único para compartir (o un QR) — «Regenerar llave» invalida ese link para siempre, útil si se filtró. Nada se ve del otro lado hasta que tocás «Publicar cambios».",
        showme:{navView:"cuenta", group:"portal", loadPortal:true, target:'[data-a="portal-toggle"][data-f="si"]', text:"Este botón activa el portal general."}},
      {title:"Los tres tipos de llave", body:"La llave general (arriba de todo) es la única compartida entre todos si no generás otras. La individual (por alumno, en «Llaves por alumno» o desde la ficha) le muestra a ESE alumno su propio avance, clases y saldo. La grupal (por materia, en «Llaves grupales») le muestra a un grupo elegido a mano la biblioteca y las próximas clases/exámenes de la materia — nunca datos de un alumno en particular.",
        showme:{navView:"cuenta", group:"portal", sub:"llaves", loadPortal:true, requires:"student", target:'[data-a="portal-hub-alumno-generar"]', text:"Este botón genera la llave individual de ese alumno."}},
      {title:"Pedidos y cancelaciones", body:"Con «Pueden pedir clases» activado, un alumno con llave individual ve tus huecos libres de los próximos 14 días (según tu disponibilidad declarada en Agenda) y pide uno con nota opcional — SIEMPRE queda pendiente de tu confirmación. «Cancelar desde el portal» deja que avisen que no van a una clase agendada, con tu política de cancelación a la vista antes de confirmar.",
        showme:{navView:"cuenta", group:"portal", sub:"reserva", loadPortal:true, target:'[data-a="reserva-modo-set"]', text:"Acá activás o desactivás los pedidos de clase."}},
      {title:"Avisos", body:"Un mensaje corto («El jueves traé la guía 3») que aparece arriba de todo en el portal — dirigido a todos, a una materia o a un alumno puntual. Se publica al toque, sin depender de «Publicar cambios».",
        showme:{navView:"cuenta", group:"portal", sub:"avisos", loadPortal:true, target:'#aviso-texto', text:"Escribí el aviso acá y elegí a quién va dirigido."}},
      {title:"Ver como alumno", body:"Previsualizá el portal real —con la llave general, individual o grupal que elijas— en un panel adentro de Cuenta, sin salir de la app. No se carga solo: hace falta tocar «Cargar vista previa» cada vez, para no consumir datos de más.",
        showme:{navView:"cuenta", group:"portal", sub:"preview", loadPortal:true, target:'[data-a="portal-preview-load"]', text:"Este botón carga la vista previa del portal."}},
    ],
  },
  estadisticas: {
    label: "Estadísticas",
    quick: [
      "Panorama del grupo por materia: semáforo, avance promedio de temas, simulacros recientes, tasa de aprobación y asistencia del mes.",
      "«Comparar períodos» pone dos meses (o rangos) lado a lado: ingresos, clases, horas, alumnos, objetivos y aprobados.",
      "«El aula» dibuja a cada alumno activo de la materia elegida en un banco, con su semáforo y avance — un vistazo visual del grupo entero.",
      "«Tu actividad», «Retención» y «Salud del mes» dan el panorama de largo plazo: cuánto dura un alumno en promedio, altas/bajas y quién se está enfriando.",
      "«Compartir mi tasa» genera una imagen lista para tus redes o para mandar por WhatsApp.",
    ],
    full: [
      {title:"Vista por materia", body:"Elegí una materia arriba para ver su semáforo, avance promedio de temas, simulacros de los últimos 30 días, tasa de aprobación y asistencia del mes — todo acotado a los alumnos activos de esa materia.",
        showme:{navView:"stats", target:'[data-a="nav-stats"]', text:"Este es el acceso a Estadísticas en la barra de navegación."}},
      {title:"Comparar períodos", body:"Elegí dos meses (o usá los atajos «Este mes vs. anterior» / «Mismo mes, año pasado») para ver ingresos, clases, horas, alumnos con clase, objetivos cumplidos y % de aprobados uno al lado del otro, con la diferencia en puntos porcentuales.",
        showme:{navView:"stats", statsMode:"comparar", target:'[data-a="stats-mode"][data-m="comparar"]', text:"Esta pestaña compara dos períodos."}},
      {title:"El aula", body:"Cada alumno activo de la materia elegida ocupa un banco — el color de fondo es su semáforo, la barra de arriba su avance de temas, y una insignia si tiene examen en los próximos 14 días. Tocar un banco abre su ficha directo."},
      {title:"Retención y salud del mes", body:"«Duración promedio de un alumno» mide de la primera a la última clase registrada; «Altas y bajas por mes» muestra el neto de los últimos 6 meses. «Salud del mes» separa a tus alumnos activos en recientes, enfriándose e inactivos según hace cuánto no tienen clase — con un botón directo para escribirle a cada uno."},
      {title:"Compartir tu tasa", body:"«Compartir mi tasa» genera una imagen con tu % de aprobación general para tus redes; en Estudiantes, «Descargar/compartir resumen» hace lo mismo con el cierre de cuatrimestre.",
        showme:{navView:"stats", target:'[data-a="share-tasa-image"]', text:"Este botón genera la imagen para compartir."}},
    ],
  },
  cuenta: {
    label: "Cuenta",
    quick: [
      "Agrupa todo lo tuyo en sub-pestañas: Perfil, Cobros, Preferencias, Mensajes, Portal, Grupos, Datos, Aplicación y Sesión.",
      "«Cobros» es donde cargás tu tarifa habitual, packs de clases y los medios de pago/QR que ven tus alumnos en el portal.",
      "«Preferencias» tiene tema claro/oscuro, densidad, color de acento, sonidos, animaciones, política de cancelación y recordatorios.",
      "«Datos» tiene tus respaldos automáticos y la Papelera de alumnos/materias borrados.",
      "«Aplicación» tiene la versión instalada, este Centro de ayuda y el botón para reportar un problema.",
      "Arriba de todo, siempre visible sin importar la sub-pestaña, está tu estado de sincronización y «Sincronizar ahora».",
    ],
    full: [
      {title:"Cómo está organizada", body:"Tocá una de las sub-pestañas de arriba para ver esa sección entera — nunca hay más de una abierta a la vez. Adentro de las que tienen mucho contenido (Cobros, Portal) hay sub-desplegables propios, también de a uno por vez.",
        showme:{navView:"cuenta", target:'[data-a="cuenta-tab-select"]', text:"Estas son las sub-pestañas de Cuenta."}},
      {title:"Cobros", body:"Tu tarifa habitual es la que se sugiere al dar de alta un alumno nuevo. Los packs de catálogo son paquetes de clases prepagas que podés vender directo. Los medios de pago y el QR son lo que ve cada alumno en su portal individual, junto a su saldo pendiente.",
        showme:{navView:"cuenta", group:"cobros", target:'[data-a="cuenta-tab-select"][data-id="cobros"]', text:"Esta sub-pestaña tiene tu tarifa, packs y medios de pago."}},
      {title:"Preferencias", body:"Tema, densidad y color de acento son por dispositivo (no viajan al sincronizar). Sonidos y animaciones se apagan solos si tu sistema pide reducir movimiento. La política de cancelación define cuántas horas antes puede cancelar un alumno sin perder la seña.",
        showme:{navView:"cuenta", group:"preferencias", target:'[data-a="set-theme"]', text:"Acá elegís el tema claro, oscuro o según el sistema."}},
      {title:"Respaldos y papelera", body:"Se guarda una copia automática por día (con historial) además de tu copia manual .json. Un alumno o materia borrados quedan 7 días en la Papelera por si te arrepentís.",
        showme:{navView:"cuenta", group:"datos", target:'[data-a="cuenta-tab-select"][data-id="datos"]', text:"Esta sub-pestaña tiene tus respaldos y la papelera."}},
      {title:"Ayuda", body:"Acá mismo, en Aplicación, tenés el Centro de ayuda: preguntas frecuentes, el mapa de la app, atajos de teclado, volver a lanzar el tour guiado y este índice de Tutoriales."},
    ],
  },
  admin: {
    label: "Panel (admin)",
    quick: [
      "El Panel sólo lo ven las cuentas de administrador — reportes, usuarios, actividad y recursos de TODO el sistema, no sólo los tuyos.",
      "«Reportes» junta problemas, ideas, «me gusta» y pedidos del programa Active Tester que mandan los profesores desde la app.",
      "«Usuarios» administra las cuentas: aprobar, rechazar, ver estado.",
      "«Actividad» mide el uso global de la app (distinto de «Tu actividad» de Estadísticas, que es sólo la tuya).",
      "«Recursos» muestra el uso de Supabase (base de datos, storage) y «Inactividad» las cuentas que dejaron de usar la app.",
    ],
    full: [
      {title:"Reportes", body:"Filtrá por pendiente/resuelto y por tipo (problema, idea, me gusta, error, Active Tester) — «Marcar resuelto» saca un reporte de la cola sin borrarlo. El cupo de Active Tester se administra a mano marcando cada solicitud como avisada.",
        showme:{navView:"panel", panelTab:"reportes", target:'[data-a="panel-tab-reportes"]', text:"Esta pestaña junta todos los reportes."}},
      {title:"Usuarios", body:"Acá aprobás o rechazás cuentas nuevas y ves el estado de todas las existentes.",
        showme:{navView:"panel", panelTab:"usuarios", target:'[data-a="panel-tab-usuarios"]', text:"Esta pestaña administra las cuentas de todos los profesores."}},
      {title:"Actividad y Recursos", body:"«Actividad» mide uso global (altas, sesiones) de toda la app, no la tuya en particular. «Recursos» muestra cuánto se está usando de los límites de Supabase (base de datos, almacenamiento) — importante para no quedarse sin espacio de golpe.",
        showme:{navView:"panel", panelTab:"recursos", target:'[data-a="panel-tab-recursos"]', text:"Esta pestaña muestra el uso de Supabase."}},
      {title:"Inactividad", body:"Lista las cuentas que dejaron de usar la app hace un tiempo — sirve para saber a quién avisarle antes de un aviso automático o una baja.",
        showme:{navView:"panel", panelTab:"inactividad", target:'[data-a="panel-tab-inactividad"]', text:"Esta pestaña lista las cuentas inactivas."}},
    ],
  },
};

// Botón discreto de cabecera ("¿Cómo se usa esto?") — usado por pageHead() (views-core.js) y por
// vCuentaGroup("portal", …, "portal") para la sub-pestaña Portal. Nunca durante el tour guiado
// (204): no compite con él, ver tourBlockingOverlayOpen() en tour.js.
function sectionHelpBtn(id){
  if(!id || !HELP_SECTIONS[id] || state.tourActive) return "";
  return `<button class="chip tut-open-btn" data-a="tut-open" data-id="${id}" title="¿Cómo se usa esto?" aria-label="¿Cómo se usa esto?">
    <span class="icon-inline" style="width:14px;height:14px">${ICON_HELP}</span> ¿Cómo se usa esto?</button>`;
}

// Índice central (Cuenta → Ayuda, dentro de vCentroAyuda() en views-cuenta.js): salta a cualquier
// sección sin tener que estar parado ahí. "admin" sólo se ofrece a cuentas de administrador.
function vTutorialesIndice(){
  const isAdmin = sesIsAdmin(getSes());
  const ids = Object.keys(HELP_SECTIONS).filter(id=>id!=="admin"||isAdmin);
  return `<div class="flabel" style="margin-bottom:6px">Tutoriales</div>
    <div class="hint" style="margin-bottom:8px">Guías de referencia por sección — volvé cuando quieras repasar algo puntual.</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">
      ${ids.map(id=>`<button class="chip" data-a="tut-open" data-id="${id}">${esc(HELP_SECTIONS[id].label)}</button>`).join("")}
    </div>`;
}

// Un subtema de la guía completa — mismo patrón visual de acordeón que vCuentaSub() (paso 202),
// una sola vez abierto por sección a la vez (state.tutSubOpen[sectionId]).
function vTutFullItem(secId, sub, i, openIdx){
  const open = openIdx===i;
  return `<div class="cuenta-group" style="margin-bottom:10px">
    <button class="cuenta-group-head" data-a="tut-sub-toggle" data-i="${i}" aria-expanded="${open}">
      <div class="ftitle" style="margin-bottom:0">${esc(sub.title)}</div>
      <span class="faq-caret ${open?"open":""}">${ICON_CHEVRON}</span>
    </button>
    ${open?`<div class="cuenta-group-body">
      <div class="hint" style="margin-bottom:${sub.showme?"10px":"0"}">${esc(sub.body)}</div>
      ${sub.showme?`<button class="chip" data-a="tut-showme" data-sec="${secId}" data-i="${i}">Mostrame</button>`:""}
    </div>`:""}
  </div>`;
}

// El panel en sí — mismo patrón .overlay/.modal que el resto de la app (vFeedbackOverlay,
// vSearchOverlay…), con scroll interno propio (.modal ya trae max-height:90vh + overflow-y:auto)
// para que una guía larga no se corte en mobile.
function vTutPanel(){
  const id = state.tutOpen;
  const sec = HELP_SECTIONS[id];
  if(!sec) return "";
  const level = getTutLevel();
  const body = level==="rapida"
    ? `<ul class="tut-quick">${sec.quick.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`
    : sec.full.map((sub,i)=>vTutFullItem(id, sub, i, state.tutSubOpen[id]!=null?state.tutSubOpen[id]:0)).join("");
  return `<div class="overlay no-print" data-a="tut-close">
    <div class="modal tut-modal" data-a="tut-modal-noop">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px">
        <div class="ftitle" style="margin-bottom:0">Tutorial: ${esc(sec.label)}</div>
        <button class="del" style="font-size:20px" data-a="tut-close" title="Cerrar" aria-label="Cerrar">×</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button class="chip ${level==="rapida"?"on":""}" data-a="tut-level" data-f="rapida">Guía rápida</button>
        <button class="chip ${level==="completa"?"on":""}" data-a="tut-level" data-f="completa">Guía completa</button>
      </div>
      ${body}
    </div>
  </div>`;
}

/* ============ "Mostrame": navegación + spotlight de un solo elemento ============ */

// Mismas claves de navegación que ya usa el tour guiado (enterTourStep(), tour.js) — así un
// cambio de navegación futuro (como el del paso 200 con Cuenta) se actualiza en un solo lugar.
function tutNavigateFor(nav){
  if(!nav) return;
  if(nav.navView) state.view = nav.navView;
  if(nav.tab) state.tab = nav.tab;
  if(nav.selId) state.selId = nav.selId;
  if(nav.group){
    state.cuentaOpenGroupId = nav.group;
    if(nav.sub){ state.cuentaSubOpen = state.cuentaSubOpen||{}; state.cuentaSubOpen[nav.group] = nav.sub; }
  }
  if(nav.agendaMode) state.agendaViewMode = nav.agendaMode;
  if(nav.pagosTab) state.pagosTab = nav.pagosTab;
  if(nav.statsMode) state.statsMode = nav.statsMode;
  if(nav.panelTab) state.panelTab = nav.panelTab;
  if(nav.catGroupBy) state.catMateriasGroupBy = nav.catGroupBy;
  if(nav.loadPortal){ state.portalLoaded=false; state.portalError=""; if(typeof loadPortal==="function") loadPortal(); }
}

// Si el subtema pide un alumno real (requires:"student") y todavía no hay ninguno, el destino
// cambia solo a Estudiantes + "+ Nuevo estudiante" — mostrar una ficha vacía sería peor que nada.
// Con alumno real disponible, toma el más reciente (mismo criterio que selectRealStudent del tour).
function tutResolveShowme(showme){
  if(showme.requires==="student"){
    const reales = aliveReal();
    if(!reales.length){
      return {nav:{navView:"lista"}, target:'[data-a="new"]',
        text:"Necesitás al menos un alumno cargado para ver esto en acción — este botón agrega el primero."};
    }
  }
  const nav = {};
  ["navView","tab","group","sub","agendaMode","pagosTab","statsMode","panelTab","catGroupBy","loadPortal"]
    .forEach(k=>{ if(showme[k]!=null) nav[k]=showme[k]; });
  if(showme.requires==="student"){
    const reales = aliveReal();
    const st = [...reales].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];
    if(st) nav.selId = st.id;
  }
  return {nav, target:showme.target, text:showme.text};
}

function removeTutSpotOverlay(){
  const el = document.getElementById("tut-spot-overlay");
  if(el) el.remove();
}

// Mismo lenguaje visual que el spotlight del tour (tour-mask/tour-ring/tour-card, ver tour.js) —
// a diferencia del tour, éste se cierra tocando afuera del hueco (mask con data-a="tut-spot-close")
// o con "Entendido", no hace falta avanzar ningún paso.
function renderTutSpotOverlay(){
  removeTutSpotOverlay();
  const spot = state.tutSpot; if(!spot) return;
  // Mismo criterio que el tour (tourBlockingOverlayOpen, tour.js): si hay un modal propio de la
  // app abierto encima, el spotlight se hace a un lado del todo en vez de taparlo.
  if(typeof tourBlockingOverlayOpen==="function" && tourBlockingOverlayOpen()) return;
  const rect = spotlightRectFor(spot.target);
  const vw=window.innerWidth, vh=window.innerHeight;
  const reduced = (typeof prefersReducedMotion==="function") && prefersReducedMotion();
  let masksHtml;
  if(rect && rect.width>0 && rect.height>0){
    masksHtml = spotlightMasksHtml(rect, vw, vh, reduced, "tut-spot-close");
  }else{
    masksHtml = `<div class="tour-mask" data-a="tut-spot-close" style="top:0;left:0;width:100%;height:100%"></div>`;
  }
  const el = document.createElement("div");
  el.id = "tut-spot-overlay"; el.className = "tour-overlay no-print";
  el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true");
  el.innerHTML = `${masksHtml}
    <div class="tour-card" id="tut-spot-card">
      <div class="tour-title">${esc(spot.label||"")}</div>
      ${spot.text?`<div class="tour-text">${esc(spot.text)}</div>`:""}
      <div class="tour-actions">
        <button class="btn btn-primary" data-a="tut-spot-close">Entendido</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  positionSpotlightCard(document.getElementById("tut-spot-card"), rect && rect.width>0 && rect.height>0 ? rect : null, true);
}

// Reposiciona sin reconstruir nada (resize/scroll) — mismo criterio que scheduleTourReposition().
let _tutSpotRepoQueued=false;
function scheduleTutSpotReposition(){
  if(!state.tutSpot || _tutSpotRepoQueued) return;
  _tutSpotRepoQueued=true;
  requestAnimationFrame(()=>{ _tutSpotRepoQueued=false; renderTutSpotOverlay(); });
}
window.addEventListener("resize", scheduleTutSpotReposition);
window.addEventListener("scroll", scheduleTutSpotReposition, true);
