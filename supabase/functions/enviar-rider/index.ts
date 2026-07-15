import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
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

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(
      index,
      Math.min(index + chunkSize, bytes.length)
    );

    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  if (request.method !== 'POST') {
    return json(
      { ok: false, error: 'Método no permitido.' },
      405
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get(
      'SUPABASE_SERVICE_ROLE_KEY'
    );
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL');

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey ||
      !resendApiKey ||
      !fromEmail
    ) {
      throw new Error(
        'Faltan secretos requeridos para enviar riders.'
      );
    }

    const authorization =
      request.headers.get('Authorization') || '';

    if (!authorization) {
      return json(
        { ok: false, error: 'No hay una sesión activa.' },
        401
      );
    }

    const body = await request.json();

    const riderId = Number(body?.riderId);
    const workspaceId = Number(body?.workspaceId);
    const destinatario = String(
      body?.destinatario || ''
    ).trim();
    const asunto = String(body?.asunto || '').trim();
    const mensaje = String(body?.mensaje || '').trim();

    if (
      !Number.isFinite(riderId) ||
      riderId <= 0 ||
      !Number.isFinite(workspaceId) ||
      workspaceId <= 0
    ) {
      return json(
        {
          ok: false,
          error: 'El rider o el Artista no es válido.',
        },
        400
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        destinatario
      )
    ) {
      return json(
        {
          ok: false,
          error: 'El correo del destinatario no es válido.',
        },
        400
      );
    }

    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json(
        { ok: false, error: 'La sesión no es válida.' },
        401
      );
    }

    const replyEmail = String(user.email || '').trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyEmail)) {
      return json(
        {
          ok: false,
          error:
            'La cuenta del usuario no tiene un correo válido para recibir respuestas.',
        },
        400
      );
    }

    // Consulta protegida por RLS: confirma que el usuario tiene
    // acceso activo al workspace del rider.
    const { data: rider, error: riderError } =
      await userClient
        .from('riders_tecnicos')
        .select(`
          id,
          workspace_id,
          cotizacion_id,
          numero,
          estado,
          pdf_path,
          datos_snapshot
        `)
        .eq('id', riderId)
        .eq('workspace_id', workspaceId)
        .single();

    if (riderError || !rider) {
      return json(
        {
          ok: false,
          error:
            riderError?.message ||
            'No tienes acceso a este rider.',
        },
        403
      );
    }

    if (!rider.pdf_path) {
      return json(
        {
          ok: false,
          error:
            'El rider todavía no tiene un PDF guardado.',
        },
        400
      );
    }

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    const { data: pdfFile, error: pdfError } =
      await adminClient.storage
        .from('riders-pdf')
        .download(rider.pdf_path);

    if (pdfError || !pdfFile) {
      throw new Error(
        pdfError?.message ||
          'No se pudo descargar el PDF del rider.'
      );
    }

    const snapshot = rider.datos_snapshot || {};
    const artist = snapshot.artist || {};
    const client = snapshot.client || {};
    const event = snapshot.event || {};
    const format = snapshot.format || {};

    const safeSubject =
      asunto ||
      `Rider técnico ${rider.numero} - ${
        artist.artistic_name || 'MiBooking'
      }`;

    const safeMessage =
      mensaje ||
      `Adjuntamos el rider técnico correspondiente al evento ${
        event.name || event.type || ''
      }.`;

    const htmlMessage = escapeHtml(safeMessage)
      .replaceAll('\n', '<br />');

    const appPublicUrl =
      Deno.env.get('APP_PUBLIC_URL') || '';

    const logoUrl = appPublicUrl
      ? `${appPublicUrl.replace(/\/+$/, '')}/mibooking-icon.png`
      : '';

    const emailHtml = `
      <div style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
        <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
          <div style="padding:22px 26px;background:#0f172a;color:#ffffff;">
            <div style="display:flex;align-items:center;gap:12px;">
              ${
                logoUrl
                  ? `<img src="${escapeHtml(
                      logoUrl
                    )}" alt="MiBooking" width="44" height="44" style="display:block;object-fit:contain;" />`
                  : ''
              }
              <div>
                <div style="font-size:22px;font-weight:800;">MiBooking</div>
                <div style="font-size:12px;color:#cbd5e1;">Música · Eventos · Negocio</div>
              </div>
            </div>
          </div>

          <div style="padding:28px 26px;">
            <h1 style="margin:0 0 8px;font-size:21px;">
              Rider técnico ${escapeHtml(rider.numero)}
            </h1>

            <p style="margin:0 0 20px;color:#64748b;">
              ${escapeHtml(
                artist.artistic_name || 'Presentación artística'
              )}
              ${
                event.date
                  ? ` · ${escapeHtml(event.date)}`
                  : ''
              }
            </p>

            <div style="font-size:15px;line-height:1.65;">
              ${htmlMessage}
            </div>

            <div style="margin-top:24px;padding:15px;border-radius:12px;background:#f8fafc;">
              <strong>Documento adjunto:</strong>
              ${escapeHtml(rider.numero)}.pdf
              ${
                client.name
                  ? `<br /><strong>Cliente:</strong> ${escapeHtml(
                      client.name
                    )}`
                  : ''
              }
              ${
                event.name || event.type
                  ? `<br /><strong>Evento:</strong> ${escapeHtml(
                      event.name || event.type
                    )}`
                  : ''
              }
              ${
                format.name
                  ? `<br /><strong>Formato:</strong> ${escapeHtml(
                      format.name
                    )}`
                  : ''
              }
            </div>

            <p style="margin:14px 0 0;font-size:13px;line-height:1.55;color:#475569;">
              Si desea responder a este correo, escriba a
              <a href="mailto:${escapeHtml(replyEmail)}" style="color:#0f172a;font-weight:700;text-decoration:none;">
                ${escapeHtml(replyEmail)}
              </a>.
            </p>
          </div>
        </div>
      </div>
    `;

    const pdfContent = arrayBufferToBase64(
      await pdfFile.arrayBuffer()
    );

    const resendResponse = await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          reply_to: replyEmail,
          to: [destinatario],
          subject: safeSubject,
          html: emailHtml,
          attachments: [
            {
              filename: `Rider-${rider.numero}.pdf`,
              content: pdfContent,
            },
          ],
        }),
      }
    );

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(
        resendResult?.message ||
          'El proveedor de correo rechazó el envío.'
      );
    }

    const { error: updateError } = await adminClient
      .from('riders_tecnicos')
      .update({
        estado: 'Enviado',
        destinatario_email: destinatario,
        enviado_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', riderId)
      .eq('workspace_id', workspaceId);

    if (updateError) {
      console.error(
        'El correo fue enviado, pero no se actualizó el rider:',
        updateError
      );
    }

    return json({
      ok: true,
      emailId: resendResult?.id || null,
      destinatario,
    });
  } catch (error) {
    console.error(error);

    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo enviar el rider.',
      },
      500
    );
  }
});
