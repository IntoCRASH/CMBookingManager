import { supabase } from './supabaseClient';

const BUSINESS_PROFILE_BUCKET = 'perfiles-negocio';
const MAX_PNG_SIZE = 5 * 1024 * 1024;
const SIGNED_URL_DURATION = 60 * 60 * 6;

export const DEFAULT_BUSINESS_POLICIES_TEMPLATE = `El uso de nuestros proveedores de sonido es altamente recomendado, pero no obligatorio.

Tenga en cuenta que, de no optar por nuestra recomendación de proveedor de sonido, se proveerá un Rider Técnico con requerimientos esenciales muy específicos.

Nuestra presentación tiene una duración de **una hora y treinta minutos (1:30)**, de forma continua o dividida en dos (2) sets de cuarenta y cinco (45) minutos cada uno. Debe especificar su preferencia.

Se debe proveer **amenidades y refrigerio**, mesa y sillas con snack o almuerzo, según lo acordado con el cliente.

Para separar la fecha es imprescindible realizar un adelanto del **{{porcentaje_adelanto}}% del monto acordado** a la cuenta **{{cuenta_bancaria}}** del **{{nombre_banco}}**, a nombre de **{{nombre_completo}}**, Cédula o ID **{{identificacion}}**, con su nombre adjunto y fecha del evento como concepto.

El {{porcentaje_restante}}% restante se requiere **EN EFECTIVO antes de iniciar la actividad.**

Nuestra tarifa incluye transporte y viáticos en localidades donde es necesario.

El {{porcentaje_adelanto}}% inicial no es reembolsable si el cliente cancela.

Posponer a una nueva fecha es necesario con veintiún (21) días de antelación a la fecha inicial.

Otras condiciones aplicables y contrato obligatorio podrían ser provistos al momento de solicitar la factura final para la contratación del artista y fecha deseada.

**¡Es un privilegio poder servirle. Estamos a su entera disposición!**`;

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
    createSignedAssetUrl(profile.logo_path),
    createSignedAssetUrl(profile.firma_path),
  ]);

  return {
    ...profile,
    logo_url: logoUrl,
    firma_url: firmaUrl,
  };
}

function normalizePercentage(value) {
  const numberValue = Number(value ?? 0);

  if (!Number.isFinite(numberValue)) return 0;

  return Math.min(Math.max(numberValue, 0), 100);
}

function stringValue(value) {
  return String(value ?? '').trim();
}

function createVersionToken() {
  const randomPart =
    globalThis.crypto?.randomUUID?.() ||
    Math.random().toString(36).slice(2);

  return `${Date.now()}-${randomPart}`;
}

export function buildBusinessProfileSnapshot(profile) {
  if (!profile) return null;

  const porcentajeAdelanto = normalizePercentage(
    profile.porcentaje_adelanto
  );

  return {
    perfil_negocio_id: profile.id || null,
    user_id: profile.user_id || null,

    nombre_completo: stringValue(
      profile.nombre_completo
    ),

    direccion: stringValue(profile.direccion),
    ciudad: stringValue(profile.ciudad),
    pais: stringValue(profile.pais),

    codigo_postal: stringValue(
      profile.codigo_postal
    ),

    telefono: stringValue(profile.telefono),

    identificacion: stringValue(
      profile.identificacion
    ),

    cuenta_bancaria: stringValue(
      profile.cuenta_bancaria
    ),

    nombre_banco: stringValue(
      profile.nombre_banco
    ),

    porcentaje_adelanto: porcentajeAdelanto,

    porcentaje_restante: Math.max(
      100 - porcentajeAdelanto,
      0
    ),

    condiciones_pago: stringValue(
      profile.condiciones_pago ||
        DEFAULT_BUSINESS_POLICIES_TEMPLATE
    ),

    logo_path: stringValue(profile.logo_path),
    firma_path: stringValue(profile.firma_path),
    capturado_en: new Date().toISOString(),
  };
}

