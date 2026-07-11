import { useEffect, useState } from 'react';
import { getCotizacionById } from '../lib/cotizacionesService';
import './VerCotizacion.css';

export default function VerCotizacion({
  workspaceId,
  cotizacionId,
  goBack,
}) {
  const [cotizacion, setCotizacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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
          err.message || 'No se pudo cargar la cotización.'
        );
      } finally {
        setCargando(false);
      }
    }

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

  function imprimir() {
    window.print();
  }

  if (cargando) {
    return (
      <div className="vc-page">
        Cargando cotización...
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
        Cotización no encontrada.
      </div>
    );
  }

  const cliente = cotizacion.clientes || {};
  const zona = cotizacion.provincias || {};
  const negocio =
    cotizacion.perfil_negocio_snapshot || {};

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

  const subtotalCliente =
    Number(cotizacion.subtotal || 0) +
    Number(cotizacion.comision || 0);

  const presentacionMusical =
    subtotalCliente - sonido;

  const politicas = String(
    cotizacion.politicas_condiciones ||
      negocio.condiciones_pago ||
      ''
  ).trim();

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

        <button type="button" onClick={imprimir}>
          Imprimir / Guardar PDF
        </button>
      </div>

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
            <strong>COTIZACIÓN</strong>
            <span>
              {cotizacion.numero ||
                `#${cotizacion.id}`}
            </span>
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
    </div>
  );
}
