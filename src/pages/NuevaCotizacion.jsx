import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabaseClient";
import { getClientes, crearCliente } from "../lib/clientesService";
import { getProvincias } from "../lib/provinciasService";
import { getFormatosActivos } from "../lib/formatosService";
import { calcularCotizacion } from "../lib/calcularCotizacion";
import { getTiposEventoConfig } from "../lib/tiposEventoConfigService";
import { getBusinessProfileForQuotes } from "../lib/profileService";
import {
  ensureCotizacionPdf,
  getCotizacionById,
  saveCotizacion,
} from "../lib/cotizacionesService";

const formInicial = {
  cliente_id: "",
  cliente_nombre: "",
  cliente_telefono: "",
  cliente_empresa: "",
  cliente_email: "",

  provincia_id: "",
  formato_id: "",

  fecha_evento: "",
  tipo_evento_config_id: "",
  nombre_evento: "",
  venue: "",
  direccion_evento: "",
  hora_montaje: "",
  hora_inicio: "",
  hora_fin: "",
  invitados: "",
  contacto_evento: "",
  telefono_contacto: "",
  observaciones: "",

  cantidad_musicos: 1,
  modo_tarifa_musicos: "uniforme",
  musicos_config: [],
  incluye_sonido: false,
  incluye_manager_artistico: false,
  manager_artistico_nombre: "",
  manager_artistico_porcentaje: 0,
  incluye_impuesto: false,
  impuesto_porcentaje: 0,
  descuento: 0,
  estado: "Pendiente de aprobación",
};

function normalizarModoTarifa(value) {
  return value === "individual" ? "individual" : "uniforme";
}

function normalizarMusicosConfig(value) {
  if (!Array.isArray(value)) return [];

  return value.map((musico, index) => ({
    rol: String(musico?.rol || `Músico ${index + 1}`).trim(),
    nombre: String(musico?.nombre || "").trim(),
    tipo_tarifa: ["estandar", "multiplicador", "fija"].includes(
      musico?.tipo_tarifa,
    )
      ? musico.tipo_tarifa
      : "estandar",
    valor: Number(musico?.valor ?? (musico?.tipo_tarifa === "fija" ? 0 : 1)),
  }));
}

function configDesdeDetalle(value) {
  return normalizarMusicosConfig(value);
}

