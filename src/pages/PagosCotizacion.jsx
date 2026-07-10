import { useEffect, useState } from 'react';
import { getCotizacionById } from '../lib/cotizacionesService';
import {
  getPagosByCotizacion,
  savePago,
  deletePago,
  calcularResumenPagos,
} from '../lib/pagosService';

const pagoInicial = {
  fecha: '',
  monto: '',
  metodo: 'Efectivo',
  referencia: '',
  observaciones: '',
};

export default function PagosCotizacion({ cotizacionId, goBack }) {
  const [cotizacion, setCotizacion] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [form, setForm] = useState(pagoInicial);
  const [error, setError] = useState('');

  useEffect(() => {
    cargar();
  }, [cotizacionId]);

  async function cargar() {
    const cot = await getCotizacionById(cotizacionId);
    const pagosData = await getPagosByCotizacion(cotizacionId);

    setCotizacion(cot);
    setPagos(pagosData);
  }

  function cambiar(e) {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: value,
    });

    setError('');
  }

  async function guardarPago(e) {
    e.preventDefault();
    setError('');

    if (!form.monto || Number(form.monto) <= 0) {
      setError('El monto del pago es obligatorio.');
      return;
    }

    await savePago({
      ...form,
      cotizacion_id: cotizacionId,
    });

    setForm(pagoInicial);
    await cargar();
  }

  async function borrarPago(id) {
    if (!window.confirm('¿Eliminar este pago?')) return;

    await deletePago(id);
    await cargar();
  }

  function money(valor) {
    return `RD$ ${Number(valor || 0).toLocaleString('es-DO')}`;
  }

  function fecha(fechaValor) {
    if (!fechaValor) return '--';

    return new Date(`${fechaValor}T00:00:00`).toLocaleDateString('es-DO');
  }

  if (!cotizacion) {
    return <div className="dashboard">Cargando pagos...</div>;
  }

  const resumen = calcularResumenPagos(cotizacion.total, pagos);

  return (
    <div className="dashboard">
      <div className="top-bar">
        <div>
          <h1>Pagos</h1>
          <p>{cotizacion.numero} · {cotizacion.clientes?.nombre}</p>
        </div>

        <button type="button" onClick={goBack}>← Atrás</button>
      </div>

      <div className="pagos-resumen">
        <div>
          <span>Total</span>
          <strong>{money(resumen.total)}</strong>
        </div>

        <div>
          <span>Pagado</span>
          <strong>{money(resumen.totalPagado)}</strong>
        </div>

        <div>
          <span>Balance</span>
          <strong>{money(resumen.balance)}</strong>
        </div>

        <div>
          <span>Estado</span>
          <strong>{resumen.saldado ? 'Saldado' : 'Pendiente'}</strong>
        </div>
      </div>

      <form className="form-section" onSubmit={guardarPago}>
        <h2>Registrar pago</h2>

        <div className="form-grid">
          <div>
            <label>Fecha</label>
            <input
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={cambiar}
            />
          </div>

          <div>
            <label>Monto</label>
            <input
              type="number"
              name="monto"
              min="0"
              value={form.monto}
              onChange={cambiar}
            />
          </div>

          <div>
            <label>Método</label>
            <select name="metodo" value={form.metodo} onChange={cambiar}>
              <option>Efectivo</option>
              <option>Transferencia</option>
              <option>Depósito</option>
              <option>Tarjeta</option>
              <option>Otro</option>
            </select>
          </div>

          <div>
            <label>Referencia</label>
            <input
              type="text"
              name="referencia"
              value={form.referencia}
              onChange={cambiar}
            />
          </div>
        </div>

        <label>Observaciones</label>
        <textarea
          name="observaciones"
          value={form.observaciones}
          onChange={cambiar}
          rows="3"
        />

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          <button type="submit">Guardar pago</button>
        </div>
      </form>

      <div className="pagos-list">
        {pagos.map((p) => (
          <div key={p.id} className="pago-item">
            <div>
              <strong>{money(p.monto)}</strong>
              <p>{fecha(p.fecha)} · {p.metodo}</p>
              {p.referencia && <p>Ref: {p.referencia}</p>}
              {p.observaciones && <p>{p.observaciones}</p>}
            </div>

            <button onClick={() => borrarPago(p.id)}>
              Eliminar
            </button>
          </div>
        ))}

        {pagos.length === 0 && (
          <p>No hay pagos registrados para esta cotización.</p>
        )}
      </div>
    </div>
  );
}