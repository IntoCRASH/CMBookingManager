-- MiBooking: facturación mensual/anual y trial de 3 días.
-- Ejecutar una sola vez antes de desplegar las Edge Functions nuevas.

alter table public.workspace_subscriptions
  add column if not exists billing_cycle text;

alter table public.workspace_subscriptions
  add column if not exists trial_started_at timestamptz;

alter table public.workspace_subscriptions
  add column if not exists trial_ends_at timestamptz;

update public.workspace_subscriptions
set billing_cycle = 'monthly'
where billing_mode = 'stripe'
  and billing_cycle is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'workspace_subscriptions_billing_cycle_check'
  ) then
    alter table public.workspace_subscriptions
      add constraint
        workspace_subscriptions_billing_cycle_check
      check (
        billing_cycle is null
        or billing_cycle in (
          'monthly',
          'annual'
        )
      );
  end if;
end
$$;
