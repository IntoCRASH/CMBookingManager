import { supabase } from './supabaseClient';
import {
  buildBusinessProfileSnapshot,
  getBusinessProfileForQuotes,
  renderBusinessPolicies,
  getBusinessAssetSignedUrl,
} from './profileService';
import { requireWorkspaceId } from './workspaceService';
import { generateCotizacionPdfBlob } from './cotizacionPdf';

const COTIZACIONES_BUCKET = 'cotizaciones-pdf';
const CONTRACTS_BUCKET = 'contratos-pdf';
const RIDERS_BUCKET = 'riders-pdf';
const SIGNED_URL_DURATION = 60 * 60;
const COTIZACION_PDF_DESIGN_VERSION = 'clasico-politicas-v3';

const COTIZACION_SELECT = `
  *,
  clientes (*),
  provincias (*)
`;

const CAMPOS_SOLO_INTERFAZ = [
  'id',
  'clientes',
  'provincias',
  'vendedor',
  'gestor',
  'workspace',
  'created_at',
  'updated_at',

  // Estos campos describen la membresía, no la cotización.
  // El trigger SQL guarda el valor correcto en
  // comision_porcentaje_snapshot.
  'comision_porcentaje',
  'commission_percentage',
  'member_role',
  'workspace_name',
  'pdf_path',
  'pdf_generado_at',
];

function cleanCotizacionPayload(cotizacion) {
  const payload = {
    ...(cotizacion || {}),
  };

  CAMPOS_SOLO_INTERFAZ.forEach((field) => {
    delete payload[field];
  });

  return payload;
}

async function includeQuoteBusinessAssetUrls(
  cotizacion
) {
  if (!cotizacion?.perfil_negocio_snapshot) {
    return cotizacion;
  }

  const snapshot =
    cotizacion.perfil_negocio_snapshot;

  const [logoUrl, firmaUrl] =
    await Promise.all([
      getBusinessAssetSignedUrl(
        snapshot.logo_path
      ),

      getBusinessAssetSignedUrl(
        snapshot.firma_path
      ),
    ]);

  return {
    ...cotizacion,

    perfil_negocio_snapshot: {
      ...snapshot,
      logo_url: logoUrl,
      firma_url: firmaUrl,
    },
  };
}

async function createBusinessSnapshotFields(
  workspaceId
) {
  const businessProfile =
    await getBusinessProfileForQuotes(
      workspaceId
    );

  if (!businessProfile) {
    throw new Error(
      'El Artista no ha configurado su Perfil. ' +
        'Debe completar sus datos comerciales antes de crear cotizaciones.'
    );
  }

  const snapshot =
    buildBusinessProfileSnapshot(
      businessProfile
    );

  return {
    perfil_negocio_snapshot: snapshot,

    politicas_condiciones:
      renderBusinessPolicies(
        snapshot.condiciones_pago,
        snapshot
      ),
  };
}

async function prepareNewCotizacionPayload(
  payloadBase,
  workspaceId
) {
  if (
    payloadBase.perfil_negocio_snapshot &&
    payloadBase.politicas_condiciones
  ) {
    return payloadBase;
  }

  const snapshotFields =
    await createBusinessSnapshotFields(
      workspaceId
    );

  return {
    ...payloadBase,
    ...snapshotFields,
  };
}

