import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import {
  acceptWorkspaceInvitationByToken,
  getWorkspaceInvitationByToken,
} from '../lib/teamService';
import './AceptarInvitacionGestor.css';

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

  const [accepted, setAccepted] =
    useState(null);

  const [error, setError] =
    useState('');

  const [password, setPassword] =
    useState('');

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

  async function login(event) {
    event.preventDefault();

    if (!invitedEmail) return;

    try {
      setProcessing(true);
      setError('');

      const { error: loginError } =
        await supabase.auth
          .signInWithPassword({
            email: invitedEmail,
            password,
          });

      if (loginError) {
        throw loginError;
      }

      setPassword('');

      toast.success(
        'Sesión iniciada. Ya puedes aceptar la invitación.'
      );
    } catch (loginError) {
      console.error(loginError);

      setError(
        loginError.message ||
          'No se pudo iniciar sesión.'
      );
    } finally {
      setProcessing(false);
    }
  }

  async function acceptInvitation() {
    try {
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

    window.history.replaceState(
      {},
      '',
      `${url.pathname}${url.search}${url.hash}`
    );

    window.location.reload();
  }

  function formatDate(value) {
    if (!value) return 'Sin fecha límite';

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
              Tu acceso como Gestor está activo con una
              comisión de{' '}
              <strong>
                {Number(
                  accepted.commission_percentage || 0
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
              . Solicita al Artista una nueva invitación
              cuando corresponda.
            </p>
          </div>
        ) : (
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
                quiere trabajar contigo mediante MiBooking.
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
                <span>Comisión acordada</span>
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
                Este acceso está reservado para{' '}
                <strong>
                  {invitation.email}
                </strong>
                . El enlace vence el{' '}
                {formatDate(
                  invitation.expires_at
                )}
                .
              </p>
            </div>

            {!session ? (
              <form
                className="manager-invite-login"
                onSubmit={login}
              >
                <h2>
                  Inicia sesión para aceptar
                </h2>

                <p>
                  Usa la cuenta MiBooking asociada al
                  correo invitado.
                </p>

                <label>
                  Correo
                  <input
                    type="email"
                    value={invitation.email}
                    readOnly
                  />
                </label>

                <label>
                  Contraseña
                  <input
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    autoComplete="current-password"
                    required
                  />
                </label>

                <button
                  type="submit"
                  className="manager-invite-primary"
                  disabled={processing}
                >
                  {processing
                    ? 'Iniciando sesión...'
                    : 'Iniciar sesión'}
                </button>
              </form>
            ) : !emailMatches ? (
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
            ) : (
              <div className="manager-invite-accept">
                <h2>
                  Todo está listo
                </h2>

                <p>
                  Al aceptar podrás trabajar con{' '}
                  <strong>
                    {invitation.workspace_name}
                  </strong>
                  , sin acceso para modificar sus tarifas,
                  formatos o tipos de evento.
                </p>

                <button
                  type="button"
                  className="manager-invite-primary"
                  onClick={acceptInvitation}
                  disabled={processing}
                >
                  {processing
                    ? 'Aceptando invitación...'
                    : 'Aceptar invitación'}
                </button>
              </div>
            )}

            {error && (
              <p className="manager-invite-inline-error">
                {error}
              </p>
            )}

            <footer className="manager-invite-footer">
              El enlace es personal y no debe reenviarse.
            </footer>
          </>
        )}
      </section>
    </main>
  );
}
