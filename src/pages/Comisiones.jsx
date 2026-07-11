import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  getWorkspaceCommissions,
  setWorkspaceCommissionStatus,
} from '../lib/comisionesService';
import './Comisiones.css';

export default function Comisiones({
  workspaceId,
  workspace,
  esArtista,
  goBack,
}) {
  const [comisiones, setComisiones] = useState([]);
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [actualizandoId, setActualizandoId] = useState(null);

  useEffect(() => {
    setEstadoFiltro('');
    setBusqueda('');

    if (!workspaceId) {
      setComisiones([]);
      setCargando(false);
      return;
    }

    cargar();
  }, [workspaceId, esArtista]);

  async function cargar() {
    try {
      setCargando(true);

      const data = await getWorkspaceCommissions(workspaceId);

      setComisiones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);

      toast.error(
        err.message || 'No se pudieron cargar las comisiones.'
      );
    } finally {
      setCargando(false);
    }
  }

  function money(valor) {
    return `RD$ ${Number(valor || 0).toLocaleString('es-DO')}`;
  }

  function fechaCorta(fecha) {
    if (!fecha) return '--';

    return new Date(
      `${String(fecha).slice(0, 10)}T00:00:00`
    ).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function nombreContraparte(comision) {
    return esArtista
      ? comision.gestor_nombre
      : comision.artista_nombre;
  }

  function etiquetaContraparte() {
    return esArtista ? 'Gestor' : 'Artista';
  }

  function etiquetaEstado(settled) {
    if (!settled) return 'Pendiente';

    return esArtista ? 'Pagada' : 'Cobrada';
  }

  function textoAccion(settled) {
    if (settled) return 'Reabrir';

    return esArtista
      ? 'Marcar pagada'
      : 'Marcar cobrada';
  }

  async function cambiarEstado(comision) {
    const settledActual =
      comision.settlement_status === 'settled';

    try {
      setActualizandoId(comision.cotizacion_id);

      await setWorkspaceCommissionStatus({
        workspaceId,
        cotizacionId: comision.cotizacion_id,
        settled: !settledActual,
      });

      toast.success(
        settledActual
          ? 'La comisión volvió a estado pendiente.'
          : esArtista
            ? 'Comisión marcada como pagada.'
            : 'Comisión marcada como cobrada.'
      );

      await cargar();
    } catch (err) {
      console.error(err);

      toast.error(
        err.message || 'No se pudo actualizar la comisión.'
      );
    } finally {
      setActualizandoId(null);
    }
  }

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return comisiones.filter((comision) => {
      const coincideEstado =
        !estadoFiltro ||
        comision.settlement_status === estadoFiltro;

      const contenido = [
        comision.numero,
        comision.cliente_nombre,
        comision.nombre_evento,
        comision.tipo_evento,
        comision.venue,
        comision.gestor_nombre,
        comision.gestor_email,
        comision.artista_nombre,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const coincideBusqueda =
        !texto || contenido.includes(texto);

      return coincideEstado && coincideBusqueda;
    });
  }, [comisiones, estadoFiltro, busqueda]);

  const totalComisiones = filtradas.reduce(
    (sum, comision) =>
      sum + Number(comision.comision || 0),
    0
  );

  const totalPendientes = filtradas
    .filter(
      (comision) =>
        comision.settlement_status !== 'settled'
    )
    .reduce(
      (sum, comision) =>
        sum + Number(comision.comision || 0),
      0
    );

  const totalLiquidadas = filtradas
    .filter(
      (comision) =>
        comision.settlement_status === 'settled'
    )
    .reduce(
      (sum, comision) =>
        sum + Number(comision.comision || 0),
      0
    );

  const nombreWorkspace =
    workspace?.workspace_name || 'el Artista';

  return (
    <div className="dashboard comisiones-page">
      <div className="top-bar">
        <div>
          <h1>Comisiones</h1>

          <p>
            {esArtista
              ? `Comisiones que ${nombreWorkspace} debe pagar`
              : `Comisiones que ${nombreWorkspace} debe pagarte`}
          </p>
        </div>

        <button
          type="button"
          onClick={goBack}
        >
          ← Atrás
        </button>
      </div>

      <section className="comisiones-resumen">
        <div className="comision-resumen-card total">
          <span>
            {esArtista
              ? 'Total generado'
              : 'Total ganado'}
          </span>

          <strong>{money(totalComisiones)}</strong>
        </div>

        <div className="comision-resumen-card cantidad">
          <span>Cotizaciones con comisión</span>

          <strong>{filtradas.length}</strong>
        </div>

        <div className="comision-resumen-card pendiente">
          <span>
            {esArtista
              ? 'Pendiente de pagar'
              : 'Pendiente de cobrar'}
          </span>

          <strong>{money(totalPendientes)}</strong>
        </div>

        <div className="comision-resumen-card cobrada">
          <span>
            {esArtista ? 'Pagadas' : 'Cobradas'}
          </span>

          <strong>{money(totalLiquidadas)}</strong>
        </div>
      </section>

      <div className="comisiones-filtros">
        <input
          type="search"
          placeholder={
            `Buscar por cotización, cliente, evento, ` +
            `${etiquetaContraparte().toLowerCase()}...`
          }
          value={busqueda}
          onChange={(event) =>
            setBusqueda(event.target.value)
          }
        />

        <select
          value={estadoFiltro}
          onChange={(event) =>
            setEstadoFiltro(event.target.value)
          }
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>

          <option value="settled">
            {esArtista ? 'Pagada' : 'Cobrada'}
          </option>
        </select>
      </div>

      <div className="comisiones-table">
        <div
          className="comisiones-table-header"
          aria-hidden="true"
        >
          <span>Cotización</span>
          <span>Cliente / Evento</span>
          <span>{etiquetaContraparte()}</span>
          <span>Fecha</span>
          <span>Comisión</span>
          <span>Estado</span>
        </div>

        {cargando ? (
          <div className="comisiones-empty">
            Cargando comisiones...
          </div>
        ) : filtradas.length === 0 ? (
          <div className="comisiones-empty">
            No hay comisiones registradas con esos filtros.
          </div>
        ) : (
          filtradas.map((comision) => {
            const settled =
              comision.settlement_status === 'settled';

            const actualizando =
              actualizandoId === comision.cotizacion_id;

            return (
              <article
                className="comision-row"
                key={comision.cotizacion_id}
              >
                <div
                  className="comision-numero"
                  data-label="Cotización"
                >
                  {comision.numero ||
                    `#${comision.cotizacion_id}`}
                </div>

                <div
                  className="comision-cliente"
                  data-label="Cliente / Evento"
                >
                  <strong>
                    {comision.cliente_nombre || 'Cliente'}
                  </strong>

                  <span>
                    {comision.nombre_evento ||
                      comision.tipo_evento ||
                      'Evento'}
                  </span>

                  {comision.venue && (
                    <small>{comision.venue}</small>
                  )}
                </div>

                <div
                  className="comision-contraparte"
                  data-label={etiquetaContraparte()}
                >
                  <strong>
                    {nombreContraparte(comision) ||
                      etiquetaContraparte()}
                  </strong>
                </div>

                <div
                  className="comision-fecha"
                  data-label="Fecha"
                >
                  {fechaCorta(comision.fecha_evento)}
                </div>

                <div
                  className="comision-monto"
                  data-label="Comisión"
                >
                  <strong>{money(comision.comision)}</strong>

                  {Number(
                    comision.comision_porcentaje || 0
                  ) > 0 && (
                    <small>
                      {Number(
                        comision.comision_porcentaje
                      ).toLocaleString('es-DO', {
                        maximumFractionDigits: 2,
                      })}
                      %
                    </small>
                  )}
                </div>

                <div
                  className="comision-estado-accion"
                  data-label="Estado"
                >
                  <span
                    className={
                      `comision-badge ` +
                      (settled ? 'cobrada' : 'pendiente')
                    }
                  >
                    {etiquetaEstado(settled)}
                  </span>

                  <button
                    type="button"
                    className={
                      settled ? 'secondary-state-btn' : ''
                    }
                    disabled={actualizando}
                    onClick={() => cambiarEstado(comision)}
                  >
                    {actualizando
                      ? 'Guardando...'
                      : textoAccion(settled)}
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
