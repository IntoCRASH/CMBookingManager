import { supabase } from './supabaseClient';

export async function getFormatos() {
  const { data, error } = await supabase
    .from('formatos')
    .select('*')
    .order('cantidad_musicos', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getFormatosActivos() {
  const { data, error } = await supabase
    .from('formatos')
    .select('*')
    .eq('activo', true)
    .order('cantidad_musicos', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function saveFormato(formato) {
  const payload = {
    nombre: formato.nombre,
    cantidad_musicos: Number(formato.cantidad_musicos || 1),
    activo: formato.activo ?? true,
    updated_at: new Date().toISOString(),
  };

  if (formato.id) {
    const { data, error } = await supabase
      .from('formatos')
      .update(payload)
      .eq('id', formato.id)
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

export async function deleteFormato(id) {
  const { error } = await supabase
    .from('formatos')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}