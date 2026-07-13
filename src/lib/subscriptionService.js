import { supabase } from './supabaseClient';

const SELECTED_PLAN_KEY =
  'mibooking_selected_plan';

const VALID_PLANS = new Set([
  'essential',
  'professional',
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

export function getPlanPrice(value) {
  const plan = normalizePlanCode(value);

  if (plan === 'professional') {
    return 'US$30 al mes';
  }

  if (plan === 'essential') {
    return 'US$20 al mes';
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
}) {
  const plan = normalizePlanCode(planCode);

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
            Number(workspaceId),
          planCode: plan,
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
      'Stripe no devolvió una página de pago.'
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

export function isSubscriptionAccessAllowed(
  subscription
) {
  if (!subscription) {
    return false;
  }

  if (
    subscription.billing_mode === 'legacy' &&
    subscription.status === 'active'
  ) {
    return true;
  }

  return [
    'trialing',
    'active',
    'past_due',
  ].includes(subscription.status);
}
