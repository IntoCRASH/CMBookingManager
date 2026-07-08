import { useEffect, useState } from 'react';
import { getCotizacionById } from '../lib/cotizacionesService';
import './VerCotizacion.css';

export default function VerCotizacion({ cotizacionId, goHome, nuevaCotizacion }) {
  const [cotizacion, setCotizacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargarCotizacion() {
      try {
        setCargando(true);
        setError('');
        const data = await getCotizacionById(cotizacionId);
        setCotizacion(data);
      } catch (err) {
        console.error(err);
        setError(err.message || 'No se pudo cargar la cotización.');
      } finally {
        setCargando(false);
      }
    }

    if (cotizacionId) cargarCotizacion();
  }, [cotizacionId]);

  function money(valor) {
    return `RD$ ${Number(valor || 0).toLocaleString('es-DO')}`;
  }
function fechaLarga(fecha) {
  if (!fecha) return 'N/A';

  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-DO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
  function imprimir() {
    window.print();
  }

  if (cargando) return <div className="vc-page">Cargando cotización...</div>;
  if (error) return <div className="vc-page error">{error}</div>;
  if (!cotizacion) return <div className="vc-page">Cotización no encontrada.</div>;

  const cliente = cotizacion.clientes || {};
  const provincia = cotizacion.provincias || {};
  const venue = cotizacion.venue || 'lugar del evento';

  const sonido = Number(cotizacion.sonido || 0);
  const descuentoPorcentaje = Number(cotizacion.descuento || 0);
  const montoDescuento = Number(cotizacion.monto_descuento || 0);

  const subtotalCliente =
    Number(cotizacion.subtotal || 0) + Number(cotizacion.comision || 0);

  const presentacionMusical = subtotalCliente - sonido;

  return (
    <div className="vc-page">
      <div className="vc-actions no-print">
        <button onClick={goHome}>← Dashboard</button>
        <button onClick={nuevaCotizacion}>Nueva cotización</button>
        <button onClick={imprimir}>Imprimir / Guardar PDF</button>
      </div>

      <div className="vc-document">
        <header className="vc-header">
          <div>
            <h1>CRUZMONTY BOOKING</h1>
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
            <p><strong>Nombre:</strong> {cliente.nombre || 'N/A'}</p>
            <p><strong>Empresa:</strong> {cliente.empresa || 'N/A'}</p>
            <p><strong>Teléfono:</strong> {cliente.telefono || 'N/A'}</p>
            <p><strong>Email:</strong> {cliente.email || 'N/A'}</p>
          </div>

          <div>
            <h3>DATOS DEL EVENTO</h3>
            <p><strong>Fecha:</strong> {fechaLarga(cotizacion.fecha_evento)}</p>
            {cotizacion.nombre_evento && (
  <p>
    <strong>Evento:</strong> {cotizacion.nombre_evento}
  </p>
)}
            <p><strong>Venue:</strong> {venue}</p>
            <p><strong>Provincia:</strong> {provincia.nombre || 'N/A'}</p>
            <p><strong>Sonido:</strong> {cotizacion.incluye_sonido ? 'Incluido' : 'No incluido'}</p>
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
Presentación musical de <strong>Cruzmonty</strong>

{cotizacion.nombre_evento && (
  <>
    <br />
    Evento: <strong>{cotizacion.nombre_evento}</strong>
  </>
)}

<br />

Lugar: <strong>{venue}</strong>

<br />

Provincia: <strong>{provincia.nombre || 'N/A'}</strong>

<br />

Fecha: <strong>{fechaLarga(cotizacion.fecha_evento)}</strong>
              </td>
              <td className="right">{money(presentacionMusical)}</td>
            </tr>

            {cotizacion.incluye_sonido && sonido > 0 && (
              <tr>
                <td>
                  Equipos de Sonido y personal técnico.
                </td>
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

        <section className="vc-notas">
          <h3>POLÍTICAS Y CONDICIONES</h3>

          <p className="disclaimer">
            El uso de nuestros proveedores de sonido es altamente recomendado, pero no obligatorio.
            <br /><br />

            Tenga en cuenta que, de no optar por nuestra recomendación de proveedor de sonido,
            se proveerá un Rider Técnico con requerimientos esenciales muy específicos.
            <br /><br />

            Nuestra presentación tiene una duración de <strong>una hora y treinta minutos (1:30)</strong>,
            de forma continua o dividida en dos (2) sets de cuarenta y cinco (45) minutos cada uno.
            Debe especificar su preferencia.
            <br /><br />

            Para separar la fecha es imprescindible realizar un adelanto del
            <strong> 50% del monto acordado</strong> a la cuenta
            <strong> 829457379</strong> del Banco Popular, a nombre de
            <strong> PEDRO CRUZ MONTESINO</strong>, Cédula
            <strong> 031-0387551-8</strong>, con su nombre adjunto y fecha del evento como concepto.
            <br /><br />

            El 50% restante se requiere <strong>EN EFECTIVO antes de iniciar la actividad.</strong>
            <br /><br />

            Nuestra tarifa incluye transporte y viáticos en localidades donde es necesario.
            <br /><br />

            El 50% inicial no es reembolsable si el cliente cancela.
            <br /><br />

            Posponer a una nueva fecha es necesario con veintiún (21) días de antelación
            a la fecha inicial.
            <br /><br />

            Otras condiciones aplicables y contrato obligatorio podrían ser provistos al momento
            de solicitar la factura final para la contratación del artista y fecha deseada.
            <br /><br />

            <strong>¡Es un privilegio poder servirle. Estamos a su entera disposición!</strong>
            <br /><br />

          </p>
        </section>

        <footer className="vc-footer">
          <p>Cruzmonty Booking Department</p>
        </footer>
      </div>
    </div>
  );
}