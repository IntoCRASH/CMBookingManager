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

const siteUrl =
  (
    Deno.env.get('SITE_URL') ||
    'https://mibooking.app'
  ).replace(/\/+$/, '');

const resendApiKey =
  Deno.env.get('RESEND_API_KEY') || '';

const billingFromEmail =
  Deno.env.get('BILLING_FROM_EMAIL') || '';

const parsedGraceDays =
  Number(
    Deno.env.get('PAYMENT_GRACE_DAYS') ||
    7,
  );

const paymentGraceDays =
  Number.isFinite(parsedGraceDays) &&
  parsedGraceDays >= 0
    ? parsedGraceDays
    : 7;

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
    typeof (value as JsonObject).id ===
      'string'
  ) {
    return (value as JsonObject).id;
  }

  return '';
}

function positiveInteger(
  value: unknown,
): number | null {
  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

function unixToIso(
  value: unknown,
): string | null {
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

function allowedStatus(
  value: unknown,
): string {
  const status =
    String(value || '');

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
):
  | 'essential'
  | 'professional'
  | null {
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

function planLabel(
  planCode: string | null,
) {
  return planCode === 'professional'
    ? 'Profesional'
    : 'Esencial';
}

function subscriptionPeriod(
  subscription: JsonObject,
) {
  const firstItem =
    subscription
      ?.items
      ?.data
      ?.[0] || {};

  return {
    start:
      unixToIso(
        firstItem
          .current_period_start ??
          subscription
            .current_period_start,
      ),

    end:
      unixToIso(
        firstItem
          .current_period_end ??
          subscription
            .current_period_end,
      ),
  };
}

function subscriptionPriceId(
  subscription: JsonObject,
): string {
  return objectId(
    subscription
      ?.items
      ?.data
      ?.[0]
      ?.price,
  );
}

function invoiceSubscriptionId(
  invoice: JsonObject,
): string {
  const current =
    invoice?.parent?.type ===
    'subscription_details'
      ? invoice
          ?.parent
          ?.subscription_details
          ?.subscription
      : null;

  return (
    objectId(current) ||
    objectId(invoice?.subscription)
  );
}

function graceDateFromNow() {
  const date = new Date();

  date.setUTCDate(
    date.getUTCDate() +
    paymentGraceDays,
  );

  return date.toISOString();
}

function dateIsFuture(
  value: unknown,
) {
  if (!value) return false;

  const date =
    new Date(String(value));

  return (
    !Number.isNaN(date.getTime()) &&
    date.getTime() > Date.now()
  );
}

function escapeHtml(
  value: unknown,
) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function moneyFromInvoice(
  invoice: JsonObject,
) {
  const amount =
    Number(
      invoice?.amount_due ??
      invoice?.amount_remaining ??
      0,
    ) / 100;

  const currency =
    String(
      invoice?.currency || 'usd',
    ).toUpperCase();

  try {
    return new Intl.NumberFormat(
      'es-DO',
      {
        style: 'currency',
        currency,
      },
    ).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

async function findSubscriptionRow(
  workspaceId: number | null,
  subscriptionId: string,
  customerId: string,
) {
  if (workspaceId) {
    const { data, error } =
      await admin
        .from(
          'workspace_subscriptions',
        )
        .select('*')
        .eq(
          'workspace_id',
          workspaceId,
        )
        .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  if (subscriptionId) {
    const { data, error } =
      await admin
        .from(
          'workspace_subscriptions',
        )
        .select('*')
        .eq(
          'stripe_subscription_id',
          subscriptionId,
        )
        .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  if (customerId) {
    const { data, error } =
      await admin
        .from(
          'workspace_subscriptions',
        )
        .select('*')
        .eq(
          'stripe_customer_id',
          customerId,
        )
        .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  return null;
}

async function retrieveSubscription(
  subscriptionId: string,
) {
  if (!subscriptionId) {
    return null;
  }

  return await stripe
    .subscriptions
    .retrieve(
      subscriptionId,
      {
        expand: [
          'discounts',
        ],
      },
    ) as unknown as JsonObject;
}

async function discountInfo(
  subscription: JsonObject,
) {
  const discounts =
    Array.isArray(
      subscription?.discounts,
    )
      ? subscription.discounts
      : [];

  const discount =
    discounts.find(
      (item: unknown) =>
        item &&
        typeof item === 'object',
    ) as JsonObject | undefined;

  if (!discount) {
    return {
      promotionCodeId: null,
      promotionCode: null,
      percentOff: null,
      endsAt: null,
    };
  }

  const promotionCodeId =
    objectId(
      discount.promotion_code,
    );

  const couponId =
    objectId(
      discount
        ?.source
        ?.coupon,
    );

  let promotionCode:
    | string
    | null = null;

  let percentOff:
    | number
    | null = null;

  if (promotionCodeId) {
    try {
      const promotion =
        await stripe
          .promotionCodes
          .retrieve(
            promotionCodeId,
          );

      promotionCode =
        promotion.code || null;
    } catch (error) {
      console.error(
        'No se pudo recuperar el código promocional:',
        error,
      );
    }
  }

  if (couponId) {
    try {
      const coupon =
        await stripe
          .coupons
          .retrieve(couponId);

      percentOff =
        typeof coupon.percent_off ===
        'number'
          ? coupon.percent_off
          : null;
    } catch (error) {
      console.error(
        'No se pudo recuperar el cupón:',
        error,
      );
    }
  }

  return {
    promotionCodeId:
      promotionCodeId || null,

    promotionCode,

    percentOff,

    endsAt:
      unixToIso(discount.end),
  };
}

async function billingEmailAddress(
  customerId: string,
) {
  if (!customerId) {
    return '';
  }

  try {
    const customer =
      await stripe
        .customers
        .retrieve(customerId);

    if (
      customer &&
      !('deleted' in customer) &&
      customer.email
    ) {
      return customer.email;
    }
  } catch (error) {
    console.error(
      'No se pudo recuperar el email del Customer:',
      error,
    );
  }

  return '';
}

async function sendBillingEmail({
  subscription,
  invoice,
  kind,
  planCode,
}: {
  subscription: JsonObject;
  invoice: JsonObject;
  kind:
    | 'failed'
    | 'action_required'
    | 'upcoming';
  planCode: string | null;
}) {
  if (
    !resendApiKey ||
    !billingFromEmail
  ) {
    console.log(
      'Correo de facturación omitido: faltan RESEND_API_KEY o BILLING_FROM_EMAIL.',
    );
    return;
  }

  const customerId =
    objectId(
      subscription?.customer,
    );

  const recipient =
    await billingEmailAddress(
      customerId,
    );

  if (!recipient) {
    console.log(
      'Correo de facturación omitido: Customer sin email.',
      customerId,
    );
    return;
  }

  const invoiceUrl =
    String(
      invoice
        ?.hosted_invoice_url ||
      '',
    ) ||
    `${siteUrl}/?billing=return`;

  const amount =
    moneyFromInvoice(invoice);

  const plan =
    planLabel(planCode);

  const content = {
    failed: {
      subject:
        'No pudimos procesar tu pago de MiBooking',

      title:
        'Tu pago necesita atención',

      message:
        `No pudimos procesar el cobro de ${amount} correspondiente al plan ${plan}. ` +
        `Tu cuenta conserva acceso temporal durante ${paymentGraceDays} días para que puedas actualizar el método de pago.`,

      action:
        'Actualizar pago',
    },

    action_required: {
      subject:
        'Completa la verificación de tu pago de MiBooking',

      title:
        'Tu banco requiere una confirmación',

      message:
        `El cobro de ${amount} para el plan ${plan} requiere una acción adicional. ` +
        'Completa la verificación para evitar la interrupción del servicio.',

      action:
        'Completar pago',
    },

    upcoming: {
      subject:
        'Próxima renovación de MiBooking',

      title:
        'Tu suscripción se renovará próximamente',

      message:
        `Stripe intentará cobrar ${amount} para renovar tu plan ${plan}. ` +
        'Puedes revisar el método de pago o administrar la renovación desde tu cuenta.',

      action:
        'Administrar suscripción',
    },
  }[kind];

  const response =
    await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${resendApiKey}`,
        },

        body: JSON.stringify({
          from:
            billingFromEmail,

          to:
            [recipient],

          subject:
            content.subject,

          html: `
            <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:28px;color:#1f2937">
              <div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#6d5ce7">
                MiBooking
              </div>

              <h1 style="font-size:25px;margin:12px 0;color:#111827">
                ${escapeHtml(content.title)}
              </h1>

              <p style="font-size:15px;line-height:1.7;color:#4b5563">
                ${escapeHtml(content.message)}
              </p>

              <a
                href="${escapeHtml(invoiceUrl)}"
                style="display:inline-block;margin-top:12px;padding:13px 18px;border-radius:12px;background:#5f4bd8;color:#fff;text-decoration:none;font-weight:800"
              >
                ${escapeHtml(content.action)}
              </a>

              <p style="margin-top:26px;font-size:12px;line-height:1.6;color:#9ca3af">
                Este mensaje fue enviado automáticamente por MiBooking.
              </p>
            </div>
          `,
        }),
      },
    );

  if (!response.ok) {
    const payload =
      await response.text();

    console.error(
      'Resend rechazó el correo:',
      response.status,
      payload,
    );
  }
}

async function syncSubscription(
  subscription: JsonObject,
  invoice?: JsonObject,
  paymentStatus?: string,
) {
  const subscriptionId =
    objectId(
      subscription?.id,
    );

  const customerId =
    objectId(
      subscription?.customer,
    );

  let workspaceId =
    positiveInteger(
      subscription
        ?.metadata
        ?.workspace_id,
    );

  const existing =
    await findSubscriptionRow(
      workspaceId,
      subscriptionId,
      customerId,
    );

  if (!workspaceId) {
    workspaceId =
      positiveInteger(
        existing?.workspace_id,
      );
  }

  if (!workspaceId) {
    console.log(
      'Evento ignorado: no pertenece a un workspace.',
      subscriptionId,
    );

    return {
      ignored: true,
      reason:
        'workspace_not_found',
    };
  }

  const {
    data: workspace,
    error: workspaceError,
  } = await admin
    .from('workspaces')
    .select(
      'id, owner_user_id',
    )
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
    subscriptionPriceId(
      subscription,
    );

  const planCode =
    planFromPrice(priceId);

  if (!planCode) {
    throw new Error(
      `El precio ${priceId || '(vacío)'} no corresponde a un plan de MiBooking.`,
    );
  }

  const status =
    allowedStatus(
      subscription?.status,
    );

  const period =
    subscriptionPeriod(
      subscription,
    );

  const discount =
    await discountInfo(
      subscription,
    );

  let paymentGraceEndsAt =
    existing
      ?.payment_grace_ends_at ||
    null;

  let lastPaymentFailedAt =
    existing
      ?.last_payment_failed_at ||
    null;

  const paymentNeedsAttention =
    [
      'failed',
      'action_required',
    ].includes(
      String(
        paymentStatus || '',
      ),
    ) ||
    status === 'past_due';

  const paymentRecovered =
    paymentStatus === 'paid' ||
    [
      'active',
      'trialing',
    ].includes(status);

  const terminalStatus =
    [
      'unpaid',
      'paused',
      'canceled',
      'incomplete_expired',
    ].includes(status);

  if (paymentRecovered) {
    paymentGraceEndsAt = null;
    lastPaymentFailedAt = null;
  } else if (paymentNeedsAttention) {
    lastPaymentFailedAt =
      new Date().toISOString();

    if (
      !dateIsFuture(
        paymentGraceEndsAt,
      )
    ) {
      paymentGraceEndsAt =
        graceDateFromNow();
    }
  } else if (terminalStatus) {
    paymentGraceEndsAt = null;
  }

  const patch:
    Record<string, unknown> = {
    owner_user_id:
      workspace.owner_user_id,

    plan_code:
      planCode,

    billing_mode:
      'stripe',

    status,

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
        subscription
          ?.cancel_at_period_end,
      ),

    canceled_at:
      unixToIso(
        subscription
          ?.canceled_at,
      ),

    promotion_code_id:
      discount
        .promotionCodeId,

    promotion_code:
      discount
        .promotionCode,

    discount_percent:
      discount
        .percentOff,

    discount_ends_at:
      discount
        .endsAt,

    payment_grace_ends_at:
      paymentGraceEndsAt,

    last_payment_failed_at:
      lastPaymentFailedAt,
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
      .from(
        'workspace_subscriptions',
      )
      .update(patch)
      .eq(
        'workspace_id',
        workspaceId,
      );

    if (error) throw error;
  } else {
    const { error } = await admin
      .from(
        'workspace_subscriptions',
      )
      .insert({
        workspace_id:
          workspaceId,
        ...patch,
      });

    if (error) throw error;
  }

  return {
    ignored: false,
    workspaceId,
    planCode,
    status,
  };
}

async function handleCheckoutCompleted(
  session: JsonObject,
) {
  const subscriptionId =
    objectId(
      session?.subscription,
    );

  if (!subscriptionId) {
    return {
      ignored: true,
      reason:
        'subscription_missing',
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
      session
        ?.payment_status ||
      'checkout_completed',
    ),
  );
}

async function handleCheckoutExpired(
  session: JsonObject,
) {
  const workspaceId =
    positiveInteger(
      session
        ?.metadata
        ?.workspace_id ??
      session
        ?.client_reference_id,
    );

  if (!workspaceId) {
    return {
      ignored: true,
      reason:
        'workspace_not_found',
    };
  }

  const { data: current, error } =
    await admin
      .from(
        'workspace_subscriptions',
      )
      .select(
        'workspace_id, stripe_subscription_id',
      )
      .eq(
        'workspace_id',
        workspaceId,
      )
      .maybeSingle();

  if (error) throw error;

  if (
    current &&
    !current
      .stripe_subscription_id
  ) {
    const { error: updateError } =
      await admin
        .from(
          'workspace_subscriptions',
        )
        .update({
          status:
            'pending_payment',

          last_payment_status:
            'checkout_expired',
        })
        .eq(
          'workspace_id',
          workspaceId,
        );

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
    invoiceSubscriptionId(
      invoice,
    );

  if (!subscriptionId) {
    return {
      ignored: true,
      reason:
        'subscription_missing',
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

  const result =
    await syncSubscription(
      subscription,
      invoice,
      paymentStatus,
    );

  if (
    !result.ignored &&
    [
      'failed',
      'action_required',
    ].includes(paymentStatus)
  ) {
    try {
      await sendBillingEmail({
        subscription,
        invoice,
        kind:
          paymentStatus ===
          'action_required'
            ? 'action_required'
            : 'failed',
        planCode:
          result.planCode,
      });
    } catch (error) {
      console.error(
        'No se pudo enviar el correo de fallo de pago:',
        error,
      );
    }
  }

  return result;
}

async function handleUpcomingInvoice(
  invoice: JsonObject,
) {
  const subscriptionId =
    invoiceSubscriptionId(
      invoice,
    );

  if (!subscriptionId) {
    return {
      ignored: true,
      reason:
        'subscription_missing',
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

  const result =
    await syncSubscription(
      subscription,
      invoice,
      'upcoming',
    );

  if (!result.ignored) {
    try {
      await sendBillingEmail({
        subscription,
        invoice,
        kind: 'upcoming',
        planCode:
          result.planCode,
      });
    } catch (error) {
      console.error(
        'No se pudo enviar el aviso de renovación:',
        error,
      );
    }
  }

  return result;
}

async function processEvent(
  event: Stripe.Event,
) {
  const object =
    event
      .data
      .object as unknown as JsonObject;

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

    case 'invoice.upcoming':
      return await handleUpcomingInvoice(
        object,
      );

    default:
      return {
        ignored: true,
        reason:
          'event_not_configured',
      };
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse(
      {
        error:
          'Método no permitido.',
      },
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

  const rawBody =
    await request.text();

  let event: Stripe.Event;

  try {
    event =
      await stripe
        .webhooks
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
      p_stripe_event_id:
        event.id,

      p_event_type:
        event.type,

      p_payload:
        event as unknown,
    },
  );

  if (claimError) {
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
        .from(
          'stripe_webhook_events',
        )
        .update({
          status:
            'processed',

          processed_at:
            new Date().toISOString(),

          processing_error:
            null,
        })
        .eq(
          'stripe_event_id',
          event.id,
        );

    if (completeError) {
      throw completeError;
    }

    return jsonResponse({
      received: true,
      eventId:
        event.id,
      eventType:
        event.type,
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
      .from(
        'stripe_webhook_events',
      )
      .update({
        status:
          'failed',

        processing_error:
          message.slice(
            0,
            3000,
          ),
      })
      .eq(
        'stripe_event_id',
        event.id,
      );

    return jsonResponse(
      {
        error:
          'No se pudo procesar el evento.',

        eventId:
          event.id,
      },
      500,
    );
  }
});
