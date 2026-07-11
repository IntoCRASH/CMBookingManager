import { supabase } from './supabaseClient';

function validarArtistaId(artistaId) {
  const id = Number(artistaId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Selecciona un artista válido.');
  }

  return id;
}

export async function getFormatos(artistaId) {
  const id = validarArtistaId(artistaId);

  const { data, error } = await supabase
    .from('formatos')
    .select('*')
    .eq('artista_id', id)
    .order('cantidad_musicos', {
      ascending: true,
    });

  if (error) throw error;

  return data || [];
}

export async function getFormatosActivos(artistaId) {
  const id = validarArtistaId(artistaId);

  const { data, error } = await supabase
    .from('formatos')
    .select('*')
    .eq('artista_id', id)
    .eq('activo', true)
    .order('cantidad_musicos', {
      ascending: true,
    });

  if (error) throw error;

  return data || [];
}

export async function saveFormato(formato) {
  const artistaId = validarArtistaId(
    formato.artista_id
  );

  const payload = {
    artista_id: artistaId,
    nombre: String(formato.nombre || '').trim(),
    cantidad_musicos: Number(
      formato.cantidad_musicos || 1
    ),
    activo: Boolean(formato.activo ?? true),
    updated_at: new Date().toISOString(),
  };

  if (!payload.nombre) {
    throw new Error(
      'El nombre del formato es obligatorio.'
    );
  }

  if (payload.cantidad_musicos <= 0) {
    throw new Error(
      'La cantidad de músicos debe ser mayor que cero.'
    );
  }

  if (formato.id) {
    const { data, error } = await supabase
      .from('formatos')
      .update(payload)
      .eq('id', formato.id)
      .eq('artista_id', artistaId)
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

export async function deleteFormato(
  id,
  artistaId
) {
  const artistaIdValido =
    validarArtistaId(artistaId);

  const { error } = await supabase
    .from('formatos')
    .delete()
    .eq('id', id)
    .eq('artista_id', artistaIdValido);

  if (error) throw error;

  return true;
}
