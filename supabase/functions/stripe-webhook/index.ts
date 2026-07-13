import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^22';

type JsonObject = Record<string, any>;

const stripeSecretKey =
  Deno.env.get('STRIPE_SECRET_KEY') || '';

const webhookSecret =
  Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

const essentialPriceId =
  Deno.env.get('STRIPE_PRICE_ESSENTIAL') || '';

const professionalPriceId =
  Deno.env.get('STRIPE_PRICE_PROFESSIONAL') || '';

const supabaseUrl =
  Deno.env.get('SUPABASE_URL') || '';

const serviceRoleKey =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const stripe = new Stripe(stripeSecretKey);
const cryptoProvider =
  Stripe.createSubtleCryptoProvider();

const admin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
}

function objectId(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (
    value &&
    typeof value === 'object' &&
    'id' in value &&
    typeof (value as JsonObject).id === 'string'
  ) {
    return (value as JsonObject).id;
  }

  return '';
}

function positiveInteger(value: unknown): number | null {
  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

function unixToIso(value: unknown): string | null {
  const seconds = Number(value);

  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return null;
  }

  return new Date(
    seconds * 1000,
  ).toISOString();
}

function allowedStatus(value: unknown): string {
  const status = String(value || '');

  const allowed = new Set([
    'incomplete',
    'incomplete_expired',
    'trialing',
    'active',
    'past_due',
    'unpaid',
    'paused',
    'canceled',
  ]);

  return allowed.has(status)
    ? status
    : 'pending_payment';
}

function planFromPrice(
  priceId: string,
): 'essential' | 'professional' | null {
  if (
    priceId &&
    priceId === essentialPriceId
  ) {
    return 'essential';
  }

  if (
    priceId &&
    priceId === professionalPriceId
  ) {
    return 'professional';
  }

  return null;
}

function subscriptionPeriod(
  subscription: JsonObject,
) {
  const firstItem =
    subscription?.items?.data?.[0] || {};

  return {
    start:
      unixToIso(
        firstItem.current_period_start ??
          subscription.current_period_start,
      ),

    end:
      unixToIso(
        firstItem.current_period_end ??
          subscription.current_period_end,
      ),
  };
}

function subscriptionPriceId(
  subscription: JsonObject,
): string {
  return objectId(
    subscription?.items?.data?.[0]?.price,
  );
}

function invoiceSubscriptionId(
  invoice: JsonObject,
): string {
  const current =
    invoice?.parent?.type ===
    'subscription_details'
      ? invoice?.parent
          ?.subscription_details
          ?.subscription
      : null;

  return (
    objectId(current) ||
    objectId(invoice?.subscription)
  );
}

async function findSubscriptionRow(
  workspaceId: number | null,
  subscriptionId: string,
  customerId: string,
) {
  if (workspaceId) {
    const { data, error } = await admin
      .from('workspace_subscriptions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data;
    }
  }

  if (subscriptionId) {
    const { data, error } = await admin
      .from('workspace_subscriptions')
      .select('*')
      .eq(
        'stripe_subscription_id',
        subscriptionId,
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data;
    }
  }

  if (customerId) {
    const { data, error } = await admin
      .from('workspace_subscriptions')
      .select('*')
      .eq(
        'stripe_customer_id',
        customerId,
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data;
    }
  }

  return null;
}

