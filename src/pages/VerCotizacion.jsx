import { Fragment, useEffect, useState } from 'react';
import { APP_CONFIG } from '../lib/config';
import { getCotizacionById } from '../lib/cotizacionesService';
import {
  DEFAULT_BUSINESS_POLICIES_TEMPLATE,
  getBusinessAssetUrl,
  renderBusinessPolicies,
} from '../lib/profileService';
import './VerCotizacion.css';

function normalizeSnapshot(value) {
  if (!value) return {};

  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function renderInlineText(text) {
  return String(text || '')
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      const isStrong = part.startsWith('**') && part.endsWith('**');

      if (isStrong) {
        return (
          <strong key={`${part}-${index}`}>
            {part.slice(2, -2)}
          </strong>
        );
      }

      return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
    });
}

function renderPolicyParagraph(paragraph, paragraphIndex) {
  const lines = String(paragraph || '').split('\n');

  return (
    <p
      className="disclaimer-paragraph"
      key={`policy-${paragraphIndex}`}
    >
      {lines.map((line, lineIndex) => (
        <Fragment key={`policy-${paragraphIndex}-${lineIndex}`}>
          {renderInlineText(line)}
          {lineIndex < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </p>
  );
}

export default function VerCotizacion({ cotizacionId, goBack }) {
  const [cotizacion, setCotizacion] = useState(null);
  const [firmaUrl, setFirmaUrl] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function cargarCotizacion() {
      try {
        setCargando(true);
        setError('');
        setFirmaUrl('');

        const data = await getCotizacionById(cotizacionId);
        const snapshot = normalizeSnapshot(
          data?.perfil_negocio_snapshot
        );

        const signedFirmaUrl = snapshot.firma_path
          ? await getBusinessAssetUrl(snapshot.firma_path)
          : '';

        if (!active) return;

        setCotizacion(data);
        setFirmaUrl(signedFirmaUrl);
      } catch (err) {
        console.error(err);

        if (active) {
          setError(
            err.message || 'No se pudo cargar la cotización.'
          );
        }
      } finally {
        if (active) {
          setCargando(false);
        }
      }
    }

    if (cotizacionId) {
      cargarCotizacion();
    }

    return () => {
      active = false;
    };
  }, [cotizacionId]);

  function money(valor) {
    return `RD$ ${Number(valor || 0).toLocaleString('es-DO')}`;
  }

  function fechaLarga(fecha) {
    if (!fecha) return 'N/A';

    return new Date(`${fecha}T00:00:00`).toLocaleDateString(
      'es-DO',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }
    );
  }

  function imprimir() {
    window.print();
  }

  if (cargando) {
    return <div className="vc-page">Cargando cotización...</div>;
  }

  if (error) {
    return <div className="vc-page error">{error}</div>;
  }

  if (!cotizacion) {
    return <div className="vc-page">Cotización no encontrada.</div>;
  }

  const cliente = cotizacion.clientes || {};
  const provincia = cotizacion.provincias || {};
  const venue = cotizacion.venue || 'lugar del evento';
  const snapshot = normalizeSnapshot(
    cotizacion.perfil_negocio_snapshot
  );

  const sonido = Number(cotizacion.sonido || 0);
  const descuentoPorcentaje = Number(cotizacion.descuento || 0);
  const montoDescuento = Number(cotizacion.monto_descuento || 0);

  const subtotalCliente =
    Number(cotizacion.subtotal || 0) +
    Number(cotizacion.comision || 0);

  const presentacionMusical = subtotalCliente - sonido;

  const politicas =
    cotizacion.politicas_condiciones ||
    renderBusinessPolicies(
      snapshot.condiciones_pago ||
        DEFAULT_BUSINESS_POLICIES_TEMPLATE,
      snapshot
    );

  const nombreFirmante =
    snapshot.nombre_completo || 'Representante autorizado';

  const artistaSnapshot = normalizeSnapshot(
    cotizacion.artista_snapshot
  );

  const artista =
    cotizacion.artista_nombre_snapshot ||
    artistaSnapshot.nombre ||
    APP_CONFIG.artista ||
    'Artista';

  return (
    <div className="vc-page">
      <div className="vc-actions no-print">
        <button type="button" onClick={goBack}>
          ← Atrás
        </button>

        <button type="button" onClick={imprimir}>
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className="vc-document">
        <header className="vc-header">
          <div>
            <h1>{String(artista).toUpperCase()} BOOKING</h1>
            <p>Departamento de contratación artística</p>
          </div>

          <div className="vc-box">
            <strong>COTIZACIÓN</strong>
            <span>{cotizacion.numero || `#${cotizacion.id}`}</span>
          </div>
        </header>

        <section className="vc-info-grid">
          <div>
            <h3>DATOS DEL CLIENTE</h3>
            <p>
              <strong>Nombre:</strong> {cliente.nombre || 'N/A'}
            </p>
            <p>
              <strong>Empresa:</strong> {cliente.empresa || 'N/A'}
            </p>
            <p>
              <strong>Teléfono:</strong> {cliente.telefono || 'N/A'}
            </p>
            <p>
              <strong>Email:</strong> {cliente.email || 'N/A'}
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
                <strong>Evento:</strong> {cotizacion.nombre_evento}
              </p>
            )}

            <p>
              <strong>Venue:</strong> {venue}
            </p>
            <p>
              <strong>Zona:</strong> {provincia.nombre || 'N/A'}
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
                Presentación musical de <strong>{artista}</strong>

                {cotizacion.nombre_evento && (
                  <>
                    <br />
                    Evento:{' '}
                    <strong>{cotizacion.nombre_evento}</strong>
                  </>
                )}

                <br />
                Lugar: <strong>{venue}</strong>
                <br />
                Zona: <strong>{provincia.nombre || 'N/A'}</strong>
                <br />
                Fecha:{' '}
                <strong>
                  {fechaLarga(cotizacion.fecha_evento)}
                </strong>
              </td>

              <td className="right">
                {money(presentacionMusical)}
              </td>
            </tr>

            {cotizacion.incluye_sonido && sonido > 0 && (
              <tr>
                <td>Equipos de Sonido y personal técnico.</td>
                <td className="right">{money(sonido)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <section className="vc-totales cliente">
          <div>
            <span>Subtotal</span>
            <strong>{money(subtotalCliente)}</strong>
          </div>

          {descuentoPorcentaje > 0 && (
            <div>
              <span>Descuento {descuentoPorcentaje}%</span>
              <strong>- {money(montoDescuento)}</strong>
            </div>
          )}

          <div className="vc-total-final">
            <span>Total</span>
            <strong>{money(cotizacion.total)}</strong>
          </div>
        </section>

        <section className="vc-firma">
          <div className="vc-firma-bloque">
            {firmaUrl && (
              <img
                src={firmaUrl}
                alt={`Firma de ${nombreFirmante}`}
                className="vc-firma-imagen"
              />
            )}

            <div className="vc-firma-linea" />

            <strong>{nombreFirmante}</strong>
            <span>{artista}</span>
            <small>Artista / Representante autorizado</small>
          </div>
        </section>

        <section className="vc-notas">
          <h3>POLÍTICAS Y CONDICIONES</h3>

          <div className="disclaimer">
            {String(politicas)
              .split(/\n\s*\n/)
              .filter((paragraph) => paragraph.trim())
              .map(renderPolicyParagraph)}
          </div>
        </section>

        <footer className="vc-footer">
          <p>{artista} Booking Department</p>
        </footer>
      </div>
    </div>
  );
}
