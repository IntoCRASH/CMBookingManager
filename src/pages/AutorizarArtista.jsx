import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  consultarAutorizacionArtista,
  responderAutorizacionArtista,
} from '../lib/artistasService';

function fechaHora(value) {
  if (!value) return '';

  return new Date(value).toLocaleString(
    'es-DO',
    {
      dateStyle: 'long',
      timeStyle: 'short',
    }
  );
}

export default function AutorizarArtista({
  token,
}) {
  const [solicitud, setSolicitud] =
    useState(null);

  const [cargando, setCargando] =
    useState(true);

  const [procesando, setProcesando] =
    useState(false);

  const [error, setError] = useState('');
  const [respuesta, setRespuesta] =
    useState('');

  useEffect(() => {
    cargar();
  }, [token]);

  async function cargar() {
    try {
      setCargando(true);
      setError('');

      const data =
        await consultarAutorizacionArtista(
          token
        );

      setSolicitud(data);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          'El enlace de autorización no es válido.'
      );
    } finally {
      setCargando(false);
    }
  }

  async function responder(decision) {
    const verbo =
      decision === 'autorizar'
        ? 'autorizar'
        : 'rechazar';

    const confirmar = window.confirm(
      `¿Confirmas que deseas ${verbo} esta comisión?`
    );

    if (!confirmar) return;

    try {
      setProcesando(true);

      const data =
        await responderAutorizacionArtista(
          token,
          decision
        );

      const estado =
        data.estado_autorizacion ||
        (decision === 'autorizar'
          ? 'autorizado'
          : 'rechazado');

      setRespuesta(estado);

      setSolicitud((actual) => ({
        ...actual,
        estado_autorizacion: estado,
        expirada: false,
      }));

      toast.success(
        estado === 'autorizado'
          ? 'Comisión autorizada correctamente.'
          : 'Solicitud rechazada.'
      );
    } catch (err) {
      console.error(err);

      const mensaje =
        err.message ||
        'No se pudo registrar tu respuesta.';

      setError(mensaje);
      toast.error(mensaje);
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) {
    return (
      <div className="artist-auth-public-page">
        <div className="artist-auth-public-card">
          Cargando autorización...
        </div>
      </div>
    );
  }

  if (error || !solicitud) {
    return (
      <div className="artist-auth-public-page">
        <div className="artist-auth-public-card">
          <img
            src="/mibooking-logo.png"
            alt="MiBooking"
          />

          <h1>Enlace no disponible</h1>

          <p>
            {error ||
              'No se encontró esta solicitud.'}
          </p>
        </div>
      </div>
    );
  }

  const estado =
    respuesta ||
    solicitud.estado_autorizacion;

  const yaRespondida =
    ['autorizado', 'rechazado'].includes(
      estado
    );

  return (
    <div className="artist-auth-public-page">
      <div className="artist-auth-public-card">
        <img
          src="/mibooking-logo.png"
          alt="MiBooking"
        />

        <span className="artist-auth-kicker">
          Autorización de representación
        </span>

        <h1>
          Hola, {solicitud.artista_nombre}
        </h1>

        <p>
          <strong>
            {solicitud.agente_nombre ||
              'Un agente'}
          </strong>{' '}
          desea gestionar tus contrataciones
          mediante MiBooking.
        </p>

        <div className="artist-auth-commission">
          <small>
            Comisión solicitada
          </small>

          <strong>
            {Number(
              solicitud.comision_porcentaje ||
                0
            ).toLocaleString('es-DO', {
              maximumFractionDigits: 2,
            })}
            %
          </strong>
        </div>

        <p className="artist-auth-email">
          Esta solicitud fue enviada para{' '}
          <strong>
            {solicitud.artista_email}
          </strong>
          .
        </p>

        {solicitud.token_expira && (
          <p className="artist-auth-expiry">
            Válida hasta{' '}
            {fechaHora(
              solicitud.token_expira
            )}
          </p>
        )}

        {solicitud.expirada ? (
          <div className="artist-auth-result rejected">
            Este enlace venció. Solicita al
            agente un enlace nuevo.
          </div>
        ) : yaRespondida ? (
          <div
            className={
              `artist-auth-result ` +
              (estado === 'autorizado'
                ? 'approved'
                : 'rejected')
            }
          >
            {estado === 'autorizado'
              ? 'Has autorizado esta comisión.'
              : 'Has rechazado esta solicitud.'}
          </div>
        ) : (
          <div className="artist-auth-buttons">
            <button
              type="button"
              onClick={() =>
                responder('autorizar')
              }
              disabled={procesando}
            >
              Autorizar comisión
            </button>

            <button
              type="button"
              className="danger-btn"
              onClick={() =>
                responder('rechazar')
              }
              disabled={procesando}
            >
              Rechazar
            </button>
          </div>
        )}

        <small className="artist-auth-legal">
          Al autorizar, confirmas que conoces
          y aceptas el porcentaje indicado
          para las contrataciones gestionadas
          por este agente dentro de
          MiBooking.
        </small>
      </div>
    </div>
  );
}
