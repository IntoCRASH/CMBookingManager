import { supabase } from './supabaseClient';

const SELECTED_PLAN_KEY =
  'mibooking_selected_plan';

const SELECTED_BILLING_CYCLE_KEY =
  'mibooking_selected_billing_cycle';

const VALID_PLANS = new Set([
  'essential',
  'professional',
]);

const VALID_BILLING_CYCLES =
  new Set([
    'monthly',
    'annual',
  ]);

export function normalizePlanCode(value) {
  const normalized =
    String(value || '')
      .trim()
      .toLowerCase();

  return VALID_PLANS.has(normalized)
    ? normalized
    : '';
}

export function normalizeBillingCycle(value) {
  const normalized =
    String(value || '')
      .trim()
      .toLowerCase();

  if (
    normalized === 'mensual' ||
    normalized === 'month'
  ) {
    return 'monthly';
  }

  if (
    normalized === 'anual' ||
    normalized === 'year' ||
    normalized === 'yearly'
  ) {
    return 'annual';
  }

  return VALID_BILLING_CYCLES.has(
    normalized
  )
    ? normalized
    : '';
}

export function getBillingCycleLabel(value) {
  return normalizeBillingCycle(value) ===
    'annual'
    ? 'Anual'
    : 'Mensual';
}

export function getPlanLabel(value) {
  const plan = normalizePlanCode(value);

  if (plan === 'professional') {
    return 'Profesional';
  }

  if (plan === 'essential') {
    return 'Esencial';
  }

  return '';
}

export function getPlanPrice(
  value,
  billingCycle = 'monthly'
) {
  const plan =
    normalizePlanCode(value);

  const cycle =
    normalizeBillingCycle(
      billingCycle
    ) || 'monthly';

  if (
    plan === 'professional'
  ) {
    return cycle === 'annual'
      ? 'US$275 al año'
      : 'US$35 al mes';
  }

  if (
    plan === 'essential'
  ) {
    return cycle === 'annual'
      ? 'US$140 al año'
      : 'US$20 al mes';
  }

  return '';
}


export function getSubscriptionStatusLabel(
  value
) {
  const status =
    String(value || '')
      .trim()
      .toLowerCase();

  const labels = {
    pending_payment: 'Pendiente de pago',
    incomplete: 'Pago incompleto',
    incomplete_expired:
      'Proceso de pago vencido',
    trialing: 'Período de prueba',
    active: 'Activa',
    past_due: 'Pago pendiente',
    unpaid: 'Sin pagar',
    paused: 'Pausada',
    canceled: 'Cancelada',
  };

  return labels[status] || 'Sin estado';
}

export function formatSubscriptionDate(
  value
) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return '';
  }

  return new Intl.DateTimeFormat(
    'es-DO',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  ).format(date);
}

export function storeSelectedPlan(value) {
  const plan = normalizePlanCode(value);

  if (
    !plan ||
    typeof window === 'undefined'
  ) {
    return '';
  }

  window.localStorage.setItem(
    SELECTED_PLAN_KEY,
    plan
  );

  return plan;
}

export function getStoredSelectedPlan() {
  if (typeof window === 'undefined') {
    return '';
  }

  return normalizePlanCode(
    window.localStorage.getItem(
      SELECTED_PLAN_KEY
    )
  );
}

export function clearStoredSelectedPlan() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(
    SELECTED_PLAN_KEY
  );
}

export function storeSelectedBillingCycle(
  value
) {
  const billingCycle =
    normalizeBillingCycle(value);

  if (
    !billingCycle ||
    typeof window === 'undefined'
  ) {
    return '';
  }

  window.localStorage.setItem(
    SELECTED_BILLING_CYCLE_KEY,
    billingCycle
  );

  return billingCycle;
}

export function getStoredSelectedBillingCycle() {
  if (typeof window === 'undefined') {
    return '';
  }

  return normalizeBillingCycle(
    window.localStorage.getItem(
      SELECTED_BILLING_CYCLE_KEY
    )
  );
}

export function clearStoredSelectedBillingCycle() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(
    SELECTED_BILLING_CYCLE_KEY
  );
}

export function planFromLocation() {
  if (typeof window === 'undefined') {
    return '';
  }

  return normalizePlanCode(
    new URLSearchParams(
      window.location.search
    ).get('plan')
  );
}

export function billingCycleFromLocation() {
  if (typeof window === 'undefined') {
    return '';
  }

  return normalizeBillingCycle(
    new URLSearchParams(
      window.location.search
    ).get('billingCycle') ||
    new URLSearchParams(
      window.location.search
    ).get('billing_cycle')
  );
}

export async function getWorkspaceSubscription(
  workspaceId
) {
  const parsedWorkspaceId =
    Number(workspaceId);

  if (
    !Number.isInteger(parsedWorkspaceId) ||
    parsedWorkspaceId <= 0
  ) {
    throw new Error(
      'El proyecto del Artista no es válido.'
    );
  }

  const { data, error } =
    await supabase.rpc(
      'get_workspace_subscription',
      {
        p_workspace_id:
          parsedWorkspaceId,
      }
    );

  if (error) throw error;

  return data || null;
}

async function functionErrorMessage(error) {
  const fallback =
    error?.message ||
    'No se pudo abrir Stripe Checkout.';

  const response = error?.context;

  if (
    !response ||
    typeof response.clone !== 'function'
  ) {
    return fallback;
  }

  try {
    const payload =
      await response.clone().json();

    return (
      payload?.error ||
      payload?.message ||
      fallback
    );
  } catch {
    return fallback;
  }
}

