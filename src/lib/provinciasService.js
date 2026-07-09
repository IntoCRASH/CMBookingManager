import { supabase } from './supabaseClient';

const limpiarNumero = (valor) => Number(valor || 0);

export async function getProvincias() {
  const { data, error } = await supabase
    .from('provincias')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) throw error;

  return data;
}

export async function saveProvincia(provincia) {
  const payload = {
    nombre: provincia.nombre.trim(),
    honorarios: limpiarNumero(provincia.honorarios),
    tarifa_musico: limpiarNumero(provincia.tarifa_musico),
    dieta_musico: limpiarNumero(provincia.dieta_musico),
    transporte: limpiarNumero(provincia.transporte),
    sonido: limpiarNumero(provincia.sonido),
    activa: provincia.activa,
    updated_at: new Date().toISOString(),
  };

  if (provincia.id) {
    const { data, error } = await supabase
      .from('provincias')
      .update(payload)
      .eq('id', provincia.id)
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

export async function deleteProvincia(id) {
  const { error } = await supabase
    .from('provincias')
    .delete()
    .eq('id', id);

  if (error) throw error;
}