import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import { getClientes, saveCliente, deleteCliente } from '../lib/clientesService';

const nuevoCliente = {
  nombre: '',
  empresa: '',
  rnc: '',
  telefono: '',
  email: '',
};

export default function Clientes({ goHome }) {
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(nuevoCliente);
  const [modalOpen, setModalOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    const data = await getClientes();
    setClientes(data);
  }

  function nuevo() {
    setForm(nuevoCliente);
    setError('');
    setModalOpen(true);
  }

  function editar(cliente) {
    setForm(cliente);
    setError('');
    setModalOpen(true);
  }

  async function guardar(e) {
    e.preventDefault();
    setError('');

    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }

    if (!form.telefono.trim()) {
      setError('El teléfono es obligatorio.');
      return;
    }

    try {
      await saveCliente(form);
      setModalOpen(false);
      setForm(nuevoCliente);
      cargar();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el cliente.');
    }
  }

  async function borrar(id, nombre) {
    const ok = confirm(
      `¿Deseas borrar definitivamente el cliente "${nombre || 'Sin nombre'}"?`
    );

    if (!ok) return;

    await deleteCliente(id);
    cargar();
  }

  function cambiar(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }

  const clientesFiltrados = clientes.filter((c) =>
    `${c.nombre} ${c.empresa} ${c.rnc} ${c.telefono} ${c.email}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  return (
    <div className="dashboard">
      <div className="top-bar">
        <div>
          <h1>Clientes</h1>
          <p>Nombre y teléfono son obligatorios</p>
        </div>

        <button onClick={goHome}>← Dashboard</button>
      </div>

      <div className="actions-row">
        <input
          placeholder="Buscar cliente..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <button onClick={nuevo}>➕ Nuevo Cliente</button>
      </div>

      <div className="cotizaciones-list">
        {clientesFiltrados.map((c) => (
          <div className="cotizacion-item" key={c.id}>
            <div className="cot-numero">👤 {c.nombre || 'Sin nombre'}</div>

            <div className="cot-cliente">
              <strong>{c.empresa || 'Sin empresa'}</strong>
              <div>RNC: {c.rnc || '-'}</div>
            </div>

            <div className="cot-fecha">{c.telefono || '-'}</div>

            <div className="cot-estado">{c.email || '-'}</div>

            <div className="cot-menu">
              <button onClick={() => editar(c)}>Editar</button>

              <button
                className="danger-btn"
                onClick={() => borrar(c.id, c.nombre)}
              >
                Borrar
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        title={form.id ? 'Editar Cliente' : 'Nuevo Cliente'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={guardar}>
          <label>Nombre *</label>
          <input name="nombre" value={form.nombre} onChange={cambiar} />

          <label>Empresa</label>
          <input name="empresa" value={form.empresa || ''} onChange={cambiar} />

          <label>RNC</label>
          <input name="rnc" value={form.rnc || ''} onChange={cambiar} />

          <label>Teléfono *</label>
          <input name="telefono" value={form.telefono || ''} onChange={cambiar} />

          <label>Correo Electrónico</label>
          <input
            name="email"
            type="email"
            value={form.email || ''}
            onChange={cambiar}
          />

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