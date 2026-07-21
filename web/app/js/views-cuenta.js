"use strict";

function vAuth(){
  const mode = state.authMode||"login", isLogin = mode==="login";
  const remembered = getRememberedEmails();
  const emailVal = state.authEmail || remembered[0] || "";
  const lockMs = isLogin ? loginLockRemainingMs() : 0;
  const locked = lockMs>0;
  const mainAction = isLogin?"auth-login":"auth-signup";
  const acceptedTerms = !!state.authAcceptedTerms;
  return `<div class="auth-page">
    <div class="auth-card">
      <div class="auth-card-head">
        <div class="logo-mark" style="margin:0 auto 12px">${ICON_CHECK}</div>
        <div class="eyebrow">Clases particulares</div>
        <h1 class="auth-title">${isLogin?"Bienvenido de nuevo":"Creá tu cuenta"}</h1>
        <div class="auth-sub">${isLogin?"Ingresá para seguir con tus alumnos.":"Vos enseñás, del resto nos ocupamos."}</div>
      </div>
      <div class="tabs auth-tabs">
        ${tabbtn("auth-mode-login",isLogin,"Iniciar sesión")}
        ${tabbtn("auth-mode-signup",!isLogin,"Crear cuenta")}
      </div>
      <div class="field auth-field">
        <div class="flabel">Correo</div>
        <div class="auth-input-wrap">
          <span class="auth-input-icon">${ICON_MAIL}</span>
          <input id="auth-email" class="auth-input" type="email" placeholder="tu@mail.com" autocomplete="username" list="remembered-emails" value="${esc(emailVal)}" data-enter="${mainAction}" ${locked?"disabled":""}>
        </div>
        <datalist id="remembered-emails">${remembered.map(e=>`<option value="${esc(e)}">`).join("")}</datalist>
      </div>
      <div class="field auth-field" style="margin-top:12px">
        <div class="flabel">Contraseña${isLogin?"":" (mínimo 6 caracteres)"}</div>
        <div class="auth-input-wrap">
          <span class="auth-input-icon">${ICON_LOCK}</span>
          <input id="auth-pass" class="auth-input auth-input-pass" type="password" placeholder="••••••••" autocomplete="${isLogin?"current-password":"new-password"}" data-enter="${mainAction}" ${locked?"disabled":""}>
          <button type="button" class="auth-pass-toggle" data-a="auth-toggle-pass" aria-label="Mostrar contraseña" tabindex="-1">${ICON_EYE}</button>
        </div>
      </div>
      ${isLogin?"":`<label class="auth-terms-row">
        <input id="auth-accept-terms" type="checkbox" ${acceptedTerms?"checked":""} ${locked?"disabled":""}>
        <span>Leí y acepto los <button type="button" class="linklike" data-a="terminos-open">términos y la política de privacidad</button>.</span>
      </label>
      <div class="auth-tester-note">
        ${esc(ACTIVE_TESTER_NOTE)}
        <div class="auth-tester-fine">${esc(ACTIVE_TESTER_FINE_PRINT)}</div>
      </div>`}
      <button class="primary auth-submit" data-a="${mainAction}" ${locked?"disabled":""}>${isLogin?"Iniciar sesión":"Crear cuenta"}</button>
      ${isLogin?`<button class="chip auth-forgot" data-a="auth-forgot" ${locked?"disabled":""}>¿Olvidaste tu contraseña?</button>`:""}
      <div class="hint" id="authMsg" style="margin-top:10px;min-height:16px${locked?";color:var(--status-desaprobo-fg)":""}">${locked?esc("Demasiados intentos. Probá de nuevo en "+fmtLockRemaining(lockMs)+"."):""}</div>
      <div class="auth-trust">Gratis durante la beta · Hecho en Argentina 🇦🇷</div>
    </div>
  </div>${state.showTerminosModal?vTerminosModal():""}`;
}

// Modal de términos (paso 202): iframe a terminos.html en vez de duplicar el texto legal acá
// adentro (necesita frame-src 'self' en la CSP, ver index.html) — nunca más un target=_blank
// que quedaba escondido detrás del login. "Acepto" tilda el checkbox del formulario y cierra;
// el link a la página completa (target=_blank) queda de secundario en el pie.
function vTerminosModal(){
  return `<div class="overlay" data-a="terminos-close"><div class="modal modal-terminos" data-a="terminos-modal-noop">
    <div class="terminos-modal-head">
      <div class="ftitle">Términos y política de privacidad</div>
      <button class="terminos-modal-close" data-a="terminos-close" aria-label="Cerrar">${ICON_X}</button>
    </div>
    <div class="terminos-modal-body"><iframe src="../terminos.html" title="Términos y política de privacidad de Entreclases"></iframe></div>
    <div class="terminos-modal-foot">
      <a class="chip" href="../terminos.html" target="_blank" rel="noopener">Abrir en una pestaña nueva ↗</a>
      <button class="primary" style="margin-left:0" data-a="terminos-accept">Acepto</button>
    </div>
  </div></div>`;
}


// Paso 177: se muestra en vez de la app mientras perfiles.estado no sea 'aprobado' — nunca un
// error crudo de RLS (cuaderno/portales/storage ya rechazan a una cuenta no aprobada, pero acá
// ni siquiera se intenta: ver el gate en render() y el corte temprano en syncNow(), sync.js).
function vCuentaEnRevision(estado){
  const rechazado = estado==="rechazado";
  return `<div style="max-width:360px;margin:64px auto 0">
    <div style="text-align:center;margin-bottom:20px">
      <div class="logo-mark" style="margin:0 auto 12px">${ICON_CHECK}</div>
      <div class="eyebrow">Clases particulares</div>
      <h1 style="font-size:22px">${rechazado?"Tu cuenta no fue aprobada":"Tu cuenta está en verificación"}</h1>
    </div>
    <div class="formcard">
      ${rechazado
        ? `<div style="font-size:13.5px;margin-bottom:10px">No pudimos aprobar tu cuenta en Entreclases. Si te parece que es un error, escribinos a <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</div>`
        : `<div style="font-size:13.5px;margin-bottom:10px">Ya recibimos tu registro. Falta que un administrador apruebe tu cuenta — normalmente el mismo día. Te avisamos por correo apenas esté lista.</div>`}
      <button class="primary" style="width:100%;margin-left:0" data-a="estado-refrescar" ${state.estadoChecking?"disabled":""}>${state.estadoChecking?"Revisando…":"Ya me avisaron, revisar de nuevo"}</button>
      <button class="chip" style="margin-top:10px;border:none;background:none;padding:2px 0;color:var(--muted)" data-a="auth-logout">Cerrar sesión</button>
    </div>
  </div>`;
}


function vConfirmEmail(){
  return `<div style="max-width:360px;margin:64px auto 0">
    <div style="text-align:center;margin-bottom:20px">
      <div class="logo-mark" style="margin:0 auto 12px">${ICON_CHECK}</div>
      <div class="eyebrow">Clases particulares</div>
      <h1 style="font-size:22px">Revisá tu correo</h1>
    </div>
    <div class="formcard">
      <div style="font-size:13.5px;margin-bottom:10px">Tu cuenta todavía no está confirmada. Te enviamos un correo a
        <b>${esc(state.pendingConfirmEmail||"")}</b> con un link de confirmación — abrilo para activarla.</div>
      <button class="primary" style="width:100%;margin-left:0" data-a="resend-confirm" ${state.confirmStatus==="sending"?"disabled":""}>Reenviar correo</button>
      <button class="chip" style="margin-top:10px;border:none;background:none;padding:2px 0;color:var(--muted)" data-a="back-to-login">← Volver a iniciar sesión</button>
      <div class="hint" id="confirmMsg" style="margin-top:10px;min-height:16px;color:${state.confirmStatus==="error"?"var(--red)":state.confirmStatus==="ok"?"var(--green)":"var(--faint)"}">${esc(confirmStatusText())}</div>
    </div>
  </div>`;
}

function confirmStatusText(){
  if(state.confirmStatus==="sending") return "Enviando…";
  if(state.confirmStatus==="ok") return "Listo, te reenviamos el correo.";
  if(state.confirmStatus==="error") return state.confirmError||"No se pudo reenviar el correo.";
  return "";
}


function vSetPassword(){
  return `<div style="max-width:360px;margin:64px auto 0">
    <div style="text-align:center;margin-bottom:20px">
      <div class="logo-mark" style="margin:0 auto 12px">${ICON_CHECK}</div>
      <div class="eyebrow">Clases particulares</div>
      <h1 style="font-size:22px">Elegí una contraseña nueva</h1>
    </div>
    <div class="formcard">
      <div class="field"><div class="flabel">Contraseña nueva (mínimo 6 caracteres)</div>
        <input id="newpass1" type="password" autocomplete="new-password" data-enter="auth-set-password"></div>
      <div class="field" style="margin-top:8px"><div class="flabel">Repetila</div>
        <input id="newpass2" type="password" autocomplete="new-password" data-enter="auth-set-password"></div>
      <button class="primary" style="margin:14px 0 0;margin-left:0;width:100%" data-a="auth-set-password">Guardar contraseña</button>
      <div class="hint" id="authMsg" style="margin-top:10px;min-height:16px"></div>
    </div>
  </div>`;
}


