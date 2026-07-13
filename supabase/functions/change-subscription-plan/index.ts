import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^22';

type JsonObject = Record<string, any>;

type PlanCode =
  | 'essential'
  | 'professional';

type BillingCycle =
  | 'monthly'
  | 'annual';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

function getCorsHeaders(request: Request) {
  const requestOrigin =
    request.headers.get('origin') || '';

  const siteUrl =
    Deno.env.get('SITE_URL') || '';

  const siteOrigin = siteUrl
    ? new URL(siteUrl).origin
    : '';

  const allowedOrigins = new Set([
    siteOrigin,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);

  const origin =
    allowedOrigins.has(requestOrigin)
      ? requestOrigin
      : siteOrigin ||
        requestOrigin ||
        '*';

  return {
    'Access-Control-Allow-Origin':
      origin,

    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',

    'Access-Control-Allow-Methods':
      'POST, OPTIONS',

    Vary: 'Origin',
  };
}

function responseJson(
  request: Request,
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...JSON_HEADERS,
        ...getCorsHeaders(request),
      },
    },
  );
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

function priceIdOf(item: JsonObject) {
  if (
    typeof item?.price === 'string'
  ) {
    return item.price;
  }

  return String(
    item?.price?.id || '',
  );
}

function unixSecondsAreFuture(
  value: unknown,
) {
  const seconds = Number(value);

  return (
    Number.isFinite(seconds) &&
    seconds > Math.floor(
      Date.now() / 1000
    )
  );
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers:
        getCorsHeaders(request),
    });
  }

  if (request.method !== 'POST') {
    return responseJson(
      request,
      {
        error:
          'Método no permitido.',
      },
      405,
    );
  }

  try {
    const stripeSecretKey =
      Deno.env.get(
        'STRIPE_SECRET_KEY',
      );

    const essentialMonthlyPriceId =
      Deno.env.get(
        'STRIPE_PRICE_ESSENTIAL_MONTHLY',
      ) ||
      Deno.env.get(
        'STRIPE_PRICE_ESSENTIAL',
      );

    const essentialAnnualPriceId =
      Deno.env.get(
        'STRIPE_PRICE_ESSENTIAL_ANNUAL',
      );

    const professionalMonthlyPriceId =
      Deno.env.get(
        'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
      ) ||
      Deno.env.get(
        'STRIPE_PRICE_PROFESSIONAL',
      );

    const professionalAnnualPriceId =
      Deno.env.get(
        'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
      );

    const supabaseUrl =
      Deno.env.get('SUPABASE_URL');

    const anonKey =
      Deno.env.get(
        'SUPABASE_ANON_KEY',
      );

    const serviceRoleKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY',
      );

    if (
      !stripeSecretKey ||
      !essentialMonthlyPriceId ||
      !essentialAnnualPriceId ||
      !professionalMonthlyPriceId ||
      !professionalAnnualPriceId ||
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      throw new Error(
        'Faltan secretos de configuración para los cuatro precios de Stripe.',
      );
    }

    const priceOptions = [
      {
        planCode:
          'essential' as const,

        billingCycle:
          'monthly' as const,

        priceId:
          essentialMonthlyPriceId,
      },
      {
        planCode:
          'essential' as const,

        billingCycle:
          'annual' as const,

        priceId:
          essentialAnnualPriceId,
      },
      {
        planCode:
          'professional' as const,

        billingCycle:
          'monthly' as const,

        priceId:
          professionalMonthlyPriceId,
      },
      {
        planCode:
          'professional' as const,

        billingCycle:
          'annual' as const,

        priceId:
          professionalAnnualPriceId,
      },
    ];

    const authorization =
      request.headers.get(
        'Authorization',
      );

    if (!authorization) {
      return responseJson(
        request,
        {
          error:
            'Debes iniciar sesión.',
        },
        401,
      );
    }

    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization:
              authorization,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await userClient
      .auth.getUser();

    if (userError || !user) {
      return responseJson(
        request,
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
        .catch(() => ({}));

    const workspaceId =
      Number(body?.workspaceId);

    const targetPlan =
      normalizePlan(
        body?.targetPlan,
      );

    const targetBillingCycle =
      normalizeBillingCycle(
        body
          ?.targetBillingCycle ??
        body?.billingCycle,
      );

    if (
      !Number.isInteger(
        workspaceId,
      ) ||
      workspaceId <= 0
    ) {
      return responseJson(
        request,
        {
          error:
            'El proyecto del Artista no es válido.',
        },
        400,
      );
    }

    if (!targetPlan) {
      return responseJson(
        request,
        {
          error:
            'El plan seleccionado no es válido.',
        },
        400,
      );
    }

    if (!targetBillingCycle) {
      return responseJson(
        request,
        {
          error:
            'La modalidad de facturación no es válida.',
        },
        400,
      );
    }

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

    const {
      data: workspace,
      error: workspaceError,
    } = await admin
      .from('workspaces')
      .select(
        'id, owner_user_id, nombre',
      )
      .eq('id', workspaceId)
      .maybeSingle();

    if (
      workspaceError ||
      !workspace
    ) {
      return responseJson(
        request,
        {
          error:
            'No se encontró el proyecto del Artista.',
        },
        404,
      );
    }

    if (
      workspace.owner_user_id !==
      user.id
    ) {
      return responseJson(
        request,
        {
          error:
            'Solo el Artista propietario puede cambiar la suscripción.',
        },
        403,
      );
    }

    const {
      data: localSubscription,
      error: localSubscriptionError,
    } = await admin
      .from(
        'workspace_subscriptions',
      )
      .select(`
        workspace_id,
        plan_code,
        billing_cycle,
        billing_mode,
        status,
        stripe_customer_id,
        stripe_subscription_id,
        cancel_at_period_end,
        discount_percent,
        discount_ends_at
      `)
      .eq(
        'workspace_id',
        workspaceId,
      )
      .maybeSingle();

    if (localSubscriptionError) {
      throw localSubscriptionError;
    }

    if (
      !localSubscription ||
      localSubscription
        .billing_mode !== 'stripe' ||
      !localSubscription
        .stripe_subscription_id
    ) {
      return responseJson(
        request,
        {
          error:
            'Este proyecto no tiene una suscripción de Stripe que pueda cambiarse.',
        },
        409,
      );
    }

    if (
      localSubscription
        .cancel_at_period_end
    ) {
      return responseJson(
        request,
        {
          error:
            'La renovación está cancelada. Reactiva primero la suscripción desde Administrar suscripción.',
        },
        409,
      );
    }

    if (
      ![
        'active',
        'trialing',
      ].includes(
        String(
          localSubscription
            .status || '',
        ),
      )
    ) {
      return responseJson(
        request,
        {
          error:
            'Resuelve primero el estado pendiente de tu suscripción desde Administrar suscripción.',
        },
        409,
      );
    }

    if (
      targetPlan === 'essential'
    ) {
      const {
        data: managerRows,
        error: managerError,
      } = await admin
        .from('workspace_members')
        .select('id, status')
        .eq(
          'workspace_id',
          workspaceId,
        )
        .eq('role', 'manager')
        .in(
          'status',
          [
            'active',
            'suspended',
          ],
        );

      if (managerError) {
        throw managerError;
      }

      const {
        data: invitationRows,
        error: invitationError,
      } = await admin
        .from(
          'workspace_invitations',
        )
        .select(
          'id, status, expires_at',
        )
        .eq(
          'workspace_id',
          workspaceId,
        )
        .eq('status', 'pending');

      if (invitationError) {
        throw invitationError;
      }

      const now = Date.now();

      const pendingCount =
        (
          invitationRows || []
        ).filter((invitation) => {
          if (
            !invitation.expires_at
          ) {
            return true;
          }

          return (
            new Date(
              invitation.expires_at,
            ).getTime() > now
          );
        }).length;

      const managerCount =
        (
          managerRows || []
        ).length;

      if (
        managerCount > 1
      ) {
        return responseJson(
          request,
          {
            error:
              `No puedes cambiar al plan Esencial porque tienes ${managerCount} Gestores vinculados. Debes conservar uno solo.`,
          },
          409,
        );
      }

      if (
        managerCount +
          pendingCount >
        1
      ) {
        return responseJson(
          request,
          {
            error:
              'No puedes cambiar al plan Esencial mientras tengas más de un acceso entre Gestores e invitaciones pendientes. Cancela las invitaciones sobrantes.',
          },
          409,
        );
      }
    }

    const stripe =
      new Stripe(
        stripeSecretKey,
      );

    const stripeSubscription =
      await stripe.subscriptions
        .retrieve(
          localSubscription
            .stripe_subscription_id,
          {
            expand: [
              'discounts',
            ],
          },
        ) as unknown as JsonObject;

    if (
      stripeSubscription
        ?.cancel_at_period_end
    ) {
      return responseJson(
        request,
        {
          error:
            'La renovación está cancelada en Stripe. Reactívala antes de cambiar la suscripción.',
        },
        409,
      );
    }

    const currentItem =
      (
        stripeSubscription
          ?.items?.data || []
      ).find(
        (item: JsonObject) =>
          priceOptions.some(
            (option) =>
              option.priceId ===
              priceIdOf(item),
          ),
      );

    if (!currentItem?.id) {
      throw new Error(
        'No se encontró el precio actual de MiBooking dentro de la suscripción.',
      );
    }

    const currentPriceId =
      priceIdOf(currentItem);

    const currentOption =
      priceOptions.find(
        (option) =>
          option.priceId ===
          currentPriceId,
      );

    if (!currentOption) {
      throw new Error(
        'El precio actual de Stripe no corresponde a una tarifa configurada de MiBooking.',
      );
    }

    if (
      currentOption.planCode ===
        targetPlan &&
      currentOption.billingCycle ===
        targetBillingCycle
    ) {
      return responseJson(
        request,
        {
          ok: true,
          unchanged: true,
          planCode:
            targetPlan,
          billingCycle:
            targetBillingCycle,
          message:
            'Esa suscripción ya está activa.',
        },
      );
    }

    const activeDiscounts =
      Array.isArray(
        stripeSubscription
          ?.discounts,
      )
        ? stripeSubscription
            .discounts
            .filter(Boolean)
        : [];

    if (
      targetBillingCycle ===
        'annual' &&
      activeDiscounts.length > 0
    ) {
      return responseJson(
        request,
        {
          error:
            'Tu promoción actual corresponde a la modalidad mensual. Podrás cambiar a facturación anual cuando termine el beneficio promocional.',
        },
        409,
      );
    }

    const targetOption =
      priceOptions.find(
        (option) =>
          option.planCode ===
            targetPlan &&
          option.billingCycle ===
            targetBillingCycle,
      );

    if (!targetOption) {
      throw new Error(
        'No se encontró la tarifa solicitada.',
      );
    }

    const cycleChanged =
      currentOption
        .billingCycle !==
      targetBillingCycle;

    const isUpgrade =
      currentOption.planCode ===
        'essential' &&
      targetPlan ===
        'professional';

    const trialing =
      stripeSubscription
        ?.status ===
        'trialing' &&
      unixSecondsAreFuture(
        stripeSubscription
          ?.trial_end,
      );

    const updateParams:
      Stripe.SubscriptionUpdateParams =
      {
        items: [
          {
            id:
              currentItem.id,

            price:
              targetOption
                .priceId,
          },
        ],

        payment_behavior:
          'pending_if_incomplete',
      };

    if (trialing) {
      updateParams
        .proration_behavior =
        'none';

      updateParams.trial_end =
        Number(
          stripeSubscription
            .trial_end,
        );
    } else if (cycleChanged) {
      updateParams
        .billing_cycle_anchor =
        'now';

      updateParams
        .proration_behavior =
        'always_invoice';
    } else {
      updateParams
        .proration_behavior =
        isUpgrade
          ? 'always_invoice'
          : 'create_prorations';
    }

    const updated =
      await stripe.subscriptions
        .update(
          stripeSubscription.id,
          updateParams,
        ) as unknown as JsonObject;

    const pendingUpdate =
      Boolean(
        updated?.pending_update,
      );

    if (!pendingUpdate) {
      try {
        await stripe
          .subscriptions
          .update(
            stripeSubscription.id,
            {
              metadata: {
                ...(
                  stripeSubscription
                    .metadata || {}
                ),

                workspace_id:
                  String(
                    workspaceId,
                  ),

                owner_user_id:
                  user.id,

                plan_code:
                  targetPlan,

                billing_cycle:
                  targetBillingCycle,

                source:
                  'mibooking_subscription_change',
              },
            },
          );
      } catch (metadataError) {
        console.error(
          'El cambio se aplicó, pero no se pudo actualizar metadata:',
          metadataError,
        );
      }
    }

    return responseJson(
      request,
      {
        ok: true,
        unchanged: false,

        previousPlan:
          currentOption
            .planCode,

        previousBillingCycle:
          currentOption
            .billingCycle,

        requestedPlan:
          targetPlan,

        requestedBillingCycle:
          targetBillingCycle,

        stripeStatus:
          String(
            updated?.status || '',
          ),

        preservedTrial:
          trialing,

        pendingUpdate,

        message:
          pendingUpdate
            ? 'Stripe dejó el cambio pendiente hasta completar el cobro.'
            : trialing
              ? 'El cambio fue aplicado sin alterar la fecha final de la prueba.'
              : 'El cambio de suscripción fue enviado correctamente a Stripe.',
      },
    );
  } catch (error) {
    console.error(
      'change-subscription-plan:',
      error,
    );

    return responseJson(
      request,
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo cambiar la suscripción.',
      },
      500,
    );
  }
});
