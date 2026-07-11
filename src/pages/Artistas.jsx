import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import {
  actualizarArtista,
  borrarArtista,
  crearArtista,
  enviarAutorizacionArtista,
  getMisArtistas,
  getPlanArtistas,
} from '../lib/artistasService';

const artistaInicial = {
  nombre: '',
  email: '',
  spotify_url: '',
  comision_porcentaje: 10,
};

function estadoLabel(estado) {
  const labels = {
    pendiente: 'Pendiente',
    autorizado: 'Autorizado',
    rechazado: 'Rechazado',
    revocado: 'Revocado',
  };

  return labels[estado] || 'Pendiente';
}

function validarUrlSpotify(value) {
  const texto = String(value || '').trim();

  if (!texto) return true;

  try {
    const url = new URL(texto);

    return (
      ['http:', 'https:'].includes(url.protocol) &&
      url.hostname.toLowerCase().includes('spotify.com')
    );
  } catch {
    return false;
  }
}

function fechaEnvio(fecha) {
  if (!fecha) return '';

  return new Date(fecha).toLocaleString('es-DO', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function Artistas({ goBack }) {
  const [artistas, setArtistas] = useState([]);
  const [plan, setPlan] = useState('limitado');
  const [form, setForm] = useState(artistaInicial);
  const [modoModal, setModoModal] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [enviandoId, setEnviandoId] = useState(null);
  const [error, setError] = useState('');

  const modalOpen = Boolean(modoModal);
  const esPro = plan === 'pro';

  const limiteAlcanzado =
    !esPro &&
    artistas.filter((artista) => artista.activo).length >= 1;

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    try {
      setCargando(true);

      const [lista, planActual] = await Promise.all([
        getMisArtistas(),
        getPlanArtistas(),
      ]);

      setArtistas(lista);
      setPlan(planActual || 'limitado');
    } catch (err) {
      console.error(err);

      toast.error(
        err.message ||
          'No se pudieron cargar los artistas.'
      );
    } finally {
      setCargando(false);
    }
  }

  function cerrarModal() {
    setModoModal(null);
    setForm(artistaInicial);
    setError('');
  }

  function abrirNuevo() {
    if (limiteAlcanzado) {
      toast.error(
        'Tu plan limitado permite un máximo de 1 artista activo.'
      );
      return;
    }

    setForm(artistaInicial);
    setError('');
    setModoModal('nuevo');
  }

  function editar(artista) {
    setForm({
      id: artista.id,
      nombre: artista.nombre || '',
      email: artista.email || '',
      spotify_url: artista.spotify_url || '',
      comision_porcentaje: Number(
        artista.comision_porcentaje ?? 0
      ),
    });

    setError('');
    setModoModal('editar');
  }

  function cambiar(event) {
    const { name, value } = event.target;

    setForm((actual) => ({
      ...actual,
      [name]: value,
    }));

    setError('');
  }

  async function enviarSolicitud(artistaId, esReenvio = false) {
    try {
      setEnviandoId(artistaId);

      await enviarAutorizacionArtista(artistaId);

      toast.success(
        esReenvio
          ? 'Correo de autorización reenviado al artista.'
          : 'Correo de autorización enviado automáticamente al artista.'
      );

      return true;
    } catch (err) {
      console.error(err);

      toast.error(
        err.message ||
          'El artista fue guardado, pero no se pudo enviar el correo.'
      );

      return false;
    } finally {
      setEnviandoId(null);
    }
  }

  async function guardar(event) {
    event.preventDefault();
    setError('');

    if (!form.nombre.trim()) {
      setError('El nombre del artista es obligatorio.');
      return;
    }

    if (!form.email.trim()) {
      setError('El email del artista es obligatorio.');
      return;
    }

    const comision = Number(form.comision_porcentaje);

    if (
      !Number.isFinite(comision) ||
      comision < 0 ||
      comision > 100
    ) {
      setError('La comisión debe estar entre 0% y 100%.');
      return;
    }

    if (!validarUrlSpotify(form.spotify_url)) {
      setError(
        'Introduce un enlace válido del perfil de Spotify.'
      );
      return;
    }

    try {
      setGuardando(true);

      const respuesta =
        modoModal === 'editar'
          ? await actualizarArtista(form.id, {
              ...form,
              comision_porcentaje: comision,
            })
          : await crearArtista({
              ...form,
              comision_porcentaje: comision,
            });

      const artistaGuardado = respuesta?.artista;

      if (!artistaGuardado?.id) {
        throw new Error(
          'El artista se guardó, pero no se recibió su identificador.'
        );
      }

      cerrarModal();

      const requiereAutorizacion =
        Boolean(respuesta?.requiere_autorizacion);

      if (requiereAutorizacion) {
        await enviarSolicitud(artistaGuardado.id);
      } else {
        toast.success('Artista actualizado correctamente.');
      }

      await cargar();
    } catch (err) {
      console.error(err);

      const mensaje =
        err.message ||
        'No se pudo guardar el artista.';

      setError(mensaje);
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  async function reenviarSolicitud(artista) {
    await enviarSolicitud(artista.id, true);
    await cargar();
  }

  async function eliminar(artista) {
    const confirmar = window.confirm(
      `¿Deseas borrar a "${artista.nombre}"? ` +
        'Si ya tiene cotizaciones, se desactivará para proteger el historial.'
    );

    if (!confirmar) return;

    try {
      const resultado =
        await borrarArtista(artista.id);

      toast.success(
        resultado.modo === 'desactivado'
          ? 'Artista desactivado. Sus cotizaciones históricas se conservaron.'
          : 'Artista eliminado correctamente.'
      );

      await cargar();
    } catch (err) {
      console.error(err);

      toast.error(
        err.message ||
          'No se pudo borrar el artista.'
      );
    }
  }

  const artistasFiltrados = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase();

    if (!texto) return artistas;

    return artistas.filter((artista) =>
      [
        artista.nombre,
        artista.email,
        artista.spotify_url,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(texto)
    );
  }, [artistas, busqueda]);

  return (
    <div className="dashboard artistas-page">
      <div className="top-bar">
        <div>
          <h1>Artistas</h1>

          <p>
            Perfiles artísticos y acuerdos de comisión
          </p>
        </div>

        <button type="button" onClick={goBack}>
          ← Atrás
        </button>
      </div>

      <section className="artistas-plan-card">
        <div>
          <span className="artistas-plan-kicker">
            Plan actual
          </span>

          <strong>
            {esPro
              ? 'MiBooking Pro'
              : 'MiBooking Limitado'}
          </strong>

          <p>
            {esPro
              ? 'Puedes administrar artistas ilimitados.'
              : `${artistas.length}/1 artista activo utilizado.`}
          </p>
        </div>

        {!esPro && limiteAlcanzado && (
          <span className="artistas-limit-badge">
            Límite alcanzado
          </span>
        )}
      </section>

      <section className="artistas-auth-card">
        <div>
          <span>Autorización protegida</span>

          <strong>
            El enlace nunca se muestra al agente
          </strong>

          <p>
            MiBooking genera el enlace en el servidor y lo envía
            directamente al correo del artista. Desde esta página
            solamente puedes consultar el estado o reenviar el email.
          </p>
        </div>
      </section>

      <div className="actions-row artistas-actions">
        <input
          type="search"
          placeholder="Buscar artista..."
          value={busqueda}
          onChange={(event) =>
            setBusqueda(event.target.value)
          }
        />

        <button
          type="button"
          onClick={abrirNuevo}
          disabled={limiteAlcanzado}
        >
          {limiteAlcanzado
            ? 'Límite de 1 artista alcanzado'
            : '+ Nuevo Artista'}
        </button>
      </div>

      <div className="artistas-lista">
        <div
          className="artistas-header"
          aria-hidden="true"
        >
          <span>Artista</span>
          <span>Comisión</span>
          <span>Autorización</span>
          <span>Acciones</span>
        </div>

        {cargando ? (
          <div className="artistas-empty">
            Cargando artistas...
          </div>
        ) : artistasFiltrados.length === 0 ? (
          <div className="artistas-empty">
            <strong>
              Todavía no tienes artistas.
            </strong>

            <span>
              Crea el primero para comenzar a cotizar con
              una comisión autorizada.
            </span>
          </div>
        ) : (
          artistasFiltrados.map((artista) => (
            <article
              className="artista-row"
              key={artista.id}
            >
              <div className="artista-identidad">
                <span className="artista-avatar">
                  {String(
                    artista.nombre || 'A'
                  )
                    .trim()
                    .slice(0, 1)
                    .toUpperCase()}
                </span>

                <div>
                  <strong>
                    {artista.nombre}
                  </strong>

                  <small>
                    {artista.email}
                  </small>

                  {artista.spotify_url && (
                    <a
                      href={artista.spotify_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir Spotify ↗
                    </a>
                  )}
                </div>
              </div>

              <div
                className="artista-comision"
                data-label="Comisión"
              >
                <strong>
                  {Number(
                    artista.comision_porcentaje || 0
                  ).toLocaleString('es-DO', {
                    maximumFractionDigits: 2,
                  })}
                  %
                </strong>

                <small>
                  Comisión del agente
                </small>
              </div>

              <div data-label="Autorización">
                <span
                  className={
                    `artista-status ` +
                    `status-${artista.estado_autorizacion}`
                  }
                >
                  {estadoLabel(
                    artista.estado_autorizacion
                  )}
                </span>

                {artista.autorizacion_enviada_at && (
                  <small
                    style={{
                      display: 'block',
                      marginTop: 6,
                    }}
                  >
                    Email enviado:{' '}
                    {fechaEnvio(
                      artista.autorizacion_enviada_at
                    )}
                  </small>
                )}

                {artista.autorizacion_error && (
                  <small
                    className="error"
                    style={{
                      display: 'block',
                      marginTop: 6,
                    }}
                  >
                    Último envío falló
                  </small>
                )}
              </div>

              <div className="artista-acciones">
                <button
                  type="button"
                  onClick={() => editar(artista)}
                >
                  Editar
                </button>

                {artista.estado_autorizacion !==
                  'autorizado' && (
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={enviandoId === artista.id}
                    onClick={() =>
                      reenviarSolicitud(artista)
                    }
                  >
                    {enviandoId === artista.id
                      ? 'Enviando...'
                      : artista.autorizacion_enviada_at
                        ? 'Reenviar correo'
                        : 'Enviar autorización'}
                  </button>
                )}

                <button
                  type="button"
                  className="danger-btn"
                  onClick={() =>
                    eliminar(artista)
                  }
                >
                  Borrar
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <Modal
        open={modalOpen}
        title={
          modoModal === 'editar'
            ? 'Editar Artista'
            : 'Nuevo Artista'
        }
        onClose={cerrarModal}
      >
        <form onSubmit={guardar}>
          <label>Nombre del artista *</label>

          <input
            name="nombre"
            value={form.nombre}
            onChange={cambiar}
            autoComplete="organization"
          />

          <label>Email del artista *</label>

          <input
            type="email"
            name="email"
            value={form.email}
            onChange={cambiar}
            autoComplete="email"
          />

          <label>Perfil de Spotify</label>

          <input
            type="url"
            name="spotify_url"
            value={form.spotify_url}
            onChange={cambiar}
            placeholder="https://open.spotify.com/artist/..."
          />

          <label>Comisión del agente (%) *</label>

          <input
            type="number"
            name="comision_porcentaje"
            value={form.comision_porcentaje}
            onChange={cambiar}
            min="0"
            max="100"
            step="0.01"
          />

          <p className="artista-modal-note">
            Al crear el artista, MiBooking enviará
            automáticamente una solicitud al email indicado.
            Si cambias el email o el porcentaje, la autorización
            anterior se invalida y se envía una nueva solicitud.
            El agente nunca recibe ni ve el enlace.
          </p>

          {error && (
            <p className="error">{error}</p>
          )}

          <div className="modal-actions">
            <button
              type="button"
              onClick={cerrarModal}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
            >
              {guardando
                ? 'Guardando...'
                : modoModal === 'editar'
                  ? 'Guardar cambios'
                  : 'Crear artista'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