// Programa Active Tester (paso 202): el pedido manda un reporte con tipo "active_tester" (ver
// solicitar-active-tester en events.js) — sin lectura de `reportes` para no-admin, así que sólo
// sabemos "ya lo pedí desde este dispositivo" (activeTesterRequested(), helpers.js), nunca si el
// admin ya le dio la plaza o no (eso lo administra a mano desde el panel).
function vActiveTesterCard(){
  const requested = activeTesterRequested();
  const sending = state.activeTesterStatus==="sending";
  return `<div class="formcard">
    <div class="ftitle">Programa Active Tester</div>
    <div style="font-size:13px;line-height:1.55;margin-bottom:8px">${esc(ACTIVE_TESTER_NOTE)}</div>
    <div class="hint" style="margin-bottom:10px">${esc(ACTIVE_TESTER_FINE_PRINT)}</div>
    ${state.activeTesterError?`<div class="saveerr" style="margin-bottom:8px">${esc(state.activeTesterError)}</div>`:""}
    <button class="chip ${requested?"on":""}" data-a="solicitar-active-tester" ${(requested||sending)?"disabled":""}>${requested?"Solicitud enviada ✓":sending?"Enviando…":"Solicitar mi plaza"}</button>
  </div>`;
}

// Switch de recordatorios de cobro (Cuenta) + notificación del navegador — el permiso de
// Notification API recién se pide al tocar el botón (ver toggle-notif-os en events.js), nunca
// de entrada. "notifSupported" evita referenciar Notification donde no exista (apps nativas).
function vRecordatoriosCard(){
  const rec = recordatoriosFor();
  const notifSupported = typeof Notification!=="undefined";
  const notifDenied = notifSupported && Notification.permission==="denied";
  let h = `<div class="formcard"><div class="ftitle">Recordatorios de cobro</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:${rec.activo?"10px":"0"}">
      <button class="chip ${!rec.activo?"on":""}" data-a="toggle-recordatorios" data-f="no">No</button>
      <button class="chip ${rec.activo?"on":""}" data-a="toggle-recordatorios" data-f="si">Sí</button>
    </div>`;
  if(rec.activo){
    h += `<div class="field" style="max-width:260px"><div class="flabel">Avisar a partir de cuántos días de atraso</div>
      <input type="number" min="0" data-cf="rec-dias" value="${rec.diasAtraso}"></div>
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--soft)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <div><div style="font-weight:600;font-size:13.5px">Notificación del navegador</div>
          <div class="hint" style="margin-top:2px">Los avisos aparecen al abrir la app. Push real con la app cerrada necesita servidor: queda para más adelante.</div></div>
        ${notifSupported
          ? `<button class="chip ${rec.notificacionesOS?"on":""}" data-a="toggle-notif-os">${rec.notificacionesOS?"Activada":"Desactivada"}</button>`
          : `<span class="hint">No disponible en este dispositivo</span>`}
      </div>
      ${notifDenied?`<div class="hint" style="color:var(--status-desaprobo-fg);margin-top:6px">Este navegador tiene los avisos bloqueados para el sitio — activalos desde su configuración y volvé a tocar el botón.</div>`:""}
    </div>`;
  }
  return h + `</div>`;
}

// Recordatorio push de las clases del día (paso 108): a diferencia de vRecordatoriosCard() de
// arriba (avisos de cobro, sólo suenan con la app abierta), esto sí llega con la app cerrada —
// suscribe el service worker a PushManager y guarda la suscripción en push_subscriptions
// (setNotifClasesDia() en sync.js); el envío real corre del lado del servidor (cron matutino +
// Edge Function enviar-push, ver 018_push_clases.sql en cuaderno-supabase), en modo simulacro
// hasta activarlo a mano ahí. No disponible en Tauri/Capacitor (no registran service worker,
// ver IS_NATIVE en config.js) ni en navegadores sin soporte de Push API.
function vNotifClasesCard(){
  const ses=getSes();
  const supported = !IS_NATIVE && typeof Notification!=="undefined" && "serviceWorker" in navigator && "PushManager" in window;
  const denied = supported && Notification.permission==="denied";
  let h = `<div class="formcard"><div class="ftitle">Recordatorio de las clases del día</div>
    <div class="hint" style="margin-bottom:10px">Una notificación a la mañana con cuántas clases tenés hoy y a qué hora es la primera — llega aunque tengas la app cerrada.</div>`;
  h += supported
    ? `<div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="chip ${!(ses&&ses.notifClasesDia)?"on":""}" data-a="toggle-notif-clases" data-f="no">Apagado</button>
        <button class="chip ${(ses&&ses.notifClasesDia)?"on":""}" data-a="toggle-notif-clases" data-f="si">Recordarme las clases del día</button>
      </div>`
    : `<span class="hint">No disponible en este dispositivo${IS_NATIVE?" — usá la versión web instalada desde el navegador para esto":""}.</span>`;
  if(denied) h += `<div class="hint" style="color:var(--status-desaprobo-fg);margin-top:6px">Este navegador tiene los avisos bloqueados para el sitio — activalos desde su configuración y volvé a tocar el botón.</div>`;
  return h + `</div>`;
}

// Escala para el cierre de objetivo de clase (paso 91): Simple (Sí/A medias/No, default) o
// Porcentaje (un solo número 0-100). El resultado siempre se guarda igual (estado+pct, ver
// escalaObjetivoFor en helpers.js), así que cambiar de escala no rompe el historial ni las
// estadísticas — sólo cambia qué formulario se muestra al cerrar la próxima clase.
function vEscalaObjetivoCard(){
  const escala = escalaObjetivoFor();
  return `<div class="formcard"><div class="ftitle">Escala de valoración del objetivo de clase</div>
    <div class="hint" style="margin-bottom:10px">Cómo se responde «¿Se cumplió el objetivo?» al cerrar una clase.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="chip ${escala==="simple"?"on":""}" data-a="set-escala-objetivo" data-f="simple">Simple (Sí / A medias / No)</button>
      <button class="chip ${escala==="porcentaje"?"on":""}" data-a="set-escala-objetivo" data-f="porcentaje">Porcentaje</button>
    </div>
  </div>`;
}

// Plantillas de mensajes (paso 117) — TODOS los mensajes de WhatsApp que arma la app (más el
// texto del recibo, que se comparte por el mismo medio), en un solo lugar editable. Cada una
// con su "Restaurar" propio — vuelve sólo esa plantilla al default de MENSAJES_META (config.js),
// nunca toca las demás. Ver mensajesFor()/mensajeTexto() en helpers.js.
// Una plantilla general colapsada (sólo el nombre) — se abre de a una para editar, mismo criterio
// que vMatUnitBlock (biblioteca del portal): un único id abierto en toda la tarjeta de Mensajes.
function vMensajePlantillaRow(m){
  const mensajes = mensajesFor();
  const open = state.mensajeAbierto==="meta:"+m.key;
  return `<div class="cuenta-group" style="margin:8px 0">
    <button class="cuenta-group-head" data-a="msg-tpl-toggle" data-key="meta:${m.key}" aria-expanded="${open}">
      <div class="ftitle" style="margin:0">${esc(m.label)}</div>
      <span class="faq-caret ${open?"open":""}">${ICON_CHEVRON}</span>
    </button>
    ${open?`<div class="cuenta-group-body">
      <div style="display:flex;align-items:center;justify-content:flex-end;margin-bottom:6px">
        <button class="chip" data-a="restaurar-mensaje" data-key="${m.key}">Restaurar</button>
      </div>
      <div class="hint" style="margin-bottom:6px">Variables: ${esc(m.vars)}</div>
      <textarea data-cf="mensaje-${m.key}" placeholder="${esc(m.default)}">${esc(mensajes[m.key]||"")}</textarea>
    </div>`:""}
  </div>`;
}

// Plantilla propia colapsada, mismo patrón — el nombre se edita en el header mismo (no hay
// "Restaurar", tiene "Borrar" con confirmación inline en su lugar, ver events.js).
function vPlantillaPropiaRow(p){
  const open = state.mensajeAbierto==="propia:"+p.id;
  const confirming = state.propiaDelConfirmId===p.id;
  return `<div class="cuenta-group" style="margin:8px 0">
    <button class="cuenta-group-head" data-a="msg-tpl-toggle" data-key="propia:${p.id}" aria-expanded="${open}">
      <div class="ftitle" style="margin:0">${esc(p.nombre||"(sin nombre)")}</div>
      <span class="faq-caret ${open?"open":""}">${ICON_CHEVRON}</span>
    </button>
    ${open?`<div class="cuenta-group-body">
      <div class="field"><div class="flabel">Nombre</div>
        <input data-cf="propia-nombre-${p.id}" value="${esc(p.nombre||"")}" placeholder="Ej: Recordatorio de material"></div>
      <div class="hint" style="margin:8px 0 6px">Variables: ${esc(PLANTILLA_PROPIA_VARS)}</div>
      <textarea data-cf="propia-texto-${p.id}" placeholder="Escribí el mensaje…">${esc(p.texto||"")}</textarea>
      <div style="margin-top:8px">
        ${!confirming?`<button class="del" data-a="propia-del-ask" data-id="${p.id}">Borrar plantilla</button>`
          :`<span style="font-size:12px;color:var(--status-desaprobo-fg)">¿Borrar «${esc(p.nombre||"esta plantilla")}»?</span>
          <button class="danger" data-a="propia-del-confirm" data-id="${p.id}">Sí, borrar</button>
          <button class="chip" data-a="propia-del-cancel">Cancelar</button>`}
      </div>
    </div>`:""}
  </div>`;
}

// Un grupo de contexto (Cobros/Clases/Llaves/Celebraciones/Otros) — colapsado por defecto,
// independiente de los demás (a diferencia de vMensajePlantillaRow, que sólo deja una plantilla
// abierta a la vez adentro de cualquier grupo).
function vMensajesGrupo(g){
  const open = !!(state.mensajesCtxOpen && state.mensajesCtxOpen[g.id]);
  const items = MENSAJES_META.filter(m=>g.keys.includes(m.key));
  return `<div class="cuenta-group" style="margin:10px 0">
    <button class="cuenta-group-head" data-a="msg-ctx-toggle" data-id="${g.id}" aria-expanded="${open}">
      <div class="ftitle" style="margin:0">${esc(g.label)}</div>
      <span class="faq-caret ${open?"open":""}">${ICON_CHEVRON}</span>
    </button>
    ${open?`<div class="cuenta-group-body">${items.map(vMensajePlantillaRow).join("")}</div>`:""}
  </div>`;
}

