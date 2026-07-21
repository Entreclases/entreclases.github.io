"use strict";
/* ============ aprobar.js — confirmación pública de aprobar/rechazar una cuenta (paso 206) ============
   Standalone a propósito, mismo criterio que portal.js: nada de sesión, nada de localStorage.
   Duplica SUPA_URL/SUPA_ANON_KEY porque este archivo no carga config.js — son constantes
   públicas igual, ver CLAUDE.md. Lee ?token=...&accion=aprobar|rechazar del link del mail
   (crear_perfil() en 031_aprobar_desde_mail.sql) y llama a las RPCs públicas
   info_token_aprobacion()/resolver_cuenta_token(), que nunca dejan que el sólo hecho de abrir
   el link ejecute nada — recién "Confirmar" dispara el cambio de verdad. */
const SUPA_PROD = { url:"https://iwxsntxkqfqucxhwlfdv.supabase.co", anonKey:"sb_publishable_S0zs9qmIRB5RWNZceO5gCg_vI7Hxx1D" };
const SUPA_DEV = { url:"https://anubpgvuptyxnbagnkxa.supabase.co", anonKey:"sb_publishable_RkC2wsv0m5mYBHX2soHDpw_nx-clEvq" };
const IS_LOCALHOST = (location.hostname==="localhost" || location.hostname==="127.0.0.1");
function usaBackendDev(){
  if(!IS_LOCALHOST) return false;
  if(new URLSearchParams(location.search).get("backend")==="prod"){
    return !confirm("¿Usar el backend de PRODUCCIÓN desde localhost? Vas a aprobar/rechazar una cuenta real. Cancelar para seguir en el backend de desarrollo.");
  }
  return true;
}
const IS_BACKEND_DEV = usaBackendDev();
const SUPA_URL = IS_BACKEND_DEV ? SUPA_DEV.url : SUPA_PROD.url;
const SUPA_ANON_KEY = IS_BACKEND_DEV ? SUPA_DEV.anonKey : SUPA_PROD.anonKey;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function fmtDateTime(ts){
  if(!ts) return "";
  try{ return new Date(ts).toLocaleString("es-AR", {day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"}); }
  catch(e){ return ""; }
}

const app = document.getElementById("app");
function showMsg(big, small, extraHtml){
  app.innerHTML = `<div class="msg"><div class="big">${esc(big)}</div>${small?`<div class="small">${esc(small)}</div>`:""}</div>${extraHtml||""}`;
}

const ERROR_MSG = {
  invalid: ["Este link no es válido.", "Puede estar mal copiado — entrá al panel para revisar la cuenta."],
  used: ["Esta solicitud ya fue resuelta.", "Alguien ya aprobó o rechazó esta cuenta desde este mismo link."],
  expired: ["El link venció.", "Los links duran 7 días — entrá al panel para resolverlo desde ahí."],
  resuelto: ["Esta cuenta ya fue resuelta.", "Probablemente alguien ya la aprobó o rechazó desde el panel."],
};

async function rpc(nombre, body){
  const r = await fetch(SUPA_URL+"/rest/v1/rpc/"+nombre, {
    method:"POST",
    headers:{apikey:SUPA_ANON_KEY, Authorization:"Bearer "+SUPA_ANON_KEY, "Content-Type":"application/json"},
    body: JSON.stringify(body),
  });
  if(!r.ok) throw new Error("error "+r.status);
  return r.json();
}

const PANEL_LINK = `<a class="panel-link" href="https://entreclases.github.io/app/">Ir al panel</a>`;

function showError(codigo){
  const [big, small] = ERROR_MSG[codigo] || ERROR_MSG.invalid;
  showMsg(big, small, PANEL_LINK);
}

async function init(){
  const params = new URLSearchParams(location.search);
  const token = params.get("token");
  const accion = params.get("accion");

  if(!token || token.length < 32 || (accion !== "aprobar" && accion !== "rechazar")){
    showError("invalid");
    return;
  }
  if(!navigator.onLine){
    showMsg("Sin conexión.", "Necesitás internet para resolver esto.", PANEL_LINK);
    return;
  }

  let info;
  try{
    info = await rpc("info_token_aprobacion", {p_token: token});
  }catch(e){
    showMsg("No se pudo cargar la solicitud.", "Probá de nuevo en un momento.", PANEL_LINK);
    return;
  }
  if(!info.ok){
    showError(info.error);
    return;
  }

  renderConfirmacion(token, accion, info);
}

function renderConfirmacion(token, accion, info){
  const esAprobar = accion === "aprobar";
  app.innerHTML = `
    <div class="field">Cuenta registrada</div>
    <div class="value">${esc(info.email)}</div>
    <div class="field">Fecha de registro</div>
    <div class="value" style="margin-bottom:20px">${esc(fmtDateTime(info.created_at))}</div>
    <button type="button" class="btn ${esAprobar?"btn-aprobar":"btn-rechazar"}" id="confirm-btn">
      ${esAprobar ? "✅ Confirmar aprobación" : "❌ Confirmar rechazo"}
    </button>
    <div id="result"></div>
    ${PANEL_LINK}
  `;
  document.getElementById("confirm-btn").addEventListener("click", async () => {
    const btn = document.getElementById("confirm-btn");
    btn.disabled = true;
    btn.textContent = "Un momento…";
    const resultEl = document.getElementById("result");
    try{
      const res = await rpc("resolver_cuenta_token", {p_token: token, p_accion: accion});
      if(res.ok){
        showMsg(
          esAprobar ? "Cuenta aprobada." : "Cuenta rechazada.",
          esAprobar ? "Ya le avisamos por mail que puede entrar." : "Se le avisó que su registro no fue aceptado."
        );
      }else{
        const [big, small] = ERROR_MSG[res.error] || ERROR_MSG.invalid;
        resultEl.innerHTML = `<div class="err">${esc(big)} ${esc(small)}</div>`;
        btn.disabled = true;
      }
    }catch(e){
      resultEl.innerHTML = `<div class="err">No se pudo confirmar. Probá de nuevo en un momento.</div>`;
      btn.disabled = false;
      btn.textContent = esAprobar ? "✅ Confirmar aprobación" : "❌ Confirmar rechazo";
    }
  });
}

init();
