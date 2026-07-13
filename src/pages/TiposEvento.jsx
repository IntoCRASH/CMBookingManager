import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import {
  deleteTipoEventoConfig,
  getTodosTiposEventoConfig,
  saveTipoEventoConfig,
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

export default function TiposEvento({
  workspaceId,
  workspace,
  goBack,
}) {
  const [tiposEvento, setTiposEvento] = useState([]);
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
      setTiposEvento([]);
      setCargando(false);
      return;
    }

    cargar();
  }, [workspaceId]);

  async function cargar() {
    try {
      setCargando(true);
      setError('');

      const data = await getTodosTiposEventoConfig(
        workspaceId
      );

      setTiposEvento(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);

      const mensaje =
        err.message ||
        'No se pudieron cargar los tipos de evento.';

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

  function editar(tipo) {
    setForm({
      id: tipo.id,
      nombre: tipo.nombre || '',
      multiplicador_honorarios: Number(
        tipo.multiplicador_honorarios || 1
      ),
      multiplicador_musicos: Number(
        tipo.multiplicador_musicos || 1
      ),
      multiplicador_sonido: Number(
        tipo.multiplicador_sonido || 1
      ),
      multiplicador_road_manager: Number(
        tipo.multiplicador_road_manager || 1
      ),
      ensayo_extra: Number(tipo.ensayo_extra || 0),
      produccion_extra: Number(
        tipo.produccion_extra || 0
      ),
      activo: Boolean(tipo.activo),
    });

    setError('');
    setModalOpen(true);
  }

  async function duplicar(tipo) {
    if (!workspaceId) {
      toast.error('No hay un Artista activo.');
      return;
    }

    try {
      await saveTipoEventoConfig(
        {
          nombre: `${tipo.nombre || 'Tipo de evento'} copia`,
          multiplicador_honorarios: Number(
            tipo.multiplicador_honorarios || 1
          ),
          multiplicador_musicos: Number(
            tipo.multiplicador_musicos || 1
          ),
          multiplicador_sonido: Number(
            tipo.multiplicador_sonido || 1
          ),
          multiplicador_road_manager: Number(
            tipo.multiplicador_road_manager || 1
          ),
          ensayo_extra: Number(
            tipo.ensayo_extra || 0
          ),
          produccion_extra: Number(
            tipo.produccion_extra || 0
          ),
          activo: Boolean(tipo.activo),
        },
        workspaceId
      );

      toast.success(
        'Tipo de evento duplicado correctamente.'
      );

      await cargar();
    } catch (err) {
      console.error(err);

      toast.error(
        err.message ||
          'No se pudo duplicar el tipo de evento.'
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
      setError(
        'El nombre del tipo de evento es obligatorio.'
      );
      return;
    }

    if (Number(form.multiplicador_honorarios || 0) <= 0) {
      setError(
        'El multiplicador de honorarios debe ser mayor que cero.'
      );
      return;
    }

    if (Number(form.multiplicador_musicos || 0) <= 0) {
      setError(
        'El multiplicador de músicos debe ser mayor que cero.'
      );
      return;
    }

    if (Number(form.multiplicador_sonido || 0) <= 0) {
      setError(
        'El multiplicador de sonido debe ser mayor que cero.'
      );
      return;
    }

    if (
      Number(form.multiplicador_road_manager || 0) <= 0
    ) {
      setError(
        'El multiplicador de Road Manager debe ser mayor que cero.'
      );
      return;
    }

    if (Number(form.ensayo_extra || 0) < 0) {
      setError('El ensayo extra no puede ser negativo.');
      return;
    }

    if (Number(form.produccion_extra || 0) < 0) {
      setError(
        'La producción extra no puede ser negativa.'
      );
      return;
    }

    try {
      await saveTipoEventoConfig(
        {
          ...form,
          nombre: form.nombre.trim(),
          multiplicador_honorarios: Number(
            form.multiplicador_honorarios || 1
          ),
          multiplicador_musicos: Number(
            form.multiplicador_musicos || 1
          ),
          multiplicador_sonido: Number(
            form.multiplicador_sonido || 1
          ),
          multiplicador_road_manager: Number(
            form.multiplicador_road_manager || 1
          ),
          ensayo_extra: Number(
            form.ensayo_extra || 0
          ),
          produccion_extra: Number(
            form.produccion_extra || 0
          ),
          activo: Boolean(form.activo),
        },
        workspaceId
      );

      toast.success(
        form.id
          ? 'Tipo de evento actualizado correctamente.'
          : 'Tipo de evento creado correctamente.'
      );

      setModalOpen(false);
      setForm(nuevoRegistro);
      await cargar();
    } catch (err) {
      console.error(err);

      const mensaje =
        err.message ||
        'No se pudo guardar el tipo de evento.';

      setError(mensaje);
      toast.error(mensaje);
    }
  }

  async function borrar(id, nombre) {
    const confirmado = window.confirm(
      `¿Deseas borrar definitivamente el tipo de evento "${
        nombre || 'Sin nombre'
      }"?`
    );

    if (!confirmado) return;

    try {
      await deleteTipoEventoConfig(id, workspaceId);

      toast.success(
        'Tipo de evento eliminado correctamente.'
      );

      await cargar();
    } catch (err) {
      console.error(err);

      toast.error(
        err.message ||
          'No se pudo borrar el tipo de evento.'
      );
    }
  }

  const tiposFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return tiposEvento;

    return tiposEvento.filter((tipo) =>
      String(tipo.nombre || '')
        .toLowerCase()
        .includes(texto)
    );
  }, [tiposEvento, busqueda]);

  return (
    <div className="dashboard tipos-evento-page">
      <div className="top-bar">
        <div>
          <h1>Tipos de Evento</h1>

          <p>
            Multiplicadores, ensayos y producción de{' '}
            {nombreArtista}
          </p>
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

          <strong>
            Tipos de evento de {nombreArtista}
          </strong>

          <p>
            Los multiplicadores ajustan automáticamente cada
            parte de la tarifa según el tipo de evento. Un valor
            de 1.00 mantiene el precio original.
          </p>
        </div>

        <div className="config-artista-control">
          <label>Artista activo</label>
          <strong>{nombreArtista}</strong>
        </div>
      </section>

      <div className="actions-row tipos-evento-actions">
        <input
          type="search"
          placeholder="Buscar tipo de evento..."
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
          + Nuevo Tipo
        </button>
      </div>

      <div className="tipos-evento-lista">
        <div
          className="tipos-evento-header"
          aria-hidden="true"
        >
          <span>Tipo de evento</span>
          <span>Acciones</span>
        </div>

        {!workspaceId ? (
          <div className="config-artista-empty">
            <strong>No hay un Artista activo.</strong>
            <span>
              Selecciona un Artista para consultar sus tipos
              de evento.
            </span>
          </div>
        ) : cargando ? (
          <div className="tipos-evento-empty">
            Cargando tipos de evento...
          </div>
        ) : tiposFiltrados.length === 0 ? (
          <div className="tipos-evento-empty">
            {error ||
              'Este Artista todavía no tiene tipos de evento configurados.'}
          </div>
        ) : (
          tiposFiltrados.map((tipo) => (
            <article
              className="tipo-evento-row"
              key={tipo.id}
            >
              <div className="tipo-evento-nombre">
                <span className="tipo-evento-icono">
                  🎤
                </span>

                <div>
                  <strong>
                    {tipo.nombre || 'Sin nombre'}
                  </strong>

                  <small>
                    Honorarios x
                    {Number(
                      tipo.multiplicador_honorarios || 1
                    ).toLocaleString('es-DO')}
                  </small>
                </div>
              </div>

              <div className="tipo-evento-acciones">
                <button
                  type="button"
                  onClick={() => editar(tipo)}
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => duplicar(tipo)}
                >
                  Duplicar
                </button>

                <button
                  type="button"
                  className="danger-btn"
                  onClick={() =>
                    borrar(tipo.id, tipo.nombre)
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
        title={
          form.id
            ? 'Editar Tipo de Evento'
            : 'Nuevo Tipo de Evento'
        }
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={guardar}>
          <p className="config-modal-context">
            Artista: <strong>{nombreArtista}</strong>
          </p>

          <label>Nombre del tipo de evento *</label>

          <input
            name="nombre"
            value={form.nombre}
            onChange={cambiar}
            placeholder="Ej: Privado, Boda, Festival, Corporativo"
          />

          <div
            style={{
              margin: '14px 0 18px',
              padding: '12px 14px',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              borderRadius: 12,
              background: 'rgba(37, 99, 235, 0.07)',
              lineHeight: 1.45,
            }}
          >
            <strong>¿Qué son los multiplicadores?</strong>

            <p style={{ margin: '5px 0 0' }}>
              Sirven para aumentar o reducir automáticamente una
              parte de la tarifa según las exigencias del evento.
              <strong> 1.00</strong> mantiene el precio,
              <strong> 1.20</strong> lo aumenta un 20% y
              <strong> 0.90</strong> lo reduce un 10%. Estos
              ajustes se aplican al calcular la cotización.
            </p>
          </div>

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
