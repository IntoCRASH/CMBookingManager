import { supabase } from './supabaseClient';
import { requireWorkspaceId } from './workspaceService';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireFormatoId(value) {
  const parsed = String(value || '').trim();

  if (!UUID_PATTERN.test(parsed)) {
    throw new Error('El Formato seleccionado no es válido.');
  }

  return parsed;
}

export async function getFormatos(workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from('formatos')
    .select('*')
    .eq('workspace_id', currentWorkspaceId)
    .order('cantidad_musicos', { ascending: true })
    .order('nombre', { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function getFormatosActivos(workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from('formatos')
    .select('*')
    .eq('workspace_id', currentWorkspaceId)
    .eq('activo', true)
    .order('cantidad_musicos', { ascending: true })
    .order('nombre', { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function getFormatoById(id, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const currentFormatoId = requireFormatoId(id);

  const { data, error } = await supabase
    .from('formatos')
    .select('*')
    .eq('id', currentFormatoId)
    .eq('workspace_id', currentWorkspaceId)
    .single();

  if (error) throw error;

  return data;
}

export async function saveFormato(formato, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const payload = {
    workspace_id: currentWorkspaceId,
    nombre: String(formato?.nombre || '').trim(),
    cantidad_musicos: Number(formato?.cantidad_musicos || 1),
    activo: formato?.activo ?? true,
    updated_at: new Date().toISOString(),
  };

  if (!payload.nombre) {
    throw new Error('El nombre del Formato es obligatorio.');
  }

  if (
    !Number.isFinite(payload.cantidad_musicos) ||
    payload.cantidad_musicos <= 0
  ) {
    throw new Error(
      'La cantidad de músicos debe ser mayor que cero.'
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      formato || {},
      'rider_config'
    )
  ) {
    payload.rider_config = formato.rider_config || {};
  }

  if (formato?.id) {
    const currentFormatoId = requireFormatoId(formato.id);

    const { data, error } = await supabase
      .from('formatos')
      .update(payload)
      .eq('id', currentFormatoId)
      .eq('workspace_id', currentWorkspaceId)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  const { data, error } = await supabase
    .from('formatos')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function saveFormatoRiderConfig(
  formatoId,
  riderConfig,
  workspaceId
) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const currentFormatoId = requireFormatoId(formatoId);

  const config =
    riderConfig && typeof riderConfig === 'object'
      ? riderConfig
      : {};

  const integrantes = Array.isArray(config.integrantes)
    ? config.integrantes
    : [];

  if (integrantes.length === 0) {
    throw new Error(
      'Agrega por lo menos un integrante al rider del Formato.'
    );
  }

  const { data, error } = await supabase
    .from('formatos')
    .update({
      rider_config: config,
      updated_at: new Date().toISOString(),
    })
    .eq('id', currentFormatoId)
    .eq('workspace_id', currentWorkspaceId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteFormato(id, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const currentFormatoId = requireFormatoId(id);

  const { error } = await supabase
    .from('formatos')
    .delete()
    .eq('id', currentFormatoId)
    .eq('workspace_id', currentWorkspaceId);

  if (error) throw error;

  return true;
}
