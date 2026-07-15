-- MiBooking: permite que el Artista propietario y los Gestores activos
-- conviertan cotizaciones aprobadas en facturas.

comment on column public.cotizaciones.factura_emitida_by is
  'Usuario Artista o Gestor autorizado que emitió la factura.';

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
