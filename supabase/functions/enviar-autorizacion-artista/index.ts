import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse(
      { ok: false, error: 'Método no permitido.' },
      405,
    );
  }

  try {
    const supabaseUrl =
      Deno.env.get('SUPABASE_URL') || '';

    const publishableKey =
      Deno.env.get('SUPABASE_ANON_KEY') ||
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ||
      '';

    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const resendApiKey =
      Deno.env.get('RESEND_API_KEY') || '';

    const resendFrom =
      Deno.env.get('RESEND_FROM_EMAIL') || '';

    const appPublicUrl =
      Deno.env.get('APP_PUBLIC_URL') || '';

    if (
      !supabaseUrl ||
      !publishableKey ||
      !serviceRoleKey
    ) {
      throw new Error(
        'Faltan variables internas de Supabase.'
      );
    }

    if (
      !resendApiKey ||
      !resendFrom ||
      !appPublicUrl
    ) {
      throw new Error(
        'Faltan RESEND_API_KEY, RESEND_FROM_EMAIL o APP_PUBLIC_URL.'
      );
    }

    const authHeader =
      request.headers.get('Authorization');

    if (!authHeader) {
      return jsonResponse(
        { ok: false, error: 'Sesión requerida.' },
        401,
      );
    }

    const userClient = createClient(
      supabaseUrl,
      publishableKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        {
          ok: false,
          error: 'La sesión no es válida.',
        },
        401,
      );
    }

    const body = await request.json();
    const artistaId = Number(body?.artista_id);

    if (
      !Number.isInteger(artistaId) ||
      artistaId <= 0
    ) {
      return jsonResponse(
        {
          ok: false,
          error: 'Artista inválido.',
        },
        400,
      );
    }

    const serviceClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const { data: agente } = await serviceClient
      .from('profiles')
      .select('nombre')
      .eq('id', user.id)
      .maybeSingle();

    const {
      data: solicitud,
      error: solicitudError,
    } = await serviceClient.rpc(
      'generar_autorizacion_artista_para_envio',
      {
        p_artista_id: artistaId,
        p_user_id: user.id,
      },
    );

    if (solicitudError) {
      throw new Error(solicitudError.message);
    }

    const token = String(solicitud?.token || '');
    const artistaEmail = String(
      solicitud?.artista_email || ''
    );
    const artistaNombre = String(
      solicitud?.artista_nombre || 'Artista'
    );
    const comision = Number(
      solicitud?.comision_porcentaje || 0
    );
    const agenteNombre = String(
      agente?.nombre || user.email || 'Un agente'
    );

    if (!token || !artistaEmail) {
      throw new Error(
        'No se pudo preparar la autorización.'
      );
    }

    const authorizationUrl = new URL(appPublicUrl);
    authorizationUrl.search = '';
    authorizationUrl.hash = '';
    authorizationUrl.searchParams.set(
      'autorizar_artista',
      token,
    );

    const subject =
      `${agenteNombre} solicita tu autorización ` +
      `de comisión en MiBooking`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#111827;line-height:1.6">
        <h1 style="font-size:26px;margin-bottom:8px">Autorización de comisión</h1>

        <p>Hola <strong>${escapeHtml(artistaNombre)}</strong>,</p>

        <p>
          <strong>${escapeHtml(agenteNombre)}</strong> solicita tu autorización
          para gestionar tus contrataciones mediante MiBooking con una comisión de
          <strong>${escapeHtml(comision)}%</strong>.
        </p>

        <p>
          Revisa la solicitud y decide personalmente si deseas autorizarla o rechazarla.
        </p>

        <p style="margin:28px 0">
          <a
            href="${escapeHtml(authorizationUrl.toString())}"
            style="display:inline-block;padding:14px 22px;border-radius:12px;background:#635bff;color:white;text-decoration:none;font-weight:700"
          >
            Revisar solicitud
          </a>
        </p>

        <p style="font-size:13px;color:#667085">
          Este enlace es personal, de un solo uso y vence en siete días.
          No lo reenvíes a otra persona.
        </p>

        <p style="font-size:13px;color:#667085">
          Si no reconoces esta solicitud, puedes abrir el enlace y rechazarla.
        </p>
      </div>
    `;

    const text =
      `Hola ${artistaNombre},\n\n` +
      `${agenteNombre} solicita tu autorización para gestionar ` +
      `tus contrataciones mediante MiBooking con una comisión de ${comision}%.\n\n` +
      `Revisa y responde personalmente aquí:\n` +
      `${authorizationUrl.toString()}\n\n` +
      `El enlace es personal, de un solo uso y vence en siete días.`;

    const resendResponse = await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [artistaEmail],
          subject,
          html,
          text,
        }),
      },
    );

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      await serviceClient
        .from('artistas')
        .update({
          autorizacion_error:
            resendResult?.message ||
            'El proveedor de email rechazó el envío.',
        })
        .eq('id', artistaId)
        .eq('user_id', user.id);

      throw new Error(
        resendResult?.message ||
        'El proveedor de email rechazó el envío.'
      );
    }

    await serviceClient
      .from('artistas')
      .update({
        autorizacion_enviada_at:
          new Date().toISOString(),
        autorizacion_email_message_id:
          resendResult?.id || null,
        autorizacion_error: null,
      })
      .eq('id', artistaId)
      .eq('user_id', user.id);

    return jsonResponse({
      ok: true,
      enviado_a: artistaEmail,
    });
  } catch (error) {
    console.error(error);

    return jsonResponse(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo enviar la autorización.',
      },
      400,
    );
  }
});
