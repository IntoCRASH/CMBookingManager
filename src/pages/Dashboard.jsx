import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getMyProfile } from '../lib/profileService';
import { APP_CONFIG } from '../lib/config';
import { getCotizaciones } from '../lib/cotizacionesService';

export default function Dashboard({
  session,
  goTarifas,
  goClientes,
  goNuevaCotizacion,
  goCotizaciones,
  goCalendario,
  goComisiones,
  goUsuarios,
  goFormatos,
  goTiposEvento,
}) {
  const [profile, setProfile] = useState(null);
  const [eventosHoy, setEventosHoy] = useState(0);
  const [proximoEvento, setProximoEvento] = useState(null);
  const [cotizacionesPendientes, setCotizacionesPendientes] = useState(0);
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
    if (c.saldo_pendiente !== undefined && c.saldo_pendiente !== null) {
      return Number(c.saldo_pendiente || 0);
    }

    return Math.max(Number(c.total || 0) - obtenerPagado(c), 0);
  }

  async function cargarResumen() {
    try {
      const cotizaciones = await getCotizaciones();

      const hoy = new Date().toISOString().slice(0, 10);
      const mesActual = hoy.slice(0, 7);

      const eventosConfirmados = cotizaciones
        .filter((c) =>
          c.fecha_evento &&
          c.estado === 'Confirmada'
        )
        .sort((a, b) => new Date(a.fecha_evento) - new Date(b.fecha_evento));

      const eventosDeHoy = eventosConfirmados.filter(
        (c) => c.fecha_evento === hoy
      );

      const proximo = eventosConfirmados.find(
        (c) => c.fecha_evento >= hoy
      );

      const pendientes = cotizaciones.filter((c) =>
        c.estado === 'Pendiente'
      );

      const cotizacionesConSaldo = cotizaciones.filter((c) =>
        ['Confirmada', 'Realizada'].includes(c.estado) &&
        obtenerSaldoPendiente(c) > 0
      );

      const totalPendiente = cotizacionesConSaldo.reduce(
        (sum, c) => sum + obtenerSaldoPendiente(c),
        0
      );

      const totalCobradoMes = cotizaciones
        .filter((c) =>
          c.fecha_evento &&
          String(c.fecha_evento).slice(0, 7) === mesActual
        )
        .reduce((sum, c) => sum + obtenerPagado(c), 0);

      setEventosHoy(eventosDeHoy.length);
      setProximoEvento(proximo || null);
      setCotizacionesPendientes(pendientes.length);
      setBalancePendiente(totalPendiente);
      setCobradoMes(totalCobradoMes);
    } catch (err) {
      console.error(err);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="dashboard">
      <header>
        <div>
          <h1>{APP_CONFIG.empresa}</h1>

          <h2 style={{ marginTop: 20 }}>
            Hola,
            {profile ? ` ${profile.nombre}` : ''} 👋
          </h2>

          <p style={{ fontSize: 18, marginTop: 12 }}>
            Hoy, <strong>{APP_CONFIG.artista}</strong> tiene{' '}
            <strong>{eventosHoy}</strong>{' '}
            evento{eventosHoy !== 1 ? 's' : ''} confirmado
            {eventosHoy !== 1 ? 's' : ''}.
          </p>

          <p style={{ opacity: .65, marginTop: 10 }}>
            {session.user.email}
          </p>

          <p>
            {profile ? `${profile.rol.toUpperCase()}` : 'Cargando...'}
          </p>
        </div>

        <button onClick={logout}>Salir</button>
      </header>

      <div className="dashboard-resumen">
        <div className="dashboard-card grande">
          <h2>🎵 Próximo Evento Confirmado</h2>

          {proximoEvento ? (
            <>
              <h3>{proximoEvento.tipo_evento || 'Evento'}</h3>

              <p>
                <strong>{proximoEvento.clientes?.nombre || 'Cliente sin nombre'}</strong>
              </p>

              <p>
                📍 {proximoEvento.venue || proximoEvento.provincias?.nombre || 'Lugar pendiente'}
              </p>

              <p>
                📅 {proximoEvento.fecha_evento}
                {proximoEvento.hora_inicio ? ` · ${proximoEvento.hora_inicio}` : ''}
              </p>

              <button onClick={() => goCotizaciones()}>
                Ver cotizaciones
              </button>
            </>
          ) : (
            <p style={{ opacity: .6 }}>
              No hay próximos eventos confirmados.
            </p>
          )}
        </div>

        <div className="dashboard-card">
          <h2>📅 Eventos Hoy</h2>
          <strong>{eventosHoy}</strong>
        </div>

        <div className="dashboard-card">
          <h2>💰 Balance Pendiente</h2>
          <strong>RD$ {balancePendiente.toLocaleString()}</strong>
        </div>

        <div className="dashboard-card">
          <h2>📄 Cotizaciones Pendientes</h2>
          <strong>{cotizacionesPendientes}</strong>
        </div>

        <div className="dashboard-card">
          <h2>💵 Cobrado este mes</h2>
          <strong>RD$ {cobradoMes.toLocaleString()}</strong>
        </div>
      </div>

      <div className="menu">
        <h3 className="menu-title">Operación</h3>

        <button onClick={goNuevaCotizacion}>📝 Nueva Cotización</button>
        <button onClick={goCotizaciones}>📄 Cotizaciones</button>
        <button onClick={goCalendario}>📅 Calendario</button>
        <button onClick={goComisiones}>💰 Comisiones</button>

        {profile?.rol === 'admin' && (
          <>
            <hr className="menu-divider" />

            <h3 className="menu-title">Configuración</h3>

            <button onClick={goUsuarios}>👤 Usuarios</button>
            <button onClick={goFormatos}>🎵 Formatos</button>
            <button onClick={goTiposEvento}>🎤 Tipos de Evento</button>
            <button onClick={goTarifas}>⚙️ Tarifas</button>
          </>
        )}
      </div>
    </div>
  );
}