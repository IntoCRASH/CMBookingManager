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
  formatSubscriptionDate,
  getSubscriptionAccessState,
  isInitialSubscriptionState,
  isSubscriptionAccessAllowed,
  normalizePlanCode,
  planFromLocation,
  storeSelectedPlan,
  syncWorkspaceSubscriptionFromStripe,
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
import IndustriaMusical from './pages/IndustriaMusical';
import Formatos from './pages/Formatos';
import TiposEvento from './pages/TiposEvento';
import Perfil from './pages/Perfil';
import Suscripcion from './pages/Suscripcion';
import Equipo from './pages/Equipo';
import InvitacionesPendientes from './pages/InvitacionesPendientes';
import AceptarInvitacionGestor from './pages/AceptarInvitacionGestor';
import AppIcon from './components/AppIcon';
import './styles/NavigationBalanced.css';

const TUTORIAL_STEP_IDS = {
  artista: [
    'perfil',
    'formatos',
    'tipos',
    'tarifas',
    'riders',
    'stage-plot',
    'equipo',
    'clientes',
    'cotizacion',
    'confirmar',
    'rider-pdf',
    'seguimiento',
  ],
  gestor: [
    'invitacion',
    'seleccionar',
    'clientes',
    'cotizacion',
    'estado',
    'stage-plot',
    'documentos',
    'seguimiento',
  ],
};

function getTutorialStorageKey(workspaceId, esArtista) {
  const roleKey = esArtista ? 'artista' : 'gestor';

  return `mibooking.tutorial.${workspaceId || 'sin-workspace'}.${roleKey}`;
}

