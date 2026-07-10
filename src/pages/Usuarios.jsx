import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import {
  getUsuarios,
  updateUsuario,
  crearUsuario,
  deleteUsuario,
} from '../lib/usuariosService';
import { getMyProfile } from '../lib/profileService';

const usuarioInicial = {
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
  const [form, setForm] = useState(usuarioInicial);
  const [modoModal, setModoModal] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const esAdmin = profile?.rol === 'admin';
  const modalOpen = Boolean(modoModal);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    try {
      setCargando(true);

      const perfil = await getMyProfile();
      setProfile(perfil);

      const data = await getUsuarios();
      const lista = Array.isArray(data) ? data : [];

      if (perfil?.rol === 'admin') {
        setUsuarios(lista);
      } else {
        setUsuarios(lista.filter((usuario) => usuario.id === perfil?.id));
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'No se pudieron cargar los usuarios.');
    } finally {
      setCargando(false);
    }
  }

  function cerrarModal() {
    setModoModal(null);
    setForm(usuarioInicial);
    setError('');
  }

  function abrirNuevo() {
    setForm(usuarioInicial);
    setError('');
    setModoModal('nuevo');
  }

  function editar(usuario) {
    setForm({
      id: usuario.id,
      nombre: usuario.nombre || '',
      email: '',
      password: '',
      rol: usuario.rol || 'vendedor',
      comision_porcentaje: Number(usuario.comision_porcentaje ?? 10),
      activo: Boolean(usuario.activo ?? true),
    });

    setError('');
    setModoModal('editar');
  }

  function duplicarUsuario(usuario) {
    if (!esAdmin) {
      toast.error('No tienes permiso para duplicar usuarios.');
      return;
    }

    setForm({
      nombre: `${usuario.nombre || 'Usuario'} copia`,
      email: '',
      password: '',
      rol: usuario.rol || 'vendedor',
      comision_porcentaje: Number(usuario.comision_porcentaje ?? 10),
      activo: Boolean(usuario.activo ?? true),
    });

    setError('');
    setModoModal('duplicar');
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
      setError('El nombre es obligatorio.');
      return;
    }

    try {
      if (modoModal === 'editar') {
        const cambios = esAdmin
          ? {
              nombre: form.nombre.trim(),
              rol: form.rol,
              comision_porcentaje: Number(form.comision_porcentaje || 0),
              activo: Boolean(form.activo),
            }
          : {
              nombre: form.nombre.trim(),
            };

        await updateUsuario(form.id, cambios);
        toast.success('Usuario actualizado correctamente.');
      } else {
        if (!esAdmin) {
          setError('No tienes permiso para crear usuarios.');
          return;
        }

        if (!form.email.trim()) {
          setError('El email es obligatorio.');
          return;
        }

        if (!form.password.trim()) {
          setError('La contraseña temporal es obligatoria.');
          return;
        }

        await crearUsuario({
          nombre: form.nombre.trim(),
          email: form.email.trim(),
          password: form.password,
          rol: form.rol,
          comision_porcentaje: Number(form.comision_porcentaje || 0),
          activo: Boolean(form.activo),
        });

        toast.success(
          modoModal === 'duplicar'
            ? 'Copia del usuario creada correctamente.'
            : 'Usuario creado correctamente.'
        );
      }

      cerrarModal();
      await cargar();
    } catch (err) {
      console.error(err);
      const mensaje = err.message || 'No se pudo guardar el usuario.';
      setError(mensaje);
      toast.error(mensaje);
    }
  }

  async function borrarUsuario(usuario) {
    if (!esAdmin) {
      toast.error('No tienes permiso para borrar usuarios.');
      return;
    }

    if (usuario.id === profile?.id) {
      toast.error('No puedes borrar tu propio usuario.');
      return;
    }

    const confirmar = confirm(
      `¿Deseas borrar definitivamente el usuario "${usuario.nombre || usuario.email}"?`
    );

    if (!confirmar) return;

    try {
      await deleteUsuario(usuario.id);
      toast.success('Usuario eliminado correctamente.');
      await cargar();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'No se pudo borrar el usuario.');
    }
  }

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return usuarios;

    return usuarios.filter((usuario) =>
      String(usuario.nombre || '')
        .toLowerCase()
        .includes(texto)
    );
  }, [usuarios, busqueda]);

  return (
    <div className="dashboard usuarios-simple-page">
      <div className="top-bar">
        <div>
          <h1>Usuarios</h1>
          <p>Administración del equipo</p>
        </div>

        <button type="button" onClick={goHome}>
          ← Dashboard
        </button>
      </div>

      <div className="actions-row usuarios-simple-actions">
        <input
          type="search"
          placeholder="Buscar usuario..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        {esAdmin && (
          <button type="button" onClick={abrirNuevo}>
            + Nuevo Usuario
          </button>
        )}
      </div>

      <div className="usuarios-simple-lista">
        <div className="usuarios-simple-header" aria-hidden="true">
          <span>Usuario</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>

        {cargando ? (
          <div className="usuarios-simple-empty">
            Cargando usuarios...
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="usuarios-simple-empty">
            No se encontraron usuarios.
          </div>
        ) : (
          usuariosFiltrados.map((usuario) => (
            <article
              className="usuario-simple-row"
              key={usuario.id}
            >
              <div className="usuario-simple-nombre">
                <span className="usuario-simple-avatar">
                  {(usuario.nombre || usuario.email || 'U')
                    .trim()
                    .slice(0, 1)
                    .toUpperCase()}
                </span>

                <strong>{usuario.nombre || 'Sin nombre'}</strong>
              </div>

              <div className="usuario-simple-estado">
                <span
                  className={
                    usuario.activo
                      ? 'usuario-badge activo'
                      : 'usuario-badge inactivo'
                  }
                >
                  {usuario.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="usuario-simple-acciones">
                <button
                  type="button"
                  onClick={() => editar(usuario)}
                >
                  Editar
                </button>

                {esAdmin && (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => duplicarUsuario(usuario)}
                  >
                    Duplicar
                  </button>
                )}

                {esAdmin && usuario.id !== profile?.id && (
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => borrarUsuario(usuario)}
                  >
                    Borrar
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      <Modal
        open={modalOpen}
        title={
          modoModal === 'editar'
            ? 'Editar Usuario'
            : modoModal === 'duplicar'
              ? 'Duplicar Usuario'
              : 'Nuevo Usuario'
        }
        onClose={cerrarModal}
      >
        <form onSubmit={guardar}>
          <label>Nombre *</label>
          <input
            name="nombre"
            value={form.nombre}
            onChange={cambiar}
          />

          {modoModal !== 'editar' && (
            <>
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={cambiar}
              />

              <label>Contraseña temporal *</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={cambiar}
              />
            </>
          )}

          {esAdmin && (
            <>
              <label>Rol</label>
              <select
                name="rol"
                value={form.rol}
                onChange={cambiar}
              >
                <option value="admin">Admin</option>
                <option value="vendedor">Vendedor</option>
              </select>

              <label>Comisión %</label>
              <input
                type="number"
                name="comision_porcentaje"
                value={form.comision_porcentaje}
                onChange={cambiar}
                min="0"
                max="100"
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
            </>
          )}

          {error && <p className="error">{error}</p>}

          <div className="modal-actions">
            <button type="button" onClick={cerrarModal}>
              Cancelar
            </button>

            <button type="submit">
              {modoModal === 'editar'
                ? 'Guardar cambios'
                : modoModal === 'duplicar'
                  ? 'Crear copia'
                  : 'Crear usuario'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
