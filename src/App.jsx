import { useEffect, useRef, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabaseClient';
import { getMyProfile } from './lib/profileService';
import {
  canEditWorkspaceConfiguration,
  clearCurrentActiveWorkspace,
  getWorkspaceRoleLabel,
  loadMyWorkspaceContext,
  selectWorkspace,
} from './lib/workspaceService';
import Landing from './pages/Landing';
import Login from './pages/Login';
import { ensureMyAccountReady } from './lib/authService';
import Dashboard from './pages/Dashboard';
import Tarifas from './pages/Tarifas';
import Clientes from './pages/Clientes';
import NuevaCotizacion from './pages/NuevaCotizacion';
import VerCotizacion from './pages/VerCotizacion';
import Cotizaciones from './pages/Cotizaciones';
import Calendario from './pages/Calendario';
import PagosCotizacion from './pages/PagosCotizacion';
import Comisiones from './pages/Comisiones';
import Documentos from './pages/Documentos';
import Tutorial from './pages/Tutorial';
import Formatos from './pages/Formatos';
import TiposEvento from './pages/TiposEvento';
import Perfil from './pages/Perfil';
import Equipo from './pages/Equipo';
import InvitacionesPendientes from './pages/InvitacionesPendientes';
import AceptarInvitacionGestor from './pages/AceptarInvitacionGestor';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [workspaceVersion, setWorkspaceVersion] = useState(0);
  const [page, setPage] = useState('dashboard');
  const [cotizacionId, setCotizacionId] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const [passwordRecovery, setPasswordRecovery] =
    useState(() =>
      new URLSearchParams(
        window.location.search
      ).get('reset_password') === '1'
    );

  const navigationHistory = useRef([]);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error(error);
      }

      setSession(data?.session || null);
      setLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);

      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }

      if (!currentSession) {
        setProfile(null);
        setWorkspaces([]);
        setActiveWorkspace(null);
        setAccountError('');
        setPage('dashboard');
        setCotizacionId(null);
        setMoreOpen(false);
        clearCurrentActiveWorkspace();
        navigationHistory.current = [];
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      if (!session?.user?.id) return;

      try {
        setAccountLoading(true);
        setAccountError('');

        await ensureMyAccountReady();

        const [currentProfile, workspaceContext] =
          await Promise.all([
            getMyProfile(),
            loadMyWorkspaceContext(
              session.user.id
            ),
          ]);

        if (cancelled) return;

        setProfile(currentProfile);
        setWorkspaces(workspaceContext.workspaces);
        setActiveWorkspace(workspaceContext.activeWorkspace);
      } catch (error) {
        if (cancelled) return;

        console.error(error);
        setAccountError(
          error.message || 'No se pudo cargar la cuenta de MiBooking.'
        );
      } finally {
        if (!cancelled) {
          setAccountLoading(false);
        }
      }
    }

    loadAccount();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const esArtista = canEditWorkspaceConfiguration(activeWorkspace);
  const roleLabel = getWorkspaceRoleLabel(activeWorkspace);

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
    const paginasSoloArtista = [
      'tarifas',
      'formatos',
      'tipos-evento',
      'equipo',
    ];

    if (paginasSoloArtista.includes(nombrePagina) && !esArtista) {
      setMoreOpen(false);
      return;
    }

    const destinoCotizacionId = normalizarCotizacionId(nombrePagina, id);
    const mismaPagina = page === nombrePagina;
    const mismaCotizacion =
      String(cotizacionId ?? '') === String(destinoCotizacionId ?? '');

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

  function abrirCotizacionGuardada(id, cotizacionWorkspaceId) {
    const targetWorkspaceId = Number(
      cotizacionWorkspaceId || activeWorkspace?.workspace_id
    );

    if (
      Number.isFinite(targetWorkspaceId) &&
      targetWorkspaceId > 0 &&
      targetWorkspaceId !== Number(activeWorkspace?.workspace_id)
    ) {
      try {
        const selected = selectWorkspace(
          workspaces,
          targetWorkspaceId,
          session?.user?.id
        );

        setActiveWorkspace(selected);
        setWorkspaceVersion((current) => current + 1);
      } catch (error) {
        console.error(error);
        setAccountError(
          error.message ||
            'La cotización se guardó, pero no se pudo abrir el Artista seleccionado.'
        );
        return;
      }
    }

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

  function actualizarPerfilLocal(perfilActualizado) {
    const nuevoNombreUsuario =
      perfilActualizado?.nombre_completo || '';

    const nuevoNombreWorkspace =
      perfilActualizado?.workspace_name ||
      perfilActualizado?.nombre_artistico ||
      '';

    setProfile((actual) => ({
      ...actual,
      nombre:
        nuevoNombreUsuario ||
        actual?.nombre ||
        '',
    }));

    if (nuevoNombreWorkspace && activeWorkspace?.workspace_id) {
      setActiveWorkspace((actual) =>
        actual
          ? {
              ...actual,
              workspace_name: nuevoNombreWorkspace,
            }
          : actual
      );

      setWorkspaces((actuales) =>
        actuales.map((item) =>
          String(item.workspace_id) ===
          String(activeWorkspace.workspace_id)
            ? {
                ...item,
                workspace_name: nuevoNombreWorkspace,
              }
            : item
        )
      );
    }
  }

  function cambiarWorkspace(event) {
    try {
      const selected = selectWorkspace(
        workspaces,
        event.target.value,
        session?.user?.id
      );

      setActiveWorkspace(selected);
      setPage('dashboard');
      setCotizacionId(null);
      setMoreOpen(false);
      navigationHistory.current = [];

      // Fuerza a que las páginas vuelvan a solicitar sus datos.
      setWorkspaceVersion((current) => current + 1);
    } catch (error) {
      console.error(error);
      setAccountError(error.message || 'No se pudo cambiar de Artista.');
    }
  }

  async function refreshWorkspaceAccess(preferredWorkspaceId = null) {
    if (!session?.user?.id) return;

    try {
      setAccountLoading(true);
      setAccountError('');

      const workspaceContext = await loadMyWorkspaceContext(
        session.user.id
      );

      let selectedWorkspace = workspaceContext.activeWorkspace;

      if (preferredWorkspaceId) {
        selectedWorkspace = selectWorkspace(
          workspaceContext.workspaces,
          preferredWorkspaceId,
          session.user.id
        );
      }

      setWorkspaces(workspaceContext.workspaces);
      setActiveWorkspace(selectedWorkspace);
      setPage('dashboard');
      setCotizacionId(null);
      setMoreOpen(false);
      navigationHistory.current = [];
      setWorkspaceVersion((current) => current + 1);
    } catch (error) {
      console.error(error);
      setAccountError(
        error.message || 'No se pudo actualizar el acceso.'
      );
    } finally {
      setAccountLoading(false);
    }
  }

  async function logout() {
    navigationHistory.current = [];
    clearCurrentActiveWorkspace();
    await supabase.auth.signOut();
  }

  const navDesktop = (() => {
    const base = [
      {
        id: 'dashboard',
        label: 'Inicio',
        action: volverDashboard,
      },
      {
        id: 'tutorial',
        label: 'Tutorial',
        action: () => irA('tutorial'),
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
        id: 'documentos',
        label: 'Documentos',
        action: () => irA('documentos'),
      },
      {
        id: 'comisiones',
        label: 'Comisiones',
        action: () => irA('comisiones'),
      },
    ];

    if (!esArtista) {
      return [
        ...base,
        {
          id: 'perfil',
          label: 'Mi perfil',
          action: () => irA('perfil'),
        },
        {
          id: 'invitaciones',
          label: 'Invitaciones',
          action: () => irA('invitaciones'),
        },
      ];
    }

    return [
      ...base,
      {
        id: 'equipo',
        label: 'Equipo',
        action: () => irA('equipo'),
      },
      {
        id: 'perfil',
        label: 'Perfil',
        action: () => irA('perfil'),
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
  })();

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

  function terminarRecuperacionPassword() {
    const url = new URL(
      window.location.href
    );

    url.searchParams.delete(
      'reset_password'
    );

    url.searchParams.delete(
      'code'
    );

    url.hash = '';

    window.history.replaceState(
      {},
      '',
      `${url.pathname}${url.search}`
    );

    setPasswordRecovery(false);
    setPage('dashboard');
  }

  const invitationToken =
    new URLSearchParams(
      window.location.search
    ).get('invitacion_gestor');

  if (passwordRecovery) {
    return (
      <>
        <Login
          initialMode="reset"
          onPasswordUpdated={
            terminarRecuperacionPassword
          }
        />

        <Toaster
          position="bottom-right"
        />
      </>
    );
  }

  if (invitationToken) {
    return (
      <>
        <AceptarInvitacionGestor
          token={invitationToken}
          session={session}
          authLoading={loading}
        />

        <Toaster
          position="bottom-right"
        />
      </>
    );
  }

  let contenido;

  if (loading || accountLoading) {
    contenido = <div className="app-loading">Cargando MiBooking...</div>;
  } else if (!session) {
    contenido = <Landing />;
  } else if (accountError) {
    contenido = (
      <div className="workspace-state-card">
        <h1>No pudimos abrir tu cuenta</h1>
        <p>{accountError}</p>
        <button type="button" onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    );
  } else if (!activeWorkspace) {
    contenido =
      page === 'perfil' ? (
        <Perfil
          workspaceId={null}
          workspace={null}
          esArtista={false}
          readOnly={false}
          goBack={() => setPage('dashboard')}
          onProfileUpdated={
            actualizarPerfilLocal
          }
        />
      ) : (
        <>
          <section className="workspace-state-card">
            <h1>Tu cuenta de Gestor</h1>

            <p>
              Completa tu perfil personal o acepta
              una invitación para comenzar a trabajar
              con un Artista.
            </p>

            <button
              type="button"
              onClick={() =>
                setPage('perfil')
              }
            >
              Abrir mi perfil
            </button>
          </section>

          <InvitacionesPendientes
            onInvitationAccepted={
              refreshWorkspaceAccess
            }
            onLogout={logout}
          />
        </>
      );
  } else {
    const sharedProps = {
      workspaceId: activeWorkspace.workspace_id,
      workspace: activeWorkspace,
      esArtista,
      readOnly: !esArtista,
    };

    switch (page) {
      case 'tarifas':
        contenido = (
          <Tarifas {...sharedProps} goBack={volverAtras} />
        );
        break;

      case 'clientes':
        contenido = (
          <Clientes {...sharedProps} goBack={volverAtras} />
        );
        break;

      case 'nueva-cotizacion':
        contenido = (
          <NuevaCotizacion
            {...sharedProps}
            workspaces={workspaces}
            session={session}
            cotizacionId={cotizacionId}
            goBack={volverAtras}
            onCotizacionGuardada={abrirCotizacionGuardada}
          />
        );
        break;

      case 'cotizaciones':
        contenido = (
          <Cotizaciones
            {...sharedProps}
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
            {...sharedProps}
            goBack={volverAtras}
            abrirCotizacion={abrirCotizacion}
            editarCotizacion={editarCotizacion}
          />
        );
        break;

      case 'ver-cotizacion':
        contenido = (
          <VerCotizacion
            {...sharedProps}
            cotizacionId={cotizacionId}
            goBack={volverAtras}
          />
        );
        break;

      case 'pagos-cotizacion':
        contenido = (
          <PagosCotizacion
            {...sharedProps}
            cotizacionId={cotizacionId}
            goBack={volverAtras}
          />
        );
        break;

      case 'tutorial':
        contenido = (
          <Tutorial
            {...sharedProps}
            goBack={volverAtras}
            goPerfil={() => irA('perfil')}
            goEquipo={() => irA('equipo')}
            goFormatos={() => irA('formatos')}
            goTiposEvento={() => irA('tipos-evento')}
            goTarifas={() => irA('tarifas')}
            goClientes={() => irA('clientes')}
            goNuevaCotizacion={() => irA('nueva-cotizacion')}
            goCotizaciones={() => irA('cotizaciones')}
            goDocumentos={() => irA('documentos')}
            goCalendario={() => irA('calendario')}
            goComisiones={() => irA('comisiones')}
            goInvitaciones={() => irA('invitaciones')}
          />
        );
        break;

      case 'documentos':
        contenido = (
          <Documentos
            {...sharedProps}
            goBack={volverAtras}
          />
        );
        break;

      case 'comisiones':
        contenido = (
          <Comisiones {...sharedProps} goBack={volverAtras} />
        );
        break;

      case 'equipo':
        contenido = esArtista ? (
          <Equipo
            {...sharedProps}
            goBack={volverAtras}
            onInvitationAccepted={refreshWorkspaceAccess}
          />
        ) : (
          <InvitacionesPendientes
            goBack={volverAtras}
            onInvitationAccepted={refreshWorkspaceAccess}
          />
        );
        break;

      case 'invitaciones':
        contenido = (
          <InvitacionesPendientes
            goBack={volverAtras}
            onInvitationAccepted={refreshWorkspaceAccess}
          />
        );
        break;

      case 'perfil':
        contenido = (
          <Perfil
            {...sharedProps}
            goBack={volverAtras}
            goEquipo={() => irA('equipo')}
            onProfileUpdated={actualizarPerfilLocal}
          />
        );
        break;

      case 'formatos':
        contenido = (
          <Formatos {...sharedProps} goBack={volverAtras} />
        );
        break;

      case 'tipos-evento':
        contenido = (
          <TiposEvento {...sharedProps} goBack={volverAtras} />
        );
        break;

      default:
        contenido = (
          <Dashboard
            {...sharedProps}
            session={session}
            goPerfil={() => irA('perfil')}
            goEquipo={() => irA('equipo')}
            goInvitaciones={() => irA('invitaciones')}
            goTarifas={() => irA('tarifas')}
            goCotizaciones={() => irA('cotizaciones')}
            goCalendario={() => irA('calendario')}
            goDocumentos={() => irA('documentos')}
            goTutorial={() => irA('tutorial')}
            goComisiones={() => irA('comisiones')}
            goFormatos={() => irA('formatos')}
            goTiposEvento={() => irA('tipos-evento')}
          />
        );
        break;
    }
  }

  if (!session || !activeWorkspace) {
    return (
      <>
        {contenido}
        <Toaster position="bottom-right" />
      </>
    );
  }

  return (
    <div
      className={`app-shell page-${page}`}
      data-workspace-id={activeWorkspace.workspace_id}
    >
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
              {(activeWorkspace?.workspace_name || 'A')
                .slice(0, 1)
                .toUpperCase()}
            </div>

            <div className="user-meta">
              {workspaces.length > 1 ? (
                <select
                  className="topbar-artist-select"
                  value={activeWorkspace.workspace_id}
                  onChange={cambiarWorkspace}
                  aria-label="Seleccionar Artista"
                >
                  {workspaces.map((workspaceItem) => (
                    <option
                      key={workspaceItem.workspace_id}
                      value={workspaceItem.workspace_id}
                    >
                      {workspaceItem.workspace_name}
                    </option>
                  ))}
                </select>
              ) : (
                <strong>
                  {activeWorkspace.workspace_name || 'Artista'}
                </strong>
              )}

              <small>{roleLabel}</small>
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

      <main
        className="app-content"
        key={`${activeWorkspace.workspace_id}-${workspaceVersion}`}
      >
        {contenido}
      </main>

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
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />

            <div className="mobile-workspace-context">
              <span>Trabajando con</span>

              {workspaces.length > 1 ? (
                <select
                  value={activeWorkspace.workspace_id}
                  onChange={cambiarWorkspace}
                  aria-label="Seleccionar Artista"
                >
                  {workspaces.map((workspace) => (
                    <option
                      key={workspace.workspace_id}
                      value={workspace.workspace_id}
                    >
                      {workspace.workspace_name}
                    </option>
                  ))}
                </select>
              ) : (
                <strong>{activeWorkspace.workspace_name}</strong>
              )}

              <small>{roleLabel}</small>
            </div>

            <h3>Más opciones</h3>

            <div className="sheet-actions">
              <button type="button" onClick={() => irA('tutorial')}>
                ◈ Tutorial
              </button>

              <button type="button" onClick={() => irA('clientes')}>
                ◉ Clientes
              </button>

              <button type="button" onClick={() => irA('documentos')}>
                ▤ Documentos
              </button>

              <button type="button" onClick={() => irA('comisiones')}>
                ◇ Comisiones
              </button>

              <button type="button" onClick={() => irA('perfil')}>
                ◉ {esArtista ? 'Perfil del Artista' : 'Mi perfil'}
              </button>

              {esArtista ? (
                <>
                  <button type="button" onClick={() => irA('equipo')}>
                    ◉ Equipo y Gestores
                  </button>

                  <button type="button" onClick={() => irA('formatos')}>
                    ♪ Formatos
                  </button>

                  <button
                    type="button"
                    onClick={() => irA('tipos-evento')}
                  >
                    ◆ Tipos de evento
                  </button>

                  <button type="button" onClick={() => irA('tarifas')}>
                    ◎ Tarifas por zona
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => irA('invitaciones')}
                >
                  ◉ Invitaciones
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
