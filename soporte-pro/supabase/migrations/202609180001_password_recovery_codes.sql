-- No se reemplazan cuentas ni contrasenas existentes. Las cuentas anteriores
-- conservan su acceso y las nuevas usan un codigo temporal de un solo uso.
create extension if not exists pgcrypto with schema extensions;

alter table public.usuarios
    add column if not exists telefono text;

alter table public.usuarios
    alter column requiere_cambio_contrasena set default false;

create table if not exists public.password_recovery_codes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    email text not null,
    channel text not null check (channel in ('email', 'phone')),
    code_hash text not null,
    attempts integer not null default 0 check (attempts >= 0),
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists password_recovery_codes_user_active_idx
    on public.password_recovery_codes (user_id, created_at desc)
    where used_at is null;

create index if not exists password_recovery_codes_expiration_idx
    on public.password_recovery_codes (expires_at)
    where used_at is null;

alter table public.password_recovery_codes enable row level security;

-- Solo el servidor, usando la service role, administra codigos y contrasenas.
-- Ningun cliente puede leer, generar ni reutilizar codigos directamente.
revoke all on table public.password_recovery_codes from anon, authenticated;

comment on table public.password_recovery_codes is
    'Codigos SHA-256 de un solo uso para crear o recuperar contrasenas dentro de la plataforma.';

comment on column public.usuarios.telefono is
    'Numero registrado para recuperar contrasena por WhatsApp; se normaliza en el servidor.';

notify pgrst, 'reload schema';
