-- =====================================================================
-- paso195_separacion_cuentas.sql
-- Procedimiento para separar dos cuentas cuyos cuadernos quedaron
-- fusionados (ver CHANGELOG paso 194: bug de fusión entre pestañas de
-- distintas cuentas en el mismo navegador, ya arreglado en 2.5.1 pero sin
-- retroactividad — esto es la reparación manual de los datos que ya se
-- mezclaron antes del fix). Corre entero contra el proyecto Supabase de
-- PRODUCCIÓN (excepción a la regla de "dev primero": acá se arreglan
-- datos reales, no se prueba una feature). Placeholders en MAYÚSCULAS
-- para completar en cada uso — este archivo es la plantilla, no lleva
-- emails/ids reales.
--
-- Tablas involucradas (ver cuaderno-supabase/migraciones):
--   cuaderno(user_id, data jsonb, updated_at)            -- 001
--   cuaderno_respaldos(id, user_id, data, created_at,
--                       n_alumnos)                        -- 002/009/010
--   perfiles(user_id, email, rol, ...)                    -- 004
--   portales(user_id, token, habilitado, publicado,
--            tokens_alumnos, tokens_grupos, updated_at)   -- 013/017
-- data.students[] (JS: helpers.js emptyStudent()): {id, name, subject,
--   subjectId, updatedAt (epoch ms), deleted, deletedAt, ...}
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) INVENTARIO (solo lectura) — alumnos actuales de cada cuenta.
-- ---------------------------------------------------------------------
select
  u.email,
  s->>'id'                                            as alumno_id,
  s->>'name'                                          as nombre,
  s->>'subject'                                        as materia,
  to_timestamp(((s->>'updatedAt')::bigint)/1000.0)     as updated_at,
  coalesce((s->>'deleted')::boolean, false)            as borrado
from auth.users u
join public.cuaderno c on c.user_id = u.id
cross join lateral jsonb_array_elements(c.data->'students') as s
where u.email in ('EMAIL_CUENTA_1', 'EMAIL_CUENTA_2')
order by u.email, borrado, nombre;

-- ---------------------------------------------------------------------
-- 2) RESPALDOS (solo lectura) — snapshots de cada cuenta, más reciente
--    primero, para ubicar el último anterior a la fecha de fusión.
-- ---------------------------------------------------------------------
select u.email, r.id as respaldo_id, r.created_at, r.n_alumnos
from auth.users u
join public.cuaderno_respaldos r on r.user_id = u.id
where u.email in ('EMAIL_CUENTA_1', 'EMAIL_CUENTA_2')
order by u.email, r.created_at desc;

-- Último respaldo de CADA cuenta anterior a la fecha aproximada de fusión:
select distinct on (u.email)
  u.email, r.id as respaldo_id, r.created_at, r.n_alumnos
from auth.users u
join public.cuaderno_respaldos r on r.user_id = u.id
where u.email in ('EMAIL_CUENTA_1', 'EMAIL_CUENTA_2')
  and r.created_at < 'FECHA_APROX_FUSION'::timestamptz
order by u.email, r.created_at desc;

-- ---------------------------------------------------------------------
-- 3) PLAN A — restaurar cada cuenta desde su respaldo pre-fusión.
--    Paso 3a: respaldo de seguridad del estado ACTUAL (seguirá viviendo
--    en cuaderno_respaldos con created_at = ahora, por si hay que volver).
-- ---------------------------------------------------------------------
insert into public.cuaderno_respaldos (user_id, data)
select user_id, data from public.cuaderno
where user_id in ('UID_CUENTA_1', 'UID_CUENTA_2');

--    Paso 3b: diferencia entre el snapshot elegido y el estado actual
--    (solo lectura) — qué se perdería al restaurar, para recargar a mano.
--    Reemplazar RESPALDO_ID_CUENTA_N por el id de 2) y UID_CUENTA_N por
--    el user_id de la cuenta correspondiente.
with snapshot as (
  select data from public.cuaderno_respaldos where id = 'RESPALDO_ID_CUENTA_1'
), actual as (
  select data from public.cuaderno where user_id = 'UID_CUENTA_1'
)
select
  s->>'id'                                          as alumno_id,
  s->>'name'                                         as nombre,
  s->>'subject'                                      as materia,
  to_timestamp(((s->>'updatedAt')::bigint)/1000.0)   as updated_at,
  case when not exists (
    select 1 from snapshot sn, jsonb_array_elements(sn.data->'students') s2
    where s2->>'id' = s->>'id'
  ) then 'nuevo desde el snapshot'
  else 'editado desde el snapshot' end               as motivo
