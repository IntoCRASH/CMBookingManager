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
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Método no permitido.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
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
        'Faltan secretos requeridos para enviar cotizaciones.'
      );
    }

    const authorization = request.headers.get('Authorization') || '';

    if (!authorization) {
      return json({ ok: false, error: 'No hay una sesión activa.' }, 401);
    }

    const body = await request.json();
    const cotizacionId = String(body?.cotizacionId || '').trim();
    const workspaceId = Number(body?.workspaceId);
    const destinatario = String(body?.destinatario || '').trim();
    const asunto = String(body?.asunto || '').trim();
    const mensaje = String(body?.mensaje || '').trim();

    if (!cotizacionId || !Number.isFinite(workspaceId) || workspaceId <= 0) {
      return json(
        { ok: false, error: 'El documento o el Artista no es válido.' },
        400
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) {
      return json(
        { ok: false, error: 'El correo del destinatario no es válido.' },
        400
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ ok: false, error: 'La sesión no es válida.' }, 401);
    }

    // La consulta usa RLS y confirma el acceso al workspace.
    const { data: quote, error: quoteError } = await userClient
      .from('cotizaciones')
      .select(`
        id,
        workspace_id,
        numero,
        documento_tipo,
        ncf,
        incluye_ncf,
        fecha_evento,
        nombre_evento,
        tipo_evento,
        venue,
        total,
        pdf_path,
        artista_nombre_snapshot,
        perfil_negocio_snapshot,
        clientes (nombre, empresa, email)
      `)
      .eq('id', cotizacionId)
      .eq('workspace_id', workspaceId)
      .single();

    if (quoteError || !quote) {
      return json(
        {
          ok: false,
          error: quoteError?.message || 'No tienes acceso a este documento.',
        },
        403
      );
    }

    if (!quote.pdf_path) {
      return json(
        { ok: false, error: 'El documento todavía no tiene un PDF guardado.' },
        400
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: pdfFile, error: pdfError } = await adminClient.storage
      .from('cotizaciones-pdf')
      .download(quote.pdf_path);

    if (pdfError || !pdfFile) {
      throw new Error(
        pdfError?.message || 'No se pudo descargar el PDF guardado.'
      );
    }

    const isInvoice = quote.documento_tipo === 'factura';
    const label = isInvoice ? 'Factura' : 'Cotización';
    const business = quote.perfil_negocio_snapshot || {};
    const client = Array.isArray(quote.clientes)
      ? quote.clientes[0] || {}
      : quote.clientes || {};
    const artistName =
      quote.artista_nombre_snapshot ||
      business.nombre_artistico ||
      business.nombre_completo ||
      'MiBooking';
    const documentNumber = quote.numero || quote.id;
    const safeSubject =
      asunto || `${label} ${documentNumber} - ${artistName}`;
    const safeMessage =
      mensaje ||
      `Adjuntamos la ${label.toLowerCase()} correspondiente a su evento.`;
    const htmlMessage = escapeHtml(safeMessage).replaceAll('\n', '<br />');
    const filename = `${isInvoice ? 'Factura' : 'Cotizacion'}-${documentNumber}.pdf`;
    const senderEmail = String(user.email || '').trim();
    const hasValidSenderEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail);
    const replyNoticeHtml = hasValidSenderEmail
      ? `
          <p style="margin:18px 0 0;font-size:13px;line-height:1.55;color:#64748b;">
            Si desea responder a este correo, escriba a
            <a href="mailto:${escapeHtml(senderEmail)}" style="color:#0f172a;font-weight:700;text-decoration:none;">
              ${escapeHtml(senderEmail)}
            </a>.
          </p>
        `
      : '';

    const emailHtml = `
      <div style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
        <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
          <div style="padding:22px 26px;background:#0f172a;color:#ffffff;">
            <div style="font-size:22px;font-weight:800;">MiBooking</div>
            <div style="font-size:12px;color:#cbd5e1;">Música · Eventos · Negocio</div>
          </div>
          <div style="padding:28px 26px;">
            <h1 style="margin:0 0 8px;font-size:21px;">
              ${escapeHtml(label)} ${escapeHtml(documentNumber)}
            </h1>
            <p style="margin:0 0 20px;color:#64748b;">
              ${escapeHtml(artistName)}
              ${quote.nombre_evento || quote.tipo_evento
                ? ` · ${escapeHtml(quote.nombre_evento || quote.tipo_evento)}`
                : ''}
            </p>
            <div style="font-size:15px;line-height:1.65;">${htmlMessage}</div>
            <div style="margin-top:24px;padding:15px;border-radius:12px;background:#f8fafc;">
              <strong>Documento adjunto:</strong> ${escapeHtml(filename)}
              ${client.name || client.nombre
                ? `<br /><strong>Cliente:</strong> ${escapeHtml(client.name || client.nombre)}`
                : ''}
              ${isInvoice && quote.incluye_ncf && quote.ncf
                ? `<br /><strong>NCF:</strong> ${escapeHtml(quote.ncf)}`
                : ''}
            </div>
            ${replyNoticeHtml}
          </div>
        </div>
      </div>
    `;

    const pdfContent = arrayBufferToBase64(await pdfFile.arrayBuffer());
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [destinatario],
        subject: safeSubject,
        html: emailHtml,
        ...(hasValidSenderEmail ? { reply_to: senderEmail } : {}),
        attachments: [{ filename, content: pdfContent }],
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(
        resendResult?.message || 'El proveedor de correo rechazó el envío.'
      );
    }

    const { error: updateError } = await adminClient
      .from('cotizaciones')
      .update({
        pdf_destinatario_email: destinatario,
        pdf_enviado_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', cotizacionId)
      .eq('workspace_id', workspaceId);

    if (updateError) {
      console.error(
        'El correo fue enviado, pero no se actualizó el documento:',
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
            : 'No se pudo enviar el documento.',
      },
      500
    );
  }
});
