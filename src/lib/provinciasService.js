import { supabase } from './supabaseClient';
import { requireWorkspaceId } from './workspaceService';

const limpiarNumero = (valor) => Number(valor || 0);

export async function getProvincias(workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from('provincias')
    .select('*')
    .eq('workspace_id', currentWorkspaceId)
    .order('nombre', { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function saveProvincia(provincia, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const payload = {
    workspace_id: currentWorkspaceId,
    nombre: String(provincia.nombre || '').trim(),
    honorarios: limpiarNumero(provincia.honorarios),
    tarifa_musico: limpiarNumero(provincia.tarifa_musico),
    dieta_musico: limpiarNumero(provincia.dieta_musico),
    transporte: limpiarNumero(provincia.transporte),
    sonido: limpiarNumero(provincia.sonido),
    activa: provincia.activa ?? true,
    updated_at: new Date().toISOString(),
  };

  if (!payload.nombre) {
    throw new Error('El nombre de la zona es obligatorio.');
  }

  if (provincia.id) {
    const { data, error } = await supabase
      .from('provincias')
      .update(payload)
      .eq('id', provincia.id)
      .eq('workspace_id', currentWorkspaceId)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  const { data, error } = await supabase
    .from('provincias')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteProvincia(id, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { error } = await supabase
    .from('provincias')
    .delete()
    .eq('id', id)
    .eq('workspace_id', currentWorkspaceId);

  if (error) throw error;

  return true;
}