function descripcionTipoTarifa(musico) {
  if (musico?.tipo_tarifa === "multiplicador") {
    return `x${Number(musico.valor || 1).toLocaleString("es-DO")}`;
  }

  if (musico?.tipo_tarifa === "fija") {
    return `RD$ ${Number(musico.valor || 0).toLocaleString("es-DO")}`;
  }

  return "Tarifa estándar";
}

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
    cotizacionId || esArtista ? String(workspaceId || "") : "";

  const [cotizacionWorkspaceId, setCotizacionWorkspaceId] =
    useState(workspaceInicialId);
  const [clientes, setClientes] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [formatos, setFormatos] = useState([]);
  const [tiposEvento, setTiposEvento] = useState([]);
  const [form, setForm] = useState(formInicial);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
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
    (item) => item?.member_status === "active",
  );

  const workspaceCotizacion =
    artistasDisponibles.find(
      (item) => String(item.workspace_id) === String(cotizacionWorkspaceId),
    ) ||
    (String(workspace?.workspace_id) === String(cotizacionWorkspaceId)
      ? workspace
      : null);

  const cotizacionEsArtista = Boolean(
    workspaceCotizacion?.is_owner ||
    workspaceCotizacion?.member_role === "owner" ||
    (String(workspaceCotizacion?.workspace_id) === String(workspaceId) &&
      esArtista),
  );

  const comisionPorcentaje = cotizacionEsArtista
    ? 0
    : Number(workspaceCotizacion?.commission_percentage || 0);

  const mostrarSelectorArtista = !esArtista || artistasDisponibles.length > 1;

  const artistaSeleccionado = Boolean(
    cotizacionWorkspaceId && workspaceCotizacion,
  );

  useEffect(() => {
    const nextWorkspaceId = cotizacionId
      ? String(workspaceId || "")
      : esArtista
        ? String(workspaceId || "")
        : "";

    setCotizacionWorkspaceId(nextWorkspaceId);
    setClientes([]);
    setProvincias([]);
    setFormatos([]);
    setTiposEvento([]);
    setForm(formInicial);
    setResultado(null);
    setError("");
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
        setError("");

        const [
          clientesData,
          provinciasData,
          formatosData,
          tiposEventoData,
          perfilNegocioData,
        ] = await Promise.all([
          getClientes(cotizacionWorkspaceId),
          getProvincias(cotizacionWorkspaceId),
          getFormatosActivos(cotizacionWorkspaceId),
          getTiposEventoConfig(cotizacionWorkspaceId),
          getBusinessProfileForQuotes(cotizacionWorkspaceId),
        ]);

        if (cancelled) return;

        setClientes(Array.isArray(clientesData) ? clientesData : []);
        setProvincias(
          (Array.isArray(provinciasData) ? provinciasData : []).filter(
            (zona) => zona.activa,
          ),
        );
        setFormatos(Array.isArray(formatosData) ? formatosData : []);
        setTiposEvento(Array.isArray(tiposEventoData) ? tiposEventoData : []);

        if (!cotizacionId) {
          const porcentajeManager = Number(
            perfilNegocioData?.manager_artistico_porcentaje || 0,
          );

          const porcentajeImpuesto = Number(
            perfilNegocioData?.impuesto_porcentaje || 0,
          );

          setForm((actual) => ({
            ...actual,
            incluye_manager_artistico: Boolean(
              perfilNegocioData?.manager_artistico_activo &&
                porcentajeManager > 0,
            ),
            manager_artistico_nombre:
              perfilNegocioData?.manager_artistico_nombre || "",
            manager_artistico_porcentaje: porcentajeManager,
            incluye_impuesto: Boolean(
              perfilNegocioData?.impuesto_activo_por_defecto &&
                porcentajeImpuesto > 0,
            ),
            impuesto_porcentaje: porcentajeImpuesto,
          }));
        }

        if (cotizacionId) {
          const cotizacion = await getCotizacionById(
            cotizacionId,
            cotizacionWorkspaceId,
          );

          if (cancelled) return;
          cargarCotizacionEnFormulario(cotizacion, formatosData);
        }
      } catch (err) {
        if (cancelled) return;

        console.error(err);
        const mensaje = err.message || "No se pudo cargar la cotización.";
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

  function cargarCotizacionEnFormulario(c, formatosDisponibles = []) {
    setModoEdicion(true);

    const formatoActual = formatosDisponibles.find(
      (item) => String(item.id) === String(c.formato_id),
    );

    const modoTarifa = normalizarModoTarifa(
      c.modo_tarifa_musicos_snapshot || formatoActual?.modo_tarifa_musicos,
    );

    const detalleGuardado = Array.isArray(c.detalle_musicos_snapshot)
      ? c.detalle_musicos_snapshot
      : [];

    const musicosConfig =
      modoTarifa === "individual"
        ? detalleGuardado.length > 0
          ? configDesdeDetalle(detalleGuardado)
          : normalizarMusicosConfig(formatoActual?.musicos_config)
        : [];

    const cantidadMusicos =
      modoTarifa === "individual"
        ? musicosConfig.length
        : Number(c.cantidad_musicos ?? formatoActual?.cantidad_musicos ?? 0);

    setForm({
      ...formInicial,
      id: c.id,

      cliente_id: c.cliente_id || "",
      cliente_nombre: c.clientes?.nombre || "",
      cliente_telefono: c.clientes?.telefono || "",
      cliente_empresa: c.clientes?.empresa || "",
      cliente_email: c.clientes?.email || "",

      provincia_id: c.provincia_id || "",
      formato_id: c.formato_id || "",

      fecha_evento: c.fecha_evento || "",
      tipo_evento_config_id: c.tipo_evento_config_id || "",
      nombre_evento: c.nombre_evento || "",
      venue: c.venue || "",
      direccion_evento: c.direccion_evento || "",
      hora_montaje: c.hora_montaje || "",
      hora_inicio: c.hora_inicio || "",
      hora_fin: c.hora_fin || "",
      invitados: c.invitados || "",
      contacto_evento: c.contacto_evento || "",
      telefono_contacto: c.telefono_contacto || "",
      observaciones: c.observaciones || "",

      cantidad_musicos: cantidadMusicos,
      modo_tarifa_musicos: modoTarifa,
      musicos_config: musicosConfig,
      incluye_sonido: Boolean(c.incluye_sonido),
      incluye_manager_artistico: Boolean(c.incluye_manager_artistico),
      manager_artistico_nombre: c.manager_artistico_nombre_snapshot || "",
      manager_artistico_porcentaje: Number(
        c.manager_artistico_porcentaje || 0,
      ),
      incluye_impuesto: Boolean(c.incluye_impuesto),
      impuesto_porcentaje: Number(c.impuesto_porcentaje || 0),
      descuento: Number(c.descuento || 0),
      estado: c.estado || "Pendiente de aprobación",
    });

    setResultado({
      honorarios_base: Number(c.honorarios_base || 0),
      honorarios: Number(c.honorarios || 0),
      multiplicador_honorarios: Number(c.multiplicador_honorarios || 1),
      multiplicador_musicos: Number(c.multiplicador_musicos || 1),
      multiplicador_sonido: Number(c.multiplicador_sonido || 1),
      multiplicador_road_manager: Number(c.multiplicador_road_manager || 1),
      ensayo_extra: Number(c.ensayo_extra || 0),
      produccion_extra: Number(c.produccion_extra || 0),
      cantidad_musicos: cantidadMusicos,
      modo_tarifa_musicos_snapshot: modoTarifa,
      detalle_musicos_snapshot: detalleGuardado,
      tarifa_musico: Number(c.tarifa_musico || 0),
      dieta_musico: Number(c.dieta_musico || 0),
      nomina: Number(c.nomina || 0),
      dieta: Number(c.dieta || 0),
      transporte: Number(c.transporte || 0),
      sonido: Number(c.sonido || 0),
      road_manager: Number(c.road_manager || 0),
      incluye_manager_artistico: Boolean(c.incluye_manager_artistico),
      manager_artistico_base: Number(c.manager_artistico_base || 0),
      manager_artistico_porcentaje: Number(
        c.manager_artistico_porcentaje || 0,
      ),
      manager_artistico_monto: Number(c.manager_artistico_monto || 0),
      incluye_impuesto: Boolean(c.incluye_impuesto),
      impuesto_base: Number(c.impuesto_base || 0),
      impuesto_porcentaje: Number(c.impuesto_porcentaje || 0),
      impuesto_monto: Number(c.impuesto_monto || 0),
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
    setError("");
    setMostrarDetallesEvento(false);
    setCargando(Boolean(nextWorkspaceId));
  }

  function cambiar(e) {
    const { name, value, type, checked } = e.target;

    setForm((actual) => ({
      ...actual,
      [name]: type === "checkbox" ? checked : value,
    }));

    setResultado(null);
    setError("");
  }

  function seleccionarFormato(e) {
    const formatoId = e.target.value;
    const formato = formatos.find(
      (item) => String(item.id) === String(formatoId),
    );

    const modoTarifa = normalizarModoTarifa(formato?.modo_tarifa_musicos);

    const musicosConfig =
      modoTarifa === "individual"
        ? normalizarMusicosConfig(formato?.musicos_config)
        : [];

    setForm((actual) => ({
      ...actual,
      formato_id: formatoId,
      cantidad_musicos: formato
        ? modoTarifa === "individual"
          ? musicosConfig.length
          : Number(formato.cantidad_musicos ?? 0)
        : 1,
      modo_tarifa_musicos: modoTarifa,
      musicos_config: musicosConfig,
    }));

    setResultado(null);
    setError("");
  }

  function seleccionarCliente(e) {
    const clienteId = e.target.value;
    const cliente = clientes.find(
      (item) => String(item.id) === String(clienteId),
    );

    setForm((actual) => ({
      ...actual,
      cliente_id: clienteId,
      cliente_nombre: cliente?.nombre || "",
      cliente_telefono: cliente?.telefono || "",
      cliente_empresa: cliente?.empresa || "",
      cliente_email: cliente?.email || "",
    }));

    setResultado(null);
    setError("");
  }

  function validar() {
    if (!artistaSeleccionado) {
      toast.error("Selecciona el Artista que deseas cotizar.");
      return false;
    }

    if (!form.cliente_id && !form.cliente_nombre.trim()) {
      toast.error("Selecciona un cliente o escribe el nombre del cliente.");
      return false;
    }

    if (!form.cliente_telefono.trim()) {
      toast.error("El teléfono del cliente es obligatorio.");
      return false;
    }

    if (!form.provincia_id) {
      toast.error("Selecciona una zona.");
      return false;
    }

    if (!form.tipo_evento_config_id) {
      toast.error("Selecciona un tipo de evento.");
      return false;
    }

    if (!form.formato_id && !modoEdicion) {
      toast.error("Selecciona un formato.");
      return false;
    }

    const cantidadMusicos = Number(form.cantidad_musicos);

    if (!Number.isInteger(cantidadMusicos) || cantidadMusicos < 0) {
      toast.error(
        "El formato debe tener una cantidad válida de músicos igual o mayor que cero.",
      );
      return false;
    }

    const porcentajeManagerArtistico = Number(
      form.manager_artistico_porcentaje,
    );

    if (
      !Number.isFinite(porcentajeManagerArtistico) ||
      porcentajeManagerArtistico < 0 ||
      porcentajeManagerArtistico > 100
    ) {
      toast.error(
        "El porcentaje del manager artístico debe estar entre 0% y 100%.",
      );
      return false;
    }

    if (
      form.incluye_manager_artistico &&
      porcentajeManagerArtistico <= 0
    ) {
      toast.error(
        "Indica un porcentaje mayor que 0% para incluir al manager artístico.",
      );
      return false;
    }

    const porcentajeImpuesto = Number(form.impuesto_porcentaje);

    if (
      !Number.isFinite(porcentajeImpuesto) ||
      porcentajeImpuesto < 0 ||
      porcentajeImpuesto > 100
    ) {
      toast.error(
        "El porcentaje de impuesto debe estar entre 0% y 100%.",
      );
      return false;
    }

    if (form.incluye_impuesto && porcentajeImpuesto <= 0) {
      toast.error(
        "Indica un porcentaje mayor que 0% para incluir el impuesto.",
      );
      return false;
    }

    if (
      form.modo_tarifa_musicos === "individual" &&
      form.musicos_config.length !== cantidadMusicos
    ) {
      toast.error(
        "La configuración individual de músicos no coincide con el formato seleccionado.",
      );
      return false;
    }

    return true;
  }

  function calcular(e) {
    e.preventDefault();
    setError("");

    if (!validar()) return;

    const provincia = provincias.find(
      (item) => String(item.id) === String(form.provincia_id),
    );

    if (!provincia) {
      toast.error("Zona inválida.");
      return;
    }

    const tipoEventoSeleccionado = tiposEvento.find(
      (item) => String(item.id) === String(form.tipo_evento_config_id),
    );

    if (!tipoEventoSeleccionado) {
      toast.error("Tipo de evento inválido.");
      return;
    }

    const calculo = calcularCotizacion({
      provincia,
      cantidadMusicos: Number(form.cantidad_musicos),
      incluyeSonido: form.incluye_sonido,
      descuento: Number(form.descuento),
      incluyeManagerArtistico: form.incluye_manager_artistico,
      managerArtisticoPorcentaje:
        Number(form.manager_artistico_porcentaje) / 100,
      incluyeImpuesto: form.incluye_impuesto,
      impuestoPorcentaje: Number(form.impuesto_porcentaje) / 100,
      aplicarComision: !cotizacionEsArtista && comisionPorcentaje > 0,
      comisionPorcentaje: comisionPorcentaje / 100,
      tipoEventoConfig: tipoEventoSeleccionado,
      formato: {
        modo_tarifa_musicos: form.modo_tarifa_musicos,
        musicos_config: form.musicos_config,
      },
    });

    setResultado(calculo);

    setTimeout(() => {
      resultadoRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
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
      cotizacionWorkspaceId,
    );

    return nuevoCliente.id;
  }

  function volverAtras() {
    if (typeof goBack === "function") {
      goBack();
      return;
    }

    if (typeof goHome === "function") {
      goHome();
      return;
    }

    window.history.back();
  }

  async function guardar() {
    setError("");

    if (!resultado) {
      toast.error("Primero debes calcular la cotización.");
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
        (item) => String(item.id) === String(form.tipo_evento_config_id),
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
          tipo_evento_config_id: form.tipo_evento_config_id || null,
          tipo_evento: tipoEventoSeleccionado?.nombre || null,
          nombre_evento: form.nombre_evento || null,
          venue: form.venue || null,
          direccion_evento: form.direccion_evento || null,
          hora_montaje: form.hora_montaje || null,
          hora_inicio: form.hora_inicio || null,
          hora_fin: form.hora_fin || null,
          invitados: form.invitados ? Number(form.invitados) : null,
          contacto_evento: form.contacto_evento || null,
          telefono_contacto: form.telefono_contacto || null,
          observaciones: form.observaciones || null,

          cantidad_musicos: Number(
            resultado.cantidad_musicos ?? form.cantidad_musicos,
          ),
          incluye_sonido: form.incluye_sonido,
          incluye_manager_artistico: Boolean(
            form.incluye_manager_artistico &&
              Number(resultado.manager_artistico_monto || 0) > 0,
          ),
          manager_artistico_nombre_snapshot:
            form.manager_artistico_nombre.trim() || null,
          incluye_impuesto: Boolean(
            form.incluye_impuesto &&
              Number(resultado.impuesto_monto || 0) > 0,
          ),
          descuento: Number(form.descuento),
          estado: form.estado,

          ...resultado,
        },
        cotizacionWorkspaceId,
      );

      await ensureCotizacionPdf(
        guardada.id,
        cotizacionWorkspaceId,
        { force: true },
      );

      toast.success(
        modoEdicion
          ? "Cotización y PDF actualizados correctamente."
          : "Cotización y PDF guardados correctamente.",
      );

      if (onCotizacionGuardada) {
        onCotizacionGuardada(guardada.id, cotizacionWorkspaceId);
      }
    } catch (err) {
      console.error(err);

      const mensaje = err.message || "No se pudo guardar la cotización.";

      setError(mensaje);
      toast.error(mensaje);
    }
  }

  if (cargando) {
    return (
      <div className="dashboard">
        Cargando datos de{" "}
        {workspaceCotizacion?.workspace_name ||
          workspace?.workspace_name ||
          "Artista"}
        ...
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="top-bar">
        <div>
          <h1>{modoEdicion ? "Editar Cotización" : "Nueva Cotización"}</h1>
          <p>
            {workspaceCotizacion?.workspace_name ||
              (mostrarSelectorArtista
                ? "Selecciona un Artista"
                : workspace?.workspace_name || "Artista")}
            {" · "}
            {cotizacionEsArtista ? "Cuenta de Artista" : "Cuenta de Gestor"}
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
                <option key={item.workspace_id} value={item.workspace_id}>
                  {item.workspace_name}
                </option>
              ))}
            </select>

            <small
              style={{
                display: "block",
                marginTop: 8,
                color: "var(--muted)",
              }}
            >
              {modoEdicion
                ? "El Artista no puede cambiarse al editar una cotización."
                : "Al elegirlo se cargarán sus clientes, zonas, formatos, tarifas y tipos de evento."}
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
                <option value="">Crear / escribir cliente nuevo</option>

                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                    {cliente.empresa ? ` - ${cliente.empresa}` : ""}
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
                <option value="">Seleccionar tipo de evento</option>

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
                onClick={() => setMostrarDetallesEvento((actual) => !actual)}
              >
                {mostrarDetallesEvento
                  ? "Ocultar detalles del evento"
                  : "Mostrar más detalles"}
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
                        ? "Formato anterior"
                        : "Seleccionar formato"}
                    </option>

                    {formatos.map((formato) => (
                      <option key={formato.id} value={formato.id}>
                        {formato.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Músicos acompañantes</label>
                  <input
                    type="number"
                    name="cantidad_musicos"
                    min="0"
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
                  <select name="estado" value={form.estado} onChange={cambiar}>
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
                    display: "flex",
                    alignItems: "flex-end",
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

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                  }}
                >
                  <label className="check-row">
                    <input
                      type="checkbox"
                      name="incluye_manager_artistico"
                      checked={form.incluye_manager_artistico}
                      onChange={cambiar}
                    />
                    Incluir manager artístico
                  </label>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                  }}
                >
                  <label className="check-row">
                    <input
                      type="checkbox"
                      name="incluye_impuesto"
                      checked={form.incluye_impuesto}
                      onChange={cambiar}
                    />
                    Incluir impuesto
                  </label>
                </div>

              </div>

              {form.incluye_manager_artistico && (
                <div
                  className="form-grid"
                  style={{
                    marginTop: 16,
                    padding: 14,
                    border: "1px solid rgba(148, 163, 184, 0.25)",
                    borderRadius: 14,
                    background: "rgba(148, 163, 184, 0.06)",
                  }}
                >
                  <div>
                    <label>Nombre o empresa del manager</label>
                    <input
                      type="text"
                      name="manager_artistico_nombre"
                      value={form.manager_artistico_nombre}
                      onChange={cambiar}
                      placeholder="Opcional"
                    />
                  </div>

                  <div>
                    <label>Porcentaje del manager (%) *</label>
                    <input
                      type="number"
                      name="manager_artistico_porcentaje"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.manager_artistico_porcentaje}
                      onChange={cambiar}
                    />
                  </div>

                  <small style={{ gridColumn: "1 / -1" }}>
                    Se calcula sobre el subtotal después del descuento.
                  </small>
                </div>
              )}

              {form.incluye_impuesto && (
                <div
                  className="form-grid"
                  style={{
                    marginTop: 16,
                    padding: 14,
                    border: "1px solid rgba(148, 163, 184, 0.25)",
                    borderRadius: 14,
                    background: "rgba(148, 163, 184, 0.06)",
                  }}
                >
                  <div>
                    <label>Porcentaje de impuesto (%) *</label>
                    <input
                      type="number"
                      name="impuesto_porcentaje"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.impuesto_porcentaje}
                      onChange={cambiar}
                    />
                  </div>

                  <small style={{ gridColumn: "1 / -1" }}>
                    Se calcula sobre el monto neto después del descuento, el
                    manager artístico y la comisión comercial.
                  </small>
                </div>
              )}

              {form.formato_id && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    border: "1px solid rgba(148, 163, 184, 0.25)",
                    borderRadius: 14,
                    background: "rgba(148, 163, 184, 0.06)",
                  }}
                >
                  <strong>
                    {form.modo_tarifa_musicos === "individual"
                      ? "Tarifas individuales por músico"
                      : "Misma tarifa para todos los músicos"}
                  </strong>

                  <p style={{ margin: "6px 0 0" }}>
                    {form.modo_tarifa_musicos === "individual"
                      ? "MiBooking calculará cada integrante según la configuración definida por el Artista en este formato."
                      : "MiBooking utilizará la tarifa por músico de la zona para todos los acompañantes."}
                  </p>

                  {form.modo_tarifa_musicos === "individual" &&
                    form.musicos_config.length > 0 && (
                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        {form.musicos_config.map((musico, index) => (
                          <span
                            key={`${index}-${musico.rol}`}
                            style={{
                              padding: "5px 8px",
                              borderRadius: 999,
                              background: "rgba(99, 102, 241, 0.1)",
                              fontSize: 12,
                              fontWeight: 750,
                            }}
                          >
                            {musico.rol}
                            {musico.nombre ? ` · ${musico.nombre}` : ""}
                            {" · "}
                            {descripcionTipoTarifa(musico)}
                          </span>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {!resultado && error && <p className="error">{error}</p>}

              <div className="form-actions">
                <button type="submit">Calcular Cotización</button>
              </div>
            </section>
          </div>
        ) : (
          <div className="workspace-state-card">
            <h2>Selecciona un Artista</h2>
            <p>
              Elige el Artista para cargar la información necesaria y comenzar
              la cotización.
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
                  (formato) => String(formato.id) === String(form.formato_id),
                )?.nombre || `${form.cantidad_musicos} músico(s)`}
              </strong>
            </div>

            <div className="fila">
              <span>Tipo de evento</span>
              <strong>
                {tiposEvento.find(
                  (tipo) =>
                    String(tipo.id) === String(form.tipo_evento_config_id),
                )?.nombre || "No seleccionado"}
              </strong>
            </div>

            <div className="fila">
              <span>Honorarios</span>
              <strong>RD$ {resultado.honorarios.toLocaleString()}</strong>
            </div>

            {resultado.multiplicador_honorarios > 1 && (
              <div className="fila">
                <span>Multiplicador aplicado</span>
                <strong>x{resultado.multiplicador_honorarios}</strong>
              </div>
            )}

            {resultado.ensayo_extra > 0 && (
              <div className="fila">
                <span>Ensayo extra</span>
                <strong>RD$ {resultado.ensayo_extra.toLocaleString()}</strong>
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
              <strong>RD$ {resultado.nomina.toLocaleString()}</strong>
            </div>

            {resultado.modo_tarifa_musicos_snapshot === "individual" &&
              Array.isArray(resultado.detalle_musicos_snapshot) &&
              resultado.detalle_musicos_snapshot.length > 0 && (
                <div
                  className="fila"
                  style={{
                    gridColumn: "1 / -1",
                    display: "block",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Desglose interno de músicos
                  </span>

                  <div
                    style={{
                      display: "grid",
                      gap: 7,
                    }}
                  >
                    {resultado.detalle_musicos_snapshot.map((musico, index) => (
                      <div
                        key={`${index}-${musico.rol}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 14,
                          padding: "7px 0",
                          borderBottom: "1px solid rgba(148, 163, 184, 0.18)",
                        }}
                      >
                        <span>
                          {musico.rol || `Músico ${index + 1}`}
                          {musico.nombre ? ` · ${musico.nombre}` : ""}
                        </span>

                        <strong>
                          RD${" "}
                          {Number(musico.monto || 0).toLocaleString("es-DO")}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <small
                    style={{
                      display: "block",
                      marginTop: 9,
                    }}
                  >
                    Este desglose es interno y no se muestra al cliente en la
                    cotización impresa.
                  </small>
                </div>
              )}

            <div className="fila">
              <span>Dieta</span>
              <strong>RD$ {resultado.dieta.toLocaleString()}</strong>
            </div>

            <div className="fila">
              <span>Transporte</span>
              <strong>RD$ {resultado.transporte.toLocaleString()}</strong>
            </div>

            <div className="fila">
              <span>Sonido</span>
              <strong>RD$ {resultado.sonido.toLocaleString()}</strong>
            </div>

            <div className="fila">
              <span>Road Manager</span>
              <strong>RD$ {resultado.road_manager.toLocaleString()}</strong>
            </div>

            <div className="fila">
              <span>Subtotal</span>
              <strong>RD$ {resultado.subtotal.toLocaleString()}</strong>
            </div>

            <div className="fila">
              <span>Descuento {resultado.descuento}%</span>
              <strong>RD$ {resultado.monto_descuento.toLocaleString()}</strong>
            </div>

            {resultado.incluye_manager_artistico && (
              <div className="fila">
                <span>
                  Manager artístico
                  {form.manager_artistico_nombre
                    ? ` · ${form.manager_artistico_nombre}`
                    : ""}
                  {` (${resultado.manager_artistico_porcentaje}%)`}
                </span>
                <strong>
                  RD$ {resultado.manager_artistico_monto.toLocaleString()}
                </strong>
              </div>
            )}

            <div className="fila">
              <span>
                Comisión
                {cotizacionEsArtista
                  ? " (Artista: no aplica)"
                  : ` (${comisionPorcentaje}%)`}
              </span>
              <strong>RD$ {resultado.comision.toLocaleString()}</strong>
            </div>

            {resultado.incluye_impuesto && (
              <div className="fila">
                <span>Impuesto ({resultado.impuesto_porcentaje}%)</span>
                <strong>RD$ {resultado.impuesto_monto.toLocaleString()}</strong>
              </div>
            )}

            <div className="fila">
              <span>Total redondeado</span>
              <strong>RD$ {resultado.total.toLocaleString()}</strong>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={guardar}>
              {modoEdicion ? "Actualizar Cotización" : "Guardar Cotización"}
            </button>
          </div>

          {error && <p className="error">{error}</p>}
        </div>
      )}
    </div>
  );
}
