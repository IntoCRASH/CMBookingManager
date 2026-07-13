import { useState } from 'react';
import Login from './Login';
import './Landing.css';

export default function Landing() {
  const [portal, setPortal] =
    useState('');

  const [selectedPlan, setSelectedPlan] =
    useState('');

  function abrirRegistroGeneral() {
    setSelectedPlan('');
    setPortal('signup');
  }

  function irAPlanes() {
    document
      .getElementById('planes')
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
  }

  function seleccionarPlan(plan) {
    try {
      window.localStorage.setItem(
        'mibooking_selected_plan',
        plan
      );
    } catch (error) {
      console.warn(
        'No se pudo guardar el plan seleccionado.',
        error
      );
    }

    setSelectedPlan(plan);
    setPortal('signup');
  }

  if (portal) {
    return (
      <Login
        initialMode={
          portal === 'signup'
            ? 'signup'
            : 'login'
        }
        selectedPlan={
          portal === 'signup'
            ? selectedPlan
            : ''
        }
        forcedAccountType={
          portal === 'signup' &&
          selectedPlan
            ? 'artista'
            : ''
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

        <div className="landing-nav-actions">
          <button
            type="button"
            className="landing-nav-plan"
            onClick={irAPlanes}
          >
            Planes
          </button>

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
            onClick={abrirRegistroGeneral}
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
          <figure className="landing-live-card">
            <img
              src="/mibooking-concert.webp"
              alt="Artista en concierto frente a un público"
              loading="eager"
            />

            <div className="landing-photo-shade" />

            <figcaption className="landing-photo-caption">
              <span>
                Del primer contacto al último aplauso
              </span>

              <strong>
                Tu booking, bajo control.
              </strong>
            </figcaption>

            <div className="landing-photo-badge badge-agenda">
              <small>Agenda</small>
              <strong>Eventos organizados</strong>
            </div>

            <div className="landing-photo-badge badge-booking">
              <small>Booking</small>
              <strong>Cotizaciones claras</strong>
            </div>
          </figure>
        </div>
      </section>

      <section className="landing-audiences">
        <article>
          <div className="landing-audience-media">
            <img
              src="/mibooking-artist.webp"
              alt="Artista cantando en vivo"
              loading="lazy"
            />
          </div>

          <div className="landing-audience-content">
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
          </div>
        </article>

        <article>
          <div className="landing-audience-media">
            <img
              src="/mibooking-manager.webp"
              alt="Reunión profesional para contratar un evento"
              loading="lazy"
            />
          </div>

          <div className="landing-audience-content">
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
          </div>
        </article>
      </section>



      <section
        className="landing-pricing"
        id="planes"
      >
        <div className="landing-pricing-heading">
          <span className="landing-pricing-kicker">
            Planes de suscripción
          </span>

          <h2>
            Una operación profesional sin el costo
            de una gran agencia.
          </h2>

          <p>
            Elige el nivel de colaboración que necesita
            tu proyecto. Ambos planes incluyen las
            herramientas esenciales de MiBooking.
          </p>
        </div>

        <div className="landing-manager-free-note">
          <div className="landing-manager-free-icon">
            G
          </div>

          <div>
            <strong>
              Las cuentas de Gestor no tienen costo.
            </strong>

            <p>
              Los Gestores acceden gratuitamente a MiBooking,
              pero su cuenta debe estar vinculada mediante una
              invitación enviada por un Artista.
            </p>
          </div>
        </div>

        <div className="landing-pricing-grid">
          <article className="landing-price-card">
            <div className="landing-price-name">
              <span>Esencial</span>

              <h3>
                Para Artistas que trabajan solos o con
                un colaborador de confianza.
              </h3>
            </div>

            <div className="landing-price">
              <strong>US$20</strong>
              <span>por mes</span>
            </div>

            <ul>
              <li>
                Un espacio de trabajo para tu proyecto
                artístico
              </li>

              <li>
                Clientes, cotizaciones, agenda y pagos
              </li>

              <li>
                Tarifas por zona, formatos y tipos de
                evento
              </li>

              <li>
                Contratos, riders y documentos
              </li>

              <li>
                Control de comisiones
              </li>

              <li className="landing-plan-highlight">
                Hasta 1 Gestor autorizado
              </li>
            </ul>

            <button
              type="button"
              onClick={() =>
                seleccionarPlan('essential')
              }
            >
              Elegir Esencial
            </button>
          </article>

          <article className="landing-price-card featured">
            <span className="landing-price-popular">
              Más flexible
            </span>

            <div className="landing-price-name">
              <span>Profesional</span>

              <h3>
                Para Artistas con equipos de booking,
                representantes o varios colaboradores.
              </h3>
            </div>

            <div className="landing-price">
              <strong>US$30</strong>
              <span>por mes</span>
            </div>

            <ul>
              <li>
                Todo lo incluido en el plan Esencial
              </li>

              <li>
                Operación colaborativa con todo tu
                equipo
              </li>

              <li>
                Cotizaciones y comisiones por cada
                Gestor
              </li>

              <li>
                Acceso independiente para cada
                colaborador
              </li>

              <li>
                Gestión centralizada del proyecto
                artístico
              </li>

              <li className="landing-plan-highlight">
                Gestores ilimitados
              </li>
            </ul>

            <button
              type="button"
              className="primary"
              onClick={() =>
                seleccionarPlan('professional')
              }
            >
              Elegir Profesional
            </button>
          </article>
        </div>

        <div className="landing-partner-offer">
          <div className="landing-partner-mark">
            <img
              src="/la-oreja-mark.png"
              alt=""
              aria-hidden="true"
            />
          </div>

          <div className="landing-partner-copy">
            <span>
              Beneficio especial
            </span>

            <h3>
              50% de descuento durante los primeros
              6 meses.
            </h3>

            <p>
              Los artistas que distribuyen su música
              a través de La Oreja Media reciben una
              tarifa preferencial al comenzar a utilizar
              MiBooking.
            </p>
          </div>

          <div className="landing-partner-prices">
            <div>
              <small>Esencial</small>
              <strong>US$10</strong>
              <span>
                al mes durante 6 meses
              </span>
            </div>

            <div>
              <small>Profesional</small>
              <strong>US$15</strong>
              <span>
                al mes durante 6 meses
              </span>
            </div>
          </div>
        </div>

        <div className="landing-partner-logos">
          <div>
            <img
              className="la-oreja-logo"
              src="/la-oreja-media.png"
              alt="La Oreja Media"
              loading="lazy"
            />

            <img
              className="dmw-logo"
              src="/dominicana-music-week.png"
              alt="Dominicana Music Week"
              loading="lazy"
            />
          </div>

          <small>
            Solicita tu código de descuento a tu
            representante en La Oreja Media. El beneficio
            se aplica durante los primeros seis meses
            de suscripción.
          </small>
        </div>
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
            MiBooking está pensado para que Artistas
            y sus colaboradores autogestionen sus
            contrataciones, cotizaciones, agenda y
            equipo, sin depender de grandes agencias
            ni asumir costos excesivos.
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
            onClick={abrirRegistroGeneral}
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
