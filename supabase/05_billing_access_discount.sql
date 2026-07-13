-- ============================================================
-- MIBOOKING — CIERRE DE SUSCRIPCIONES
--
-- Incluye:
-- - acceso gratuito heredado para Cruzmonty;
-- - período de gracia para pagos vencidos;
-- - campos del descuento de La Oreja Media;
-- - estado de acceso calculado para el frontend.
--
-- Las cuentas de Gestor no pagan una suscripción propia.
-- Acceden al workspace al que fueron invitadas y heredan
-- el estado de acceso del plan contratado por el Artista.
-- ============================================================

begin;

alter table public.workspace_subscriptions
  add column if not exists
    payment_grace_ends_at timestamptz;

alter table public.workspace_subscriptions
  add column if not exists
    last_payment_failed_at timestamptz;

alter table public.workspace_subscriptions
  add column if not exists
    promotion_code_id text;

alter table public.workspace_subscriptions
  add column if not exists
    discount_percent numeric(5, 2);

comment on column
  public.workspace_subscriptions.payment_grace_ends_at
is
  'Fin del período temporal de acceso después de un fallo de pago.';

comment on column
  public.workspace_subscriptions.promotion_code
is
  'Código promocional visible aplicado en Stripe Checkout.';

comment on column
  public.workspace_subscriptions.discount_percent
is
  'Porcentaje de descuento vigente informado por Stripe.';


-- ------------------------------------------------------------
-- CRUZMONTY CONSERVA ACCESO GRATUITO
-- ------------------------------------------------------------

update public.workspace_subscriptions as ws
set
  plan_code = 'professional',
  billing_mode = 'legacy',
  status = 'active',
  payment_grace_ends_at = null,
  last_payment_failed_at = null,
  updated_at = now()
from
  public.workspaces as w
  join auth.users as u
    on u.id = w.owner_user_id
where
  ws.workspace_id = w.id
  and lower(u.email) =
    lower('cruzmontyrd@gmail.com');


-- Workspaces que ya estén past_due reciben siete días
-- desde la ejecución de esta migración, solo si aún no
-- tenían una fecha de gracia.

update public.workspace_subscriptions
set
  payment_grace_ends_at =
    now() + interval '7 days',
  last_payment_failed_at =
    coalesce(
      last_payment_failed_at,
      now()
    ),
  updated_at = now()
where
  billing_mode = 'stripe'
  and status = 'past_due'
  and payment_grace_ends_at is null;


-- ------------------------------------------------------------
-- FUNCIÓN DE LECTURA ACTUALIZADA
-- No expone IDs privados de Stripe al navegador.
-- ------------------------------------------------------------

create or replace function
public.get_workspace_subscription(
  p_workspace_id bigint
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception
      'No hay una sesión activa.';
  end if;

  if not exists (
    select 1
    from public.workspace_members as wm
    where wm.workspace_id =
      p_workspace_id
      and wm.user_id =
        v_user_id
      and wm.status =
        'active'
  )
  and not exists (
    select 1
    from public.workspaces as w
    where w.id =
      p_workspace_id
      and w.owner_user_id =
        v_user_id
  ) then
    raise exception
      'No tienes acceso a este workspace.';
  end if;

  select jsonb_build_object(
    'workspace_id',
      ws.workspace_id,

    'owner_user_id',
      ws.owner_user_id,

    'plan_code',
      ws.plan_code,

    'billing_mode',
      ws.billing_mode,

    'status',
      ws.status,

    'current_period_start',
      ws.current_period_start,

    'current_period_end',
      ws.current_period_end,

    'cancel_at_period_end',
      ws.cancel_at_period_end,

    'canceled_at',
      ws.canceled_at,

    'promotion_code',
      ws.promotion_code,

    'promotion_code_id',
      ws.promotion_code_id,

    'discount_percent',
      ws.discount_percent,

    'discount_ends_at',
      ws.discount_ends_at,

    'last_payment_status',
      ws.last_payment_status,

    'last_payment_failed_at',
      ws.last_payment_failed_at,

    'payment_grace_ends_at',
      ws.payment_grace_ends_at,

    'access_state',
      case
        when
          ws.billing_mode = 'legacy'
          and ws.status = 'active'
        then 'full'

        when ws.status in (
          'trialing',
          'active'
        )
        then 'full'

        when
          ws.status = 'past_due'
          and ws.payment_grace_ends_at >
            now()
        then 'grace'

        else 'restricted'
      end
  )
  into v_result
  from public.workspace_subscriptions as ws
  where ws.workspace_id =
    p_workspace_id;

  return coalesce(
    v_result,
    jsonb_build_object(
      'workspace_id',
        p_workspace_id,

      'plan_code',
        null,

      'billing_mode',
        'stripe',

      'status',
        'pending_payment',

      'access_state',
        'restricted'
    )
  );
end;
$$;

revoke all
on function
public.get_workspace_subscription(bigint)
from public;

grant execute
on function
public.get_workspace_subscription(bigint)
to authenticated;

commit;


-- ============================================================
-- VERIFICACIÓN
-- ============================================================

select
  u.email,
  w.id as workspace_id,
  w.nombre as workspace,
  ws.plan_code,
  ws.billing_mode,
  ws.status,
  ws.payment_grace_ends_at
from public.workspace_subscriptions as ws
join public.workspaces as w
  on w.id = ws.workspace_id
join auth.users as u
  on u.id = w.owner_user_id
order by u.email;
