import { supabase } from './supabaseClient';

export async function saveCotizacion(cotizacion) {
  if (cotizacion.id) {
    const id = cotizacion.id;
    const payload = { ...cotizacion };

    delete payload.id;
    delete payload.clientes;
    delete payload.provincias;
    delete payload.vendedor;
    delete payload.created_at;

    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('cotizaciones')
      .update(payload)
      .eq('id', id)
      .select(`
        *,
        clientes (*),
        provincias (*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  const payloadBase = { ...cotizacion };

  delete payloadBase.id;
  delete payloadBase.clientes;
  delete payloadBase.provincias;
  delete payloadBase.vendedor;
  delete payloadBase.created_at;
  delete payloadBase.updated_at;

  const { data: numero, error: errorNumero } =
    await supabase.rpc('generar_numero_cotizacion');

  if (errorNumero) throw errorNumero;

  const { data: userData } = await supabase.auth.getUser();

  const payload = {
    ...payloadBase,
    numero,
    created_by: userData?.user?.id || null,
  };

  const { data, error } = await supabase
    .from('cotizaciones')
    .insert([payload])
    .select(`
      *,
      clientes (*),
      provincias (*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function getCotizaciones(filtro = {}) {
  let query = supabase
    .from('cotizaciones')
    .select(`
      *,
      clientes (*),
      provincias (*)
    `);

  if (filtro.estado) {
    query = query.eq('estado', filtro.estado);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function getCotizacionById(id) {
  const { data, error } = await supabase
    .from('cotizaciones')
    .select(`
      *,
      clientes (*),
      provincias (*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function duplicarCotizacion(id) {
  const original = await getCotizacionById(id);

  const copia = { ...original };

  delete copia.id;
  delete copia.numero;
  delete copia.created_at;
  delete copia.updated_at;
  delete copia.clientes;
  delete copia.provincias;

  return await saveCotizacion(copia);
}

export async function cancelarCotizacion(id) {
  const { error } = await supabase
    .from('cotizaciones')
    .update({
      estado: 'Cancelada',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}