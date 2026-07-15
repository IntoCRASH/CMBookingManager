import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  cancelarCotizacion,
  duplicarCotizacion,
  eliminarCotizacion,
  ensureCotizacionPdf,
  getCotizaciones,
  sendCotizacionByEmail,
} from '../lib/cotizacionesService';
import PdfDocumentModal from '../components/PdfDocumentModal';
import PdfEmailModal from '../components/PdfEmailModal';

export default function Cotizaciones({
  workspaceId,
  goBack,
  nuevaCotizacion,
  abrirCotizacion,
  editarCotizacion,
  abrirPagos,
}) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [estado, setEstado] = useState('');
  const [buscar, setBuscar] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [procesandoPdfId, setProcesandoPdfId] = useState(null);
  const [pdfViewer, setPdfViewer] = useState(null);
  const [emailDocument, setEmailDocument] = useState(null);
  const [enviandoPdf, setEnviandoPdf] = useState(false);

  useEffect(() => {
    cargar();
  }, [workspaceId]);

  useEffect(() => {
    function cerrarMenu() {
      setMenuAbierto(null);
    }

    function cerrarConEscape(event) {
      if (event.key === 'Escape') {
        setMenuAbierto(null);
      }
    }

    document.addEventListener('click', cerrarMenu);
    document.addEventListener('keydown', cerrarConEscape);

    return () => {
      document.removeEventListener('click', cerrarMenu);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, []);

  async function cargar() {
    try {
      setCargando(true);

      const data = await getCotizaciones({
        workspaceId,
      });

      setCotizaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || 'No se pudieron cargar las cotizaciones.'
      );
    } finally {
      setCargando(false);
    }
  }

  const filtradas = useMemo(() => {
    const textoBusqueda = buscar.trim().toLowerCase();

    return cotizaciones.filter((cotizacion) => {
      const texto = [
        cotizacion.numero,
        cotizacion.ncf,
        cotizacion.documento_tipo,
        cotizacion.clientes?.nombre,
        cotizacion.nombre_evento,
        cotizacion.tipo_evento,
        cotizacion.venue,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const cumpleTexto =
        !textoBusqueda || texto.includes(textoBusqueda);
      const cumpleEstado =
        !estado || cotizacion.estado === estado;

      return cumpleTexto && cumpleEstado;
    });
  }, [cotizaciones, buscar, estado]);

  function money(valor) {
    return `RD$ ${Number(valor || 0).toLocaleString('es-DO')}`;
  }

  function fechaCorta(fecha) {
    if (!fecha) return '--';

    return new Date(`${fecha}T00:00:00`).toLocaleDateString(
      'es-DO',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );
  }

  function claseEstado(valor) {
    return String(valor || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }

  function etiquetaEstado(valor) {
    const estadoNormalizado = String(valor || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (
      ['pendiente', 'pendiente de aprobacion', 'pendiente de cobro'].includes(
        estadoNormalizado
      )
    ) {
      return 'Pendiente';
    }

    return valor || 'Sin estado';
  }

  async function duplicar(id) {
    if (!window.confirm('¿Duplicar esta cotización?')) return;

    try {
      setMenuAbierto(null);
      await duplicarCotizacion(id, workspaceId);
      toast.success('Cotización duplicada correctamente.');
      await cargar();
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || 'No se pudo duplicar la cotización.'
      );
    }
  }

  async function eliminar(id) {
    if (
      !window.confirm(
        '¿Eliminar definitivamente esta cotización? También se eliminarán sus contratos, riders, pagos y PDF relacionados. Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }

    try {
      await eliminarCotizacion(id, workspaceId);

      setMenuAbierto(null);
      toast.success('Cotización eliminada correctamente.');
      await cargar();
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || 'No se pudo eliminar la cotización.'
      );
    }
  }

  async function cancelar(id) {
    if (!window.confirm('¿Cancelar esta cotización?')) return;

    try {
      setMenuAbierto(null);
      await cancelarCotizacion(id, workspaceId);
      toast.success('Cotización cancelada correctamente.');
      await cargar();
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || 'No se pudo cancelar la cotización.'
      );
    }
  }

  function documentTitle(cotizacion) {
    const type =
      cotizacion.documento_tipo === 'factura'
        ? 'Factura'
        : 'Cotización';

    return `${type} ${cotizacion.numero || `#${cotizacion.id}`}`;
  }

  function updateStoredQuote(updated) {
    setCotizaciones((current) =>
      current.map((item) =>
        item.id === updated.id
          ? { ...item, ...updated }
          : item
      )
    );
  }

  async function preparePdf(cotizacion, autoPrint = false) {
    try {
      setMenuAbierto(null);
      setProcesandoPdfId(cotizacion.id);

      const result = await ensureCotizacionPdf(
        cotizacion.id,
        workspaceId
      );

      updateStoredQuote(result.cotizacion);
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
      setProcesandoPdfId(null);
    }
  }

  function prepareEmail(cotizacion) {
    const isInvoice = cotizacion.documento_tipo === 'factura';
    const clientName = cotizacion.clientes?.nombre || '';
    const artistName =
      cotizacion.artista_nombre_snapshot ||
      cotizacion.perfil_negocio_snapshot?.nombre_artistico ||
      'MiBooking';
    const label = isInvoice ? 'factura' : 'cotización';

    setMenuAbierto(null);
    setEmailDocument({
      cotizacion,
      title: `Enviar ${documentTitle(cotizacion)}`,
      recipient: cotizacion.clientes?.email || '',
      subject: `${documentTitle(cotizacion)} - ${artistName}`,
      message:
        `Hola ${clientName},

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
    const cotizacion = emailDocument?.cotizacion;
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
      toast.success(
        `${documentTitle(cotizacion)} enviada por correo.`
      );
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || 'No se pudo enviar el PDF por correo.'
      );
    } finally {
      setEnviandoPdf(false);
    }
  }

  return (
    <div className="dashboard cotizaciones-page">
      <div className="top-bar">
        <div>
          <h1>Cotizaciones</h1>
          <p>
            {filtradas.length} registro
            {filtradas.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="top-bar-actions">
          <button
            type="button"
            className="primary-button"
            onClick={nuevaCotizacion}
          >
            + Nueva cotización
          </button>

          <button type="button" onClick={goBack}>
            ← Atrás
          </button>
        </div>
      </div>

      <div className="cotizaciones-filtros">
        <input
          type="search"
          placeholder="Buscar por número, cliente, evento o venue..."
          value={buscar}
          onChange={(event) => setBuscar(event.target.value)}
        />

        <select
          value={estado}
          onChange={(event) => setEstado(event.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Pendiente de aprobación">
            Pendiente de aprobación
          </option>
          <option value="Pendiente de cobro">
            Pendiente de cobro
          </option>
          <option value="Confirmada">Confirmada</option>
          <option value="Aprobada">Aprobada</option>
          <option value="Realizada">Realizada</option>
          <option value="Cancelada">Cancelada</option>
        </select>
      </div>

      <div className="cotizaciones-table">
        <div
          className="cotizaciones-table-header"
          aria-hidden="true"
        >
          <span>Número</span>
          <span>Cliente / Evento</span>
          <span>Fecha</span>
          <span>Total</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>

        {cargando ? (
          <div className="cotizaciones-empty">
            Cargando cotizaciones...
          </div>
        ) : filtradas.length === 0 ? (
          <div className="cotizaciones-empty">
            No se encontraron cotizaciones.
          </div>
        ) : (
          filtradas.map((cotizacion) => (
            <article
              className={`cotizacion-row ${
                menuAbierto === cotizacion.id
                  ? 'menu-activo'
                  : ''
              }`}
              key={cotizacion.id}
            >
              <div
                className="cotizacion-numero"
                data-label="Número"
              >
                {cotizacion.numero || `#${cotizacion.id}`}
                <small
                  className={`cotizacion-documento-tipo ${
                    cotizacion.documento_tipo === 'factura'
                      ? 'es-factura'
                      : 'es-cotizacion'
                  }`}
                >
                  {cotizacion.documento_tipo === 'factura'
                    ? 'Factura'
                    : 'Cotización'}
                </small>
              </div>

              <div
                className="cotizacion-cliente"
                data-label="Cliente / Evento"
              >
                <strong>
                  {cotizacion.clientes?.nombre ||
                    'Cliente sin nombre'}
                </strong>
                <span>
                  {cotizacion.nombre_evento ||
                    cotizacion.tipo_evento ||
                    'Evento sin nombre'}
                </span>
                {cotizacion.venue && (
                  <small>{cotizacion.venue}</small>
                )}
              </div>

              <div
                className="cotizacion-fecha"
                data-label="Fecha"
              >
                {fechaCorta(cotizacion.fecha_evento)}
              </div>

              <div
                className="cotizacion-total"
                data-label="Total"
              >
                {money(cotizacion.total)}
              </div>

              <div data-label="Estado">
                <span
                  className={`cotizacion-estado estado-${claseEstado(
                    cotizacion.estado
                  )}`}
                >
                  {etiquetaEstado(cotizacion.estado)}
                </span>
              </div>

              <div
                className="cotizacion-acciones"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="cotizacion-pdf-actions">
                  <button
                    type="button"
                    onClick={() => preparePdf(cotizacion, false)}
                    disabled={procesandoPdfId === cotizacion.id}
                  >
                    {procesandoPdfId === cotizacion.id
                      ? 'Preparando...'
                      : 'Ver'}
                  </button>

                  <button
                    type="button"
                    onClick={() => preparePdf(cotizacion, true)}
                    disabled={procesandoPdfId === cotizacion.id}
                  >
                    Imprimir
                  </button>

                  <button
                    type="button"
                    onClick={() => prepareEmail(cotizacion)}
                  >
                    Enviar
                  </button>
                </div>

                <button
                  type="button"
                  className="cotizacion-menu-button"
                  aria-label="Abrir acciones"
                  onClick={() =>
                    setMenuAbierto(
                      menuAbierto === cotizacion.id
                        ? null
                        : cotizacion.id
                    )
                  }
                >
                  ⋮
                </button>

                {menuAbierto === cotizacion.id && (
                  <div className="menu-popup cotizaciones-menu-popup">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuAbierto(null);
                        abrirCotizacion(cotizacion.id);
                      }}
                    >
                      ⚙ Administrar{' '}
                      {cotizacion.documento_tipo === 'factura'
                        ? 'factura'
                        : 'cotización'}
                    </button>

                    {cotizacion.documento_tipo !== 'factura' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuAbierto(null);
                          editarCotizacion(cotizacion.id);
                        }}
                      >
                        ✏ Editar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setMenuAbierto(null);
                        abrirPagos(cotizacion.id);
                      }}
                    >
                      💰 Pagos
                    </button>

                    <button
                      type="button"
                      onClick={() => duplicar(cotizacion.id)}
                    >
                      📋{' '}
                      {cotizacion.documento_tipo === 'factura'
                        ? 'Duplicar como cotización'
                        : 'Duplicar'}
                    </button>

                    {cotizacion.documento_tipo !== 'factura' && (
                      <>
                        <button
                          type="button"
                          onClick={() => cancelar(cotizacion.id)}
                        >
                          ❌ Cancelar
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() => eliminar(cotizacion.id)}
                        >
                          🗑 Eliminar
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))
        )}
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
