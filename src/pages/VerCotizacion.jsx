import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  convertirCotizacionEnFactura,
  ensureCotizacionPdf,
  getCotizacionById,
  sendCotizacionByEmail,
} from '../lib/cotizacionesService';
import PdfDocumentModal from '../components/PdfDocumentModal';
import {
  renderBusinessPolicies,
  renderBusinessPolicyTemplate,
} from '../lib/profileService';
import PdfEmailModal from '../components/PdfEmailModal';
import './VerCotizacion.css';

const ESTADOS_APROBADOS = ['Confirmada', 'Aprobada'];

function normalizarNcf(value) {
  return String(value || '').trim().toUpperCase();
}

function ncfEsValido(value) {
  return /^(B\d{10}|E\d{12})$/.test(
    normalizarNcf(value)
  );
}

export default function VerCotizacion({
  workspaceId,
  cotizacionId,
  goBack,
}) {
  const [cotizacion, setCotizacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mostrarFacturacion, setMostrarFacturacion] =
    useState(false);
  const [incluyeNcfFactura, setIncluyeNcfFactura] =
    useState(false);
  const [ncfFactura, setNcfFactura] = useState('');
  const [convirtiendo, setConvirtiendo] = useState(false);
  const [procesandoPdf, setProcesandoPdf] = useState(false);
  const [pdfViewer, setPdfViewer] = useState(null);
  const [emailDocument, setEmailDocument] = useState(null);
  const [enviandoPdf, setEnviandoPdf] = useState(false);

  async function cargarCotizacion() {
    try {
      setCargando(true);
      setError('');

      const data = await getCotizacionById(
        cotizacionId,
        workspaceId
      );

      setCotizacion(data);
    } catch (err) {
      console.error(err);
      setError(
        err.message || 'No se pudo cargar el documento.'
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (cotizacionId) {
      cargarCotizacion();
    }
  }, [cotizacionId, workspaceId]);

  function money(valor) {
    return `RD$ ${Number(valor || 0).toLocaleString(
      'es-DO'
    )}`;
  }

  function fechaLarga(fecha) {
    if (!fecha) return 'N/A';

    return new Date(
      `${fecha}T00:00:00`
    ).toLocaleDateString('es-DO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  function fechaHora(fecha) {
    if (!fecha) return '';

    return new Date(fecha).toLocaleString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function documentTitle(item = cotizacion) {
    const type = item?.documento_tipo === 'factura'
      ? 'Factura'
      : 'Cotización';

    return `${type} ${item?.numero || `#${item?.id || ''}`}`;
  }

  async function preparePdf(autoPrint = false, force = false) {
    if (!cotizacion) return;

    try {
      setProcesandoPdf(true);

      const result = await ensureCotizacionPdf(
        cotizacion.id,
        workspaceId,
        { force }
      );

      setCotizacion(result.cotizacion);
      setPdfViewer({
        title: documentTitle(result.cotizacion),
        url: result.url,
        autoPrint,
      });
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || 'No se pudo preparar el PDF guardado.'
      );
    } finally {
      setProcesandoPdf(false);
    }
  }

  function prepareEmail() {
    if (!cotizacion) return;

    const client = cotizacion.clientes || {};
    const business = cotizacion.perfil_negocio_snapshot || {};
    const artistName =
      cotizacion.artista_nombre_snapshot ||
      business.nombre_artistico ||
      'MiBooking';
    const label = cotizacion.documento_tipo === 'factura'
      ? 'factura'
      : 'cotización';

    setEmailDocument({
      title: `Enviar ${documentTitle()}`,
      recipient: client.email || '',
      subject: `${documentTitle()} - ${artistName}`,
      message:
        `Hola ${client.nombre || ''},

` +
        `Adjuntamos la ${label} correspondiente a ` +
        `${cotizacion.nombre_evento || cotizacion.tipo_evento || 'su evento'}.

` +
        `Quedamos atentos a cualquier comentario.

` +
        `Atentamente,
${artistName}`,
    });
  }

  async function sendPdfEmail(form) {
    if (!cotizacion) return;

    try {
      setEnviandoPdf(true);

      await sendCotizacionByEmail({
        cotizacionId: cotizacion.id,
        workspaceId,
        recipient: form.recipient,
        subject: form.subject,
        message: form.message,
      });

      setEmailDocument(null);
      toast.success(`${documentTitle()} enviada por correo.`);
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || 'No se pudo enviar el PDF por correo.'
      );
    } finally {
      setEnviandoPdf(false);
    }
  }

  async function emitirFactura() {
    if (!cotizacion) return;

    if (
      incluyeNcfFactura &&
      !ncfEsValido(ncfFactura)
    ) {
      toast.error(
        'Escribe un NCF válido: B + 10 dígitos o E + 12 dígitos.'
      );
      return;
    }

    const confirmada = window.confirm(
      incluyeNcfFactura
        ? '¿Convertir esta cotización en factura y asignar el NCF indicado?'
        : '¿Convertir esta cotización en factura sin NCF?'
    );

    if (!confirmada) return;

    try {
      setConvirtiendo(true);

      const actualizada =
        await convertirCotizacionEnFactura({
          id: cotizacion.id,
          workspaceId,
          incluyeNcf: incluyeNcfFactura,
          ncf: ncfFactura,
        });

      const pdfResult = await ensureCotizacionPdf(
        actualizada.id,
        workspaceId,
        { force: true }
      );

      setCotizacion(pdfResult.cotizacion);
      setMostrarFacturacion(false);
      setIncluyeNcfFactura(false);
      setNcfFactura('');
      toast.success('Factura emitida y PDF guardado correctamente.');
    } catch (err) {
      console.error(err);
      toast.error(
        err.message ||
          'No se pudo convertir la cotización en factura.'
      );
    } finally {
      setConvirtiendo(false);
    }
  }

  if (cargando) {
    return (
      <div className="vc-page">
        Cargando documento...
      </div>
    );
  }

  if (error) {
    return (
      <div className="vc-page error">
        {error}
      </div>
    );
  }

  if (!cotizacion) {
    return (
      <div className="vc-page">
        Documento no encontrado.
      </div>
    );
  }

  const cliente = cotizacion.clientes || {};
  const zona = cotizacion.provincias || {};
  const negocio =
    cotizacion.perfil_negocio_snapshot || {};

  const esFactura =
    cotizacion.documento_tipo === 'factura';
  const estadoAprobado = ESTADOS_APROBADOS.includes(
    cotizacion.estado
  );
  const puedeConvertir =
    !esFactura && estadoAprobado;

  const nombreArtista =
    cotizacion.artista_nombre_snapshot ||
    cotizacion.artista_snapshot?.nombre ||
    negocio.nombre_artistico ||
    negocio.nombre_completo ||
    'Artista';

  const nombreLegal =
    negocio.nombre_completo || nombreArtista;

  const venue =
    cotizacion.venue || 'lugar del evento';

  const sonido = Number(cotizacion.sonido || 0);
  const descuentoPorcentaje = Number(
    cotizacion.descuento || 0
  );
  const montoDescuento = Number(
    cotizacion.monto_descuento || 0
  );
  const incluyeImpuesto = Boolean(
    cotizacion.incluye_impuesto &&
      Number(cotizacion.impuesto_monto || 0) > 0
  );
  const impuestoPorcentaje = Number(
    cotizacion.impuesto_porcentaje || 0
  );
  const impuestoMonto = Number(
    cotizacion.impuesto_monto || 0
  );
  const ncf =
    esFactura && cotizacion.incluye_ncf
      ? String(cotizacion.ncf || '').trim()
      : '';

  const subtotalCliente =
    Number(cotizacion.subtotal || 0) +
    Number(cotizacion.manager_artistico_monto || 0) +
    Number(cotizacion.comision || 0);

  const presentacionMusical =
    subtotalCliente - sonido;

  const politicasGuardadas = String(
    cotizacion.politicas_condiciones || ''
  ).trim();

  const politicas = politicasGuardadas
    ? renderBusinessPolicyTemplate(
        politicasGuardadas,
        negocio
      )
    : renderBusinessPolicies(
        negocio.condiciones_pago,
        negocio
      );

  const firmaUrl =
    negocio.firma_url ||
    (nombreArtista.toLowerCase() === 'cruzmonty'
      ? '/firma-cruzmonty.png'
      : '');

  const logoUrl = negocio.logo_url || '';

  return (
    <div className="vc-page">
      <div className="vc-actions no-print">
        <button type="button" onClick={goBack}>
          ← Atrás
        </button>

        {puedeConvertir && (
          <button
            type="button"
            className="vc-invoice-button"
            onClick={() =>
              setMostrarFacturacion((actual) => !actual)
            }
          >
            Convertir en factura
          </button>
        )}

        <button
          type="button"
          onClick={() => preparePdf(false)}
          disabled={procesandoPdf}
        >
          {procesandoPdf ? 'Preparando...' : 'Ver PDF'}
        </button>

        <button
          type="button"
          onClick={() => preparePdf(true)}
          disabled={procesandoPdf}
        >
          Imprimir
        </button>

        <button type="button" onClick={prepareEmail}>
          Enviar por correo
        </button>
      </div>

      {mostrarFacturacion && puedeConvertir && (
        <section className="vc-convert-panel no-print">
          <div>
            <h2>Emitir factura</h2>
            <p>
              Se conservarán el cliente, los conceptos, el impuesto y el
              total aprobados. El documento pasará a mostrarse como factura.
            </p>
          </div>

          <label className="vc-ncf-check">
            <input
              type="checkbox"
              checked={incluyeNcfFactura}
              onChange={(event) => {
                setIncluyeNcfFactura(event.target.checked);

                if (!event.target.checked) {
                  setNcfFactura('');
                }
              }}
            />
            Incluir NCF en la factura
          </label>

          {incluyeNcfFactura && (
            <div className="vc-ncf-field">
              <label htmlFor="vc-factura-ncf">
                NCF / e-NCF autorizado
              </label>
              <input
                id="vc-factura-ncf"
                type="text"
                value={ncfFactura}
                maxLength="13"
                placeholder="B0100000001"
                autoComplete="off"
                onChange={(event) =>
                  setNcfFactura(
                    event.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, '')
                      .slice(0, 13)
                  )
                }
              />
              <small>
                Utiliza exclusivamente una secuencia autorizada por la DGII.
              </small>
            </div>
          )}

          <div className="vc-convert-actions">
            <button
              type="button"
              onClick={() => setMostrarFacturacion(false)}
              disabled={convirtiendo}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="vc-invoice-button"
              onClick={emitirFactura}
              disabled={convirtiendo}
            >
              {convirtiendo
                ? 'Emitiendo...'
                : 'Emitir factura'}
            </button>
          </div>
        </section>
      )}

      {!esFactura && !estadoAprobado && (
        <p className="vc-convert-hint no-print">
          La opción de convertir en factura estará disponible cuando la
          cotización esté Confirmada o Aprobada.
        </p>
      )}

      <div className="vc-document">
        <header className="vc-header">
          <div>
            {logoUrl && (
              <img
                src={logoUrl}
                alt={`Logo de ${nombreArtista}`}
                className="vc-logo-negocio"
                style={{
                  display: 'block',
                  maxWidth: 220,
                  maxHeight: 82,
                  marginBottom: 12,
                  objectFit: 'contain',
                  objectPosition: 'left center',
                }}
              />
            )}

            <h1>
              {nombreArtista.toUpperCase()} BOOKING
            </h1>

            <p>
              Departamento de contratación artística
            </p>
          </div>

          <div className="vc-box">
            <strong>
              {esFactura ? 'FACTURA' : 'COTIZACIÓN'}
            </strong>
            <span>
              {cotizacion.numero ||
                `#${cotizacion.id}`}
            </span>

            {esFactura && (
              <small>
                Cotización de origen
              </small>
            )}

            {ncf && <small>NCF: {ncf}</small>}

            {esFactura && cotizacion.factura_emitida_at && (
              <small>
                Emitida: {fechaHora(cotizacion.factura_emitida_at)}
              </small>
            )}
          </div>
        </header>

        <section className="vc-info-grid">
          <div>
            <h3>DATOS DEL CLIENTE</h3>
            <p>
              <strong>Nombre:</strong>{' '}
              {cliente.nombre || 'N/A'}
            </p>
            <p>
              <strong>Empresa:</strong>{' '}
              {cliente.empresa || 'N/A'}
            </p>
            <p>
              <strong>Teléfono:</strong>{' '}
              {cliente.telefono || 'N/A'}
            </p>
            <p>
              <strong>Email:</strong>{' '}
              {cliente.email || 'N/A'}
            </p>
          </div>

          <div>
            <h3>DATOS DEL EVENTO</h3>
            <p>
              <strong>Fecha:</strong>{' '}
              {fechaLarga(cotizacion.fecha_evento)}
            </p>

            {cotizacion.nombre_evento && (
              <p>
                <strong>Evento:</strong>{' '}
                {cotizacion.nombre_evento}
              </p>
            )}

            <p>
              <strong>Venue:</strong> {venue}
            </p>
            <p>
              <strong>Zona:</strong>{' '}
              {zona.nombre ||
                cotizacion.zona_nombre_snapshot ||
                'N/A'}
            </p>
            <p>
              <strong>Sonido:</strong>{' '}
              {cotizacion.incluye_sonido
                ? 'Incluido'
                : 'No incluido'}
            </p>
          </div>
        </section>

        <table className="vc-table">
          <thead>
            <tr>
              <th>Descripción</th>
              <th className="right">Monto</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>
                Presentación musical de{' '}
                <strong>{nombreArtista}</strong>

                {cotizacion.nombre_evento && (
                  <>
                    <br />
                    Evento:{' '}
                    <strong>
                      {cotizacion.nombre_evento}
                    </strong>
                  </>
                )}

                <br />

                Lugar: <strong>{venue}</strong>

                <br />

                Zona:{' '}
                <strong>
                  {zona.nombre ||
                    cotizacion.zona_nombre_snapshot ||
                    'N/A'}
                </strong>

                <br />

                Fecha:{' '}
                <strong>
                  {fechaLarga(
                    cotizacion.fecha_evento
                  )}
                </strong>
              </td>

              <td className="right">
                {money(presentacionMusical)}
              </td>
            </tr>

            {cotizacion.incluye_sonido &&
              sonido > 0 && (
                <tr>
                  <td>
                    Equipos de sonido y personal
                    técnico.
                  </td>
                  <td className="right">
                    {money(sonido)}
                  </td>
                </tr>
              )}
          </tbody>
        </table>

        <section className="vc-totales cliente">
          <div>
            <span>Subtotal</span>
            <strong>
              {money(subtotalCliente)}
            </strong>
          </div>

          {descuentoPorcentaje > 0 && (
            <div>
              <span>
                Descuento {descuentoPorcentaje}%
              </span>
              <strong>
                - {money(montoDescuento)}
              </strong>
            </div>
          )}

          {incluyeImpuesto && (
            <div>
              <span>
                Impuesto {impuestoPorcentaje}%
              </span>
              <strong>
                {money(impuestoMonto)}
              </strong>
            </div>
          )}

          <div className="vc-total-final">
            <span>Total</span>
            <strong>
              {money(cotizacion.total)}
            </strong>
          </div>
        </section>

        <section className="vc-firma">
          <div className="vc-firma-bloque">
            {firmaUrl && (
              <img
                src={firmaUrl}
                alt={`Firma de ${nombreLegal}`}
                className="vc-firma-imagen"
              />
            )}

            <div className="vc-firma-linea" />

            <strong>{nombreLegal}</strong>
            <span>{nombreArtista}</span>
            <small>
              Artista / Representante autorizado
            </small>
          </div>
        </section>

        <section className="vc-notas">
          <h3>POLÍTICAS Y CONDICIONES</h3>

          {politicas ? (
            <p
              className="disclaimer"
              style={{ whiteSpace: 'pre-line' }}
            >
              {politicas}
            </p>
          ) : (
            <p className="disclaimer">
              Las condiciones de pago, reserva,
              presentación y cancelación serán las
              acordadas entre el Artista y el cliente.
            </p>
          )}
        </section>

        <footer className="vc-footer">
          <p>
            {nombreArtista} Booking Department
          </p>
        </footer>
      </div>

      <PdfDocumentModal
        document={pdfViewer}
        onClose={() => setPdfViewer(null)}
      />

      <PdfEmailModal
        document={emailDocument}
        sending={enviandoPdf}
        onClose={() => setEmailDocument(null)}
        onSend={sendPdfEmail}
      />
    </div>
  );
}
