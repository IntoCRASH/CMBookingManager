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
      {
        ok: false,
        error: 'Método no permitido.',
      },
      405,
    );
  }

  let invitationId = 0;
  let actorId = '';

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
        {
          ok: false,
          error: 'Sesión requerida.',
        },
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

    actorId = user.id;

    const body = await request.json();

    invitationId = Number(
      body?.invitation_id
    );

    if (
      !Number.isInteger(invitationId) ||
      invitationId <= 0
    ) {
      return jsonResponse(
        {
          ok: false,
          error: 'Invitación inválida.',
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

    const {
      data: invitation,
      error: invitationError,
    } = await serviceClient.rpc(
      'prepare_workspace_invitation_email',
      {
        p_invitation_id: invitationId,
        p_actor_id: actorId,
      },
    );

    if (invitationError) {
      throw new Error(
        invitationError.message
      );
    }

    const token = String(
      invitation?.token || ''
    );

    const recipientEmail = String(
      invitation?.email || ''
    );

    const workspaceName = String(
      invitation?.workspace_name ||
        'un Artista'
    );

    const artistName = String(
      invitation?.artist_name ||
        workspaceName
    );

    const commission = Number(
      invitation?.commission_percentage ||
        0
    );

    if (!token || !recipientEmail) {
      throw new Error(
        'No se pudo preparar la invitación.'
      );
    }

    const invitationUrl =
      new URL(appPublicUrl);

    invitationUrl.search = '';
    invitationUrl.hash = '';

    invitationUrl.searchParams.set(
      'invitacion_gestor',
      token
    );

    const logoUrl = new URL(
      '/mibooking-logo.png',
      invitationUrl.origin
    ).toString();

    const subject =
      `${workspaceName} te invita a trabajar ` +
      `como Gestor en MiBooking`;

    const html = `
      <!doctype html>
      <html lang="es">
        <body style="margin:0;padding:0;background:#f3f6ff;font-family:Arial,Helvetica,sans-serif;color:#111827">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6ff;padding:32px 14px">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 18px 50px rgba(31,41,55,.12)">
                  <tr>
                    <td style="padding:30px 34px 22px;background:linear-gradient(135deg,#edf8ff 0%,#f3efff 55%,#ffffff 100%);border-bottom:1px solid #e7eaf3">
                      <img
                        src="${escapeHtml(logoUrl)}"
                        alt="MiBooking"
                        width="210"
                        style="display:block;width:210px;max-width:100%;height:auto"
                      />
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:38px 38px 18px">
                      <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:#eeeaff;color:#5b45f5;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">
                        Invitación profesional
                      </div>

                      <h1 style="margin:20px 0 12px;font-size:31px;line-height:1.16;color:#101828">
                        Has sido invitado como Gestor
                      </h1>

                      <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#475467">
                        Hola,
                      </p>

                      <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#475467">
                        <strong style="color:#101828">${escapeHtml(workspaceName)}</strong>
                        te invita a gestionar sus clientes, eventos y cotizaciones mediante MiBooking.
                      </p>

                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:26px 0;background:#f8f9ff;border:1px solid #e5e7f5;border-radius:18px">
                        <tr>
                          <td style="padding:20px 22px">
                            <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#667085">
                              Artista
                            </p>
                            <p style="margin:0;font-size:19px;font-weight:800;color:#101828">
                              ${escapeHtml(workspaceName)}
                            </p>
                          </td>
                          <td style="padding:20px 22px;border-left:1px solid #e5e7f5">
                            <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#667085">
                              Comisión acordada
                            </p>
                            <p style="margin:0;font-size:24px;font-weight:900;color:#5b45f5">
                              ${escapeHtml(commission)}%
                            </p>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0 0 25px;font-size:15px;line-height:1.7;color:#475467">
                        La invitación fue enviada por
                        <strong style="color:#101828">${escapeHtml(artistName)}</strong>.
                        Revisa los detalles y acéptala personalmente.
                      </p>

                      <p style="margin:28px 0;text-align:center">
                        <a
                          href="${escapeHtml(invitationUrl.toString())}"
                          style="display:inline-block;padding:15px 26px;border-radius:14px;background:linear-gradient(135deg,#3696ff,#6d55f7);color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;box-shadow:0 12px 26px rgba(91,69,245,.24)"
                        >
                          Revisar y aceptar invitación
                        </a>
                      </p>

                      <p style="margin:26px 0 0;font-size:13px;line-height:1.65;color:#667085">
                        Este enlace es personal, de un solo uso y vence en 14 días.
                        Para aceptar, deberás iniciar sesión en MiBooking con
                        <strong>${escapeHtml(recipientEmail)}</strong>.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:22px 38px 30px">
                      <div style="height:1px;background:#eaecf0;margin-bottom:20px"></div>
                      <p style="margin:0;font-size:12px;line-height:1.6;color:#98a2b3">
                        Si no reconoces esta invitación, puedes ignorar este correo.
                        No compartas el enlace con otras personas.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const text =
      `MiBooking\n\n` +
      `${workspaceName} te invita a trabajar como Gestor.\n\n` +
      `Comisión acordada: ${commission}%\n\n` +
      `Revisa y acepta la invitación aquí:\n` +
      `${invitationUrl.toString()}\n\n` +
      `Debes iniciar sesión con ${recipientEmail}.\n` +
      `El enlace es personal y vence en 14 días.`;

    const resendResponse = await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization:
            `Bearer ${resendApiKey}`,
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [recipientEmail],
          subject,
          html,
          text,
        }),
      },
    );

    const resendBody =
      await resendResponse.json();

    if (!resendResponse.ok) {
      const resendMessage =
        String(
          resendBody?.message ||
            resendBody?.error ||
            'Resend rechazó el envío.'
        );

      await serviceClient.rpc(
        'record_workspace_invitation_email_result',
        {
          p_invitation_id: invitationId,
          p_actor_id: actorId,
          p_message_id: null,
          p_error: resendMessage,
        },
      );

      throw new Error(resendMessage);
    }

    const messageId = String(
      resendBody?.id || ''
    );

    const {
      error: recordError,
    } = await serviceClient.rpc(
      'record_workspace_invitation_email_result',
      {
        p_invitation_id: invitationId,
        p_actor_id: actorId,
        p_message_id: messageId || null,
        p_error: null,
      },
    );

    if (recordError) {
      console.error(
        'El email fue enviado, pero no se registró:',
        recordError
      );
    }

    return jsonResponse({
      ok: true,
      invitation_id: invitationId,
      email: recipientEmail,
      message_id: messageId,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'No se pudo enviar la invitación.';

    console.error(error);

    return jsonResponse(
      {
        ok: false,
        error: message,
        invitation_id:
          invitationId || null,
      },
      500,
    );
  }
});
