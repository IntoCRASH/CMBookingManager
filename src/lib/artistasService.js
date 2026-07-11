import { supabase } from './supabaseClient';

function normalizarRespuestaRpc(data) {
  if (!data) return {};

  if (typeof data === 'object') {
    return data;
  }

  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function obtenerMensajeFuncion(error) {
  let mensaje =
    error?.message ||
    'No se pudo enviar el correo de autorización.';

  try {
    const contexto = error?.context;

    if (contexto && typeof contexto.json === 'function') {
      const detalle = await contexto.json();

      mensaje =
        detalle?.error ||
        detalle?.message ||
        mensaje;
    }
  } catch {
    // Conserva el mensaje original.
  }

  return mensaje;
}

export async function getPlanArtistas() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;

  if (!user) {
    throw new Error('No hay una sesión activa.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('plan_artistas')
    .eq('id', user.id)
    .single();

  if (error) throw error;

  return data?.plan_artistas || 'limitado';
}

export async function getMisArtistas() {
  const { data, error } = await supabase
    .from('artistas')
    .select(`
      id,
      user_id,
      nombre,
      email,
      spotify_url,
      comision_porcentaje,
      estado_autorizacion,
      token_expira,
      autorizado_at,
      rechazado_at,
      revocado_at,
      autorizacion_enviada_at,
      autorizacion_email_message_id,
      autorizacion_error,
      activo,
      created_at,
      updated_at
    `)
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) throw error;

  return Array.isArray(data) ? data : [];
}

export async function getArtistaById(id) {
  const { data, error } = await supabase
    .from('artistas')
    .select(`
      id,
      user_id,
      nombre,
      email,
      spotify_url,
      comision_porcentaje,
      estado_autorizacion,
      token_expira,
      autorizado_at,
      rechazado_at,
      revocado_at,
      autorizacion_enviada_at,
      autorizacion_email_message_id,
      autorizacion_error,
      activo,
      created_at,
      updated_at
    `)
    .eq('id', id)
    .single();

  if (error) throw error;

  return data;
}

export async function crearArtista(artista) {
  const { data, error } = await supabase.rpc(
    'crear_artista',
    {
      p_nombre: String(artista.nombre || '').trim(),
      p_email: String(artista.email || '').trim(),
      p_spotify_url:
        String(artista.spotify_url || '').trim() || null,
      p_comision_porcentaje: Number(
        artista.comision_porcentaje || 0
      ),
    }
  );

  if (error) throw error;

  return normalizarRespuestaRpc(data);
}

export async function actualizarArtista(id, artista) {
  const { data, error } = await supabase.rpc(
    'actualizar_artista',
    {
      p_artista_id: Number(id),
      p_nombre: String(artista.nombre || '').trim(),
      p_email: String(artista.email || '').trim(),
      p_spotify_url:
        String(artista.spotify_url || '').trim() || null,
      p_comision_porcentaje: Number(
        artista.comision_porcentaje || 0
      ),
    }
  );

  if (error) throw error;

  return normalizarRespuestaRpc(data);
}

export async function borrarArtista(id) {
  const { data, error } = await supabase.rpc(
    'eliminar_artista',
    {
      p_artista_id: Number(id),
    }
  );

  if (error) throw error;

  return normalizarRespuestaRpc(data);
}

export async function enviarAutorizacionArtista(id) {
  const { data, error } = await supabase.functions.invoke(
    'enviar-autorizacion-artista',
    {
      body: {
        artista_id: Number(id),
      },
    }
  );

  if (error) {
    throw new Error(
      await obtenerMensajeFuncion(error)
    );
  }

  if (!data?.ok) {
    throw new Error(
      data?.error ||
      'No se pudo enviar el correo de autorización.'
    );
  }

  return data;
}

export async function regenerarAutorizacionArtista(id) {
  return enviarAutorizacionArtista(id);
}

export async function consultarAutorizacionArtista(token) {
  const { data, error } = await supabase.rpc(
    'consultar_autorizacion_artista',
    {
      p_token: String(token || '').trim(),
    }
  );

  if (error) throw error;

  return normalizarRespuestaRpc(data);
}

export async function responderAutorizacionArtista(
  token,
  decision
) {
  const { data, error } = await supabase.rpc(
    'responder_autorizacion_artista',
    {
      p_token: String(token || '').trim(),
      p_decision: String(decision || '').trim(),
    }
  );

  if (error) throw error;

  return normalizarRespuestaRpc(data);
}
