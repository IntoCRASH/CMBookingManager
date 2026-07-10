import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import {
  getFormatos,
  saveFormato,
  deleteFormato,
} from '../lib/formatosService';

const nuevoRegistro = {
  nombre: '',
  cantidad_musicos: 1,
  activo: true,
};

export default function Formatos({ goBack }) {
  const [formatos, setFormatos] = useState([]);
  const [form, setForm] = useState(nuevoRegistro);
  const [modalOpen, setModalOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    try {
      setCargando(true);
      const data = await getFormatos();
      setFormatos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'No se pudieron cargar los formatos.');
    } finally {
      setCargando(false);
    }
  }

  function nuevo() {
    setForm(nuevoRegistro);
    setError('');
    setModalOpen(true);
  }

  function editar(formato) {
    setForm({
      id: formato.id,
      nombre: formato.nombre || '',
      cantidad_musicos: Number(formato.cantidad_musicos || 1),
      activo: Boolean(formato.activo),
    });
    setError('');
    setModalOpen(true);
  }

  async function duplicar(formato) {
    try {
      const copia = {
        nombre: `${formato.nombre || 'Formato'} copia`,
        cantidad_musicos: Number(formato.cantidad_musicos || 1),
        activo: Boolean(formato.activo),
      };

      await saveFormato(copia);
      toast.success('Formato duplicado correctamente.');
      await cargar();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'No se pudo duplicar el formato.');
    }
  }

  function cambiar(e) {
    const { name, value, type, checked } = e.target;

    setForm((actual) => ({
      ...actual,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function guardar(e) {
    e.preventDefault();
    setError('');

    if (!form.nombre.trim()) {
      setError('El nombre del formato es obligatorio.');
      return;
    }

    if (Number(form.cantidad_musicos) <= 0) {
      setError('La cantidad de músicos debe ser mayor que cero.');
      return;
    }

    try {
      await saveFormato({
        ...form,
        nombre: form.nombre.trim(),
        cantidad_musicos: Number(form.cantidad_musicos),
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
      const mensaje = err.message || 'No se pudo guardar el formato.';
      setError(mensaje);
      toast.error(mensaje);
    }
  }

  async function borrar(id, nombre) {
    const ok = confirm(
      `¿Deseas borrar definitivamente el formato "${nombre || 'Sin nombre'}"?`
    );

    if (!ok) return;

    try {
      await deleteFormato(id);
      toast.success('Formato eliminado correctamente.');
      await cargar();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'No se pudo borrar el formato.');
    }
  }

  const formatosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return formatos;

    return formatos.filter((f) =>
      String(f.nombre || '')
        .toLowerCase()
        .includes(texto)
    );
  }, [formatos, busqueda]);

  return (
    <div className="dashboard formatos-page">
      <div className="top-bar">
        <div>
          <h1>Formatos</h1>
          <p>Formatos musicales disponibles</p>
        </div>

        <button type="button" onClick={goBack}>
          ← Atrás
        </button>
      </div>

      <div className="actions-row formatos-actions">
        <input
          type="search"
          placeholder="Buscar formato..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <button type="button" onClick={nuevo}>
          + Nuevo Formato
        </button>
      </div>

      <div className="formatos-lista">
        <div className="formatos-header" aria-hidden="true">
          <span>Formato</span>
          <span>Acciones</span>
        </div>

        {cargando ? (
          <div className="formatos-empty">Cargando formatos...</div>
        ) : formatosFiltrados.length === 0 ? (
          <div className="formatos-empty">
            No se encontraron formatos.
          </div>
        ) : (
          formatosFiltrados.map((f) => (
            <article className="formato-row" key={f.id}>
              <div className="formato-nombre">
                <span className="formato-icono">♪</span>
                <strong>{f.nombre || 'Sin nombre'}</strong>
              </div>

              <div className="formato-acciones">
                <button
                  type="button"
                  onClick={() => editar(f)}
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => duplicar(f)}
                >
                  Duplicar
                </button>

                <button
                  type="button"
                  className="danger-btn"
                  onClick={() => borrar(f.id, f.nombre)}
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

            <button type="submit">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
