import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
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

export default function Formatos({
  workspaceId,
  workspace,
  goBack,
}) {
  const [formatos, setFormatos] = useState([]);
  const [form, setForm] = useState(nuevoRegistro);
  const [modalOpen, setModalOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const nombreArtista =
    workspace?.workspace_name || 'Artista activo';

  useEffect(() => {
    setBusqueda('');
    setModalOpen(false);
    setForm(nuevoRegistro);
    setError('');

    if (!workspaceId) {
      setFormatos([]);
      setCargando(false);
      return;
    }

    cargar();
  }, [workspaceId]);

  async function cargar() {
    try {
      setCargando(true);
      setError('');

      const data = await getFormatos(workspaceId);
      setFormatos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);

      const mensaje =
        err.message || 'No se pudieron cargar los formatos.';

      setError(mensaje);
      toast.error(mensaje);
    } finally {
      setCargando(false);
    }
  }

  function nuevo() {
    if (!workspaceId) {
      toast.error('No hay un Artista activo.');
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
    if (!workspaceId) {
      toast.error('No hay un Artista activo.');
      return;
    }

    try {
      await saveFormato(
        {
          nombre: `${formato.nombre || 'Formato'} copia`,
          cantidad_musicos: Number(
            formato.cantidad_musicos || 1
          ),
          activo: Boolean(formato.activo),
        },
        workspaceId
      );

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

    if (!workspaceId) {
      setError('No hay un Artista activo.');
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
      await saveFormato(
        {
          ...form,
          nombre: form.nombre.trim(),
          cantidad_musicos: Number(
            form.cantidad_musicos
          ),
          activo: Boolean(form.activo),
        },
        workspaceId
      );

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
    const confirmado = window.confirm(
      `¿Deseas borrar definitivamente el formato "${
        nombre || 'Sin nombre'
      }"?`
    );

    if (!confirmado) return;

    try {
      await deleteFormato(id, workspaceId);

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
          <p>Formatos musicales de {nombreArtista}</p>
        </div>

        <button type="button" onClick={goBack}>
          ← Atrás
        </button>
      </div>

      <section className="config-artista-card">
        <div>
          <span className="config-artista-kicker">
            Configuración del Artista
          </span>

          <strong>Formatos de {nombreArtista}</strong>

          <p>
            Estos formatos pertenecen exclusivamente al
            Artista activo y estarán disponibles al crear
            cotizaciones.
          </p>
        </div>

        <div className="config-artista-control">
          <label>Artista activo</label>
          <strong>{nombreArtista}</strong>
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
          disabled={!workspaceId}
        />

        <button
          type="button"
          onClick={nuevo}
          disabled={!workspaceId}
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

        {!workspaceId ? (
          <div className="config-artista-empty">
            <strong>No hay un Artista activo.</strong>
            <span>
              Selecciona un Artista para consultar sus
              formatos.
            </span>
          </div>
        ) : cargando ? (
          <div className="formatos-empty">
            Cargando formatos...
          </div>
        ) : formatosFiltrados.length === 0 ? (
          <div className="formatos-empty">
            {error ||
              'Este Artista todavía no tiene formatos configurados.'}
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
            Artista: <strong>{nombreArtista}</strong>
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
