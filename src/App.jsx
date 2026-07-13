import { useEffect, useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
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
import { ensureMyAccountReady } from './lib/authService';
import {
  clearStoredSelectedBillingCycle,
  clearStoredSelectedPlan,
  createCheckoutSession,
  getStoredSelectedPlan,
  getWorkspaceSubscription,
  getPlanLabel,
  getSubscriptionAccessState,
  isInitialSubscriptionState,
  isSubscriptionAccessAllowed,
  normalizePlanCode,
  planFromLocation,
  storeSelectedPlan,
  waitForWorkspaceSubscriptionAccess,
} from './lib/subscriptionService';
import SubscriptionGate from './pages/SubscriptionGate';
import BillingAccessGate from './pages/BillingAccessGate';
import BillingStatusBanner from './components/BillingStatusBanner';
import Legal from './pages/Legal';
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
import Suscripcion from './pages/Suscripcion';
import Equipo from './pages/Equipo';
import InvitacionesPendientes from './pages/InvitacionesPendientes';
import AceptarInvitacionGestor from './pages/AceptarInvitacionGestor';
import './styles/NavigationBalanced.css';

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
  const [settingsOpen, setSettingsOpen] =
    useState(false);

  const [workspaceSubscription, setWorkspaceSubscription] =
    useState(null);

  const [subscriptionLoading, setSubscriptionLoading] =
    useState(false);

  const [subscriptionError, setSubscriptionError] =
    useState('');

  const [checkoutLoading, setCheckoutLoading] =
    useState(false);

  const [
    checkoutConfirmation,
    setCheckoutConfirmation,
  ] = useState({
    status: 'idle',
    message: '',
  });

  const [
    checkoutConfirmationAttempt,
    setCheckoutConfirmationAttempt,
  ] = useState(0);

  const [selectedPlan, setSelectedPlan] =
    useState(() =>
      planFromLocation() ||
      getStoredSelectedPlan()
    );

  const currentQuery =
    new URLSearchParams(
      window.location.search
    );

  const checkoutResult =
    currentQuery.get('checkout') || '';

  const billingResult =
    currentQuery.get('billing') || '';

  const legalSection =
    currentQuery.get('legal') || '';

  const checkoutNoticeShown =
    useRef(false);

  const checkoutCancelNoticeShown =
    useRef(false);

  const checkoutConfirmationStarted =
    useRef(false);

  const billingNoticeShown =
    useRef(false);

  const settingsRef =
    useRef(null);

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
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);

      if (!currentSession) {
        setProfile(null);
        setWorkspaces([]);
        setActiveWorkspace(null);
        setAccountError('');
        setPage('dashboard');
        setCotizacionId(null);
        setMoreOpen(false);
        setWorkspaceSubscription(null);
        setSubscriptionError('');
        setCheckoutLoading(false);
        setCheckoutConfirmation({
          status: 'idle',
          message: '',
        });
        checkoutConfirmationStarted.current =
          false;
        checkoutNoticeShown.current =
          false;
        checkoutCancelNoticeShown.current =
          false;
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
    if (!settingsOpen) {
      return undefined;
    }

    function closeSettings(event) {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(
          event.target
        )
      ) {
        setSettingsOpen(false);
      }
    }

    document.addEventListener(
      'pointerdown',
      closeSettings
    );

    return () => {
      document.removeEventListener(
        'pointerdown',
        closeSettings
      );
    };
  }, [settingsOpen]);

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

  useEffect(() => {
    const metadataPlan =
      normalizePlanCode(
        session?.user?.user_metadata
          ?.mibooking_plan_code
      );

    const pendingPlan =
      planFromLocation() ||
      getStoredSelectedPlan() ||
      metadataPlan;

    if (pendingPlan) {
      setSelectedPlan(pendingPlan);
      storeSelectedPlan(pendingPlan);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadSubscription() {
      const workspaceId =
        activeWorkspace?.workspace_id;

      if (!session?.user?.id || !workspaceId) {
        setWorkspaceSubscription(null);
        setSubscriptionError('');
        setSubscriptionLoading(false);
        return;
      }

      try {
        setSubscriptionLoading(true);
        setSubscriptionError('');

        const currentSubscription =
          await getWorkspaceSubscription(
            workspaceId
          );

        if (cancelled) return;

        setWorkspaceSubscription(
          currentSubscription
        );
      } catch (error) {
        if (cancelled) return;

        console.error(error);
        setWorkspaceSubscription(null);
        setSubscriptionError(
          error.message ||
            'No se pudo consultar la suscripción.'
        );
      } finally {
        if (!cancelled) {
          setSubscriptionLoading(false);
        }
      }
    }

    loadSubscription();

    return () => {
      cancelled = true;
    };
  }, [
    session?.user?.id,
    activeWorkspace?.workspace_id,
    workspaceVersion,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function confirmarRetornoCheckout() {
      const checkoutWasSuccessful =
        checkoutResult === 'success' ||
        billingResult === 'success';

      const workspaceId =
        activeWorkspace?.workspace_id;

      if (
        !checkoutWasSuccessful ||
        !session?.user?.id ||
        !workspaceId ||
        checkoutConfirmationStarted.current
      ) {
        return;
      }

      checkoutConfirmationStarted.current =
        true;

      setCheckoutConfirmation({
        status: 'confirming',
        message:
          'Stripe confirmó el proceso. Estamos activando tu suscripción en MiBooking.',
      });

      setSubscriptionError('');

      try {
        const result =
          await waitForWorkspaceSubscriptionAccess({
            workspaceId,
            maxAttempts: 24,
            intervalMs: 1500,
          });

        if (cancelled) {
          return;
        }

        if (result.subscription) {
          setWorkspaceSubscription(
            result.subscription
          );
        }

        if (!result.confirmed) {
          setCheckoutConfirmation({
            status: 'failed',
            message:
              'Stripe completó el proceso, pero MiBooking todavía no ha recibido la confirmación del webhook. Puedes reintentar sin volver a pagar.',
          });

          return;
        }

        setCheckoutConfirmation({
          status: 'success',
          message:
            'Tu suscripción está activa.',
        });

        if (
          !checkoutNoticeShown.current
        ) {
          checkoutNoticeShown.current =
            true;

          const activePlanLabel =
            getPlanLabel(
              result.subscription
                ?.plan_code
            ) || 'MiBooking';

          toast.success(
            result.subscription
              ?.status === 'trialing'
              ? `Tu plan ${activePlanLabel} está activo. Comenzaron tus 3 días de prueba gratis.`
              : `Pago confirmado. Tu plan ${activePlanLabel} está activo.`,
            {
              id: `checkout-success-${workspaceId}`,
              duration: 9000,
            }
          );
        }

        clearStoredSelectedPlan();
        clearStoredSelectedBillingCycle();
        setSelectedPlan('');

        setPage('dashboard');
        setCotizacionId(null);
        setMoreOpen(false);
        navigationHistory.current = [];

        const url =
          new URL(
            window.location.href
          );

        [
          'billing',
          'checkout',
          'session_id',
          'plan',
          'billingCycle',
          'billing_cycle',
        ].forEach((key) => {
          url.searchParams.delete(
            key
          );
        });

        window.history.replaceState(
          {},
          '',
          `${url.pathname}${
            url.search
          }${url.hash}`
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(error);

        setCheckoutConfirmation({
          status: 'failed',
          message:
            error.message ||
            'No se pudo confirmar la suscripción. Puedes reintentar sin volver a pagar.',
        });
      }
    }

    confirmarRetornoCheckout();

    return () => {
      cancelled = true;
    };
  }, [
    checkoutResult,
    billingResult,
    session?.user?.id,
    activeWorkspace?.workspace_id,
    checkoutConfirmationAttempt,
  ]);

  useEffect(() => {
    const checkoutWasCancelled =
      checkoutResult === 'cancelled' ||
      billingResult === 'cancelled';

    if (
      !checkoutWasCancelled ||
      checkoutCancelNoticeShown.current
    ) {
      return;
    }

    checkoutCancelNoticeShown.current =
      true;

    toast(
      'El proceso de suscripción fue cancelado. No se realizó un nuevo cobro.',
      {
        id: 'checkout-cancelled',
        duration: 7000,
      }
    );

    const url =
      new URL(
        window.location.href
      );

    [
      'billing',
      'checkout',
      'session_id',
    ].forEach((key) => {
      url.searchParams.delete(
        key
      );
    });

    window.history.replaceState(
      {},
      '',
      `${url.pathname}${
        url.search
      }${url.hash}`
    );
  }, [
    checkoutResult,
    billingResult,
  ]);

  function reintentarConfirmacionCheckout() {
    checkoutConfirmationStarted.current =
      false;

    setCheckoutConfirmation({
      status: 'idle',
      message: '',
    });

    setCheckoutConfirmationAttempt(
      (current) =>
        current + 1
    );
  }

  const esArtista = canEditWorkspaceConfiguration(activeWorkspace);
  const roleLabel = getWorkspaceRoleLabel(activeWorkspace);

  const subscriptionAccessState =
    getSubscriptionAccessState(
      workspaceSubscription
    );

  const subscriptionAccessAllowed =
    isSubscriptionAccessAllowed(
      workspaceSubscription
    );

  const initialSubscriptionRequired =
    isInitialSubscriptionState(
      workspaceSubscription
    );

  const subscriptionRestricted =
    subscriptionAccessState ===
    'restricted';

  const recoveryPageAllowed =
    subscriptionRestricted &&
    esArtista &&
    [
      'suscripcion',
      'perfil',
    ].includes(page);

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
      'perfil',
      'suscripcion',
      'tarifas',
      'formatos',
      'tipos-evento',
      'equipo',
    ];

    if (paginasSoloArtista.includes(nombrePagina) && !esArtista) {
      setMoreOpen(false);
      return;
    }

    if (subscriptionRestricted) {
      const recoveryPages =
        esArtista
          ? [
              'suscripcion',
              'perfil',
            ]
          : [];

      if (
        !recoveryPages.includes(
          nombrePagina
        )
      ) {
        setMoreOpen(false);
        return;
      }
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
    setSettingsOpen(false);
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

  function seleccionarPlanSuscripcion(planCode) {
    const plan = normalizePlanCode(planCode);

    if (!plan) return;

    setSelectedPlan(plan);
    storeSelectedPlan(plan);
    setSubscriptionError('');
  }

  async function recargarSuscripcion() {
    if (!activeWorkspace?.workspace_id) {
      return;
    }

    try {
      setSubscriptionLoading(true);
      setSubscriptionError('');

      const currentSubscription =
        await getWorkspaceSubscription(
          activeWorkspace.workspace_id
        );

      setWorkspaceSubscription(
        currentSubscription
      );
    } catch (error) {
      console.error(error);
      setSubscriptionError(
        error.message ||
          'No se pudo actualizar la suscripción.'
      );
    } finally {
      setSubscriptionLoading(false);
    }
  }

  async function iniciarCheckout(planCode) {
    const plan = normalizePlanCode(
      planCode || selectedPlan
    );

    if (!esArtista) {
      setSubscriptionError(
        'Solo el Artista propietario puede contratar un plan.'
      );
      return;
    }

    if (!activeWorkspace?.workspace_id) {
      setSubscriptionError(
        'No se encontró el proyecto del Artista.'
      );
      return;
    }

    if (!plan) {
      setSubscriptionError(
        'Selecciona un plan antes de continuar.'
      );
      return;
    }

    try {
      setCheckoutLoading(true);
      setSubscriptionError('');
      storeSelectedPlan(plan);
      setSelectedPlan(plan);

      const checkout =
        await createCheckoutSession({
          workspaceId:
            activeWorkspace.workspace_id,
          planCode: plan,
        });

      window.location.assign(
        checkout.checkoutUrl
      );
    } catch (error) {
      console.error(error);
      setSubscriptionError(
        error.message ||
          'No se pudo abrir Stripe Checkout.'
      );
      setCheckoutLoading(false);
    }
  }


  useEffect(() => {
    if (
      billingResult !== 'return' ||
      !session?.user?.id ||
      !activeWorkspace?.workspace_id ||
      billingNoticeShown.current
    ) {
      return;
    }

    billingNoticeShown.current = true;

    setPage('suscripcion');
    setCotizacionId(null);
    setMoreOpen(false);
    navigationHistory.current = [];

    toast.success(
      'Facturación actualizada. Stripe sincronizará cualquier cambio con MiBooking.',
      {
        id: 'billing-return',
        duration: 8000,
      }
    );

    const url =
      new URL(window.location.href);

    url.searchParams.delete('billing');

    window.history.replaceState(
      {},
      '',
      `${url.pathname}${
        url.search
      }${url.hash}`
    );
  }, [
    billingResult,
    session?.user?.id,
    activeWorkspace?.workspace_id,
  ]);

  async function logout() {
    navigationHistory.current = [];
    clearCurrentActiveWorkspace();
    await supabase.auth.signOut();
  }

  const navDesktop = [
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
    ...(
      esArtista
        ? [
            {
              id: 'equipo',
              label: 'Equipo',
              action: () => irA('equipo'),
            },
          ]
        : [
            {
              id: 'invitaciones',
              label: 'Invitaciones',
              action: () =>
                irA('invitaciones'),
            },
          ]
    ),
  ];

  const settingsNav = esArtista
    ? [
        {
          id: 'perfil',
          label: 'Perfil del Artista',
          action: () => irA('perfil'),
        },
        {
          id: 'suscripcion',
          label:
            'Suscripción y facturación',
          action: () =>
            irA('suscripcion'),
        },
        {
          id: 'formatos',
          label: 'Formatos',
          action: () => irA('formatos'),
        },
        {
          id: 'tipos-evento',
          label: 'Tipos de evento',
          action: () =>
            irA('tipos-evento'),
        },
        {
          id: 'tarifas',
          label: 'Tarifas por zona',
          action: () => irA('tarifas'),
        },
      ]
    : [];

  const settingsIsActive =
    settingsNav.some(
      (item) => item.id === page
    );

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

  const visibleDesktopNav =
    subscriptionRestricted
      ? []
      : navDesktop;

  const visibleSettingsNav =
    subscriptionRestricted
      ? settingsNav.filter(
          (item) =>
            [
              'perfil',
              'suscripcion',
            ].includes(item.id)
        )
      : settingsNav;

  const visibleMobileNav =
    subscriptionRestricted
      ? (
          esArtista
            ? [
                {
                  id:
                    'suscripcion',
                  label:
                    'Facturación',
                  icon: '$',
                  action: () =>
                    irA(
                      'suscripcion'
                    ),
                },
                {
                  id: 'perfil',
                  label: 'Perfil',
                  icon: '◉',
                  action: () =>
                    irA('perfil'),
                },
              ]
            : []
        )
      : mobileNav;

  if (
    [
      'terms',
      'privacy',
      'refunds',
    ].includes(legalSection)
  ) {
    return (
      <Legal
        initialSection={
          legalSection
        }
        onBack={() =>
          window.location.assign('/')
        }
      />
    );
  }

  const invitationToken =
    new URLSearchParams(
      window.location.search
    ).get('invitacion_gestor');

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

  if (
    loading ||
    accountLoading ||
    (
      session &&
      activeWorkspace &&
      subscriptionLoading &&
      !workspaceSubscription
    )
  ) {
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
    contenido = (
      <InvitacionesPendientes
        onInvitationAccepted={refreshWorkspaceAccess}
        onLogout={logout}
      />
    );
  } else if (
    checkoutConfirmation.status ===
    'confirming'
  ) {
    contenido = (
      <div className="workspace-state-card">
        <h1>
          Confirmando tu suscripción
        </h1>

        <p>
          {
            checkoutConfirmation
              .message
          }
        </p>

        <p>
          No cierres esta ventana. Este
          proceso normalmente tarda solo
          unos segundos.
        </p>
      </div>
    );
  } else if (
    checkoutConfirmation.status ===
    'failed'
  ) {
    contenido = (
      <div className="workspace-state-card">
        <h1>
          La suscripción está pendiente de sincronización
        </h1>

        <p>
          {
            checkoutConfirmation
              .message
          }
        </p>

        <button
          type="button"
          onClick={
            reintentarConfirmacionCheckout
          }
        >
          Reintentar confirmación
        </button>

        <button
          type="button"
          onClick={logout}
        >
          Cerrar sesión
        </button>
      </div>
    );
  } else if (
    !subscriptionAccessAllowed &&
    initialSubscriptionRequired &&
    esArtista
  ) {
    contenido = (
      <SubscriptionGate
        workspace={activeWorkspace}
        subscription={workspaceSubscription}
        loading={subscriptionLoading}
        error={subscriptionError}
        esArtista={esArtista}
        selectedPlan={selectedPlan}
        checkoutResult={
          checkoutResult ||
          billingResult
        }
        checkoutLoading={checkoutLoading}
        onChoosePlan={
          seleccionarPlanSuscripcion
        }
        onCheckout={iniciarCheckout}
        onReload={recargarSuscripcion}
        onLogout={logout}
      />
    );
  } else if (
    !subscriptionAccessAllowed &&
    !recoveryPageAllowed
  ) {
    contenido = (
      <BillingAccessGate
        workspace={activeWorkspace}
        subscription={
          workspaceSubscription
        }
        esArtista={esArtista}
        error={subscriptionError}
        onSubscription={() =>
          navegarA('suscripcion')
        }
        onProfile={() =>
          navegarA('perfil')
        }
        onReload={
          recargarSuscripcion
        }
        onLogout={logout}
      />
    );
  } else {
    const sharedProps = {
      workspaceId: activeWorkspace.workspace_id,
      workspace: activeWorkspace,
      esArtista,
      readOnly: !esArtista,
      subscription: workspaceSubscription,
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
        contenido = esArtista ? (
          <Perfil
            {...sharedProps}
            goBack={volverAtras}
            goEquipo={() => irA('equipo')}
            onProfileUpdated={actualizarPerfilLocal}
          />
        ) : (
          <Dashboard
            {...sharedProps}
            session={session}
            goCotizaciones={() => irA('cotizaciones')}
            goCalendario={() => irA('calendario')}
            goDocumentos={() => irA('documentos')}
            goTutorial={() => irA('tutorial')}
            goComisiones={() => irA('comisiones')}
          />
        );
        break;

      case 'suscripcion':
        contenido = esArtista ? (
          <Suscripcion
            {...sharedProps}
            goBack={volverAtras}
          />
        ) : (
          <Dashboard
            {...sharedProps}
            session={session}
            goCotizaciones={() => irA('cotizaciones')}
            goCalendario={() => irA('calendario')}
            goDocumentos={() => irA('documentos')}
            goTutorial={() => irA('tutorial')}
            goComisiones={() => irA('comisiones')}
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
            goSuscripcion={() =>
              irA('suscripcion')
            }
            goNuevaCotizacion={() =>
              irA('nueva-cotizacion')
            }
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

  const shouldRenderAppShell =
    Boolean(
      session &&
      activeWorkspace &&
      (
        subscriptionAccessAllowed ||
        recoveryPageAllowed
      )
    );

  if (!shouldRenderAppShell) {
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
                width: '42px',
                height: '42px',
                flex: '0 0 42px',
                objectFit: 'contain',
              }}
            />

            <span>
              <strong>MiBooking</strong>
              <small>Música · Eventos · Negocio</small>
            </span>
          </button>

          <div className="desktop-nav-links">
            {visibleDesktopNav.map((item) => (
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
            {workspaces.length > 1 && (
              <select
                className="topbar-artist-select topbar-workspace-only"
                value={activeWorkspace.workspace_id}
                onChange={cambiarWorkspace}
                aria-label="Cambiar Artista"
                title="Cambiar Artista"
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
            )}

            {visibleSettingsNav.length > 0 && (
              <div
                className="balanced-settings"
                ref={settingsRef}
              >
                <button
                  type="button"
                  className={
                    `balanced-settings-trigger ${
                      settingsOpen ||
                      settingsIsActive
                        ? 'active'
                        : ''
                    }`
                  }
                  title="Configuración"
                  aria-label="Abrir configuración"
                  aria-expanded={settingsOpen}
                  onClick={() =>
                    setSettingsOpen(
                      (current) => !current
                    )
                  }
                >
                  ⚙
                </button>

                {settingsOpen && (
                  <div className="balanced-settings-menu">
                    <span>
                      Configuración
                    </span>

                    {visibleSettingsNav.map(
                      (item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={
                            page === item.id
                              ? 'active'
                              : ''
                          }
                          onClick={item.action}
                        >
                          {item.label}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

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

      {page !== 'ver-cotizacion' && (
        <BillingStatusBanner
          subscription={
            workspaceSubscription
          }
          esArtista={esArtista}
          page={page}
          onBilling={() =>
            irA('suscripcion')
          }
        />
      )}

      <main
        className="app-content"
        key={`${activeWorkspace.workspace_id}-${workspaceVersion}`}
      >
        {contenido}
      </main>

      {page !== 'ver-cotizacion' && (
        <nav className="mobile-bottom-nav">
          {visibleMobileNav.map((item) => (
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
              {subscriptionRestricted ? (
                <>
                  {esArtista && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          irA('suscripcion')
                        }
                      >
                        $ Suscripción y facturación
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          irA('perfil')
                        }
                      >
                        ◉ Perfil del Artista
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    className="sheet-logout"
                    onClick={logout}
                  >
                    Salir
                  </button>
                </>
              ) : (
                <>
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

              {esArtista ? (
                <>
                  <button type="button" onClick={() => irA('equipo')}>
                    ◉ Equipo y Gestores
                  </button>

                  <button type="button" onClick={() => irA('perfil')}>
                    ◉ Perfil del Artista
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      irA('suscripcion')
                    }
                  >
                    ⚙ Suscripción y facturación
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
                </>
              )}
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