export async function createCheckoutSession({
  workspaceId,
  planCode,
  billingCycle = '',
}) {
  const parsedWorkspaceId =
    Number(workspaceId);

  const plan =
    normalizePlanCode(planCode);

  const cycle =
    normalizeBillingCycle(
      billingCycle
    ) ||
    getStoredSelectedBillingCycle() ||
    'monthly';

  if (
    !Number.isInteger(
      parsedWorkspaceId
    ) ||
    parsedWorkspaceId <= 0
  ) {
    throw new Error(
      'El proyecto del Artista no es válido.'
    );
  }

  if (!plan) {
    throw new Error(
      'Selecciona un plan antes de continuar.'
    );
  }

  const { data, error } =
    await supabase.functions.invoke(
      'create-checkout-session',
      {
        body: {
          workspaceId:
            parsedWorkspaceId,

          planCode:
            plan,

          billingCycle:
            cycle,
        },
      }
    );

  if (error) {
    throw new Error(
      await functionErrorMessage(error)
    );
  }

  if (!data?.checkoutUrl) {
    throw new Error(
      data?.error ||
      'Stripe no devolvió una página de pago.'
    );
  }

  return data;
}



export async function changeSubscriptionPlan({
  workspaceId,
  targetPlan,
}) {
  const parsedWorkspaceId =
    Number(workspaceId);

  const plan =
    normalizePlanCode(targetPlan);

  if (
    !Number.isInteger(
      parsedWorkspaceId
    ) ||
    parsedWorkspaceId <= 0
  ) {
    throw new Error(
      'El proyecto del Artista no es válido.'
    );
  }

  if (!plan) {
    throw new Error(
      'Selecciona un plan válido.'
    );
  }

  const { data, error } =
    await supabase.functions.invoke(
      'change-subscription-plan',
      {
        body: {
          workspaceId:
            parsedWorkspaceId,
          targetPlan:
            plan,
        },
      }
    );

  if (error) {
    throw new Error(
      await functionErrorMessage(error)
    );
  }

  if (!data?.ok) {
    throw new Error(
      data?.error ||
        'No se pudo cambiar el plan.'
    );
  }

  return data;
}

export async function createCustomerPortalSession({
  workspaceId,
}) {
  const parsedWorkspaceId =
    Number(workspaceId);

  if (
    !Number.isInteger(parsedWorkspaceId) ||
    parsedWorkspaceId <= 0
  ) {
    throw new Error(
      'El proyecto del Artista no es válido.'
    );
  }

  const { data, error } =
    await supabase.functions.invoke(
      'create-customer-portal-session',
      {
        body: {
          workspaceId:
            parsedWorkspaceId,
        },
      }
    );

  if (error) {
    throw new Error(
      await functionErrorMessage(error)
    );
  }

  if (!data?.portalUrl) {
    throw new Error(
      'Stripe no devolvió el portal de facturación.'
    );
  }

  return data;
}

export function getSubscriptionAccessState(
  subscription
) {
  if (!subscription) {
    return 'restricted';
  }

  if (
    subscription.access_state === 'full' ||
    subscription.access_state === 'grace' ||
    subscription.access_state === 'restricted'
  ) {
    return subscription.access_state;
  }

  if (
    subscription.billing_mode === 'legacy' &&
    subscription.status === 'active'
  ) {
    return 'full';
  }

  if (
    [
      'trialing',
      'active',
    ].includes(subscription.status)
  ) {
    return 'full';
  }

  if (
    subscription.status === 'past_due' &&
    subscription.payment_grace_ends_at
  ) {
    const graceEnd =
      new Date(
        subscription.payment_grace_ends_at
      );

    if (
      !Number.isNaN(graceEnd.getTime()) &&
      graceEnd.getTime() > Date.now()
    ) {
      return 'grace';
    }
  }

  return 'restricted';
}

export function isSubscriptionAccessAllowed(
  subscription
) {
  return [
    'full',
    'grace',
  ].includes(
    getSubscriptionAccessState(
      subscription
    )
  );
}

export function isInitialSubscriptionState(
  subscription
) {
  if (!subscription) {
    return true;
  }

  return [
    'pending_payment',
    'incomplete',
    'incomplete_expired',
  ].includes(
    String(
      subscription.status || ''
    )
  );
}

export function getSubscriptionDaysRemaining(
  value
) {
  if (!value) {
    return null;
  }

  const target =
    new Date(value);

  if (
    Number.isNaN(
      target.getTime()
    )
  ) {
    return null;
  }

  return Math.max(
    0,
    Math.ceil(
      (
        target.getTime() -
        Date.now()
      ) /
      86400000
    )
  );
}

export function getDiscountDescription(
  subscription
) {
  const percent =
    Number(
      subscription?.discount_percent
    );

  if (
    !Number.isFinite(percent) ||
    percent <= 0
  ) {
    return '';
  }

  const code =
    String(
      subscription?.promotion_code ||
      ''
    ).trim();

  const endDate =
    formatSubscriptionDate(
      subscription?.discount_ends_at
    );

  return [
    `${percent}% de descuento`,
    code
      ? `Código ${code}`
      : '',
    endDate
      ? `Vigente hasta ${endDate}`
      : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