function vMensajesCard(){
  const propias = mensajesPropiasFor();
  const open = !!(state.mensajesCtxOpen && state.mensajesCtxOpen.propias);
  return `<div class="formcard"><div class="ftitle">Mensajes</div>
    <div class="hint" style="margin-bottom:10px">Los textos que la app arma para WhatsApp (y el recibo), agrupados por tema — tocá un grupo y después una plantilla para editarla. "Restaurar" vuelve esa plantilla puntual a como venía.</div>
    ${MENSAJES_GRUPOS.map(vMensajesGrupo).join("")}
    <div class="cuenta-group" style="margin:10px 0">
      <button class="cuenta-group-head" data-a="msg-ctx-toggle" data-id="propias" aria-expanded="${open}">
        <div><div class="ftitle" style="margin:0">Mis plantillas</div>
          <div class="hint">${propias.length} plantilla${propias.length===1?"":"s"} propia${propias.length===1?"":"s"} — aparecen junto a las generales al mandar un mensaje.</div></div>
        <span class="faq-caret ${open?"open":""}">${ICON_CHEVRON}</span>
      </button>
      ${open?`<div class="cuenta-group-body">
        ${propias.length?propias.map(vPlantillaPropiaRow).join(""):`<div class="empty" style="font-size:13px">Sin plantillas propias todavía.</div>`}
        <button class="chip" style="margin-top:8px" data-a="propia-nueva">+ Nueva plantilla</button>
      </div>`:""}
    </div>
  </div>`;
}

// Cobros del docente (paso 141): alias/CVU + links de pago propios (sin API, sin comisiones,
// sin procesar nada nosotros — el docente sigue registrando los pagos a mano, como siempre) y un
// QR opcional (mismo bucket/cuota que las fotos de perfil, ver uploadCobrosQr en sync.js). Se
// muestra en el portal individual de cada alumno (buildAlumnoBlock/publicarPortal en sync.js) —
// nunca en la llave grupal ni la general.
// Tarifa habitual (paso 176): modalidad+monto+duración típica de la cuenta — precarga el alta de
// alumno en modo simple (vModal()) sin obligar a tocar nada ahí; la tarifa especial por alumno
// sigue viviendo en Opciones avanzadas del alta y en la ficha, sin cambios.
function vTarifaDefaultCard(){
  const t = tarifaDefaultFor();
  return `<div class="formcard"><div class="ftitle">Tu tarifa habitual</div>
    <div class="hint" style="margin-bottom:10px">La que usa de entrada el alta de alumno nuevo — cambiarla acá no toca la tarifa ya cargada de ningún alumno existente.</div>
    <div class="frow">
      <div class="field"><div class="flabel">Modalidad</div><select data-cf="tarifa-default-modalidad">
        <option value="" ${!t.modalidad?"selected":""}>—</option>
        <option value="clase" ${t.modalidad==="clase"?"selected":""}>Por clase</option>
        <option value="hora" ${t.modalidad==="hora"?"selected":""}>Por hora</option></select></div>
      <div class="field"><div class="flabel">Monto (pesos)</div><input type="number" min="0" data-cf="tarifa-default-monto" value="${esc(t.monto||"")}"></div>
      <div class="field"><div class="flabel">Duración típica</div>${durationFieldHtml(t.duracion, {dataCf:"tarifa-default-duracion"})}</div>
    </div>
  </div>`;
}

// Un pack de catálogo colapsado, mismo patrón que vPlantillaPropiaRow (paso 175) — nombre en el
// header, se abre de a uno para editar (state.mensajeAbierto se reusa como "abierto único" acá
// también, con su propio prefijo "pack:" para no chocar con las plantillas de mensajes).
function vPackCatalogoRow(p){
  const open = state.mensajeAbierto==="pack:"+p.id;
  const confirming = state.packCatalogoDelConfirmId===p.id;
  return `<div class="cuenta-group" style="margin:8px 0">
    <button class="cuenta-group-head" data-a="msg-tpl-toggle" data-key="pack:${p.id}" aria-expanded="${open}">
      <div><div class="ftitle" style="margin:0">${esc(p.nombre||"(sin nombre)")}</div>
        <div class="hint">${Number(p.cantidad)||0} clases — ${fmtMoney(p.precio)}${p.mostrarPortal?" · en el portal":""}</div></div>
      <span class="faq-caret ${open?"open":""}">${ICON_CHEVRON}</span>
    </button>
    ${open?`<div class="cuenta-group-body">
      <div class="frow">
        <div class="field"><div class="flabel">Nombre</div><input data-cf="pack-cat-nombre-${p.id}" value="${esc(p.nombre||"")}" placeholder="Ej: Pack 8 clases"></div>
        <div class="field" style="max-width:120px"><div class="flabel">Cantidad</div><input type="number" min="1" data-cf="pack-cat-cantidad-${p.id}" value="${esc(p.cantidad||"")}"></div>
        <div class="field" style="max-width:160px"><div class="flabel">Precio total</div><input type="number" min="0" data-cf="pack-cat-precio-${p.id}" value="${esc(p.precio||"")}"></div>
      </div>
      <div class="field"><div class="flabel">Vigencia (opcional)</div><input data-cf="pack-cat-vigencia-${p.id}" value="${esc(p.vigenciaTexto||"")}" placeholder="Ej: válido hasta fin de cuatrimestre"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px">
        <button class="chip ${p.mostrarPortal?"on":""}" data-a="pack-cat-toggle-portal" data-id="${p.id}">${p.mostrarPortal?"✓ Mostrado en el portal":"Mostrar en el portal"}</button>
        ${!confirming?`<button class="del" data-a="pack-cat-del-ask" data-id="${p.id}">Borrar</button>`
          :`<span style="font-size:12px;color:var(--status-desaprobo-fg)">¿Borrar «${esc(p.nombre||"este pack")}»?</span>
          <button class="danger" data-a="pack-cat-del-confirm" data-id="${p.id}">Sí, borrar</button>
          <button class="chip" data-a="pack-cat-del-cancel">Cancelar</button>`}
      </div>
      <div class="hint" style="margin-top:6px">Mostrarlo en el portal lo suma como promo (sin vender nada solo) — falta "Publicar cambios" en Portal para que se vea.</div>
    </div>`:""}
  </div>`;
}

function vPacksCatalogoCard(){
  const packs = packsCatalogoFor();
  return `<div class="formcard"><div class="ftitle">Mis packs</div>
    <div class="hint" style="margin-bottom:10px">Armá packs de varias clases una sola vez — al vender uno desde la ficha de un alumno, elegís acá en vez de cargar cantidad y precio a mano cada vez. Los que marqués "Mostrar en el portal" aparecen como promo para tus alumnos.</div>
    ${packs.length?packs.map(vPackCatalogoRow).join(""):`<div class="empty" style="font-size:13px">Sin packs de catálogo todavía.</div>`}
    <button class="chip" style="margin-top:8px" data-a="pack-cat-nuevo">+ Nuevo pack</button>
  </div>`;
}

function vCobrosCard(){
  const c = cobrosDocenteFor();
  const qrUrl = c.qr ? avatarUrlFor(c.qr) : null;
  const uploading = state.cobrosQrUploading;
  const confirming = state.cobrosQrDeleteConfirm;
  const offline = !navigator.onLine;
  return `<div class="formcard"><div class="ftitle">Medios de pago</div>
    <div class="hint" style="margin-bottom:10px">Para que cada alumno vea cómo pagarte desde su propio portal — sin API, sin comisiones, sin procesar nada nosotros. Cuando te paguen, registralo como siempre (pestaña Pagos, en la ficha del alumno); esto no cobra ni confirma nada solo.</div>
    <div class="frow">
      <div class="field"><div class="flabel">Alias / CVU</div><input data-cf="cobros-alias" placeholder="tu.alias.mp" value="${esc(c.alias||"")}"></div>
    </div>
    <div class="frow" style="margin-top:10px">
      <div class="field"><div class="flabel">Link de pago de Mercado Pago</div>
        <input data-cf="cobros-linkmp" placeholder="https://link.mercadopago.com.ar/…" value="${esc(c.linkMP||"")}">
        ${state.cobrosLinkMPError?`<div class="hint" style="color:var(--status-desaprobo-fg)">${esc(state.cobrosLinkMPError)}</div>`:""}</div>
      <div class="field"><div class="flabel">Otro link de pago (Brubank, etc.)</div>
        <input data-cf="cobros-linkotro" placeholder="https://…" value="${esc(c.linkOtro||"")}">
        ${state.cobrosLinkOtroError?`<div class="hint" style="color:var(--status-desaprobo-fg)">${esc(state.cobrosLinkOtroError)}</div>`:""}</div>
    </div>
    <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--soft)">
      <div class="flabel" style="margin-bottom:6px">Código QR (opcional)</div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        ${c.qr ? `<img src="${qrUrl||""}" alt="" style="width:96px;height:96px;border-radius:8px;object-fit:contain;background:var(--soft)">` : ""}
        <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-width:220px">
          ${offline ? `<div class="hint">Necesitás conexión a internet para subir o cambiar el QR.</div>` : IS_DEMO ? `<span class="hint">En modo demostración no se pueden subir imágenes.</span>` : `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <input type="file" accept="image/*" id="cobros-qr-file" style="max-width:220px" ${uploading?"disabled":""}>
            <button class="chip" data-a="cobros-qr-upload" data-input="cobros-qr-file" ${uploading?"disabled":""}>${uploading?"Subiendo…":(c.qr?"Cambiar QR":"+ Subir QR")}</button>
            ${c.qr && !confirming ? `<button class="chip" data-a="cobros-qr-delete-ask">Borrar QR</button>` : ""}
            ${confirming ? `<span style="font-size:12px;color:var(--status-desaprobo-fg)">¿Borrar el QR?</span>
              <button class="danger" data-a="cobros-qr-delete-confirm">Sí, borrar</button>
              <button class="chip" data-a="cobros-qr-delete-cancel">Cancelar</button>` : ""}
          </div>`}
          ${state.cobrosQrError ? `<div class="hint" style="color:var(--status-desaprobo-fg)">${esc(state.cobrosQrError==="offline"?"Necesitás conexión a internet para subir el QR.":state.cobrosQrError)}</div>` : ""}
          <div class="hint">Se achica automáticamente antes de subir (máx. ${QR_SIZE_PX}px de lado).</div>
        </div>
      </div>
    </div>
    <div class="hint" style="margin-top:12px">Con llave grupal o general no se muestra nada de esto — sólo lo ve cada alumno en su propio portal individual, junto a su saldo pendiente. Falta "Publicar cambios" abajo en Portal para que un cambio acá se vea del otro lado.</div>
  </div>`;
}

