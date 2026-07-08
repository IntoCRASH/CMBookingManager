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
}) {
  const [profile, setProfile] = useState(null);
  const [eventosHoy, setEventosHoy] = useState(0);
  const [proximoEvento, setProximoEvento] = useState(null);

useEffect(() => {
  cargarPerfil();
  cargarEventosHoy();
}, []);

  async function cargarPerfil() {
    try {
      const p = await getMyProfile();
      setProfile(p);
    } catch (err) {
      console.error(err);
    }
  }
async function cargarEventosHoy() {
  try {
    const cotizaciones = await getCotizaciones();

    const hoy = new Date().toISOString().slice(0, 10);

    const eventosValidos = cotizaciones
      .filter((c) => c.fecha_evento && c.estado !== 'Cancelada')
      .sort((a, b) => new Date(a.fecha_evento) - new Date(b.fecha_evento));

    const eventosDeHoy = eventosValidos.filter(
      (c) => c.fecha_evento === hoy
    );

    const proximo = eventosValidos.find(
      (c) => c.fecha_evento >= hoy
    );

    setEventosHoy(eventosDeHoy.length);
    setProximoEvento(proximo || null);
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

<p
  style={{
    fontSize: 18,
    marginTop: 12,
  }}
>
  Hoy, <strong>{APP_CONFIG.artista}</strong> tiene{' '}
  <strong>{eventosHoy}</strong>{' '}
  evento{eventosHoy !== 1 ? 's' : ''} programado
  {eventosHoy !== 1 ? 's' : ''}.
</p>

<p
  style={{
    opacity: .65,
    marginTop: 10,
  }}
>
  {session.user.email}
</p>

<p>
  {profile
    ? `${profile.rol.toUpperCase()}`
    : 'Cargando...'}
</p>
        </div>

        <button onClick={logout}>Salir</button>
      </header>
<div className="dashboard-resumen">

<div className="dashboard-card grande">
  <h2>🎵 Próximo Evento</h2>

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
      No hay próximos eventos programados.
    </p>
  )}
</div>

  <div className="dashboard-card">

    <h2>📅 Eventos Hoy</h2>

    <strong>{eventosHoy}</strong>

  </div>

  <div className="dashboard-card">

    <h2>💰 Balance Pendiente</h2>

    <strong>RD$ 0</strong>

  </div>

  <div className="dashboard-card">

    <h2>📄 Cotizaciones Pendientes</h2>

    <strong>0</strong>

  </div>

  <div className="dashboard-card">

    <h2>💵 Cobrado este mes</h2>

    <strong>RD$ 0</strong>

  </div>

</div>
      <div className="menu">
        <button onClick={goNuevaCotizacion}>📝 Nueva Cotización</button>

        <button onClick={goClientes}>👥 Clientes</button>

        <button onClick={goCotizaciones}>
  📄 Cotizaciones
</button>
<button onClick={goCalendario}>
  📅 Calendario
</button>

        <button onClick={goComisiones}>💰 Comisiones</button>

        {profile?.rol === 'admin' && (
  <>
    <button onClick={goTarifas}>⚙️ Tarifas</button>

    <button onClick={goUsuarios}>👤 Usuarios</button>
  </>
)}
      </div>
    </div>
  );
}