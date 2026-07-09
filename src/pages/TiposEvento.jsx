import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import {
  getTodosTiposEventoConfig,
  saveTipoEventoConfig,
  deleteTipoEventoConfig,
} from '../lib/tiposEventoConfigService';

const nuevoRegistro = {
  nombre: '',
  multiplicador_honorarios: 1,
  multiplicador_musicos: 1,
  multiplicador_sonido: 1,
  multiplicador_road_manager: 1,
  ensayo_extra: 0,
  produccion_extra: 0,
  activo: true,
};

export default function TiposEvento({ goHome }) {
  const [tiposEvento, setTiposEvento] = useState([]);
  const [form, setForm] = useState(nuevoRegistro);
  const [modalOpen, setModalOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    const data = await getTodosTiposEventoConfig();
    setTiposEvento(data);
  }

  function nuevo() {
    setForm(nuevoRegistro);
    setError('');
    setModalOpen(true);
  }

  function editar(tipo) {
    setForm({
      ...tipo,
      multiplicador_honorarios: Number(tipo.multiplicador_honorarios || 1),
      multiplicador_musicos: Number(tipo.multiplicador_musicos || 1),
      multiplicador_sonido: Number(tipo.multiplicador_sonido || 1),
      multiplicador_road_manager: Number(tipo.multiplicador_road_manager || 1),
      ensayo_extra: Number(tipo.ensayo_extra || 0),
      produccion_extra: Number(tipo.produccion_extra || 0),
      activo: Boolean(tipo.activo),
    });

    setError('');
    setModalOpen(true);
  }

  async function duplicar(tipo) {
    const copia = {
      ...tipo,
      nombre: `${tipo.nombre || 'Tipo de evento'} copia`,
      multiplicador_honorarios: Number(tipo.multiplicador_honorarios || 1),
      multiplicador_musicos: Number(tipo.multiplicador_musicos || 1),
      multiplicador_sonido: Number(tipo.multiplicador_sonido || 1),
      multiplicador_road_manager: Number(tipo.multiplicador_road_manager || 1),
      ensayo_extra: Number(tipo.ensayo_extra || 0),
      produccion_extra: Number(tipo.produccion_extra || 0),
      activo: Boolean(tipo.activo),
    };

    delete copia.id;
    delete copia.created_at;
    delete copia.updated_at;

    try {
      await saveTipoEventoConfig(copia);
      cargar();
    } catch (err) {
      alert(err.message || 'No se pudo duplicar el tipo de evento.');
    }
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
      setError('El nombre del tipo de evento es obligatorio.');
      return;
    }

    if (Number(form.multiplicador_honorarios || 0) <= 0) {
      setError('El multiplicador de honorarios debe ser mayor que cero.');
      return;
    }

    if (Number(form.multiplicador_musicos || 0) <= 0) {
      setError('El multiplicador de músicos debe ser mayor que cero.');
      return;
    }

    if (Number(form.multiplicador_sonido || 0) <= 0) {
      setError('El multiplicador de sonido debe ser mayor que cero.');
      return;
    }

    if (Number(form.multiplicador_road_manager || 0) <= 0) {
      setError('El multiplicador de road manager debe ser mayor que cero.');
      return;
    }

    if (Number(form.ensayo_extra || 0) < 0) {
      setError('El ensayo extra no puede ser negativo.');
      return;
    }

    if (Number(form.produccion_extra || 0) < 0) {
      setError('La producción extra no puede ser negativa.');
      return;
    }

    try {
      await saveTipoEventoConfig({
        ...form,
        multiplicador_honorarios: Number(form.multiplicador_honorarios || 1),
        multiplicador_musicos: Number(form.multiplicador_musicos || 1),
        multiplicador_sonido: Number(form.multiplicador_sonido || 1),
        multiplicador_road_manager: Number(form.multiplicador_road_manager || 1),
        ensayo_extra: Number(form.ensayo_extra || 0),
        produccion_extra: Number(form.produccion_extra || 0),
        activo: Boolean(form.activo),
      });

      setModalOpen(false);
      setForm(nuevoRegistro);
      cargar();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el tipo de evento.');
    }
  }

  async function borrar(id, nombre) {
    const ok = confirm(
      `¿Deseas borrar definitivamente el tipo de evento "${nombre || 'Sin nombre'}"?`
    );

    if (!ok) return;

    try {
      await deleteTipoEventoConfig(id);
      cargar();
    } catch (err) {
      alert(err.message || 'No se pudo borrar el tipo de evento.');
    }
  }

  const tiposFiltrados = tiposEvento.filter((tipo) =>
    `${tipo.nombre} ${tipo.multiplicador_honorarios} ${tipo.multiplicador_musicos} ${tipo.multiplicador_sonido} ${tipo.multiplicador_road_manager} ${tipo.ensayo_extra} ${tipo.produccion_extra}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  return (
    <div className="dashboard">
      <div className="top-bar">
        <div>
          <h1>Tipos de Evento</h1>
          <p>Configura multiplicadores, ensayos y producción por tipo de actividad</p>
        </div>

        <button onClick={goHome}>← Dashboard</button>
      </div>

      <div className="actions-row">
        <input
          placeholder="Buscar tipo de evento..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <button onClick={nuevo}>➕ Nuevo Tipo</button>
      </div>

      <div className="cotizaciones-list">
        {tiposFiltrados.map((tipo) => (
          <div className="tarifa-item" key={tipo.id}>
            <div className="cot-numero">🎤 {tipo.nombre}</div>

            <div className="cot-cliente">
              <strong>
                Honorarios: x{Number(tipo.multiplicador_honorarios || 1)} · Músicos: x{Number(tipo.multiplicador_musicos || 1)}
              </strong>
              <div>
                Sonido: x{Number(tipo.multiplicador_sonido || 1)} · Road Manager: x{Number(tipo.multiplicador_road_manager || 1)} · Ensayo: RD${' '}
                {Number(tipo.ensayo_extra || 0).toLocaleString()} · Producción: RD${' '}
                {Number(tipo.produccion_extra || 0).toLocaleString()}
              </div>
            </div>

            <div className="cot-fecha">Tipo de evento</div>

            <div className="cot-total">
              x{Number(tipo.multiplicador_honorarios || 1)}
            </div>

            <div className="cot-estado">
              <span className={tipo.activo ? 'estado activa' : 'estado inactiva'}>
                {tipo.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <div className="cot-menu">
              <button onClick={() => editar(tipo)}>Editar</button>

              <button onClick={() => duplicar(tipo)}>
                Duplicar
              </button>

              <button
                className="danger-btn"
                onClick={() => borrar(tipo.id, tipo.nombre)}
              >
                Borrar
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        title={form.id ? 'Editar Tipo de Evento' : 'Nuevo Tipo de Evento'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={guardar}>
          <label>Nombre del tipo de evento *</label>
          <input
            name="nombre"
            value={form.nombre}
            onChange={cambiar}
            placeholder="Ej: Privado, Boda, Festival, Corporativo"
          />

          <label>Multiplicador de honorarios *</label>
          <input
            name="multiplicador_honorarios"
            type="number"
            min="0.1"
            step="0.05"
            value={form.multiplicador_honorarios}
            onChange={cambiar}
          />

          <label>Multiplicador de músicos *</label>
          <input
            name="multiplicador_musicos"
            type="number"
            min="0.1"
            step="0.05"
            value={form.multiplicador_musicos}
            onChange={cambiar}
          />

          <label>Multiplicador de sonido *</label>
          <input
            name="multiplicador_sonido"
            type="number"
            min="0.1"
            step="0.05"
            value={form.multiplicador_sonido}
            onChange={cambiar}
          />

          <label>Multiplicador Road Manager *</label>
          <input
            name="multiplicador_road_manager"
            type="number"
            min="0.1"
            step="0.05"
            value={form.multiplicador_road_manager}
            onChange={cambiar}
          />

          <label>Ensayo extra</label>
          <input
            name="ensayo_extra"
            type="number"
            min="0"
            step="100"
            value={form.ensayo_extra}
            onChange={cambiar}
          />

          <label>Producción extra</label>
          <input
            name="produccion_extra"
            type="number"
            min="0"
            step="100"
            value={form.produccion_extra}
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
