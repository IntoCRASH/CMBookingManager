import { useEffect, useMemo, useRef, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabaseClient';
import { getMyProfile } from './lib/profileService';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tarifas from './pages/Tarifas';
import Clientes from './pages/Clientes';
import NuevaCotizacion from './pages/NuevaCotizacion';
import VerCotizacion from './pages/VerCotizacion';
import Cotizaciones from './pages/Cotizaciones';
import Calendario from './pages/Calendario';
import PagosCotizacion from './pages/PagosCotizacion';
import Comisiones from './pages/Comisiones';
import Usuarios from './pages/Usuarios';
import Formatos from './pages/Formatos';
import TiposEvento from './pages/TiposEvento';
import Perfil from './pages/Perfil';
import Artistas from './pages/Artistas';
import AutorizarArtista from './pages/AutorizarArtista';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [cotizacionId, setCotizacionId] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const navigationHistory = useRef([]);

  const tokenAutorizacionArtista = useMemo(
    () =>
      new URLSearchParams(
        window.location.search
      ).get('autorizar_artista'),
    []
  );

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      setSession(data.session);
      setLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, sessionActual) => {
        setSession(sessionActual);

        if (!sessionActual) {
          setProfile(null);
          setPage('dashboard');
          setCotizacionId(null);
          setMoreOpen(false);
          navigationHistory.current = [];
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function cargarPerfil() {
      if (!session) return;

      try {
        const perfil = await getMyProfile();
        setProfile(perfil);
      } catch (err) {
        console.error(err);
      }
    }

    cargarPerfil();
  }, [session]);

  function normalizarCotizacionId(nombrePagina, id) {
    const paginasConCotizacion = [
      'nueva-cotizacion',
      'ver-cotizacion',
      'pagos-cotizacion',
    ];

    return paginasConCotizacion.includes(nombrePagina)
      ? id ?? null
      : null;
  }

  function navegarA(nombrePagina, id = null) {
    const destinoCotizacionId = normalizarCotizacionId(
      nombrePagina,
      id
    );

    const mismaPagina = page === nombrePagina;

    const mismaCotizacion =
      String(cotizacionId ?? '') ===
      String(destinoCotizacionId ?? '');

    if (mismaPagina && mismaCotizacion) {
      setMoreOpen(false);
      return;
    }

    navigationHistory.current.push({
      page,
      cotizacionId,
    });

    setPage(nombrePagina);
    setCotizacionId(destinoCotizacionId);
    setMoreOpen(false);
  }

  function abrirCotizacion(id) {
    navegarA('ver-cotizacion', id);
  }

  function editarCotizacion(id) {
    navegarA('nueva-cotizacion', id);
  }

  function abrirPagos(id) {
    navegarA('pagos-cotizacion', id);
  }

  function volverDashboard() {
    navegarA('dashboard');
  }

  function nuevaCotizacion() {
    navegarA('nueva-cotizacion');
  }

  function volverAtras() {
    const paginaAnterior = navigationHistory.current.pop();

    if (paginaAnterior) {
      setPage(paginaAnterior.page || 'dashboard');
      setCotizacionId(paginaAnterior.cotizacionId ?? null);
    } else {
      setPage('dashboard');
      setCotizacionId(null);
    }

    setMoreOpen(false);
  }

  function irA(nombrePagina) {
    navegarA(nombrePagina);
  }

  function actualizarPerfilLocal(perfilNegocio) {
    setProfile((actual) => ({
      ...actual,
      nombre:
        perfilNegocio?.nombre_completo ||
        actual?.nombre ||
        '',
    }));
  }

  async function logout() {
    navigationHistory.current = [];
    await supabase.auth.signOut();
  }

  const esAdmin = profile?.rol === 'admin';

  const navDesktop = useMemo(() => {
    const base = [
      {
        id: 'dashboard',
        label: 'Inicio',
        action: volverDashboard,
      },
      {
        id: 'artistas',
        label: 'Artistas',
        action: () => irA('artistas'),
      },
      {
        id: 'cotizaciones',
        label: 'Cotizaciones',
        action: () => irA('cotizaciones'),
      },
      {
        id: 'clientes',
        label: 'Clientes',
        action: () => irA('clientes'),
      },
      {
        id: 'calendario',
        label: 'Calendario',
        action: () => irA('calendario'),
      },
      {
        id: 'comisiones',
        label: 'Comisiones',
        action: () => irA('comisiones'),
      },
    ];

    if (!esAdmin) return base;

    return [
      ...base,
      {
        id: 'perfil',
        label: 'Perfil',
        action: () => irA('perfil'),
      },
      {
        id: 'usuarios',
        label: 'Usuarios',
        action: () => irA('usuarios'),
      },
      {
        id: 'formatos',
        label: 'Formatos',
        action: () => irA('formatos'),
      },
      {
        id: 'tipos-evento',
        label: 'Tipos',
        action: () => irA('tipos-evento'),
      },
      {
        id: 'tarifas',
        label: 'Tarifas',
        action: () => irA('tarifas'),
      },
    ];
  }, [esAdmin, page, cotizacionId]);

  const mobileNav = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: '⌂',
      action: volverDashboard,
    },
    {
      id: 'cotizaciones',
      label: 'Cotiz.',
      icon: '▦',
      action: () => irA('cotizaciones'),
    },
    {
      id: 'artistas',
      label: 'Artistas',
      icon: '♫',
      action: () => irA('artistas'),
    },
    {
      id: 'calendario',
      label: 'Agenda',
      icon: '◷',
      action: () => irA('calendario'),
    },
    {
      id: 'more',
      label: 'Más',
      icon: '☰',
      action: () => setMoreOpen(true),
    },
  ];

  if (tokenAutorizacionArtista) {
    return (
      <>
        <AutorizarArtista
          token={tokenAutorizacionArtista}
        />

        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
          }}
        />
      </>
    );
  }

  let contenido;

  if (loading) {
    contenido = <div className="app-loading">Cargando...</div>;
  } else if (!session) {
    contenido = <Login />;
  } else {
    switch (page) {
      case 'artistas':
        contenido = (
          <Artistas goBack={volverAtras} />
        );
        break;

      case 'tarifas':
        contenido = <Tarifas goBack={volverAtras} />;
        break;

      case 'clientes':
        contenido = <Clientes goBack={volverAtras} />;
        break;

      case 'nueva-cotizacion':
        contenido = (
          <NuevaCotizacion
            session={session}
            cotizacionId={cotizacionId}
            goBack={volverAtras}
            goArtistas={() => irA('artistas')}
            onCotizacionGuardada={abrirCotizacion}
          />
        );
        break;

      case 'cotizaciones':
        contenido = (
          <Cotizaciones
            goBack={volverAtras}
            nuevaCotizacion={nuevaCotizacion}
            abrirCotizacion={abrirCotizacion}
            editarCotizacion={editarCotizacion}
            abrirPagos={abrirPagos}
          />
        );
        break;

      case 'calendario':
        contenido = (
          <Calendario
            goBack={volverAtras}
            abrirCotizacion={abrirCotizacion}
            editarCotizacion={editarCotizacion}
          />
        );
        break;

      case 'ver-cotizacion':
        contenido = (
          <VerCotizacion
            cotizacionId={cotizacionId}
            goBack={volverAtras}
          />
        );
        break;

      case 'pagos-cotizacion':
        contenido = (
          <PagosCotizacion
            cotizacionId={cotizacionId}
            goBack={volverAtras}
          />
        );
        break;

      case 'comisiones':
        contenido = <Comisiones goBack={volverAtras} />;
        break;

      case 'perfil':
        contenido = (
          <Perfil
            goBack={volverAtras}
            onProfileUpdated={actualizarPerfilLocal}
          />
        );
        break;

      case 'usuarios':
        contenido = <Usuarios goBack={volverAtras} />;
        break;

      case 'formatos':
        contenido = <Formatos goBack={volverAtras} />;
        break;

      case 'tipos-evento':
        contenido = <TiposEvento goBack={volverAtras} />;
        break;

      default:
        contenido = (
          <Dashboard
            session={session}
            goPerfil={() => irA('perfil')}
            goArtistas={() => irA('artistas')}
            goTarifas={() => irA('tarifas')}
            goCotizaciones={() => irA('cotizaciones')}
            goCalendario={() => irA('calendario')}
            goComisiones={() => irA('comisiones')}
            goUsuarios={() => irA('usuarios')}
            goFormatos={() => irA('formatos')}
            goTiposEvento={() => irA('tipos-evento')}
          />
        );
        break;
    }
  }

  if (!session) {
    return (
      <>
        {contenido}
        <Toaster position="bottom-right" />
      </>
    );
  }

  return (
    <div className={`app-shell page-${page}`}>
      {page !== 'ver-cotizacion' && (
        <nav className="desktop-topbar">
          <button
            className="brand-button"
            type="button"
            onClick={volverDashboard}
            aria-label="Ir al inicio de MiBooking"
          >
            <img
              src="/mibooking-icon.png"
              alt=""
              aria-hidden="true"
              style={{
                display: 'block',
                width: '48px',
                height: '48px',
                flex: '0 0 48px',
                objectFit: 'contain',
              }}
            />

            <span>
              <strong>MiBooking</strong>
              <small>Música · Eventos · Negocio</small>
            </span>
          </button>

          <div className="desktop-nav-links">
            {navDesktop.map((item) => (
              <button
                key={item.id}
                type="button"
                className={page === item.id ? 'active' : ''}
                onClick={item.action}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="topbar-user">
            <div className="avatar">
              {(profile?.nombre || session.user.email || 'C')
                .slice(0, 1)
                .toUpperCase()}
            </div>

            <div className="user-meta">
              <strong>{profile?.nombre || 'Usuario'}</strong>
              <small>{profile?.rol || 'usuario'}</small>
            </div>

            <button
              type="button"
              className="logout-button"
              onClick={logout}
            >
              Salir
            </button>
          </div>
        </nav>
      )}

      <main className="app-content">{contenido}</main>

      {page !== 'ver-cotizacion' && (
        <nav className="mobile-bottom-nav">
          {mobileNav.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                page === item.id ||
                (item.id === 'more' && moreOpen)
                  ? 'active'
                  : ''
              }
              onClick={item.action}
            >
              <span>{item.icon}</span>
              <small>{item.label}</small>
            </button>
          ))}
        </nav>
      )}

      {moreOpen && (
        <div
          className="mobile-more-backdrop"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="mobile-more-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-handle" />

            <h3>Más opciones</h3>

            <div className="sheet-actions">
              <button
                type="button"
                onClick={() => irA('artistas')}
              >
                ♫ Artistas
              </button>

              <button
                type="button"
                onClick={() => irA('clientes')}
              >
                ◉ Clientes
              </button>

              <button
                type="button"
                onClick={() => irA('comisiones')}
              >
                ◇ Comisiones
              </button>

              {esAdmin && (
                <button
                  type="button"
                  onClick={() => irA('perfil')}
                >
                  ◉ Perfil
                </button>
              )}

              {esAdmin && (
                <button
                  type="button"
                  onClick={() => irA('usuarios')}
                >
                  ◌ Usuarios
                </button>
              )}

              {esAdmin && (
                <button
                  type="button"
                  onClick={() => irA('formatos')}
                >
                  ♪ Formatos
                </button>
              )}

              {esAdmin && (
                <button
                  type="button"
                  onClick={() => irA('tipos-evento')}
                >
                  ◆ Tipos de evento
                </button>
              )}

              {esAdmin && (
                <button
                  type="button"
                  onClick={() => irA('tarifas')}
                >
                  ◎ Tarifas
                </button>
              )}

              <button
                type="button"
                className="sheet-logout"
                onClick={logout}
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#111827',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: '16px',
            fontWeight: 700,
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </div>
  );
}