// Cuenta ordenada (paso 142, subpestañas reales desde el 202): en vez de un acordeón en el
// mismo lugar, la barra de arriba (CUENTA_GROUPS_META/vCuentaIndice) son subpestañas de verdad —
// tocar una reemplaza el contenido de abajo por esa sección ENTERA (nada más colapsado a nivel
// de sección, `state.cuentaOpenGroupId` guarda cuál está seleccionada, ninguna por defecto).
// Adentro de una subpestaña, si hay mucho contenido (Cobros, Portal) se usan sub-desplegables
// propios (vCuentaSub(), cerrados por defecto, uno abierto por vez POR subpestaña —
// `state.cuentaSubOpen[groupId]`) para no abrumar; el resto de las subpestañas muestran todo
// entero, sin ningún desplegable extra. Lo esencial (con qué cuenta estoy, estado de sync,
// sincronizar) no vive adentro de ninguna subpestaña: ver vCuentaEssentials(), siempre visible
// arriba de todo esto. Cada sección adentro sigue usando los mismos ${xCard()}/formcards de
// siempre, sin tocar su HTML interno ni sus data-a/data-cf.
const CUENTA_GROUPS_META = [
  {id:"perfil", label:"Perfil"}, {id:"cobros", label:"Cobros"}, {id:"preferencias", label:"Preferencias"},
  {id:"mensajes", label:"Mensajes"}, {id:"portal", label:"Portal"}, {id:"gruposclase", label:"Grupos"},
  {id:"datos", label:"Datos"}, {id:"aplicacion", label:"Aplicación"}, {id:"sesion", label:"Sesión"},
];

function vCuentaIndice(){
  return `<div class="cuenta-indice">${CUENTA_GROUPS_META.map(g=>
    `<button class="chip ${state.cuentaOpenGroupId===g.id?"on":""}" data-a="cuenta-tab-select" data-id="${g.id}">${esc(g.label)}</button>`).join("")}</div>`;
}

// Barra esencial (paso 200): con qué cuenta estoy, estado de sync y "Sincronizar ahora" —
// siempre visible arriba de las subpestañas, sin importar cuál esté seleccionada. El resto del
// detalle de la cuenta (admin/profesor, cerrar sesión) sigue en la subpestaña "Sesión".
function vCuentaEssentials(){
  const ses=getSes();
  return `<div class="formcard" style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
    <div>
      <div style="font-size:13.5px">Conectado como <b>${esc(ses?ses.email:"")}</b></div>
      <div class="hint">${syncStatusText()}</div>
    </div>
    <button class="chip" data-a="sync-now">Sincronizar ahora</button>
  </div>`;
}

// Subpestaña seleccionada: título + descripción (fijos, no colapsables) y su contenido entero.
// Ninguna seleccionada todavía: pista para tocar una de arriba, en vez de una pantalla en blanco.
function vCuentaGroup(id, title, desc, bodyHtml){
  if(state.cuentaOpenGroupId!==id) return "";
  return `<div class="cuenta-group" id="cuenta-grp-${id}">
    <div class="cuenta-group-head" style="cursor:default">
      <div><div class="ftitle" style="margin-bottom:2px">${esc(title)}</div>
        <div class="hint">${esc(desc)}</div></div>
    </div>
    <div class="cuenta-group-body">${bodyHtml}</div>
  </div>`;
}
function vCuentaVacia(){
  if(state.cuentaOpenGroupId) return "";
  return `<div class="hint" style="text-align:center;padding:24px 0">Elegí una sección de arriba para verla entera.</div>`;
}

// Sub-desplegable DENTRO de una subpestaña (paso 202), sólo para las que tienen mucho contenido
// (Cobros, Portal) — mismo patrón visual que antes tenía vCuentaGroup a nivel de sección, pero con
// su propio estado por subpestaña (`state.cuentaSubOpen[groupId]`, un id o null) para no chocar
// entre secciones distintas. Cerrado por defecto, se abre de a uno por vez.
function vCuentaSub(groupId, id, title, bodyHtml){
  const open = (state.cuentaSubOpen&&state.cuentaSubOpen[groupId])===id;
  return `<div class="cuenta-group" style="margin-bottom:10px">
    <button class="cuenta-group-head" data-a="cuenta-sub-toggle" data-group="${groupId}" data-id="${id}" aria-expanded="${open}">
      <div class="ftitle" style="margin-bottom:0">${esc(title)}</div>
      <span class="faq-caret ${open?"open":""}">${ICON_CHEVRON}</span>
    </button>
    ${open?`<div class="cuenta-group-body">${bodyHtml}</div>`:""}
  </div>`;
}

