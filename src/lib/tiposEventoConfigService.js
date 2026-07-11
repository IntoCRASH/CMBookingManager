import { supabase } from './supabaseClient';

function validarArtistaId(artistaId) {
  const id = Number(artistaId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Selecciona un artista válido.');
  }

  return id;
}

export async function getTiposEventoConfig(
  artistaId
) {
  const id = validarArtistaId(artistaId);

  const { data, error } = await supabase
    .from('tipos_evento_config')
    .select('*')
    .eq('artista_id', id)
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function getTodosTiposEventoConfig(
  artistaId
) {
  const id = validarArtistaId(artistaId);

  const { data, error } = await supabase
    .from('tipos_evento_config')
    .select('*')
    .eq('artista_id', id)
    .order('nombre', { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function saveTipoEventoConfig(tipo) {
  const artistaId = validarArtistaId(
    tipo.artista_id
  );

  const payload = {
    artista_id: artistaId,
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
    ensayo_extra: Number(
      tipo.ensayo_extra || 0
    ),
    produccion_extra: Number(
      tipo.produccion_extra || 0
    ),
    activo: Boolean(tipo.activo),
  };

  if (!payload.nombre) {
    throw new Error(
      'El nombre del tipo de evento es obligatorio.'
    );
  }

  if (tipo.id) {
    const { data, error } = await supabase
      .from('tipos_evento_config')
      .update(payload)
      .eq('id', tipo.id)
      .eq('artista_id', artistaId)
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
  artistaId
) {
  const artistaIdValido =
    validarArtistaId(artistaId);

  const { error } = await supabase
    .from('tipos_evento_config')
    .delete()
    .eq('id', id)
    .eq('artista_id', artistaIdValido);

  if (error) throw error;
}
