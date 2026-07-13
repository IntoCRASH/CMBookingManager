import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^22';

type JsonObject =
  Record<string, any>;

type PlanCode =
  | 'essential'
  | 'professional';

type BillingCycle =
  | 'monthly'
  | 'annual';

const corsHeaders = {
  'Access-Control-Allow-Origin':
    '*',

  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',

  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
};

const stripeSecretKey =
  Deno.env.get(
    'STRIPE_SECRET_KEY',
  ) || '';

const supabaseUrl =
  Deno.env.get(
    'SUPABASE_URL',
  ) || '';

const serviceRoleKey =
  Deno.env.get(
    'SUPABASE_SERVICE_ROLE_KEY',
  ) || '';

const priceOptions = [
  {
    planCode:
      'essential' as const,

    billingCycle:
      'monthly' as const,

    priceId:
      Deno.env.get(
        'STRIPE_PRICE_ESSENTIAL_MONTHLY',
      ) ||
      Deno.env.get(
        'STRIPE_PRICE_ESSENTIAL',
      ) ||
      '',
  },

  {
    planCode:
      'essential' as const,

    billingCycle:
      'annual' as const,

    priceId:
      Deno.env.get(
        'STRIPE_PRICE_ESSENTIAL_ANNUAL',
      ) || '',
  },

  {
    planCode:
      'professional' as const,

    billingCycle:
      'monthly' as const,

    priceId:
      Deno.env.get(
        'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
      ) ||
      Deno.env.get(
        'STRIPE_PRICE_PROFESSIONAL',
      ) ||
      '',
  },

  {
    planCode:
      'professional' as const,

    billingCycle:
      'annual' as const,

    priceId:
      Deno.env.get(
        'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
      ) || '',
  },
];

const stripe =
  new Stripe(
    stripeSecretKey,
  );

const admin =
  createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,
      },
    },
  );

function jsonResponse(
  body:
    Record<string, unknown>,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,

      headers: {
        ...corsHeaders,

        'Content-Type':
          'application/json',
      },
    },
  );
}

function positiveInteger(
  value: unknown,
) {
  const parsed =
    Number(value);

  return (
    Number.isInteger(parsed) &&
    parsed > 0
  )
    ? parsed
    : null;
}

function objectId(
  value: unknown,
) {
  if (
    typeof value === 'string'
  ) {
    return value;
  }

  if (
    value &&
    typeof value ===
      'object' &&
    'id' in value
  ) {
    return String(
      (value as JsonObject)
        .id || '',
    );
  }

  return '';
}

function unixToIso(
  value: unknown,
) {
  const seconds =
    Number(value);

  if (
    !Number.isFinite(
      seconds,
    ) ||
    seconds <= 0
  ) {
    return null;
  }

  return new Date(
    seconds * 1000,
  ).toISOString();
}

function subscriptionPriceId(
  subscription:
    JsonObject,
) {
  return objectId(
    subscription
      ?.items
      ?.data
      ?.[0]
      ?.price,
  );
}

function subscriptionPeriod(
  subscription:
    JsonObject,
) {
  const item =
    subscription
      ?.items
      ?.data
      ?.[0] || {};

  return {
    start:
      unixToIso(
        item
          .current_period_start ??
        subscription
          .current_period_start,
      ),

    end:
      unixToIso(
        item
          .current_period_end ??
        subscription
          .current_period_end,
      ),
  };
}

function allowedStatus(
  value: unknown,
) {
  const status =
    String(value || '');

  const allowed =
    new Set([
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'unpaid',
      'paused',
      'canceled',
    ]);

  return allowed.has(
    status,
  )
    ? status
    : 'pending_payment';
}

function billingFromPrice(
  priceId: string,
): {
  planCode:
    PlanCode;

  billingCycle:
    BillingCycle;
} | null {
  const option =
    priceOptions.find(
      (item) =>
        item.priceId &&
        item.priceId ===
          priceId,
    );

  return option
    ? {
        planCode:
          option.planCode,

        billingCycle:
          option.billingCycle,
      }
    : null;
}

async function authenticatedUser(
  request: Request,
) {
  const authorization =
    request.headers.get(
      'Authorization',
    );

  if (
    !authorization ||
    !authorization
      .startsWith(
        'Bearer ',
      )
  ) {
    return null;
  }

  const token =
    authorization
      .slice(
        'Bearer '.length,
      )
      .trim();

  if (!token) {
    return null;
  }

  const {
    data: {
      user,
    },

    error,
  } =
    await admin
      .auth
      .getUser(token);

  if (
    error ||
    !user
  ) {
    return null;
  }

  return user;
}

