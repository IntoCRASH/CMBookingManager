import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  advanceWorkspaceCommissionStatus,
  getWorkspaceCommissions,
} from '../lib/comisionesService';
import './Comisiones.css';

const ESTADOS_ESPERANDO = [
  'artist_reported',
  'manager_reported',
];

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
  const [actualizandoId, setActualizandoId] =
    useState(null);

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

      const data =
        await getWorkspaceCommissions(
          workspaceId
        );

      setComisiones(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(err);

      toast.error(
        err.message ||
          'No se pudieron cargar las comisiones.'
      );
    } finally {
      setCargando(false);
    }
  }

  function money(valor) {
    return `RD$ ${Number(
      valor || 0
    ).toLocaleString('es-DO')}`;
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

  function estadoFlujo(comision) {
    return (
      comision.workflow_status ||
      (comision.settlement_status === 'settled'
        ? 'settled'
        : 'pending')
    );
  }

  function categoriaEstado(comision) {
    const estado = estadoFlujo(comision);

    if (estado === 'settled') {
      return 'settled';
    }

    if (ESTADOS_ESPERANDO.includes(estado)) {
      return 'awaiting';
    }

    return 'pending';
  }

  function etiquetaEstado(comision) {
    const estado = estadoFlujo(comision);

    if (estado === 'settled') {
      return esArtista
        ? 'Pago confirmado'
        : 'Cobro confirmado';
    }

    if (estado === 'artist_reported') {
      return esArtista
        ? 'Esperando al Gestor'
        : 'Pago informado';
    }

    if (estado === 'manager_reported') {
      return esArtista
        ? 'Cobro informado'
        : 'Esperando al Artista';
    }

    return 'Pendiente';
  }

  function claseEstado(comision) {
    const categoria =
      categoriaEstado(comision);

    if (categoria === 'settled') {
      return 'confirmada';
    }

    if (categoria === 'awaiting') {
      return 'en-confirmacion';
    }

    return 'pendiente';
  }

  function puedeActuar(comision) {
    const estado = estadoFlujo(comision);

    if (estado === 'pending') {
      return true;
    }

    if (
      estado === 'artist_reported' &&
      !esArtista
    ) {
      return true;
    }

    if (
      estado === 'manager_reported' &&
      esArtista
    ) {
      return true;
    }

    return false;
  }

  function textoAccion(comision) {
    const estado = estadoFlujo(comision);

    if (estado === 'artist_reported') {
      return 'Confirmar recepción';
    }

    if (estado === 'manager_reported') {
      return 'Confirmar pago';
    }

    return esArtista
      ? 'Informar pago realizado'
      : 'Informar comisión recibida';
  }

  function textoEspera(comision) {
    const estado = estadoFlujo(comision);

    if (estado === 'settled') {
      return 'Confirmación final · irreversible';
    }

    if (
      estado === 'artist_reported' &&
      esArtista
    ) {
      return 'El Gestor debe confirmar que recibió el pago.';
    }

    if (
      estado === 'manager_reported' &&
      !esArtista
    ) {
      return 'El Artista debe confirmar que realizó el pago.';
    }

    return '';
  }

  function mensajeConfirmacion(comision) {
    const estado = estadoFlujo(comision);
    const monto = money(comision.comision);

    if (estado === 'pending') {
      return esArtista
        ? `¿Confirmas que realizaste el pago de ${monto}? ` +
            'El Gestor deberá confirmar que lo recibió.'
        : `¿Confirmas que recibiste la comisión de ${monto}? ` +
            'El Artista deberá confirmar que realizó el pago.';
    }

    return esArtista
      ? `¿Confirmas definitivamente que realizaste el pago de ${monto}? ` +
          'Después de confirmar no podrá revertirse.'
      : `¿Confirmas definitivamente que recibiste el pago de ${monto}? ` +
          'Después de confirmar no podrá revertirse.';
  }

  async function avanzarEstado(comision) {
    if (!puedeActuar(comision)) return;

    const confirmado = window.confirm(
      mensajeConfirmacion(comision)
    );

    if (!confirmado) return;

    const estadoAnterior =
      estadoFlujo(comision);

    try {
      setActualizandoId(
        comision.cotizacion_id
      );

      const resultado =
        await advanceWorkspaceCommissionStatus({
          workspaceId,
          cotizacionId:
            comision.cotizacion_id,
        });

      const estadoNuevo =
        resultado?.workflow_status || '';

      if (estadoNuevo === 'settled') {
        toast.success(
          'Comisión confirmada definitivamente.'
        );
      } else if (
        estadoAnterior === 'pending'
      ) {
        toast.success(
          esArtista
            ? 'Pago informado. Falta la confirmación del Gestor.'
            : 'Cobro informado. Falta la confirmación del Artista.'
        );
      } else {
        toast.success(
          'Estado de la comisión actualizado.'
        );
      }

      await cargar();
    } catch (err) {
      console.error(err);

      toast.error(
        err.message ||
          'No se pudo actualizar la comisión.'
      );
    } finally {
      setActualizandoId(null);
    }
  }

  const filtradas = useMemo(() => {
    const texto =
      busqueda.trim().toLowerCase();

    return comisiones.filter(
      (comision) => {
        const categoria =
          categoriaEstado(comision);

        const coincideEstado =
          !estadoFiltro ||
          categoria === estadoFiltro;

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
          !texto ||
          contenido.includes(texto);

        return (
          coincideEstado &&
          coincideBusqueda
        );
      }
    );
  }, [
    comisiones,
    estadoFiltro,
    busqueda,
  ]);

  const totalComisiones =
    filtradas.reduce(
      (sum, comision) =>
        sum +
        Number(comision.comision || 0),
      0
    );

  const totalPendientes =
    filtradas
      .filter(
        (comision) =>
          categoriaEstado(comision) !==
          'settled'
      )
      .reduce(
        (sum, comision) =>
          sum +
          Number(
            comision.comision || 0
          ),
        0
      );

  const totalLiquidadas =
    filtradas
      .filter(
        (comision) =>
          categoriaEstado(comision) ===
          'settled'
      )
      .reduce(
        (sum, comision) =>
          sum +
          Number(
            comision.comision || 0
          ),
        0
      );

  const nombreWorkspace =
    workspace?.workspace_name ||
    'el Artista';

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

      <section className="commission-flow-note">
        <strong>
          Confirmación entre ambas partes
        </strong>

        <p>
          Una parte informa el pago o cobro y la
          contraparte debe confirmarlo. Después de
          la segunda confirmación, la comisión queda
          cerrada y no puede volver a abrirse.
        </p>
      </section>

      <section className="comisiones-resumen">
        <div className="comision-resumen-card total">
          <span>
            {esArtista
              ? 'Total generado'
              : 'Total ganado'}
          </span>

          <strong>
            {money(totalComisiones)}
          </strong>
        </div>

        <div className="comision-resumen-card cantidad">
          <span>
            Cotizaciones con comisión
          </span>

          <strong>
            {filtradas.length}
          </strong>
        </div>

        <div className="comision-resumen-card pendiente">
          <span>
            Pendiente de liquidar
          </span>

          <strong>
            {money(totalPendientes)}
          </strong>
        </div>

        <div className="comision-resumen-card cobrada">
          <span>
            Confirmadas
          </span>

          <strong>
            {money(totalLiquidadas)}
          </strong>
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
            setBusqueda(
              event.target.value
            )
          }
        />

        <select
          value={estadoFiltro}
          onChange={(event) =>
            setEstadoFiltro(
              event.target.value
            )
          }
        >
          <option value="">
            Todos los estados
          </option>

          <option value="pending">
            Pendiente
          </option>

          <option value="awaiting">
            Esperando confirmación
          </option>

          <option value="settled">
            Confirmada
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
          <span>
            {etiquetaContraparte()}
          </span>
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
            No hay comisiones registradas
            con esos filtros.
          </div>
        ) : (
          filtradas.map(
            (comision) => {
              const actualizando =
                actualizandoId ===
                comision.cotizacion_id;

              const mostrarAccion =
                puedeActuar(comision);

              const nota =
                textoEspera(comision);

              return (
                <article
                  className="comision-row"
                  key={
                    comision.cotizacion_id
                  }
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
                      {comision.cliente_nombre ||
                        'Cliente'}
                    </strong>

                    <span>
                      {comision.nombre_evento ||
                        comision.tipo_evento ||
                        'Evento'}
                    </span>

                    {comision.venue && (
                      <small>
                        {comision.venue}
                      </small>
                    )}
                  </div>

                  <div
                    className="comision-contraparte"
                    data-label={
                      etiquetaContraparte()
                    }
                  >
                    <strong>
                      {nombreContraparte(
                        comision
                      ) ||
                        etiquetaContraparte()}
                    </strong>
                  </div>

                  <div
                    className="comision-fecha"
                    data-label="Fecha"
                  >
                    {fechaCorta(
                      comision.fecha_evento
                    )}
                  </div>

                  <div
                    className="comision-monto"
                    data-label="Comisión"
                  >
                    <strong>
                      {money(
                        comision.comision
                      )}
                    </strong>

                    {Number(
                      comision
                        .comision_porcentaje ||
                        0
                    ) > 0 && (
                      <small>
                        {Number(
                          comision
                            .comision_porcentaje
                        ).toLocaleString(
                          'es-DO',
                          {
                            maximumFractionDigits: 2,
                          }
                        )}
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
                        claseEstado(
                          comision
                        )
                      }
                    >
                      {etiquetaEstado(
                        comision
                      )}
                    </span>

                    {mostrarAccion && (
                      <button
                        type="button"
                        className="commission-confirm-btn"
                        disabled={
                          actualizando
                        }
                        onClick={() =>
                          avanzarEstado(
                            comision
                          )
                        }
                      >
                        {actualizando
                          ? 'Guardando...'
                          : textoAccion(
                              comision
                            )}
                      </button>
                    )}

                    {nota && (
                      <small className="commission-state-note">
                        {nota}
                      </small>
                    )}
                  </div>
                </article>
              );
            }
          )
        )}
      </div>
    </div>
  );
}
