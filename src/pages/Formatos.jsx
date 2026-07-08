import { useEffect, useState } from 'react';
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

export default function Formatos({ goHome }) {
  const [formatos, setFormatos] = useState([]);
  const [form, setForm] = useState(nuevoRegistro);
  const [modalOpen, setModalOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    const data = await getFormatos();
    setFormatos(data);
  }

  function nuevo() {
    setForm(nuevoRegistro);
    setError('');
    setModalOpen(true);
  }

  function editar(formato) {
    setForm(formato);
    setError('');
    setModalOpen(true);
  }

  function cambiar(e) {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
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
      await saveFormato(form);
      setModalOpen(false);
      setForm(nuevoRegistro);
      cargar();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el formato.');
    }
  }

  async function borrar(id, nombre) {
    const ok = confirm(
      `¿Deseas borrar definitivamente el formato "${nombre || 'Sin nombre'}"?`
    );

    if (!ok) return;

    await deleteFormato(id);
    cargar();
  }

  const formatosFiltrados = formatos.filter((f) =>
    `${f.nombre} ${f.cantidad_musicos}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  return (
    <div className="dashboard">
      <div className="top-bar">
        <div>
          <h1>Formatos</h1>
          <p>Formatos musicales y cantidad de músicos</p>
        </div>

        <button onClick={goHome}>← Dashboard</button>
      </div>

      <div className="actions-row">
        <input
          placeholder="Buscar formato..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <button onClick={nuevo}>➕ Nuevo Formato</button>
      </div>

      <div className="cotizaciones-list">
        {formatosFiltrados.map((f) => (
          <div className="tarifa-item" key={f.id}>
            <div className="cot-numero">🎵 {f.nombre}</div>

            <div className="cot-cliente">
              <strong>{Number(f.cantidad_musicos || 0)} músico(s)</strong>
              <div>
                Este valor se usará para calcular tarifas, dietas y comisiones.
              </div>
            </div>

            <div className="cot-fecha">
              Formato
            </div>

            <div className="cot-total">
              {Number(f.cantidad_musicos || 0)}
            </div>

            <div className="cot-estado">
              <span className={f.activo ? 'estado activa' : 'estado inactiva'}>
                {f.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <div className="cot-menu">
              <button onClick={() => editar(f)}>Editar</button>

              <button
                className="danger-btn"
                onClick={() => borrar(f.id, f.nombre)}
              >
                Borrar
              </button>
            </div>
          </div>
        ))}
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
            <button type="button" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>

            <button type="submit">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}