async function freezeLegacyCotizacion(
  cotizacion,
  workspaceId
) {
  if (
    cotizacion?.perfil_negocio_snapshot &&
    cotizacion?.politicas_condiciones
  ) {
    return cotizacion;
  }

  const currentWorkspaceId =
    requireWorkspaceId(workspaceId);

  const snapshotFields =
    await createBusinessSnapshotFields(
      currentWorkspaceId
    );

  const { data, error } = await supabase
    .from('cotizaciones')
    .update({
      ...snapshotFields,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cotizacion.id)
    .eq(
      'workspace_id',
      currentWorkspaceId
    )
    .select(COTIZACION_SELECT)
    .single();

  if (error) throw error;

  return data;
}

export async function saveCotizacion(
  cotizacion,
  workspaceId
) {
  const currentWorkspaceId =
    requireWorkspaceId(
      workspaceId ||
        cotizacion?.workspace_id
    );

  if (cotizacion?.id) {
    const payload =
      cleanCotizacionPayload(
        cotizacion
      );

    payload.workspace_id =
      currentWorkspaceId;

    // Cualquier edición invalida la versión PDF anterior.
    // El documento se volverá a generar desde los datos actualizados.
    payload.pdf_path = null;
    payload.pdf_generado_at = null;
    payload.updated_at =
      new Date().toISOString();

    const { data, error } =
      await supabase
        .from('cotizaciones')
        .update(payload)
        .eq('id', cotizacion.id)
        .eq(
          'workspace_id',
          currentWorkspaceId
        )
        .select(COTIZACION_SELECT)
        .single();

    if (error) throw error;

    return data;
  }

  const payloadBase =
    cleanCotizacionPayload(
      cotizacion
    );

  payloadBase.workspace_id =
    currentWorkspaceId;

  /*
   * No enviamos comision_porcentaje.
   *
   * La función/trigger cotizaciones_workspace_context
   * consulta workspace_members y guarda:
   *
   *   comision_porcentaje_snapshot
   *
   * según el Gestor que crea la cotización.
   * Para el Artista propietario guarda 0.
   */
  delete payloadBase.comision_porcentaje;
  delete payloadBase.commission_percentage;

  const payloadConSnapshot =
    await prepareNewCotizacionPayload(
      payloadBase,
      currentWorkspaceId
    );

  const {
    data: numero,
    error: errorNumero,
  } = await supabase.rpc(
    'generar_numero_cotizacion',
    {
      p_workspace_id:
        currentWorkspaceId,
    }
  );

  if (errorNumero) {
    throw errorNumero;
  }

  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const userId =
    userData?.user?.id || null;

  if (!userId) {
    throw new Error(
      'No hay una sesión activa.'
    );
  }

  const payload = {
    ...payloadConSnapshot,
    workspace_id:
      currentWorkspaceId,
    numero,
    created_by: userId,
  };

  const { data, error } = await supabase
    .from('cotizaciones')
    .insert(payload)
    .select(COTIZACION_SELECT)
    .single();

  if (error) throw error;

  return data;
}

export async function getCotizaciones(
  filtro = {}
) {
  const currentWorkspaceId =
    requireWorkspaceId(
      filtro.workspaceId
    );

  let query = supabase
    .from('cotizaciones')
    .select(COTIZACION_SELECT)
    .eq(
      'workspace_id',
      currentWorkspaceId
    );

  if (filtro.estado) {
    query = query.eq(
      'estado',
      filtro.estado
    );
  }

  query = query.order(
    'created_at',
    {
      ascending: false,
    }
  );

  const { data, error } =
    await query;

  if (error) throw error;

  return data || [];
}

export async function getCotizacionById(
  id,
  workspaceId
) {
  const currentWorkspaceId =
    requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from('cotizaciones')
    .select(COTIZACION_SELECT)
    .eq('id', id)
    .eq(
      'workspace_id',
      currentWorkspaceId
    )
    .single();

  if (error) throw error;

  const frozen =
    await freezeLegacyCotizacion(
      data,
      currentWorkspaceId
    );

  return includeQuoteBusinessAssetUrls(
    frozen
  );
}


export async function getCotizacionPdfSignedUrl(path) {
  if (!path) return '';

  const { data, error } = await supabase.storage
    .from(COTIZACIONES_BUCKET)
    .createSignedUrl(path, SIGNED_URL_DURATION, {
      download: false,
    });

  if (error) throw error;

  return data?.signedUrl || '';
}

export async function uploadCotizacionPdf(
  blob,
  cotizacion,
  workspaceId
) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  if (!(blob instanceof Blob)) {
    throw new Error('No se pudo preparar el PDF de la cotización.');
  }

  if (!cotizacion?.id) {
    throw new Error('La cotización seleccionada no es válida.');
  }

  const safeId = String(cotizacion.id).replace(/[^a-z0-9_-]+/gi, '-');
  const path =
    `workspace/${currentWorkspaceId}/` +
    `cotizacion-${safeId}-${COTIZACION_PDF_DESIGN_VERSION}.pdf`;

  const { error } = await supabase.storage
    .from(COTIZACIONES_BUCKET)
    .upload(path, blob, {
      upsert: true,
      contentType: 'application/pdf',
      cacheControl: '0',
    });

  if (error) throw error;

  return path;
}

