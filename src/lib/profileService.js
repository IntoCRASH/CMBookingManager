import { supabase } from './supabaseClient';
import { requireWorkspaceId } from './workspaceService';

const BUSINESS_PROFILE_BUCKET = 'perfiles-negocio';
const MAX_PNG_SIZE = 5 * 1024 * 1024;
const SIGNED_URL_DURATION = 60 * 60 * 6;

export const DEFAULT_BUSINESS_POLICIES_TEMPLATE = `La fecha se considera reservada únicamente después de recibir el avance acordado.

El balance restante deberá completarse conforme a las condiciones indicadas en la cotización.

Cualquier cambio en la fecha, horario, lugar, formato artístico o requerimientos técnicos puede producir ajustes en el precio.

Las cancelaciones y reprogramaciones estarán sujetas a los términos acordados y a la disponibilidad del Artista.`;

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;

  if (!data?.user) {
    throw new Error('No hay una sesión activa.');
  }

  return data.user;
}

async function getWorkspace(workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from('workspaces')
    .select(`
      id,
      owner_user_id,
      nombre,
      nombre_legal,
      email_contacto,
      telefono_contacto,
      spotify_url,
      activo
    `)
    .eq('id', currentWorkspaceId)
    .single();

  if (error) throw error;

  return data;
}

function validarSpotify(value) {
  const cleanValue = String(value || '').trim();

  if (!cleanValue) return true;

  try {
    const url = new URL(cleanValue);

    return (
      ['http:', 'https:'].includes(url.protocol) &&
      url.hostname.toLowerCase().includes('spotify.com')
    );
  } catch {
    return false;
  }
}

export async function getWorkspaceArtistProfile(workspaceId) {
  const workspace = await getWorkspace(workspaceId);

  return {
    workspace_id: workspace.id,
    owner_user_id: workspace.owner_user_id,
    nombre_artistico: workspace.nombre || '',
    email_artistico: workspace.email_contacto || '',
    telefono_artistico: workspace.telefono_contacto || '',
    spotify_url: workspace.spotify_url || '',
    activo: Boolean(workspace.activo),
  };
}

export async function saveWorkspaceArtistProfile(
  artistProfile,
  workspaceId
) {
  const user = await getAuthenticatedUser();
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const workspace = await getWorkspace(currentWorkspaceId);

  if (workspace.owner_user_id !== user.id) {
    throw new Error(
      'Solo el Artista puede modificar su identidad artística.'
    );
  }

  const nombreArtistico = String(
    artistProfile.nombre_artistico || ''
  ).trim();

  const emailArtistico = String(
    artistProfile.email_artistico || ''
  ).trim();

  const telefonoArtistico = String(
    artistProfile.telefono_artistico || ''
  ).trim();

  const spotifyUrl = String(
    artistProfile.spotify_url || ''
  ).trim();

  if (!nombreArtistico) {
    throw new Error('El nombre artístico es obligatorio.');
  }

  if (
    emailArtistico &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailArtistico)
  ) {
    throw new Error(
      'Escribe un correo de contratación válido.'
    );
  }

  if (!validarSpotify(spotifyUrl)) {
    throw new Error(
      'Introduce un enlace válido del perfil de Spotify.'
    );
  }

  const { data, error } = await supabase
    .from('workspaces')
    .update({
      nombre: nombreArtistico,
      email_contacto: emailArtistico || null,
      telefono_contacto: telefonoArtistico || null,
      spotify_url: spotifyUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', currentWorkspaceId)
    .eq('owner_user_id', user.id)
    .select(`
      id,
      owner_user_id,
      nombre,
      email_contacto,
      telefono_contacto,
      spotify_url,
      activo
    `)
    .single();

  if (error) throw error;

  return {
    workspace_id: data.id,
    owner_user_id: data.owner_user_id,
    nombre_artistico: data.nombre || '',
    email_artistico: data.email_contacto || '',
    telefono_artistico: data.telefono_contacto || '',
    spotify_url: data.spotify_url || '',
    activo: Boolean(data.activo),
  };
}

export async function getBusinessAssetSignedUrl(path) {
  if (!path) return '';

  const { data, error } = await supabase.storage
    .from(BUSINESS_PROFILE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_DURATION);

  if (error) {
    console.error(
      'No se pudo crear la URL temporal del archivo:',
      error
    );

    return '';
  }

  return data?.signedUrl || '';
}

async function includeAssetUrls(profile) {
  if (!profile) return null;

  const [logoUrl, firmaUrl] = await Promise.all([
    getBusinessAssetSignedUrl(profile.logo_path),
    getBusinessAssetSignedUrl(profile.firma_path),
  ]);

  return {
    ...profile,
    logo_url: logoUrl,
    firma_url: firmaUrl,
  };
}

export async function getMyProfile() {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;

  return data;
}

export async function getMyBusinessProfile(workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from('perfiles_negocio')
    .select('*')
    .eq('workspace_id', currentWorkspaceId)
    .maybeSingle();

  if (error) throw error;

  return includeAssetUrls(data);
}

export async function getBusinessProfileForQuotes(workspaceId) {
  return getMyBusinessProfile(workspaceId);
}

export async function uploadMyBusinessAsset(
  file,
  assetType,
  workspaceId
) {
  const user = await getAuthenticatedUser();
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const workspace = await getWorkspace(currentWorkspaceId);

  if (workspace.owner_user_id !== user.id) {
    throw new Error(
      'Solo el Artista puede modificar el logo y la firma.'
    );
  }

  if (!file) {
    throw new Error('No se seleccionó ningún archivo.');
  }

  const normalizedType = String(assetType || '')
    .trim()
    .toLowerCase();

  if (!['logo', 'firma'].includes(normalizedType)) {
    throw new Error('Tipo de archivo de perfil inválido.');
  }

  const isPng =
    file.type === 'image/png' ||
    String(file.name || '')
      .toLowerCase()
      .endsWith('.png');

  if (!isPng) {
    throw new Error('El archivo debe estar en formato PNG.');
  }

  if (file.size > MAX_PNG_SIZE) {
    throw new Error(
      'El archivo PNG no puede superar los 5 MB.'
    );
  }

  const path =
    `workspace/${currentWorkspaceId}/${normalizedType}.png`;

  const { error } = await supabase.storage
    .from(BUSINESS_PROFILE_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: 'image/png',
      cacheControl: '0',
    });

  if (error) throw error;

  return {
    path,
    url: await getBusinessAssetSignedUrl(path),
  };
}

