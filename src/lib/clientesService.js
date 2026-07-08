import { supabase } from './supabaseClient';

export async function getClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
}

export async function saveCliente(cliente) {
  const { data: userData } = await supabase.auth.getUser();

  const payload = {
    nombre: cliente.nombre.trim(),
    empresa: cliente.empresa?.trim() || '',
    rnc: cliente.rnc?.trim() || '',
    telefono: cliente.telefono?.trim() || '',
    email: cliente.email?.trim() || '',
    updated_at: new Date().toISOString(),
  };

  if (!cliente.id) {
    payload.created_by = userData.user.id;
  }

  if (cliente.id) {
    const { data, error } = await supabase
      .from('clientes')
      .update(payload)
      .eq('id', cliente.id)
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

export async function crearCliente(cliente) {
  return await saveCliente(cliente);
}

export async function deleteCliente(id) {
  const { error } = await supabase
    .from('clientes')
    .update({
      activo: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}