export async function ensureCotizacionPdf(
  id,
  workspaceId,
  options = {}
) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const force = Boolean(options?.force);
  let cotizacion = await getCotizacionById(id, currentWorkspaceId);

  const hasCurrentDesign = String(cotizacion.pdf_path || '')
    .includes(`-${COTIZACION_PDF_DESIGN_VERSION}.pdf`);

  if (!force && cotizacion.pdf_path && hasCurrentDesign) {
    const url = await getCotizacionPdfSignedUrl(cotizacion.pdf_path);

    return {
      cotizacion,
      url,
    };
  }

  const blob = await generateCotizacionPdfBlob({ cotizacion });
  const pdfPath = await uploadCotizacionPdf(
    blob,
    cotizacion,
    currentWorkspaceId
  );
  const generatedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from('cotizaciones')
    .update({
      pdf_path: pdfPath,
      pdf_generado_at: generatedAt,
      updated_at: generatedAt,
    })
    .eq('id', cotizacion.id)
    .eq('workspace_id', currentWorkspaceId)
    .select(COTIZACION_SELECT)
    .single();

  if (error) throw error;

  cotizacion = await includeQuoteBusinessAssetUrls(data);
  const url = await getCotizacionPdfSignedUrl(pdfPath);

  return {
    cotizacion,
    url,
  };
}

export async function sendCotizacionByEmail({
  cotizacionId,
  workspaceId,
  recipient,
  subject,
  message,
}) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const cleanRecipient = String(recipient || '').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanRecipient)) {
    throw new Error('Escribe un correo válido para enviar el documento.');
  }

  await ensureCotizacionPdf(cotizacionId, currentWorkspaceId);

  const { data, error } = await supabase.functions.invoke(
    'enviar-cotizacion',
    {
      body: {
        cotizacionId,
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
      data?.error || 'No se pudo enviar la cotización o factura.'
    );
  }

  return data;
}

export async function duplicarCotizacion(
  id,
  workspaceId
) {
  const currentWorkspaceId =
    requireWorkspaceId(workspaceId);

  const original =
    await getCotizacionById(
      id,
      currentWorkspaceId
    );

  const copia =
    cleanCotizacionPayload(
      original
    );

  delete copia.numero;

  // Una factura duplicada vuelve a ser una cotización nueva.
  copia.documento_tipo = 'cotizacion';
  copia.factura_emitida_at = null;
  copia.factura_emitida_by = null;
  copia.incluye_ncf = false;
  copia.ncf = null;

  // La copia recibe la identidad,
  // firma y políticas vigentes.
  delete copia.perfil_negocio_snapshot;
  delete copia.politicas_condiciones;

  // La copia recibe también el porcentaje
  // vigente del Gestor desde workspace_members.
  delete copia.comision_porcentaje_snapshot;
  delete copia.comision_autorizada_snapshot;

  // Una comisión duplicada comienza pendiente.
  delete copia.comision_liquidada_at;
  delete copia.comision_liquidada_by;
  delete copia.comision_liquidada_por_rol;

  if (
    Number(copia.comision || 0) > 0
  ) {
    copia.comision_estado =
      'Pendiente';
  }

  return saveCotizacion(
    {
      ...copia,
      workspace_id:
        currentWorkspaceId,
    },
    currentWorkspaceId
  );
}


