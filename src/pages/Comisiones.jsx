import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getCotizaciones } from '../lib/cotizacionesService';
import { supabase } from '../lib/supabaseClient';
import { getMyProfile } from '../lib/profileService';

export default function Comisiones({ goHome }) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [profile, setProfile] = useState(null);
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    try {
      setCargando(true);

      const perfil = await getMyProfile();
      setProfile(perfil);

      const data = await getCotizaciones();
      const conComision = data.filter((c) => Number(c.comision || 0) > 0);

      const visibles =
        perfil?.rol === 'admin'
          ? conComision
          : conComision.filter((c) => c.vendedor_id === perfil?.id);

      setCotizaciones(visibles);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'No se pudieron cargar las comisiones.');
    } finally {
      setCargando(false);
    }
  }

  function money(valor) {
    return `RD$ ${Number(valor || 0).toLocaleString('es-DO')}`;
  }

  function fechaCorta(fecha) {
    if (!fecha) return '--';

    return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  async function cambiarEstado(id, estadoActual) {
    const nuevoEstado = estadoActual === 'Cobrada' ? 'Pendiente' : 'Cobrada';

    try {
      const { error } = await supabase
        .from('cotizaciones')
        .update({
          comision_estado: nuevoEstado,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success(
        nuevoEstado === 'Cobrada'
          ? 'Comisión marcada como cobrada.'
          : 'Comisión marcada como pendiente.'
      );

      await cargar();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'No se pudo actualizar la comisión.');
    }
  }

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return cotizaciones.filter((c) => {
      const estado = c.comision_estado || 'Pendiente';
      const coincideEstado = !estadoFiltro || estado === estadoFiltro;

      const contenido = [
        c.numero,
        c.clientes?.nombre,
        c.nombre_evento,
        c.tipo_evento,
        c.venue,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const coincideBusqueda = !texto || contenido.includes(texto);

      return coincideEstado && coincideBusqueda;
    });
  }, [cotizaciones, estadoFiltro, busqueda]);

  const totalComisiones = filtradas.reduce(
    (sum, c) => sum + Number(c.comision || 0),
    0
  );

  const totalPendientes = filtradas
    .filter((c) => (c.comision_estado || 'Pendiente') !== 'Cobrada')
    .reduce((sum, c) => sum + Number(c.comision || 0), 0);

  const totalCobradas = filtradas
    .filter((c) => c.comision_estado === 'Cobrada')
    .reduce((sum, c) => sum + Number(c.comision || 0), 0);

  return (
    <div className="dashboard comisiones-page">
      <div className="top-bar">
        <div>
          <h1>Comisiones</h1>
          <p>
            {profile?.rol === 'admin'
              ? 'Todas las comisiones generadas'
              : 'Tus comisiones generadas'}
          </p>
        </div>

        <button type="button" onClick={goHome}>
          ← Dashboard
        </button>
      </div>

      <section className="comisiones-resumen">
        <div className="comision-resumen-card total">
          <span>Total comisiones</span>
          <strong>{money(totalComisiones)}</strong>
        </div>

        <div className="comision-resumen-card cantidad">
          <span>Cotizaciones con comisión</span>
          <strong>{filtradas.length}</strong>
        </div>

        <div className="comision-resumen-card pendiente">
          <span>Pendientes</span>
          <strong>{money(totalPendientes)}</strong>
        </div>

        <div className="comision-resumen-card cobrada">
          <span>Cobradas</span>
          <strong>{money(totalCobradas)}</strong>
        </div>
      </section>

      <div className="comisiones-filtros">
        <input
          type="search"
          placeholder="Buscar por número, cliente, evento o venue..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Cobrada">Cobrada</option>
        </select>
      </div>

      <div className="comisiones-table">
        <div className="comisiones-table-header" aria-hidden="true">
          <span>Cotización</span>
          <span>Cliente / Evento</span>
          <span>Fecha</span>
          <span>Total</span>
          <span>Comisión</span>
          <span>Estado</span>
          <span>Acción</span>
        </div>

        {cargando ? (
          <div className="comisiones-empty">Cargando comisiones...</div>
        ) : filtradas.length === 0 ? (
          <div className="comisiones-empty">
            No hay comisiones registradas con esos filtros.
          </div>
        ) : (
          filtradas.map((c) => {
            const estadoComision = c.comision_estado || 'Pendiente';
            const esCobrada = estadoComision === 'Cobrada';

            return (
              <article className="comision-row" key={c.id}>
                <div className="comision-numero" data-label="Cotización">
                  {c.numero || `#${c.id}`}
                </div>

                <div className="comision-cliente" data-label="Cliente / Evento">
                  <strong>{c.clientes?.nombre || 'Cliente'}</strong>
                  <span>{c.nombre_evento || c.tipo_evento || 'Evento'}</span>
                  {c.venue && <small>{c.venue}</small>}
                </div>

                <div className="comision-fecha" data-label="Fecha">
                  {fechaCorta(c.fecha_evento)}
                </div>

                <div className="comision-total" data-label="Total">
                  {money(c.total)}
                </div>

                <div className="comision-monto" data-label="Comisión">
                  {money(c.comision)}
                </div>

                <div data-label="Estado">
                  <span
                    className={`comision-badge ${
                      esCobrada ? 'cobrada' : 'pendiente'
                    }`}
                  >
                    {estadoComision}
                  </span>
                </div>

                <div className="comision-accion">
                  <button
                    type="button"
                    className={esCobrada ? 'secondary-state-btn' : ''}
                    onClick={() => cambiarEstado(c.id, estadoComision)}
                  >
                    {esCobrada ? 'Marcar pendiente' : 'Marcar cobrada'}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
