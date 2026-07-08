import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import {
  getUsuarios,
  updateUsuario,
  crearUsuario,
  deleteUsuario,
} from '../lib/usuariosService';
import { getMyProfile } from '../lib/profileService';

const nuevoUsuario = {
  nombre: '',
  email: '',
  password: '',
  rol: 'vendedor',
  comision_porcentaje: 10,
  activo: true,
};

export default function Usuarios({ goHome }) {
  const [usuarios, setUsuarios] = useState([]);
  const [profile, setProfile] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({});
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [nuevo, setNuevo] = useState(nuevoUsuario);
  const [error, setError] = useState('');

  const esAdmin = profile?.rol === 'admin';

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    const perfil = await getMyProfile();
    setProfile(perfil);

    const data = await getUsuarios();

    if (perfil?.rol === 'admin') {
      setUsuarios(data);
    } else {
      setUsuarios(data.filter((u) => u.id === perfil?.id));
    }
  }

  function abrirNuevo() {
    setNuevo(nuevoUsuario);
    setError('');
    setModalNuevoOpen(true);
  }

  function editar(u) {
    setEditandoId(u.id);
    setForm({
      nombre: u.nombre || '',
      rol: u.rol || 'vendedor',
      comision_porcentaje: u.comision_porcentaje ?? 10,
      activo: u.activo ?? true,
    });
  }

  function cambiar(e) {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  }

  function cambiarNuevo(e) {
    const { name, value, type, checked } = e.target;

    setNuevo({
      ...nuevo,
      [name]: type === 'checkbox' ? checked : value,
    });
  }

  async function guardar(id) {
    const cambios = esAdmin
      ? {
          nombre: form.nombre,
          rol: form.rol,
          comision_porcentaje: Number(form.comision_porcentaje || 0),
          activo: form.activo,
        }
      : {
          nombre: form.nombre,
        };

    await updateUsuario(id, cambios);

    setEditandoId(null);
    setForm({});
    cargar();
  }

  async function guardarNuevo(e) {
    e.preventDefault();
    setError('');

    if (!esAdmin) {
      setError('No tienes permiso para crear usuarios.');
      return;
    }

    if (!nuevo.nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }

    if (!nuevo.email.trim()) {
      setError('El email es obligatorio.');
      return;
    }

    if (!nuevo.password.trim()) {
      setError('La contraseña temporal es obligatoria.');
      return;
    }

    try {
      await crearUsuario({
        nombre: nuevo.nombre.trim(),
        email: nuevo.email.trim(),
        password: nuevo.password,
        rol: nuevo.rol,
        comision_porcentaje: Number(nuevo.comision_porcentaje || 0),
        activo: nuevo.activo,
      });

      setNuevo(nuevoUsuario);
      setModalNuevoOpen(false);
      cargar();
    } catch (err) {
      setError(err.message || 'No se pudo crear el usuario.');
    }
  }

  async function borrarUsuario(u) {
    if (!esAdmin) {
      alert('No tienes permiso para borrar usuarios.');
      return;
    }

    if (u.id === profile?.id) {
      alert('No puedes borrar tu propio usuario.');
      return;
    }

    const confirmar = confirm(
      `¿Deseas borrar definitivamente el usuario "${u.nombre || u.email}"?`
    );

    if (!confirmar) return;

    await deleteUsuario(u.id);
    cargar();
  }

  return (
    <div className="dashboard">
      <div className="top-bar">
        <div>
          <h1>Usuarios</h1>
          <p>Roles y comisiones del equipo</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {esAdmin && (
            <button onClick={abrirNuevo}>+ Nuevo Usuario</button>
          )}

          <button onClick={goHome}>← Dashboard</button>
        </div>
      </div>

      <div className="cotizaciones-list">
        {usuarios.map((u) => (
          <div key={u.id} className="cotizacion-item">
            {editandoId === u.id ? (
              <>
                <div>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={cambiar}
                    placeholder="Nombre"
                  />
                </div>

                {esAdmin ? (
                  <>
                    <div>
                      <select name="rol" value={form.rol} onChange={cambiar}>
                        <option value="admin">Admin</option>
                        <option value="vendedor">Vendedor</option>
                      </select>
                    </div>

                    <div>
                      <input
                        type="number"
                        name="comision_porcentaje"
                        value={form.comision_porcentaje}
                        onChange={cambiar}
                        min="0"
                        max="100"
                      />
                    </div>

                    <div>
                      <label className="check-row">
                        <input
                          type="checkbox"
                          name="activo"
                          checked={form.activo}
                          onChange={cambiar}
                        />
                        Activo
                      </label>
                    </div>
                  </>
                ) : (
                  <>
                    <div>{form.rol}</div>
                    <div>Comisión: {form.comision_porcentaje}%</div>
                    <div>{form.activo ? 'Activo' : 'Inactivo'}</div>
                  </>
                )}

                <div className="cot-menu">
                  <button onClick={() => guardar(u.id)}>Guardar</button>
                  <button onClick={() => setEditandoId(null)}>Cancelar</button>
                </div>
              </>
            ) : (
              <>
                <div className="cot-numero">{u.nombre || 'Sin nombre'}</div>

                <div className="cot-cliente">
                  <strong>{u.email || 'Sin email'}</strong>
                  <div>{u.rol || 'vendedor'}</div>
                </div>

                <div className="cot-fecha">
                  Comisión: {Number(u.comision_porcentaje || 0)}%
                </div>

                <div className="cot-estado">
                  {u.activo ? 'Activo' : 'Inactivo'}
                </div>

                <div className="cot-menu">
                  <button onClick={() => editar(u)}>Editar</button>

                  {esAdmin && u.id !== profile?.id && (
                    <button
                      className="danger-btn"
                      onClick={() => borrarUsuario(u)}
                    >
                      Borrar
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <Modal
        open={modalNuevoOpen}
        title="Nuevo Usuario"
        onClose={() => setModalNuevoOpen(false)}
      >
        <form onSubmit={guardarNuevo}>
          <label>Nombre *</label>
          <input name="nombre" value={nuevo.nombre} onChange={cambiarNuevo} />

          <label>Email *</label>
          <input
            type="email"
            name="email"
            value={nuevo.email}
            onChange={cambiarNuevo}
          />

          <label>Contraseña temporal *</label>
          <input
            type="password"
            name="password"
            value={nuevo.password}
            onChange={cambiarNuevo}
          />

          <label>Rol</label>
          <select name="rol" value={nuevo.rol} onChange={cambiarNuevo}>
            <option value="admin">Admin</option>
            <option value="vendedor">Vendedor</option>
          </select>

          <label>Comisión %</label>
          <input
            type="number"
            name="comision_porcentaje"
            value={nuevo.comision_porcentaje}
            onChange={cambiarNuevo}
            min="0"
            max="100"
          />

          <label className="check-row">
            <input
              type="checkbox"
              name="activo"
              checked={nuevo.activo}
              onChange={cambiarNuevo}
            />
            Activo
          </label>

          {error && <p className="error">{error}</p>}

          <div className="modal-actions">
            <button type="button" onClick={() => setModalNuevoOpen(false)}>
              Cancelar
            </button>

            <button type="submit">Crear usuario</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}