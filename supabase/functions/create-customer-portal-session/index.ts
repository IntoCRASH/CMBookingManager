import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^22';

const jsonHeaders = {
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

  const origin = allowedOrigins.has(
    requestOrigin
  )
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
        ...jsonHeaders,
        ...getCorsHeaders(request),
      },
    },
  );
}

function isMissingStripeObject(
  error: unknown,
) {
  if (
    !error ||
    typeof error !== 'object'
  ) {
    return false;
  }

  const stripeError =
    error as {
      code?: string;
      type?: string;
      statusCode?: number;
    };

  return (
    stripeError.code ===
      'resource_missing' ||
    stripeError.statusCode === 404
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

    const siteUrl =
      Deno.env.get('SITE_URL');

    const supabaseUrl =
      Deno.env.get(
        'SUPABASE_URL',
      );

    const supabaseAnonKey =
      Deno.env.get(
        'SUPABASE_ANON_KEY',
      );

    const serviceRoleKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY',
      );

    if (
      !stripeSecretKey ||
      !siteUrl ||
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey
    ) {
      throw new Error(
        'Faltan secretos de configuración.',
      );
    }

    const authorization =
      request.headers.get(
        'Authorization',
      );

    if (!authorization) {
      return responseJson(
        request,
        {
          error:
            'Debes iniciar sesión para administrar la suscripción.',
        },
        401,
      );
    }

    const userClient =
      createClient(
        supabaseUrl,
        supabaseAnonKey,
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
    } =
      await userClient
        .auth
        .getUser();

    if (
      userError ||
      !user
    ) {
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
      Number(
        body?.workspaceId,
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

    const {
      data: workspace,
      error: workspaceError,
    } =
      await admin
        .from('workspaces')
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
            'Solo el Artista propietario puede administrar la facturación.',
        },
        403,
      );
    }

    const {
      data: subscription,
      error: subscriptionError,
    } =
      await admin
        .from(
          'workspace_subscriptions',
        )
        .select(`
          workspace_id,
          billing_mode,
          status,
          stripe_customer_id,
          stripe_subscription_id
        `)
        .eq(
          'workspace_id',
          workspaceId,
        )
        .maybeSingle();

    if (subscriptionError) {
      throw subscriptionError;
    }

    if (
      subscription
        ?.billing_mode ===
      'legacy'
    ) {
      return responseJson(
        request,
        {
          error:
            'Este proyecto conserva acceso gratuito y no utiliza el portal de facturación de Stripe.',
        },
        409,
      );
    }

    if (
      !subscription ||
      subscription
        .billing_mode !==
        'stripe' ||
      !subscription
        .stripe_customer_id
    ) {
      return responseJson(
        request,
        {
          error:
            'Este proyecto todavía no tiene una suscripción de Stripe para administrar.',
        },
        409,
      );
    }

    const stripe =
      new Stripe(
        stripeSecretKey,
      );

    try {
      const customer =
        await stripe
          .customers
          .retrieve(
            subscription
              .stripe_customer_id,
          );

      if (
        'deleted' in customer &&
        customer.deleted
      ) {
        return responseJson(
          request,
          {
            error:
              'El perfil de facturación fue eliminado en Stripe. Debes contratar nuevamente el plan.',
          },
          409,
        );
      }

      const cleanSiteUrl =
        siteUrl.replace(
          /\/+$/,
          '',
        );

      const portalSession =
        await stripe
          .billingPortal
          .sessions
          .create({
            customer:
              subscription
                .stripe_customer_id,

            return_url:
              `${cleanSiteUrl}/` +
              '?billing=return',
          });

      return responseJson(
        request,
        {
          portalUrl:
            portalSession.url,
        },
      );
    } catch (error) {
      if (
        isMissingStripeObject(
          error,
        )
      ) {
        console.error(
          'Customer de Stripe no disponible en el entorno actual:',
          subscription
            .stripe_customer_id,
        );

        return responseJson(
          request,
          {
            error:
              'La referencia de facturación pertenece a otro entorno de Stripe. Actualiza la cuenta para crear una suscripción válida en producción.',
          },
          409,
        );
      }

      throw error;
    }
  } catch (error) {
    console.error(
      'create-customer-portal-session:',
      error,
    );

    return responseJson(
      request,
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo abrir el portal de facturación.',
      },
      500,
    );
  }
});