export function renderBusinessPolicies(
  template,
  snapshot
) {
  const source = stringValue(
    template ||
      snapshot?.condiciones_pago ||
      DEFAULT_BUSINESS_POLICIES_TEMPLATE
  );

  const values = {
    nombre_completo: stringValue(
      snapshot?.nombre_completo
    ),

    direccion: stringValue(snapshot?.direccion),
    ciudad: stringValue(snapshot?.ciudad),
    pais: stringValue(snapshot?.pais),

    codigo_postal: stringValue(
      snapshot?.codigo_postal
    ),

    telefono: stringValue(snapshot?.telefono),

    identificacion: stringValue(
      snapshot?.identificacion
    ),

    cuenta_bancaria: stringValue(
      snapshot?.cuenta_bancaria
    ),

    nombre_banco: stringValue(
      snapshot?.nombre_banco
    ),

    porcentaje_adelanto: String(
      normalizePercentage(
        snapshot?.porcentaje_adelanto
      )
    ),

    porcentaje_restante: String(
      normalizePercentage(
        snapshot?.porcentaje_restante ??
          100 -
            normalizePercentage(
              snapshot?.porcentaje_adelanto
            )
      )
    ),
  };

  return source.replace(
    /\{\{\s*([a-z0-9_]+)\s*\}\}/gi,
    (_match, key) => values[key] ?? ''
  );
}

export async function getBusinessAssetUrl(path) {
  return createSignedAssetUrl(path);
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

export async function getBusinessProfileForQuotes() {
  const ownProfile = await getMyBusinessProfile();

  if (ownProfile) return ownProfile;

  const { data, error } = await supabase.rpc(
    'get_perfil_negocio_para_cotizacion'
  );

  if (error) throw error;

  const businessProfile = Array.isArray(data)
    ? data[0]
    : data;

  return includeAssetUrls(
    businessProfile || null
  );
}

export async function uploadMyBusinessAsset(
  file,
  assetType
) {
  const user = await getAuthenticatedUser();

  if (!file) {
    throw new Error(
      'No se seleccionó ningún archivo.'
    );
  }

  const normalizedType = String(
    assetType || ''
  )
    .trim()
    .toLowerCase();

  if (
    !['logo', 'firma'].includes(normalizedType)
  ) {
    throw new Error(
      'Tipo de archivo de perfil inválido.'
    );
  }

  const isPng =
    file.type === 'image/png' ||
    String(file.name || '')
      .toLowerCase()
      .endsWith('.png');

  if (!isPng) {
    throw new Error(
      'El archivo debe estar en formato PNG.'
    );
  }

  if (file.size > MAX_PNG_SIZE) {
    throw new Error(
      'El archivo PNG no puede superar los 5 MB.'
    );
  }

  const path =
    `${user.id}/${normalizedType}/` +
    `${createVersionToken()}.png`;

  const { error } = await supabase.storage
    .from(BUSINESS_PROFILE_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType: 'image/png',
      cacheControl: '3600',
    });

  if (error) throw error;

  return {
    path,
    url: await createSignedAssetUrl(path),
  };
}

export async function saveMyBusinessProfile(
  profile
) {
  const user = await getAuthenticatedUser();

  const porcentajeAdelanto =
    normalizePercentage(
      profile.porcentaje_adelanto
    );

  const payload = {
    user_id: user.id,

    nombre_completo: stringValue(
      profile.nombre_completo
    ),

    direccion: stringValue(profile.direccion),
    ciudad: stringValue(profile.ciudad),
    pais: stringValue(profile.pais),

    codigo_postal: stringValue(
      profile.codigo_postal
    ),

    telefono: stringValue(profile.telefono),

    identificacion: stringValue(
      profile.identificacion
    ),

    cuenta_bancaria: stringValue(
      profile.cuenta_bancaria
    ),

    nombre_banco: stringValue(
      profile.nombre_banco
    ),

    porcentaje_adelanto: porcentajeAdelanto,

    condiciones_pago: stringValue(
      profile.condiciones_pago ||
        DEFAULT_BUSINESS_POLICIES_TEMPLATE
    ),

    logo_path: stringValue(profile.logo_path),
    firma_path: stringValue(profile.firma_path),
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
    const { error: profileError } =
      await supabase
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