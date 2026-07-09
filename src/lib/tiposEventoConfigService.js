import { supabase } from './supabaseClient';

export async function getTiposEventoConfig() {
  const { data, error } = await supabase
    .from('tipos_evento_config')
    .select('*')
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error cargando tipos de evento:', error);
    return [];
  }

  return data || [];
}

export async function getTodosTiposEventoConfig() {
  const { data, error } = await supabase
    .from('tipos_evento_config')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function saveTipoEventoConfig(tipo) {
  const payload = {
    nombre: tipo.nombre,
    multiplicador_honorarios: Number(tipo.multiplicador_honorarios || 1),
    multiplicador_musicos: Number(tipo.multiplicador_musicos || 1),
    multiplicador_sonido: Number(tipo.multiplicador_sonido || 1),
    ensayo_extra: Number(tipo.ensayo_extra || 0),
    produccion_extra: Number(tipo.produccion_extra || 0),
    activo: Boolean(tipo.activo),
  };

  if (tipo.id) {
    const { data, error } = await supabase
      .from('tipos_evento_config')
      .update(payload)
      .eq('id', tipo.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('tipos_evento_config')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTipoEventoConfig(id) {
  const { error } = await supabase
    .from('tipos_evento_config')
    .delete()
    .eq('id', id);

  if (error) throw error;
}