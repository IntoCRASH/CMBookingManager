import { supabase } from './supabaseClient';
import {
  buildBusinessProfileSnapshot,
  getBusinessProfileForQuotes,
  renderBusinessPolicies,
} from './profileService';
import { getArtistaById } from './artistasService';

const COTIZACION_SELECT = `
  *,
  clientes (*),
  provincias (*),
  artistas (*)
`;

async function createBusinessSnapshotFields() {
  const businessProfile =
    await getBusinessProfileForQuotes();

  if (!businessProfile) {
    throw new Error(
      'No existe un perfil de negocio configurado. ' +
        'Completa el Perfil antes de crear cotizaciones.'
    );
  }

  const snapshot =
    buildBusinessProfileSnapshot(
      businessProfile
    );

  return {
    perfil_negocio_snapshot: snapshot,

    politicas_condiciones:
      renderBusinessPolicies(
        snapshot.condiciones_pago,
        snapshot
      ),
  };
}

async function createArtistSnapshotFields(
  artistaId
) {
  if (!artistaId) {
    throw new Error(
      'Selecciona un artista para la cotización.'
    );
  }

  const artista = await getArtistaById(
    artistaId
  );

  if (!artista?.activo) {
    throw new Error(
      'El artista seleccionado está inactivo.'
    );
  }

  if (
    artista.estado_autorizacion !==
    'autorizado'
  ) {
    throw new Error(
      'El artista todavía no ha autorizado la comisión.'
    );
  }

  const comisionPorcentaje = Number(
    artista.comision_porcentaje || 0
  );

  const snapshot = {
    id: artista.id,
    nombre: artista.nombre || '',
    email: artista.email || '',
    spotify_url: artista.spotify_url || '',
    comision_porcentaje: comisionPorcentaje,
    estado_autorizacion:
      artista.estado_autorizacion,
    autorizado_at:
      artista.autorizado_at || null,
    capturado_en: new Date().toISOString(),
  };

  return {
    artista_nombre_snapshot:
      snapshot.nombre,

    artista_email_snapshot:
      snapshot.email,

    artista_spotify_url_snapshot:
      snapshot.spotify_url,

    comision_porcentaje_snapshot:
      comisionPorcentaje,

    comision_autorizada_snapshot: true,
    artista_snapshot: snapshot,
  };
}

async function getOwnedConfiguration(
  table,
  id,
  artistaId,
  label
) {
  if (!id) {
    throw new Error(
      `Selecciona ${label} para la cotización.`
    );
  }

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .eq('artista_id', artistaId)
    .single();

  if (error) {
    throw new Error(
      `${label} no pertenece al artista seleccionado.`
    );
  }

  return data;
}

async function createConfigurationSnapshotFields(
  cotizacion
) {
  const artistaId = Number(
    cotizacion.artista_id
  );

  if (
    !Number.isInteger(artistaId) ||
    artistaId <= 0
  ) {
    throw new Error(
      'Selecciona un artista válido.'
    );
  }

  const [
    zona,
    formato,
    tipoEvento,
  ] = await Promise.all([
    getOwnedConfiguration(
      'provincias',
      cotizacion.provincia_id,
      artistaId,
      'una zona'
    ),

    getOwnedConfiguration(
      'formatos',
      cotizacion.formato_id,
      artistaId,
      'un formato'
    ),

    getOwnedConfiguration(
      'tipos_evento_config',
      cotizacion.tipo_evento_config_id,
      artistaId,
      'un tipo de evento'
    ),
  ]);

  const capturadoEn =
    new Date().toISOString();

  return {
    zona_nombre_snapshot:
      zona.nombre || '',

    formato_nombre_snapshot:
      formato.nombre || '',

    tipo_evento_nombre_snapshot:
      tipoEvento.nombre || '',

    zona_snapshot: {
      ...zona,
      capturado_en: capturadoEn,
    },

    formato_snapshot: {
      ...formato,
      capturado_en: capturadoEn,
    },

    tipo_evento_snapshot: {
      ...tipoEvento,
      capturado_en: capturadoEn,
    },

    configuracion_artista_snapshot: {
      artista_id: artistaId,
      zona: {
        ...zona,
      },
      formato: {
        ...formato,
      },
      tipo_evento: {
        ...tipoEvento,
      },
      capturado_en: capturadoEn,
    },
  };
}

async function prepareNewCotizacionPayload(
  payloadBase
) {
  const [
    businessSnapshotFields,
    artistSnapshotFields,
    configurationSnapshotFields,
  ] = await Promise.all([
    payloadBase.perfil_negocio_snapshot &&
    payloadBase.politicas_condiciones
      ? Promise.resolve({})
      : createBusinessSnapshotFields(),

    createArtistSnapshotFields(
      payloadBase.artista_id
    ),

    createConfigurationSnapshotFields(
      payloadBase
    ),
  ]);

  return {
    ...payloadBase,
    ...businessSnapshotFields,
    ...artistSnapshotFields,
    ...configurationSnapshotFields,
  };
}

