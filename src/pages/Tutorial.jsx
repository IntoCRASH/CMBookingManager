import { useEffect, useMemo, useState } from 'react';
import './Tutorial.css';

function readStoredProgress(storageKey) {
  if (typeof window === 'undefined') return [];

  try {
    const saved = JSON.parse(
      window.localStorage.getItem(storageKey) || '[]'
    );

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export default function Tutorial({
  workspaceId,
  workspace,
  esArtista,
  goBack,
  goPerfil,
  goEquipo,
  goFormatos,
  goTiposEvento,
  goTarifas,
  goClientes,
  goNuevaCotizacion,
  goCotizaciones,
  goDocumentos,
  goCalendario,
  goComisiones,
  goInvitaciones,
}) {
  const roleKey = esArtista ? 'artista' : 'gestor';

  const storageKey =
    `mibooking.tutorial.${workspaceId || 'sin-workspace'}.${roleKey}`;

  const [completados, setCompletados] = useState(() =>
    readStoredProgress(storageKey)
  );

  useEffect(() => {
    setCompletados(readStoredProgress(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(
      storageKey,
      JSON.stringify(completados)
    );
  }, [storageKey, completados]);

  const nombreArtista =
    workspace?.workspace_name || 'el Artista';

  const pasos = useMemo(() => {
    if (esArtista) {
      return [
        {
          id: 'perfil',
          grupo: 'Configuración inicial',
          titulo: 'Completa el Perfil del Artista',
          descripcion:
            'Define la identidad artística y legal que aparecerá en cotizaciones, contratos y otros documentos.',
          detalles: [
            'Nombre artístico y datos de contratación.',
            'Nombre legal, identificación, dirección y teléfono.',
            'Información bancaria, porcentaje de adelanto y condiciones de pago.',
            'Logo, firma y configuración contractual.',
          ],
          accion: goPerfil,
          accionTexto: 'Abrir Perfil',
          obligatorio: true,
        },
        {
          id: 'formatos',
          grupo: 'Configuración inicial',
          titulo: 'Crea los Formatos de presentación',
          descripcion:
            'Registra cada modalidad en la que puede contratarse el Artista.',
          detalles: [
            'Nombre del formato.',
            'Cantidad de músicos acompañantes.',
            'Estado activo o inactivo.',
            'Duplica un formato cuando necesites una variante similar.',
          ],
          accion: goFormatos,
          accionTexto: 'Abrir Formatos',
          obligatorio: true,
        },
        {
          id: 'riders',
          grupo: 'Configuración inicial',
          titulo: 'Configura el rider de cada Formato',
          descripcion:
            'Dentro de Formatos, define integrantes, canales, monitores, backline, tarima y requerimientos técnicos.',
          detalles: [
            'Instrumento o función de cada integrante.',
            'Micrófonos, cajas directas y conexiones.',
            'Mezclas de monitores y posiciones en tarima.',
            'PA, electricidad, hospitalidad y tiempos de prueba.',
          ],
          accion: goFormatos,
          accionTexto: 'Configurar Riders',
          obligatorio: false,
        },
        {
          id: 'tipos',
          grupo: 'Configuración inicial',
          titulo: 'Define los Tipos de evento',
          descripcion:
            'Crea las categorías que modifican la responsabilidad, producción y cálculo de cada contratación.',
          detalles: [
            'Eventos privados, públicos, corporativos o especiales.',
            'Multiplicadores y costos extraordinarios.',
            'Activa solamente los tipos que realmente utilizarás.',
          ],
          accion: goTiposEvento,
          accionTexto: 'Abrir Tipos',
          obligatorio: true,
        },
        {
          id: 'tarifas',
          grupo: 'Configuración inicial',
          titulo: 'Configura Tarifas por zona',
          descripcion:
            'Establece los valores base que MiBooking utilizará para calcular cada cotización.',
          detalles: [
            'Honorarios del Artista.',
            'Tarifa por músico.',
            'Transporte, dieta, sonido y road manager.',
            'Zonas locales y fuera de la ciudad.',
          ],
          accion: goTarifas,
          accionTexto: 'Abrir Tarifas',
          obligatorio: true,
        },
        {
          id: 'equipo',
          grupo: 'Acceso y colaboración',
          titulo: 'Invita Gestores a tu Equipo',
          descripcion:
            'Agrega las personas que podrán cotizar, consultar información operativa y generar documentos.',
          detalles: [
            'Invitación por correo.',
            'Porcentaje de comisión individual.',
            'El Gestor debe aceptar antes de obtener acceso.',
            'Las configuraciones sensibles permanecen bajo control del Artista.',
          ],
          accion: goEquipo,
          accionTexto: 'Abrir Equipo',
          obligatorio: false,
        },
        {
          id: 'clientes',
          grupo: 'Primera operación',
          titulo: 'Registra o selecciona un Cliente',
          descripcion:
            'Los datos del cliente alimentan cotizaciones, contratos, correos y documentos del evento.',
          detalles: [
            'Nombre y empresa.',
            'Teléfono y correo.',
            'RNC o identificación cuando corresponda.',
            'Puedes crear el cliente durante la cotización.',
          ],
          accion: goClientes,
          accionTexto: 'Abrir Clientes',
          obligatorio: false,
        },
        {
          id: 'cotizacion',
          grupo: 'Primera operación',
          titulo: 'Genera tu primera Cotización',
          descripcion:
            'Selecciona cliente, evento, zona y formato. MiBooking calculará el precio usando la configuración del Artista.',
          detalles: [
            'Completa fecha, venue, horarios y contacto.',
            'Revisa sonido, descuento y estado.',
            'Calcula antes de guardar.',
            'La cotización conservará un snapshot del Perfil y las políticas.',
          ],
          accion: goNuevaCotizacion,
          accionTexto: 'Nueva Cotización',
          obligatorio: true,
        },
        {
          id: 'confirmar',
          grupo: 'Flujo operativo',
          titulo: 'Confirma la contratación y genera Documentos',
          descripcion:
            'Cuando el cliente apruebe, cambia el estado de la cotización y genera los documentos correspondientes.',
          detalles: [
            'Usa Confirmada o Aprobada según el flujo disponible.',
            'Genera contrato desde Documentos.',
            'Genera rider técnico desde el Formato contratado.',
            'Descarga el PDF o envíalo por correo.',
          ],
          accion: goDocumentos,
          accionTexto: 'Abrir Documentos',
          obligatorio: true,
        },
        {
          id: 'seguimiento',
          grupo: 'Flujo operativo',
          titulo: 'Da seguimiento al evento y a los cobros',
          descripcion:
            'Utiliza la agenda, los pagos y las comisiones para controlar el trabajo después de confirmar.',
          detalles: [
            'Consulta el evento en Calendario.',
            'Registra pagos desde la cotización.',
            'Revisa balances pendientes.',
            'Liquida comisiones cuando corresponda.',
          ],
          accion: goCalendario,
          accionTexto: 'Abrir Calendario',
          obligatorio: false,
        },
      ];
    }

    return [
      {
        id: 'invitacion',
        grupo: 'Acceso inicial',
        titulo: 'Acepta una invitación de un Artista',
        descripcion:
          'Un Gestor solamente puede trabajar con los Artistas que le hayan concedido acceso.',
        detalles: [
          'Abre Invitaciones.',
          'Acepta la relación enviada por el Artista.',
          'Verifica que el Artista aparezca en el selector.',
          'Cada relación puede tener una comisión diferente.',
        ],
        accion: goInvitaciones,
        accionTexto: 'Abrir Invitaciones',
        obligatorio: true,
      },
      {
        id: 'seleccionar',
        grupo: 'Acceso inicial',
        titulo: 'Selecciona el Artista correcto',
        descripcion:
          'Antes de trabajar, confirma qué Artista está activo. Cada workspace tiene clientes, tarifas, formatos y documentos independientes.',
        detalles: [
          'Revisa el nombre artístico en la parte superior.',
          'Cambia de Artista cuando tengas más de uno.',
          'Nunca mezcles información entre workspaces.',
        ],
        accion: goCotizaciones,
        accionTexto: 'Ver Cotizaciones',
        obligatorio: true,
      },
      {
        id: 'clientes',
        grupo: 'Primera operación',
        titulo: 'Verifica los datos del Cliente',
        descripcion:
          'Selecciona un cliente existente o crea uno nuevo al preparar la cotización.',
        detalles: [
          'Nombre y empresa.',
          'Teléfono y correo.',
          'Persona de contacto del evento.',
          'Información suficiente para contrato y correo.',
        ],
        accion: goClientes,
        accionTexto: 'Abrir Clientes',
        obligatorio: false,
      },
      {
        id: 'cotizacion',
        grupo: 'Primera operación',
        titulo: 'Crea una Cotización para el Artista',
        descripcion:
          'En Nueva Cotización, selecciona primero al Artista para cargar sus formatos, zonas, tarifas y tipos de evento.',
        detalles: [
          'Confirma el Artista seleccionado.',
          'Elige cliente, zona, tipo de evento y formato.',
          'Completa fecha, lugar y horarios.',
          'Calcula y guarda la cotización.',
        ],
        accion: goNuevaCotizacion,
        accionTexto: 'Nueva Cotización',
        obligatorio: true,
      },
      {
        id: 'estado',
        grupo: 'Flujo operativo',
        titulo: 'Actualiza el estado de la Cotización',
        descripcion:
          'Usa el estado correcto para reflejar si está pendiente, confirmada, por cobrar, realizada o cancelada.',
        detalles: [
          'Pendiente de aprobación mientras el cliente decide.',
          'Confirmada cuando la contratación esté aceptada.',
          'Pendiente de cobro cuando falte completar el pago.',
          'Realizada después del evento.',
        ],
        accion: goCotizaciones,
        accionTexto: 'Abrir Cotizaciones',
        obligatorio: true,
      },
      {
        id: 'documentos',
        grupo: 'Flujo operativo',
        titulo: 'Genera Contrato y Rider técnico',
        descripcion:
          'Desde una cotización confirmada o aprobada, genera los documentos del evento.',
        detalles: [
          'Revisa los datos antes de generar.',
          'Descarga el PDF.',
          'Envía el documento por correo.',
          'Crea una nueva versión cuando haya cambios.',
        ],
        accion: goDocumentos,
        accionTexto: 'Abrir Documentos',
        obligatorio: true,
      },
      {
        id: 'seguimiento',
        grupo: 'Flujo operativo',
        titulo: 'Controla agenda, cobros y comisión',
        descripcion:
          'Después de confirmar, utiliza los módulos operativos para dar seguimiento.',
        detalles: [
          'Consulta Calendario.',
          'Registra pagos.',
          'Revisa balances pendientes.',
          'Confirma cuándo tu comisión fue cobrada.',
        ],
        accion: goComisiones,
        accionTexto: 'Abrir Comisiones',
        obligatorio: false,
      },
    ];
  }, [
    esArtista,
    goPerfil,
    goEquipo,
    goFormatos,
    goTiposEvento,
    goTarifas,
    goClientes,
    goNuevaCotizacion,
    goCotizaciones,
    goDocumentos,
    goCalendario,
    goComisiones,
    goInvitaciones,
  ]);

  const completadosValidos = completados.filter((id) =>
    pasos.some((paso) => paso.id === id)
  );

  const porcentaje =
    pasos.length > 0
      ? Math.round(
          (completadosValidos.length / pasos.length) * 100
        )
      : 0;

  function toggleCompletado(id) {
    setCompletados((actuales) =>
      actuales.includes(id)
        ? actuales.filter((item) => item !== id)
        : [...actuales, id]
    );
  }

  function reiniciarProgreso() {
    const confirmar = window.confirm(
      '¿Deseas borrar el progreso marcado en este tutorial?'
    );

    if (!confirmar) return;

    setCompletados([]);
  }

  const grupos = [...new Set(pasos.map((paso) => paso.grupo))];

  return (
    <div className="dashboard tutorial-page">
      <div className="top-bar">
        <div>
          <h1>Tutorial de configuración</h1>

          <p>
            {esArtista
              ? `Configura ${nombreArtista} en el orden recomendado.`
              : `Aprende el flujo de trabajo para gestionar a ${nombreArtista}.`}
          </p>
        </div>

        <button type="button" onClick={goBack}>
          ← Atrás
        </button>
      </div>

      <section className="tutorial-hero">
        <div className="tutorial-hero-copy">
          <span className="tutorial-role-badge">
            {esArtista ? 'Cuenta de Artista' : 'Cuenta de Gestor'}
          </span>

          <h2>
            {esArtista ? (
              <>
                Deja <span style={{ color: 'var(--accent)' }}>Mi</span>Booking
                {' '}listo antes de enviar tu primera cotización.
              </>
            ) : (
              'Sigue estos pasos para cotizar y operar sin mezclar Artistas.'
            )}
          </h2>

          <p>
            Marca cada paso cuando lo completes. El progreso se
            guardará solamente en este navegador y para este Artista.
          </p>
        </div>

        <div className="tutorial-progress-card">
          <div className="tutorial-progress-number">
            {porcentaje}%
          </div>

          <span>
            {completadosValidos.length} de {pasos.length} pasos
          </span>

          <div
            className="tutorial-progress-track"
            aria-label={`Progreso del tutorial: ${porcentaje}%`}
          >
            <div
              className="tutorial-progress-fill"
              style={{ width: `${porcentaje}%` }}
            />
          </div>

          {completadosValidos.length > 0 && (
            <button
              type="button"
              className="tutorial-reset-button"
              onClick={reiniciarProgreso}
            >
              Reiniciar progreso
            </button>
          )}
        </div>
      </section>

      <section className="tutorial-alert">
        <strong>Orden recomendado</strong>

        <p>
          {esArtista
            ? 'Completa primero Perfil, Formatos, Tipos de evento y Tarifas. Sin esos datos, el cálculo y los documentos pueden quedar incompletos.'
            : 'Confirma primero el Artista activo. Los datos y permisos cambian según el workspace seleccionado.'}
        </p>
      </section>

      {grupos.map((grupo) => (
        <section
          className="tutorial-group"
          key={grupo}
        >
          <div className="tutorial-group-heading">
            <span>{grupo}</span>
          </div>

          <div className="tutorial-steps">
            {pasos
              .filter((paso) => paso.grupo === grupo)
              .map((paso) => {
                const completado =
                  completadosValidos.includes(paso.id);

                const numero =
                  pasos.findIndex(
                    (item) => item.id === paso.id
                  ) + 1;

                return (
                  <article
                    className={
                      `tutorial-step-card ` +
                      (completado ? 'completed' : '')
                    }
                    key={paso.id}
                  >
                    <div className="tutorial-step-top">
                      <div className="tutorial-step-number">
                        {completado ? '✓' : numero}
                      </div>

                      <div className="tutorial-step-title">
                        <div>
                          <h3>{paso.titulo}</h3>

                          {paso.obligatorio && (
                            <span>Recomendado antes de operar</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p>{paso.descripcion}</p>

                    <ul>
                      {paso.detalles.map((detalle) => (
                        <li key={detalle}>{detalle}</li>
                      ))}
                    </ul>

                    <div className="tutorial-step-actions">
                      {typeof paso.accion === 'function' && (
                        <button
                          type="button"
                          onClick={paso.accion}
                        >
                          {paso.accionTexto}
                        </button>
                      )}

                      <button
                        type="button"
                        className={
                          `tutorial-complete-button ` +
                          (completado ? 'completed' : '')
                        }
                        onClick={() =>
                          toggleCompletado(paso.id)
                        }
                      >
                        {completado
                          ? 'Marcar pendiente'
                          : 'Marcar completado'}
                      </button>
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      ))}

      <section className="tutorial-final-card">
        <div>
          <span>Flujo habitual después de configurar</span>

          <h2>
            Cotización → Confirmación → Contrato y Rider →
            Cobros → Evento
          </h2>

          <p>
            La configuración permanente pertenece al Artista.
            Cada cotización y documento queda vinculado al
            workspace seleccionado.
          </p>
        </div>

        <button
          type="button"
          onClick={goCotizaciones}
        >
          Ir a Cotizaciones
        </button>
      </section>
    </div>
  );
}
