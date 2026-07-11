import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { getMisArtistas } from '../lib/artistasService';
import {
  deleteTipoEventoConfig,
  getTodosTiposEventoConfig,
  saveTipoEventoConfig,
} from '../lib/tiposEventoConfigService';

const nuevoRegistro = {
  nombre: '',
  multiplicador_honorarios: 1,
  multiplicador_musicos: 1,
  multiplicador_sonido: 1,
  multiplicador_road_manager: 1,
  ensayo_extra: 0,
  produccion_extra: 0,
  activo: true,
};

export default function TiposEvento({ goBack }) {
  const [artistas, setArtistas] = useState([]);
  const [artistaId, setArtistaId] = useState('');
  const [tiposEvento, setTiposEvento] = useState([]);
  const [form, setForm] = useState(nuevoRegistro);
  const [modalOpen, setModalOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const artistaSeleccionado = artistas.find(
    (artista) =>
      String(artista.id) === String(artistaId)
  );

  useEffect(() => {
    cargarArtistas();
  }, []);

  useEffect(() => {
    if (!artistaId) {
      setTiposEvento([]);
      setCargando(false);
      return;
    }

    cargar();
  }, [artistaId]);

  async function cargarArtistas() {
    try {
      setCargando(true);

      const data = await getMisArtistas();
      const lista = Array.isArray(data) ? data : [];

      setArtistas(lista);

      if (lista.length > 0) {
        setArtistaId((actual) => actual || String(lista[0].id));
      } else {
        setCargando(false);
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || 'No se pudieron cargar los artistas.'
      );
      setCargando(false);
    }
  }

  async function cargar() {
    try {
      setCargando(true);

      const data =
        await getTodosTiposEventoConfig(artistaId);

      setTiposEvento(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error(
        err.message ||
          'No se pudieron cargar los tipos de evento.'
      );
    } finally {
      setCargando(false);
    }
  }

  function cambiarArtista(event) {
    setArtistaId(event.target.value);
    setBusqueda('');
    setModalOpen(false);
    setForm(nuevoRegistro);
    setError('');
  }

  function nuevo() {
    if (!artistaId) {
      toast.error('Primero selecciona un artista.');
      return;
    }

    setForm(nuevoRegistro);
    setError('');
    setModalOpen(true);
  }

  function editar(tipo) {
    setForm({
      id: tipo.id,
      nombre: tipo.nombre || '',
      multiplicador_honorarios: Number(
        tipo.multiplicador_honorarios || 1
      ),
      multiplicador_musicos: Number(
        tipo.multiplicador_musicos || 1
      ),
      multiplicador_sonido: Number(
        tipo.multiplicador_sonido || 1
      ),
      multiplicador_road_manager: Number(
        tipo.multiplicador_road_manager || 1
      ),
      ensayo_extra: Number(tipo.ensayo_extra || 0),
      produccion_extra: Number(
        tipo.produccion_extra || 0
      ),
      activo: Boolean(tipo.activo),
    });

    setError('');
    setModalOpen(true);
  }

  async function duplicar(tipo) {
    if (!artistaId) return;

    try {
      await saveTipoEventoConfig({
        artista_id: Number(artistaId),
        nombre: `${tipo.nombre || 'Tipo de evento'} copia`,
        multiplicador_honorarios: Number(
          tipo.multiplicador_honorarios || 1
        ),
        multiplicador_musicos: Number(
          tipo.multiplicador_musicos || 1
        ),
        multiplicador_sonido: Number(
          tipo.multiplicador_sonido || 1
        ),
        multiplicador_road_manager: Number(
          tipo.multiplicador_road_manager || 1
        ),
        ensayo_extra: Number(tipo.ensayo_extra || 0),
        produccion_extra: Number(
          tipo.produccion_extra || 0
        ),
        activo: Boolean(tipo.activo),
      });

      toast.success(
        'Tipo de evento duplicado correctamente.'
      );

      await cargar();
    } catch (err) {
      console.error(err);
      toast.error(
        err.message ||
          'No se pudo duplicar el tipo de evento.'
      );
    }
  }

  function cambiar(event) {
    const { name, value, type, checked } = event.target;

    setForm((actual) => ({
      ...actual,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function guardar(event) {
    event.preventDefault();
    setError('');

    if (!artistaId) {
      setError('Primero selecciona un artista.');
      return;
    }

    if (!form.nombre.trim()) {
      setError(
        'El nombre del tipo de evento es obligatorio.'
      );
      return;
    }

    if (Number(form.multiplicador_honorarios || 0) <= 0) {
      setError(
        'El multiplicador de honorarios debe ser mayor que cero.'
      );
      return;
    }

    if (Number(form.multiplicador_musicos || 0) <= 0) {
      setError(
        'El multiplicador de músicos debe ser mayor que cero.'
      );
      return;
    }

    if (Number(form.multiplicador_sonido || 0) <= 0) {
      setError(
        'El multiplicador de sonido debe ser mayor que cero.'
      );
      return;
    }

    if (
      Number(form.multiplicador_road_manager || 0) <= 0
    ) {
      setError(
        'El multiplicador de Road Manager debe ser mayor que cero.'
      );
      return;
    }

    if (Number(form.ensayo_extra || 0) < 0) {
      setError('El ensayo extra no puede ser negativo.');
      return;
    }

    if (Number(form.produccion_extra || 0) < 0) {
      setError(
        'La producción extra no puede ser negativa.'
      );
      return;
    }

    try {
      await saveTipoEventoConfig({
        ...form,
        artista_id: Number(artistaId),
        nombre: form.nombre.trim(),
        multiplicador_honorarios: Number(
          form.multiplicador_honorarios || 1
        ),
        multiplicador_musicos: Number(
          form.multiplicador_musicos || 1
        ),
        multiplicador_sonido: Number(
          form.multiplicador_sonido || 1
        ),
        multiplicador_road_manager: Number(
          form.multiplicador_road_manager || 1
        ),
        ensayo_extra: Number(form.ensayo_extra || 0),
        produccion_extra: Number(
          form.produccion_extra || 0
        ),
        activo: Boolean(form.activo),
      });

      toast.success(
        form.id
          ? 'Tipo de evento actualizado correctamente.'
          : 'Tipo de evento creado correctamente.'
      );

      setModalOpen(false);
      setForm(nuevoRegistro);
      await cargar();
    } catch (err) {
      console.error(err);

      const mensaje =
        err.message ||
        'No se pudo guardar el tipo de evento.';

      setError(mensaje);
      toast.error(mensaje);
    }
  }

  async function borrar(id, nombre) {
    const ok = window.confirm(
      `¿Deseas borrar definitivamente el tipo de evento "${nombre || 'Sin nombre'}"?`
    );

    if (!ok) return;

    try {
      await deleteTipoEventoConfig(id, artistaId);

      toast.success(
        'Tipo de evento eliminado correctamente.'
      );

      await cargar();
    } catch (err) {
      console.error(err);
      toast.error(
        err.message ||
          'No se pudo borrar el tipo de evento.'
      );
    }
  }

  const tiposFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return tiposEvento;

    return tiposEvento.filter((tipo) =>
      String(tipo.nombre || '')
        .toLowerCase()
        .includes(texto)
    );
  }, [tiposEvento, busqueda]);

  return (
    <div className="dashboard tipos-evento-page">
      <div className="top-bar">
        <div>
          <h1>Tipos de Evento</h1>

          <p>
            Multiplicadores, ensayos y producción por
            artista
          </p>
        </div>

        <button type="button" onClick={goBack}>
          ← Atrás
        </button>
      </div>

      <section className="config-artista-card">
        <div>
          <span className="config-artista-kicker">
            Configuración independiente
          </span>

          <strong>
            Tipos de evento de{' '}
            {artistaSeleccionado?.nombre ||
              'un artista'}
          </strong>

          <p>
            Los multiplicadores y costos extra se
            aplican únicamente al artista seleccionado.
          </p>
        </div>

        <div className="config-artista-control">
          <label htmlFor="tipos-artista">
            Artista
          </label>

          <select
            id="tipos-artista"
            value={artistaId}
            onChange={cambiarArtista}
          >
            <option value="">
              Seleccionar artista
            </option>

            {artistas.map((artista) => (
              <option key={artista.id} value={artista.id}>
                {artista.nombre}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="actions-row tipos-evento-actions">
        <input
          type="search"
          placeholder="Buscar tipo de evento..."
          value={busqueda}
          onChange={(event) =>
            setBusqueda(event.target.value)
          }
          disabled={!artistaId}
        />

        <button
          type="button"
          onClick={nuevo}
          disabled={!artistaId}
        >
          + Nuevo Tipo
        </button>
      </div>

      <div className="tipos-evento-lista">
        <div
          className="tipos-evento-header"
          aria-hidden="true"
        >
          <span>Tipo de evento</span>
          <span>Acciones</span>
        </div>

        {artistas.length === 0 ? (
          <div className="config-artista-empty">
            <strong>No tienes artistas activos.</strong>
            <span>
              Crea primero un artista desde la página
              Artistas.
            </span>
          </div>
        ) : cargando ? (
          <div className="tipos-evento-empty">
            Cargando tipos de evento...
          </div>
        ) : tiposFiltrados.length === 0 ? (
          <div className="tipos-evento-empty">
            Este artista todavía no tiene tipos de
            evento configurados.
          </div>
        ) : (
          tiposFiltrados.map((tipo) => (
            <article
              className="tipo-evento-row"
              key={tipo.id}
            >
              <div className="tipo-evento-nombre">
                <span className="tipo-evento-icono">
                  🎤
                </span>

                <div>
                  <strong>
                    {tipo.nombre || 'Sin nombre'}
                  </strong>

                  <small>
                    Honorarios x
                    {Number(
                      tipo.multiplicador_honorarios || 1
                    ).toLocaleString('es-DO')}
                  </small>
                </div>
              </div>

              <div className="tipo-evento-acciones">
                <button
                  type="button"
                  onClick={() => editar(tipo)}
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => duplicar(tipo)}
                >
                  Duplicar
                </button>

                <button
                  type="button"
                  className="danger-btn"
                  onClick={() =>
                    borrar(tipo.id, tipo.nombre)
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
          form.id
            ? 'Editar Tipo de Evento'
            : 'Nuevo Tipo de Evento'
        }
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={guardar}>
          <p className="config-modal-context">
            Artista:{' '}
            <strong>
              {artistaSeleccionado?.nombre ||
                'No seleccionado'}
            </strong>
          </p>

          <label>Nombre del tipo de evento *</label>

          <input
            name="nombre"
            value={form.nombre}
            onChange={cambiar}
            placeholder="Ej: Privado, Boda, Festival, Corporativo"
          />

          <label>Multiplicador de honorarios *</label>

          <input
            name="multiplicador_honorarios"
            type="number"
            min="0.1"
            step="0.05"
            value={form.multiplicador_honorarios}
            onChange={cambiar}
          />

          <label>Multiplicador de músicos *</label>

          <input
            name="multiplicador_musicos"
            type="number"
            min="0.1"
            step="0.05"
            value={form.multiplicador_musicos}
            onChange={cambiar}
          />

          <label>Multiplicador de sonido *</label>

          <input
            name="multiplicador_sonido"
            type="number"
            min="0.1"
            step="0.05"
            value={form.multiplicador_sonido}
            onChange={cambiar}
          />

          <label>Multiplicador Road Manager *</label>

          <input
            name="multiplicador_road_manager"
            type="number"
            min="0.1"
            step="0.05"
            value={form.multiplicador_road_manager}
            onChange={cambiar}
          />

          <label>Ensayo extra</label>

          <input
            name="ensayo_extra"
            type="number"
            min="0"
            step="100"
            value={form.ensayo_extra}
            onChange={cambiar}
          />

          <label>Producción extra</label>

          <input
            name="produccion_extra"
            type="number"
            min="0"
            step="100"
            value={form.produccion_extra}
            onChange={cambiar}
          />

          <label className="check-row">
            <input
              type="checkbox"
              name="activo"
              checked={form.activo}
              onChange={cambiar}
            />
            Activo
          </label>

          {error && <p className="error">{error}</p>}

          <div className="modal-actions">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </button>

            <button type="submit">
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
