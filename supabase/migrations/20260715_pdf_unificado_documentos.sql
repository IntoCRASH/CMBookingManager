-- MiBooking: flujo PDF unificado para Cotizaciones, Facturas y Stage Plots.
-- Los documentos se generan, se guardan de forma privada y luego pueden
-- verse, imprimirse o enviarse por correo desde la aplicación.

begin;

alter table public.cotizaciones
  add column if not exists pdf_path text,
  add column if not exists pdf_generado_at timestamptz,
  add column if not exists pdf_enviado_at timestamptz,
  add column if not exists pdf_destinatario_email text;

comment on column public.cotizaciones.pdf_path is
  'Ruta privada del PDF vigente de la cotización o factura.';
comment on column public.cotizaciones.pdf_generado_at is
  'Fecha en que se generó la versión PDF vigente.';
comment on column public.cotizaciones.pdf_enviado_at is
  'Última fecha en que el PDF fue enviado por correo.';
comment on column public.cotizaciones.pdf_destinatario_email is
  'Último destinatario al que se envió el PDF.';

create or replace function public.invalidate_cotizacion_pdf_on_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (
    to_jsonb(new) - array[
      'pdf_path',
      'pdf_generado_at',
      'pdf_enviado_at',
      'pdf_destinatario_email',
      'updated_at'
    ]::text[]
  ) is distinct from (
    to_jsonb(old) - array[
      'pdf_path',
      'pdf_generado_at',
      'pdf_enviado_at',
      'pdf_destinatario_email',
      'updated_at'
    ]::text[]
  ) then
    new.pdf_path := null;
    new.pdf_generado_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists cotizaciones_invalidate_pdf_on_change
  on public.cotizaciones;

create trigger cotizaciones_invalidate_pdf_on_change
before update on public.cotizaciones
for each row
execute function public.invalidate_cotizacion_pdf_on_change();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'cotizaciones-pdf',
    'cotizaciones-pdf',
    false,
    10485760,
    array['application/pdf']
  ),
  (
    'stage-plots-pdf',
    'stage-plots-pdf',
    false,
    10485760,
    array['application/pdf']
  )
on conflict (id)
do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Cotizaciones / Facturas

drop policy if exists cotizaciones_pdf_select_miembro
  on storage.objects;
create policy cotizaciones_pdf_select_miembro
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cotizaciones-pdf'
  and (storage.foldername(name))[1] = 'workspace'
  and coalesce((storage.foldername(name))[2], '') ~ '^[0-9]+$'
  and public.is_workspace_member(
    ((storage.foldername(name))[2])::bigint
  )
);

drop policy if exists cotizaciones_pdf_insert_miembro
  on storage.objects;
create policy cotizaciones_pdf_insert_miembro
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'cotizaciones-pdf'
  and (storage.foldername(name))[1] = 'workspace'
  and coalesce((storage.foldername(name))[2], '') ~ '^[0-9]+$'
  and public.is_workspace_member(
    ((storage.foldername(name))[2])::bigint
  )
);

drop policy if exists cotizaciones_pdf_update_miembro
  on storage.objects;
create policy cotizaciones_pdf_update_miembro
on storage.objects
for update
to authenticated
using (
  bucket_id = 'cotizaciones-pdf'
  and (storage.foldername(name))[1] = 'workspace'
  and coalesce((storage.foldername(name))[2], '') ~ '^[0-9]+$'
  and public.is_workspace_member(
    ((storage.foldername(name))[2])::bigint
  )
)
with check (
  bucket_id = 'cotizaciones-pdf'
  and (storage.foldername(name))[1] = 'workspace'
  and coalesce((storage.foldername(name))[2], '') ~ '^[0-9]+$'
  and public.is_workspace_member(
    ((storage.foldername(name))[2])::bigint
  )
);

drop policy if exists cotizaciones_pdf_delete_miembro
  on storage.objects;
create policy cotizaciones_pdf_delete_miembro
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'cotizaciones-pdf'
  and (storage.foldername(name))[1] = 'workspace'
  and coalesce((storage.foldername(name))[2], '') ~ '^[0-9]+$'
  and public.is_workspace_member(
    ((storage.foldername(name))[2])::bigint
  )
);

-- Stage Plots

drop policy if exists stage_plots_pdf_select_miembro
  on storage.objects;
create policy stage_plots_pdf_select_miembro
on storage.objects
for select
to authenticated
using (
  bucket_id = 'stage-plots-pdf'
  and (storage.foldername(name))[1] = 'workspace'
  and coalesce((storage.foldername(name))[2], '') ~ '^[0-9]+$'
  and public.is_workspace_member(
    ((storage.foldername(name))[2])::bigint
  )
);

drop policy if exists stage_plots_pdf_insert_miembro
  on storage.objects;
create policy stage_plots_pdf_insert_miembro
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'stage-plots-pdf'
  and (storage.foldername(name))[1] = 'workspace'
  and coalesce((storage.foldername(name))[2], '') ~ '^[0-9]+$'
  and public.is_workspace_member(
    ((storage.foldername(name))[2])::bigint
  )
);

drop policy if exists stage_plots_pdf_update_miembro
  on storage.objects;
create policy stage_plots_pdf_update_miembro
on storage.objects
for update
to authenticated
using (
  bucket_id = 'stage-plots-pdf'
  and (storage.foldername(name))[1] = 'workspace'
  and coalesce((storage.foldername(name))[2], '') ~ '^[0-9]+$'
  and public.is_workspace_member(
    ((storage.foldername(name))[2])::bigint
  )
)
with check (
  bucket_id = 'stage-plots-pdf'
  and (storage.foldername(name))[1] = 'workspace'
  and coalesce((storage.foldername(name))[2], '') ~ '^[0-9]+$'
  and public.is_workspace_member(
    ((storage.foldername(name))[2])::bigint
  )
);

drop policy if exists stage_plots_pdf_delete_miembro
  on storage.objects;
create policy stage_plots_pdf_delete_miembro
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'stage-plots-pdf'
  and (storage.foldername(name))[1] = 'workspace'
  and coalesce((storage.foldername(name))[2], '') ~ '^[0-9]+$'
  and public.is_workspace_member(
    ((storage.foldername(name))[2])::bigint
  )
);

commit;
