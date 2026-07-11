import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { getClientes, crearCliente } from '../lib/clientesService';
import { getProvincias } from '../lib/provinciasService';
import { getFormatosActivos } from '../lib/formatosService';
import { calcularCotizacion } from '../lib/calcularCotizacion';
import { getTiposEventoConfig } from '../lib/tiposEventoConfigService';
import {
  saveCotizacion,
  getCotizacionById,
} from '../lib/cotizacionesService';

const formInicial = {
  cliente_id: '',
  cliente_nombre: '',
  cliente_telefono: '',
  cliente_empresa: '',
  cliente_email: '',

  provincia_id: '',
  formato_id: '',

  fecha_evento: '',
  tipo_evento_config_id: '',
  nombre_evento: '',
  venue: '',
  direccion_evento: '',
  hora_montaje: '',
  hora_inicio: '',
  hora_fin: '',
  invitados: '',
  contacto_evento: '',
  telefono_contacto: '',
  observaciones: '',

  cantidad_musicos: 1,
  incluye_sonido: false,
  descuento: 0,
  estado: 'Pendiente de aprobación',
};

export default function NuevaCotizacion({
  workspaceId,
  workspace,
  workspaces = [],
  esArtista,
  cotizacionId,
  goBack,
  goHome,
  onCotizacionGuardada,
}) {
  const workspaceInicialId =
    cotizacionId || esArtista
      ? String(workspaceId || '')
      : '';

  const [cotizacionWorkspaceId, setCotizacionWorkspaceId] =
    useState(workspaceInicialId);
  const [clientes, setClientes] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [formatos, setFormatos] = useState([]);
  const [tiposEvento, setTiposEvento] = useState([]);
  const [form, setForm] = useState(formInicial);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [modoEdicion, setModoEdicion] = useState(false);
  const [mostrarDetallesEvento, setMostrarDetallesEvento] = useState(false);
  const [cargando, setCargando] = useState(Boolean(workspaceInicialId));
  const resultadoRef = useRef(null);

  const workspacesDisponibles =
    Array.isArray(workspaces) && workspaces.length > 0
      ? workspaces
      : workspace
        ? [workspace]
        : [];

  const artistasDisponibles = workspacesDisponibles.filter(
    (item) => item?.member_status === 'active'
  );

  const workspaceCotizacion =
    artistasDisponibles.find(
      (item) =>
        String(item.workspace_id) === String(cotizacionWorkspaceId)
    ) ||
    (String(workspace?.workspace_id) === String(cotizacionWorkspaceId)
      ? workspace
      : null);

  const cotizacionEsArtista = Boolean(
    workspaceCotizacion?.is_owner ||
      workspaceCotizacion?.member_role === 'owner' ||
      (String(workspaceCotizacion?.workspace_id) === String(workspaceId) &&
        esArtista)
  );

  const comisionPorcentaje = cotizacionEsArtista
    ? 0
    : Number(workspaceCotizacion?.commission_percentage || 0);

  const mostrarSelectorArtista =
    !esArtista || artistasDisponibles.length > 1;

  const artistaSeleccionado = Boolean(
    cotizacionWorkspaceId && workspaceCotizacion
  );

  useEffect(() => {
    const nextWorkspaceId = cotizacionId
      ? String(workspaceId || '')
      : esArtista
        ? String(workspaceId || '')
        : '';

    setCotizacionWorkspaceId(nextWorkspaceId);
    setClientes([]);
    setProvincias([]);
    setFormatos([]);
    setTiposEvento([]);
    setForm(formInicial);
    setResultado(null);
    setError('');
    setModoEdicion(false);
    setMostrarDetallesEvento(false);
    setCargando(Boolean(nextWorkspaceId));
  }, [cotizacionId, workspaceId, esArtista]);

  useEffect(() => {
    let cancelled = false;

    async function inicializar() {
      if (!cotizacionWorkspaceId) {
        setCargando(false);
        return;
      }

      try {
        setCargando(true);
        setError('');

        const [
          clientesData,
          provinciasData,
          formatosData,
          tiposEventoData,
        ] = await Promise.all([
          getClientes(cotizacionWorkspaceId),
          getProvincias(cotizacionWorkspaceId),
          getFormatosActivos(cotizacionWorkspaceId),
          getTiposEventoConfig(cotizacionWorkspaceId),
        ]);

        if (cancelled) return;

        setClientes(Array.isArray(clientesData) ? clientesData : []);
        setProvincias(
          (Array.isArray(provinciasData) ? provinciasData : []).filter(
            (zona) => zona.activa
          )
        );
        setFormatos(Array.isArray(formatosData) ? formatosData : []);
        setTiposEvento(
          Array.isArray(tiposEventoData) ? tiposEventoData : []
        );

        if (cotizacionId) {
          const cotizacion = await getCotizacionById(
            cotizacionId,
            cotizacionWorkspaceId
          );

          if (cancelled) return;
          cargarCotizacionEnFormulario(cotizacion);
        }
      } catch (err) {
        if (cancelled) return;

        console.error(err);
        const mensaje =
          err.message || 'No se pudo cargar la cotización.';
        setError(mensaje);
        toast.error(mensaje);
      } finally {
        if (!cancelled) {
          setCargando(false);
        }
      }
    }

    inicializar();

    return () => {
      cancelled = true;
    };
  }, [cotizacionId, cotizacionWorkspaceId]);

  function cargarCotizacionEnFormulario(c) {
    setModoEdicion(true);

    setForm({
      ...formInicial,
      id: c.id,

      cliente_id: c.cliente_id || '',
      cliente_nombre: c.clientes?.nombre || '',
      cliente_telefono: c.clientes?.telefono || '',
      cliente_empresa: c.clientes?.empresa || '',
      cliente_email: c.clientes?.email || '',

      provincia_id: c.provincia_id || '',
      formato_id: c.formato_id || '',

      fecha_evento: c.fecha_evento || '',
      tipo_evento_config_id: c.tipo_evento_config_id || '',
      nombre_evento: c.nombre_evento || '',
      venue: c.venue || '',
      direccion_evento: c.direccion_evento || '',
      hora_montaje: c.hora_montaje || '',
      hora_inicio: c.hora_inicio || '',
      hora_fin: c.hora_fin || '',
      invitados: c.invitados || '',
      contacto_evento: c.contacto_evento || '',
      telefono_contacto: c.telefono_contacto || '',
      observaciones: c.observaciones || '',

      cantidad_musicos: c.cantidad_musicos || 1,
      incluye_sonido: Boolean(c.incluye_sonido),
      descuento: Number(c.descuento || 0),
      estado: c.estado || 'Pendiente de aprobación',
    });

    setResultado({
      honorarios_base: Number(c.honorarios_base || 0),
      honorarios: Number(c.honorarios || 0),
      multiplicador_honorarios: Number(
        c.multiplicador_honorarios || 1
      ),
      multiplicador_musicos: Number(c.multiplicador_musicos || 1),
      multiplicador_sonido: Number(c.multiplicador_sonido || 1),
      multiplicador_road_manager: Number(
        c.multiplicador_road_manager || 1
      ),
      ensayo_extra: Number(c.ensayo_extra || 0),
      produccion_extra: Number(c.produccion_extra || 0),
      nomina: Number(c.nomina || 0),
      dieta: Number(c.dieta || 0),
      transporte: Number(c.transporte || 0),
      sonido: Number(c.sonido || 0),
      road_manager: Number(c.road_manager || 0),
      subtotal: Number(c.subtotal || 0),
      descuento: Number(c.descuento || 0),
      monto_descuento: Number(c.monto_descuento || 0),
      comision: Number(c.comision || 0),
      total: Number(c.total || 0),
    });
  }

  function seleccionarArtista(e) {
    if (modoEdicion) return;

    const nextWorkspaceId = e.target.value;

    setCotizacionWorkspaceId(nextWorkspaceId);
    setClientes([]);
    setProvincias([]);
    setFormatos([]);
    setTiposEvento([]);
    setForm(formInicial);
    setResultado(null);
    setError('');
    setMostrarDetallesEvento(false);
    setCargando(Boolean(nextWorkspaceId));
  }

  function cambiar(e) {
    const { name, value, type, checked } = e.target;

    setForm((actual) => ({
      ...actual,
      [name]: type === 'checkbox' ? checked : value,
    }));

    setResultado(null);
    setError('');
  }

  function seleccionarFormato(e) {
    const formatoId = e.target.value;
    const formato = formatos.find(
      (item) => String(item.id) === String(formatoId)
    );

    setForm((actual) => ({
      ...actual,
      formato_id: formatoId,
      cantidad_musicos: formato
        ? Number(formato.cantidad_musicos || 1)
        : 1,
    }));

    setResultado(null);
    setError('');
  }

  function seleccionarCliente(e) {
    const clienteId = e.target.value;
    const cliente = clientes.find(
      (item) => String(item.id) === String(clienteId)
    );

    setForm((actual) => ({
      ...actual,
      cliente_id: clienteId,
      cliente_nombre: cliente?.nombre || '',
      cliente_telefono: cliente?.telefono || '',
      cliente_empresa: cliente?.empresa || '',
      cliente_email: cliente?.email || '',
    }));

    setResultado(null);
    setError('');
  }

  function validar() {
    if (!artistaSeleccionado) {
      toast.error('Selecciona el Artista que deseas cotizar.');
      return false;
    }

    if (!form.cliente_id && !form.cliente_nombre.trim()) {
      toast.error(
        'Selecciona un cliente o escribe el nombre del cliente.'
      );
      return false;
    }

    if (!form.cliente_telefono.trim()) {
      toast.error('El teléfono del cliente es obligatorio.');
      return false;
    }

    if (!form.provincia_id) {
      toast.error('Selecciona una zona.');
      return false;
    }

    if (!form.tipo_evento_config_id) {
      toast.error('Selecciona un tipo de evento.');
      return false;
    }

    if (!form.formato_id && !modoEdicion) {
      toast.error('Selecciona un formato.');
      return false;
    }

    if (Number(form.cantidad_musicos || 0) <= 0) {
      toast.error(
        'El formato debe tener una cantidad válida de músicos.'
      );
      return false;
    }

    return true;
  }

  function calcular(e) {
    e.preventDefault();
    setError('');

    if (!validar()) return;

    const provincia = provincias.find(
      (item) => String(item.id) === String(form.provincia_id)
    );

    if (!provincia) {
      toast.error('Zona inválida.');
      return;
    }

    const tipoEventoSeleccionado = tiposEvento.find(
      (item) =>
        String(item.id) === String(form.tipo_evento_config_id)
    );

    if (!tipoEventoSeleccionado) {
      toast.error('Tipo de evento inválido.');
      return;
    }

    const calculo = calcularCotizacion({
      provincia,
      cantidadMusicos: Number(form.cantidad_musicos),
      incluyeSonido: form.incluye_sonido,
      descuento: Number(form.descuento),
      aplicarComision:
        !cotizacionEsArtista && comisionPorcentaje > 0,
      comisionPorcentaje: comisionPorcentaje / 100,
      tipoEventoConfig: tipoEventoSeleccionado,
    });

    setResultado(calculo);

    setTimeout(() => {
      resultadoRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  }

  async function obtenerClienteId() {
    if (form.cliente_id) return form.cliente_id;

    const nuevoCliente = await crearCliente(
      {
        nombre: form.cliente_nombre.trim(),
        telefono: form.cliente_telefono.trim(),
        empresa: form.cliente_empresa.trim() || null,
        email: form.cliente_email.trim() || null,
      },
      cotizacionWorkspaceId
    );

    return nuevoCliente.id;
  }

  function volverAtras() {
    if (typeof goBack === 'function') {
      goBack();
      return;
    }

    if (typeof goHome === 'function') {
      goHome();
      return;
    }

    window.history.back();
  }

  async function guardar() {
    setError('');

    if (!resultado) {
      toast.error('Primero debes calcular la cotización.');
      return;
    }

    try {
      const clienteIdFinal = await obtenerClienteId();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      const tipoEventoSeleccionado = tiposEvento.find(
        (item) =>
          String(item.id) === String(form.tipo_evento_config_id)
      );

      const guardada = await saveCotizacion(
        {
          id: form.id,
          workspace_id: cotizacionWorkspaceId,
          cliente_id: clienteIdFinal,
          vendedor_id: cotizacionEsArtista ? null : user?.id || null,
          provincia_id: form.provincia_id,
          formato_id: form.formato_id || null,

          fecha_evento: form.fecha_evento || null,
          tipo_evento_config_id:
            form.tipo_evento_config_id || null,
          tipo_evento: tipoEventoSeleccionado?.nombre || null,
          nombre_evento: form.nombre_evento || null,
          venue: form.venue || null,
          direccion_evento: form.direccion_evento || null,
          hora_montaje: form.hora_montaje || null,
          hora_inicio: form.hora_inicio || null,
          hora_fin: form.hora_fin || null,
          invitados: form.invitados
            ? Number(form.invitados)
            : null,
          contacto_evento: form.contacto_evento || null,
          telefono_contacto:
            form.telefono_contacto || null,
          observaciones: form.observaciones || null,

          cantidad_musicos: Number(form.cantidad_musicos),
          incluye_sonido: form.incluye_sonido,
          descuento: Number(form.descuento),
          estado: form.estado,

          ...resultado,
        },
        cotizacionWorkspaceId
      );

      toast.success(
        modoEdicion
          ? 'Cotización actualizada correctamente.'
          : 'Cotización guardada correctamente.'
      );

      if (onCotizacionGuardada) {
        onCotizacionGuardada(
          guardada.id,
          cotizacionWorkspaceId
        );
      }
    } catch (err) {
      console.error(err);

      const mensaje =
        err.message || 'No se pudo guardar la cotización.';

      setError(mensaje);
      toast.error(mensaje);
    }
  }

  if (cargando) {
    return (
      <div className="dashboard">
        Cargando datos de{' '}
        {workspaceCotizacion?.workspace_name ||
          workspace?.workspace_name ||
          'Artista'}
        ...
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="top-bar">
        <div>
          <h1>
            {modoEdicion ? 'Editar Cotización' : 'Nueva Cotización'}
          </h1>
          <p>
            {workspaceCotizacion?.workspace_name ||
              (mostrarSelectorArtista
                ? 'Selecciona un Artista'
                : workspace?.workspace_name || 'Artista')}
            {' · '}
            {cotizacionEsArtista
              ? 'Cuenta de Artista'
              : 'Cuenta de Gestor'}
          </p>
        </div>

        <button type="button" onClick={volverAtras}>
          ← Atrás
        </button>
      </div>

      <form className="form-cotizacion" onSubmit={calcular}>
        {mostrarSelectorArtista && (
          <section
            className="form-section form-full"
            style={{ marginBottom: 20 }}
          >
            <h2>Artista</h2>

            <label>Artista a cotizar *</label>
            <select
              name="cotizacion_workspace_id"
              value={cotizacionWorkspaceId}
              onChange={seleccionarArtista}
              disabled={modoEdicion}
              required
            >
              <option value="">Seleccionar Artista</option>

              {artistasDisponibles.map((item) => (
                <option
                  key={item.workspace_id}
                  value={item.workspace_id}
                >
                  {item.workspace_name}
                </option>
              ))}
            </select>

            <small
              style={{
                display: 'block',
                marginTop: 8,
                color: 'var(--muted)',
              }}
            >
              {modoEdicion
                ? 'El Artista no puede cambiarse al editar una cotización.'
                : 'Al elegirlo se cargarán sus clientes, zonas, formatos, tarifas y tipos de evento.'}
            </small>
          </section>
        )}

        {artistaSeleccionado ? (
          <div className="form-grid">
          <section className="form-section">
            <h2>Cliente</h2>

            <label>Cliente existente</label>
            <select
              name="cliente_id"
              value={form.cliente_id}
              onChange={seleccionarCliente}
            >
              <option value="">
                Crear / escribir cliente nuevo
              </option>

              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                  {cliente.empresa ? ` - ${cliente.empresa}` : ''}
                </option>
              ))}
            </select>

            <label>Nombre del cliente *</label>
            <input
              type="text"
              name="cliente_nombre"
              value={form.cliente_nombre}
              onChange={cambiar}
            />

            <label>Teléfono *</label>
            <input
              type="text"
              name="cliente_telefono"
              value={form.cliente_telefono}
              onChange={cambiar}
            />

            <label>Empresa</label>
            <input
              type="text"
              name="cliente_empresa"
              value={form.cliente_empresa}
              onChange={cambiar}
            />

            <label>Email</label>
            <input
              type="email"
              name="cliente_email"
              value={form.cliente_email}
              onChange={cambiar}
            />
          </section>

          <section className="form-section">
            <h2>Evento</h2>

            <label>Tipo de evento *</label>
            <select
              name="tipo_evento_config_id"
              value={form.tipo_evento_config_id}
              onChange={cambiar}
              required
            >
              <option value="">
                Seleccionar tipo de evento
              </option>

              {tiposEvento.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </option>
              ))}
            </select>

            <label>Nombre del evento</label>
            <input
              type="text"
              name="nombre_evento"
              value={form.nombre_evento}
              onChange={cambiar}
            />

            <label>Venue / Hotel / Salón</label>
            <input
              type="text"
              name="venue"
              value={form.venue}
              onChange={cambiar}
            />

            <label>Zona *</label>
            <select
              name="provincia_id"
              value={form.provincia_id}
              onChange={cambiar}
            >
              <option value="">Seleccionar zona</option>

              {provincias.map((zona) => (
                <option key={zona.id} value={zona.id}>
                  {zona.nombre}
                </option>
              ))}
            </select>

            <label>Fecha del evento</label>
            <input
              type="date"
              name="fecha_evento"
              value={form.fecha_evento}
              onChange={cambiar}
            />

            <label>Dirección</label>
            <input
              type="text"
              name="direccion_evento"
              value={form.direccion_evento}
              onChange={cambiar}
            />

            <button
              type="button"
              style={{ marginTop: 16 }}
              onClick={() =>
                setMostrarDetallesEvento((actual) => !actual)
              }
            >
              {mostrarDetallesEvento
                ? 'Ocultar detalles del evento'
                : 'Mostrar más detalles'}
            </button>

            {mostrarDetallesEvento && (
              <>
                <label>Hora de montaje</label>
                <input
                  type="time"
                  name="hora_montaje"
                  value={form.hora_montaje}
                  onChange={cambiar}
                />

                <label>Hora de inicio</label>
                <input
                  type="time"
                  name="hora_inicio"
                  value={form.hora_inicio}
                  onChange={cambiar}
                />

                <label>Hora de finalización</label>
                <input
                  type="time"
                  name="hora_fin"
                  value={form.hora_fin}
                  onChange={cambiar}
                />

                <label>Cantidad estimada de invitados</label>
                <input
                  type="number"
                  name="invitados"
                  min="0"
                  value={form.invitados}
                  onChange={cambiar}
                />

                <label>Persona de contacto</label>
                <input
                  type="text"
                  name="contacto_evento"
                  value={form.contacto_evento}
                  onChange={cambiar}
                />

                <label>Teléfono del contacto</label>
                <input
                  type="text"
                  name="telefono_contacto"
                  value={form.telefono_contacto}
                  onChange={cambiar}
                />

                <label>Observaciones</label>
                <textarea
                  name="observaciones"
                  value={form.observaciones}
                  onChange={cambiar}
                  rows="3"
                />
              </>
            )}
          </section>

          <section className="form-section form-full">
            <h2>Cotización</h2>

            <div className="form-grid">
              <div>
                <label>Formato *</label>
                <select
                  name="formato_id"
                  value={form.formato_id}
                  onChange={seleccionarFormato}
                >
                  <option value="">
                    {modoEdicion && !form.formato_id
                      ? 'Formato anterior'
                      : 'Seleccionar formato'}
                  </option>

                  {formatos.map((formato) => (
                    <option key={formato.id} value={formato.id}>
                      {formato.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Músicos</label>
                <input
                  type="number"
                  name="cantidad_musicos"
                  min="1"
                  value={form.cantidad_musicos}
                  readOnly
                />
              </div>

              <div>
                <label>Descuento</label>
                <select
                  name="descuento"
                  value={form.descuento}
                  onChange={cambiar}
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="10">10%</option>
                  <option value="15">15%</option>
                  <option value="20">20%</option>
                  <option value="25">25%</option>
                </select>
              </div>

              <div>
                <label>Estado</label>
                <select
                  name="estado"
                  value={form.estado}
                  onChange={cambiar}
                >
                  <option value="Pendiente de aprobación">
                    Pendiente de aprobación
                  </option>
                  <option value="Pendiente de cobro">
                    Pendiente de cobro
                  </option>
                  <option value="Confirmada">Confirmada</option>
                  <option value="Cancelada">Cancelada</option>
                  <option value="Realizada">Realizada</option>
                </select>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                <label className="check-row">
                  <input
                    type="checkbox"
                    name="incluye_sonido"
                    checked={form.incluye_sonido}
                    onChange={cambiar}
                  />
                  Incluir sonido
                </label>
              </div>
            </div>

            {!resultado && error && (
              <p className="error">{error}</p>
            )}

            <div className="form-actions">
              <button type="submit">
                Calcular Cotización
              </button>
            </div>
          </section>
          </div>
        ) : (
          <div className="workspace-state-card">
            <h2>Selecciona un Artista</h2>
            <p>
              Elige el Artista para cargar la información necesaria
              y comenzar la cotización.
            </p>
          </div>
        )}
      </form>

      {resultado && (
        <div
          ref={resultadoRef}
          className="provincia-card"
          style={{ marginTop: 24 }}
        >
          <h2>Resultado interno</h2>

          <div className="resultado-grid">
            <div className="fila">
              <span>Formato</span>
              <strong>
                {formatos.find(
                  (formato) =>
                    String(formato.id) === String(form.formato_id)
                )?.nombre ||
                  `${form.cantidad_musicos} músico(s)`}
              </strong>
            </div>

            <div className="fila">
              <span>Tipo de evento</span>
              <strong>
                {tiposEvento.find(
                  (tipo) =>
                    String(tipo.id) ===
                    String(form.tipo_evento_config_id)
                )?.nombre || 'No seleccionado'}
              </strong>
            </div>

            <div className="fila">
              <span>Honorarios</span>
              <strong>
                RD$ {resultado.honorarios.toLocaleString()}
              </strong>
            </div>

            {resultado.multiplicador_honorarios > 1 && (
              <div className="fila">
                <span>Multiplicador aplicado</span>
                <strong>
                  x{resultado.multiplicador_honorarios}
                </strong>
              </div>
            )}

            {resultado.ensayo_extra > 0 && (
              <div className="fila">
                <span>Ensayo extra</span>
                <strong>
                  RD$ {resultado.ensayo_extra.toLocaleString()}
                </strong>
              </div>
            )}

            {resultado.produccion_extra > 0 && (
              <div className="fila">
                <span>Producción extra</span>
                <strong>
                  RD$ {resultado.produccion_extra.toLocaleString()}
                </strong>
              </div>
            )}

            <div className="fila">
              <span>Nómina</span>
              <strong>
                RD$ {resultado.nomina.toLocaleString()}
              </strong>
            </div>

            <div className="fila">
              <span>Dieta</span>
              <strong>
                RD$ {resultado.dieta.toLocaleString()}
              </strong>
            </div>

            <div className="fila">
              <span>Transporte</span>
              <strong>
                RD$ {resultado.transporte.toLocaleString()}
              </strong>
            </div>

            <div className="fila">
              <span>Sonido</span>
              <strong>
                RD$ {resultado.sonido.toLocaleString()}
              </strong>
            </div>

            <div className="fila">
              <span>Road Manager</span>
              <strong>
                RD$ {resultado.road_manager.toLocaleString()}
              </strong>
            </div>

            <div className="fila">
              <span>Subtotal</span>
              <strong>
                RD$ {resultado.subtotal.toLocaleString()}
              </strong>
            </div>

            <div className="fila">
              <span>Descuento {resultado.descuento}%</span>
              <strong>
                RD$ {resultado.monto_descuento.toLocaleString()}
              </strong>
            </div>

            <div className="fila">
              <span>
                Comisión
                {cotizacionEsArtista
                  ? ' (Artista: no aplica)'
                  : ` (${comisionPorcentaje}%)`}
              </span>
              <strong>
                RD$ {resultado.comision.toLocaleString()}
              </strong>
            </div>

            <div className="fila">
              <span>Total redondeado</span>
              <strong>
                RD$ {resultado.total.toLocaleString()}
              </strong>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={guardar}>
              {modoEdicion
                ? 'Actualizar Cotización'
                : 'Guardar Cotización'}
            </button>
          </div>

          {error && <p className="error">{error}</p>}
        </div>
      )}
    </div>
  );
}
