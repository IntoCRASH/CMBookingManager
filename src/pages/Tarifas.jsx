import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import {
  getProvincias,
  saveProvincia,
  deleteProvincia,
} from '../lib/provinciasService';

const nuevoRegistro = {
  nombre: '',
  honorarios: 0,
  tarifa_musico: 0,
  dieta_musico: 0,
  transporte: 0,
  sonido: 0,
  activa: true,
};

export default function Tarifas({ goBack }) {
  const [provincias, setProvincias] = useState([]);
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
      const data = await getProvincias();
      setProvincias(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'No se pudieron cargar las tarifas.');
    } finally {
      setCargando(false);
    }
  }

  function nuevaProvincia() {
    setForm(nuevoRegistro);
    setError('');
    setModalOpen(true);
  }

  function editar(provincia) {
    setForm({
      id: provincia.id,
      nombre: provincia.nombre || '',
      honorarios: Number(provincia.honorarios || 0),
      tarifa_musico: Number(provincia.tarifa_musico || 0),
      dieta_musico: Number(provincia.dieta_musico || 0),
      transporte: Number(provincia.transporte || 0),
      sonido: Number(provincia.sonido || 0),
      activa: Boolean(provincia.activa),
    });

    setError('');
    setModalOpen(true);
  }

  async function duplicarProvincia(provincia) {
    try {
      const copia = {
        nombre: `${provincia.nombre || 'Zona'} copia`,
        honorarios: Number(provincia.honorarios || 0),
        tarifa_musico: Number(provincia.tarifa_musico || 0),
        dieta_musico: Number(provincia.dieta_musico || 0),
        transporte: Number(provincia.transporte || 0),
        sonido: Number(provincia.sonido || 0),
        activa: Boolean(provincia.activa),
      };

      await saveProvincia(copia);
      toast.success('Zona duplicada correctamente.');
      await cargar();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'No se pudo duplicar la zona.');
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
      setError('Debes escribir el nombre de la zona.');
      return;
    }

    try {
      await saveProvincia({
        ...form,
        nombre: form.nombre.trim(),
        honorarios: Number(form.honorarios || 0),
        tarifa_musico: Number(form.tarifa_musico || 0),
        dieta_musico: Number(form.dieta_musico || 0),
        transporte: Number(form.transporte || 0),
        sonido: Number(form.sonido || 0),
        activa: Boolean(form.activa),
      });

      toast.success(
        form.id
          ? 'Zona actualizada correctamente.'
          : 'Zona creada correctamente.'
      );

      setModalOpen(false);
      setForm(nuevoRegistro);
      await cargar();
    } catch (err) {
      console.error(err);
      const mensaje = err.message || 'No se pudo guardar la zona.';
      setError(mensaje);
      toast.error(mensaje);
    }
  }

  async function borrar(id, nombre) {
    const ok = confirm(
      `¿Deseas borrar definitivamente la zona "${nombre || 'Sin nombre'}"?`
    );

    if (!ok) return;

    try {
      await deleteProvincia(id);
      toast.success('Zona eliminada correctamente.');
      await cargar();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'No se pudo borrar la zona.');
    }
  }

  const provinciasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return provincias;

    return provincias.filter((provincia) =>
      String(provincia.nombre || '')
        .toLowerCase()
        .includes(texto)
    );
  }, [provincias, busqueda]);

  return (
    <div className="dashboard tarifas-page">
      <div className="top-bar">
        <div>
          <h1>Tarifas</h1>
          <p>Zonas y costos base</p>
        </div>

        <button type="button" onClick={goBack}>
          ← Atrás
        </button>
      </div>

      <div className="actions-row tarifas-actions">
        <input
          type="search"
          placeholder="Buscar zona..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <button type="button" onClick={nuevaProvincia}>
          + Nueva Zona
        </button>
      </div>

      <div className="tarifas-lista">
        <div className="tarifas-header" aria-hidden="true">
          <span>Zona</span>
          <span>Acciones</span>
        </div>

        {cargando ? (
          <div className="tarifas-empty">
            Cargando zonas...
          </div>
        ) : provinciasFiltradas.length === 0 ? (
          <div className="tarifas-empty">
            No se encontraron zonas.
          </div>
        ) : (
          provinciasFiltradas.map((provincia) => (
            <article
              className="tarifa-row-simple"
              key={provincia.id}
            >
              <div className="tarifa-nombre">
                <span className="tarifa-icono">📍</span>
                <strong>{provincia.nombre || 'Sin nombre'}</strong>
              </div>

              <div className="tarifa-acciones">
                <button
                  type="button"
                  onClick={() => editar(provincia)}
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => duplicarProvincia(provincia)}
                >
                  Duplicar
                </button>

                <button
                  type="button"
                  className="danger-btn"
                  onClick={() =>
                    borrar(provincia.id, provincia.nombre)
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
        title={form.id ? 'Editar Zona' : 'Nueva Zona'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={guardar}>
          <label>Zona *</label>
          <input
            name="nombre"
            value={form.nombre}
            onChange={cambiar}
          />

          <label>Honorarios Cruzmonty</label>
          <input
            name="honorarios"
            type="number"
            min="0"
            value={form.honorarios}
            onChange={cambiar}
          />

          <label>Tarifa por músico</label>
          <input
            name="tarifa_musico"
            type="number"
            min="0"
            value={form.tarifa_musico}
            onChange={cambiar}
          />

          <label>Dieta por músico</label>
          <input
            name="dieta_musico"
            type="number"
            min="0"
            value={form.dieta_musico}
            onChange={cambiar}
          />

          <label>Transporte</label>
          <input
            name="transporte"
            type="number"
            min="0"
            value={form.transporte}
            onChange={cambiar}
          />

          <label>Alquiler de sonido</label>
          <input
            name="sonido"
            type="number"
            min="0"
            value={form.sonido}
            onChange={cambiar}
          />

          <label className="check-row">
            <input
              type="checkbox"
              name="activa"
              checked={form.activa}
              onChange={cambiar}
            />
            Activa
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