function vCuenta(){
  const ses=getSes();
  const pol=cancelPolicyFor();
  const doc=docenteFor();
  return pageHead("Cuenta","Tu cuenta y preferencias",null,
    "Todo lo tuyo, agrupado — tocá una sección de arriba para verla entera.") + `
  ${vCuentaEssentials()}
  ${vCuentaIndice()}
  ${vCuentaVacia()}
  ${vCuentaGroup("perfil","Perfil docente","Tus datos y tu foto — se reutilizan en el generador de contratos y en el portal.", `
    ${vAvatarEditor(AVATAR_KEY_DOCENTE, doc.nombre||"Docente", doc.foto, 64)}
    <div class="frow" style="margin-top:14px">
      <div class="field"><div class="flabel">Nombre completo</div><input data-cf="docente-nombre" value="${esc(doc.nombre||"")}"></div>
      <div class="field"><div class="flabel">Teléfono</div><input data-cf="docente-telefono" value="${esc(doc.telefono||"")}"></div>
      <div class="field"><div class="flabel">DNI / CUIT (opcional)</div><input data-cf="docente-dni" value="${esc(doc.dni||"")}"></div>
    </div>
    ${vActiveTesterCard()}`)}
  ${vCuentaGroup("cobros","Cobros","Tarifa, packs, alias, links de pago y QR — se muestran en el portal individual de cada alumno.",
    vCuentaSub("cobros","tarifa","Tarifa por defecto", vTarifaDefaultCard()) +
    vCuentaSub("cobros","packs","Packs de catálogo", vPacksCatalogoCard()) +
    vCuentaSub("cobros","medios","Medios de pago y QR", vCobrosCard()))}
  ${vCuentaGroup("preferencias","Preferencias","Tema, color, densidad, sonidos, escala de objetivos, cancelaciones, recordatorios y avisos.", `
    <div class="formcard"><div class="ftitle">Apariencia</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${themeBtn("system","Según el sistema")}${themeBtn("light","Claro")}${themeBtn("dark","Oscuro")}
      </div>
      <div class="flabel" style="margin:14px 0 6px">Densidad</div>
      <div class="hint" style="margin-bottom:8px">Compacta reduce el alto de filas y tarjetas en las listas largas (estudiantes, clases, pagos, agenda, materiales) para ver más de un vistazo.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${densityBtn("comoda","Cómoda")}${densityBtn("compacta","Compacta")}
      </div>
      <div class="flabel" style="margin:14px 0 6px">Color de la app</div>
      <div class="hint" style="margin-bottom:8px">El acento de botones, pestañas y barras en toda la app — el portal para tus alumnos y la landing siguen con el color de marca.</div>
      <div class="subj-swatches">${Object.keys(ACCENT_PALETTE).map(k=>{
        const sel = getAccent()===k;
        return `<button class="subj-swatch ${sel?"sel":""}" data-a="set-accent" data-f="${k}"
          style="background:${ACCENT_PALETTE[k].light.accent}" title="${esc(ACCENT_PALETTE[k].label)}">${sel?ICON_CHECK:""}</button>`;
      }).join("")}</div>
    </div>
    <div class="formcard"><div class="ftitle">Sonidos</div>
      <div class="hint" style="margin-bottom:8px">Un "tin"/"ding" discreto al registrar una clase o confirmar un cobro, y un acorde corto al cumplir un objetivo — nunca al cargar la página ni al navegar. Se silencian solos si el sistema pide reducir animaciones.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="chip ${!soundsOn()?"on":""}" data-a="toggle-sonidos" data-f="no">Apagados</button>
        <button class="chip ${soundsOn()?"on":""}" data-a="toggle-sonidos" data-f="si">Activados</button>
      </div>
    </div>
    <div class="formcard"><div class="ftitle">Animaciones</div>
      <div class="hint" style="margin-bottom:8px">Números que cuentan, barras que crecen y el confetti al cumplir un objetivo. Se apagan solas si el sistema pide reducir animaciones, aunque acá esté en "Activadas".</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="chip ${!animsOn()?"on":""}" data-a="toggle-animaciones" data-f="no">Apagadas</button>
        <button class="chip ${animsOn()?"on":""}" data-a="toggle-animaciones" data-f="si">Activadas</button>
      </div>
    </div>
    <div class="formcard"><div class="ftitle">Fondo decorativo</div>
      <div class="hint" style="margin-bottom:8px">Una textura sutil de cuaderno (renglones y símbolos matemáticos) detrás de las pantallas, a muy baja opacidad. No afecta la lectura de los datos.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="chip ${!bgOn()?"on":""}" data-a="toggle-fondo" data-f="no">Apagado</button>
        <button class="chip ${bgOn()?"on":""}" data-a="toggle-fondo" data-f="si">Activado</button>
      </div>
    </div>
    <div class="formcard"><div class="ftitle">Tu día y racha</div>
      <div class="hint" style="margin-bottom:8px">La tarjeta "Tu día" del tablero, con tus pendientes reales de hoy y la racha de días al día.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="chip ${!mostrarTuDia()?"on":""}" data-a="toggle-tu-dia" data-f="no">Ocultar</button>
        <button class="chip ${mostrarTuDia()?"on":""}" data-a="toggle-tu-dia" data-f="si">Mostrar Tu día y racha</button>
      </div>
    </div>
    ${vEscalaObjetivoCard()}
    <div class="formcard"><div class="ftitle" style="display:flex;align-items:center;gap:7px">Política de cancelación${helpTip("cancelPolicy")}</div>
      <div class="hint" style="margin-bottom:10px">Se aplica al cancelar una clase puntual con seña ya cobrada (ver la ficha de cada alumno). El texto queda guardado para reutilizarlo donde haga falta.</div>
      <div class="frow">
        <div class="field" style="max-width:200px"><div class="flabel">Horas mínimas de aviso</div>
          <input type="number" min="0" data-cf="policy-horas" value="${pol.horasMinimas}"></div>
        <div class="field"><div class="flabel">Si cancela a tiempo, la seña…</div>
          <select data-cf="policy-atiempo">
            <option value="devuelve" ${pol.siATiempo!=="acredita"?"selected":""}>Se devuelve</option>
            <option value="acredita" ${pol.siATiempo==="acredita"?"selected":""}>Se acredita a la próxima clase</option>
          </select></div>
      </div>
      <div class="field"><div class="flabel">Texto de la política (opcional, para compartir)</div>
        <textarea data-cf="policy-texto" placeholder="Ej: Las clases se cancelan con 24hs de aviso. Con menos aviso, la seña no se devuelve.">${esc(pol.texto||"")}</textarea></div>
      <div class="hint" style="margin-top:6px">Si la seña de esa clase todavía no se cobró, cancelar no tiene ninguna consecuencia sobre ella.</div>
    </div>
    ${vRecordatoriosCard()}
    ${vNotifClasesCard()}
    <div class="formcard"><div class="ftitle">Resumen semanal por mail</div>
      <div class="hint" style="margin-bottom:8px">Clases dadas, plata cobrada y pendiente, próximos exámenes/objetivos y alumnos que se están enfriando — todos los domingos a la noche.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="chip ${!(ses&&ses.resumenSemanal)?"on":""}" data-a="toggle-resumen-semanal" data-f="no">Apagado</button>
        <button class="chip ${(ses&&ses.resumenSemanal)?"on":""}" data-a="toggle-resumen-semanal" data-f="si">Recibir el resumen semanal por mail</button>
      </div>
    </div>
    <div class="formcard"><div class="ftitle">Recordatorio por mail de clases</div>
      <div class="hint" style="margin-bottom:8px">Cuántas horas antes de cada clase le llega el recordatorio a los alumnos que tenés activados (se activa por alumno, desde su ficha → Portal). La primera semana corre en modo simulacro — no manda mails reales todavía.</div>
      <div class="field" style="max-width:160px"><div class="flabel">Horas antes</div>
        <input type="number" min="1" max="48" data-cf="recordatorio-horas-antes" value="${ses&&ses.recordatorioClasesHorasAntes||14}"></div>
    </div>`)}
  ${vCuentaGroup("mensajes","Mensajes y plantillas","Los textos que la app arma para WhatsApp y el recibo — todos editables desde acá.", vMensajesCard())}
  ${vCuentaGroup("portal","Portal — el centro de todo","La página pública para tus alumnos y todo lo que la controla: llave general, llaves por alumno y grupales, reservas, cancelaciones, avisos, cobros y una vista previa.",
    vPortalCard()+
    `<div class="formcard"><div class="ftitle">Cobros del portal</div>
      <div class="hint" style="margin-bottom:10px">Alias, links de pago y QR — lo que cada alumno ve en su portal individual, junto a su saldo pendiente.</div>
      <button class="chip" data-a="cuenta-tab-select" data-id="cobros">Ir a Cobros</button>
    </div>`+
    vCuentaSub("portal","reserva","Cómo te piden clases", vReservaModoCard())+
    vCuentaSub("portal","cancelar","Cancelar una clase", vCancelarClaseCard())+
    vCuentaSub("portal","avisos","Avisos", vPortalAvisosCard())+
    vCuentaSub("portal","llaves","Llaves por alumno", vPortalLlavesAlumnosCard())+
    vCuentaSub("portal","grupos","Llaves grupales", vPortalGruposCard())+
    vCuentaSub("portal","preview","Ver como alumno", vPortalPreviewCard()))}
  ${vCuentaGroup("gruposclase","Grupos de clase","Quiénes integran cada clase grupal (intensivos, grupitos de 2-3) — para no re-elegirlos cada vez. Distinto de las llaves grupales de portal, de arriba.", vGruposClaseCard())}
  ${vCuentaGroup("datos","Datos y respaldos","Copias automáticas, retención y la papelera de alumnos/materias borrados.", `
    <div class="formcard"><div class="ftitle">Respaldos automáticos</div>
      <div class="hint" style="margin-bottom:10px">Se guarda una copia completa una vez por día, en la primera sincronización. Se conservan las últimas ${MAX_BACKUPS}. Esto no reemplaza la copia manual (.json), que se descarga desde Estudiantes — conviven.</div>
      ${vBackupsList()}
    </div>
    ${vPapeleraCard()}`)}
  ${vCuentaGroup("aplicacion","Aplicación","Versión instalada, buscar actualizaciones, ayuda y reportar un problema.", `
    <div class="formcard"><div class="ftitle">Versión</div>
      ${!IS_NATIVE?`<div class="hint" style="margin-bottom:8px">Estás usando la v${esc(APP_VERSION)}${state.swUpdateReady?" — hay una versión nueva esperando arriba de todo, tocá «Actualizar».":"."}</div>
      <button class="chip" data-a="sw-check-update" ${state.swCheckStatus==="checking"?"disabled":""}>${state.swCheckStatus==="checking"?"Buscando…":"Buscar actualización"}</button>`
      :`<div class="hint">Estás usando la v${esc(APP_VERSION)}.</div>`}
      <div class="hint" style="margin-top:8px"><a href="../terminos.html" target="_blank" rel="noopener">Términos y privacidad</a></div>
    </div>
    ${vCentroAyuda()}
    <div class="formcard"><div class="ftitle">Reportar un problema</div>
      <div class="field"><textarea id="report-msg" placeholder="Contanos qué pasó — cuanto más detalle, mejor.">${esc(state.reportMsg||"")}</textarea></div>
      <button class="primary" style="margin:10px 0 0;margin-left:0" data-a="send-report" ${state.reportStatus==="sending"?"disabled":""}>Enviar reporte</button>
      <div class="hint" id="reportMsg" style="margin-top:10px;min-height:16px;color:${state.reportStatus==="error"?"var(--red)":state.reportStatus==="ok"?"var(--green)":"var(--faint)"}">${esc(reportStatusText())}</div>
    </div>`)}
  ${vCuentaGroup("sesion","Sesión","Con qué cuenta estás conectado, sincronizar a mano y cerrar sesión.", `
    <div class="formcard"><div class="ftitle">Cuenta</div>
      <div style="font-size:13.5px;margin-bottom:6px">Conectado como <b>${esc(ses?ses.email:"")}</b></div>
      <div class="hint" style="margin-bottom:6px">${sesIsAdmin(ses)?"Cuenta de administrador":"Cuenta de profesor"}</div>
      <div class="hint" style="margin-bottom:14px">${syncStatusText()}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="chip" data-a="sync-now">Sincronizar ahora</button>
        <button class="danger" data-a="auth-logout">Cerrar sesión</button>
      </div>
    </div>`)}`;
}

// Mini centro de ayuda (paso 74): acordeón simple sobre FAQ_ITEMS (config.js), un ítem
// abierto por vez (alcanza para preguntas cortas; no hace falta que convivan varias abiertas).
// Mapa de la app (paso 142): qué hay en cada sección de la barra de navegación, para orientarse
// rápido — mismo orden que la barra (ver navShell() más abajo).
const APP_MAP = [
  {nombre:"Tablero", desc:"lo que tenés que mirar hoy — clases, alertas y exámenes próximos"},
  {nombre:"Estudiantes", desc:"la lista completa de alumnos, con filtros y su ficha"},
  {nombre:"Agenda", desc:"calendario de clases, por semana o por mes"},
  {nombre:"Materias", desc:"catálogo de materias, unidades, carreras, packs y archivos"},
  {nombre:"Estadísticas", desc:"panorama del grupo: avance, objetivos, exámenes, asistencia"},
  {nombre:"Pagos", desc:"cobros, deudas y rentabilidad"},
  {nombre:"Cuenta", desc:"tus datos, cobros, preferencias, portal, respaldos y ayuda"},
];

