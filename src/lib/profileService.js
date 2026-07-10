import { supabase } from './supabaseClient';

const BUSINESS_PROFILE_BUCKET = 'perfiles-negocio';
const MAX_PNG_SIZE = 5 * 1024 * 1024;
const SIGNED_URL_DURATION = 60 * 60 * 6;

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;

  if (!data?.user) {
    throw new Error('No hay una sesión activa.');
  }

  return data.user;
}

async function createSignedAssetUrl(path) {
  if (!path) return '';

  const { data, error } = await supabase.storage
    .from(BUSINESS_PROFILE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_DURATION);

  if (error) {
    console.error('No se pudo crear la URL temporal del archivo:', error);
    return '';
  }

  return data?.signedUrl || '';
}

async function includeAssetUrls(profile) {
  if (!profile) return null;

  const [logoUrl, firmaUrl] = await Promise.all([
    createSignedAssetUrl(profile.logo_path),
    createSignedAssetUrl(profile.firma_path),
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

export async function getMyBusinessProfile() {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('perfiles_negocio')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;

  return includeAssetUrls(data);
}

export async function uploadMyBusinessAsset(file, assetType) {
  const user = await getAuthenticatedUser();

  if (!file) {
    throw new Error('No se seleccionó ningún archivo.');
  }

  const normalizedType = String(assetType || '').trim().toLowerCase();

  if (!['logo', 'firma'].includes(normalizedType)) {
    throw new Error('Tipo de archivo de perfil inválido.');
  }

  const isPng =
    file.type === 'image/png' ||
    String(file.name || '').toLowerCase().endsWith('.png');

  if (!isPng) {
    throw new Error('El archivo debe estar en formato PNG.');
  }

  if (file.size > MAX_PNG_SIZE) {
    throw new Error('El archivo PNG no puede superar los 5 MB.');
  }

  const path = `${user.id}/${normalizedType}.png`;

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
    url: await createSignedAssetUrl(path),
  };
}

export async function saveMyBusinessProfile(profile) {
  const user = await getAuthenticatedUser();

  const porcentajeAdelanto = Number(profile.porcentaje_adelanto ?? 0);

  const payload = {
    user_id: user.id,
    nombre_completo: String(profile.nombre_completo || '').trim(),
    direccion: String(profile.direccion || '').trim(),
    ciudad: String(profile.ciudad || '').trim(),
    pais: String(profile.pais || '').trim(),
    codigo_postal: String(profile.codigo_postal || '').trim(),
    telefono: String(profile.telefono || '').trim(),
    identificacion: String(profile.identificacion || '').trim(),
    cuenta_bancaria: String(profile.cuenta_bancaria || '').trim(),
    nombre_banco: String(profile.nombre_banco || '').trim(),
    porcentaje_adelanto: Number.isFinite(porcentajeAdelanto)
      ? porcentajeAdelanto
      : 0,
    condiciones_pago: String(profile.condiciones_pago || '').trim(),
    logo_path: String(profile.logo_path || '').trim(),
    firma_path: String(profile.firma_path || '').trim(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('perfiles_negocio')
    .upsert(payload, {
      onConflict: 'user_id',
    })
    .select()
    .single();

  if (error) throw error;

  if (payload.nombre_completo) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        nombre: payload.nombre_completo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) throw profileError;
  }

  return includeAssetUrls(data);
}
