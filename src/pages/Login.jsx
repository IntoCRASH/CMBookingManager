import { useEffect, useState } from 'react';
import {
  signInAccount,
  signUpAccount,
} from '../lib/authService';
import './Login.css';

function readableError(error) {
  const message =
    String(error?.message || '').trim();

  const translations = {
    'Invalid login credentials':
      'El correo o la contraseña no son correctos.',

    'Email not confirmed':
      'Debes confirmar tu correo antes de iniciar sesión.',

    'User already registered':
      'Ya existe una cuenta con ese correo. Usa Iniciar sesión.',

    'Password should be at least 6 characters':
      'La contraseña debe tener al menos 6 caracteres.',
  };

  return (
    translations[message] ||
    message ||
    'No se pudo completar la operación.'
  );
}

export default function Login({
  initialMode = 'login',
  lockedEmail = '',
  forcedAccountType = '',
  invitationToken = '',
  embedded = false,
  onBack,
  onAuthenticated,
}) {
  const [mode, setMode] =
    useState(
      initialMode === 'signup'
        ? 'signup'
        : 'login'
    );

  const [accountType, setAccountType] =
    useState(
      forcedAccountType === 'gestor'
        ? 'gestor'
        : 'artista'
    );

  const [name, setName] =
    useState('');

  const [artistName, setArtistName] =
    useState('');

  const [email, setEmail] =
    useState(lockedEmail || '');

  const [password, setPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [confirmationSent, setConfirmationSent] =
    useState(false);

  useEffect(() => {
    if (lockedEmail) {
      setEmail(lockedEmail);
    }
  }, [lockedEmail]);

  useEffect(() => {
    if (forcedAccountType) {
      setAccountType(
        forcedAccountType === 'artista'
          ? 'artista'
          : 'gestor'
      );
    }
  }, [forcedAccountType]);

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setConfirmationSent(false);
  }

  async function submit(event) {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('El correo es obligatorio.');
      return;
    }

    if (!password) {
      setError('La contraseña es obligatoria.');
      return;
    }

    try {
      setLoading(true);

      if (mode === 'login') {
        const data =
          await signInAccount({
            email,
            password,
            accountType:
              forcedAccountType || null,
          });

        if (onAuthenticated) {
          onAuthenticated(data);
        }

        return;
      }

      if (!name.trim()) {
        setError(
          'Tu nombre es obligatorio.'
        );
        return;
      }

      if (
        accountType === 'artista' &&
        !artistName.trim()
      ) {
        setError(
          'El nombre artístico es obligatorio.'
        );
        return;
      }

      if (password.length < 8) {
        setError(
          'La contraseña debe tener al menos 8 caracteres.'
        );
        return;
      }

      if (password !== confirmPassword) {
        setError(
          'Las contraseñas no coinciden.'
        );
        return;
      }

      const data =
        await signUpAccount({
          name,
          artistName,
          email,
          password,
          accountType,
          invitationToken,
        });

      if (data?.session) {
        if (onAuthenticated) {
          onAuthenticated(data);
        }

        return;
      }

      setConfirmationSent(true);
    } catch (submitError) {
      console.error(submitError);
      setError(
        readableError(submitError)
      );
    } finally {
      setLoading(false);
    }
  }

  if (confirmationSent) {
    return (
      <section
        className={
          embedded
            ? 'auth-panel embedded'
            : 'auth-screen'
        }
      >
        <div className="auth-card auth-confirmation">
          <img
            src="/mibooking-logo.png"
            alt="MiBooking"
          />

          <span className="auth-success-icon">
            ✓
          </span>

          <h1>Confirma tu correo</h1>

          <p>
            Enviamos un enlace a{' '}
            <strong>{email}</strong>.
            Ábrelo para activar tu cuenta.
          </p>

          {invitationToken ? (
            <p>
              Después de confirmar, regresarás
              automáticamente a esta invitación
              para completar la aceptación.
            </p>
          ) : (
            <p>
              Después de confirmar podrás entrar
              a MiBooking con tus credenciales.
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              setConfirmationSent(false);
              changeMode('login');
            }}
          >
            Volver a Iniciar sesión
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={
        embedded
          ? 'auth-panel embedded'
          : 'auth-screen'
      }
    >
      <form
        className="auth-card"
        onSubmit={submit}
      >
        {!embedded && (
          <img
            className="auth-logo"
            src="/mibooking-logo.png"
            alt="MiBooking"
          />
        )}

        {onBack && (
          <button
            className="auth-back"
            type="button"
            onClick={onBack}
          >
            ← Volver
          </button>
        )}

        <div className="auth-tabs">
          <button
            type="button"
            className={
              mode === 'login'
                ? 'active'
                : ''
            }
            onClick={() =>
              changeMode('login')
            }
          >
            Iniciar sesión
          </button>

          <button
            type="button"
            className={
              mode === 'signup'
                ? 'active'
                : ''
            }
            onClick={() =>
              changeMode('signup')
            }
          >
            Crear cuenta
          </button>
        </div>

        <header className="auth-heading">
          <span>
            {mode === 'login'
              ? 'Bienvenido'
              : forcedAccountType === 'gestor'
                ? 'Cuenta de Gestor'
                : 'Únete a MiBooking'}
          </span>

          <h1>
            {mode === 'login'
              ? 'Entra a tu cuenta'
              : 'Crea tus credenciales'}
          </h1>

          <p>
            {mode === 'login'
              ? 'Accede a tus artistas, cotizaciones, agenda y comisiones.'
              : forcedAccountType === 'gestor'
                ? 'Crea tu cuenta con el correo al que llegó la invitación.'
                : 'Selecciona cómo vas a utilizar MiBooking.'}
          </p>
        </header>

        {mode === 'signup' &&
          !forcedAccountType && (
          <div className="auth-role-selector">
            <button
              type="button"
              className={
                accountType === 'artista'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setAccountType('artista')
              }
            >
              <strong>Artista</strong>
              <span>
                Gestiono mi propio proyecto
                artístico.
              </span>
            </button>

            <button
              type="button"
              className={
                accountType === 'gestor'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setAccountType('gestor')
              }
            >
              <strong>Gestor</strong>
              <span>
                Trabajo con uno o varios
                artistas.
              </span>
            </button>
          </div>
        )}

        {mode === 'signup' && (
          <>
            <label>
              Nombre completo *
              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                autoComplete="name"
                required
              />
            </label>

            {accountType === 'artista' && (
              <label>
                Nombre artístico *
                <input
                  type="text"
                  value={artistName}
                  onChange={(event) =>
                    setArtistName(
                      event.target.value
                    )
                  }
                  autoComplete="organization"
                  required
                />
              </label>
            )}
          </>
        )}

        <label>
          Correo *
          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            readOnly={Boolean(lockedEmail)}
            autoComplete="email"
            required
          />
        </label>

        {lockedEmail && (
          <small className="auth-locked-email">
            Este correo está vinculado a la
            invitación y no puede modificarse.
          </small>
        )}

        <label>
          Contraseña *
          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            autoComplete={
              mode === 'login'
                ? 'current-password'
                : 'new-password'
            }
            required
          />
        </label>

        {mode === 'signup' && (
          <label>
            Confirmar contraseña *
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              autoComplete="new-password"
              required
            />
          </label>
        )}

        {error && (
          <p className="auth-error">
            {error}
          </p>
        )}

        <button
          className="auth-submit"
          type="submit"
          disabled={loading}
        >
          {loading
            ? 'Procesando...'
            : mode === 'login'
              ? 'Entrar a MiBooking'
              : 'Crear mi cuenta'}
        </button>

        <p className="auth-switch">
          {mode === 'login'
            ? '¿Todavía no tienes credenciales?'
            : '¿Ya tienes una cuenta?'}

          <button
            type="button"
            onClick={() =>
              changeMode(
                mode === 'login'
                  ? 'signup'
                  : 'login'
              )
            }
          >
            {mode === 'login'
              ? 'Crear cuenta'
              : 'Iniciar sesión'}
          </button>
        </p>
      </form>
    </section>
  );
}
