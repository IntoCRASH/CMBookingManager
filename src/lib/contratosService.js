import { supabase } from './supabaseClient';
import { requireWorkspaceId } from './workspaceService';

const CONTRACTS_BUCKET = 'contratos-pdf';
const SIGNED_URL_DURATION = 60 * 60;

const CONTRACT_SELECT = `
  *,
  cotizaciones (
    id,
    numero,
    estado,
    fecha_evento,
    nombre_evento,
    tipo_evento,
    venue,
    total,
    clientes (
      nombre,
      empresa,
      telefono,
      email
    )
  )
`;

function requireContractId(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('El contrato seleccionado no es válido.');
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

export async function getEligibleContractQuotes(workspaceId) {
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
    .order('fecha_evento', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getWorkspaceContracts(workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from('contratos')
    .select(CONTRACT_SELECT)
    .eq('workspace_id', currentWorkspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getContractById(contractId, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const currentContractId = requireContractId(contractId);

  const { data, error } = await supabase
    .from('contratos')
    .select(CONTRACT_SELECT)
    .eq('id', currentContractId)
    .eq('workspace_id', currentWorkspaceId)
    .single();

  if (error) throw error;

  return data;
}

export async function createContract(contract, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const user = await getAuthenticatedUser();

  const payload = {
    workspace_id: currentWorkspaceId,
    cotizacion_id: String(contract.cotizacion_id || '').trim(),
    estado: contract.estado || 'Generado',
    datos_snapshot: contract.datos_snapshot || {},
    clausulas_snapshot: String(
      contract.clausulas_snapshot || ''
    ).trim(),
    destinatario_email:
      String(contract.destinatario_email || '').trim() || null,
    generado_por: user.id,
  };

  if (!payload.cotizacion_id) {
    throw new Error(
      'Selecciona una cotización confirmada o aprobada.'
    );
  }

  if (!payload.clausulas_snapshot) {
    throw new Error(
      'El contrato no contiene cláusulas para guardar.'
    );
  }

  const { data, error } = await supabase
    .from('contratos')
    .insert(payload)
    .select(CONTRACT_SELECT)
    .single();

  if (error) throw error;

  return data;
}

export async function updateContract(
  contractId,
  changes,
  workspaceId
) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const currentContractId = requireContractId(contractId);

  const allowed = [
    'estado',
    'datos_snapshot',
    'clausulas_snapshot',
    'pdf_path',
    'destinatario_email',
    'enviado_at',
    'firmado_at',
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
    .from('contratos')
    .update(payload)
    .eq('id', currentContractId)
    .eq('workspace_id', currentWorkspaceId)
    .select(CONTRACT_SELECT)
    .single();

  if (error) throw error;

  return data;
}

export async function uploadContractPdf(
  blob,
  contract,
  workspaceId
) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const currentContractId = requireContractId(contract?.id);

  if (!(blob instanceof Blob)) {
    throw new Error('No se pudo preparar el archivo PDF.');
  }

  const safeNumber = String(
    contract?.numero || currentContractId
  )
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  const path =
    `workspace/${currentWorkspaceId}/` +
    `contrato-${safeNumber || currentContractId}.pdf`;

  const { error } = await supabase.storage
    .from(CONTRACTS_BUCKET)
    .upload(path, blob, {
      upsert: true,
      contentType: 'application/pdf',
      cacheControl: '0',
    });

  if (error) throw error;

  return path;
}

export async function getContractPdfSignedUrl(path) {
  if (!path) return '';

  const { data, error } = await supabase.storage
    .from(CONTRACTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_DURATION, {
      download: true,
    });

  if (error) throw error;

  return data?.signedUrl || '';
}

export async function downloadStoredContract(contract) {
  if (!contract?.pdf_path) {
    throw new Error(
      'Este contrato todavía no tiene un PDF guardado.'
    );
  }

  const signedUrl = await getContractPdfSignedUrl(
    contract.pdf_path
  );

  if (!signedUrl) {
    throw new Error(
      'No se pudo preparar la descarga del contrato.'
    );
  }

  const anchor = document.createElement('a');
  anchor.href = signedUrl;
  anchor.download =
    `Contrato-${contract.numero || contract.id}.pdf`;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}


export async function deleteContract(contract, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const currentContractId = requireContractId(contract?.id);
  const pdfPath = String(contract?.pdf_path || '').trim();

  /*
   * La política RLS permite esta eliminación únicamente al
   * Artista propietario del workspace. Primero eliminamos el
   * registro visible y después limpiamos el PDF almacenado.
   */
  const { error } = await supabase
    .from('contratos')
    .delete()
    .eq('id', currentContractId)
    .eq('workspace_id', currentWorkspaceId);

  if (error) throw error;

  const expectedPrefix = `workspace/${currentWorkspaceId}/`;

  if (pdfPath && pdfPath.startsWith(expectedPrefix)) {
    const { error: storageError } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .remove([pdfPath]);

    if (storageError) {
      /*
       * El contrato ya no aparece en la aplicación. Registramos
       * el fallo de limpieza para diagnóstico sin restaurar una
       * fila que ya fue eliminada correctamente.
       */
      console.error(
        'El contrato fue eliminado, pero no se pudo limpiar su PDF:',
        storageError
      );
    }
  }

  return true;
}

export async function sendContractByEmail({
  contractId,
  workspaceId,
  recipient,
  subject,
  message,
}) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const currentContractId = requireContractId(contractId);
  const cleanRecipient = String(recipient || '').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanRecipient)) {
    throw new Error(
      'Escribe un correo válido para enviar el contrato.'
    );
  }

  const { data, error } = await supabase.functions.invoke(
    'enviar-contrato',
    {
      body: {
        contratoId: currentContractId,
        workspaceId: currentWorkspaceId,
        destinatario: cleanRecipient,
        asunto: String(subject || '').trim(),
        mensaje: String(message || '').trim(),
      },
    }
  );

  if (error) throw error;

  if (!data?.ok) {
    throw new Error(
      data?.error || 'No se pudo enviar el contrato.'
    );
  }

  return data;
}
