import { useEffect, useState } from 'react';
import { getCotizaciones } from '../lib/cotizacionesService';
import {
  getPlanLabel,
  getWorkspaceSubscription,
} from '../lib/subscriptionService';
import './DashboardBalanced.css';

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
  goSuscripcion,
  goNuevaCotizacion,
  subscription,
}) {
  const [eventosConfirmados, setEventosConfirmados] =
    useState(0);
  const [eventosMes, setEventosMes] = useState(0);
  const [proximoEvento, setProximoEvento] = useState(null);
  const [cotizacionesPendientes, setCotizacionesPendientes] =
    useState(0);
  const [balancePendiente, setBalancePendiente] = useState(0);
  const [cobradoMes, setCobradoMes] = useState(0);
  const [
    currentSubscription,
    setCurrentSubscription,
  ] = useState(subscription || null);

  useEffect(() => {
    cargarResumen();
    cargarSuscripcionActual();
  }, [workspaceId]);

  useEffect(() => {
    setCurrentSubscription(
      subscription || null
    );
  }, [
    subscription?.plan_code,
    subscription?.billing_mode,
    subscription?.status,
  ]);

  function normalizarEstado(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function esConfirmado(cotizacion) {
    return normalizarEstado(
      cotizacion?.estado
    ).startsWith('confirmad');
  }

  function esRealizado(cotizacion) {
    return normalizarEstado(
      cotizacion?.estado
    ).startsWith('realizad');
  }

  function fechaLocalISO(date = new Date()) {
    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');
    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

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

      const hoy = fechaLocalISO();
      const mesActual = hoy.slice(0, 7);

      const confirmados = cotizaciones
        .filter(
          (cotizacion) =>
            cotizacion.fecha_evento &&
            esConfirmado(cotizacion)
        )
        .sort((a, b) =>
          String(a.fecha_evento).localeCompare(
            String(b.fecha_evento)
          )
        );

      const eventosEnAgenda = confirmados.filter(
        (cotizacion) =>
          String(cotizacion.fecha_evento) >= hoy
      );

      const eventosDelMes = confirmados.filter(
        (cotizacion) =>
          String(cotizacion.fecha_evento).slice(0, 7) ===
          mesActual
      );

      const proximo = eventosEnAgenda[0] || null;

      const pendientes = cotizaciones.filter((cotizacion) =>
        [
          'Pendiente',
          'Pendiente de aprobación',
          'Pendiente de cobro',
        ].includes(cotizacion.estado)
      );

      const cotizacionesConSaldo = cotizaciones.filter(
        (cotizacion) =>
          (esConfirmado(cotizacion) ||
            esRealizado(cotizacion)) &&
          obtenerSaldoPendiente(cotizacion) > 0
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

      setEventosConfirmados(eventosEnAgenda.length);
      setEventosMes(eventosDelMes.length);
      setProximoEvento(proximo);
      setCotizacionesPendientes(pendientes.length);
      setBalancePendiente(totalPendiente);
      setCobradoMes(totalCobradoMes);
    } catch (err) {
      console.error(err);
    }
  }


  async function cargarSuscripcionActual() {
    if (!workspaceId) {
      return;
    }

    try {
      const result =
        await getWorkspaceSubscription(
          workspaceId
        );

      setCurrentSubscription(result);
    } catch (error) {
      console.error(error);
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

  const planLabel =
    currentSubscription?.billing_mode ===
    'legacy'
      ? 'Acceso heredado'
      : getPlanLabel(
          currentSubscription?.plan_code
        ) || 'Sin plan';

  const accountType =
    esArtista ? 'Artista' : 'Gestor';

  return (
    <div className="dashboard dashboard-mobile-first">
      <section className="mobile-welcome-card dashboard-welcome-integrated">
        <div className="dashboard-welcome-copy">
          <span className="eyebrow">MiBooking</span>

          <h1>Hola, {nombreArtista}!</h1>

          <p>
            Tienes{' '}
            <strong>{eventosConfirmados}</strong>{' '}
            evento
            {eventosConfirmados !== 1 ? 's' : ''}{' '}
            confirmado
            {eventosConfirmados !== 1 ? 's' : ''}{' '}
            en agenda.
          </p>

          <div className="dashboard-account-summary">
            <span>{planLabel}</span>

            <i aria-hidden="true" />

            <span>{accountType}</span>
          </div>
        </div>

        <button
          type="button"
          className="dashboard-welcome-tutorial"
          onClick={goTutorial}
        >
          <span className="welcome-tutorial-icon">
            ?
          </span>

          <span className="welcome-tutorial-content">
            <small>Tutorial</small>

            <strong>
              Primeros pasos
            </strong>

            <span>
              Configura tu cuenta
            </span>
          </span>

          <span
            className="welcome-tutorial-arrow"
            aria-hidden="true"
          >
            →
          </span>
        </button>
      </section>

      <section className="dashboard-primary-actions dashboard-primary-balanced">
        <button
          type="button"
          className="primary-action"
          onClick={
            goNuevaCotizacion ||
            goCotizaciones
          }
        >
          Nueva cotización
        </button>

        <button
          type="button"
          className="primary-action secondary"
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
          <small>Eventos este mes</small>
          <strong>{eventosMes}</strong>
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
          <div className="dashboard-section-title">
            <span>Operación rápida</span>
            <small>
              Las acciones que usas en el día a día.
            </small>
          </div>
        </div>

        <div className="quick-actions-grid balanced-actions-grid">
          <button
            type="button"
            onClick={
              goNuevaCotizacion ||
              goCotizaciones
            }
          >
            ➕
            <span>Nueva cotización</span>
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

        </div>
      </section>

      <section className="quick-actions-card dashboard-config-card">
        <div className="section-heading">
          <div className="dashboard-section-title">
            <span>
              {esArtista
                ? 'Configuración del Artista'
                : 'Cuenta y colaboración'}
            </span>

            <small>
              Ajustes menos frecuentes, separados de la operación diaria.
            </small>
          </div>
        </div>

        <div className="quick-actions-grid balanced-actions-grid config-actions-grid">
          {esArtista ? (
            <>
              <button type="button" onClick={goEquipo}>
                👥
                <span>Equipo</span>
              </button>

              <button type="button" onClick={goPerfil}>
                👤
                <span>Perfil</span>
              </button>

              <button type="button" onClick={goSuscripcion}>
                💳
                <span>Suscripción</span>
              </button>

              <button type="button" onClick={goFormatos}>
                🎵
                <span>Formatos</span>
              </button>

              <button type="button" onClick={goTiposEvento}>
                🎤
                <span>Tipos de evento</span>
              </button>

              <button type="button" onClick={goTarifas}>
                ⚙️
                <span>Tarifas</span>
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={goInvitaciones}>
                ✉
                <span>Invitaciones</span>
              </button>

              <button type="button" onClick={goPerfil}>
                👤
                <span>Mi perfil</span>
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}