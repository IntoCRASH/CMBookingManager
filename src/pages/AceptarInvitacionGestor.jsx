import {
  useEffect,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import Login from './Login';
import {
  acceptWorkspaceInvitationByToken,
  getWorkspaceInvitationByToken,
  rejectWorkspaceInvitationByToken,
} from '../lib/teamService';
import './AceptarInvitacionGestor.css';

function getDecisionFromUrl() {
  return (
    new URLSearchParams(
      window.location.search
    ).get('decision') || ''
  );
}

export default function AceptarInvitacionGestor({
  token,
  session,
  authLoading = false,
}) {
  const [invitation, setInvitation] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [decision, setDecisionState] =
    useState(getDecisionFromUrl());

  const [accepted, setAccepted] =
    useState(null);

  const [rejected, setRejected] =
    useState(false);

  const [error, setError] =
    useState('');

  const acceptingRef = useRef(false);

  const currentEmail =
    String(
      session?.user?.email || ''
    )
      .trim()
      .toLowerCase();

  const invitedEmail =
    String(
      invitation?.email || ''
    )
      .trim()
      .toLowerCase();

  const emailMatches =
    Boolean(currentEmail) &&
    Boolean(invitedEmail) &&
    currentEmail === invitedEmail;

  useEffect(() => {
    loadInvitation();
  }, [token]);

  useEffect(() => {
    if (
      decision === 'accept' &&
      session &&
      emailMatches &&
      invitation?.actionable &&
      !accepted &&
      !acceptingRef.current
    ) {
      completeAcceptance();
    }
  }, [
    decision,
    session?.user?.id,
    emailMatches,
    invitation?.actionable,
    accepted,
  ]);

  function setDecision(nextDecision) {
    const url =
      new URL(window.location.href);

    if (nextDecision) {
      url.searchParams.set(
        'decision',
        nextDecision
      );
    } else {
      url.searchParams.delete(
        'decision'
      );
    }

    window.history.replaceState(
      {},
      '',
      `${url.pathname}${url.search}${url.hash}`
    );

    setDecisionState(nextDecision);
    setError('');
  }

  async function loadInvitation() {
    try {
      setLoading(true);
      setError('');

      const data =
        await getWorkspaceInvitationByToken(
          token
        );

      setInvitation(data);

      if (!data?.found) {
        setError(
          data?.message ||
            'La invitación no está disponible.'
        );
      }
    } catch (loadError) {
      console.error(loadError);

      setError(
        loadError.message ||
          'No se pudo consultar la invitación.'
      );
    } finally {
      setLoading(false);
    }
  }

  function chooseAccept() {
    setDecision('accept');
  }

  async function rejectInvitation() {
    const confirmed =
      window.confirm(
        '¿Deseas rechazar esta invitación? Esta acción no se puede deshacer.'
      );

    if (!confirmed) return;

    try {
      setProcessing(true);
      setError('');

      const result =
        await rejectWorkspaceInvitationByToken(
          token
        );

      if (!result?.ok) {
        throw new Error(
          result?.message ||
            'La invitación ya no está pendiente.'
        );
      }

      setRejected(true);

      toast.success(
        'Invitación rechazada.'
      );
    } catch (rejectError) {
      console.error(rejectError);

      setError(
        rejectError.message ||
          'No se pudo rechazar la invitación.'
      );
    } finally {
      setProcessing(false);
    }
  }

  async function completeAcceptance() {
    if (acceptingRef.current) return;

    try {
      acceptingRef.current = true;
      setProcessing(true);
      setError('');

      const result =
        await acceptWorkspaceInvitationByToken(
          token
        );

      setAccepted(result);

      toast.success(
        `Ya puedes gestionar a ${result.workspace_name}.`
      );
    } catch (acceptError) {
      console.error(acceptError);

      setError(
        acceptError.message ||
          'No se pudo aceptar la invitación.'
      );
    } finally {
      acceptingRef.current = false;
      setProcessing(false);
    }
  }

  async function changeAccount() {
    try {
      setProcessing(true);
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error(signOutError);

      setError(
        signOutError.message ||
          'No se pudo cerrar la sesión.'
      );
    } finally {
      setProcessing(false);
    }
  }

  function enterMiBooking() {
    const url =
      new URL(window.location.href);

    url.searchParams.delete(
      'invitacion_gestor'
    );

    url.searchParams.delete(
      'decision'
    );

    window.history.replaceState(
      {},
      '',
      `${url.pathname}${url.search}${url.hash}`
    );

    window.location.reload();
  }

  function formatDate(value) {
    if (!value) {
      return 'Sin fecha límite';
    }

    return new Date(value)
      .toLocaleDateString('es-DO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
  }

  const unavailable =
    invitation?.found &&
    !invitation?.actionable;

  return (
    <main className="manager-invite-page">
      <section className="manager-invite-card">
        <header className="manager-invite-brand">
          <img
            src="/mibooking-logo.png"
            alt="MiBooking"
          />
        </header>

        {loading || authLoading ? (
          <div className="manager-invite-state">
            <span className="manager-invite-spinner" />
            <h1>Cargando invitación</h1>
            <p>
              Estamos verificando el enlace seguro.
            </p>
          </div>
        ) : accepted ? (
          <div className="manager-invite-state success">
            <span className="manager-invite-success-icon">
              ✓
            </span>

            <span className="manager-invite-eyebrow">
              Invitación aceptada
            </span>

            <h1>
              Ya formas parte del equipo de{' '}
              {accepted.workspace_name}
            </h1>

            <p>
              Tu acceso como Gestor está activo
              con una comisión de{' '}
              <strong>
                {Number(
                  accepted.commission_percentage ||
                    0
                )}
                %
              </strong>
              .
            </p>

            <button
              type="button"
              className="manager-invite-primary"
              onClick={enterMiBooking}
            >
              Entrar a MiBooking
            </button>
          </div>
        ) : rejected ? (
          <div className="manager-invite-state">
            <span className="manager-invite-error-icon">
              ×
            </span>

            <span className="manager-invite-eyebrow">
              Invitación rechazada
            </span>

            <h1>
              Has rechazado la invitación
            </h1>

            <p>
              No se creó ninguna relación con{' '}
              <strong>
                {invitation?.workspace_name}
              </strong>
              .
            </p>
          </div>
        ) : !invitation?.found ? (
          <div className="manager-invite-state error">
            <span className="manager-invite-error-icon">
              !
            </span>

            <h1>Enlace no disponible</h1>

            <p>
              {error ||
                'La invitación no existe o fue reemplazada.'}
            </p>
          </div>
        ) : unavailable ? (
          <div className="manager-invite-state error">
            <span className="manager-invite-error-icon">
              !
            </span>

            <h1>
              Esta invitación ya no está pendiente
            </h1>

            <p>
              Estado actual:{' '}
              <strong>
                {invitation.status}
              </strong>
              .
            </p>
          </div>
        ) : decision !== 'accept' ? (
          <>
            <div className="manager-invite-hero">
              <span className="manager-invite-eyebrow">
                Invitación profesional
              </span>

              <h1>
                Has sido invitado como Gestor
              </h1>

              <p>
                <strong>
                  {invitation.workspace_name}
                </strong>{' '}
                quiere trabajar contigo mediante
                MiBooking.
              </p>
            </div>

            <div className="manager-invite-summary">
              <div>
                <span>Artista</span>
                <strong>
                  {invitation.workspace_name}
                </strong>

                <small>
                  Invitación enviada por{' '}
                  {invitation.artist_name}
                </small>
              </div>

              <div>
                <span>Comisión propuesta</span>
                <strong className="commission">
                  {Number(
                    invitation.commission_percentage ||
                      0
                  )}
                  %
                </strong>

                <small>
                  Aplicada a tus cotizaciones
                </small>
              </div>
            </div>

            <div className="manager-invite-security">
              <span>🔒</span>

              <p>
                Esta invitación pertenece a{' '}
                <strong>
                  {invitation.email}
                </strong>
                {' '}y vence el{' '}
                {formatDate(
                  invitation.expires_at
                )}
                .
              </p>
            </div>

            <div className="manager-invite-decision">
              <button
                type="button"
                className="manager-invite-primary"
                onClick={chooseAccept}
                disabled={processing}
              >
                Aceptar invitación
              </button>

              <button
                type="button"
                className="manager-invite-reject"
                onClick={rejectInvitation}
                disabled={processing}
              >
                {processing
                  ? 'Procesando...'
                  : 'Rechazar invitación'}
              </button>
            </div>

            {error && (
              <p className="manager-invite-inline-error">
                {error}
              </p>
            )}

            <footer className="manager-invite-footer">
              Aceptar no crea acceso hasta que
              confirmes tus credenciales.
            </footer>
          </>
        ) : session && !emailMatches ? (
          <>
            <div className="manager-invite-hero compact">
              <span className="manager-invite-eyebrow">
                Confirmar identidad
              </span>

              <h1>
                Usa el correo invitado
              </h1>
            </div>

            <div className="manager-invite-account-warning">
              <h2>
                Esta sesión usa otro correo
              </h2>

              <p>
                Estás conectado como{' '}
                <strong>
                  {session.user.email}
                </strong>
                , pero la invitación pertenece a{' '}
                <strong>
                  {invitation.email}
                </strong>
                .
              </p>

              <button
                type="button"
                onClick={changeAccount}
                disabled={processing}
              >
                Cerrar sesión y cambiar de cuenta
              </button>
            </div>
          </>
        ) : session && emailMatches ? (
          <div className="manager-invite-state">
            <span className="manager-invite-spinner" />

            <h1>
              Activando tu acceso
            </h1>

            <p>
              Estamos agregando a{' '}
              {invitation.workspace_name}
              {' '}a tu cuenta.
            </p>

            {error && (
              <>
                <p className="manager-invite-inline-error">
                  {error}
                </p>

                <button
                  type="button"
                  className="manager-invite-primary"
                  onClick={completeAcceptance}
                  disabled={processing}
                >
                  Intentar nuevamente
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="manager-invite-hero compact">
              <span className="manager-invite-eyebrow">
                Invitación aceptada
              </span>

              <h1>
                Confirma tus credenciales
              </h1>

              <p>
                Inicia sesión o crea una cuenta
                para activar tu acceso como
                Gestor de{' '}
                <strong>
                  {invitation.workspace_name}
                </strong>
                .
              </p>
            </div>

            <div className="manager-invite-auth">
              <Login
                initialMode="login"
                lockedEmail={
                  invitation.email
                }
                forcedAccountType="gestor"
                invitationToken={token}
                embedded
                onBack={() =>
                  setDecision('')
                }
              />
            </div>

            {error && (
              <p className="manager-invite-inline-error">
                {error}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