async function findCustomerId({
  storedCustomerId,
  email,
  userId,
  workspaceId,
}: {
  storedCustomerId:
    string;

  email:
    string;

  userId:
    string;

  workspaceId:
    number;
}) {
  if (
    storedCustomerId
  ) {
    try {
      const customer =
        await stripe
          .customers
          .retrieve(
            storedCustomerId,
          );

      if (
        customer &&
        !(
          'deleted' in
          customer
        )
      ) {
        return customer.id;
      }
    } catch (error) {
      console.error(
        'Customer guardado no disponible:',
        error,
      );
    }
  }

  const customers =
    await stripe
      .customers
      .list({
        email,
        limit: 100,
      });

  const matched =
    customers.data.find(
      (customer) =>
        customer
          .metadata
          ?.supabase_user_id ===
          userId,
    ) ||
    customers.data.find(
      (customer) =>
        customer
          .metadata
          ?.workspace_id ===
          String(
            workspaceId,
          ),
    );

  return (
    matched?.id || ''
  );
}

async function subscriptionFromSession({
  sessionId,
  workspaceId,
}: {
  sessionId:
    string;

  workspaceId:
    number;
}) {
  if (!sessionId) {
    return null;
  }

  const session =
    await stripe
      .checkout
      .sessions
      .retrieve(
        sessionId,
        {
          expand: [
            'subscription',
          ],
        },
      ) as unknown as
        JsonObject;

  const sessionWorkspaceId =
    positiveInteger(
      session
        ?.metadata
        ?.workspace_id ??
      session
        ?.client_reference_id,
    );

  if (
    sessionWorkspaceId !==
    workspaceId
  ) {
    throw new Error(
      'La sesión de Stripe no pertenece a este proyecto.',
    );
  }

  const subscription =
    session
      ?.subscription;

  if (
    subscription &&
    typeof subscription ===
      'object'
  ) {
    return subscription as
      JsonObject;
  }

  const subscriptionId =
    objectId(
      subscription,
    );

  if (!subscriptionId) {
    return null;
  }

  return await stripe
    .subscriptions
    .retrieve(
      subscriptionId,
    ) as unknown as
      JsonObject;
}

async function findRecoverableSubscription(
  customerId: string,
) {
  if (!customerId) {
    return null;
  }

  const subscriptions =
    await stripe
      .subscriptions
      .list({
        customer:
          customerId,

        status:
          'all',

        limit:
          100,
      });

  const live =
    subscriptions
      .data
      .filter(
        (subscription) =>
          [
            'trialing',
            'active',
            'past_due',
            'unpaid',
            'paused',
          ].includes(
            subscription.status,
          ),
      );

  if (
    live.length > 1
  ) {
    throw new Error(
      'Stripe encontró más de una suscripción activa para esta cuenta. Debes cancelar la duplicada antes de continuar.',
    );
  }

  if (
    live.length === 1
  ) {
    return live[0] as
      unknown as
      JsonObject;
  }

  const incomplete =
    subscriptions
      .data
      .filter(
        (subscription) =>
          subscription
            .status ===
          'incomplete',
      )
      .sort(
        (a, b) =>
          Number(
            b.created,
          ) -
          Number(
            a.created,
          ),
      )[0];

  return incomplete
    ? incomplete as
        unknown as
        JsonObject
    : null;
}

async function persistSubscription({
  workspaceId,
  ownerUserId,
  subscription,
}: {
  workspaceId:
    number;

  ownerUserId:
    string;

  subscription:
    JsonObject;
}) {
  const subscriptionId =
    objectId(
      subscription?.id,
    );

  const customerId =
    objectId(
      subscription
        ?.customer,
    );

  const priceId =
    subscriptionPriceId(
      subscription,
    );

  const billing =
    billingFromPrice(
      priceId,
    );

  if (!billing) {
    throw new Error(
      `El precio ${priceId || '(vacío)'} no corresponde a una tarifa configurada de MiBooking.`,
    );
  }

  const status =
    allowedStatus(
      subscription
        ?.status,
    );

  const period =
    subscriptionPeriod(
      subscription,
    );

  const patch = {
    owner_user_id:
      ownerUserId,

    plan_code:
      billing.planCode,

    billing_cycle:
      billing.billingCycle,

    billing_mode:
      'stripe',

    status,

    stripe_customer_id:
      customerId || null,

    stripe_subscription_id:
      subscriptionId ||
      null,

    stripe_price_id:
      priceId || null,

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

    trial_started_at:
      unixToIso(
        subscription
          ?.trial_start,
      ),

    trial_ends_at:
      unixToIso(
        subscription
          ?.trial_end,
      ),

    payment_grace_ends_at:
      null,

    last_payment_failed_at:
      null,

    last_payment_status:
      'recovered_from_stripe',
  };

  const {
    data:
      existing,
    error:
      existingError,
  } =
    await admin
      .from(
        'workspace_subscriptions',
      )
      .select(
        'workspace_id',
      )
      .eq(
        'workspace_id',
        workspaceId,
      )
      .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    const {
      error,
    } =
      await admin
        .from(
          'workspace_subscriptions',
        )
        .update(
          patch,
        )
        .eq(
          'workspace_id',
          workspaceId,
        );

    if (error) {
      throw error;
    }
  } else {
    const {
      error,
    } =
      await admin
        .from(
          'workspace_subscriptions',
        )
        .insert({
          workspace_id:
            workspaceId,

          ...patch,
        });

    if (error) {
      throw error;
    }
  }

  return {
    workspace_id:
      workspaceId,

    ...patch,
  };
}

