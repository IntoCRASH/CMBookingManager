import { useEffect, useState } from 'react';
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

export default function Tarifas({ goHome }) {
  const [provincias, setProvincias] = useState([]);
  const [form, setForm] = useState(nuevoRegistro);
  const [modalOpen, setModalOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    const data = await getProvincias();
    setProvincias(data);
  }

  function nuevaProvincia() {
    setForm(nuevoRegistro);
    setModalOpen(true);
  }

  function editar(p) {
    setForm(p);
    setModalOpen(true);
  }

  async function guardar(e) {
    e.preventDefault();

    if (!form.nombre.trim()) {
      alert('Debes escribir el nombre de la provincia.');
      return;
    }

    await saveProvincia(form);

    setModalOpen(false);
    setForm(nuevoRegistro);
    cargar();
  }

  async function borrar(id, nombre) {
    const ok = confirm(
      `¿Deseas borrar definitivamente la provincia "${nombre || 'Sin nombre'}"?`
    );

    if (!ok) return;

    await deleteProvincia(id);
    cargar();
  }

  function cambiar(e) {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  }

  const provinciasFiltradas = provincias.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="dashboard">
      <div className="top-bar">
        <div>
          <h1>Tarifas</h1>
          <p>Provincias y costos base</p>
        </div>

        <button onClick={goHome}>← Dashboard</button>
      </div>

      <div className="actions-row">
        <input
          placeholder="Buscar provincia..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <button onClick={nuevaProvincia}>➕ Nueva Provincia</button>
      </div>

      <div className="cotizaciones-list">
        {provinciasFiltradas.map((p) => (
          <div className="tarifa-item" key={p.id}>
            <div className="cot-numero">📍 {p.nombre}</div>

            <div className="cot-cliente">
              <strong>
                Honorarios: RD$ {Number(p.honorarios || 0).toLocaleString()}
              </strong>
              <div>
                Músico: RD$ {Number(p.tarifa_musico || 0).toLocaleString()} ·
                Dieta: RD$ {Number(p.dieta_musico || 0).toLocaleString()}
              </div>
            </div>

            <div className="cot-fecha">
              Transporte: RD$ {Number(p.transporte || 0).toLocaleString()}
            </div>

            <div className="cot-total">
              RD$ {Number(p.sonido || 0).toLocaleString()}
            </div>

            <div className="cot-estado">
              <span className={p.activa ? 'estado activa' : 'estado inactiva'}>
                {p.activa ? 'Activa' : 'Inactiva'}
              </span>
            </div>

            <div className="cot-menu">
              <button onClick={() => editar(p)}>Editar</button>

              <button
                className="danger-btn"
                onClick={() => borrar(p.id, p.nombre)}
              >
                Borrar
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        title={form.id ? 'Editar Provincia' : 'Nueva Provincia'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={guardar}>
          <label>Provincia</label>
          <input name="nombre" value={form.nombre} onChange={cambiar} />

          <label>Honorarios Cruzmonty</label>
          <input
            name="honorarios"
            type="number"
            value={form.honorarios}
            onChange={cambiar}
          />

          <label>Tarifa por músico</label>
          <input
            name="tarifa_musico"
            type="number"
            value={form.tarifa_musico}
            onChange={cambiar}
          />

          <label>Dieta por músico</label>
          <input
            name="dieta_musico"
            type="number"
            value={form.dieta_musico}
            onChange={cambiar}
          />

          <label>Transporte</label>
          <input
            name="transporte"
            type="number"
            value={form.transporte}
            onChange={cambiar}
          />

          <label>Alquiler de sonido</label>
          <input
            name="sonido"
            type="number"
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