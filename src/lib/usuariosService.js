import { supabase } from './supabaseClient';

export async function getUsuarios() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function updateUsuario(id, cambios) {
  const payload = {
    ...cambios,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function crearUsuario(usuario) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: {
      action: 'create',
      ...usuario,
    },
  });

  console.log('Respuesta admin-users:', { data, error });

  if (error) {
    if (error.context) {
      const texto = await error.context.text();
      console.error('Texto real Edge Function:', texto);
      throw new Error(texto);
    }

    throw error;
  }

  return data;
}

export async function deleteUsuario(id) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: {
      action: 'delete',
      id,
    },
  });

  if (error) throw error;
  return data;
}
