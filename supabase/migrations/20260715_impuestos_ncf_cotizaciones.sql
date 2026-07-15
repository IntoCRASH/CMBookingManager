-- Agrega impuestos opcionales y NCF/e-NCF a las cotizaciones.
-- Las presentaciones artísticas permanecen con 0% por defecto; el Artista
-- puede activar y ajustar el porcentaje cuando su caso fiscal lo requiera.

alter table if exists public.perfiles_negocio
  add column if not exists impuesto_activo_por_defecto boolean not null default false,
  add column if not exists impuesto_porcentaje numeric(5,2) not null default 0;

alter table if exists public.cotizaciones
  add column if not exists incluye_impuesto boolean not null default false,
  add column if not exists impuesto_base numeric(14,2) not null default 0,
  add column if not exists impuesto_porcentaje numeric(5,2) not null default 0,
  add column if not exists impuesto_monto numeric(14,2) not null default 0,
  add column if not exists incluye_ncf boolean not null default false,
  add column if not exists ncf text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'perfiles_negocio_impuesto_porcentaje_check'
  ) then
    alter table public.perfiles_negocio
      add constraint perfiles_negocio_impuesto_porcentaje_check
      check (impuesto_porcentaje between 0 and 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cotizaciones_impuesto_porcentaje_check'
  ) then
    alter table public.cotizaciones
      add constraint cotizaciones_impuesto_porcentaje_check
      check (impuesto_porcentaje between 0 and 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cotizaciones_ncf_formato_check'
  ) then
    alter table public.cotizaciones
      add constraint cotizaciones_ncf_formato_check
      check (
        (
          incluye_ncf = false and
          ncf is null
        )
        or
        (
          incluye_ncf = true and
          ncf ~ '^(B[0-9]{10}|E[0-9]{12})$'
        )
      );
  end if;
end
$$;

create unique index if not exists cotizaciones_workspace_ncf_unique
  on public.cotizaciones (workspace_id, ncf)
  where ncf is not null;

comment on column public.perfiles_negocio.impuesto_activo_por_defecto is
  'Activa por defecto el impuesto opcional en cotizaciones nuevas.';

comment on column public.perfiles_negocio.impuesto_porcentaje is
  'Porcentaje de impuesto opcional por defecto, expresado de 0 a 100.';

comment on column public.cotizaciones.impuesto_base is
  'Base neta usada para calcular el impuesto, después del descuento, manager y comisión.';

comment on column public.cotizaciones.impuesto_monto is
  'Monto congelado del impuesto opcional para esta cotización.';

comment on column public.cotizaciones.ncf is
  'NCF o e-NCF autorizado por la DGII mostrado opcionalmente en el documento.';

-- Extiende el cálculo existente del manager artístico para sumar el impuesto
-- al final, sin modificar la base del manager ni la comisión comercial.
create or replace function public.recalcular_cotizacion_con_manager_artistico()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_subtotal_exacto numeric := 0;
  v_descuento_exacto numeric := 0;
  v_base_neta numeric := 0;
  v_manager_porcentaje numeric := 0;
  v_manager_exacto numeric := 0;
  v_comision_porcentaje numeric := 0;
  v_comision_exacto numeric := 0;
  v_base_impuesto numeric := 0;
  v_impuesto_porcentaje numeric := 0;
  v_impuesto_exacto numeric := 0;
  v_total_exacto numeric := 0;
begin
  v_subtotal_exacto :=
    greatest(coalesce(new.honorarios, 0), 0) +
    greatest(coalesce(new.nomina, 0), 0) +
    greatest(coalesce(new.dieta, 0), 0) +
    greatest(coalesce(new.transporte, 0), 0) +
    greatest(coalesce(new.sonido, 0), 0) +
    greatest(coalesce(new.road_manager, 0), 0) +
    greatest(coalesce(new.ensayo_extra, 0), 0) +
    greatest(coalesce(new.produccion_extra, 0), 0);

  v_descuento_exacto :=
    v_subtotal_exacto *
    (greatest(coalesce(new.descuento, 0), 0) / 100.0);

  v_base_neta := greatest(v_subtotal_exacto - v_descuento_exacto, 0);

  v_manager_porcentaje :=
    case
      when coalesce(new.incluye_manager_artistico, false)
        then greatest(coalesce(new.manager_artistico_porcentaje, 0), 0) / 100.0
      else 0
    end;

  v_manager_exacto := v_base_neta * v_manager_porcentaje;

  v_comision_porcentaje :=
    greatest(coalesce(new.comision_porcentaje_snapshot, 0), 0) / 100.0;

  v_comision_exacto :=
    (v_base_neta + v_manager_exacto) * v_comision_porcentaje;

  v_base_impuesto :=
    v_base_neta + v_manager_exacto + v_comision_exacto;

  v_impuesto_porcentaje :=
    case
      when coalesce(new.incluye_impuesto, false)
        then greatest(coalesce(new.impuesto_porcentaje, 0), 0) / 100.0
      else 0
    end;

  v_impuesto_exacto := v_base_impuesto * v_impuesto_porcentaje;
  v_total_exacto := v_base_impuesto + v_impuesto_exacto;

  new.incluye_manager_artistico :=
    coalesce(new.incluye_manager_artistico, false) and
    coalesce(new.manager_artistico_porcentaje, 0) > 0;

  new.incluye_impuesto :=
    coalesce(new.incluye_impuesto, false) and
    coalesce(new.impuesto_porcentaje, 0) > 0;

  new.ncf := nullif(upper(btrim(coalesce(new.ncf, ''))), '');
  new.incluye_ncf :=
    coalesce(new.incluye_ncf, false) and
    new.ncf is not null;

  if not new.incluye_ncf then
    new.ncf := null;
  end if;

  new.subtotal := ceil(v_subtotal_exacto / 100.0) * 100;
  new.monto_descuento := ceil(v_descuento_exacto / 100.0) * 100;
  new.subtotal_con_descuento := ceil(v_base_neta / 100.0) * 100;

  new.manager_artistico_base := ceil(v_base_neta / 100.0) * 100;
  new.manager_artistico_monto := ceil(v_manager_exacto / 100.0) * 100;

  new.comision_base :=
    ceil((v_base_neta + v_manager_exacto) / 100.0) * 100;
  new.comision := ceil(v_comision_exacto / 100.0) * 100;

  new.impuesto_base := ceil(v_base_impuesto / 100.0) * 100;
  new.impuesto_monto := ceil(v_impuesto_exacto / 100.0) * 100;

  new.total_sin_redondear := v_total_exacto;
  new.total := ceil(v_total_exacto / 100.0) * 100;

  return new;
end;
$$;

drop trigger if exists zzzz_recalcular_cotizacion_con_manager_artistico
  on public.cotizaciones;

create trigger zzzz_recalcular_cotizacion_con_manager_artistico
before insert or update of
  honorarios,
  nomina,
  dieta,
  transporte,
  sonido,
  road_manager,
  ensayo_extra,
  produccion_extra,
  descuento,
  incluye_manager_artistico,
  manager_artistico_porcentaje,
  comision_porcentaje_snapshot,
  incluye_impuesto,
  impuesto_porcentaje,
  incluye_ncf,
  ncf
on public.cotizaciones
for each row
execute function public.recalcular_cotizacion_con_manager_artistico();
