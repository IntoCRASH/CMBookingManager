import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Modal from "../components/Modal";
import RiderFormatoModal from "./RiderFormatoModal";
import {
  deleteFormato,
  getFormatos,
  saveFormato,
} from "../lib/formatosService";

const nuevoRegistro = {
  nombre: "",
  cantidad_musicos: 1,
  modo_tarifa_musicos: "uniforme",
  musicos_config: [],
  activo: true,
};

function crearMusicoConfig(index) {
  return {
    rol: `Músico ${index + 1}`,
    nombre: "",
    tipo_tarifa: "estandar",
    valor: 1,
  };
}

function normalizarMusicosConfig(value) {
  if (!Array.isArray(value)) return [];

  return value.map((musico, index) => ({
    rol: String(musico?.rol || `Músico ${index + 1}`),
    nombre: String(musico?.nombre || ""),
    tipo_tarifa: ["estandar", "multiplicador", "fija"].includes(
      musico?.tipo_tarifa,
    )
      ? musico.tipo_tarifa
      : "estandar",
    valor: Number(musico?.valor ?? (musico?.tipo_tarifa === "fija" ? 0 : 1)),
  }));
}

const musicianCardStyle = {
  marginTop: 12,
  padding: 14,
  border: "1px solid rgba(148, 163, 184, 0.28)",
  borderRadius: 14,
  background: "rgba(148, 163, 184, 0.06)",
};

const musicianGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
};

function hasRiderConfig(formato) {
  return Boolean(
    formato?.rider_config &&
    Array.isArray(formato.rider_config.integrantes) &&
    formato.rider_config.integrantes.length > 0,
  );
}

