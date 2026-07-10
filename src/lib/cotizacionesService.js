import { supabase } from './supabaseClient';
import {
  buildBusinessProfileSnapshot,
  getBusinessProfileForQuotes,
  renderBusinessPolicies,
} from './profileService';

const COTIZACION_SELECT = `
  *,
  clientes (*),
  provincias (*)
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

async function prepareNewCotizacionPayload(
  payloadBase
) {
  if (
    payloadBase.perfil_negocio_snapshot &&
    payloadBase.politicas_condiciones
  ) {
    return payloadBase;
  }

  const snapshotFields =
    await createBusinessSnapshotFields();

  return {
    ...payloadBase,
    ...snapshotFields,
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

export async function saveCotizacion(
  cotizacion
) {
  if (cotizacion.id) {
    const id = cotizacion.id;
    const payload = { ...cotizacion };

    delete payload.id;
    delete payload.clientes;
    delete payload.provincias;
    delete payload.vendedor;
    delete payload.created_at;

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

  delete payloadBase.id;
  delete payloadBase.clientes;
  delete payloadBase.provincias;
  delete payloadBase.vendedor;
  delete payloadBase.created_at;
  delete payloadBase.updated_at;

  const payloadConSnapshot =
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
    ...payloadConSnapshot,
    numero,
    created_by: userData?.user?.id || null,
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

  query = query.order('created_at', {
    ascending: false,
  });

  const { data, error } = await query;

  if (error) throw error;

  return data;
}

export async function getCotizacionById(id) {
  const { data, error } = await supabase
    .from('cotizaciones')
    .select(COTIZACION_SELECT)
    .eq('id', id)
    .single();

  if (error) throw error;

  return freezeLegacyCotizacion(data);
}

export async function duplicarCotizacion(id) {
  const original =
    await getCotizacionById(id);

  const copia = { ...original };

  delete copia.id;
  delete copia.numero;
  delete copia.created_at;
  delete copia.updated_at;
  delete copia.clientes;
  delete copia.provincias;

  // La cotización duplicada obtiene las
  // políticas y la firma vigentes.
  delete copia.perfil_negocio_snapshot;
  delete copia.politicas_condiciones;

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