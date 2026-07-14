-- =====================================================================
-- Cuaderno de seguimiento: preparación de la base de datos en Supabase
-- Pegá TODO este archivo en el SQL Editor de Supabase y tocá "Run".
-- Solo hace falta hacerlo una vez.
-- =====================================================================

-- Tabla donde se guarda el cuaderno (una fila por usuario)
create table public.cuaderno (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Seguridad: cada usuario solo puede ver y modificar SU propia fila.
alter table public.cuaderno enable row level security;

create policy "leer lo propio"
  on public.cuaderno for select
  using (auth.uid() = user_id);

create policy "crear lo propio"
  on public.cuaderno for insert
  with check (auth.uid() = user_id);

create policy "actualizar lo propio"
  on public.cuaderno for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Permiso de acceso a la tabla en sí (además de las reglas de seguridad
-- por fila de arriba). Sin esto, Supabase devuelve error 403 al sincronizar.
grant select, insert, update on public.cuaderno to authenticated;
