import { supabase } from './supabaseClient';
import { requireWorkspaceId } from './workspaceService';
import { DEFAULT_CONTRACT_TEMPLATE } from './contratoTemplate';

const BUSINESS_PROFILE_BUCKET = 'perfiles-negocio';
const MAX_PNG_SIZE = 5 * 1024 * 1024;
const SIGNED_URL_DURATION = 60 * 60 * 6;

export const DEFAULT_BUSINESS_POLICIES_TEMPLATE = `La fecha se considera reservada únicamente después de recibir el avance acordado.

El balance restante deberá completarse conforme a las condiciones indicadas en la cotización.

Cualquier cambio en la fecha, horario, lugar, formato artístico o requerimientos técnicos puede producir ajustes en el precio.

Las cancelaciones y reprogramaciones estarán sujetas a los términos acordados y a la disponibilidad del Artista.`;

export { DEFAULT_CONTRACT_TEMPLATE };

export const DEFAULT_CONTRACT_SETTINGS = {
  cantidad_sets_contrato: 2,
  duracion_set_contrato: 45,
  duracion_receso_contrato: 30,
  dias_anticipo_contrato: 30,
  dias_saldo_contrato: 7,
  tarifa_hora_extra_contrato: 0,
  dias_cancelacion_contrato: 14,
  servicios_incluidos_contrato:
    'Presentación artística conforme al formato contratado.',
  servicios_excluidos_contrato:
    'DJ, luces, tarima, energía eléctrica y cualquier servicio no indicado expresamente.',
  hospitalidad_contrato:
    'Área privada y segura, agua potable, hielo, vasos, servilletas y alimentación para el equipo cuando corresponda.',
  transporte_hospedaje_contrato:
    'Según lo incluido en la cotización y las coordinaciones escritas entre las partes.',
  jurisdiccion_contrato:
    'Santiago de los Caballeros',
  lugar_firma_contrato:
    'Santiago de los Caballeros, República Dominicana',
  anexos_contrato:
    'Cotización aprobada y rider técnico, cuando aplique.',
  plantilla_contrato:
    DEFAULT_CONTRACT_TEMPLATE,
};

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
      prefijo_cotizacion,
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
    prefijo_cotizacion:
      workspace.prefijo_cotizacion || '',
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

  const prefijoCotizacion = String(
    artistProfile.prefijo_cotizacion || ''
  )
    .trim()
    .toUpperCase();

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

  if (
    !/^[A-Z0-9]{2,8}$/.test(
      prefijoCotizacion
    )
  ) {
    throw new Error(
      'El prefijo debe tener entre 2 y 8 letras o números, sin espacios.'
    );
  }

  const { data, error } = await supabase
    .from('workspaces')
    .update({
      nombre: nombreArtistico,
      email_contacto: emailArtistico || null,
      telefono_contacto: telefonoArtistico || null,
      spotify_url: spotifyUrl || null,
      prefijo_cotizacion:
        prefijoCotizacion,
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
      prefijo_cotizacion,
      activo
    `)
    .single();

  if (error) {
    if (
      error.code === '23505' &&
      String(
        error.message || ''
      ).includes('prefijo_cotizacion')
    ) {
      throw new Error(
        'Ese prefijo de cotización ya pertenece a otro Artista. Elige uno diferente.'
      );
    }

    throw error;
  }

  return {
    workspace_id: data.id,
    owner_user_id: data.owner_user_id,
    nombre_artistico: data.nombre || '',
    email_artistico: data.email_contacto || '',
    telefono_artistico: data.telefono_contacto || '',
    spotify_url: data.spotify_url || '',
    prefijo_cotizacion:
      data.prefijo_cotizacion || '',
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

  const [
    basicResult,
    personalResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),

    supabase
      .from('perfiles_personales')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (basicResult.error) {
    throw basicResult.error;
  }

  if (personalResult.error) {
    throw personalResult.error;
  }

  return {
    ...basicResult.data,
    ...(personalResult.data || {}),
    nombre:
      personalResult.data
        ?.nombre_completo ||
      basicResult.data?.nombre ||
      '',
    email:
      user.email ||
      basicResult.data?.email ||
      '',
  };
}

export async function saveMyPersonalProfile(
  profile
) {
  const user = await getAuthenticatedUser();

  const nombre = String(
    profile?.nombre_completo ||
    profile?.nombre ||
    ''
  ).trim();

  if (!nombre) {
    throw new Error(
      'El nombre completo es obligatorio.'
    );
  }

  const payload = {
    user_id: user.id,
    nombre_completo: nombre,
    telefono: String(
      profile?.telefono || ''
    ).trim(),
    direccion: String(
      profile?.direccion || ''
    ).trim(),
    ciudad: String(
      profile?.ciudad || ''
    ).trim(),
    pais: String(
      profile?.pais || ''
    ).trim(),
    codigo_postal: String(
      profile?.codigo_postal || ''
    ).trim(),
    identificacion: String(
      profile?.identificacion || ''
    ).trim(),
    nombre_banco: String(
      profile?.nombre_banco || ''
    ).trim(),
    cuenta_bancaria: String(
      profile?.cuenta_bancaria || ''
    ).trim(),
    updated_at:
      new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('perfiles_personales')
    .upsert(payload, {
      onConflict: 'user_id',
    })
    .select()
    .single();

  if (error) throw error;

  const { error: basicError } =
    await supabase
      .from('profiles')
      .update({
        nombre,
        updated_at:
          new Date().toISOString(),
      })
      .eq('id', user.id);

  if (basicError) throw basicError;

  return {
    ...data,
    nombre,
    email: user.email || '',
  };
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

  const managerArtisticoPorcentaje = Number(
    profile.manager_artistico_porcentaje ?? 0
  );

  const managerArtisticoPorcentajeSeguro = Number.isFinite(
    managerArtisticoPorcentaje
  )
    ? Math.min(100, Math.max(0, managerArtisticoPorcentaje))
    : 0;

  const impuestoPorcentaje = Number(
    profile.impuesto_porcentaje ?? 0
  );

  const impuestoPorcentajeSeguro = Number.isFinite(
    impuestoPorcentaje
  )
    ? Math.min(100, Math.max(0, impuestoPorcentaje))
    : 0;

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

    manager_artistico_activo: Boolean(
      profile.manager_artistico_activo &&
        managerArtisticoPorcentajeSeguro > 0
    ),

    manager_artistico_nombre: String(
      profile.manager_artistico_nombre || ''
    ).trim(),

    manager_artistico_porcentaje:
      managerArtisticoPorcentajeSeguro,

    impuesto_activo_por_defecto: Boolean(
      profile.impuesto_activo_por_defecto &&
        impuestoPorcentajeSeguro > 0
    ),

    impuesto_porcentaje: impuestoPorcentajeSeguro,

    condiciones_pago: String(
      profile.condiciones_pago || ''
    ).trim(),

    plantilla_contrato: String(
      profile.plantilla_contrato ||
        DEFAULT_CONTRACT_TEMPLATE
    ).trim(),

    cantidad_sets_contrato: Math.max(
      1,
      Number(profile.cantidad_sets_contrato || 2)
    ),

    duracion_set_contrato: Math.max(
      1,
      Number(profile.duracion_set_contrato || 45)
    ),

    duracion_receso_contrato: Math.max(
      0,
      Number(profile.duracion_receso_contrato || 0)
    ),

    dias_anticipo_contrato: Math.max(
      0,
      Number(profile.dias_anticipo_contrato || 0)
    ),

    dias_saldo_contrato: Math.max(
      0,
      Number(profile.dias_saldo_contrato || 0)
    ),

    tarifa_hora_extra_contrato: Math.max(
      0,
      Number(profile.tarifa_hora_extra_contrato || 0)
    ),

    dias_cancelacion_contrato: Math.max(
      0,
      Number(profile.dias_cancelacion_contrato || 0)
    ),

    servicios_incluidos_contrato: String(
      profile.servicios_incluidos_contrato || ''
    ).trim(),

    servicios_excluidos_contrato: String(
      profile.servicios_excluidos_contrato || ''
    ).trim(),

    hospitalidad_contrato: String(
      profile.hospitalidad_contrato || ''
    ).trim(),

    transporte_hospedaje_contrato: String(
      profile.transporte_hospedaje_contrato || ''
    ).trim(),

    jurisdiccion_contrato: String(
      profile.jurisdiccion_contrato || ''
    ).trim(),

    lugar_firma_contrato: String(
      profile.lugar_firma_contrato || ''
    ).trim(),

    anexos_contrato: String(
      profile.anexos_contrato || ''
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

    manager_artistico_activo: Boolean(
      profile.manager_artistico_activo
    ),
    manager_artistico_nombre:
      profile.manager_artistico_nombre || '',
    manager_artistico_porcentaje: Number(
      profile.manager_artistico_porcentaje || 0
    ),

    impuesto_activo_por_defecto: Boolean(
      profile.impuesto_activo_por_defecto
    ),
    impuesto_porcentaje: Number(
      profile.impuesto_porcentaje || 0
    ),

    condiciones_pago: profile.condiciones_pago || '',

    logo_path: profile.logo_path || '',
    firma_path: profile.firma_path || '',

    captured_at: new Date().toISOString(),
  };
}

function policyTemplateValues(snapshot = {}) {
  const advance = Number(
    snapshot.porcentaje_adelanto || 0
  );

  const normalizedAdvance = Number.isFinite(advance)
    ? Math.max(0, Math.min(100, advance))
    : 0;

  const remaining = Math.max(
    0,
    100 - normalizedAdvance
  );

  return {
    nombre_completo: String(
      snapshot.nombre_completo ||
        snapshot.nombre_legal ||
        snapshot.nombre_artistico ||
        ''
    ).trim(),
    identificacion: String(
      snapshot.identificacion || ''
    ).trim(),
    nombre_banco: String(
      snapshot.nombre_banco || ''
    ).trim(),
    cuenta_bancaria: String(
      snapshot.cuenta_bancaria || ''
    ).trim(),
    porcentaje_adelanto: String(normalizedAdvance),
    porcentaje_restante: String(remaining),
    telefono: String(
      snapshot.telefono ||
        snapshot.telefono_artistico ||
        ''
    ).trim(),
    direccion: String(
      snapshot.direccion || ''
    ).trim(),
    ciudad: String(
      snapshot.ciudad || ''
    ).trim(),
    pais: String(
      snapshot.pais || ''
    ).trim(),
    codigo_postal: String(
      snapshot.codigo_postal || ''
    ).trim(),
    nombre_artistico: String(
      snapshot.nombre_artistico || ''
    ).trim(),
    email_artistico: String(
      snapshot.email_artistico ||
        snapshot.email ||
        ''
    ).trim(),
  };
}

export function renderBusinessPolicyTemplate(
  conditions,
  snapshot = {}
) {
  const template = String(
    conditions || ''
  ).trim();

  if (!template) return '';

  const values = policyTemplateValues(snapshot);

  return template.replace(
    /\{\{\{?\s*([a-zA-Z0-9_]+)\s*\}?\}\}/g,
    (_match, variableName) =>
      Object.prototype.hasOwnProperty.call(
        values,
        variableName
      )
        ? values[variableName]
        : ''
  );
}

export function renderBusinessPolicies(
  conditions,
  snapshot = {}
) {
  const parts = [];

  const rawConditions = String(
    conditions || ''
  ).trim();

  const advance = Number(
    snapshot.porcentaje_adelanto || 0
  );

  const templateIncludesAdvance =
    /\{\{\{?\s*porcentaje_(?:adelanto|restante)\s*\}?\}\}/i.test(
      rawConditions
    );

  if (advance > 0 && !templateIncludesAdvance) {
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

  const templateIncludesBankData =
    /\{\{\{?\s*(?:nombre_banco|cuenta_bancaria)\s*\}?\}\}/i.test(
      rawConditions
    );

  if ((bank || account) && !templateIncludesBankData) {
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

  const renderedConditions =
    renderBusinessPolicyTemplate(
      rawConditions,
      snapshot
    );

  if (renderedConditions) {
    parts.push(renderedConditions);
  }

  return parts.join('\n\n');
}