from actual a, jsonb_array_elements(a.data->'students') s
where exists (
    select 1 from snapshot sn, jsonb_array_elements(sn.data->'students') s2
    where s2->>'id' = s->>'id'
      and (s2->>'updatedAt')::bigint < (s->>'updatedAt')::bigint
  )
  or not exists (
    select 1 from snapshot sn, jsonb_array_elements(sn.data->'students') s2
    where s2->>'id' = s->>'id'
  )
order by nombre;
-- Repetir con RESPALDO_ID_CUENTA_2 / UID_CUENTA_2 para la otra cuenta.

--    Paso 3c: restaurar (recién después de revisar la diferencia de 3b).
update public.cuaderno c
set data = r.data, updated_at = now()
from public.cuaderno_respaldos r
where r.id = 'RESPALDO_ID_CUENTA_1' and c.user_id = 'UID_CUENTA_1';

update public.cuaderno c
set data = r.data, updated_at = now()
from public.cuaderno_respaldos r
where r.id = 'RESPALDO_ID_CUENTA_2' and c.user_id = 'UID_CUENTA_2';

-- ---------------------------------------------------------------------
-- 4) PLAN B — si no hay respaldo pre-fusión utilizable: quedarse en cada
--    fila solo con los alumnos marcados como propios (por id, del
--    inventario del punto 1). Incluye el mismo respaldo de seguridad
--    previo que 3a — no repetir si ya se corrió arriba.
-- ---------------------------------------------------------------------
update public.cuaderno
set data = jsonb_set(
      data, '{students}',
      (select coalesce(jsonb_agg(s), '[]'::jsonb)
       from jsonb_array_elements(data->'students') s
       where s->>'id' = any(array['ID_ALUMNO_1','ID_ALUMNO_2'] ) ) -- ids de esta cuenta
    ),
    updated_at = now()
where user_id = 'UID_CUENTA_1';
-- Repetir con la lista de ids correspondiente para UID_CUENTA_2.

-- ---------------------------------------------------------------------
-- 5) LLAVES Y PORTALES — limpiar tokens que quedaron apuntando a alumnos
--    que ya no están en esta cuenta (no es un riesgo de seguridad: si el
--    alumno no está, portal_publico() devuelve null; es solo un link
--    muerto). Alcanza con volver a "Publicar cambios" desde la app en
--    cada cuenta para que 'publicado' se recalcule; esto además borra las
--    entradas sueltas de tokens_alumnos/tokens_grupos que ya no matchean
--    ningún alumno vivo.
-- ---------------------------------------------------------------------
-- Ver qué tokens quedarían huérfanos (solo lectura), antes de republicar:
select
  p.user_id,
  k as token,
  p.tokens_alumnos->>k as alumno_id_apuntado
from public.portales p, jsonb_object_keys(p.tokens_alumnos) k
where p.user_id in ('UID_CUENTA_1', 'UID_CUENTA_2')
  and not exists (
    select 1 from public.cuaderno c, jsonb_array_elements(c.data->'students') s
    where c.user_id = p.user_id and s->>'id' = p.tokens_alumnos->>k
      and coalesce((s->>'deleted')::boolean, false) = false
  );

-- Si "Publicar cambios" desde la app no alcanza, limpiar a mano:
update public.portales p
set tokens_alumnos = (
  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
  from jsonb_each_text(p.tokens_alumnos) e(k, v)
  where exists (
    select 1 from public.cuaderno c, jsonb_array_elements(c.data->'students') s
    where c.user_id = p.user_id and s->>'id' = e.v
      and coalesce((s->>'deleted')::boolean, false) = false
  )
), updated_at = now()
where user_id in ('UID_CUENTA_1', 'UID_CUENTA_2');

-- ---------------------------------------------------------------------
-- 6) ROL DE ADMIN — dar rol admin a una cuenta.
-- ---------------------------------------------------------------------
select user_id, email, rol from public.perfiles where email = 'EMAIL_SOCIA';

update public.perfiles set rol = 'admin' where email = 'EMAIL_SOCIA';
