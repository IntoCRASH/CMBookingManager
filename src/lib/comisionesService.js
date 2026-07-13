import { supabase } from './supabaseClient';
import { requireWorkspaceId } from './workspaceService';

const VALID_WORKFLOW_STATES = [
  'pending',
  'artist_reported',
  'manager_reported',
  'settled',
];

function normalizarLista(data) {
  if (Array.isArray(data)) return data;

  if (!data) return [];

  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizarEstadoFlujo(row) {
  const value = String(
    row?.workflow_status || ''
  ).trim();

  if (
    VALID_WORKFLOW_STATES.includes(
      value
    )
  ) {
    return value;
  }

  return row?.settlement_status ===
    'settled'
    ? 'settled'
    : 'pending';
}

function normalizarComision(row) {
  const workflowStatus =
    normalizarEstadoFlujo(row);

  return {
    cotizacion_id: String(
      row?.cotizacion_id || ''
    ),

    numero: row?.numero || '',
    workspace_id: Number(
      row?.workspace_id || 0
    ),

    artista_nombre:
      row?.artista_nombre ||
      'Artista',

    gestor_user_id:
      row?.gestor_user_id ||
      null,

    gestor_nombre:
      row?.gestor_nombre ||
      'Gestor no identificado',

    gestor_email:
      row?.gestor_email || '',

    cliente_nombre:
      row?.cliente_nombre ||
      'Cliente',

    nombre_evento:
      row?.nombre_evento || '',

    tipo_evento:
      row?.tipo_evento || '',

    venue: row?.venue || '',

    fecha_evento:
      row?.fecha_evento || null,

    total: Number(
      row?.total || 0
    ),

    comision: Number(
      row?.comision || 0
    ),

    comision_porcentaje:
      Number(
        row?.comision_porcentaje || 0
      ),

    workflow_status:
      workflowStatus,

    settlement_status:
      workflowStatus === 'settled'
        ? 'settled'
        : 'pending',

    initiated_at:
      row?.initiated_at || null,

    initiated_by:
      row?.initiated_by || null,

    initiated_by_role:
      row?.initiated_by_role ||
      null,

    confirmed_at:
      row?.confirmed_at || null,

    confirmed_by:
      row?.confirmed_by || null,

    confirmed_by_role:
      row?.confirmed_by_role ||
      null,

    settled_at:
      row?.settled_at || null,

    settled_by:
      row?.settled_by || null,

    settled_by_role:
      row?.settled_by_role ||
      null,
  };
}

export async function getWorkspaceCommissions(
  workspaceId
) {
  const currentWorkspaceId =
    requireWorkspaceId(workspaceId);

  const { data, error } =
    await supabase.rpc(
      'get_workspace_commissions',
      {
        p_workspace_id:
          currentWorkspaceId,
      }
    );

  if (error) throw error;

  return normalizarLista(data).map(
    normalizarComision
  );
}

export async function advanceWorkspaceCommissionStatus({
  workspaceId,
  cotizacionId,
}) {
  const currentWorkspaceId =
    requireWorkspaceId(workspaceId);

  const cleanCotizacionId =
    String(
      cotizacionId || ''
    ).trim();

  if (!cleanCotizacionId) {
    throw new Error(
      'La cotización de la comisión no es válida.'
    );
  }

  const { data, error } =
    await supabase.rpc(
      'advance_workspace_commission_status',
      {
        p_workspace_id:
          currentWorkspaceId,

        p_cotizacion_id:
          cleanCotizacionId,
      }
    );

  if (error) throw error;

  return data;
}
