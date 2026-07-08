import { supabase } from './supabaseClient';

export async function getPagosByCotizacion(cotizacionId) {
  const { data, error } = await supabase
    .from('pagos')
    .select('*')
    .eq('cotizacion_id', cotizacionId)
    .order('fecha', { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function savePago(pago) {
  const { data: userData } = await supabase.auth.getUser();

  const payload = {
    cotizacion_id: pago.cotizacion_id,
    fecha: pago.fecha || new Date().toISOString().slice(0, 10),
    monto: Number(pago.monto || 0),
    metodo: pago.metodo || 'Efectivo',
    referencia: pago.referencia || null,
    observaciones: pago.observaciones || null,
    updated_at: new Date().toISOString(),
  };

  if (!pago.id) {
    payload.created_by = userData.user.id;
  }

  if (pago.id) {
    const { data, error } = await supabase
      .from('pagos')
      .update(payload)
      .eq('id', pago.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('pagos')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deletePago(id) {
  const { error } = await supabase
    .from('pagos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export function calcularResumenPagos(total, pagos) {
  const totalPagado = pagos.reduce(
    (sum, p) => sum + Number(p.monto || 0),
    0
  );

  const balance = Number(total || 0) - totalPagado;

  return {
    total: Number(total || 0),
    totalPagado,
    balance: balance < 0 ? 0 : balance,
    saldado: balance <= 0,
  };
}