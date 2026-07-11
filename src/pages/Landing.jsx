import { useState } from 'react';
import Login from './Login';
import './Landing.css';

export default function Landing() {
  const [portal, setPortal] =
    useState('');

  if (portal) {
    return (
      <Login
        initialMode={
          portal === 'signup'
            ? 'signup'
            : 'login'
        }
        onBack={() => setPortal('')}
      />
    );
  }

  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <img
          src="/mibooking-logo.png"
          alt="MiBooking"
        />

        <div>
          <button
            type="button"
            onClick={() =>
              setPortal('login')
            }
          >
            Iniciar sesión
          </button>

          <button
            type="button"
            className="primary"
            onClick={() =>
              setPortal('signup')
            }
          >
            Crear cuenta
          </button>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-copy">
          <span className="landing-kicker">
            Música · Eventos · Negocio
          </span>

          <h1>
            Tu operación artística,
            organizada en un solo lugar.
          </h1>

          <p>
            Gestiona clientes, cotizaciones,
            tarifas, formatos, agenda, pagos,
            equipos y comisiones con una
            plataforma diseñada para Artistas
            y Gestores.
          </p>

          <div className="landing-actions">
            <button
              type="button"
              className="primary"
              onClick={() =>
                setPortal('signup')
              }
            >
              Comenzar ahora
            </button>

            <button
              type="button"
              onClick={() =>
                setPortal('login')
              }
            >
              Ya tengo una cuenta
            </button>
          </div>
        </div>

        <div className="landing-preview">
          <div className="landing-window">
            <div className="landing-window-top">
              <span />
              <span />
              <span />
            </div>

            <div className="landing-preview-brand">
              <img
                src="/mibooking-icon.png"
                alt=""
              />

              <div>
                <strong>MiBooking</strong>
                <small>
                  Panel de operaciones
                </small>
              </div>
            </div>

            <div className="landing-metrics">
              <article>
                <span>Próximo evento</span>
                <strong>Agenda clara</strong>
              </article>

              <article>
                <span>Cotizaciones</span>
                <strong>Todo controlado</strong>
              </article>

              <article>
                <span>Comisiones</span>
                <strong>Sin confusiones</strong>
              </article>
            </div>

            <div className="landing-lines">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </section>

      <section className="landing-audiences">
        <article>
          <span>Para Artistas</span>
          <h2>
            Controla tu proyecto y tu equipo.
          </h2>
          <p>
            Configura tus tarifas, formatos,
            tipos de evento, perfil comercial
            y Gestores autorizados.
          </p>

          <button
            type="button"
            onClick={() =>
              setPortal('signup')
            }
          >
            Registrarme como Artista
          </button>
        </article>

        <article>
          <span>Para Gestores</span>
          <h2>
            Trabaja con varios Artistas.
          </h2>
          <p>
            Acepta invitaciones, crea
            cotizaciones y controla las
            comisiones que te corresponden.
          </p>

          <button
            type="button"
            onClick={() =>
              setPortal('signup')
            }
          >
            Registrarme como Gestor
          </button>
        </article>
      </section>

      <footer className="landing-footer">
        <img
          src="/mibooking-icon.png"
          alt=""
        />

        <span>
          MiBooking · Música, eventos y
          negocio.
        </span>
      </footer>
    </main>
  );
}
