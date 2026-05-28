create extension if not exists pgcrypto with schema extensions;

create table if not exists public.password_activation_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    email text not null,
    token_hash text not null unique,
    source text not null default 'phidias',
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists password_activation_tokens_email_idx
    on public.password_activation_tokens (lower(email));

create index if not exists password_activation_tokens_user_active_idx
    on public.password_activation_tokens (user_id, used_at, expires_at);

alter table public.password_activation_tokens enable row level security;

comment on table public.password_activation_tokens is
    'Tokens de un solo uso para crear o recuperar contrasena sin depender de sesion del navegador.';

comment on column public.password_activation_tokens.token_hash is
    'Hash SHA-256 del token enviado por correo. El token crudo nunca se almacena.';

comment on column public.password_activation_tokens.expires_at is
    'Fecha UTC en la que expira el enlace de activacion.';

comment on column public.password_activation_tokens.used_at is
    'Fecha UTC en la que el token fue consumido. Null significa pendiente.';
