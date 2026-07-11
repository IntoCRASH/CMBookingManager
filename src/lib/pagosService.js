import { supabase } from './supabaseClient';
import { requireWorkspaceId } from './workspaceService';

export async function getPagosByCotizacion(cotizacionId, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from('pagos')
    .select('*')
    .eq('workspace_id', currentWorkspaceId)
    .eq('cotizacion_id', cotizacionId)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function savePago(pago, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const payload = {
    workspace_id: currentWorkspaceId,
    cotizacion_id: pago.cotizacion_id,
    fecha: pago.fecha || null,
    monto: Number(pago.monto || 0),
    metodo: String(pago.metodo || 'Efectivo').trim(),
    referencia: String(pago.referencia || '').trim() || null,
    observaciones: String(pago.observaciones || '').trim() || null,
  };

  if (!payload.cotizacion_id) {
    throw new Error('La cotización del pago es obligatoria.');
  }

  if (payload.monto <= 0) {
    throw new Error('El monto del pago debe ser mayor que cero.');
  }

  if (pago.id) {
    const { data, error } = await supabase
      .from('pagos')
      .update(payload)
      .eq('id', pago.id)
      .eq('workspace_id', currentWorkspaceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('pagos')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePago(id, workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { error } = await supabase
    .from('pagos')
    .delete()
    .eq('id', id)
    .eq('workspace_id', currentWorkspaceId);

  if (error) throw error;
  return true;
}

export function calcularResumenPagos(totalCotizacion, pagos) {
  const total = Number(totalCotizacion || 0);
  const totalPagado = (Array.isArray(pagos) ? pagos : []).reduce(
    (sum, pago) => sum + Number(pago.monto || 0),
    0
  );
  const balance = Math.max(total - totalPagado, 0);

  return {
    total,
    totalPagado,
    balance,
    saldado: balance <= 0,
  };
}
