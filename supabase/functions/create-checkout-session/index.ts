import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^22';

type JsonObject = Record<string, any>;

type PlanCode =
  | 'essential'
  | 'professional';

type BillingCycle =
  | 'monthly'
  | 'annual';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',

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

const siteUrl =
  (
    Deno.env.get('SITE_URL') ||
    'https://mibooking.app'
  ).replace(/\/+$/, '');

const priceConfig = {
  essential: {
    monthly: {
      id:
        Deno.env.get(
          'STRIPE_PRICE_ESSENTIAL_MONTHLY',
        ) ||
        Deno.env.get(
          'STRIPE_PRICE_ESSENTIAL',
        ) ||
        '',

      lookupKey:
        'mibooking_essential_monthly',
    },

    annual: {
      id:
        Deno.env.get(
          'STRIPE_PRICE_ESSENTIAL_ANNUAL',
        ) ||
        '',

      lookupKey:
        'mibooking_essential_annual',
    },
  },

  professional: {
    monthly: {
      id:
        Deno.env.get(
          'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
        ) ||
        Deno.env.get(
          'STRIPE_PRICE_PROFESSIONAL',
        ) ||
        '',

      lookupKey:
        'mibooking_professional_monthly',
    },

    annual: {
      id:
        Deno.env.get(
          'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
        ) ||
        '',

      lookupKey:
        'mibooking_professional_annual',
    },
  },
} as const;

const stripe =
  new Stripe(stripeSecretKey);

const admin =
  createClient(
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
        ...corsHeaders,

        'Content-Type':
          'application/json',
      },
    },
  );
}

function positiveInteger(
  value: unknown,
): number | null {
  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

function normalizePlan(
  value: unknown,
): PlanCode | null {
  const plan =
    String(value || '')
      .trim()
      .toLowerCase();

  if (
    plan === 'essential' ||
    plan === 'esencial'
  ) {
    return 'essential';
  }

  if (
    plan === 'professional' ||
    plan === 'profesional'
  ) {
    return 'professional';
  }

  return null;
}

function normalizeBillingCycle(
  value: unknown,
): BillingCycle | null {
  const cycle =
    String(value || '')
      .trim()
      .toLowerCase();

  if (
    cycle === 'monthly' ||
    cycle === 'mensual' ||
    cycle === 'month'
  ) {
    return 'monthly';
  }

  if (
    cycle === 'annual' ||
    cycle === 'anual' ||
    cycle === 'yearly' ||
    cycle === 'year'
  ) {
    return 'annual';
  }

  return null;
}

function objectId(
  value: unknown,
): string {
  if (
    typeof value === 'string'
  ) {
    return value;
  }

  if (
    value &&
    typeof value === 'object' &&
    'id' in value &&
    typeof (value as JsonObject)
      .id === 'string'
  ) {
    return (
      value as JsonObject
    ).id;
  }

  return '';
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
      .startsWith('Bearer ')
  ) {
    return {
      user: null,
      error:
        'Debes iniciar sesión antes de suscribirte.',
    };
  }

  const accessToken =
    authorization
      .slice('Bearer '.length)
      .trim();

  if (!accessToken) {
    return {
      user: null,
      error:
        'La sesión no es válida.',
    };
  }

  const {
    data: {
      user,
    },

    error,
  } =
    await admin.auth.getUser(
      accessToken,
    );

  if (
    error ||
    !user
  ) {
    return {
      user: null,
      error:
        'La sesión no es válida o ha expirado.',
    };
  }

  return {
    user,
    error: null,
  };
}

async function resolvePriceId(
  plan: PlanCode,
  billingCycle:
    BillingCycle,
) {
  const config =
    priceConfig
      [plan]
      [billingCycle];

  if (config.id) {
    return config.id;
  }

  const result =
    await stripe
      .prices
      .list({
        active: true,

        lookup_keys: [
          config.lookupKey,
        ],

        limit: 1,
      });

  const price =
    result.data[0];

  if (!price) {
    throw new Error(
      `No existe un precio activo con el lookup key ${config.lookupKey}.`,
    );
  }

  if (
    price.type !==
    'recurring'
  ) {
    throw new Error(
      `El precio ${config.lookupKey} no es recurrente.`,
    );
  }

  return price.id;
}

