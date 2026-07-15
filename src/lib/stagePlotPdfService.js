import { supabase } from './supabaseClient';
import { requireWorkspaceId } from './workspaceService';

const STAGE_PLOTS_BUCKET = 'stage-plots-pdf';
const SIGNED_URL_DURATION = 60 * 60;

function requireFormatId(value) {
  const parsed = String(value || '').trim();

  if (!parsed) {
    throw new Error('El Formato seleccionado no es válido.');
  }

  return parsed;
}

export function getStagePlotPdfPath(workspaceId, formatId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const currentFormatId = requireFormatId(formatId)
    .replace(/[^a-z0-9_-]+/gi, '-');

  return (
    `workspace/${currentWorkspaceId}/` +
    `stage-plot-${currentFormatId}.pdf`
  );
}

export async function uploadStagePlotPdf(
  blob,
  formatId,
  workspaceId
) {
  if (!(blob instanceof Blob)) {
    throw new Error('No se pudo preparar el PDF del Stage Plot.');
  }

  const path = getStagePlotPdfPath(workspaceId, formatId);

  const { error } = await supabase.storage
    .from(STAGE_PLOTS_BUCKET)
    .upload(path, blob, {
      upsert: true,
      contentType: 'application/pdf',
      cacheControl: '0',
    });

  if (error) throw error;

  return path;
}

export async function getStagePlotPdfSignedUrl(path) {
  if (!path) return '';

  const { data, error } = await supabase.storage
    .from(STAGE_PLOTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_DURATION, {
      download: false,
    });

  if (error) throw error;

  return data?.signedUrl || '';
}

export async function sendStagePlotByEmail({
  workspaceId,
  formatId,
  path,
  recipient,
  subject,
  message,
}) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const currentFormatId = requireFormatId(formatId);
  const cleanRecipient = String(recipient || '').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanRecipient)) {
    throw new Error('Escribe un correo válido para enviar el Stage Plot.');
  }

  const { data, error } = await supabase.functions.invoke(
    'enviar-stage-plot',
    {
      body: {
        workspaceId: currentWorkspaceId,
        formatoId: currentFormatId,
        pdfPath:
          String(path || '').trim() ||
          getStagePlotPdfPath(currentWorkspaceId, currentFormatId),
        destinatario: cleanRecipient,
        asunto: String(subject || '').trim(),
        mensaje: String(message || '').trim(),
      },
    }
  );

  if (error) throw error;

  if (!data?.ok) {
    throw new Error(data?.error || 'No se pudo enviar el Stage Plot.');
  }

  return data;
}