export default function Formatos({ workspaceId, workspace, goBack }) {
  const [formatos, setFormatos] = useState([]);
  const [form, setForm] = useState(nuevoRegistro);
  const [modalOpen, setModalOpen] = useState(false);
  const [riderFormato, setRiderFormato] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const nombreArtista = workspace?.workspace_name || "Artista activo";

  useEffect(() => {
    setBusqueda("");
    setModalOpen(false);
    setRiderFormato(null);
    setForm(nuevoRegistro);
    setError("");

    if (!workspaceId) {
      setFormatos([]);
      setCargando(false);
      return;
    }

    cargar();
  }, [workspaceId]);

  async function cargar() {
    try {
      setCargando(true);
      setError("");

      const data = await getFormatos(workspaceId);
      setFormatos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);

      const mensaje = err.message || "No se pudieron cargar los formatos.";

      setError(mensaje);
      toast.error(mensaje);
    } finally {
      setCargando(false);
    }
  }

  function nuevo() {
    if (!workspaceId) {
      toast.error("No hay un Artista activo.");
      return;
    }

    setForm(nuevoRegistro);
    setError("");
    setModalOpen(true);
  }

  function editar(formato) {
    const modoTarifa =
      formato.modo_tarifa_musicos === "individual" ? "individual" : "uniforme";

    const musicosConfig = normalizarMusicosConfig(formato.musicos_config);

    setForm({
      id: formato.id,
      nombre: formato.nombre || "",
      cantidad_musicos:
        modoTarifa === "individual"
          ? musicosConfig.length
          : Number(formato.cantidad_musicos ?? 1),
      modo_tarifa_musicos: modoTarifa,
      musicos_config: musicosConfig,
      activo: Boolean(formato.activo),
    });

    setError("");
    setModalOpen(true);
  }

  async function duplicar(formato) {
    if (!workspaceId) {
      toast.error("No hay un Artista activo.");
      return;
    }

    try {
      await saveFormato(
        {
          nombre: `${formato.nombre || "Formato"} copia`,
          cantidad_musicos: Number(formato.cantidad_musicos ?? 1),
          modo_tarifa_musicos:
            formato.modo_tarifa_musicos === "individual"
              ? "individual"
              : "uniforme",
          musicos_config: normalizarMusicosConfig(formato.musicos_config),
          activo: Boolean(formato.activo),
          rider_config:
            formato.rider_config && typeof formato.rider_config === "object"
              ? formato.rider_config
              : {},
        },
        workspaceId,
      );

      toast.success(
        hasRiderConfig(formato)
          ? "Formato y configuración técnica duplicados."
          : "Formato duplicado correctamente.",
      );

      await cargar();
    } catch (err) {
      console.error(err);

      toast.error(err.message || "No se pudo duplicar el formato.");
    }
  }

  function cambiar(event) {
    const { name, value, type, checked } = event.target;

    setForm((actual) => ({
      ...actual,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function cambiarModoTarifa(event) {
    const modo = event.target.value;

    setForm((actual) => {
      if (modo === "individual") {
        const cantidad = Math.max(0, Number(actual.cantidad_musicos || 0));

        const musicosConfig =
          actual.musicos_config.length > 0
            ? actual.musicos_config
            : Array.from({ length: cantidad }, (_, index) =>
                crearMusicoConfig(index),
              );

        return {
          ...actual,
          modo_tarifa_musicos: "individual",
          musicos_config: musicosConfig,
          cantidad_musicos: musicosConfig.length,
        };
      }

      return {
        ...actual,
        modo_tarifa_musicos: "uniforme",
        cantidad_musicos:
          actual.musicos_config.length || Number(actual.cantidad_musicos || 0),
      };
    });

    setError("");
  }

  function agregarMusico() {
    setForm((actual) => {
      const musicosConfig = [
        ...actual.musicos_config,
        crearMusicoConfig(actual.musicos_config.length),
      ];

      return {
        ...actual,
        musicos_config: musicosConfig,
        cantidad_musicos: musicosConfig.length,
      };
    });
  }

  function cambiarMusico(index, field, value) {
    setForm((actual) => {
      const musicosConfig = actual.musicos_config.map(
        (musico, currentIndex) => {
          if (currentIndex !== index) return musico;

          if (field === "tipo_tarifa") {
            return {
              ...musico,
              tipo_tarifa: value,
              valor: value === "fija" ? 0 : 1,
            };
          }

          return {
            ...musico,
            [field]: value,
          };
        },
      );

      return {
        ...actual,
        musicos_config: musicosConfig,
      };
    });

    setError("");
  }

  function quitarMusico(index) {
    setForm((actual) => {
      const musicosConfig = actual.musicos_config.filter(
        (_, currentIndex) => currentIndex !== index,
      );

      return {
        ...actual,
        musicos_config: musicosConfig,
        cantidad_musicos: musicosConfig.length,
      };
    });
  }

  async function guardar(event) {
    event.preventDefault();
    setError("");

    if (!workspaceId) {
      setError("No hay un Artista activo.");
      return;
    }

    if (!form.nombre.trim()) {
      setError("El nombre del formato es obligatorio.");
      return;
    }

    const modoTarifa =
      form.modo_tarifa_musicos === "individual" ? "individual" : "uniforme";

    const cantidadMusicos =
      modoTarifa === "individual"
        ? form.musicos_config.length
        : Number(form.cantidad_musicos);

    if (!Number.isInteger(cantidadMusicos) || cantidadMusicos < 0) {
      setError(
        "La cantidad de músicos debe ser un número entero igual o mayor que cero.",
      );
      return;
    }

    if (modoTarifa === "individual") {
      for (let index = 0; index < form.musicos_config.length; index += 1) {
        const musico = form.musicos_config[index];
        const rol = String(musico?.rol || "").trim();
        const valor = Number(musico?.valor);

        if (!rol) {
          setError(`Escribe el rol o instrumento del músico ${index + 1}.`);
          return;
        }

        if (
          musico.tipo_tarifa === "multiplicador" &&
          (!Number.isFinite(valor) || valor <= 0)
        ) {
          setError(`El multiplicador de ${rol} debe ser mayor que cero.`);
          return;
        }

        if (
          musico.tipo_tarifa === "fija" &&
          (!Number.isFinite(valor) || valor < 0)
        ) {
          setError(`La tarifa fija de ${rol} no puede ser negativa.`);
          return;
        }
      }
    }

    try {
      await saveFormato(
        {
          ...form,
          nombre: form.nombre.trim(),
          cantidad_musicos: cantidadMusicos,
          modo_tarifa_musicos: modoTarifa,
          musicos_config:
            modoTarifa === "individual" ? form.musicos_config : [],
          activo: form.id ? Boolean(form.activo) : true,
        },
        workspaceId,
      );

      toast.success(
        form.id
          ? "Formato actualizado correctamente."
          : "Formato creado correctamente.",
      );

      setModalOpen(false);
      setForm(nuevoRegistro);
      await cargar();
    } catch (err) {
      console.error(err);

      const mensaje = err.message || "No se pudo guardar el formato.";

      setError(mensaje);
      toast.error(mensaje);
    }
  }

  async function borrar(id, nombre) {
    const confirmado = window.confirm(
      `¿Deseas borrar definitivamente el formato "${nombre || "Sin nombre"}"?`,
    );

    if (!confirmado) return;

    try {
      await deleteFormato(id, workspaceId);

      toast.success("Formato eliminado correctamente.");
      await cargar();
    } catch (err) {
      console.error(err);

      toast.error(err.message || "No se pudo borrar el formato.");
    }
  }

  function riderGuardado(saved) {
    setFormatos((actuales) =>
      actuales.map((item) =>
        String(item.id) === String(saved.id) ? saved : item,
      ),
    );
  }

  const formatosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return formatos;

    return formatos.filter((formato) =>
      String(formato.nombre || "")
        .toLowerCase()
        .includes(texto),
    );
  }, [formatos, busqueda]);

  return (
    <div className="dashboard formatos-page">
      <div className="top-bar">
        <div>
          <h1>Formatos</h1>
          <p>Formatos musicales y configuración técnica de {nombreArtista}</p>
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

          <strong>Formatos de {nombreArtista}</strong>

          <p>
            Cada Formato puede tener su propia formación, lista de canales,
            monitores, backline y stage plot.
          </p>
        </div>

        <div className="config-artista-control">
          <label>Artista activo</label>
          <strong>{nombreArtista}</strong>
        </div>
      </section>

      <div className="actions-row formatos-actions">
        <input
          type="search"
          placeholder="Buscar formato..."
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          disabled={!workspaceId}
        />

        <button type="button" onClick={nuevo} disabled={!workspaceId}>
          + Nuevo Formato
        </button>
      </div>

      <div className="formatos-lista">
        <div className="formatos-header" aria-hidden="true">
          <span>Formato</span>
          <span>Acciones</span>
        </div>

        {!workspaceId ? (
          <div className="config-artista-empty">
            <strong>No hay un Artista activo.</strong>
            <span>Selecciona un Artista para consultar sus formatos.</span>
          </div>
        ) : cargando ? (
          <div className="formatos-empty">Cargando formatos...</div>
        ) : formatosFiltrados.length === 0 ? (
          <div className="formatos-empty">
            {error || "Este Artista todavía no tiene formatos configurados."}
          </div>
        ) : (
          formatosFiltrados.map((formato) => (
            <article className="formato-row" key={formato.id}>
              <div className="formato-nombre">
                <span className="formato-icono">♪</span>

                <div>
                  <strong>{formato.nombre || "Sin nombre"}</strong>

                  <small>
                    {Number(formato.cantidad_musicos ?? 1)} músico
                    {Number(formato.cantidad_musicos ?? 1) !== 1 ? "s" : ""}
                    {" · "}
                    {formato.modo_tarifa_musicos === "individual"
                      ? "Tarifas individuales"
                      : "Tarifa uniforme"}
                    {" · "}
                    <span
                      style={{
                        fontWeight: 850,
                        color: hasRiderConfig(formato) ? "#15803d" : "#b45309",
                      }}
                    >
                      {hasRiderConfig(formato)
                        ? "Rider configurado"
                        : "Rider pendiente"}
                    </span>
                  </small>
                </div>
              </div>

              <div className="formato-acciones">
                <button type="button" onClick={() => editar(formato)}>
                  Editar
                </button>

                <button type="button" onClick={() => setRiderFormato(formato)}>
                  Configurar rider
                </button>

                <button type="button" onClick={() => duplicar(formato)}>
                  Duplicar
                </button>

                <button
                  type="button"
                  className="danger-btn"
                  onClick={() => borrar(formato.id, formato.nombre)}
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
        title={form.id ? "Editar Formato" : "Nuevo Formato"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={guardar}>
          <p className="config-modal-context">
            Artista: <strong>{nombreArtista}</strong>
          </p>

          <label>Nombre del formato *</label>

          <input
            name="nombre"
            value={form.nombre}
            onChange={cambiar}
            placeholder="Ej: Trío, Full Band, Orquesta full"
          />

          <label>Forma de calcular los músicos *</label>

          <select
            name="modo_tarifa_musicos"
            value={form.modo_tarifa_musicos}
            onChange={cambiarModoTarifa}
          >
            <option value="uniforme">Misma tarifa para todos</option>
            <option value="individual">Tarifas diferentes por músico</option>
          </select>

          <p style={{ marginTop: 8 }}>
            La tarifa uniforme usa el precio por músico de la zona. En el modo
            individual puedes asignar a cada integrante la tarifa estándar, un
            multiplicador o un monto fijo.
          </p>

          {form.modo_tarifa_musicos === "uniforme" ? (
            <>
              <label>Cantidad de músicos acompañantes *</label>

              <input
                name="cantidad_musicos"
                type="number"
                min="0"
                step="1"
                value={form.cantidad_musicos}
                onChange={cambiar}
              />
            </>
          ) : (
            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <strong>Integrantes y tarifas</strong>
                  <p style={{ margin: "4px 0 0" }}>
                    El nombre real es opcional. El rol o instrumento sí es
                    obligatorio.
                  </p>
                </div>

                <button type="button" onClick={agregarMusico}>
                  + Agregar músico
                </button>
              </div>

              {form.musicos_config.length === 0 ? (
                <div style={musicianCardStyle}>
                  Este formato no tiene músicos acompañantes. Puedes dejarlo así
                  o agregar integrantes.
                </div>
              ) : (
                form.musicos_config.map((musico, index) => (
                  <div key={index} style={musicianCardStyle}>
                    <div style={musicianGridStyle}>
                      <div>
                        <label>Rol o instrumento *</label>
                        <input
                          type="text"
                          value={musico.rol}
                          onChange={(event) =>
                            cambiarMusico(index, "rol", event.target.value)
                          }
                          placeholder="Ej: Director musical"
                        />
                      </div>

                      <div>
                        <label>Nombre opcional</label>
                        <input
                          type="text"
                          value={musico.nombre}
                          onChange={(event) =>
                            cambiarMusico(index, "nombre", event.target.value)
                          }
                          placeholder="Nombre del músico"
                        />
                      </div>

                      <div>
                        <label>Tipo de tarifa</label>
                        <select
                          value={musico.tipo_tarifa}
                          onChange={(event) =>
                            cambiarMusico(
                              index,
                              "tipo_tarifa",
                              event.target.value,
                            )
                          }
                        >
                          <option value="estandar">
                            Tarifa estándar de la zona
                          </option>
                          <option value="multiplicador">
                            Multiplicador individual
                          </option>
                          <option value="fija">Monto fijo</option>
                        </select>
                      </div>

                      <div>
                        <label>
                          {musico.tipo_tarifa === "fija"
                            ? "Monto fijo"
                            : musico.tipo_tarifa === "multiplicador"
                              ? "Multiplicador"
                              : "Valor"}
                        </label>
                        <input
                          type="number"
                          min={musico.tipo_tarifa === "fija" ? "0" : "0.1"}
                          step={musico.tipo_tarifa === "fija" ? "100" : "0.05"}
                          value={musico.valor}
                          disabled={musico.tipo_tarifa === "estandar"}
                          onChange={(event) =>
                            cambiarMusico(index, "valor", event.target.value)
                          }
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => quitarMusico(index)}
                      style={{ marginTop: 10 }}
                    >
                      Quitar músico
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          <p style={{ marginTop: 14 }}>
            La configuración del rider sigue siendo independiente y permite
            organizar la formación técnica completa en tarima.
          </p>

          {form.id && (
            <label className="check-row">
              <input
                type="checkbox"
                name="activo"
                checked={form.activo}
                onChange={cambiar}
              />
              Activo
            </label>
          )}

          {error && <p className="error">{error}</p>}

          <div className="modal-actions">
            <button type="button" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>

            <button type="submit">Guardar</button>
          </div>
        </form>
      </Modal>

      <RiderFormatoModal
        open={Boolean(riderFormato)}
        formato={riderFormato}
        workspaceId={workspaceId}
        onClose={() => setRiderFormato(null)}
        onSaved={riderGuardado}
      />
    </div>
  );
}
