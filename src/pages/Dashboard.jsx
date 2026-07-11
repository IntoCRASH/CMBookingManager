import { useEffect, useState } from 'react';
import { getCotizaciones } from '../lib/cotizacionesService';

export default function Dashboard({
  workspaceId,
  workspace,
  esArtista,
  goTarifas,
  goCotizaciones,
  goCalendario,
  goComisiones,
  goDocumentos,
  goTutorial,
  goFormatos,
  goTiposEvento,
  goPerfil,
  goEquipo,
  goInvitaciones,
}) {
  const [eventosHoy, setEventosHoy] = useState(0);
  const [proximoEvento, setProximoEvento] = useState(null);
  const [cotizacionesPendientes, setCotizacionesPendientes] =
    useState(0);
  const [balancePendiente, setBalancePendiente] = useState(0);
  const [cobradoMes, setCobradoMes] = useState(0);

  useEffect(() => {
    cargarResumen();
  }, [workspaceId]);

  function obtenerPagado(cotizacion) {
    return Number(
      cotizacion.monto_pagado ||
        cotizacion.total_pagado ||
        cotizacion.pagado ||
        0
    );
  }

  function obtenerSaldoPendiente(cotizacion) {
    if (
      cotizacion.saldo_pendiente !== undefined &&
      cotizacion.saldo_pendiente !== null
    ) {
      return Number(cotizacion.saldo_pendiente || 0);
    }

    return Math.max(
      Number(cotizacion.total || 0) -
        obtenerPagado(cotizacion),
      0
    );
  }

  async function cargarResumen() {
    try {
      const cotizaciones = await getCotizaciones({
        workspaceId,
      });

      const hoy = new Date().toISOString().slice(0, 10);
      const mesActual = hoy.slice(0, 7);

      const eventosConfirmados = cotizaciones
        .filter(
          (cotizacion) =>
            cotizacion.fecha_evento &&
            cotizacion.estado === 'Confirmada'
        )
        .sort(
          (a, b) =>
            new Date(a.fecha_evento) -
            new Date(b.fecha_evento)
        );

      const eventosDeHoy = eventosConfirmados.filter(
        (cotizacion) => cotizacion.fecha_evento === hoy
      );

      const proximo = eventosConfirmados.find(
        (cotizacion) => cotizacion.fecha_evento >= hoy
      );

      const pendientes = cotizaciones.filter((cotizacion) =>
        [
          'Pendiente',
          'Pendiente de aprobación',
          'Pendiente de cobro',
        ].includes(cotizacion.estado)
      );

      const cotizacionesConSaldo = cotizaciones.filter(
        (cotizacion) =>
          ['Confirmada', 'Realizada'].includes(
            cotizacion.estado
          ) && obtenerSaldoPendiente(cotizacion) > 0
      );

      const totalPendiente = cotizacionesConSaldo.reduce(
        (sum, cotizacion) =>
          sum + obtenerSaldoPendiente(cotizacion),
        0
      );

      const totalCobradoMes = cotizaciones
        .filter(
          (cotizacion) =>
            cotizacion.fecha_evento &&
            String(cotizacion.fecha_evento).slice(0, 7) ===
              mesActual
        )
        .reduce(
          (sum, cotizacion) =>
            sum + obtenerPagado(cotizacion),
          0
        );

      setEventosHoy(eventosDeHoy.length);
      setProximoEvento(proximo || null);
      setCotizacionesPendientes(pendientes.length);
      setBalancePendiente(totalPendiente);
      setCobradoMes(totalCobradoMes);
    } catch (err) {
      console.error(err);
    }
  }

  function money(valor) {
    return `RD$ ${Number(valor || 0).toLocaleString(
      'es-DO'
    )}`;
  }

  function fechaCorta(fecha) {
    if (!fecha) {
      return {
        dia: '--',
        mes: '---',
      };
    }

    const date = new Date(`${fecha}T00:00:00`);

    return {
      dia: date.toLocaleDateString('es-DO', {
        day: '2-digit',
      }),

      mes: date
        .toLocaleDateString('es-DO', {
          month: 'short',
        })
        .replace('.', '')
        .toUpperCase(),
    };
  }

  const fechaProximo = fechaCorta(
    proximoEvento?.fecha_evento
  );

  const nombreArtista =
    workspace?.workspace_name || 'Artista';

  return (
    <div className="dashboard dashboard-mobile-first">
      <section className="mobile-welcome-card">
        <div>
          <span className="eyebrow">MiBooking</span>

          <h1>Hola, {nombreArtista}!</h1>

          <p>
            Hoy, <strong>{nombreArtista}</strong> tiene{' '}
            <strong>{eventosHoy}</strong>{' '}
            evento{eventosHoy !== 1 ? 's' : ''} confirmado
            {eventosHoy !== 1 ? 's' : ''}.
          </p>
        </div>

        <div className="profile-pill">
          <span>
            {nombreArtista
              .slice(0, 1)
              .toUpperCase()}
          </span>

          <div>
            <strong>{nombreArtista}</strong>

            <small>
              {esArtista ? 'Artista' : 'Gestor'}
            </small>
          </div>
        </div>
      </section>

      <section className="dashboard-primary-actions">
        <button
          type="button"
          className="primary-action"
          onClick={goCotizaciones}
        >
          Ver cotizaciones
        </button>
      </section>

      <section className="mobile-kpi-grid">
        <button
          type="button"
          className="kpi-tile blue"
          onClick={goCalendario}
        >
          <span>📅</span>
          <small>Eventos hoy</small>
          <strong>{eventosHoy}</strong>
        </button>

        <button
          type="button"
          className="kpi-tile purple"
          onClick={goCotizaciones}
        >
          <span>💰</span>
          <small>Balance pendiente</small>
          <strong>{money(balancePendiente)}</strong>
        </button>

        <button
          type="button"
          className="kpi-tile rose"
          onClick={goCotizaciones}
        >
          <span>📄</span>
          <small>Cotizaciones pendientes</small>
          <strong>{cotizacionesPendientes}</strong>
        </button>

        <button
          type="button"
          className="kpi-tile orange"
          onClick={goComisiones}
        >
          <span>💵</span>
          <small>Cobrado este mes</small>
          <strong>{money(cobradoMes)}</strong>
        </button>
      </section>

      <section className="next-event-card">
        <div className="section-heading">
          <span>Próximo evento confirmado</span>

          <button type="button" onClick={goCalendario}>
            Agenda
          </button>
        </div>

        {proximoEvento ? (
          <div className="next-event-content">
            <div className="date-badge">
              <strong>{fechaProximo.dia}</strong>
              <span>{fechaProximo.mes}</span>
            </div>

            <div>
              <h2>
                {proximoEvento.nombre_evento ||
                  proximoEvento.tipo_evento ||
                  'Evento'}
              </h2>

              <p>
                {proximoEvento.clientes?.nombre ||
                  'Cliente sin nombre'}
              </p>

              <small>
                {proximoEvento.venue ||
                  proximoEvento.provincias?.nombre ||
                  'Lugar pendiente'}

                {proximoEvento.hora_inicio
                  ? ` · ${proximoEvento.hora_inicio}`
                  : ''}
              </small>
            </div>
          </div>
        ) : (
          <div className="empty-event-state">
            <strong>
              No hay próximos eventos confirmados.
            </strong>

            <span>
              Cuando confirmes una cotización con fecha,
              aparecerá aquí.
            </span>
          </div>
        )}
      </section>

      <section className="quick-actions-card">
        <div className="section-heading">
          <span>Operación rápida</span>
        </div>

        <div className="quick-actions-grid">
          <button type="button" onClick={goTutorial}>
            🧭
            <span>Tutorial</span>
          </button>

          <button type="button" onClick={goCotizaciones}>
            📄
            <span>Cotizaciones</span>
          </button>

          <button type="button" onClick={goCalendario}>
            📅
            <span>Calendario</span>
          </button>

          <button type="button" onClick={goComisiones}>
            💰
            <span>Comisiones</span>
          </button>

          <button type="button" onClick={goDocumentos}>
            🗂️
            <span>Documentos</span>
          </button>

          {esArtista ? (
            <button type="button" onClick={goEquipo}>
              👥
              <span>Equipo</span>
            </button>
          ) : (
            <button type="button" onClick={goInvitaciones}>
              ✉
              <span>Invitaciones</span>
            </button>
          )}

          {esArtista && (
            <button type="button" onClick={goPerfil}>
              👤
              <span>Perfil</span>
            </button>
          )}

          {esArtista && (
            <button type="button" onClick={goFormatos}>
              🎵
              <span>Formatos</span>
            </button>
          )}

          {esArtista && (
            <button type="button" onClick={goTiposEvento}>
              🎤
              <span>Tipos de evento</span>
            </button>
          )}

          {esArtista && (
            <button type="button" onClick={goTarifas}>
              ⚙️
              <span>Tarifas</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
