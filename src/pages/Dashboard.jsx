import { useEffect, useState } from 'react';
import { getMyProfile } from '../lib/profileService';
import { APP_CONFIG } from '../lib/config';
import { getCotizaciones } from '../lib/cotizacionesService';

export default function Dashboard({
  session,
  goTarifas,
  goCotizaciones,
  goCalendario,
  goComisiones,
  goUsuarios,
  goFormatos,
  goTiposEvento,
  goPerfil,
}) {
  const [profile, setProfile] = useState(null);
  const [eventosHoy, setEventosHoy] = useState(0);
  const [proximoEvento, setProximoEvento] = useState(null);
  const [cotizacionesPendientes, setCotizacionesPendientes] =
    useState(0);
  const [balancePendiente, setBalancePendiente] = useState(0);
  const [cobradoMes, setCobradoMes] = useState(0);

  useEffect(() => {
    cargarPerfil();
    cargarResumen();
  }, []);

  async function cargarPerfil() {
    try {
      const p = await getMyProfile();
      setProfile(p);
    } catch (err) {
      console.error(err);
    }
  }

  function obtenerPagado(c) {
    return Number(
      c.monto_pagado ||
        c.total_pagado ||
        c.pagado ||
        0
    );
  }

  function obtenerSaldoPendiente(c) {
    if (
      c.saldo_pendiente !== undefined &&
      c.saldo_pendiente !== null
    ) {
      return Number(c.saldo_pendiente || 0);
    }

    return Math.max(
      Number(c.total || 0) - obtenerPagado(c),
      0
    );
  }

  async function cargarResumen() {
    try {
      const cotizaciones = await getCotizaciones();
      const hoy = new Date().toISOString().slice(0, 10);
      const mesActual = hoy.slice(0, 7);

      const eventosConfirmados = cotizaciones
        .filter(
          (c) =>
            c.fecha_evento &&
            c.estado === 'Confirmada'
        )
        .sort(
          (a, b) =>
            new Date(a.fecha_evento) -
            new Date(b.fecha_evento)
        );

      const eventosDeHoy = eventosConfirmados.filter(
        (c) => c.fecha_evento === hoy
      );

      const proximo = eventosConfirmados.find(
        (c) => c.fecha_evento >= hoy
      );

      const pendientes = cotizaciones.filter((c) =>
        [
          'Pendiente',
          'Pendiente de aprobación',
          'Pendiente de cobro',
        ].includes(c.estado)
      );

      const cotizacionesConSaldo = cotizaciones.filter(
        (c) =>
          ['Confirmada', 'Realizada'].includes(c.estado) &&
          obtenerSaldoPendiente(c) > 0
      );

      const totalPendiente = cotizacionesConSaldo.reduce(
        (sum, c) => sum + obtenerSaldoPendiente(c),
        0
      );

      const totalCobradoMes = cotizaciones
        .filter(
          (c) =>
            c.fecha_evento &&
            String(c.fecha_evento).slice(0, 7) ===
              mesActual
        )
        .reduce(
          (sum, c) => sum + obtenerPagado(c),
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

    const d = new Date(`${fecha}T00:00:00`);

    return {
      dia: d.toLocaleDateString('es-DO', {
        day: '2-digit',
      }),

      mes: d
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

  const esAdmin = profile?.rol === 'admin';

  return (
    <div className="dashboard dashboard-mobile-first">
      <section className="mobile-welcome-card">
        <div>
          <span className="eyebrow">MiBooking</span>

          <h1>
            Hola
            {profile?.nombre
              ? `, ${profile.nombre}`
              : ''}
          </h1>

          <p>
            Hoy, <strong>{APP_CONFIG.artista}</strong>{' '}
            tiene <strong>{eventosHoy}</strong>{' '}
            evento
            {eventosHoy !== 1 ? 's' : ''} confirmado
            {eventosHoy !== 1 ? 's' : ''}.
          </p>
        </div>

        <div className="profile-pill">
          <span>
            {(profile?.nombre ||
              session?.user?.email ||
              'C')
              .slice(0, 1)
              .toUpperCase()}
          </span>

          <div>
            <strong>
              {profile?.nombre || 'Usuario'}
            </strong>

            <small>
              {profile?.rol || 'usuario'}
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

          <button
            type="button"
            onClick={goCalendario}
          >
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
              Cuando confirmes una cotización con
              fecha, aparecerá aquí.
            </span>
          </div>
        )}
      </section>

      <section className="quick-actions-card">
        <div className="section-heading">
          <span>Operación rápida</span>
        </div>

        <div className="quick-actions-grid">
          <button
            type="button"
            onClick={goCotizaciones}
          >
            📄
            <span>Cotizaciones</span>
          </button>

          <button
            type="button"
            onClick={goCalendario}
          >
            📅
            <span>Calendario</span>
          </button>

          <button
            type="button"
            onClick={goComisiones}
          >
            💰
            <span>Comisiones</span>
          </button>

          {esAdmin && (
            <button
              type="button"
              onClick={goPerfil}
            >
              👤
              <span>Perfil</span>
            </button>
          )}

          {esAdmin && (
            <button
              type="button"
              onClick={goUsuarios}
            >
              👥
              <span>Usuarios</span>
            </button>
          )}

          {esAdmin && (
            <button
              type="button"
              onClick={goFormatos}
            >
              🎵
              <span>Formatos</span>
            </button>
          )}

          {esAdmin && (
            <button
              type="button"
              onClick={goTiposEvento}
            >
              🎤
              <span>Tipos de evento</span>
            </button>
          )}

          {esAdmin && (
            <button
              type="button"
              onClick={goTarifas}
            >
              ⚙️
              <span>Tarifas</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}