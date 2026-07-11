import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  getCotizaciones,
  duplicarCotizacion,
  cancelarCotizacion,
  eliminarCotizacion,
} from '../lib/cotizacionesService';

export default function Cotizaciones({
  workspaceId,
  goBack,
  nuevaCotizacion,
  abrirCotizacion,
  editarCotizacion,
  abrirPagos,
}) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [estado, setEstado] = useState('');
  const [buscar, setBuscar] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargar();
  }, [workspaceId]);

  useEffect(() => {
    function cerrarMenu() {
      setMenuAbierto(null);
    }

    function cerrarConEscape(event) {
      if (event.key === 'Escape') {
        setMenuAbierto(null);
      }
    }

    document.addEventListener('click', cerrarMenu);
    document.addEventListener('keydown', cerrarConEscape);

    return () => {
      document.removeEventListener('click', cerrarMenu);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, []);

  async function cargar() {
    try {
      setCargando(true);

      const data = await getCotizaciones({
        workspaceId,
      });

      setCotizaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || 'No se pudieron cargar las cotizaciones.'
      );
    } finally {
      setCargando(false);
    }
  }

  const filtradas = useMemo(() => {
    const textoBusqueda = buscar.trim().toLowerCase();

    return cotizaciones.filter((cotizacion) => {
      const texto = [
        cotizacion.numero,
        cotizacion.clientes?.nombre,
        cotizacion.nombre_evento,
        cotizacion.tipo_evento,
        cotizacion.venue,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const cumpleTexto =
        !textoBusqueda || texto.includes(textoBusqueda);
      const cumpleEstado =
        !estado || cotizacion.estado === estado;

      return cumpleTexto && cumpleEstado;
    });
  }, [cotizaciones, buscar, estado]);

  function money(valor) {
    return `RD$ ${Number(valor || 0).toLocaleString('es-DO')}`;
  }

  function fechaCorta(fecha) {
    if (!fecha) return '--';

    return new Date(`${fecha}T00:00:00`).toLocaleDateString(
      'es-DO',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );
  }

  function claseEstado(valor) {
    return String(valor || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }

  async function duplicar(id) {
    if (!window.confirm('¿Duplicar esta cotización?')) return;

    try {
      setMenuAbierto(null);
      await duplicarCotizacion(id, workspaceId);
      toast.success('Cotización duplicada correctamente.');
      await cargar();
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || 'No se pudo duplicar la cotización.'
      );
    }
  }

  async function eliminar(id) {
    if (
      !window.confirm(
        '¿Eliminar definitivamente esta cotización?'
      )
    ) {
      return;
    }

    try {
      await eliminarCotizacion(id, workspaceId);

      setMenuAbierto(null);
      toast.success('Cotización eliminada correctamente.');
      await cargar();
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || 'No se pudo eliminar la cotización.'
      );
    }
  }

  async function cancelar(id) {
    if (!window.confirm('¿Cancelar esta cotización?')) return;

    try {
      setMenuAbierto(null);
      await cancelarCotizacion(id, workspaceId);
      toast.success('Cotización cancelada correctamente.');
      await cargar();
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || 'No se pudo cancelar la cotización.'
      );
    }
  }

  return (
    <div className="dashboard cotizaciones-page">
      <div className="top-bar">
        <div>
          <h1>Cotizaciones</h1>
          <p>
            {filtradas.length} registro
            {filtradas.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="top-bar-actions">
          <button
            type="button"
            className="primary-button"
            onClick={nuevaCotizacion}
          >
            + Nueva cotización
          </button>

          <button type="button" onClick={goBack}>
            ← Atrás
          </button>
        </div>
      </div>

      <div className="cotizaciones-filtros">
        <input
          type="search"
          placeholder="Buscar por número, cliente, evento o venue..."
          value={buscar}
          onChange={(event) => setBuscar(event.target.value)}
        />

        <select
          value={estado}
          onChange={(event) => setEstado(event.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Pendiente de aprobación">
            Pendiente de aprobación
          </option>
          <option value="Pendiente de cobro">
            Pendiente de cobro
          </option>
          <option value="Confirmada">Confirmada</option>
          <option value="Realizada">Realizada</option>
          <option value="Cancelada">Cancelada</option>
        </select>
      </div>

      <div className="cotizaciones-table">
        <div
          className="cotizaciones-table-header"
          aria-hidden="true"
        >
          <span>Número</span>
          <span>Cliente / Evento</span>
          <span>Fecha</span>
          <span>Total</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>

        {cargando ? (
          <div className="cotizaciones-empty">
            Cargando cotizaciones...
          </div>
        ) : filtradas.length === 0 ? (
          <div className="cotizaciones-empty">
            No se encontraron cotizaciones.
          </div>
        ) : (
          filtradas.map((cotizacion) => (
            <article
              className={`cotizacion-row ${
                menuAbierto === cotizacion.id
                  ? 'menu-activo'
                  : ''
              }`}
              key={cotizacion.id}
            >
              <div
                className="cotizacion-numero"
                data-label="Número"
              >
                {cotizacion.numero || `#${cotizacion.id}`}
              </div>

              <div
                className="cotizacion-cliente"
                data-label="Cliente / Evento"
              >
                <strong>
                  {cotizacion.clientes?.nombre ||
                    'Cliente sin nombre'}
                </strong>
                <span>
                  {cotizacion.nombre_evento ||
                    cotizacion.tipo_evento ||
                    'Evento sin nombre'}
                </span>
                {cotizacion.venue && (
                  <small>{cotizacion.venue}</small>
                )}
              </div>

              <div
                className="cotizacion-fecha"
                data-label="Fecha"
              >
                {fechaCorta(cotizacion.fecha_evento)}
              </div>

              <div
                className="cotizacion-total"
                data-label="Total"
              >
                {money(cotizacion.total)}
              </div>

              <div data-label="Estado">
                <span
                  className={`cotizacion-estado estado-${claseEstado(
                    cotizacion.estado
                  )}`}
                >
                  {cotizacion.estado || 'Sin estado'}
                </span>
              </div>

              <div
                className="cotizacion-acciones"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="cotizacion-menu-button"
                  aria-label="Abrir acciones"
                  onClick={() =>
                    setMenuAbierto(
                      menuAbierto === cotizacion.id
                        ? null
                        : cotizacion.id
                    )
                  }
                >
                  ⋮
                </button>

                {menuAbierto === cotizacion.id && (
                  <div className="menu-popup cotizaciones-menu-popup">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuAbierto(null);
                        abrirCotizacion(cotizacion.id);
                      }}
                    >
                      👁 Ver
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuAbierto(null);
                        editarCotizacion(cotizacion.id);
                      }}
                    >
                      ✏ Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuAbierto(null);
                        abrirPagos(cotizacion.id);
                      }}
                    >
                      💰 Pagos
                    </button>

                    <button
                      type="button"
                      onClick={() => duplicar(cotizacion.id)}
                    >
                      📋 Duplicar
                    </button>

                    <button
                      type="button"
                      onClick={() => cancelar(cotizacion.id)}
                    >
                      ❌ Cancelar
                    </button>

                    <button
                      type="button"
                      className="danger"
                      onClick={() => eliminar(cotizacion.id)}
                    >
                      🗑 Eliminar
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
