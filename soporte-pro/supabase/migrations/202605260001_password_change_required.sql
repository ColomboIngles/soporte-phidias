alter table public.usuarios
    add column if not exists requiere_cambio_contrasena boolean not null default true;

alter table public.usuarios
    add column if not exists contrasena_temporal_establecida_en timestamptz;

alter table public.usuarios
    add column if not exists contrasena_actualizada_en timestamptz;

comment on column public.usuarios.requiere_cambio_contrasena is
    'Indica si el usuario debe definir una contrasena personal antes de usar el sistema.';

comment on column public.usuarios.contrasena_temporal_establecida_en is
    'Fecha en la que se preparo el acceso temporal administrado en Supabase Auth. No almacena la contrasena.';

comment on column public.usuarios.contrasena_actualizada_en is
    'Fecha en la que el usuario completo el cambio de contrasena obligatorio.';

update public.usuarios
set requiere_cambio_contrasena = true
where requiere_cambio_contrasena is distinct from true
  and contrasena_actualizada_en is null;
