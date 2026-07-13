import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^22';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

function getCorsHeaders(request: Request) {
  const requestOrigin = request.headers.get('origin') || '';
  const siteUrl = Deno.env.get('SITE_URL') || '';
  const siteOrigin = siteUrl
    ? new URL(siteUrl).origin
    : '';

  const allowedOrigins = new Set([
    siteOrigin,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);

  const origin = allowedOrigins.has(requestOrigin)
    ? requestOrigin
    : siteOrigin || requestOrigin || '*';

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function responseJson(
  request: Request,
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...jsonHeaders,
      ...getCorsHeaders(request),
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: getCorsHeaders(request),
    });
  }

  if (request.method !== 'POST') {
    return responseJson(
      request,
      { error: 'Método no permitido.' },
      405,
    );
  }

  try {
    const stripeSecretKey =
      Deno.env.get('STRIPE_SECRET_KEY');

    const essentialPriceId =
      Deno.env.get('STRIPE_PRICE_ESSENTIAL');

    const professionalPriceId =
      Deno.env.get('STRIPE_PRICE_PROFESSIONAL');

    const siteUrl =
      Deno.env.get('SITE_URL');

    const supabaseUrl =
      Deno.env.get('SUPABASE_URL');

    const supabaseAnonKey =
      Deno.env.get('SUPABASE_ANON_KEY');

    const supabaseServiceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (
      !stripeSecretKey ||
      !essentialPriceId ||
      !professionalPriceId ||
      !siteUrl ||
      !supabaseUrl ||
      !supabaseAnonKey ||
      !supabaseServiceRoleKey
    ) {
      throw new Error(
        'Faltan secretos de configuración en la Edge Function.',
      );
    }

    const authorization =
      request.headers.get('Authorization');

    if (!authorization) {
      return responseJson(
        request,
        { error: 'Debes iniciar sesión para elegir un plan.' },
        401,
      );
    }

    const userClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authorization,
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
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return responseJson(
        request,
        { error: 'La sesión no es válida o ha expirado.' },
        401,
      );
    }

    const body = await request.json().catch(() => ({}));

    const workspaceId = Number(body?.workspaceId);
    const planCode = String(body?.planCode || '')
      .trim()
      .toLowerCase();

    if (
      !Number.isInteger(workspaceId) ||
      workspaceId <= 0
    ) {
      return responseJson(
        request,
        { error: 'El workspace seleccionado no es válido.' },
        400,
      );
    }

    if (
      !['essential', 'professional'].includes(planCode)
    ) {
      return responseJson(
        request,
        { error: 'El plan seleccionado no es válido.' },
        400,
      );
    }

    const adminClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
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
    } = await adminClient
      .from('workspaces')
      .select('id, owner_user_id, nombre')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return responseJson(
        request,
        { error: 'No se encontró el proyecto del Artista.' },
        404,
      );
    }

    if (workspace.owner_user_id !== user.id) {
      return responseJson(
        request,
        {
          error:
            'Solo el Artista propietario puede contratar o cambiar el plan.',
        },
        403,
      );
    }

    const {
      data: currentSubscription,
      error: subscriptionError,
    } = await adminClient
      .from('workspace_subscriptions')
      .select(`
        workspace_id,
        status,
        stripe_customer_id,
        stripe_subscription_id
      `)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (subscriptionError) {
      throw subscriptionError;
    }

    const blockingStatuses = new Set([
      'trialing',
      'active',
      'past_due',
      'unpaid',
      'paused',
    ]);

    if (
      currentSubscription?.stripe_subscription_id &&
      blockingStatuses.has(currentSubscription.status)
    ) {
      return responseJson(
        request,
        {
          error:
            'Este Artista ya tiene una suscripción. Debe administrarla desde su Perfil.',
        },
        409,
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    let stripeCustomerId =
      currentSubscription?.stripe_customer_id || '';

    if (!stripeCustomerId) {
      if (!user.email) {
        return responseJson(
          request,
          {
            error:
              'La cuenta no tiene un correo válido para facturación.',
          },
          400,
        );
      }

      const customer = await stripe.customers.create({
        email: user.email,
        name:
          workspace.nombre ||
          String(
            user.user_metadata?.full_name ||
            user.user_metadata?.nombre ||
            '',
          ).trim() ||
          undefined,

        metadata: {
          workspace_id: String(workspaceId),
          owner_user_id: user.id,
          source: 'mibooking',
        },
      });

      stripeCustomerId = customer.id;

      if (currentSubscription) {
        const { error: updateCustomerError } =
          await adminClient
            .from('workspace_subscriptions')
            .update({
              stripe_customer_id: stripeCustomerId,
            })
            .eq('workspace_id', workspaceId);

        if (updateCustomerError) {
          throw updateCustomerError;
        }
      } else {
        const { error: insertCustomerError } =
          await adminClient
            .from('workspace_subscriptions')
            .insert({
              workspace_id: workspaceId,
              owner_user_id: user.id,
              stripe_customer_id: stripeCustomerId,
              billing_mode: 'stripe',
              status: 'pending_payment',
            });

        if (insertCustomerError) {
          throw insertCustomerError;
        }
      }
    }

    const priceId =
      planCode === 'professional'
        ? professionalPriceId
        : essentialPriceId;

    const cleanSiteUrl =
      siteUrl.replace(/\/+$/, '');

    const session =
      await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: stripeCustomerId,

        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],

        allow_promotion_codes: true,
        locale: 'auto',

        client_reference_id:
          String(workspaceId),

        metadata: {
          workspace_id: String(workspaceId),
          owner_user_id: user.id,
          plan_code: planCode,
        },

        subscription_data: {
          metadata: {
            workspace_id: String(workspaceId),
            owner_user_id: user.id,
            plan_code: planCode,
          },
        },

        success_url:
          `${cleanSiteUrl}/?checkout=success` +
          '&session_id={CHECKOUT_SESSION_ID}',

        cancel_url:
          `${cleanSiteUrl}/?checkout=canceled`,
      });

    if (!session.url) {
      throw new Error(
        'Stripe no devolvió una dirección para completar el pago.',
      );
    }

    return responseJson(request, {
      checkoutUrl: session.url,
      sessionId: session.id,
      planCode,
    });
  } catch (error) {
    console.error('create-checkout-session:', error);

    return responseJson(
      request,
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo iniciar el proceso de pago.',
      },
      500,
    );
  }
});