async function syncSubscription(
  subscription: JsonObject,
  invoice?: JsonObject,
  paymentStatus?: string,
) {
  const subscriptionId =
    objectId(subscription?.id);

  const customerId =
    objectId(subscription?.customer);

  let workspaceId =
    positiveInteger(
      subscription?.metadata?.workspace_id,
    );

  let existing =
    await findSubscriptionRow(
      workspaceId,
      subscriptionId,
      customerId,
    );

  if (!workspaceId) {
    workspaceId =
      positiveInteger(existing?.workspace_id);
  }

  // Este endpoint puede compartir cuenta de Stripe con
  // otros productos. Los eventos ajenos a MiBooking
  // se ignoran sin provocar reintentos.
  if (!workspaceId) {
    console.log(
      'Evento ignorado: no pertenece a un workspace.',
      subscriptionId,
    );

    return {
      ignored: true,
      reason: 'workspace_not_found',
    };
  }

  const {
    data: workspace,
    error: workspaceError,
  } = await admin
    .from('workspaces')
    .select('id, owner_user_id')
    .eq('id', workspaceId)
    .maybeSingle();

  if (workspaceError) {
    throw workspaceError;
  }

  if (!workspace?.owner_user_id) {
    throw new Error(
      `El workspace ${workspaceId} no tiene propietario.`,
    );
  }

  const priceId =
    subscriptionPriceId(subscription);

  const planCode =
    planFromPrice(priceId);

  if (!planCode) {
    throw new Error(
      `El precio ${priceId || '(vacío)'} no corresponde a un plan de MiBooking.`,
    );
  }

  const period =
    subscriptionPeriod(subscription);

  const patch: Record<string, unknown> = {
    owner_user_id:
      workspace.owner_user_id,

    plan_code:
      planCode,

    billing_mode:
      'stripe',

    status:
      allowedStatus(subscription?.status),

    stripe_customer_id:
      customerId || null,

    stripe_subscription_id:
      subscriptionId || null,

    stripe_price_id:
      priceId,

    current_period_start:
      period.start,

    current_period_end:
      period.end,

    cancel_at_period_end:
      Boolean(
        subscription?.cancel_at_period_end,
      ),

    canceled_at:
      unixToIso(subscription?.canceled_at),
  };

  if (invoice?.id) {
    patch.last_invoice_id =
      String(invoice.id);
  }

  if (paymentStatus) {
    patch.last_payment_status =
      paymentStatus;
  }

  if (existing) {
    const { error } = await admin
      .from('workspace_subscriptions')
      .update(patch)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await admin
      .from('workspace_subscriptions')
      .insert({
        workspace_id: workspaceId,
        ...patch,
      });

    if (error) {
      throw error;
    }
  }

  return {
    ignored: false,
    workspaceId,
    planCode,
    status: patch.status,
  };
}

async function retrieveSubscription(
  subscriptionId: string,
) {
  if (!subscriptionId) {
    return null;
  }

  return await stripe.subscriptions.retrieve(
    subscriptionId,
  ) as unknown as JsonObject;
}

async function handleCheckoutCompleted(
  session: JsonObject,
) {
  const subscriptionId =
    objectId(session?.subscription);

  if (!subscriptionId) {
    console.log(
      'Checkout completado sin suscripción.',
      session?.id,
    );

    return {
      ignored: true,
      reason: 'subscription_missing',
    };
  }

  const subscription =
    await retrieveSubscription(
      subscriptionId,
    );

  if (!subscription) {
    throw new Error(
      `No se pudo recuperar ${subscriptionId}.`,
    );
  }

  return await syncSubscription(
    subscription,
    undefined,
    String(
      session?.payment_status ||
      'checkout_completed',
    ),
  );
}

async function handleCheckoutExpired(
  session: JsonObject,
) {
  const workspaceId =
    positiveInteger(
      session?.metadata?.workspace_id ??
      session?.client_reference_id,
    );

  if (!workspaceId) {
    return {
      ignored: true,
      reason: 'workspace_not_found',
    };
  }

  const { data: current, error } =
    await admin
      .from('workspace_subscriptions')
      .select(
        'workspace_id, stripe_subscription_id',
      )
      .eq('workspace_id', workspaceId)
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (
    current &&
    !current.stripe_subscription_id
  ) {
    const { error: updateError } =
      await admin
        .from('workspace_subscriptions')
        .update({
          status: 'pending_payment',
          last_payment_status:
            'checkout_expired',
        })
        .eq('workspace_id', workspaceId);

    if (updateError) {
      throw updateError;
    }
  }

  return {
    ignored: false,
    workspaceId,
  };
}

