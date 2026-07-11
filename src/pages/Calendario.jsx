import { useEffect, useMemo, useState } from 'react';
import { getCotizaciones } from '../lib/cotizacionesService';

const ARTISTA_COLOR_COUNT = 6;

function obtenerNombreArtista(cotizacion) {
  return (
    cotizacion.artista_nombre_snapshot ||
    cotizacion.artista_snapshot?.nombre ||
    cotizacion.artistas?.nombre ||
    cotizacion.artista?.nombre ||
    'Artista sin nombre'
  );
}

function obtenerNombreCliente(cotizacion) {
  return (
    cotizacion.clientes?.nombre ||
    cotizacion.cliente_nombre_snapshot ||
    'Cliente sin nombre'
  );
}

function obtenerVenue(cotizacion) {
  return (
    cotizacion.venue ||
    cotizacion.zona_nombre_snapshot ||
    cotizacion.provincias?.nombre ||
    'Venue pendiente'
  );
}

function indiceColorArtista(cotizacion) {
  const valor = String(
    cotizacion.artista_id ||
      cotizacion.artista_nombre_snapshot ||
      cotizacion.artistas?.id ||
      obtenerNombreArtista(cotizacion)
  );

  let hash = 0;

  for (let index = 0; index < valor.length; index += 1) {
    hash = (hash * 31 + valor.charCodeAt(index)) >>> 0;
  }

  return hash % ARTISTA_COLOR_COUNT;
}

function horaCorta(hora) {
  if (!hora) return '';

  const [horas, minutos] = String(hora).split(':');
  const fecha = new Date();

  fecha.setHours(Number(horas || 0));
  fecha.setMinutes(Number(minutos || 0));

  return fecha.toLocaleTimeString('es-DO', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function Calendario({
  goBack,
  abrirCotizacion,
  editarCotizacion,
}) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [fechaBase, setFechaBase] = useState(new Date());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    try {
      setCargando(true);
      setError('');

      const data = await getCotizaciones();

      setCotizaciones(
        (Array.isArray(data) ? data : []).filter(
          (cotizacion) => cotizacion.fecha_evento
        )
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          'No se pudieron cargar los eventos del calendario.'
      );
    } finally {
      setCargando(false);
    }
  }

  const year = fechaBase.getFullYear();
  const month = fechaBase.getMonth();

  const dias = useMemo(() => {
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const totalDias = ultimoDia.getDate();
    const inicioSemana = primerDia.getDay();
    const resultado = [];

    for (let index = 0; index < inicioSemana; index += 1) {
      resultado.push(null);
    }

    for (let dia = 1; dia <= totalDias; dia += 1) {
      resultado.push(new Date(year, month, dia));
    }

    return resultado;
  }, [year, month]);

  function fechaKey(fecha) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;
  }

  const eventosPorFecha = useMemo(() => {
    const mapa = new Map();

    cotizaciones.forEach((cotizacion) => {
      const key = cotizacion.fecha_evento;

      if (!key) return;

      if (!mapa.has(key)) {
        mapa.set(key, []);
      }

      mapa.get(key).push(cotizacion);
    });

    mapa.forEach((eventos) => {
      eventos.sort((a, b) => {
        const horaA = a.hora_inicio || '99:99';
        const horaB = b.hora_inicio || '99:99';

        if (horaA !== horaB) {
          return horaA.localeCompare(horaB);
        }

        return obtenerNombreArtista(a).localeCompare(
          obtenerNombreArtista(b),
          'es'
        );
      });
    });

    return mapa;
  }, [cotizaciones]);

  function eventosDelDia(fecha) {
    if (!fecha) return [];

    return eventosPorFecha.get(fechaKey(fecha)) || [];
  }

  function cambiarMes(delta) {
    setFechaBase(new Date(year, month + delta, 1));
  }

  function irAHoy() {
    setFechaBase(new Date());
  }

  function esHoy(fecha) {
    if (!fecha) return false;

    const hoy = new Date();

    return (
      fecha.getFullYear() === hoy.getFullYear() &&
      fecha.getMonth() === hoy.getMonth() &&
      fecha.getDate() === hoy.getDate()
    );
  }

  const nombreMes = fechaBase.toLocaleDateString('es-DO', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="dashboard calendario-page">
      <div className="top-bar">
        <div>
          <h1>Calendario</h1>
          <p className="calendario-mes-titulo">{nombreMes}</p>
        </div>

        <button type="button" onClick={goBack}>
          ← Atrás
        </button>
      </div>

      <div className="calendario-controles">
        <button type="button" onClick={() => cambiarMes(-1)}>
          ← Mes anterior
        </button>

        <button
          type="button"
          className="calendario-hoy-btn"
          onClick={irAHoy}
        >
          Hoy
        </button>

        <button type="button" onClick={() => cambiarMes(1)}>
          Mes siguiente →
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {cargando ? (
        <div className="calendario-estado">
          Cargando calendario...
        </div>
      ) : (
        <div className="calendario-scroll">
          <div className="calendario-grid">
            {[
              'Dom',
              'Lun',
              'Mar',
              'Mié',
              'Jue',
              'Vie',
              'Sáb',
            ].map((dia) => (
              <div
                key={dia}
                className="calendario-dia-header"
              >
                {dia}
              </div>
            ))}

            {dias.map((fecha, index) => {
              const eventos = fecha
                ? eventosDelDia(fecha)
                : [];

              const multiples = eventos.length > 1;

              return (
                <div
                  key={
                    fecha
                      ? fechaKey(fecha)
                      : `vacio-${index}`
                  }
                  className={[
                    'calendario-dia',
                    !fecha ? 'calendario-dia-vacio' : '',
                    esHoy(fecha) ? 'es-hoy' : '',
                    multiples ? 'tiene-varios-eventos' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {fecha && (
                    <>
                      <div className="calendario-dia-top">
                        <span className="calendario-numero">
                          {fecha.getDate()}
                        </span>

                        {eventos.length > 0 && (
                          <span
                            className={
                              multiples
                                ? 'calendario-eventos-count multiple'
                                : 'calendario-eventos-count'
                            }
                          >
                            {eventos.length}{' '}
                            {eventos.length === 1
                              ? 'evento'
                              : 'eventos'}
                          </span>
                        )}
                      </div>

                      <div className="calendario-eventos-lista">
                        {eventos.map((evento) => {
                          const artista =
                            obtenerNombreArtista(evento);
                          const cliente =
                            obtenerNombreCliente(evento);
                          const venue = obtenerVenue(evento);
                          const hora = horaCorta(
                            evento.hora_inicio
                          );
                          const colorIndex =
                            indiceColorArtista(evento);

                          return (
                            <article
                              key={evento.id}
                              className={
                                `calendario-evento ` +
                                `artista-color-${colorIndex}`
                              }
                            >
                              <div className="calendario-evento-cabecera">
                                <strong title={artista}>
                                  {artista}
                                </strong>

                                {hora && (
                                  <span className="calendario-evento-hora">
                                    {hora}
                                  </span>
                                )}
                              </div>

                              <span
                                className="calendario-evento-venue"
                                title={venue}
                              >
                                {venue}
                              </span>

                              <small
                                className="calendario-evento-cliente"
                                title={cliente}
                              >
                                Cliente: {cliente}
                              </small>

                              <div className="calendario-acciones">
                                <button
                                  type="button"
                                  onClick={() =>
                                    abrirCotizacion(evento.id)
                                  }
                                >
                                  Ver
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    editarCotizacion(evento.id)
                                  }
                                >
                                  Editar
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
