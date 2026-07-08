import { supabase } from './supabaseClient';

export async function getCotizaciones() {
  const { data, error } = await supabase
    .from('cotizaciones')
    .select(`
      *,
      clientes (
        nombre,
        empresa,
        rnc,
        telefono,
        email
      ),
      provincias (
        nombre
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}