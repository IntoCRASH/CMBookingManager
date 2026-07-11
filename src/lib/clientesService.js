import { supabase } from './supabaseClient';
import { requireWorkspaceId } from './workspaceService';

function cleanText(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function buildPayload(cliente, workspaceId) {
  return {
    workspace_id: requireWorkspaceId(workspaceId),
    nombre: String(cliente.nombre || '').trim(),
    empresa: cleanText(cliente.empresa),
    rnc: cleanText(cliente.rnc),
    telefono: String(cliente.telefono || '').trim(),
    email: cleanText(cliente.email),
    activo: cliente.activo ?? true,
    updated_at: new Date().toISOString(),
  };
}

export async function getClientes(workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('workspace_id', currentWorkspaceId)
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function saveCliente(cliente, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const payload = buildPayload(cliente, currentWorkspaceId);

  if (!payload.nombre) {
    throw new Error('El nombre del cliente es obligatorio.');
  }

  if (!payload.telefono) {
    throw new Error('El teléfono del cliente es obligatorio.');
  }

  if (cliente.id) {
    const { data, error } = await supabase
      .from('clientes')
      .update(payload)
      .eq('id', cliente.id)
      .eq('workspace_id', currentWorkspaceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('clientes')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function crearCliente(cliente, workspaceId) {
  return saveCliente(cliente, workspaceId);
}

export async function deleteCliente(id, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id)
    .eq('workspace_id', currentWorkspaceId);

  if (error) throw error;
  return true;
}