const KEYBOARD_SHORTCUTS = [
  {keys:"/", desc:"Buscar alumnos, materias o materiales"},
  {keys:"N", desc:"Nuevo alumno"},
  {keys:"C", desc:"Nueva clase (con la ficha de un alumno abierta)"},
  {keys:"Esc", desc:"Cerrar el diálogo o popover abierto"},
];

function vCentroAyuda(){
  return `<div class="formcard"><div class="ftitle">Centro de ayuda</div>
    <div class="hint" style="margin-bottom:12px">Preguntas frecuentes sobre la app.</div>
    ${tipsDismissed()?`<button class="chip" data-a="reactivate-tips" style="margin-bottom:14px">Volver a mostrar "Primeros pasos"</button>`:""}
    ${IS_DEMO?"":`<button class="chip" data-a="tour-restart" style="margin-bottom:14px">Ver la guía de nuevo</button>`}
    <div class="flabel" style="margin-bottom:6px">Mapa de la app</div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
      ${APP_MAP.map(m=>`<div style="font-size:12.5px;color:var(--muted)"><b style="color:var(--ink)">${esc(m.nombre)}</b> — ${esc(m.desc)}</div>`).join("")}
    </div>
    <div class="flabel" style="margin-bottom:6px">Atajos de teclado (escritorio)</div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
      ${KEYBOARD_SHORTCUTS.map(k=>`<div style="display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--muted)">
        <kbd class="kbd">${esc(k.keys)}</kbd><span>${esc(k.desc)}</span>
      </div>`).join("")}
    </div>
    ${FAQ_ITEMS.map((it,i)=>{
      const open = state.faqOpenIdx===i;
      return `<div class="faq-item">
        <button class="faq-q" data-a="toggle-faq" data-i="${i}" aria-expanded="${open}">
          <span>${esc(it.q)}</span><span class="faq-caret ${open?"open":""}">${ICON_CHEVRON}</span>
        </button>
        ${open?`<div class="faq-a">${esc(it.a)}</div>`:""}
      </div>`;
    }).join("")}
  </div>`;
}

function themeBtn(v,label){
  return `<button class="chip ${getTheme()===v?"on":""}" data-a="set-theme" data-f="${v}">${label}</button>`;
}

function densityBtn(v,label){
  return `<button class="chip ${getDensity()===v?"on":""}" data-a="set-density" data-f="${v}">${label}</button>`;
}

function reportStatusText(){
  if(state.reportStatus==="sending") return "Enviando…";
  if(state.reportStatus==="ok") return "¡Gracias! Recibimos tu reporte.";
  if(state.reportStatus==="error") return state.reportError||"No se pudo enviar el reporte.";
  return "";
}


// Portal para tus alumnos (Cuenta) — activar/desactivar, ver/copiar el link, regenerar la
// llave y publicar el JSON público (ver migración 013_portal.sql y portal.html/js/portal.js).
function vPortalCard(){
  let h = `<div class="formcard"><div class="ftitle" style="display:flex;align-items:center;gap:7px">Portal para tus alumnos${helpTip("portal")}</div>`;
  if(state.portalError && !state.portal){
    h += `<div class="saveerr">${esc(state.portalError)}</div>
    <button class="chip" data-a="portal-reload">Reintentar</button></div>`;
    return h;
  }
  if(!state.portalLoaded || !state.portal){
    h += skeletonRows(2) + `</div>`;
    return h;
  }
  const p=state.portal;
  h += `<div class="hint" style="margin-bottom:10px">Una página pública, sin login, donde tus alumnos ven lo que quieras compartirles.</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
    <button class="chip ${!p.habilitado?"on":""}" data-a="portal-toggle" data-f="no">Desactivado</button>
    <button class="chip ${p.habilitado?"on":""}" data-a="portal-toggle" data-f="si">Activado</button>
  </div>`;
  if(!p.habilitado){
    h += emptyState(ICON_LINK,"El portal está apagado","Activalo para darles a tus alumnos un link propio, sin login, con lo que quieras compartirles.",
      `<button class="btn btn-primary" data-a="portal-toggle" data-f="si">Activar portal</button>`, "cuenta");
  }
  if(p.habilitado){
    h += `<div class="field"><div class="flabel">Link para compartir</div>
      <input readonly value="${esc(portalUrl(p.token))}" onclick="this.select()"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
      <button class="chip" data-a="portal-copy">Copiar link</button>
      <button class="chip" data-a="qr-open" data-url="${esc(portalUrl(p.token))}" data-title="Portal">Ver QR</button>
      <button class="chip" data-a="portal-regen">Regenerar llave</button>
    </div>
    <div class="hint" style="margin-top:10px">Regenerar la llave hace que el link de arriba deje de funcionar — cualquier alumno que ya lo tenga guardado pierde el acceso.</div>
    <div class="hint" style="margin-top:6px">Los archivos de la Biblioteca usan un link propio (vencimiento a los ${PORTAL_LINK_TTL_DAYS} días, se renueva solo): quien lo tenga puede reenviarlo hasta esa fecha, y regenerar la llave de arriba no lo corta.</div>`;
  }
  h += `<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--soft)">
    <div class="field"><div class="flabel">Nombre a mostrar en el portal</div>
      <input data-cf="portal-nombre" placeholder="Ej: Prof. Juan Pérez" value="${esc(p.draftNombre||"")}"></div>
    <button class="primary" style="margin:10px 0 0;margin-left:0" data-a="portal-publicar" ${state.portalSaving?"disabled":""}>Publicar cambios</button>
    ${state.portalSaveMsg?`<div class="hint" style="margin-top:8px">${esc(state.portalSaveMsg)}</div>`:""}
  </div>`;
  if(state.portalError) h += `<div class="saveerr" style="margin-top:10px">${esc(state.portalError)}</div>`;
  return h + `</div>`;
}


// "Cómo reservan tus alumnos" (pasos 160/173, simplificado en el 199): un solo on/off — "Pueden
// pedir clases (con tu confirmación)" — en vez de los tres modos de antes. Toda reserva pasa
// SIEMPRE por tu confirmación: un alumno pide un hueco con una nota opcional y el pedido queda
// "Pendiente de confirmación" hasta que vos lo aceptás (se agenda solo) o le respondés sin
// confirmar, desde las solicitudes del Tablero o tocándolo directo en la Agenda. El sub-toggle
// "Bloquear el horario apenas lo piden" es lo único que distinguía al viejo "Reservan directo": si
// está activo, ese hueco deja de ofrecerse a los demás apenas alguien lo pide (orden de llegada
// real); si está apagado, el hueco sigue visible y más de un alumno puede pedirlo — elegís vos
// entre los pedidos. Depende de la disponibilidad declarada (ver "Mi disponibilidad" en Agenda,
// paso 159); si no hay ninguna, huecosLibresProximos14Dias() siempre da vacío, así que se lo
// advierte acá antes de activar. El cambio es instantáneo (setReservaModo/setBloqueoInstantaneo en
// sync.js), no depende de "Publicar cambios" de la tarjeta de arriba — eso sí hace falta para que
// una llave individual ya generada empiece a mostrar "Tu clase" en la agenda semanal (misClases,
// ver buildAlumnoBlock en sync.js).
function vReservaModoCard(){
  if(!state.portalLoaded || !state.portal) return "";
  const modo = reservaModoFor();
  const disp = disponibilidadFor();
  let h = `<div class="formcard"><div class="ftitle">Cómo reservan tus alumnos</div>
    <div class="hint" style="margin-bottom:10px">Con su llave individual, un alumno ve tus huecos libres de los próximos 14 días (según tu disponibilidad declarada en Agenda) y puede pedir uno con una nota opcional. El pedido SIEMPRE queda pendiente de tu confirmación — nunca se agenda solo — y lo resolvés desde las solicitudes del Tablero o tocándolo en la Agenda.</div>`;
  if(disp.length===0 && modo!=="apagado"){
    h += `<div class="hint" style="margin-bottom:10px">Todavía no declaraste tu disponibilidad — andá a Agenda → "Mi disponibilidad" para marcar tus huecos semanales (si no, no hay ningún hueco para ofrecer).</div>`;
  }
  h += `<div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="chip ${modo==="apagado"?"on":""}" data-a="reserva-modo-set" data-f="apagado">Apagado</button>
    <button class="chip ${modo==="confirmar"?"on":""}" data-a="reserva-modo-set" data-f="confirmar">Pueden pedir clases (con tu confirmación)</button>
  </div>`;
  if(modo!=="apagado"){
    const bloqueo = bloqueoInstantaneoFor();
    const huecosModo = huecosModoFor();
    h += `<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--soft)">
      <div class="flabel" style="margin-bottom:8px">Bloquear el horario apenas lo piden</div>
      <div class="hint" style="margin-bottom:8px">Con esto activado, ese hueco deja de ofrecerse a otros alumnos apenas alguien lo pide (orden de llegada real) — si le respondés sin confirmar, vuelve a estar libre solo. Apagado, el hueco sigue visible y puede llegar más de un pedido para el mismo horario.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="chip ${!bloqueo?"on":""}" data-a="bloqueo-instantaneo-set" data-f="no">Apagado</button>
        <button class="chip ${bloqueo?"on":""}" data-a="bloqueo-instantaneo-set" data-f="si">Activado</button>
      </div>
    </div>
    <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--soft)">
      <div class="flabel" style="margin-bottom:8px">Qué horarios ven tus alumnos</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="chip ${huecosModo==="libres"?"on":""}" data-a="huecos-modo-set" data-f="libres">Solo horarios libres (sin clase asignada)</button>
        <button class="chip ${huecosModo==="todaDisponibilidad"?"on":""}" data-a="huecos-modo-set" data-f="todaDisponibilidad">Toda mi disponibilidad declarada</button>
      </div>
      ${huecosModo==="todaDisponibilidad"?`<div class="hint" style="margin-top:8px">Tus alumnos van a ver horarios de tu disponibilidad aunque ya tengas una clase agendada ahí — vas a tener que acomodar vos los pedidos que se pisen.</div>`:""}
    </div>`;
  }
  return h + `</div>`;
}


