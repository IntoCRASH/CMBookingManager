import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { getMisArtistas } from '../lib/artistasService';
import {
  deleteFormato,
  getFormatos,
  saveFormato,
} from '../lib/formatosService';

const nuevoRegistro = {
  nombre: '',
  cantidad_musicos: 1,
  activo: true,
};

export default function Formatos({ goBack }) {
  const [artistas, setArtistas] = useState([]);
  const [artistaId, setArtistaId] = useState('');
  const [formatos, setFormatos] = useState([]);
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
      setFormatos([]);
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

      const data = await getFormatos(artistaId);
      setFormatos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || 'No se pudieron cargar los formatos.'
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

  function editar(formato) {
    setForm({
      id: formato.id,
      nombre: formato.nombre || '',
      cantidad_musicos: Number(
        formato.cantidad_musicos || 1
      ),
      activo: Boolean(formato.activo),
    });

    setError('');
    setModalOpen(true);
  }

  async function duplicar(formato) {
    if (!artistaId) return;

    try {
      await saveFormato({
        artista_id: Number(artistaId),
        nombre: `${formato.nombre || 'Formato'} copia`,
        cantidad_musicos: Number(
          formato.cantidad_musicos || 1
        ),
        activo: Boolean(formato.activo),
      });

      toast.success('Formato duplicado correctamente.');
      await cargar();
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || 'No se pudo duplicar el formato.'
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
      setError('El nombre del formato es obligatorio.');
      return;
    }

    if (Number(form.cantidad_musicos) <= 0) {
      setError(
        'La cantidad de músicos debe ser mayor que cero.'
      );
      return;
    }

    try {
      await saveFormato({
        ...form,
        artista_id: Number(artistaId),
        nombre: form.nombre.trim(),
        cantidad_musicos: Number(
          form.cantidad_musicos
        ),
        activo: Boolean(form.activo),
      });

      toast.success(
        form.id
          ? 'Formato actualizado correctamente.'
          : 'Formato creado correctamente.'
      );

      setModalOpen(false);
      setForm(nuevoRegistro);
      await cargar();
    } catch (err) {
      console.error(err);

      const mensaje =
        err.message || 'No se pudo guardar el formato.';

      setError(mensaje);
      toast.error(mensaje);
    }
  }

  async function borrar(id, nombre) {
    const ok = window.confirm(
      `¿Deseas borrar definitivamente el formato "${nombre || 'Sin nombre'}"?`
    );

    if (!ok) return;

    try {
      await deleteFormato(id, artistaId);
      toast.success('Formato eliminado correctamente.');
      await cargar();
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || 'No se pudo borrar el formato.'
      );
    }
  }

  const formatosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return formatos;

    return formatos.filter((formato) =>
      String(formato.nombre || '')
        .toLowerCase()
        .includes(texto)
    );
  }, [formatos, busqueda]);

  return (
    <div className="dashboard formatos-page">
      <div className="top-bar">
        <div>
          <h1>Formatos</h1>
          <p>Formatos musicales por artista</p>
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
            Formatos de{' '}
            {artistaSeleccionado?.nombre ||
              'un artista'}
          </strong>

          <p>
            Cada artista puede ofrecer agrupaciones y
            cantidades de músicos diferentes.
          </p>
        </div>

        <div className="config-artista-control">
          <label htmlFor="formatos-artista">
            Artista
          </label>

          <select
            id="formatos-artista"
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

      <div className="actions-row formatos-actions">
        <input
          type="search"
          placeholder="Buscar formato..."
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
          + Nuevo Formato
        </button>
      </div>

      <div className="formatos-lista">
        <div
          className="formatos-header"
          aria-hidden="true"
        >
          <span>Formato</span>
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
          <div className="formatos-empty">
            Cargando formatos...
          </div>
        ) : formatosFiltrados.length === 0 ? (
          <div className="formatos-empty">
            Este artista todavía no tiene formatos
            configurados.
          </div>
        ) : (
          formatosFiltrados.map((formato) => (
            <article
              className="formato-row"
              key={formato.id}
            >
              <div className="formato-nombre">
                <span className="formato-icono">♪</span>

                <div>
                  <strong>
                    {formato.nombre || 'Sin nombre'}
                  </strong>

                  <small>
                    {Number(
                      formato.cantidad_musicos || 1
                    )}{' '}
                    músico
                    {Number(
                      formato.cantidad_musicos || 1
                    ) !== 1
                      ? 's'
                      : ''}
                  </small>
                </div>
              </div>

              <div className="formato-acciones">
                <button
                  type="button"
                  onClick={() => editar(formato)}
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => duplicar(formato)}
                >
                  Duplicar
                </button>

                <button
                  type="button"
                  className="danger-btn"
                  onClick={() =>
                    borrar(formato.id, formato.nombre)
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
        title={form.id ? 'Editar Formato' : 'Nuevo Formato'}
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

          <label>Nombre del formato *</label>

          <input
            name="nombre"
            value={form.nombre}
            onChange={cambiar}
            placeholder="Ej: Trío, Full Band, Orquesta full"
          />

          <label>Cantidad de músicos *</label>

          <input
            name="cantidad_musicos"
            type="number"
            min="1"
            value={form.cantidad_musicos}
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
