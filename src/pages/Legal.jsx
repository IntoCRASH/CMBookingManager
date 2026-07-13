import {
  useMemo,
  useState,
} from 'react';
import './Legal.css';

const SECTIONS = {
  terms: {
    label:
      'Términos de uso',
    title:
      'Términos y condiciones de MiBooking',
  },

  privacy: {
    label:
      'Privacidad',
    title:
      'Política de privacidad',
  },

  refunds: {
    label:
      'Cancelaciones',
    title:
      'Cancelaciones y reembolsos',
  },
};

export default function Legal({
  initialSection = 'terms',
  onBack,
}) {
  const initial =
    SECTIONS[initialSection]
      ? initialSection
      : 'terms';

  const [section, setSection] =
    useState(initial);

  const current =
    useMemo(
      () => SECTIONS[section],
      [section]
    );

  return (
    <main className="legal-page">
      <header className="legal-header">
        <button
          type="button"
          className="legal-brand"
          onClick={onBack}
        >
          <img
            src="/mibooking-icon.png"
            alt=""
          />

          <span>MiBooking</span>
        </button>

        <button
          type="button"
          className="legal-back"
          onClick={onBack}
        >
          Volver
        </button>
      </header>

      <div className="legal-layout">
        <aside className="legal-nav">
          {Object.entries(
            SECTIONS
          ).map(
            ([key, item]) => (
              <button
                key={key}
                type="button"
                className={
                  section === key
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setSection(key)
                }
              >
                {item.label}
              </button>
            )
          )}
        </aside>

        <article className="legal-document">
          <span className="legal-kicker">
            Vigente desde el 13 de julio de 2026
          </span>

          <h1>{current.title}</h1>

          {section === 'terms' && (
            <>
              <p>
                Estos términos regulan el uso de
                MiBooking, una plataforma para organizar
                contrataciones, cotizaciones, clientes,
                agenda, documentos, pagos y colaboración
                entre Artistas y Gestores.
              </p>

              <h2>1. Cuentas y responsabilidades</h2>

              <p>
                El Artista administra su workspace y es
                responsable de la información, tarifas,
                documentos y usuarios invitados. Las
                cuentas de Gestor son gratuitas y solo
                acceden mediante una invitación válida
                enviada por un Artista.
              </p>

              <h2>2. Suscripciones</h2>

              <p>
                Los planes de Artista se cobran
                mensualmente y se renuevan
                automáticamente hasta que el titular
                cancele la renovación. Los precios,
                límites y beneficios vigentes se muestran
                antes de iniciar el pago.
              </p>

              <h2>3. Uso permitido</h2>

              <p>
                No se permite utilizar MiBooking para
                actividades ilícitas, acceso no
                autorizado, distribución de software
                malicioso, fraude, suplantación o
                almacenamiento de contenido que vulnere
                derechos de terceros.
              </p>

              <h2>4. Contenido del usuario</h2>

              <p>
                El usuario conserva la titularidad de la
                información y documentos que incorpora.
                Autoriza su procesamiento únicamente para
                prestar, proteger y mantener las
                funciones de MiBooking.
              </p>

              <h2>5. Disponibilidad</h2>

              <p>
                Se procura mantener la plataforma
                disponible y segura, pero pueden ocurrir
                mantenimientos, interrupciones o cambios
                técnicos. No se garantiza disponibilidad
                ininterrumpida ni ausencia absoluta de
                errores.
              </p>

              <h2>6. Suspensión y terminación</h2>

              <p>
                El acceso puede restringirse por falta de
                pago, uso abusivo, riesgo de seguridad o
                incumplimiento de estos términos. Cuando
                sea posible, se ofrecerá una vía para
                corregir la situación.
              </p>

              <h2>7. Contacto</h2>

              <p>
                Para consultas relacionadas con estos
                términos, escribe a
                {' '}
                <a href="mailto:soporte@mibooking.app">
                  soporte@mibooking.app
                </a>.
              </p>
            </>
          )}

          {section === 'privacy' && (
            <>
              <p>
                Esta política explica qué información
                utiliza MiBooking y con qué finalidad.
              </p>

              <h2>1. Información recopilada</h2>

              <p>
                Podemos procesar datos de cuenta,
                información del proyecto artístico,
                clientes, cotizaciones, agenda,
                documentos, configuraciones, registros
                técnicos y datos necesarios para la
                facturación.
              </p>

              <h2>2. Finalidades</h2>

              <p>
                La información se utiliza para prestar el
                servicio, autenticar usuarios, generar
                documentos, mantener la seguridad,
                procesar pagos, ofrecer soporte y mejorar
                el funcionamiento de la plataforma.
              </p>

              <h2>3. Proveedores</h2>

              <p>
                MiBooking utiliza proveedores
                especializados para infraestructura,
                autenticación, base de datos, correo y
                pagos. Stripe procesa la información de
                pago; MiBooking no almacena números
                completos de tarjetas.
              </p>

              <h2>4. Separación de workspaces</h2>

              <p>
                Cada workspace mantiene su información
                separada. Un Gestor solo puede acceder a
                los Artistas que lo hayan invitado y
                dentro de los permisos asignados.
              </p>

              <h2>5. Conservación y seguridad</h2>

              <p>
                Los datos se conservan mientras sean
                necesarios para ofrecer el servicio,
                cumplir obligaciones o resolver
                incidencias. Se aplican controles de
                acceso y medidas técnicas razonables,
                aunque ningún sistema es infalible.
              </p>

              <h2>6. Solicitudes</h2>

              <p>
                Puedes solicitar corrección o eliminación
                de información, cuando sea aplicable,
                escribiendo a
                {' '}
                <a href="mailto:soporte@mibooking.app">
                  soporte@mibooking.app
                </a>.
              </p>
            </>
          )}

          {section === 'refunds' && (
            <>
              <p>
                Esta política describe cómo funcionan la
                renovación, cancelación y revisión de
                cobros de MiBooking.
              </p>

              <h2>1. Renovación mensual</h2>

              <p>
                Las suscripciones se renuevan
                automáticamente cada mes utilizando el
                método de pago registrado en Stripe.
              </p>

              <h2>2. Cancelación</h2>

              <p>
                El Artista puede cancelar la renovación
                desde el portal de facturación. Salvo que
                se indique lo contrario, la cancelación
                se aplica al final del período ya pagado
                y el acceso continúa hasta esa fecha.
              </p>

              <h2>3. Reembolsos</h2>

              <p>
                Los cobros mensuales ya procesados no se
                reembolsan automáticamente por falta de
                uso o por olvidar cancelar antes de la
                renovación. Se revisarán individualmente
                cobros duplicados, errores técnicos,
                operaciones no autorizadas u otros casos
                exigidos por la normativa aplicable.
              </p>

              <h2>4. Descuentos</h2>

              <p>
                Los códigos promocionales no tienen valor
                en efectivo, no son transferibles salvo
                indicación expresa y se aplican durante
                el período definido al momento de
                utilizarlos.
              </p>

              <h2>5. Fallos de pago</h2>

              <p>
                Cuando un cobro falla, MiBooking puede
                mantener acceso temporal durante un
                período de gracia. Si la deuda continúa,
                el acceso operativo puede restringirse
                hasta que el pago sea regularizado.
              </p>

              <h2>6. Solicitudes de revisión</h2>

              <p>
                Para solicitar una revisión de un cobro,
                escribe a
                {' '}
                <a href="mailto:soporte@mibooking.app">
                  soporte@mibooking.app
                </a>
                {' '}
                e incluye el correo de la cuenta, fecha y
                motivo de la solicitud.
              </p>
            </>
          )}


        </article>
      </div>
    </main>
  );
}
