import { useEffect, useMemo, useState } from 'react';
import { getCotizaciones } from '../lib/cotizacionesService';
import {
  getPlanLabel,
  getWorkspaceSubscription,
} from '../lib/subscriptionService';
import AppIcon from '../components/AppIcon';
import './DashboardBalanced.css';

export default function Dashboard({
  workspaceId,
  workspace,
  esArtista,
  goTarifas,
  goCotizaciones,
  goClientes,
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
  goIndustriaMusical,
  subscription,
}) {
  const [eventosConfirmados, setEventosConfirmados] = useState(0);
  const [eventosMes, setEventosMes] = useState(0);
  const [proximoEvento, setProximoEvento] = useState(null);
  const [cotizacionesPendientes, setCotizacionesPendientes] = useState(0);
  const [valorCotizacionesPendientes, setValorCotizacionesPendientes] = useState(0);
  const [balancePendiente, setBalancePendiente] = useState(0);
  const [cobradoMes, setCobradoMes] = useState(0);
  const [cotizacionesRecientes, setCotizacionesRecientes] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(subscription || null);

  useEffect(() => {
    cargarResumen();
    cargarSuscripcionActual();
  }, [workspaceId]);

  useEffect(() => {
    setCurrentSubscription(subscription || null);
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
    return normalizarEstado(cotizacion?.estado).startsWith('confirmad');
  }

  function esRealizado(cotizacion) {
    return normalizarEstado(cotizacion?.estado).startsWith('realizad');
  }

  function fechaLocalISO(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
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
      Number(cotizacion.total || 0) - obtenerPagado(cotizacion),
      0
    );
  }

  async function cargarResumen() {
    try {
      const cotizaciones = await getCotizaciones({ workspaceId });
      const hoy = fechaLocalISO();
      const mesActual = hoy.slice(0, 7);

      const confirmados = cotizaciones
        .filter(
          (cotizacion) =>
            cotizacion.fecha_evento && esConfirmado(cotizacion)
        )
        .sort((a, b) =>
          String(a.fecha_evento).localeCompare(String(b.fecha_evento))
        );

      const eventosEnAgenda = confirmados.filter(
        (cotizacion) => String(cotizacion.fecha_evento) >= hoy
      );

      const eventosDelMes = confirmados.filter(
        (cotizacion) =>
          String(cotizacion.fecha_evento).slice(0, 7) === mesActual
      );

      const pendientes = cotizaciones.filter((cotizacion) =>
        [
          'pendiente',
          'pendiente de aprobacion',
          'pendiente de cobro',
        ].includes(normalizarEstado(cotizacion.estado))
      );

      const cotizacionesConSaldo = cotizaciones.filter(
        (cotizacion) =>
          (esConfirmado(cotizacion) || esRealizado(cotizacion)) &&
          obtenerSaldoPendiente(cotizacion) > 0
      );

      const totalPendiente = cotizacionesConSaldo.reduce(
        (sum, cotizacion) => sum + obtenerSaldoPendiente(cotizacion),
        0
      );

      const totalCobradoMes = cotizaciones
        .filter(
          (cotizacion) =>
            cotizacion.fecha_evento &&
            String(cotizacion.fecha_evento).slice(0, 7) === mesActual
        )
        .reduce(
          (sum, cotizacion) => sum + obtenerPagado(cotizacion),
          0
        );

      const valorPendientes = pendientes.reduce(
        (sum, cotizacion) => sum + Number(cotizacion.total || 0),
        0
      );

      const recientes = [...cotizaciones]
        .sort((a, b) => {
          const fechaA =
            a.updated_at || a.created_at || a.fecha_evento || '';
          const fechaB =
            b.updated_at || b.created_at || b.fecha_evento || '';
          return String(fechaB).localeCompare(String(fechaA));
        })
        .slice(0, 5);

      setEventosConfirmados(eventosEnAgenda.length);
      setEventosMes(eventosDelMes.length);
      setProximoEvento(eventosEnAgenda[0] || null);
      setCotizacionesPendientes(pendientes.length);
      setValorCotizacionesPendientes(valorPendientes);
      setBalancePendiente(totalPendiente);
      setCobradoMes(totalCobradoMes);
      setCotizacionesRecientes(recientes);
    } catch (error) {
      console.error(error);
    }
  }

  async function cargarSuscripcionActual() {
    if (!workspaceId) return;

    try {
      const result = await getWorkspaceSubscription(workspaceId);
      setCurrentSubscription(result);
    } catch (error) {
      console.error(error);
    }
  }

  function money(value) {
    return `RD$ ${Number(value || 0).toLocaleString('es-DO')}`;
  }

  function fechaLarga(value) {
    if (!value) return 'Fecha pendiente';

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return 'Fecha pendiente';

    return date.toLocaleDateString('es-DO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function estadoClass(value) {
    const estado = normalizarEstado(value).replace(/\s+/g, '-');
    return `premium-status premium-status-${estado || 'sin-estado'}`;
  }

  const nombreArtista = workspace?.workspace_name || 'Artista';

  const planLabel =
    currentSubscription?.billing_mode === 'legacy'
      ? 'Acceso heredado'
      : getPlanLabel(currentSubscription?.plan_code) || 'Sin plan';

  const accountType = esArtista ? 'Artista' : 'Gestor';

  const metricBars = useMemo(() => {
    const values = [
      { label: 'Eventos del mes', value: eventosMes, display: eventosMes },
      {
        label: 'Cotizaciones pendientes',
        value: cotizacionesPendientes,
        display: cotizacionesPendientes,
      },
      {
        label: 'Cobrado este mes',
        value: cobradoMes,
        display: money(cobradoMes),
      },
    ];

    const maxValue = Math.max(...values.map((item) => item.value), 1);

    return values.map((item) => ({
      ...item,
      width: `${Math.max(12, Math.round((item.value / maxValue) * 100))}%`,
    }));
  }, [eventosMes, cotizacionesPendientes, cobradoMes]);

  const quickActions = [
    {
      label: 'Nueva cotización',
      description: 'Crea y envía una propuesta',
      icon: 'quote',
      tone: 'blue',
      action: goNuevaCotizacion || goCotizaciones,
    },
    {
      label: 'Nuevo cliente',
      description: 'Organiza tus contactos',
      icon: 'clients',
      tone: 'violet',
      action: goClientes,
    },
    {
      label: 'Ver calendario',
      description: 'Revisa eventos y fechas',
      icon: 'calendar',
      tone: 'pink',
      action: goCalendario,
    },
    {
      label: 'Documentos',
      description: 'Contratos, riders y archivos',
      icon: 'upload',
      tone: 'purple',
      action: goDocumentos,
    },
    {
      label: 'Comisiones',
      description: 'Consulta pagos del equipo',
      icon: 'commissions',
      tone: 'cyan',
      action: goComisiones,
    },
  ].filter((item) => typeof item.action === 'function');

  const configurationActions = esArtista
    ? [
        { label: 'Equipo', icon: 'team', action: goEquipo },
        { label: 'Perfil', icon: 'profile', action: goPerfil },
        { label: 'Suscripción', icon: 'billing', action: goSuscripcion },
        { label: 'Formatos', icon: 'formats', action: goFormatos },
        { label: 'Tipos de evento', icon: 'eventTypes', action: goTiposEvento },
        { label: 'Tarifas', icon: 'rates', action: goTarifas },
      ]
    : [
        { label: 'Invitaciones', icon: 'invitations', action: goInvitaciones },
        { label: 'Tutorial', icon: 'tutorial', action: goTutorial },
        { label: 'Aprende', icon: 'learn', action: goIndustriaMusical },
      ];

  return (
    <div className="dashboard premium-dashboard">
      <header className="premium-dashboard-welcome">
        <div>
          <span className="premium-eyebrow">Panel de control</span>
          <h1>
            ¡Bienvenido,{' '}
            <span style={{ color: 'var(--accent)' }}>
              {nombreArtista}
            </span>
            ! <span aria-hidden="true">👋</span>
          </h1>
          <p>
            Aquí tienes el resumen de tu operación musical y lo que requiere
            atención hoy.
          </p>
        </div>

        <button
          type="button"
          className="premium-tutorial-link"
          onClick={goTutorial}
        >
          <span className="premium-tutorial-icon">
            <AppIcon name="tutorial" size={20} />
          </span>
          <span>
            <small>Tutorial</small>
            <strong>Primeros pasos</strong>
          </span>
          <AppIcon name="chevron" size={17} />
        </button>
      </header>

      <section className="premium-overview-grid" aria-label="Resumen principal">
        <button
          type="button"
          className="premium-summary-card premium-event-summary"
          onClick={goCalendario}
        >
          <div className="premium-card-topline">
            <span>Próximo evento</span>
            <span className="premium-card-icon">
              <AppIcon name="event" size={24} />
            </span>
          </div>

          {proximoEvento ? (
            <div className="premium-event-copy">
              <h2>
                {proximoEvento.nombre_evento ||
                  proximoEvento.tipo_evento ||
                  'Evento confirmado'}
              </h2>
              <p>{fechaLarga(proximoEvento.fecha_evento)}</p>
              <small>
                {proximoEvento.venue ||
                  proximoEvento.provincias?.nombre ||
                  'Lugar pendiente'}
                {proximoEvento.hora_inicio
                  ? ` · ${proximoEvento.hora_inicio}`
                  : ''}
              </small>
            </div>
          ) : (
            <div className="premium-event-copy">
              <h2>Sin eventos próximos</h2>
              <p>Tu próximo evento confirmado aparecerá aquí.</p>
            </div>
          )}

          <span className="premium-card-link">
            Ver agenda <AppIcon name="arrow" size={16} />
          </span>
        </button>

        <button
          type="button"
          className="premium-summary-card premium-quotes-summary"
          onClick={goCotizaciones}
        >
          <div className="premium-card-topline">
            <span>Cotizaciones pendientes</span>
            <span className="premium-card-icon">
              <AppIcon name="quote" size={24} />
            </span>
          </div>
          <strong className="premium-summary-number">{cotizacionesPendientes}</strong>
          <p>Por un valor de</p>
          <b>{money(valorCotizacionesPendientes)}</b>
          <span className="premium-card-link">
            Ver cotizaciones <AppIcon name="arrow" size={16} />
          </span>
        </button>

        <button
          type="button"
          className="premium-summary-card premium-balance-summary"
          onClick={goCotizaciones}
        >
          <div className="premium-card-topline">
            <span>Balance pendiente</span>
            <span className="premium-card-icon round">
              <AppIcon name="money" size={25} />
            </span>
          </div>
          <strong className="premium-summary-amount">{money(balancePendiente)}</strong>
          <p>De eventos confirmados o realizados</p>
          <div className="premium-mini-chart" aria-hidden="true">
            <i /><i /><i /><i /><i /><i />
          </div>
          <span className="premium-card-link">
            Ver balance <AppIcon name="arrow" size={16} />
          </span>
        </button>
      </section>

      <section className="premium-dashboard-main-grid">
        <article className="premium-panel premium-recent-panel">
          <div className="premium-panel-heading">
            <div>
              <span className="premium-eyebrow">Actividad</span>
              <h2>Cotizaciones recientes</h2>
            </div>
            <button type="button" onClick={goCotizaciones}>
              Ver todas <AppIcon name="arrow" size={15} />
            </button>
          </div>

          {cotizacionesRecientes.length > 0 ? (
            <div className="premium-quotes-table" role="table">
              <div className="premium-quotes-head" role="row">
                <span>Folio</span>
                <span>Cliente / evento</span>
                <span>Fecha</span>
                <span>Monto</span>
                <span>Estado</span>
              </div>

              {cotizacionesRecientes.map((cotizacion) => (
                <button
                  type="button"
                  className="premium-quote-row"
                  key={cotizacion.id}
                  onClick={goCotizaciones}
                  role="row"
                >
                  <span className="premium-quote-number">
                    {cotizacion.numero_cotizacion ||
                      cotizacion.numero ||
                      `#${cotizacion.id}`}
                  </span>
                  <span className="premium-quote-client">
                    <strong>{cotizacion.clientes?.nombre || 'Cliente'}</strong>
                    <small>
                      {cotizacion.nombre_evento ||
                        cotizacion.tipo_evento ||
                        'Evento sin nombre'}
                    </small>
                  </span>
                  <span>{fechaLarga(cotizacion.fecha_evento)}</span>
                  <span className="premium-quote-total">
                    {money(cotizacion.total)}
                  </span>
                  <span className={estadoClass(cotizacion.estado)}>
                    {cotizacion.estado || 'Sin estado'}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="premium-empty-state">
              <AppIcon name="quote" size={28} />
              <strong>Aún no hay cotizaciones</strong>
              <span>Crea la primera para comenzar a ver actividad aquí.</span>
            </div>
          )}
        </article>

        <aside className="premium-panel premium-actions-panel">
          <div className="premium-panel-heading">
            <div>
              <span className="premium-eyebrow">Atajos</span>
              <h2>Acciones rápidas</h2>
            </div>
          </div>

          <div className="premium-action-list">
            {quickActions.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`premium-action-item tone-${item.tone}`}
                onClick={item.action}
              >
                <span className="premium-action-icon">
                  <AppIcon name={item.icon} size={20} />
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
                <AppIcon name="chevron" size={17} />
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section className="premium-panel premium-operation-panel">
        <div className="premium-operation-copy">
          <span className="premium-operation-icon">
            <AppIcon name="chart" size={24} />
          </span>
          <div>
            <span className="premium-eyebrow">Resumen del mes</span>
            <h2>Tu operación, en tiempo real</h2>
            <p>
              Estos indicadores usan los datos reales de tus cotizaciones y
              eventos en MiBooking.
            </p>
          </div>
        </div>

        <div className="premium-metric-bars">
          {metricBars.map((metric) => (
            <div className="premium-metric-row" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.display}</strong>
              <div><i style={{ width: metric.width }} /></div>
            </div>
          ))}
        </div>

        <div className="premium-account-card">
          <span>{planLabel}</span>
          <strong>{accountType}</strong>
          <small>{eventosConfirmados} evento{eventosConfirmados === 1 ? '' : 's'} en agenda</small>
        </div>
      </section>

      <section className="premium-tools-section">
        <div className="premium-section-heading-inline">
          <div>
            <span className="premium-eyebrow">
              {esArtista ? 'Configuración del Artista' : 'Cuenta y colaboración'}
            </span>
            <h2>Herramientas de administración</h2>
          </div>
        </div>

        <div className="premium-tools-grid">
          {configurationActions
            .filter((item) => typeof item.action === 'function')
            .map((item) => (
              <button key={item.label} type="button" onClick={item.action}>
                <span><AppIcon name={item.icon} size={20} /></span>
                <strong>{item.label}</strong>
                <AppIcon name="chevron" size={16} />
              </button>
            ))}
        </div>
      </section>
    </div>
  );
}