async function findCustomer({
  storedCustomerId,
  userId,
  email,
  workspaceId,
}: {
  storedCustomerId:
    string;
  userId:
    string;
  email:
    string;
  workspaceId:
    number;
}) {
  if (storedCustomerId) {
    try {
      const customer =
        await stripe
          .customers
          .retrieve(
            storedCustomerId,
          );

      if (
        customer &&
        !('deleted' in customer)
      ) {
        return customer;
      }
    } catch (error) {
      console.error(
        'No se pudo reutilizar el Customer guardado:',
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
          String(workspaceId),
    );

  if (matched) {
    return await stripe
      .customers
      .update(
        matched.id,
        {
          metadata: {
            ...matched.metadata,

            supabase_user_id:
              userId,

            workspace_id:
              String(
                workspaceId,
              ),
          },
        },
      );
  }

  return await stripe
    .customers
    .create({
      email,

      metadata: {
        supabase_user_id:
          userId,

        workspace_id:
          String(
            workspaceId,
          ),
      },
    });
}

async function customerHasUsedTrial(
  customerId: string,
) {
  const subscriptions =
    await stripe
      .subscriptions
      .list({
        customer:
          customerId,

        status: 'all',

        limit: 100,
      });

  return subscriptions
    .data
    .some(
      (subscription) =>
        Boolean(
          subscription
            .trial_start,
        ) ||
        Boolean(
          subscription
            .trial_end,
        ) ||
        subscription
          .metadata
          ?.mibooking_trial_granted ===
          'true',
    );
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

    try {
      const auth =
        await authenticatedUser(
          request,
        );

      if (
        !auth.user ||
        auth.error
      ) {
        return jsonResponse(
          {
            error:
              auth.error,
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
          body.workspaceId ??
          body.workspace_id,
        );

      const planCode =
        normalizePlan(
          body.planCode ??
          body.plan ??
          body.selectedPlan,
        );

      const billingCycle =
        normalizeBillingCycle(
          body.billingCycle ??
          body.billing_cycle ??
          body
            .selectedBillingCycle,
        ) ||
        'monthly';

      if (!workspaceId) {
        return jsonResponse(
          {
            error:
              'El proyecto del Artista no es válido.',
          },
          400,
        );
      }

      if (!planCode) {
        return jsonResponse(
          {
            error:
              'Selecciona un plan válido.',
          },
          400,
        );
      }

      const {
        data: workspace,
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

      if (workspaceError) {
        throw workspaceError;
      }

      if (!workspace) {
        return jsonResponse(
          {
            error:
              'El proyecto no existe.',
          },
          404,
        );
      }

      if (
        workspace
          .owner_user_id !==
        auth.user.id
      ) {
        return jsonResponse(
          {
            error:
              'Solo el Artista propietario puede administrar la suscripción.',
          },
          403,
        );
      }

      const {
        data:
          existingSubscription,

        error:
          subscriptionError,
      } =
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

      if (subscriptionError) {
        throw subscriptionError;
      }

      if (
        existingSubscription
          ?.billing_mode ===
          'legacy' &&
        existingSubscription
          ?.status ===
          'active'
      ) {
        return jsonResponse(
          {
            error:
              'Este proyecto tiene acceso heredado y no necesita una suscripción de Stripe.',
            code:
              'legacy_subscription',
          },
          409,
        );
      }

      const currentStatus =
        String(
          existingSubscription
            ?.status ||
          '',
        );

      const blockedStatuses =
        new Set([
          'active',
          'trialing',
          'past_due',
          'unpaid',
          'paused',
          'incomplete',
        ]);

      if (
        existingSubscription
          ?.stripe_subscription_id &&
        blockedStatuses.has(
          currentStatus,
        )
      ) {
        return jsonResponse(
          {
            error:
              'Este proyecto ya tiene una suscripción activa o pendiente. Adminístrala desde la página de Suscripción.',
            code:
              'subscription_already_exists',
            status:
              currentStatus,
          },
          409,
        );
      }

      const email =
        String(
          auth.user.email ||
          '',
        ).trim();

      if (!email) {
        return jsonResponse(
          {
            error:
              'Tu cuenta no tiene un correo válido para Stripe.',
          },
          400,
        );
      }

      const customer =
        await findCustomer({
          storedCustomerId:
            String(
              existingSubscription
                ?.stripe_customer_id ||
              '',
            ),

          userId:
            auth.user.id,

          email,

          workspaceId,
        });

      const customerId =
        objectId(customer);

      if (!customerId) {
        throw new Error(
          'No se pudo preparar el cliente de Stripe.',
        );
      }

      const priceId =
        await resolvePriceId(
          planCode,
          billingCycle,
        );

      const hasUsedTrial =
        await customerHasUsedTrial(
          customerId,
        );

      const trialDays =
        hasUsedTrial
          ? 0
          : 3;

      const subscriptionData:
        JsonObject = {
        metadata: {
          workspace_id:
            String(
              workspaceId,
            ),

          owner_user_id:
            auth.user.id,

          plan_code:
            planCode,

          billing_cycle:
            billingCycle,

          mibooking_trial_granted:
            trialDays > 0
              ? 'true'
              : 'false',
        },
      };

      if (
        trialDays > 0
      ) {
        subscriptionData
          .trial_period_days =
          trialDays;

        subscriptionData
          .trial_settings = {
          end_behavior: {
            missing_payment_method:
              'cancel',
          },
        };
      }

      const checkoutSession =
        await stripe
          .checkout
          .sessions
          .create({
            mode:
              'subscription',

            customer:
              customerId,

            client_reference_id:
              String(
                workspaceId,
              ),

            line_items: [
              {
                price:
                  priceId,

                quantity:
                  1,
              },
            ],

            payment_method_collection:
              'always',

            allow_promotion_codes:
              billingCycle ===
              'monthly',

            billing_address_collection:
              'auto',

            locale:
              'es',

            success_url:
              `${siteUrl}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,

            cancel_url:
              `${siteUrl}/?billing=cancelled`,

            metadata: {
              workspace_id:
                String(
                  workspaceId,
                ),

              owner_user_id:
                auth.user.id,

              plan_code:
                planCode,

              billing_cycle:
                billingCycle,
            },

            subscription_data:
              subscriptionData,

            customer_update: {
              address:
                'auto',

              name:
                'auto',
            },
          });

      if (
        !checkoutSession
          .url
      ) {
        throw new Error(
          'Stripe no devolvió una página de pago.',
        );
      }

      const pendingPatch = {
        owner_user_id:
          auth.user.id,

        plan_code:
          planCode,

        billing_cycle:
          billingCycle,

        billing_mode:
          'stripe',

        status:
          'pending_payment',

        stripe_customer_id:
          customerId,

        stripe_subscription_id:
          null,

        stripe_price_id:
          priceId,

        trial_started_at:
          null,

        trial_ends_at:
          null,

        last_payment_status:
          'checkout_created',
      };

      let databaseError:
        unknown = null;

      if (
        existingSubscription
      ) {
        const {
          error,
        } =
          await admin
            .from(
              'workspace_subscriptions',
            )
            .update(
              pendingPatch,
            )
            .eq(
              'workspace_id',
              workspaceId,
            );

        databaseError =
          error;
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

              ...pendingPatch,
            });

        databaseError =
          error;
      }

      if (
        databaseError
      ) {
        try {
          await stripe
            .checkout
            .sessions
            .expire(
              checkoutSession.id,
            );
        } catch (
          expirationError
        ) {
          console.error(
            'No se pudo expirar el Checkout después del error de base de datos:',
            expirationError,
          );
        }

        throw databaseError;
      }

      return jsonResponse({
        ok: true,

        checkoutUrl:
          checkoutSession.url,

        checkoutSessionId:
          checkoutSession.id,

        workspaceId,

        planCode,

        billingCycle,

        trialDays,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo abrir Stripe Checkout.';

      console.error(
        'create-checkout-session:',
        error,
      );

      return jsonResponse(
        {
          error:
            message,
        },
        500,
      );
    }
  },
);
