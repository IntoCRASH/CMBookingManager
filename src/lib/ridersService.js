import { supabase } from './supabaseClient';
import { requireWorkspaceId } from './workspaceService';

const RIDERS_BUCKET = 'riders-pdf';
const SIGNED_URL_DURATION = 60 * 60;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUuid(value, label) {
  const parsed = String(value || '').trim();

  if (!UUID_PATTERN.test(parsed)) {
    throw new Error(`${label} no es válido.`);
  }

  return parsed;
}

const RIDER_SELECT = `
  *,
  cotizaciones (
    id,
    numero,
    estado,
    fecha_evento,
    nombre_evento,
    tipo_evento,
    venue,
    formato_id,
    clientes (
      nombre,
      empresa,
      telefono,
      email
    )
  ),
  formatos (
    id,
    nombre,
    cantidad_musicos
  )
`;

function requireRiderId(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('El rider seleccionado no es válido.');
  }

  return parsed;
}

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;

  if (!data?.user) {
    throw new Error('No hay una sesión activa.');
  }

  return data.user;
}

export async function getEligibleRiderQuotes(workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from('cotizaciones')
    .select(`
      *,
      clientes (*),
      provincias (*)
    `)
    .eq('workspace_id', currentWorkspaceId)
    .in('estado', ['Confirmada', 'Aprobada'])
    .not('formato_id', 'is', null)
    .order('fecha_evento', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getWorkspaceRiders(workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from('riders_tecnicos')
    .select(RIDER_SELECT)
    .eq('workspace_id', currentWorkspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function createRider(rider, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const user = await getAuthenticatedUser();

  const payload = {
    workspace_id: currentWorkspaceId,
    cotizacion_id: requireUuid(
      rider?.cotizacion_id,
      'La cotización seleccionada'
    ),
    formato_id: requireUuid(
      rider?.formato_id,
      'El Formato técnico seleccionado'
    ),
    estado: rider?.estado || 'Generado',
    datos_snapshot: rider?.datos_snapshot || {},
    destinatario_email:
      String(rider?.destinatario_email || '').trim() || null,
    generado_por: user.id,
  };

  const { data, error } = await supabase
    .from('riders_tecnicos')
    .insert(payload)
    .select(RIDER_SELECT)
    .single();

  if (error) throw error;

  return data;
}

export async function updateRider(
  riderId,
  changes,
  workspaceId
) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const currentRiderId = requireRiderId(riderId);

  const allowed = [
    'estado',
    'datos_snapshot',
    'pdf_path',
    'destinatario_email',
    'enviado_at',
    'confirmado_at',
  ];

  const payload = {
    updated_at: new Date().toISOString(),
  };

  allowed.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(changes || {}, field)) {
      payload[field] = changes[field];
    }
  });

  const { data, error } = await supabase
    .from('riders_tecnicos')
    .update(payload)
    .eq('id', currentRiderId)
    .eq('workspace_id', currentWorkspaceId)
    .select(RIDER_SELECT)
    .single();

  if (error) throw error;

  return data;
}

export async function uploadRiderPdf(
  blob,
  rider,
  workspaceId
) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const currentRiderId = requireRiderId(rider?.id);

  if (!(blob instanceof Blob)) {
    throw new Error('No se pudo preparar el PDF del rider.');
  }

  const safeNumber = String(
    rider?.numero || currentRiderId
  )
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  const path =
    `workspace/${currentWorkspaceId}/` +
    `rider-${safeNumber || currentRiderId}.pdf`;

  const { error } = await supabase.storage
    .from(RIDERS_BUCKET)
    .upload(path, blob, {
      upsert: true,
      contentType: 'application/pdf',
      cacheControl: '0',
    });

  if (error) throw error;

  return path;
}

export async function getRiderPdfSignedUrl(path) {
  if (!path) return '';

  const { data, error } = await supabase.storage
    .from(RIDERS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_DURATION, {
      download: true,
    });

  if (error) throw error;

  return data?.signedUrl || '';
}

export async function downloadStoredRider(rider) {
  if (!rider?.pdf_path) {
    throw new Error(
      'Este rider todavía no tiene un PDF guardado.'
    );
  }

  const signedUrl = await getRiderPdfSignedUrl(
    rider.pdf_path
  );

  if (!signedUrl) {
    throw new Error(
      'No se pudo preparar la descarga del rider.'
    );
  }

  const anchor = document.createElement('a');
  anchor.href = signedUrl;
  anchor.download = `Rider-${rider.numero || rider.id}.pdf`;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function deleteRider(rider, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const currentRiderId = requireRiderId(rider?.id);
  const pdfPath = String(rider?.pdf_path || '').trim();

  const { error: deleteError } = await supabase
    .from('riders_tecnicos')
    .delete()
    .eq('id', currentRiderId)
    .eq('workspace_id', currentWorkspaceId);

  if (deleteError) throw deleteError;

  if (pdfPath) {
    const { error: storageError } = await supabase.storage
      .from(RIDERS_BUCKET)
      .remove([pdfPath]);

    if (storageError) {
      console.error(
        'El registro fue borrado, pero no se pudo borrar el PDF:',
        storageError
      );
    }
  }

  return true;
}

export async function sendRiderByEmail({
  riderId,
  workspaceId,
  recipient,
  subject,
  message,
}) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const currentRiderId = requireRiderId(riderId);

  const { data, error } = await supabase.functions.invoke(
    'enviar-rider',
    {
      body: {
        riderId: currentRiderId,
        workspaceId: currentWorkspaceId,
        destinatario: String(recipient || '').trim(),
        asunto: String(subject || '').trim(),
        mensaje: String(message || '').trim(),
      },
    }
  );

  if (error) {
    throw new Error(
      error.message ||
        'No se pudo conectar con la función de envío del rider.'
    );
  }

  if (!data?.ok) {
    throw new Error(
      data?.error || 'No se pudo enviar el rider.'
    );
  }

  return data;
}