Deno.serve(
  async (
    request: Request,
  ) => {
    if (
      request.method ===
      'OPTIONS'
    ) {
      return new Response(
        'ok',
        {
          headers:
            corsHeaders,
        },
      );
    }

    if (
      request.method !==
      'POST'
    ) {
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
      !supabaseUrl ||
      !serviceRoleKey ||
      priceOptions.some(
        (item) =>
          !item.priceId,
      )
    ) {
      return jsonResponse(
        {
          error:
            'La función no está configurada con los cuatro precios de Stripe.',
        },
        500,
      );
    }

    try {
      const user =
        await authenticatedUser(
          request,
        );

      if (!user) {
        return jsonResponse(
          {
            error:
              'La sesión no es válida o ha expirado.',
          },
          401,
        );
      }

      const body =
        await request
          .json()
          .catch(
            () => ({}),
          ) as JsonObject;

      const workspaceId =
        positiveInteger(
          body
            ?.workspaceId ??
          body
            ?.workspace_id,
        );

      const sessionId =
        String(
          body
            ?.checkoutSessionId ??
          body
            ?.sessionId ??
          '',
        ).trim();

      if (!workspaceId) {
        return jsonResponse(
          {
            error:
              'El proyecto del Artista no es válido.',
          },
          400,
        );
      }

      const {
        data:
          workspace,
        error:
          workspaceError,
      } =
        await admin
          .from(
            'workspaces',
          )
          .select(
            'id, owner_user_id',
          )
          .eq(
            'id',
            workspaceId,
          )
          .maybeSingle();

      if (
        workspaceError ||
        !workspace
      ) {
        return jsonResponse(
          {
            error:
              'No se encontró el proyecto del Artista.',
          },
          404,
        );
      }

      if (
        workspace
          .owner_user_id !==
        user.id
      ) {
        return jsonResponse(
          {
            error:
              'Solo el Artista propietario puede recuperar esta suscripción.',
          },
          403,
        );
      }

      const {
        data:
          localSubscription,
        error:
          localError,
      } =
        await admin
          .from(
            'workspace_subscriptions',
          )
          .select(
            'stripe_customer_id',
          )
          .eq(
            'workspace_id',
            workspaceId,
          )
          .maybeSingle();

      if (localError) {
        throw localError;
      }

      let subscription =
        await subscriptionFromSession({
          sessionId,
          workspaceId,
        });

      if (!subscription) {
        const customerId =
          await findCustomerId({
            storedCustomerId:
              String(
                localSubscription
                  ?.stripe_customer_id ||
                '',
              ),

            email:
              String(
                user.email || '',
              ),

            userId:
              user.id,

            workspaceId,
          });

        subscription =
          await findRecoverableSubscription(
            customerId,
          );
      }

      if (!subscription) {
        return jsonResponse(
          {
            error:
              'Stripe todavía no tiene una suscripción recuperable para esta cuenta.',
            code:
              'subscription_not_found',
          },
          404,
        );
      }

      const saved =
        await persistSubscription({
          workspaceId,

          ownerUserId:
            user.id,

          subscription,
        });

      return jsonResponse({
        ok:
          true,

        recovered:
          true,

        subscription:
          saved,
      });
    } catch (error) {
      console.error(
        'sync-checkout-subscription:',
        error,
      );

      return jsonResponse(
        {
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo recuperar la suscripción desde Stripe.',
        },
        500,
      );
    }
  },
);
