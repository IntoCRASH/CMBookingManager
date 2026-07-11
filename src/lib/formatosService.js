import { supabase } from './supabaseClient';
import { requireWorkspaceId } from './workspaceService';

export async function getFormatos(workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from('formatos')
    .select('*')
    .eq('workspace_id', currentWorkspaceId)
    .order('cantidad_musicos', { ascending: true });

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
    .order('cantidad_musicos', { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function saveFormato(formato, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const payload = {
    workspace_id: currentWorkspaceId,
    nombre: String(formato.nombre || '').trim(),
    cantidad_musicos: Number(formato.cantidad_musicos || 1),
    activo: formato.activo ?? true,
    updated_at: new Date().toISOString(),
  };

  if (!payload.nombre) {
    throw new Error('El nombre del formato es obligatorio.');
  }

  if (payload.cantidad_musicos <= 0) {
    throw new Error(
      'La cantidad de músicos debe ser mayor que cero.'
    );
  }

  if (formato.id) {
    const { data, error } = await supabase
      .from('formatos')
      .update(payload)
      .eq('id', formato.id)
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

export async function deleteFormato(id, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { error } = await supabase
    .from('formatos')
    .delete()
    .eq('id', id)
    .eq('workspace_id', currentWorkspaceId);

  if (error) throw error;

  return true;
}