export async function saveMyBusinessProfile(
  profile,
  workspaceId
) {
  const user = await getAuthenticatedUser();
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const workspace = await getWorkspace(currentWorkspaceId);

  if (workspace.owner_user_id !== user.id) {
    throw new Error(
      'Solo el Artista puede modificar el perfil comercial.'
    );
  }

  const porcentajeAdelanto = Number(
    profile.porcentaje_adelanto ?? 0
  );

  const payload = {
    workspace_id: currentWorkspaceId,
    user_id: workspace.owner_user_id,

    nombre_completo: String(
      profile.nombre_completo || ''
    ).trim(),

    direccion: String(profile.direccion || '').trim(),
    ciudad: String(profile.ciudad || '').trim(),
    pais: String(profile.pais || '').trim(),
    codigo_postal: String(
      profile.codigo_postal || ''
    ).trim(),

    telefono: String(profile.telefono || '').trim(),
    identificacion: String(
      profile.identificacion || ''
    ).trim(),

    cuenta_bancaria: String(
      profile.cuenta_bancaria || ''
    ).trim(),

    nombre_banco: String(
      profile.nombre_banco || ''
    ).trim(),

    porcentaje_adelanto: Number.isFinite(
      porcentajeAdelanto
    )
      ? porcentajeAdelanto
      : 0,

    condiciones_pago: String(
      profile.condiciones_pago || ''
    ).trim(),

    logo_path: String(profile.logo_path || '').trim(),
    firma_path: String(profile.firma_path || '').trim(),

    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: findError } = await supabase
    .from('perfiles_negocio')
    .select('user_id, workspace_id')
    .eq('workspace_id', currentWorkspaceId)
    .maybeSingle();

  if (findError) throw findError;

  let result;

  if (existing?.user_id) {
    const { data, error } = await supabase
      .from('perfiles_negocio')
      .update(payload)
      .eq('workspace_id', currentWorkspaceId)
      .eq('user_id', workspace.owner_user_id)
      .select()
      .single();

    if (error) throw error;

    result = data;
  } else {
    const { data, error } = await supabase
      .from('perfiles_negocio')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    result = data;
  }

  if (payload.nombre_completo) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        nombre: payload.nombre_completo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspace.owner_user_id);

    if (profileError) throw profileError;
  }

  return includeAssetUrls(result);
}

export function buildBusinessProfileSnapshot(profile) {
  if (!profile) return null;

  return {
    workspace_id: profile.workspace_id,

    nombre_completo: profile.nombre_completo || '',
    direccion: profile.direccion || '',
    ciudad: profile.ciudad || '',
    pais: profile.pais || '',
    codigo_postal: profile.codigo_postal || '',
    telefono: profile.telefono || '',
    identificacion: profile.identificacion || '',

    cuenta_bancaria: profile.cuenta_bancaria || '',
    nombre_banco: profile.nombre_banco || '',

    porcentaje_adelanto: Number(
      profile.porcentaje_adelanto || 0
    ),

    condiciones_pago: profile.condiciones_pago || '',

    logo_path: profile.logo_path || '',
    firma_path: profile.firma_path || '',

    captured_at: new Date().toISOString(),
  };
}

export function renderBusinessPolicies(
  conditions,
  snapshot = {}
) {
  const parts = [];

  const advance = Number(
    snapshot.porcentaje_adelanto || 0
  );

  if (advance > 0) {
    parts.push(
      `Se requiere un avance de ${advance}% para reservar la fecha.`
    );
  }

  const bank = String(
    snapshot.nombre_banco || ''
  ).trim();

  const account = String(
    snapshot.cuenta_bancaria || ''
  ).trim();

  const ownerName = String(
    snapshot.nombre_completo || ''
  ).trim();

  const identification = String(
    snapshot.identificacion || ''
  ).trim();

  if (bank || account) {
    const bankParts = [
      bank ? `Banco: ${bank}.` : '',
      account ? `Cuenta: ${account}.` : '',
      ownerName ? `Titular: ${ownerName}.` : '',
      identification
        ? `Identificación: ${identification}.`
        : '',
    ].filter(Boolean);

    parts.push(bankParts.join(' '));
  }

  const cleanConditions = String(
    conditions || ''
  ).trim();

  if (cleanConditions) {
    parts.push(cleanConditions);
  }

  return parts.join('\n\n');
}
