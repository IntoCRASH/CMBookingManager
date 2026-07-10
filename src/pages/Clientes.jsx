import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import {
  getClientes,
  saveCliente,
  deleteCliente,
} from '../lib/clientesService';

const clienteInicial = {
  nombre: '',
  empresa: '',
  rnc: '',
  telefono: '',
  email: '',
};

export default function Clientes({ goHome }) {
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(clienteInicial);
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
      const data = await getClientes();
      setClientes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'No se pudieron cargar los clientes.');
    } finally {
      setCargando(false);
    }
  }

  function abrirNuevo() {
    setForm(clienteInicial);
    setError('');
    setModalOpen(true);
  }

  function editar(cliente) {
    setForm({
      id: cliente.id,
      nombre: cliente.nombre || '',
      empresa: cliente.empresa || '',
      rnc: cliente.rnc || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
    });
    setError('');
    setModalOpen(true);
  }

  function cambiar(e) {
    const { name, value } = e.target;

    setForm((actual) => ({
      ...actual,
      [name]: value,
    }));
  }

  async function guardar(e) {
    e.preventDefault();
    setError('');

    const nombre = form.nombre.trim();
    const telefono = form.telefono.trim();

    if (!nombre) {
      setError('El nombre es obligatorio.');
      return;
    }

    if (!telefono) {
      setError('El teléfono es obligatorio.');
      return;
    }

    try {
      await saveCliente({
        ...form,
        nombre,
        telefono,
        empresa: form.empresa.trim() || null,
        rnc: form.rnc.trim() || null,
        email: form.email.trim() || null,
      });

      toast.success(
        form.id
          ? 'Cliente actualizado correctamente.'
          : 'Cliente creado correctamente.'
      );

      setModalOpen(false);
      setForm(clienteInicial);
      await cargar();
    } catch (err) {
      console.error(err);
      const mensaje = err.message || 'No se pudo guardar el cliente.';
      setError(mensaje);
      toast.error(mensaje);
    }
  }

  async function borrar(cliente) {
    const confirmado = confirm(
      `¿Deseas borrar definitivamente el cliente "${cliente.nombre || 'Sin nombre'}"?`
    );

    if (!confirmado) return;

    try {
      await deleteCliente(cliente.id);
      toast.success('Cliente eliminado correctamente.');
      await cargar();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'No se pudo borrar el cliente.');
    }
  }

  const clientesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return clientes;

    return clientes.filter((cliente) =>
      [
        cliente.nombre,
        cliente.empresa,
        cliente.rnc,
        cliente.telefono,
        cliente.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(texto)
    );
  }, [clientes, busqueda]);

  return (
    <div className="dashboard clientes-page">
      <div className="top-bar clientes-topbar">
        <div>
          <h1>Clientes</h1>
          <p>Nombre y teléfono son obligatorios</p>
        </div>

        <button type="button" onClick={goHome}>
          ← Dashboard
        </button>
      </div>

      <div className="actions-row clientes-actions">
        <input
          type="search"
          placeholder="Buscar cliente..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <button type="button" onClick={abrirNuevo}>
          + Nuevo Cliente
        </button>
      </div>

      <div className="clientes-table">
        <div className="clientes-table-header" aria-hidden="true">
          <span>Cliente</span>
          <span>Empresa / RNC</span>
          <span>Teléfono</span>
          <span>Email</span>
          <span>Acciones</span>
        </div>

        {cargando ? (
          <div className="clientes-empty">Cargando clientes...</div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="clientes-empty">
            {busqueda
              ? 'No se encontraron clientes con esa búsqueda.'
              : 'Todavía no hay clientes registrados.'}
          </div>
        ) : (
          clientesFiltrados.map((cliente) => (
            <article className="cliente-row" key={cliente.id}>
              <div className="cliente-identidad">
                <span className="cliente-avatar">
                  {(cliente.nombre || 'C').slice(0, 1).toUpperCase()}
                </span>

                <div>
                  <strong>{cliente.nombre || 'Sin nombre'}</strong>
                  <small>Cliente</small>
                </div>
              </div>

              <div className="cliente-empresa" data-label="Empresa / RNC">
                <strong>{cliente.empresa || 'Sin empresa'}</strong>
                <small>RNC: {cliente.rnc || '-'}</small>
              </div>

              <div className="cliente-contacto" data-label="Teléfono">
                {cliente.telefono || '-'}
              </div>

              <div className="cliente-email" data-label="Email">
                {cliente.email || '-'}
              </div>

              <div className="cliente-acciones">
                <button type="button" onClick={() => editar(cliente)}>
                  Editar
                </button>

                <button
                  type="button"
                  className="danger-btn"
                  onClick={() => borrar(cliente)}
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
        title={form.id ? 'Editar Cliente' : 'Nuevo Cliente'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={guardar}>
          <label>Nombre *</label>
          <input
            name="nombre"
            value={form.nombre}
            onChange={cambiar}
            autoComplete="name"
          />

          <label>Empresa</label>
          <input
            name="empresa"
            value={form.empresa}
            onChange={cambiar}
          />

          <label>RNC</label>
          <input
            name="rnc"
            value={form.rnc}
            onChange={cambiar}
          />

          <label>Teléfono *</label>
          <input
            name="telefono"
            value={form.telefono}
            onChange={cambiar}
            autoComplete="tel"
          />

          <label>Correo electrónico</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={cambiar}
            autoComplete="email"
          />

          {error && <p className="error">{error}</p>}

          <div className="modal-actions">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </button>

            <button type="submit">
              {form.id ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
