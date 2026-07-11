import { supabase } from './supabaseClient';

const limpiarNumero = (valor) => Number(valor || 0);

function validarArtistaId(artistaId) {
  const id = Number(artistaId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Selecciona un artista válido.');
  }

  return id;
}

export async function getProvincias(artistaId) {
  const id = validarArtistaId(artistaId);

  const { data, error } = await supabase
    .from('provincias')
    .select('*')
    .eq('artista_id', id)
    .order('nombre', { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function getProvinciasActivas(artistaId) {
  const id = validarArtistaId(artistaId);

  const { data, error } = await supabase
    .from('provincias')
    .select('*')
    .eq('artista_id', id)
    .eq('activa', true)
    .order('nombre', { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function saveProvincia(provincia) {
  const artistaId = validarArtistaId(
    provincia.artista_id
  );

  const payload = {
    artista_id: artistaId,
    nombre: String(provincia.nombre || '').trim(),
    honorarios: limpiarNumero(provincia.honorarios),
    tarifa_musico: limpiarNumero(
      provincia.tarifa_musico
    ),
    dieta_musico: limpiarNumero(
      provincia.dieta_musico
    ),
    transporte: limpiarNumero(provincia.transporte),
    sonido: limpiarNumero(provincia.sonido),
    activa: Boolean(provincia.activa),
    updated_at: new Date().toISOString(),
  };

  if (!payload.nombre) {
    throw new Error(
      'Debes escribir el nombre de la zona.'
    );
  }

  if (provincia.id) {
    const { data, error } = await supabase
      .from('provincias')
      .update(payload)
      .eq('id', provincia.id)
      .eq('artista_id', artistaId)
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

export async function deleteProvincia(
  id,
  artistaId
) {
  const artistaIdValido =
    validarArtistaId(artistaId);

  const { error } = await supabase
    .from('provincias')
    .delete()
    .eq('id', id)
    .eq('artista_id', artistaIdValido);

  if (error) throw error;
}
