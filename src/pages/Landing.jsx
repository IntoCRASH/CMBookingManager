import { useState } from 'react';
import Login from './Login';
import './Landing.css';

const trialBannerStyles = {
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    width: 'min(100%, 760px)',
    margin: '24px auto 28px',
    padding: '16px 18px',
    border: '1px solid rgba(91, 79, 242, 0.22)',
    borderRadius: '20px',
    background:
      'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(244,242,255,0.96))',
    boxShadow: '0 16px 40px rgba(54, 44, 120, 0.09)',
    boxSizing: 'border-box',
  },
  badge: {
    display: 'flex',
    flex: '0 0 auto',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '72px',
    height: '72px',
    borderRadius: '18px',
    background: 'linear-gradient(145deg, #6757ff, #445cf5)',
    color: '#ffffff',
    boxShadow: '0 12px 26px rgba(79, 70, 229, 0.24)',
  },
  number: {
    fontSize: '27px',
    fontWeight: 900,
    lineHeight: 1,
  },
  days: {
    display: 'block',
    width: '100%',
    marginTop: '5px',
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '0.08em',
    lineHeight: 1.05,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  content: {
    minWidth: 0,
    flex: '1 1 280px',
  },
  eyebrow: {
    display: 'block',
    marginBottom: '4px',
    color: '#5b4ff2',
    fontSize: '11px',
    fontWeight: 900,
    letterSpacing: '0.14em',
    lineHeight: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    display: 'block',
    color: '#20283c',
    fontSize: '16px',
    fontWeight: 850,
    lineHeight: 1.35,
  },
  description: {
    margin: '5px 0 0',
    color: '#667085',
    fontSize: '13px',
    lineHeight: 1.55,
  },
};

export default function Landing() {
  const [portal, setPortal] =
    useState('');

  const [selectedPlan, setSelectedPlan] =
    useState('');

  const [billingCycle, setBillingCycle] =
    useState('monthly');

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

      window.localStorage.setItem(
        'mibooking_selected_billing_cycle',
        billingCycle
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
        selectedBillingCycle={
          portal === 'signup' &&
          selectedPlan
            ? billingCycle
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
            Menos administración, ¡Más música!
          </span>

          <h1>
            Tu operación artística,
            organizada en un solo lugar.
          </h1>

          <p>
            Gestiona clientes, cotizaciones,
            tarifas, contratos, riders, agenda, pagos,
            equipos y comisiones con una
            plataforma diseñada para Artistas
            y Gestores. ¡Es como tener un asistente,
            un vendedor, un asesor legal y un técnico de sonido,
            en una sóla herramienta trabajando
            para ti!

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
            <div className="landing-live-frame">
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
            </div>

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
              <br></br>
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
        <div className="landing-manager-free-note">
          <div className="landing-manager-free-icon">
            $0
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
            Elige el nivel de colaboración y la modalidad
            de pago que necesita tu proyecto. Ambos planes
            incluyen <strong>3 días de prueba gratis</strong> antes del
            primer cobro. Si no te gusta o no se adapta a tus necesidades 
            cancela antes de finalizar el periodo de prueba.
            
          </p>

          <div
            className="landing-billing-switch"
            role="group"
            aria-label="Modalidad de facturación"
          >
            <button
              type="button"
              className={
                billingCycle === 'monthly'
                  ? 'active'
                  : ''
              }
              aria-pressed={
                billingCycle === 'monthly'
              }
              onClick={() =>
                setBillingCycle('monthly')
              }
            >
              Mensual
            </button>

            <button
              type="button"
              className={
                billingCycle === 'annual'
                  ? 'active'
                  : ''
              }
              aria-pressed={
                billingCycle === 'annual'
              }
              onClick={() =>
                setBillingCycle('annual')
              }
            >
              Anual
              <small>Ahorra hasta 42%</small>
            </button>
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
              <strong>
                {billingCycle === 'annual'
                  ? 'US$140'
                  : 'US$20'}
              </strong>

              <span>
                {billingCycle === 'annual'
                  ? 'por año'
                  : 'por mes'}
              </span>
            </div>

            <p className="landing-price-detail">
              {billingCycle === 'annual'
                ? 'Equivale a US$11.67 al mes, facturado anualmente.'
                : 'Facturación mensual después de los 3 días gratis.'}
            </p>

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
              Probar Esencial gratis
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
              <strong>
                {billingCycle === 'annual'
                  ? 'US$275'
                  : 'US$35'}
              </strong>

              <span>
                {billingCycle === 'annual'
                  ? 'por año'
                  : 'por mes'}
              </span>
            </div>

            <p className="landing-price-detail">
              {billingCycle === 'annual'
                ? 'Equivale a US$22.92 al mes, facturado anualmente.'
                : 'Facturación mensual después de los 3 días gratis.'}
            </p>

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
              Probar Profesional gratis
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
              40% de descuento durante los primeros
              3 meses en la modalidad mensual.
            </h3>

            <p>
              Los artistas que distribuyen su música
              a través de La Oreja Media reciben una
              tarifa preferencial al comenzar a utilizar
              MiBooking con facturación mensual.
            </p>
          </div>

          <div className="landing-partner-prices">
            <div>
              <small>Esencial</small>
              <strong>US$12</strong>
              <span>
                al mes durante 3 meses
              </span>
            </div>

            <div>
              <small>Profesional</small>
              <strong>US$21</strong>
              <span>
                al mes durante 3 meses
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
            se aplica durante los primeros tres meses
            de una suscripción mensual.
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
              ¿Cómo funcionan la prueba gratis y el cobro?
            </summary>

            <p>
              Tanto el plan Esencial como el Profesional
              incluyen 3 días de prueba gratis. Puedes elegir
              facturación mensual o anual y el primer cobro
              se realiza al terminar el período de prueba.
              Después, la suscripción se renueva según la
              modalidad seleccionada hasta que la canceles.
            </p>
          </details>

          <details>
            <summary>
              ¿Puedo usarlo aunque trabaje solo?
            </summary>

            <p>
              Claro. No necesitas tener un equipo grande
              para trabajar como los grandes. Puedes
              crear cotizaciones, contratos, riders,
              documentos y tarifas a partir de los formatos
              y servicios que realmente ofreces.
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
        <div className="landing-footer-brand">
          <img
            src="/mibooking-icon.png"
            alt=""
          />

          <span>
            MiBooking · Menos administración,
            ¡Más música!
          </span>
        </div>

        <nav
          className="landing-legal-links"
          aria-label="Información legal"
        >
          <a href="/?legal=terms">
            Términos
          </a>

          <a href="/?legal=privacy">
            Privacidad
          </a>

          <a href="/?legal=refunds">
            Cancelaciones
          </a>
        </nav>
      </footer>
    </main>
  );
}