// "Cancelar desde el portal" (paso 172): ENCENDIDO por defecto, a diferencia de "Pedir una
// clase" — es de las cosas que más ping-pong de WhatsApp ahorran, así que arranca activo salvo
// que el docente lo apague a mano. Toggle instantáneo, mismo patrón que el de arriba
// (toggleCancelarClase en sync.js).
function vCancelarClaseCard(){
  if(!state.portalLoaded || !state.portal) return "";
  const on = permitirCancelarPortalFor();
  return `<div class="formcard"><div class="ftitle">Cancelar desde el portal</div>
    <div class="hint" style="margin-bottom:10px">Con su llave individual, un alumno puede avisar que no va a una clase agendada (con un motivo opcional) desde "Próximas clases" — vos lo aceptás (la clase pasa a cancelada, y si es recurrente sólo esa fecha) o lo rechazás, desde las solicitudes del Tablero. Si tenés una política de cancelación cargada (más abajo), el portal se la muestra antes de que confirme.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="chip ${!on?"on":""}" data-a="cancelar-clase-toggle" data-f="no">Desactivado</button>
      <button class="chip ${on?"on":""}" data-a="cancelar-clase-toggle" data-f="si">Activado</button>
    </div>
  </div>`;
}


// Avisos del portal (paso 105): mensajes cortos con fecha que el docente publica dirigidos a
// todos los alumnos, a una materia o a un alumno puntual — aparecen como tarjeta destacada
// arriba de todo en el portal del alumno. Se guardan en publicado.avisos (saveAvisos() en
// sync.js); qué aviso ve cada llave lo decide el backend (portal_publico()), nunca el cliente.
function avisoTargetOptionsHtml(){
  let h = `<option value="">Todos los alumnos</option>`;
  if(state.catalog.subjects.length){
    h += `<optgroup label="Por materia">` + state.catalog.subjects.map(m=>
      `<option value="m:${m.id}">${esc(m.name)}</option>`).join("") + `</optgroup>`;
  }
  const studs = alive();
  if(studs.length){
    h += `<optgroup label="Por alumno">` + studs.map(s=>
      `<option value="s:${s.id}">${esc(s.name)}</option>`).join("") + `</optgroup>`;
  }
  return h;
}

function avisoTargetLabel(target){
  if(!target) return "Todos los alumnos";
  if(target.tipo==="materia"){ const m=subjById(target.subjectId); return m?"Materia: "+m.name:"Materia eliminada"; }
  if(target.tipo==="alumno"){ const s=state.students.find(x=>x.id===target.studentId); return s?s.name:"Alumno eliminado"; }
  return "Todos los alumnos";
}

function vPortalAvisosCard(){
  if(!state.portalLoaded || !state.portal) return "";
  const avisos = (state.portal.publicado && state.portal.publicado.avisos) || [];
  let h = `<div class="formcard"><div class="ftitle">Avisos para el portal</div>
    <div class="hint" style="margin-bottom:10px">Un mensaje corto que tus alumnos ven arriba de todo al entrar al portal — ej. «El jueves traé la guía 3» o «Recordá el examen del lunes» — dirigido a todos, a una materia o a un alumno puntual.</div>`;
  h += avisos.length===0 ? `<div class="hint" style="margin-bottom:10px">Todavía no publicaste ningún aviso.</div>`
    : avisos.map(a=>`<div class="log" style="align-items:flex-start">
        <div class="body">${esc(a.texto)}<div class="note">${esc(avisoTargetLabel(a.target))} · ${fmtDate(a.fecha)}</div></div>
        <button class="del" data-a="aviso-del" data-id="${a.id}" title="Borrar aviso" aria-label="Borrar aviso">×</button>
      </div>`).join("");
  h += `<div class="frow" style="margin-top:10px">
    <div class="field"><div class="flabel">Aviso</div>
      <input id="aviso-texto" placeholder="Ej: El jueves traé la guía 3" data-enter="aviso-add"></div>
    <div class="field" style="max-width:220px"><div class="flabel">Para</div>
      <select id="aviso-target">${avisoTargetOptionsHtml()}</select></div>
  </div>
  <button class="chip" data-a="aviso-add" ${state.avisoSaving?"disabled":""}>${state.avisoSaving?"Publicando…":"+ Publicar aviso"}</button>
  ${state.avisoError?`<div class="saveerr" style="margin-top:8px">${esc(state.avisoError)}</div>`:""}
  </div>`;
  return h;
}


// Llaves grupales (Cuenta → Portal, paso 94): una llave por materia, para compartirle a un grupo
// de alumnos elegido a mano la biblioteca de esa materia y las próximas clases/exámenes del
// grupo — nunca datos de un alumno en particular (ver buildGrupoBlock en sync.js). Sólo tiene
// sentido si el portal general ya está cargado (comparte fila/habilitado con la llave general y
// la individual); si no cargó todavía, vPortalCard() ya muestra el estado de carga/error.
function vPortalGruposCard(){
  if(!state.portalLoaded || !state.portal) return "";
  const subjects=state.catalog.subjects.filter(m=>alive().some(x=>x.subjectId===m.id));
  let h = `<div class="formcard"><div class="ftitle" style="display:flex;align-items:center;gap:7px">Llaves grupales${helpTip("portalGrupal")}</div>
  <div class="hint" style="margin-bottom:10px">Una llave por materia: el grupo que elijas ve la biblioteca de esa materia y las próximas clases/exámenes del grupo — nunca notas, pagos ni avance de un alumno en particular.</div>`;
  if(subjects.length===0){
    return h + `<div class="hint">Todavía no tenés materias con alumnos activos.</div></div>`;
  }
  h += subjects.map(vPortalGrupoRow).join("");
  if(state.portalGrupoError) h += `<div class="saveerr" style="margin-top:10px">${esc(state.portalGrupoError)}</div>`;
  return h + `</div>`;
}

function vPortalGrupoRow(m){
  const token=tokenForGrupo(m.id);
  const busy=state.portalGrupoBusy===m.id;
  const editing=state.portalGrupoEditing===m.id;
  const alumnosMateria=alive().filter(x=>x.subjectId===m.id);
  let h = `<div style="padding:10px 0;border-top:1px solid var(--soft)">
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:8px">${subjectDot(m.id)}<b>${esc(m.name)}</b></div>`;
  if(!token && !editing){
    h += `<button class="chip" data-a="portal-grupo-crear-abrir" data-materia="${esc(m.id)}">Generar llave grupal</button>`;
  }
  if(token && !editing){
    const incluidos=((state.portal.tokensGrupos[token]||{}).alumnos||[]).length;
    h += `<div class="field"><input readonly value="${esc(portalUrl(token))}" onclick="this.select()"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
      <button class="chip" data-a="portal-grupo-copy" data-materia="${esc(m.id)}">Copiar link</button>
      <button class="chip" data-a="qr-open" data-url="${esc(portalUrl(token))}" data-title="Portal de ${esc(m.name)}">Ver QR</button>
      <button class="chip" data-a="portal-grupo-editar-abrir" data-materia="${esc(m.id)}" ${busy?"disabled":""}>Editar alumnos</button>
      <button class="chip" data-a="portal-grupo-regen" data-materia="${esc(m.id)}" ${busy?"disabled":""}>Regenerar llave</button>
      <button class="chip" data-a="envio-open" data-materia="${esc(m.id)}">Enviar a los alumnos</button>
      <button class="danger" data-a="portal-grupo-revoke" data-materia="${esc(m.id)}" ${busy?"disabled":""}>Borrar</button>
    </div>
    <div class="hint" style="margin-top:8px">Incluye a ${incluidos} alumno${incluidos===1?"":"s"} de ${esc(m.name)}.</div>`;
  }
  if(editing){
    const draft=state.portalGrupoDraftAlumnos||[];
    h += `<div class="hint" style="margin-bottom:6px">Marcá a quiénes incluye:</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${alumnosMateria.map(x=>`<button class="chip ${draft.includes(x.id)?"on":""}" data-a="portal-grupo-toggle-alumno" data-id="${esc(x.id)}">${esc(x.name)}</button>`).join("")}
    </div>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      <button class="primary" data-a="${token?"portal-grupo-guardar":"portal-grupo-crear"}" data-materia="${esc(m.id)}" ${busy?"disabled":""}>${busy?"Guardando…":(token?"Guardar":"Generar llave")}</button>
      <button class="chip" data-a="portal-grupo-editar-cancelar">Cancelar</button>
    </div>`;
  }
  return h + `</div>`;
}