async function freezeLegacyCotizacion(
  cotizacion
) {
  if (
    cotizacion?.perfil_negocio_snapshot &&
    cotizacion?.politicas_condiciones
  ) {
    return cotizacion;
  }

  const snapshotFields =
    await createBusinessSnapshotFields();

  const { data, error } = await supabase
    .from('cotizaciones')
    .update({
      ...snapshotFields,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cotizacion.id)
    .select(COTIZACION_SELECT)
    .single();

  if (error) throw error;

  return data;
}

async function getCotizacionRawById(id) {
  const { data, error } = await supabase
    .from('cotizaciones')
    .select(COTIZACION_SELECT)
    .eq('id', id)
    .single();

  if (error) throw error;

  return data;
}

function removeJoinedAndSystemFields(
  payload
) {
  delete payload.id;
  delete payload.clientes;
  delete payload.provincias;
  delete payload.artistas;
  delete payload.vendedor;
  delete payload.created_at;
}

function removeConfigurationSnapshots(
  payload
) {
  delete payload.zona_nombre_snapshot;
  delete payload.formato_nombre_snapshot;
  delete payload.tipo_evento_nombre_snapshot;
  delete payload.zona_snapshot;
  delete payload.formato_snapshot;
  delete payload.tipo_evento_snapshot;
  delete payload.configuracion_artista_snapshot;
}

export async function saveCotizacion(
  cotizacion
) {
  if (cotizacion.id) {
    const id = cotizacion.id;
    const payload = { ...cotizacion };
    const actual =
      await getCotizacionRawById(id);

    removeJoinedAndSystemFields(payload);
    removeConfigurationSnapshots(payload);

    const artistaCambio =
      String(actual?.artista_id ?? '') !==
      String(payload.artista_id ?? '');

    if (artistaCambio) {
      const artistSnapshotFields =
        await createArtistSnapshotFields(
          payload.artista_id
        );

      Object.assign(
        payload,
        artistSnapshotFields
      );
    } else {
      delete payload.artista_nombre_snapshot;
      delete payload.artista_email_snapshot;
      delete payload.artista_spotify_url_snapshot;
      delete payload.comision_porcentaje_snapshot;
      delete payload.comision_autorizada_snapshot;
      delete payload.artista_snapshot;
    }

    const configurationSnapshotFields =
      await createConfigurationSnapshotFields(
        payload
      );

    Object.assign(
      payload,
      configurationSnapshotFields
    );

    payload.updated_at =
      new Date().toISOString();

    const { data, error } = await supabase
      .from('cotizaciones')
      .update(payload)
      .eq('id', id)
      .select(COTIZACION_SELECT)
      .single();

    if (error) throw error;

    return data;
  }

  const payloadBase = { ...cotizacion };

  removeJoinedAndSystemFields(
    payloadBase
  );

  delete payloadBase.updated_at;
  removeConfigurationSnapshots(
    payloadBase
  );

  const payloadConSnapshots =
    await prepareNewCotizacionPayload(
      payloadBase
    );

  const {
    data: numero,
    error: errorNumero,
  } = await supabase.rpc(
    'generar_numero_cotizacion'
  );

  if (errorNumero) throw errorNumero;

  const { data: userData } =
    await supabase.auth.getUser();

  const payload = {
    ...payloadConSnapshots,
    numero,
    created_by:
      userData?.user?.id || null,
  };

  const { data, error } = await supabase
    .from('cotizaciones')
    .insert([payload])
    .select(COTIZACION_SELECT)
    .single();

  if (error) throw error;

  return data;
}

export async function getCotizaciones(
  filtro = {}
) {
  let query = supabase
    .from('cotizaciones')
    .select(COTIZACION_SELECT);

  if (filtro.estado) {
    query = query.eq(
      'estado',
      filtro.estado
    );
  }

  if (filtro.artista_id) {
    query = query.eq(
      'artista_id',
      filtro.artista_id
    );
  }

  query = query.order('created_at', {
    ascending: false,
  });

  const { data, error } = await query;

  if (error) throw error;

  return data;
}

export async function getCotizacionById(id) {
  const data =
    await getCotizacionRawById(id);

  return freezeLegacyCotizacion(data);
}

export async function duplicarCotizacion(id) {
  const original =
    await getCotizacionById(id);

  const copia = { ...original };

  removeJoinedAndSystemFields(copia);
  delete copia.numero;
  delete copia.updated_at;

  // La cotización duplicada obtiene
  // las políticas, firma, artista y
  // configuraciones vigentes.
  delete copia.perfil_negocio_snapshot;
  delete copia.politicas_condiciones;

  delete copia.artista_nombre_snapshot;
  delete copia.artista_email_snapshot;
  delete copia.artista_spotify_url_snapshot;
  delete copia.comision_porcentaje_snapshot;
  delete copia.comision_autorizada_snapshot;
  delete copia.artista_snapshot;

  removeConfigurationSnapshots(copia);

  return saveCotizacion(copia);
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