function readTutorialCompleted(workspaceId, esArtista) {
  if (typeof window === 'undefined' || !workspaceId) {
    return false;
  }

  const roleKey = esArtista ? 'artista' : 'gestor';
  const requiredStepIds = TUTORIAL_STEP_IDS[roleKey];
  const storageKey = getTutorialStorageKey(workspaceId, esArtista);

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(storageKey) || '[]'
    );

    if (!Array.isArray(stored)) {
      return false;
    }

    const completedIds = new Set(stored);

    return requiredStepIds.every((id) => completedIds.has(id));
  } catch {
    return false;
  }
}

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
  const [documentosInitialSection, setDocumentosInitialSection] =
    useState('contratos');
  const [moreOpen, setMoreOpen] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] =
    useState(false);
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

  const checkoutSessionId =
    currentQuery.get(
      'session_id'
    ) || '';

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
        setDocumentosInitialSection('contratos');
        setMoreOpen(false);
        setTutorialCompleted(false);
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
    const darkPremiumActive = Boolean(
      session && activeWorkspace
    );

    document.body.classList.toggle(
      'mibooking-dark-premium',
      darkPremiumActive
    );

    return () => {
      document.body.classList.remove(
        'mibooking-dark-premium'
      );
    };
  }, [session, activeWorkspace]);

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
        let recoveredSubscription =
          null;

        let recoveryError =
          null;

        try {
          const recovery =
            await syncWorkspaceSubscriptionFromStripe({
              workspaceId,

              checkoutSessionId,
            });

          recoveredSubscription =
            recovery
              ?.subscription ||
            null;

          if (
            recoveredSubscription
          ) {
            setWorkspaceSubscription(
              recoveredSubscription
            );
          }
        } catch (error) {
          recoveryError =
            error;

          console.warn(
            'La recuperación directa desde Stripe no se completó; se esperará al webhook:',
            error
          );
        }

        let confirmedSubscription =
          recoveredSubscription;

        if (
          !isSubscriptionAccessAllowed(
            confirmedSubscription
          )
        ) {
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

            confirmedSubscription =
              result.subscription;
          }
        }

        if (
          !isSubscriptionAccessAllowed(
            confirmedSubscription
          )
        ) {
          setCheckoutConfirmation({
            status: 'failed',
            message:
              recoveryError?.message ||
              'Stripe completó el proceso, pero MiBooking todavía no pudo recuperar la suscripción. Puedes reintentar sin volver a pagar.',
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
              confirmedSubscription
                ?.plan_code
            ) || 'MiBooking';

          toast.success(
            confirmedSubscription
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
    checkoutSessionId,
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

  useEffect(() => {
    const workspaceId = activeWorkspace?.workspace_id;
    const storageKey = getTutorialStorageKey(workspaceId, esArtista);

    function refreshTutorialCompleted() {
      setTutorialCompleted(
        readTutorialCompleted(workspaceId, esArtista)
      );
    }

    function handleTutorialProgress(event) {
      const eventStorageKey = event?.detail?.storageKey;

      if (!eventStorageKey || eventStorageKey === storageKey) {
        refreshTutorialCompleted();
      }
    }

    function handleStorage(event) {
      if (event.key === storageKey) {
        refreshTutorialCompleted();
      }
    }

    refreshTutorialCompleted();

    window.addEventListener(
      'mibooking:tutorial-progress',
      handleTutorialProgress
    );
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(
        'mibooking:tutorial-progress',
        handleTutorialProgress
      );
      window.removeEventListener('storage', handleStorage);
    };
  }, [
    activeWorkspace?.workspace_id,
    esArtista,
  ]);

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

  function abrirDocumentos(section = 'contratos') {
    const normalizedSection = [
      'contratos',
      'riders',
      'stage-plot',
    ].includes(section)
      ? section
      : 'contratos';

    setDocumentosInitialSection(normalizedSection);
    navegarA('documentos');
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

  function subscriptionRecoveryNotFound(
    error
  ) {
    const message =
      String(
        error?.message || ''
      ).toLowerCase();

    return (
      message.includes(
        'no tiene una suscripción recuperable'
      ) ||
      message.includes(
        'todavía no tiene una suscripción recuperable'
      ) ||
      message.includes(
        'subscription_not_found'
      )
    );
  }

  function activateRecoveredSubscription(
    recoveredSubscription
  ) {
    if (
      !isSubscriptionAccessAllowed(
        recoveredSubscription
      )
    ) {
      return false;
    }

    setWorkspaceSubscription(
      recoveredSubscription
    );

    clearStoredSelectedPlan();
    clearStoredSelectedBillingCycle();
    setSelectedPlan('');

    setPage('dashboard');
    setCotizacionId(null);
    setMoreOpen(false);
    navigationHistory.current = [];

    const activePlanLabel =
      getPlanLabel(
        recoveredSubscription
          ?.plan_code
      ) || 'MiBooking';

    toast.success(
      recoveredSubscription
        ?.status === 'trialing'
        ? `Recuperamos tu plan ${activePlanLabel}. Tus 3 días de prueba están activos.`
        : `Recuperamos tu plan ${activePlanLabel}. La suscripción está activa.`,
      {
        id:
          `subscription-recovered-${
            activeWorkspace
              ?.workspace_id ||
            'workspace'
          }`,
        duration: 9000,
      }
    );

    return true;
  }

  async function recoverExistingStripeSubscription() {
    if (
      !activeWorkspace
        ?.workspace_id
    ) {
      return null;
    }

    const result =
      await syncWorkspaceSubscriptionFromStripe({
        workspaceId:
          activeWorkspace
            .workspace_id,
      });

    return (
      result
        ?.subscription ||
      null
    );
  }

  async function recargarSuscripcion() {
    if (!activeWorkspace?.workspace_id) {
      return;
    }

    try {
      setSubscriptionLoading(true);
      setSubscriptionError('');

      try {
        const recovered =
          await recoverExistingStripeSubscription();

        if (
          activateRecoveredSubscription(
            recovered
          )
        ) {
          return;
        }
      } catch (recoveryError) {
        if (
          !subscriptionRecoveryNotFound(
            recoveryError
          )
        ) {
          throw recoveryError;
        }
      }

      const currentSubscription =
        await getWorkspaceSubscription(
          activeWorkspace.workspace_id
        );

      setWorkspaceSubscription(
        currentSubscription
      );

      if (
        !isSubscriptionAccessAllowed(
          currentSubscription
        )
      ) {
        setSubscriptionError(
          'Stripe todavía no confirmó una suscripción activa para este proyecto.'
        );
      }
    } catch (error) {
      console.error(error);

      setSubscriptionError(
        error.message ||
          'No se pudo recuperar la suscripción desde Stripe.'
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

      /*
       * Protección contra cobros duplicados:
       * antes de crear otro Checkout, buscamos
       * cualquier trial o suscripción existente.
       */
      try {
        const recovered =
          await recoverExistingStripeSubscription();

        if (
          activateRecoveredSubscription(
            recovered
          )
        ) {
          setCheckoutLoading(false);
          return;
        }
      } catch (recoveryError) {
        if (
          !subscriptionRecoveryNotFound(
            recoveryError
          )
        ) {
          throw recoveryError;
        }
      }

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
          'No se pudo verificar ni abrir Stripe Checkout.'
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

  const tutorialNavItem = {
    id: 'tutorial',
    label: 'Tutorial',
    icon: 'tutorial',
    action: () => irA('tutorial'),
  };

  const navDesktop = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: 'home',
      action: volverDashboard,
    },
    ...(
      tutorialCompleted
        ? []
        : [tutorialNavItem]
    ),
    {
      id: 'cotizaciones',
      label: 'Cotizaciones',
      icon: 'quote',
      action: () => irA('cotizaciones'),
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: 'clients',
      action: () => irA('clientes'),
    },
    {
      id: 'calendario',
      label: 'Calendario',
      icon: 'calendar',
      action: () => irA('calendario'),
    },
    {
      id: 'documentos',
      label: 'Documentos',
      icon: 'documents',
      action: () => abrirDocumentos('contratos'),
    },
    {
      id: 'comisiones',
      label: 'Comisiones',
      icon: 'commissions',
      action: () => irA('comisiones'),
    },
    ...(
      esArtista
        ? [
            {
              id: 'equipo',
              label: 'Equipo',
              icon: 'team',
              action: () => irA('equipo'),
            },
          ]
        : [
            {
              id: 'invitaciones',
              label: 'Invitaciones',
              icon: 'invitations',
              action: () => irA('invitaciones'),
            },
          ]
    ),
    {
      id: 'industria-musical',
      label: 'Aprende',
      icon: 'learn',
      action: () => irA('industria-musical'),
    },
    ...(
      tutorialCompleted
        ? [tutorialNavItem]
        : []
    ),
  ];

  const settingsNav = esArtista
    ? [
        {
          id: 'perfil',
          label: 'Perfil del Artista',
          icon: 'profile',
          action: () => irA('perfil'),
        },
        {
          id: 'formatos',
          label: 'Formatos',
          icon: 'formats',
          action: () => irA('formatos'),
        },
        {
          id: 'tipos-evento',
          label: 'Tipos de evento',
          icon: 'eventTypes',
          action: () =>
            irA('tipos-evento'),
        },
        {
          id: 'tarifas',
          label: 'Tarifas por zona',
          icon: 'rates',
          action: () => irA('tarifas'),
        },
        {
          id: 'suscripcion',
          label: 'Suscripción',
          icon: 'billing',
          action: () =>
            irA('suscripcion'),
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
      icon: 'home',
      action: volverDashboard,
    },
    {
      id: 'cotizaciones',
      label: 'Cotiz.',
      icon: 'quote',
      action: () => irA('cotizaciones'),
    },
    {
      id: 'calendario',
      label: 'Agenda',
      icon: 'calendar',
      action: () => irA('calendario'),
    },
    {
      id: 'more',
      label: 'Más',
      icon: 'menu',
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
                  icon: 'billing',
                  action: () =>
                    irA(
                      'suscripcion'
                    ),
                },
                {
                  id: 'perfil',
                  label: 'Perfil',
                  icon: 'clients',
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
            goDocumentos={() => abrirDocumentos('contratos')}
            goRiders={() => abrirDocumentos('riders')}
            goStagePlot={() => abrirDocumentos('stage-plot')}
            goCalendario={() => irA('calendario')}
            goComisiones={() => irA('comisiones')}
            goInvitaciones={() => irA('invitaciones')}
          />
        );
        break;

      case 'industria-musical':
        contenido = (
          <IndustriaMusical
            {...sharedProps}
            goBack={volverAtras}
          />
        );
        break;

      case 'documentos':
        contenido = (
          <Documentos
            {...sharedProps}
            initialSection={documentosInitialSection}
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
            tutorialCompleted={tutorialCompleted}
            goCotizaciones={() => irA('cotizaciones')}
            goClientes={() => irA('clientes')}
            goCalendario={() => irA('calendario')}
            goDocumentos={() => abrirDocumentos('contratos')}
            goTutorial={() => irA('tutorial')}
            goIndustriaMusical={() =>
              irA('industria-musical')
            }
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
            tutorialCompleted={tutorialCompleted}
            goCotizaciones={() => irA('cotizaciones')}
            goClientes={() => irA('clientes')}
            goCalendario={() => irA('calendario')}
            goDocumentos={() => abrirDocumentos('contratos')}
            goTutorial={() => irA('tutorial')}
            goIndustriaMusical={() =>
              irA('industria-musical')
            }
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
            tutorialCompleted={tutorialCompleted}
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
            goClientes={() => irA('clientes')}
            goCalendario={() => irA('calendario')}
            goDocumentos={() => abrirDocumentos('contratos')}
            goTutorial={() => irA('tutorial')}
            goIndustriaMusical={() =>
              irA('industria-musical')
            }
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

  const pageMeta = {
    dashboard: {
      title: 'Inicio',
      description: 'Resumen de tu operación musical',
    },
    tutorial: {
      title: 'Tutorial',
      description: 'Configura y domina MiBooking',
    },
    cotizaciones: {
      title: 'Cotizaciones',
      description: 'Propuestas, estados y seguimiento',
    },
    'nueva-cotizacion': {
      title: cotizacionId ? 'Editar cotización' : 'Nueva cotización',
      description: 'Prepara una propuesta profesional',
    },
    clientes: {
      title: 'Clientes',
      description: 'Contactos y relaciones comerciales',
    },
    calendario: {
      title: 'Calendario',
      description: 'Eventos y fechas importantes',
    },
    documentos: {
      title: 'Documentos',
      description: 'Contratos, riders y archivos',
    },
    comisiones: {
      title: 'Comisiones',
      description: 'Control de pagos del equipo',
    },
    equipo: {
      title: 'Equipo',
      description: 'Gestores e invitaciones',
    },
    invitaciones: {
      title: 'Invitaciones',
      description: 'Accesos a Artistas',
    },
    'industria-musical': {
      title: 'Aprende',
      description: 'Recursos para tu carrera musical',
    },
    perfil: {
      title: 'Perfil del Artista',
      description: 'Identidad, negocio y documentos',
    },
    suscripcion: {
      title: 'Suscripción',
      description: 'Plan, pagos y facturación',
    },
    formatos: {
      title: 'Formatos',
      description: 'Configuración de tus presentaciones',
    },
    'tipos-evento': {
      title: 'Tipos de evento',
      description: 'Reglas y multiplicadores',
    },
    tarifas: {
      title: 'Tarifas por zona',
      description: 'Precios y costos operativos',
    },
    'pagos-cotizacion': {
      title: 'Pagos',
      description: 'Abonos y balance de la cotización',
    },
  };

  const currentPageMeta =
    pageMeta[page] || pageMeta.dashboard;

  const userDisplayName =
    profile?.nombre ||
    session?.user?.email?.split('@')[0] ||
    'Usuario';

  const userInitials = userDisplayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'MB';

  const subscriptionPlanLabel =
    workspaceSubscription?.billing_mode === 'legacy'
      ? 'Acceso heredado'
      : getPlanLabel(workspaceSubscription?.plan_code) ||
        'Sin plan';

  const subscriptionRenewalDate =
    formatSubscriptionDate(
      workspaceSubscription?.current_period_end
    );

  const chromeVisible =
    page !== 'ver-cotizacion';

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
      className={`app-shell dark-premium-shell page-${page} ${
        chromeVisible ? '' : 'premium-print-view'
      }`}
      data-workspace-id={activeWorkspace.workspace_id}
    >
      {chromeVisible && (
        <aside className="premium-sidebar">
          <button
            className="premium-brand-button"
            type="button"
            onClick={volverDashboard}
            aria-label="Ir al inicio de MiBooking"
          >
            <img src="/mibooking-logo-dark.png" alt="MiBooking" />
          </button>

          <div className="premium-sidebar-scroll">
            <nav className="premium-sidebar-nav" aria-label="Navegación principal">
              <span className="premium-nav-heading">Operación</span>

              {visibleDesktopNav.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={page === item.id ? 'active' : ''}
                  onClick={item.action}
                >
                  <AppIcon name={item.icon} size={19} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {visibleSettingsNav.length > 0 && (
              <nav className="premium-sidebar-nav premium-sidebar-settings" aria-label="Configuración">
                <span className="premium-nav-heading">Configuración</span>

                {visibleSettingsNav.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={page === item.id ? 'active' : ''}
                    onClick={item.action}
                  >
                    <AppIcon name={item.icon || 'settings'} size={19} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            )}
          </div>

          <div className="premium-sidebar-footer">
            {esArtista && (
              <button
                type="button"
                className="premium-plan-card"
                onClick={() => irA('suscripcion')}
              >
                <span className="premium-plan-icon">
                  <AppIcon name="billing" size={21} />
                </span>
                <span className="premium-plan-copy">
                  <small>Plan actual</small>
                  <strong>{subscriptionPlanLabel}</strong>
                  <em>
                    {subscriptionRenewalDate
                      ? `Renovación: ${subscriptionRenewalDate}`
                      : 'Administrar suscripción'}
                  </em>
                </span>
                <AppIcon name="chevron" size={16} />
              </button>
            )}

            <div className="premium-sidebar-user">
              <span className="premium-user-avatar">{userInitials}</span>
              <span>
                <strong>{userDisplayName}</strong>
                <small>{roleLabel}</small>
              </span>
              <button type="button" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión">
                <AppIcon name="logout" size={18} />
              </button>
            </div>
          </div>
        </aside>
      )}

      <section className="premium-workspace">
        {chromeVisible && (
          <header className="premium-topbar">
            <button
              type="button"
              className="premium-mobile-menu"
              onClick={() => setMoreOpen(true)}
              aria-label="Abrir menú"
            >
              <AppIcon name="menu" size={22} />
            </button>

            <div className="premium-page-context">
              <span>{currentPageMeta.description}</span>
              <h2>{currentPageMeta.title}</h2>
            </div>

            <div className="premium-topbar-actions">
              {workspaces.length > 1 ? (
                <label className="premium-workspace-select">
                  <span>Artista</span>
                  <select
                    value={activeWorkspace.workspace_id}
                    onChange={cambiarWorkspace}
                    aria-label="Cambiar Artista"
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
                </label>
              ) : (
                <div className="premium-workspace-pill">
                  <span>Workspace</span>
                  <strong>{activeWorkspace.workspace_name}</strong>
                </div>
              )}

              {!subscriptionRestricted && page !== 'nueva-cotizacion' && (
                <button
                  type="button"
                  className="premium-new-quote-button"
                  onClick={nuevaCotizacion}
                >
                  <AppIcon name="plus" size={18} />
                  <span>Nueva cotización</span>
                </button>
              )}

              <div className="premium-settings-dropdown" ref={settingsRef}>
                <button
                  type="button"
                  className={`premium-icon-button ${settingsOpen || settingsIsActive ? 'active' : ''}`}
                  onClick={() => setSettingsOpen((current) => !current)}
                  aria-label="Configuración"
                  aria-expanded={settingsOpen}
                >
                  <AppIcon name="settings" size={19} />
                </button>

                {settingsOpen && visibleSettingsNav.length > 0 && (
                  <div className="premium-settings-menu">
                    <span>Configuración</span>
                    {visibleSettingsNav.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={page === item.id ? 'active' : ''}
                        onClick={item.action}
                      >
                        <AppIcon name={item.icon || 'settings'} size={17} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="premium-notification-button"
                aria-label="Notificaciones"
                title="Notificaciones de MiBooking"
              >
                <AppIcon name="bell" size={19} />
                {subscriptionAccessState === 'grace' && <i />}
              </button>

              <button
                type="button"
                className="premium-topbar-profile"
                onClick={esArtista ? () => irA('perfil') : undefined}
              >
                <span className="premium-user-avatar">{userInitials}</span>
                <span>
                  <strong>{userDisplayName}</strong>
                  <small>{activeWorkspace.workspace_name}</small>
                </span>
              </button>
            </div>
          </header>
        )}

        {chromeVisible && (
          <BillingStatusBanner
            subscription={workspaceSubscription}
            esArtista={esArtista}
            page={page}
            onBilling={() => irA('suscripcion')}
          />
        )}

        <main
          className="app-content premium-app-content"
          key={`${activeWorkspace.workspace_id}-${workspaceVersion}`}
        >
          {contenido}
        </main>
      </section>

      {chromeVisible && (
        <nav className="mobile-bottom-nav premium-mobile-nav">
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
              <AppIcon name={item.icon} size={20} />
              <small>{item.label}</small>
            </button>
          ))}
        </nav>
      )}

      {moreOpen && (
        <div
          className="mobile-more-backdrop premium-mobile-backdrop"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="mobile-more-sheet premium-mobile-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="premium-mobile-sheet-header">
              <div>
                <img src="/mibooking-logo-dark.png" alt="MiBooking" />
                <span>{activeWorkspace.workspace_name}</span>
              </div>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Cerrar menú">
                <AppIcon name="close" size={21} />
              </button>
            </div>

            {workspaces.length > 1 && (
              <label className="premium-mobile-workspace-select">
                <span>Trabajando con</span>
                <select
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
              </label>
            )}

            <div className="premium-mobile-menu-grid">
              {visibleDesktopNav.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={page === item.id ? 'active' : ''}
                  onClick={item.action}
                >
                  <AppIcon name={item.icon} size={20} />
                  <span>{item.label}</span>
                </button>
              ))}

              {visibleSettingsNav.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={page === item.id ? 'active' : ''}
                  onClick={item.action}
                >
                  <AppIcon name={item.icon || 'settings'} size={20} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <button type="button" className="premium-mobile-logout" onClick={logout}>
              <AppIcon name="logout" size={19} />
              Cerrar sesión
            </button>
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
