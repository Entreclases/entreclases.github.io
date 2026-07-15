"use strict";
/* ============ autenticación: login, signup, recuperación, confirmación ============ */
async function authFetch(path, body){
  const r=await fetch(SUPA_URL+path,{method:"POST",
    headers:{"Content-Type":"application/json",apikey:SUPA_ANON_KEY},
    body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.msg||j.error_description||j.message||("error "+r.status));
  return j;
}
function friendlyAuthError(err){
  const m=String((err&&err.message)||err||"").toLowerCase();
  if(!navigator.onLine || m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed"))
    return "Sin conexión a internet. Probá de nuevo cuando tengas señal.";
  if(m.includes("invalid login credentials") || m.includes("invalid_grant"))
    return "Correo o contraseña incorrectos.";
  if(m.includes("already registered") || m.includes("already exists"))
    return "Ese correo ya tiene una cuenta. Probá iniciar sesión.";
  if(m.includes("email not confirmed"))
    return "Falta confirmar el correo. Revisá tu casilla y tocá el enlace de confirmación.";
  if(m.includes("password") && (m.includes("character")||m.includes("short")))
    return "La contraseña tiene que tener al menos 6 caracteres.";
  if(m.includes("unable to validate email")||(m.includes("email")&&m.includes("invalid")))
    return "Ese correo no parece válido.";
  if(m.includes("rate limit"))
    return "Demasiados intentos. Esperá un minuto y probá de nuevo.";
  if(m.includes("signups not allowed"))
    return "La creación de cuentas está deshabilitada por ahora.";
  return "Ocurrió un error. Probá de nuevo en un momento.";
}
function storeSession(j,email){
  const prev=getSes();
  const loginAt = (prev && prev.email===email && prev.loginAt) ? prev.loginAt : Date.now();
  // el rol cacheado sobrevive a un refresh de token de la misma cuenta; si es una cuenta
  // distinta (o nunca se leyó) arranca sin rol hasta que loadRole() lo confirme
  const role = (prev && prev.email===email) ? prev.role : undefined;
  setSes({access:j.access_token,refresh:j.refresh_token,
          exp:Date.now()+((j.expires_in||3600)-60)*1000,email,loginAt,role});
  rememberEmail(email);
  loadRole();
}
// Lee el rol propio (tabla perfiles) una vez por login/refresh de sesión y lo cachea
// dentro de la sesión guardada, para que isAdmin ande offline con el último rol visto.
// Si falla (sin internet, error puntual) se degrada en silencio al rol ya cacheado, o a
// "profesor" si todavía no se leyó nunca — nunca bloquea ni rompe el resto de la app.
async function loadRole(){
  try{
    const s=getSes(); if(!s) return;
    const uid_=jwtSub(s.access);
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
    const r=await fetch(SUPA_URL+"/rest/v1/perfiles?select=rol&user_id=eq."+encodeURIComponent(uid_), {headers:h});
    if(!r.ok) return;
    const rows=await r.json();
    const rol=rows[0]&&rows[0].rol;
    if(rol){
      const cur=getSes();
      if(cur && cur.email===s.email){ setSes({...cur, role:rol}); render(); }
    }
  }catch(e){ /* silencioso: offline o falla puntual — sigue con el rol cacheado */ }
}
function isEmailNotConfirmedError(err){
  const m=String((err&&err.message)||err||"").toLowerCase();
  return m.includes("email not confirmed") || m.includes("email_not_confirmed");
}
async function resendConfirmEmail(email){
  await authFetch("/auth/v1/resend",{type:"signup", email});
}
async function doLogin(email,pass){
  const j=await authFetch("/auth/v1/token?grant_type=password",{email,password:pass});
  storeSession(j,email);
}
async function doSignup(email,pass){
  const j=await authFetch("/auth/v1/signup",{email,password:pass});
  if(j.access_token){ storeSession(j,email); return true; }
  return false; // el proyecto pide confirmar el correo
}
async function ensureToken(){
  let s=getSes(); if(!s) throw new Error("no-session");
  if(Date.now()<s.exp) return s;
  const j=await authFetch("/auth/v1/token?grant_type=refresh_token",{refresh_token:s.refresh});
  storeSession(j,s.email);
  return getSes();
}
async function setNewPassword(pass){
  const r=await fetch(SUPA_URL+"/auth/v1/user",{method:"PUT",
    headers:{"Content-Type":"application/json",apikey:SUPA_ANON_KEY,Authorization:"Bearer "+state.recovery.access},
    body:JSON.stringify({password:pass})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.msg||j.error_description||j.message||("error "+r.status));
  storeSession({access_token:state.recovery.access, refresh_token:state.recovery.refresh, expires_in:3600}, j.email||"");
}
function parseRecoveryHash(){
  const raw = location.hash.startsWith("#") ? location.hash.slice(1) : "";
  if(!raw) return null;
  const p = new URLSearchParams(raw);
  if(p.get("type")==="recovery" && p.get("access_token"))
    return { access:p.get("access_token"), refresh:p.get("refresh_token")||"" };
  return null;
}