export async function convertirCotizacionEnFactura({
  id,
  workspaceId,
  incluyeNcf = false,
  ncf = '',
}) {
  const currentWorkspaceId =
    requireWorkspaceId(workspaceId);

  if (!id) {
    throw new Error(
      'No se encontró la cotización que deseas facturar.'
    );
  }

  const ncfNormalizado = String(ncf || '')
    .trim()
    .toUpperCase();

  if (
    incluyeNcf &&
    !/^(B\d{10}|E\d{12})$/.test(
      ncfNormalizado
    )
  ) {
    throw new Error(
      'Escribe un NCF válido: B + 10 dígitos o E + 12 dígitos.'
    );
  }

  const { error } = await supabase.rpc(
    'convertir_cotizacion_en_factura',
    {
      p_cotizacion_id: id,
      p_workspace_id: currentWorkspaceId,
      p_incluye_ncf: Boolean(incluyeNcf),
      p_ncf: incluyeNcf
        ? ncfNormalizado
        : null,
    }
  );

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        'Ese NCF ya fue utilizado en otra factura de este Artista.'
      );
    }

    throw error;
  }

  // La factura es un documento distinto. Se invalida el PDF de
  // cotización para generar y guardar la versión fiscal actualizada.
  const { error: pdfResetError } = await supabase
    .from('cotizaciones')
    .update({
      pdf_path: null,
      pdf_generado_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('workspace_id', currentWorkspaceId);

  if (pdfResetError) throw pdfResetError;

  return getCotizacionById(
    id,
    currentWorkspaceId
  );
}

export async function cancelarCotizacion(
  id,
  workspaceId
) {
  const currentWorkspaceId =
    requireWorkspaceId(workspaceId);

  const { error } = await supabase
    .from('cotizaciones')
    .update({
      estado: 'Cancelada',
      updated_at:
        new Date().toISOString(),
    })
    .eq('id', id)
    .eq(
      'workspace_id',
      currentWorkspaceId
    );

  if (error) throw error;

  return true;
}

async function readRelatedPdfPaths({
  table,
  cotizacionId,
  workspaceId,
}) {
  const { data, error } = await supabase
    .from(table)
    .select('pdf_path')
    .eq('workspace_id', workspaceId)
    .eq('cotizacion_id', cotizacionId);

  if (error) {
    // La consulta solo se usa para limpiar Storage. El borrado de
    // las filas relacionadas lo resuelve la FK con ON DELETE CASCADE.
    console.error(
      `No se pudieron consultar los PDF relacionados en ${table}:`,
      error
    );
    return [];
  }

  return (data || [])
    .map((row) => String(row?.pdf_path || '').trim())
    .filter(Boolean);
}

async function removeStoredPaths(bucket, paths, label) {
  const uniquePaths = [...new Set((paths || []).filter(Boolean))];

  if (!uniquePaths.length) return;

  const { error } = await supabase.storage
    .from(bucket)
    .remove(uniquePaths);

  if (error) {
    console.error(
      `Los registros se eliminaron, pero no se pudieron limpiar ${label}:`,
      error
    );
  }
}

export async function eliminarCotizacion(
  id,
  workspaceId
) {
  const currentWorkspaceId =
    requireWorkspaceId(workspaceId);

  const { data: existing, error: readError } = await supabase
    .from('cotizaciones')
    .select('id, numero, documento_tipo, pdf_path')
    .eq('id', id)
    .eq('workspace_id', currentWorkspaceId)
    .single();

  if (readError) throw readError;

  if (existing?.documento_tipo === 'factura') {
    throw new Error(
      'Una factura emitida no puede eliminarse desde Cotizaciones.'
    );
  }

  const [contractPdfPaths, riderPdfPaths] = await Promise.all([
    readRelatedPdfPaths({
      table: 'contratos',
      cotizacionId: id,
      workspaceId: currentWorkspaceId,
    }),
    readRelatedPdfPaths({
      table: 'riders_tecnicos',
      cotizacionId: id,
      workspaceId: currentWorkspaceId,
    }),
  ]);

  const { error } = await supabase
    .from('cotizaciones')
    .delete()
    .eq('id', id)
    .eq(
      'workspace_id',
      currentWorkspaceId
    );

  if (error) {
    if (error.code === '23503') {
      throw new Error(
        'La cotización tiene documentos relacionados y la base de datos todavía bloquea el borrado. Ejecuta la migración 20260715_eliminar_cotizacion_relacionados.sql en Supabase.'
      );
    }

    throw error;
  }

  await Promise.all([
    removeStoredPaths(
      COTIZACIONES_BUCKET,
      existing?.pdf_path ? [existing.pdf_path] : [],
      'el PDF de la cotización'
    ),
    removeStoredPaths(
      CONTRACTS_BUCKET,
      contractPdfPaths,
      'los PDF de contratos relacionados'
    ),
    removeStoredPaths(
      RIDERS_BUCKET,
      riderPdfPaths,
      'los PDF de riders relacionados'
    ),
  ]);

  return true;
}
