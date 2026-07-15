-- Integra al manager artístico como concepto independiente del road manager
-- y de la comisión comercial del Gestor.

alter table if exists public.perfiles_negocio
  add column if not exists manager_artistico_activo boolean not null default false,
  add column if not exists manager_artistico_nombre text,
  add column if not exists manager_artistico_porcentaje numeric(5,2) not null default 0;

alter table if exists public.cotizaciones
  add column if not exists incluye_manager_artistico boolean not null default false,
  add column if not exists manager_artistico_nombre_snapshot text,
  add column if not exists manager_artistico_porcentaje numeric(5,2) not null default 0,
  add column if not exists manager_artistico_base numeric(14,2) not null default 0,
  add column if not exists manager_artistico_monto numeric(14,2) not null default 0,
  add column if not exists comision_base numeric(14,2) not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'perfiles_negocio_manager_artistico_porcentaje_check'
  ) then
    alter table public.perfiles_negocio
      add constraint perfiles_negocio_manager_artistico_porcentaje_check
      check (manager_artistico_porcentaje between 0 and 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cotizaciones_manager_artistico_porcentaje_check'
  ) then
    alter table public.cotizaciones
      add constraint cotizaciones_manager_artistico_porcentaje_check
      check (manager_artistico_porcentaje between 0 and 100);
  end if;
end
$$;

comment on column public.perfiles_negocio.manager_artistico_activo is
  'Activa por defecto el manager artístico en cotizaciones nuevas.';

comment on column public.perfiles_negocio.manager_artistico_porcentaje is
  'Porcentaje habitual del manager artístico, expresado de 0 a 100.';

comment on column public.cotizaciones.manager_artistico_base is
  'Subtotal neto después del descuento usado como base del manager artístico.';

comment on column public.cotizaciones.manager_artistico_monto is
  'Monto congelado del manager artístico para esta cotización.';

comment on column public.cotizaciones.comision_base is
  'Base de la comisión del Gestor después de incorporar el manager artístico.';

-- Este trigger corre al final de los triggers BEFORE (prefijo zzzz_) para que
-- el porcentaje de comisión del Gestor ya haya sido congelado por el contexto
-- del workspace. Mantiene el cálculo del frontend y la base de datos alineados.
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

  v_total_exacto :=
    v_base_neta + v_manager_exacto + v_comision_exacto;

  new.incluye_manager_artistico :=
    coalesce(new.incluye_manager_artistico, false) and
    coalesce(new.manager_artistico_porcentaje, 0) > 0;

  new.subtotal := ceil(v_subtotal_exacto / 100.0) * 100;
  new.monto_descuento := ceil(v_descuento_exacto / 100.0) * 100;
  new.subtotal_con_descuento := ceil(v_base_neta / 100.0) * 100;

  new.manager_artistico_base := ceil(v_base_neta / 100.0) * 100;
  new.manager_artistico_monto := ceil(v_manager_exacto / 100.0) * 100;

  new.comision_base :=
    ceil((v_base_neta + v_manager_exacto) / 100.0) * 100;
  new.comision := ceil(v_comision_exacto / 100.0) * 100;

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
  comision_porcentaje_snapshot
on public.cotizaciones
for each row
execute function public.recalcular_cotizacion_con_manager_artistico();
