-- MiBooking: convierte cotizaciones aprobadas en facturas.
-- El NCF se asigna únicamente al emitir la factura, nunca al preparar
-- una cotización preliminar.

alter table if exists public.cotizaciones
  add column if not exists documento_tipo text not null default 'cotizacion',
  add column if not exists factura_emitida_at timestamptz,
  add column if not exists factura_emitida_by uuid;

-- Si la versión anterior ya guardó algún NCF en una cotización, se conserva
-- el comprobante y se identifica ese documento como factura.
update public.cotizaciones
set
  documento_tipo = 'factura',
  factura_emitida_at = coalesce(factura_emitida_at, updated_at, created_at, now())
where ncf is not null;

update public.cotizaciones
set documento_tipo = 'cotizacion'
where documento_tipo is null
   or lower(btrim(documento_tipo)) not in ('cotizacion', 'factura');

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'cotizaciones_ncf_formato_check'
      and conrelid = 'public.cotizaciones'::regclass
  ) then
    alter table public.cotizaciones
      drop constraint cotizaciones_ncf_formato_check;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cotizaciones_documento_tipo_check'
      and conrelid = 'public.cotizaciones'::regclass
  ) then
    alter table public.cotizaciones
      add constraint cotizaciones_documento_tipo_check
      check (documento_tipo in ('cotizacion', 'factura'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cotizaciones_documento_ncf_check'
      and conrelid = 'public.cotizaciones'::regclass
  ) then
    alter table public.cotizaciones
      add constraint cotizaciones_documento_ncf_check
      check (
        (
          documento_tipo = 'cotizacion'
          and incluye_ncf = false
          and ncf is null
          and factura_emitida_at is null
          and factura_emitida_by is null
        )
        or
        (
          documento_tipo = 'factura'
          and factura_emitida_at is not null
          and (
            (incluye_ncf = false and ncf is null)
            or
            (incluye_ncf = true and ncf ~ '^(B[0-9]{10}|E[0-9]{12})$')
          )
        )
      );
  end if;
end
$$;

comment on column public.cotizaciones.documento_tipo is
  'Distingue la propuesta comercial (cotizacion) del documento emitido (factura).';

comment on column public.cotizaciones.factura_emitida_at is
  'Fecha y hora en que una cotización aprobada fue convertida en factura.';

comment on column public.cotizaciones.factura_emitida_by is
  'Usuario Artista o Gestor autorizado que emitió la factura.';

comment on column public.cotizaciones.ncf is
  'NCF o e-NCF opcional asignado exclusivamente al emitir una factura.';

create or replace function public.normalizar_documento_fiscal_cotizacion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.documento_tipo := lower(
    btrim(coalesce(new.documento_tipo, 'cotizacion'))
  );

  if new.documento_tipo not in ('cotizacion', 'factura') then
    new.documento_tipo := 'cotizacion';
  end if;

  if new.documento_tipo = 'cotizacion' then
    new.incluye_ncf := false;
    new.ncf := null;
    new.factura_emitida_at := null;
    new.factura_emitida_by := null;
    return new;
  end if;

  new.ncf := nullif(upper(btrim(coalesce(new.ncf, ''))), '');
  new.incluye_ncf :=
    coalesce(new.incluye_ncf, false)
    and new.ncf is not null;

  if not new.incluye_ncf then
    new.ncf := null;
  end if;

  new.factura_emitida_at := coalesce(new.factura_emitida_at, now());

  return new;
end;
$$;

drop trigger if exists zzzzz_normalizar_documento_fiscal_cotizacion
  on public.cotizaciones;

create trigger zzzzz_normalizar_documento_fiscal_cotizacion
before insert or update of
  documento_tipo,
  incluye_ncf,
  ncf,
  factura_emitida_at,
  factura_emitida_by
on public.cotizaciones
for each row
execute function public.normalizar_documento_fiscal_cotizacion();

create or replace function public.convertir_cotizacion_en_factura(
  p_cotizacion_id bigint,
  p_workspace_id bigint,
  p_incluye_ncf boolean default false,
  p_ncf text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_owner_user_id uuid;
  v_es_gestor_autorizado boolean := false;
  v_documento_tipo text;
  v_estado text;
  v_ncf text;
begin
  if auth.uid() is null then
    raise exception 'No hay una sesión activa.';
  end if;

  select owner_user_id
  into v_owner_user_id
  from public.workspaces
  where id = p_workspace_id;

  if v_owner_user_id is null then
    raise exception 'No se encontró el proyecto del Artista.';
  end if;

  select exists (
    select 1
    from public.workspace_members as wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role = 'manager'
  )
  into v_es_gestor_autorizado;

  if v_owner_user_id is distinct from auth.uid()
     and not v_es_gestor_autorizado then
    raise exception 'Solo el Artista o un Gestor activo del workspace puede emitir facturas.';
  end if;

  select documento_tipo, estado
  into v_documento_tipo, v_estado
  from public.cotizaciones
  where id = p_cotizacion_id
    and workspace_id = p_workspace_id
  for update;

  if not found then
    raise exception 'No se encontró la cotización.';
  end if;

  if coalesce(v_documento_tipo, 'cotizacion') = 'factura' then
    raise exception 'Esta cotización ya fue convertida en factura.';
  end if;

  if btrim(coalesce(v_estado, '')) not in ('Confirmada', 'Aprobada') then
    raise exception 'La cotización debe estar Confirmada o Aprobada antes de facturarla.';
  end if;

  v_ncf := nullif(upper(btrim(coalesce(p_ncf, ''))), '');

  if coalesce(p_incluye_ncf, false) then
    if v_ncf is null or v_ncf !~ '^(B[0-9]{10}|E[0-9]{12})$' then
      raise exception 'El NCF debe usar el formato B + 10 dígitos o E + 12 dígitos.';
    end if;
  else
    v_ncf := null;
  end if;

  update public.cotizaciones
  set
    documento_tipo = 'factura',
    incluye_ncf = coalesce(p_incluye_ncf, false),
    ncf = v_ncf,
    factura_emitida_at = now(),
    factura_emitida_by = auth.uid(),
    updated_at = now()
  where id = p_cotizacion_id
    and workspace_id = p_workspace_id;
end;
$$;

revoke all on function public.convertir_cotizacion_en_factura(
  bigint,
  bigint,
  boolean,
  text
) from public;

grant execute on function public.convertir_cotizacion_en_factura(
  bigint,
  bigint,
  boolean,
  text
) to authenticated;
