-- ============================================================
-- MIBOOKING + STRIPE — PASO 7
-- LÍMITES DE GESTORES SEGÚN EL PLAN
--
-- Esencial:
--   máximo 1 acceso reservado:
--   Gestor activo/suspendido O invitación pendiente.
--
-- Profesional y legacy:
--   Gestores ilimitados.
--
-- La protección se aplica mediante triggers, por lo que funciona:
-- - al crear o renovar una invitación;
-- - al aceptar una invitación desde MiBooking;
-- - al aceptar mediante el enlace por token;
-- - al insertar o reactivar una membresía directamente.
-- ============================================================

begin;


-- ------------------------------------------------------------
-- FUNCIÓN CENTRAL DE CAPACIDAD
-- Bloquea la fila de suscripción para evitar condiciones de carrera.
-- ------------------------------------------------------------

create or replace function
public.assert_workspace_manager_capacity(
  p_workspace_id bigint,
  p_include_pending boolean default false,
  p_exclude_invitation_id bigint default null,
  p_exclude_membership_id bigint default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subscription
    public.workspace_subscriptions%rowtype;

  v_manager_count integer := 0;
  v_pending_count integer := 0;
begin
  select ws.*
  into v_subscription
  from public.workspace_subscriptions as ws
  where ws.workspace_id = p_workspace_id
  for update;

  if not found then
    raise exception
      'Este Artista todavía no tiene una suscripción configurada.';
  end if;

  if v_subscription.billing_mode = 'legacy'
     or v_subscription.plan_code = 'professional' then
    return true;
  end if;

  if v_subscription.plan_code is distinct from 'essential' then
    raise exception
      'Activa un plan de MiBooking antes de invitar Gestores.';
  end if;

  if v_subscription.status not in (
    'trialing',
    'active',
    'past_due'
  ) then
    raise exception
      'La suscripción del Artista no permite agregar Gestores en este momento.';
  end if;

  select count(*)::integer
  into v_manager_count
  from public.workspace_members as wm
  where wm.workspace_id = p_workspace_id
    and wm.role = 'manager'
    and wm.status in (
      'active',
      'suspended'
    )
    and (
      p_exclude_membership_id is null
      or wm.id <> p_exclude_membership_id
    );

  if p_include_pending then
    select count(*)::integer
    into v_pending_count
    from public.workspace_invitations as wi
    where wi.workspace_id = p_workspace_id
      and wi.status = 'pending'
      and (
        wi.expires_at is null
        or wi.expires_at > now()
      )
      and (
        p_exclude_invitation_id is null
        or wi.id <> p_exclude_invitation_id
      );
  end if;

  if (
    v_manager_count +
    v_pending_count
  ) >= 1 then
    raise exception
      'Tu plan Esencial admite un solo Gestor. Retira el acceso o cancela la invitación pendiente, o cambia al plan Profesional.';
  end if;

  return true;
end;
$$;

revoke all
on function
public.assert_workspace_manager_capacity(
  bigint,
  boolean,
  bigint,
  bigint
)
from public;

grant execute
on function
public.assert_workspace_manager_capacity(
  bigint,
  boolean,
  bigint,
  bigint
)
to authenticated, service_role;


-- ------------------------------------------------------------
-- TRIGGER DE INVITACIONES
-- Una invitación pendiente reserva el único cupo del Esencial.
-- ------------------------------------------------------------

create or replace function
public.enforce_workspace_invitation_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exclude_id bigint;
begin
  if new.status = 'pending'
     and (
       new.expires_at is null
       or new.expires_at > now()
     ) then

    v_exclude_id :=
      case
        when tg_op = 'UPDATE'
          then old.id
        else null
      end;

    perform
      public.assert_workspace_manager_capacity(
        new.workspace_id,
        true,
        v_exclude_id,
        null
      );
  end if;

  return new;
end;
$$;

drop trigger if exists
  workspace_invitations_enforce_plan_limit
on public.workspace_invitations;

create trigger
  workspace_invitations_enforce_plan_limit
before insert or update of
  workspace_id,
  status,
  expires_at
on public.workspace_invitations
for each row
execute function
  public.enforce_workspace_invitation_capacity();


-- ------------------------------------------------------------
-- TRIGGER DE MEMBRESÍAS
-- Protege aceptación por RPC, token y escrituras directas.
-- ------------------------------------------------------------

create or replace function
public.enforce_workspace_member_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exclude_id bigint;
begin
  if new.role = 'manager'
     and new.status in (
       'active',
       'suspended'
     ) then

    v_exclude_id :=
      case
        when tg_op = 'UPDATE'
          then old.id
        else null
      end;

    perform
      public.assert_workspace_manager_capacity(
        new.workspace_id,
        false,
        null,
        v_exclude_id
      );
  end if;

  return new;
end;
$$;

drop trigger if exists
  workspace_members_enforce_plan_limit
on public.workspace_members;

create trigger
  workspace_members_enforce_plan_limit
before insert or update of
  workspace_id,
  role,
  status
on public.workspace_members
for each row
execute function
  public.enforce_workspace_member_capacity();


-- ------------------------------------------------------------
-- RESUMEN DEL USO DEL PLAN PARA EL ARTISTA
-- ------------------------------------------------------------

create or replace function
public.get_workspace_plan_usage(
  p_workspace_id bigint
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_subscription
    public.workspace_subscriptions%rowtype;

  v_managers integer := 0;
  v_pending integer := 0;
  v_limit integer;
begin
  if auth.uid() is null then
    raise exception
      'No hay una sesión activa.';
  end if;

  if not public.is_workspace_owner(
    p_workspace_id
  ) then
    raise exception
      'Solo el Artista puede consultar los límites de su plan.';
  end if;

  select ws.*
  into v_subscription
  from public.workspace_subscriptions as ws
  where ws.workspace_id = p_workspace_id;

  if not found then
    raise exception
      'No se encontró la suscripción del Artista.';
  end if;

  select count(*)::integer
  into v_managers
  from public.workspace_members as wm
  where wm.workspace_id = p_workspace_id
    and wm.role = 'manager'
    and wm.status in (
      'active',
      'suspended'
    );

  select count(*)::integer
  into v_pending
  from public.workspace_invitations as wi
  where wi.workspace_id = p_workspace_id
    and wi.status = 'pending'
    and (
      wi.expires_at is null
      or wi.expires_at > now()
    );

  v_limit :=
    case
      when v_subscription.billing_mode = 'legacy'
        then null
      when v_subscription.plan_code = 'professional'
        then null
      when v_subscription.plan_code = 'essential'
        then 1
      else 0
    end;

  return jsonb_build_object(
    'workspace_id',
      p_workspace_id,

    'plan_code',
      v_subscription.plan_code,

    'billing_mode',
      v_subscription.billing_mode,

    'subscription_status',
      v_subscription.status,

    'manager_limit',
      v_limit,

    'active_managers',
      v_managers,

    'pending_invitations',
      v_pending,

    'reserved_slots',
      v_managers + v_pending,

    'can_invite',
      v_limit is null
      or (
        v_managers + v_pending
      ) < v_limit
  );
end;
$$;

revoke all
on function
public.get_workspace_plan_usage(bigint)
from public;

grant execute
on function
public.get_workspace_plan_usage(bigint)
to authenticated;


commit;


-- ============================================================
-- VERIFICACIÓN
-- ============================================================

select
  proname
from pg_proc
where pronamespace =
  'public'::regnamespace
  and proname in (
    'assert_workspace_manager_capacity',
    'enforce_workspace_invitation_capacity',
    'enforce_workspace_member_capacity',
    'get_workspace_plan_usage'
  )
order by proname;
