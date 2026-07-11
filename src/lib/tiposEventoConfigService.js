import { supabase } from './supabaseClient';
import { requireWorkspaceId } from './workspaceService';

export async function getTiposEventoConfig(workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from('tipos_evento_config')
    .select('*')
    .eq('workspace_id', currentWorkspaceId)
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function getTodosTiposEventoConfig(workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from('tipos_evento_config')
    .select('*')
    .eq('workspace_id', currentWorkspaceId)
    .order('nombre', { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function saveTipoEventoConfig(
  tipo,
  workspaceId
) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const payload = {
    workspace_id: currentWorkspaceId,
    nombre: String(tipo.nombre || '').trim(),

    multiplicador_honorarios: Number(
      tipo.multiplicador_honorarios || 1
    ),

    multiplicador_musicos: Number(
      tipo.multiplicador_musicos || 1
    ),

    multiplicador_sonido: Number(
      tipo.multiplicador_sonido || 1
    ),

    multiplicador_road_manager: Number(
      tipo.multiplicador_road_manager || 1
    ),

    ensayo_extra: Number(tipo.ensayo_extra || 0),
    produccion_extra: Number(tipo.produccion_extra || 0),
    activo: tipo.activo ?? true,
    updated_at: new Date().toISOString(),
  };

  if (!payload.nombre) {
    throw new Error(
      'El nombre del tipo de evento es obligatorio.'
    );
  }

  if (payload.multiplicador_honorarios <= 0) {
    throw new Error(
      'El multiplicador de honorarios debe ser mayor que cero.'
    );
  }

  if (payload.multiplicador_musicos <= 0) {
    throw new Error(
      'El multiplicador de músicos debe ser mayor que cero.'
    );
  }

  if (payload.multiplicador_sonido <= 0) {
    throw new Error(
      'El multiplicador de sonido debe ser mayor que cero.'
    );
  }

  if (payload.multiplicador_road_manager <= 0) {
    throw new Error(
      'El multiplicador de Road Manager debe ser mayor que cero.'
    );
  }

  if (payload.ensayo_extra < 0) {
    throw new Error(
      'El ensayo extra no puede ser negativo.'
    );
  }

  if (payload.produccion_extra < 0) {
    throw new Error(
      'La producción extra no puede ser negativa.'
    );
  }

  if (tipo.id) {
    const { data, error } = await supabase
      .from('tipos_evento_config')
      .update(payload)
      .eq('id', tipo.id)
      .eq('workspace_id', currentWorkspaceId)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  const { data, error } = await supabase
    .from('tipos_evento_config')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteTipoEventoConfig(
  id,
  workspaceId
) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { error } = await supabase
    .from('tipos_evento_config')
    .delete()
    .eq('id', id)
    .eq('workspace_id', currentWorkspaceId);

  if (error) throw error;

  return true;
}