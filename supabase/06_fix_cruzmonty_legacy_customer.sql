-- ============================================================
-- MIBOOKING — CORREGIR CUSTOMER ANTIGUO DE CRUZMONTY
--
-- Ejecutar primero en Supabase > SQL Editor.
--
-- Cruzmonty conserva acceso gratuito heredado, por lo que
-- no debe mantener referencias de Customer o Subscription
-- creadas anteriormente en Stripe Sandbox.
-- ============================================================

begin;

insert into public.workspace_subscriptions (
  workspace_id,
  owner_user_id,
  plan_code,
  billing_mode,
  status,
  stripe_customer_id,
  stripe_subscription_id,
  stripe_price_id,
  current_period_start,
  current_period_end,
  cancel_at_period_end,
  canceled_at,
  promotion_code,
  promotion_code_id,
  discount_percent,
  discount_ends_at,
  last_invoice_id,
  last_payment_status,
  last_payment_failed_at,
  payment_grace_ends_at,
  updated_at
)
select
  w.id,
  w.owner_user_id,
  'professional',
  'legacy',
  'active',
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  now()
from public.workspaces as w
join auth.users as u
  on u.id = w.owner_user_id
where lower(u.email) =
  lower('cruzmontyrd@gmail.com')
on conflict (workspace_id)
do update set
  owner_user_id =
    excluded.owner_user_id,

  plan_code =
    'professional',

  billing_mode =
    'legacy',

  status =
    'active',

  stripe_customer_id =
    null,

  stripe_subscription_id =
    null,

  stripe_price_id =
    null,

  current_period_start =
    null,

  current_period_end =
    null,

  cancel_at_period_end =
    false,

  canceled_at =
    null,

  promotion_code =
    null,

  promotion_code_id =
    null,

  discount_percent =
    null,

  discount_ends_at =
    null,

  last_invoice_id =
    null,

  last_payment_status =
    null,

  last_payment_failed_at =
    null,

  payment_grace_ends_at =
    null,

  updated_at =
    now();

commit;


-- ============================================================
-- VERIFICACIÓN
-- Debe mostrar:
-- billing_mode = legacy
-- status = active
-- plan_code = professional
-- stripe_customer_id = null
-- stripe_subscription_id = null
-- ============================================================

select
  u.email,
  w.id as workspace_id,
  w.nombre as workspace,
  ws.plan_code,
  ws.billing_mode,
  ws.status,
  ws.stripe_customer_id,
  ws.stripe_subscription_id
from public.workspace_subscriptions as ws
join public.workspaces as w
  on w.id = ws.workspace_id
join auth.users as u
  on u.id = w.owner_user_id
where lower(u.email) =
  lower('cruzmontyrd@gmail.com');