// Llaves por alumno, todas juntas (paso 174): mismo generar/copiar/renovar/revocar que ya vive
// en la ficha (vPortalAlumnoCard) pero sin tener que entrar alumno por alumno — para eso las
// acciones acá abajo llevan el id en data-id en vez de depender de sel()/la ficha abierta
// (portal-hub-alumno-*, mismas funciones de sync.js que ya usaba vPortalAlumnoCard).
function vPortalLlavesAlumnosCard(){
  if(!state.portalLoaded || !state.portal) return "";
  const studs = alive();
  if(studs.length===0) return "";
  let h = `<div class="formcard"><div class="ftitle">Llaves por alumno</div>
    <div class="hint" style="margin-bottom:10px">Generá, compartí o revocá el acceso individual de cada alumno, sin entrar a su ficha.</div>`;
  h += studs.map(vPortalLlaveAlumnoRow).join("");
  if(state.portalAlumnoError) h += `<div class="saveerr" style="margin-top:10px">${esc(state.portalAlumnoError)}</div>`;
  return h + `</div>`;
}

function vPortalLlaveAlumnoRow(s){
  const token = tokenForStudent(s.id);
  const busy = state.portalAlumnoBusy===s.id;
  const dias = token ? llaveAlumnoVenceDias(s.id) : null;
  const vencida = dias!==null && dias<=0;
  const estado = !token ? `<span class="hint">Sin llave</span>`
    : `<span class="pill" style="${vencida?"color:var(--status-desaprobo-fg);background:var(--redbg)":"background:var(--soft)"}">${vencida?"Vencida":dias===null?"Activa":`Vence en ${dias} día${dias===1?"":"s"}`}</span>`;
  return `<div class="log" style="align-items:center;flex-wrap:wrap">
    <div class="body" style="display:flex;align-items:center;gap:8px;flex:1;min-width:140px">${esc(s.name)}${estado}</div>
    ${!token
      ? `<button class="chip" data-a="portal-hub-alumno-generar" data-id="${s.id}" ${busy?"disabled":""}>${busy?"Generando…":"Generar llave"}</button>`
      : `<button class="chip" data-a="portal-hub-alumno-copy" data-id="${s.id}">Copiar link</button>
      <button class="chip" data-a="portal-hub-alumno-regen" data-id="${s.id}" ${busy?"disabled":""}>Renovar</button>
      <button class="danger" data-a="portal-hub-alumno-revoke" data-id="${s.id}" ${busy?"disabled":""}>Revocar</button>`}
    <button class="chip" data-a="open" data-id="${s.id}" data-tab="portal">Ver ficha</button>
  </div>`;
}


// "Ver como alumno" (paso 174): previsualiza el portal público tal cual lo ve un alumno (o una
// llave grupal, o la llave general) sin salir de la app — mismo portal.html/js/portal.js de
// siempre, en un iframe con la llave real (nada de lógica duplicada). El iframe no se carga hasta
// tocar "Cargar vista previa" a propósito, para no pegarle a la red cada vez que se abre Cuenta.
function portalPreviewUrl(sel){
  const p=state.portal;
  if(!p) return "";
  if(sel==="general") return portalUrl(p.token);
  if(sel.startsWith("alumno:")){
    const token=tokenForStudent(sel.slice(7));
    return token?portalUrl(token):"";
  }
  if(sel.startsWith("grupo:")){
    const token=tokenForGrupo(sel.slice(6));
    return token?portalUrl(token):"";
  }
  return "";
}

function vPortalPreviewCard(){
  if(!state.portalLoaded || !state.portal) return "";
  const p=state.portal;
  if(!p.habilitado) return `<div class="formcard"><div class="ftitle">Ver como alumno</div>
    <div class="hint">Activá el portal arriba para poder previsualizarlo.</div></div>`;
  const studs = alive().filter(s=>tokenForStudent(s.id));
  const subjects = state.catalog.subjects.filter(m=>tokenForGrupo(m.id));
  let sel = state.portalPreviewSel||"general";
  if(sel!=="general" && !portalPreviewUrl(sel)) sel="general";
  let options = `<option value="general" ${sel==="general"?"selected":""}>Llave general</option>`;
  if(studs.length) options += `<optgroup label="Por alumno">${studs.map(s=>
    `<option value="alumno:${s.id}" ${sel==="alumno:"+s.id?"selected":""}>${esc(s.name)}</option>`).join("")}</optgroup>`;
  if(subjects.length) options += `<optgroup label="Llave grupal">${subjects.map(m=>
    `<option value="grupo:${m.id}" ${sel==="grupo:"+m.id?"selected":""}>${esc(m.name)}</option>`).join("")}</optgroup>`;
  const url = portalPreviewUrl(sel);
  return `<div class="formcard"><div class="ftitle">Ver como alumno</div>
    <div class="hint" style="margin-bottom:10px">Previsualizá el portal con datos reales, tal cual lo va a ver esa llave.</div>
    <div class="frow">
      <div class="field"><div class="flabel">Vista</div><select data-cf="portal-preview-sel">${options}</select></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
      <button class="chip" data-a="portal-preview-load">${state.portalPreviewOpen?"Recargar vista previa":"Cargar vista previa"}</button>
      ${url?`<a class="chip" href="${esc(url)}" target="_blank" rel="noopener">Abrir en pestaña nueva</a>`:""}
    </div>
    ${state.portalPreviewOpen && url ? `<iframe src="${esc(url)}" title="Vista previa del portal" style="width:100%;height:560px;border:1px solid var(--soft);border-radius:10px;background:var(--card)"></iframe>` : ""}
  </div>`;
}


/* ============ Cuenta → "Grupos de clase" (paso 157) ============
   El roster de cada clase grupal — quiénes la integran ahora — para no re-elegirlos cada semana.
   Distinto de "Llaves grupales" de arriba (portal, tokensGrupos): esto es sólo interno, nunca se
   comparte con nadie. Borrar un grupo también da de baja sus horarios/clases puntuales todavía
   agendadas (borrarGrupoClase en helpers.js), pero nunca toca clases ya dadas (su
   grupoClaseNombre/Miembros queda como snapshot histórico). */
function vGruposClaseCard(){
  const grupos = gruposClaseAll();
  let h = `<div class="formcard"><div class="ftitle">Grupos de clase</div>`;
  if(grupos.length===0){
    h += `<div class="empty">Todavía no armaste ningún grupo — se crean al agendar una "Clase grupal" desde la Agenda o desde "Registrar clase" en la ficha de un alumno.</div>`;
    return h + `</div>`;
  }
  h += grupos.map(vGrupoClaseRow).join("");
  return h + `</div>`;
}

function vGrupoClaseRow(g){
  const materia = subjById(g.subjectId);
  const editing = state.gruposClaseEditing===g.id;
  const confirmDel = state.gruposClaseDelConfirm===g.id;
  let h = `<div style="padding:10px 0;border-top:1px solid var(--soft)">
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">${materia?subjectDot(materia.id):""}<b>${esc(g.nombre)}</b>${materia?` <span class="hint">· ${esc(materia.name)}</span>`:""}</div>`;
  if(!editing){
    h += `<div class="hint" style="margin-bottom:8px">${g.studentIds.map(id=>(state.students.find(x=>x.id===id)||{}).name||"—").join(", ")}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="chip" data-a="grupoclase-editar-abrir" data-id="${g.id}">Agregar/sacar alumnos</button>
      ${!confirmDel?`<button class="danger" data-a="grupoclase-del-ask" data-id="${g.id}">Borrar grupo</button>`
        :`<span style="font-size:13px;color:var(--status-desaprobo-fg)">Se borra el grupo y sus clases todavía agendadas (no las ya dadas). ¿Seguro?</span>
          <button class="danger" data-a="grupoclase-del-confirm" data-id="${g.id}">Sí, borrar</button>
          <button class="chip" data-a="grupoclase-del-cancel">Cancelar</button>`}
    </div>`;
  }else{
    const draft = state.gruposClaseDraftAlumnos||[];
    const candidatos = alive().filter(x=>x.status==="activo" && x.subjectId===g.subjectId);
    h += `<div class="hint" style="margin-bottom:6px">Marcá quiénes integran el grupo:</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${candidatos.map(x=>`<button class="chip ${draft.includes(x.id)?"on":""}" data-a="grupoclase-toggle-alumno" data-id="${x.id}">${esc(x.name)}</button>`).join("")}
    </div>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      <button class="primary" data-a="grupoclase-guardar" data-id="${g.id}">Guardar</button>
      <button class="chip" data-a="grupoclase-editar-cancelar">Cancelar</button>
    </div>`;
  }
  return h + `</div>`;
}

function vBackupsList(){
  if(state.backupsError) return `<div class="saveerr">${esc(state.backupsError)}</div>`;
  if(!state.backupsLoaded) return skeletonRows(3);
  const list = state.backups||[];
  if(list.length===0) return `<div class="empty">Todavía no hay respaldos guardados. El primero se crea en la próxima sincronización.</div>`;
  let h = list.map(b=>{
    const n = b.n_alumnos||0;
    const bid = String(b.id);
    const confirming = state.confirmRestoreId===bid;
    return `<div class="log" style="align-items:center;flex-wrap:wrap">
      <div class="body">${fmtDateTime(b.created_at)}<div class="note">${n} estudiante${n===1?"":"s"}</div></div>
      ${!confirming
        ? `<button class="chip" data-a="restore-ask" data-id="${esc(bid)}">Restaurar</button>`
        : `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;max-width:100%">
            <span style="font-size:12.5px;color:var(--status-desaprobo-fg)">Reemplaza tus datos actuales por los de este respaldo (antes se guarda uno extra del estado de ahora). ¿Confirmás?</span>
            <button class="danger" data-a="restore-confirm" data-id="${esc(bid)}" ${state.restoreStatus==="restoring"?"disabled":""}>Sí, restaurar</button>
            <button class="chip" data-a="restore-cancel">Cancelar</button>
          </div>`}
    </div>`;
  }).join("");
  if(state.restoreStatus==="error") h += `<div class="saveerr" style="margin-top:8px">${esc(state.restoreError)}</div>`;
  return h;
}
