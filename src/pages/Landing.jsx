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


      <section className="landing-faq">
        <div className="landing-faq-heading">
          <span className="landing-faq-kicker">
            Preguntas frecuentes
          </span>

          <h2>
            Lo que probablemente quieras saber
            antes de comenzar.
          </h2>

          <p>
            MiBooking está pensado para que puedas
            organizar tu operación sin convertirte
            en experto en sistemas.
          </p>
        </div>

        <div className="landing-faq-list">
          <details open>
            <summary>
              ¿Qué es MiBooking, en palabras simples?
            </summary>

            <p>
              Es una plataforma para organizar el
              trabajo diario de un proyecto artístico:
              clientes, cotizaciones, tarifas,
              formatos, agenda, pagos, documentos,
              equipos y comisiones, todo desde un
              mismo lugar.
            </p>
          </details>

          <details>
            <summary>
              ¿Puedo usarlo aunque trabaje solo?
            </summary>

            <p>
              Claro. No necesitas tener una orquesta
              completa ni un equipo grande. Puedes
              crear formatos sin músicos acompañantes,
              organizar tus propias tarifas y trabajar
              únicamente con los servicios que
              realmente ofreces.
            </p>
          </details>

          <details>
            <summary>
              ¿Necesito configurarlo todo el primer día?
            </summary>

            <p>
              Para nada. Puedes comenzar con lo
              esencial y completar tu perfil, tarifas,
              formatos, tipos de evento y documentos
              poco a poco. MiBooking incluye un
              tutorial para ayudarte a preparar cada
              parte en el orden correcto.
            </p>
          </details>

          <details>
            <summary>
              ¿Cómo funcionan los Artistas y Gestores?
            </summary>

            <p>
              El Artista controla la configuración de
              su proyecto y decide qué Gestores pueden
              trabajar con él. Un Gestor puede colaborar
              con uno o varios Artistas, pero solo
              accede a los espacios para los que ha
              recibido y aceptado una invitación.
            </p>
          </details>

          <details>
            <summary>
              ¿Mi información se mantiene privada?
            </summary>

            <p>
              Sí. La información de cada cuenta
              permanece vinculada a su propio espacio
              de trabajo. MiBooking no comercializa
              tus datos ni los comparte con otros
              usuarios, Artistas o Gestores ajenos a
              tu operación. La información se utiliza
              únicamente para ofrecerte las funciones
              de la plataforma y mantener tu gestión
              organizada.
            </p>
          </details>

          <details>
            <summary>
              ¿Puedo adaptar MiBooking a mi forma de cobrar?
            </summary>

            <p>
              Sí. Puedes configurar tarifas por zona,
              formatos, tipos de evento, músicos,
              sonido, transporte, costos adicionales
              y multiplicadores. La idea es que la
              plataforma se ajuste a tu operación, no
              que tú tengas que cambiar tu manera de
              trabajar.
            </p>
          </details>
        </div>

        <div className="landing-faq-cta">
          <div>
            <strong>
              ¿Listo para organizar tu booking?
            </strong>

            <span>
              Crea tu cuenta y configura tu operación
              a tu ritmo.
            </span>
          </div>

          <button
            type="button"
            className="primary"
            onClick={() =>
              setPortal('signup')
            }
          >
            Comenzar con MiBooking
          </button>
        </div>
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
