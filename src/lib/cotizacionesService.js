import { supabase } from './supabaseClient';
import {
  buildBusinessProfileSnapshot,
  getBusinessProfileForQuotes,
  renderBusinessPolicies,
  getBusinessAssetSignedUrl,
} from './profileService';
import { requireWorkspaceId } from './workspaceService';

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
    'generar_numero_cotizacion'
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

export async function eliminarCotizacion(
  id,
  workspaceId
) {
  const currentWorkspaceId =
    requireWorkspaceId(workspaceId);

  const { error } = await supabase
    .from('cotizaciones')
    .delete()
    .eq('id', id)
    .eq(
      'workspace_id',
      currentWorkspaceId
    );

  if (error) throw error;

  return true;
}