async function handleInvoice(
  invoice: JsonObject,
  paymentStatus: string,
) {
  const subscriptionId =
    invoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    console.log(
      'Factura ignorada: no pertenece a una suscripción.',
      invoice?.id,
    );

    return {
      ignored: true,
      reason: 'subscription_missing',
    };
  }

  const subscription =
    await retrieveSubscription(
      subscriptionId,
    );

  if (!subscription) {
    throw new Error(
      `No se pudo recuperar ${subscriptionId}.`,
    );
  }

  return await syncSubscription(
    subscription,
    invoice,
    paymentStatus,
  );
}

async function processEvent(
  event: Stripe.Event,
) {
  const object =
    event.data.object as unknown as JsonObject;

  switch (event.type) {
    case 'checkout.session.completed':
      return await handleCheckoutCompleted(
        object,
      );

    case 'checkout.session.expired':
      return await handleCheckoutExpired(
        object,
      );

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused':
    case 'customer.subscription.resumed':
      return await syncSubscription(
        object,
      );

    case 'invoice.paid':
      return await handleInvoice(
        object,
        'paid',
      );

    case 'invoice.payment_failed':
      return await handleInvoice(
        object,
        'failed',
      );

    case 'invoice.payment_action_required':
      return await handleInvoice(
        object,
        'action_required',
      );

    default:
      return {
        ignored: true,
        reason: 'event_not_configured',
      };
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse(
      { error: 'Método no permitido.' },
      405,
    );
  }

  if (
    !stripeSecretKey ||
    !webhookSecret ||
    !essentialPriceId ||
    !professionalPriceId ||
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    console.error(
      'Faltan secretos de configuración.',
    );

    return jsonResponse(
      {
        error:
          'La función no está configurada.',
      },
      500,
    );
  }

  const signature =
    request.headers.get(
      'Stripe-Signature',
    );

  if (!signature) {
    return jsonResponse(
      {
        error:
          'Falta la firma de Stripe.',
      },
      400,
    );
  }

  // La verificación exige el cuerpo original sin
  // convertirlo previamente a JSON.
  const rawBody =
    await request.text();

  let event: Stripe.Event;

  try {
    event =
      await stripe.webhooks
        .constructEventAsync(
          rawBody,
          signature,
          webhookSecret,
          undefined,
          cryptoProvider,
        );
  } catch (error) {
    console.error(
      'Firma de Stripe inválida:',
      error,
    );

    return jsonResponse(
      {
        error:
          'La firma del webhook no es válida.',
      },
      400,
    );
  }

  const {
    data: claimed,
    error: claimError,
  } = await admin.rpc(
    'claim_stripe_webhook_event',
    {
      p_stripe_event_id: event.id,
      p_event_type: event.type,
      p_payload: event as unknown,
    },
  );

  if (claimError) {
    console.error(
      'No se pudo reservar el evento:',
      claimError,
    );

    return jsonResponse(
      {
        error:
          'No se pudo registrar el evento.',
      },
      500,
    );
  }

  if (!claimed) {
    return jsonResponse({
      received: true,
      duplicate: true,
      eventId: event.id,
    });
  }

  try {
    const result =
      await processEvent(event);

    const { error: completeError } =
      await admin
        .from('stripe_webhook_events')
        .update({
          status: 'processed',
          processed_at:
            new Date().toISOString(),
          processing_error: null,
        })
        .eq(
          'stripe_event_id',
          event.id,
        );

    if (completeError) {
      throw completeError;
    }

    console.log(
      'Evento Stripe procesado:',
      event.id,
      event.type,
      result,
    );

    return jsonResponse({
      received: true,
      eventId: event.id,
      eventType: event.type,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido.';

    console.error(
      'Error procesando Stripe:',
      event.id,
      event.type,
      error,
    );

    await admin
      .from('stripe_webhook_events')
      .update({
        status: 'failed',
        processing_error:
          message.slice(0, 3000),
      })
      .eq(
        'stripe_event_id',
        event.id,
      );

    // Un 500 hace que Stripe vuelva a intentar
    // entregar el evento.
    return jsonResponse(
      {
        error:
          'No se pudo procesar el evento.',
        eventId: event.id,
      },
      500,
    );
  }
});
