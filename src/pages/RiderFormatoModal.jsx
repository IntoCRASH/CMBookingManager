import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { saveFormatoRiderConfig } from '../lib/formatosService';
import './RiderFormatoModal.css';

const POSICIONES = [
  'Frente izquierda',
  'Frente centro',
  'Frente derecha',
  'Centro izquierda',
  'Centro',
  'Centro derecha',
  'Fondo izquierda',
  'Fondo centro',
  'Fondo derecha',
];

const CONEXIONES = [
  'Micrófono',
  'DI mono',
  'DI estéreo',
  'Línea',
  'MIDI / USB',
  'Inalámbrico',
  'Otro',
];

const PROVEEDORES = [
  'Contratante',
  'Artista',
  'Compañía de sonido',
  'Por confirmar',
];

function uid(prefix = 'item') {
  if (
    typeof window !== 'undefined' &&
    window.crypto?.randomUUID
  ) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function createDefaultMember(index) {
  if (index === 0) {
    return {
      id: uid('integrante'),
      funcion: 'Artista / Voz principal',
      instrumento: 'Voz principal',
      hace_coros: false,
      canales: 1,
      conexion: 'Micrófono',
      posicion: 'Frente centro',
      monitor: 'Mix 1',
      prioridad_monitor: 'Voz principal y banda general',
      requerimientos:
        'Micrófono vocal profesional\nPie boom\nCable XLR',
    };
  }

  return {
    id: uid('integrante'),
    funcion: `Músico ${index}`,
    instrumento: '',
    hace_coros: false,
    canales: 1,
    conexion: 'Micrófono',
    posicion: 'Centro',
    monitor: `Mix ${index + 1}`,
    prioridad_monitor: '',
    requerimientos: '',
  };
}

function buildDefaultConfig(formato) {
  const supportingMusicians = Math.max(
    1,
    Number(formato?.cantidad_musicos || 1)
  );

  return {
    version: 1,
    contacto_tecnico: {
      nombre: '',
      telefono: '',
      email: '',
    },
    tarima: {
      ancho_metros: 6,
      fondo_metros: 4,
    },
    tiempos: {
      acceso_minutos: 90,
      line_check_minutos: 20,
      prueba_sonido_minutos: 60,
    },
    sistema: {
      entradas_minimas: 16,
      auxiliares_minimos: supportingMusicians + 1,
      pa:
        'Sistema profesional dimensionado para la capacidad y acústica del lugar, con subwoofers suficientes para bombo y bajo.',
      electricidad:
        'Circuitos aterrizados, distribución segura y alimentación separada de iluminación de alto consumo.',
      hospitalidad:
        'Agua fría para todos los integrantes, toallas limpias, área privada de descanso y alimentación según el horario del evento.',
      notas_generales:
        'Cualquier sustitución o reducción deberá ser aprobada previamente por el Artista o su representante técnico.',
    },
    integrantes: Array.from(
      { length: supportingMusicians + 1 },
      (_, index) => createDefaultMember(index)
    ),
    requerimientos_generales: [
      {
        id: uid('requerimiento'),
        elemento: 'Consola profesional',
        cantidad: 1,
        proveedor: 'Compañía de sonido',
        notas: 'Con canales y auxiliares suficientes para este formato.',
      },
      {
        id: uid('requerimiento'),
        elemento: 'Monitores de piso',
        cantidad: supportingMusicians + 1,
        proveedor: 'Compañía de sonido',
        notas: 'Una mezcla independiente por posición, cuando sea posible.',
      },
    ],
  };
}

function normalizeConfig(formato) {
  const raw = formato?.rider_config;

  if (
    raw &&
    typeof raw === 'object' &&
    Array.isArray(raw.integrantes) &&
    raw.integrantes.length > 0
  ) {
    return {
      ...buildDefaultConfig(formato),
      ...raw,
      contacto_tecnico: {
        ...buildDefaultConfig(formato).contacto_tecnico,
        ...(raw.contacto_tecnico || {}),
      },
      tarima: {
        ...buildDefaultConfig(formato).tarima,
        ...(raw.tarima || {}),
      },
      tiempos: {
        ...buildDefaultConfig(formato).tiempos,
        ...(raw.tiempos || {}),
      },
      sistema: {
        ...buildDefaultConfig(formato).sistema,
        ...(raw.sistema || {}),
      },
      integrantes: raw.integrantes.map((item, index) => ({
        ...createDefaultMember(index),
        ...item,
        id: item.id || uid('integrante'),
      })),
      requerimientos_generales: Array.isArray(
        raw.requerimientos_generales
      )
        ? raw.requerimientos_generales.map((item) => ({
            id: item.id || uid('requerimiento'),
            elemento: item.elemento || '',
            cantidad: Number(item.cantidad || 1),
            proveedor: item.proveedor || 'Por confirmar',
            notas: item.notas || '',
          }))
        : [],
    };
  }

  return buildDefaultConfig(formato);
}

export default function RiderFormatoModal({
  open,
  formato,
  workspaceId,
  onClose,
  onSaved,
}) {
  const [config, setConfig] = useState(() =>
    buildDefaultConfig(formato)
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !formato) return;

    setConfig(normalizeConfig(formato));
    setError('');
  }, [open, formato]);

  const totalCanales = useMemo(
    () =>
      config.integrantes.reduce(
        (total, item) => total + Number(item.canales || 0),
        0
      ),
    [config.integrantes]
  );

  if (!open || !formato) return null;

  function updateNested(section, field, value) {
    setConfig((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  }

  function updateMember(id, field, value) {
    setConfig((current) => ({
      ...current,
      integrantes: current.integrantes.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }));
  }

  function addMember() {
    setConfig((current) => ({
      ...current,
      integrantes: [
        ...current.integrantes,
        createDefaultMember(current.integrantes.length),
      ],
    }));
  }

  function removeMember(id) {
    setConfig((current) => ({
      ...current,
      integrantes: current.integrantes.filter(
        (item) => item.id !== id
      ),
    }));
  }

  function addRequirement() {
    setConfig((current) => ({
      ...current,
      requerimientos_generales: [
        ...current.requerimientos_generales,
        {
          id: uid('requerimiento'),
          elemento: '',
          cantidad: 1,
          proveedor: 'Por confirmar',
          notas: '',
        },
      ],
    }));
  }

  function updateRequirement(id, field, value) {
    setConfig((current) => ({
      ...current,
      requerimientos_generales:
        current.requerimientos_generales.map((item) =>
          item.id === id
            ? {
                ...item,
                [field]: value,
              }
            : item
        ),
    }));
  }

  function removeRequirement(id) {
    setConfig((current) => ({
      ...current,
      requerimientos_generales:
        current.requerimientos_generales.filter(
          (item) => item.id !== id
        ),
    }));
  }

  function validate() {
    if (config.integrantes.length === 0) {
      toast.error('Agrega por lo menos un integrante.');
      return false;
    }

    const invalidMember = config.integrantes.find(
      (item) =>
        !String(item.funcion || '').trim() ||
        !String(item.instrumento || '').trim() ||
        Number(item.canales || 0) < 0
    );

    if (invalidMember) {
      toast.error(
        'Cada integrante debe tener función, instrumento y canales válidos.'
      );
      return false;
    }

    return true;
  }

  async function save(event) {
    event.preventDefault();
    setError('');

    if (!validate()) return;

    try {
      setGuardando(true);

      const cleanConfig = {
        ...config,
        version: 1,
        integrantes: config.integrantes.map((item) => ({
          ...item,
          funcion: String(item.funcion || '').trim(),
          instrumento: String(item.instrumento || '').trim(),
          canales: Number(item.canales || 0),
          hace_coros: Boolean(item.hace_coros),
        })),
        requerimientos_generales:
          config.requerimientos_generales
            .filter((item) =>
              String(item.elemento || '').trim()
            )
            .map((item) => ({
              ...item,
              elemento: String(item.elemento || '').trim(),
              cantidad: Math.max(1, Number(item.cantidad || 1)),
              notas: String(item.notas || '').trim(),
            })),
        updated_at: new Date().toISOString(),
      };

      const saved = await saveFormatoRiderConfig(
        formato.id,
        cleanConfig,
        workspaceId
      );

      toast.success(
        'Rider técnico del Formato guardado correctamente.'
      );

      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      console.error(err);

      const message =
        err.message || 'No se pudo guardar el rider del Formato.';

      setError(message);
      toast.error(message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      className="rider-config-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !guardando) {
          onClose?.();
        }
      }}
    >
      <div
        className="rider-config-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rider-config-title"
      >
        <header className="rider-config-header">
          <div>
            <span>Configuración técnica</span>
            <h2 id="rider-config-title">
              Rider de {formato.nombre || 'Formato'}
            </h2>
            <p>
              {config.integrantes.length} personas en tarima ·{' '}
              {totalCanales} canales configurados
            </p>
          </div>

          <button
            type="button"
            className="rider-config-close"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <form onSubmit={save} className="rider-config-body">
          <section className="rider-config-section rider-config-two-columns">
            <div>
              <h3>Contacto técnico</h3>

              <label>Nombre</label>
              <input
                value={config.contacto_tecnico.nombre}
                onChange={(event) =>
                  updateNested(
                    'contacto_tecnico',
                    'nombre',
                    event.target.value
                  )
                }
                placeholder="Nombre del responsable técnico"
              />

              <label>Teléfono</label>
              <input
                value={config.contacto_tecnico.telefono}
                onChange={(event) =>
                  updateNested(
                    'contacto_tecnico',
                    'telefono',
                    event.target.value
                  )
                }
              />

              <label>Correo</label>
              <input
                type="email"
                value={config.contacto_tecnico.email}
                onChange={(event) =>
                  updateNested(
                    'contacto_tecnico',
                    'email',
                    event.target.value
                  )
                }
              />
            </div>

            <div>
              <h3>Tarima y tiempos</h3>

              <div className="rider-config-mini-grid">
                <div>
                  <label>Ancho mínimo (m)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={config.tarima.ancho_metros}
                    onChange={(event) =>
                      updateNested(
                        'tarima',
                        'ancho_metros',
                        Number(event.target.value)
                      )
                    }
                  />
                </div>

                <div>
                  <label>Fondo mínimo (m)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={config.tarima.fondo_metros}
                    onChange={(event) =>
                      updateNested(
                        'tarima',
                        'fondo_metros',
                        Number(event.target.value)
                      )
                    }
                  />
                </div>

                <div>
                  <label>Acceso previo (min)</label>
                  <input
                    type="number"
                    min="0"
                    value={config.tiempos.acceso_minutos}
                    onChange={(event) =>
                      updateNested(
                        'tiempos',
                        'acceso_minutos',
                        Number(event.target.value)
                      )
                    }
                  />
                </div>

                <div>
                  <label>Line check (min)</label>
                  <input
                    type="number"
                    min="0"
                    value={config.tiempos.line_check_minutos}
                    onChange={(event) =>
                      updateNested(
                        'tiempos',
                        'line_check_minutos',
                        Number(event.target.value)
                      )
                    }
                  />
                </div>

                <div>
                  <label>Prueba de sonido (min)</label>
                  <input
                    type="number"
                    min="0"
                    value={config.tiempos.prueba_sonido_minutos}
                    onChange={(event) =>
                      updateNested(
                        'tiempos',
                        'prueba_sonido_minutos',
                        Number(event.target.value)
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rider-config-section">
            <div className="rider-config-section-title">
              <div>
                <h3>Integrantes, canales y monitoreo</h3>
                <p>
                  La cantidad puede ajustarse independientemente del valor
                  usado para calcular la cotización.
                </p>
              </div>

              <button type="button" onClick={addMember}>
                + Agregar integrante
              </button>
            </div>

            <div className="rider-member-list">
              {config.integrantes.map((item, index) => (
                <article className="rider-member-card" key={item.id}>
                  <div className="rider-member-number">
                    {index + 1}
                  </div>

                  <div className="rider-member-fields">
                    <div>
                      <label>Función *</label>
                      <input
                        value={item.funcion}
                        onChange={(event) =>
                          updateMember(
                            item.id,
                            'funcion',
                            event.target.value
                          )
                        }
                        placeholder="Ej: Bajo / Coros"
                      />
                    </div>

                    <div>
                      <label>Instrumento o fuente *</label>
                      <input
                        value={item.instrumento}
                        onChange={(event) =>
                          updateMember(
                            item.id,
                            'instrumento',
                            event.target.value
                          )
                        }
                        placeholder="Ej: Bajo eléctrico"
                      />
                    </div>

                    <div>
                      <label>Canales</label>
                      <input
                        type="number"
                        min="0"
                        value={item.canales}
                        onChange={(event) =>
                          updateMember(
                            item.id,
                            'canales',
                            Number(event.target.value)
                          )
                        }
                      />
                    </div>

                    <div>
                      <label>Conexión</label>
                      <select
                        value={item.conexion}
                        onChange={(event) =>
                          updateMember(
                            item.id,
                            'conexion',
                            event.target.value
                          )
                        }
                      >
                        {CONEXIONES.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label>Posición en tarima</label>
                      <select
                        value={item.posicion}
                        onChange={(event) =>
                          updateMember(
                            item.id,
                            'posicion',
                            event.target.value
                          )
                        }
                      >
                        {POSICIONES.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label>Mezcla de monitor</label>
                      <input
                        value={item.monitor}
                        onChange={(event) =>
                          updateMember(
                            item.id,
                            'monitor',
                            event.target.value
                          )
                        }
                        placeholder="Ej: Mix 3"
                      />
                    </div>

                    <div className="rider-member-wide">
                      <label>Prioridad de la mezcla</label>
                      <input
                        value={item.prioridad_monitor}
                        onChange={(event) =>
                          updateMember(
                            item.id,
                            'prioridad_monitor',
                            event.target.value
                          )
                        }
                        placeholder="Ej: Bajo, voz principal y batería"
                      />
                    </div>

                    <div className="rider-member-wide">
                      <label>
                        Requerimientos particulares — uno por línea
                      </label>
                      <textarea
                        rows="4"
                        value={item.requerimientos}
                        onChange={(event) =>
                          updateMember(
                            item.id,
                            'requerimientos',
                            event.target.value
                          )
                        }
                        placeholder={
                          'Ej:\nCaja directa activa\nAmplificador de bajo\nToma eléctrica cercana'
                        }
                      />
                    </div>

                    <label className="check-row rider-member-check">
                      <input
                        type="checkbox"
                        checked={Boolean(item.hace_coros)}
                        onChange={(event) =>
                          updateMember(
                            item.id,
                            'hace_coros',
                            event.target.checked
                          )
                        }
                      />
                      Hace coros
                    </label>
                  </div>

                  <button
                    type="button"
                    className="rider-remove-button"
                    onClick={() => removeMember(item.id)}
                    disabled={config.integrantes.length <= 1}
                  >
                    Quitar
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="rider-config-section">
            <div className="rider-config-section-title">
              <div>
                <h3>Requerimientos generales y backline</h3>
                <p>
                  Indica quién debe suministrar cada elemento.
                </p>
              </div>

              <button type="button" onClick={addRequirement}>
                + Agregar requerimiento
              </button>
            </div>

            <div className="rider-requirement-list">
              {config.requerimientos_generales.map((item) => (
                <article
                  className="rider-requirement-row"
                  key={item.id}
                >
                  <div>
                    <label>Elemento</label>
                    <input
                      value={item.elemento}
                      onChange={(event) =>
                        updateRequirement(
                          item.id,
                          'elemento',
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div>
                    <label>Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={(event) =>
                        updateRequirement(
                          item.id,
                          'cantidad',
                          Number(event.target.value)
                        )
                      }
                    />
                  </div>

                  <div>
                    <label>Responsable</label>
                    <select
                      value={item.proveedor}
                      onChange={(event) =>
                        updateRequirement(
                          item.id,
                          'proveedor',
                          event.target.value
                        )
                      }
                    >
                      {PROVEEDORES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rider-requirement-notes">
                    <label>Notas</label>
                    <input
                      value={item.notas}
                      onChange={(event) =>
                        updateRequirement(
                          item.id,
                          'notas',
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <button
                    type="button"
                    className="rider-remove-button"
                    onClick={() => removeRequirement(item.id)}
                  >
                    Quitar
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="rider-config-section rider-config-two-columns">
            <div>
              <h3>Sistema de sonido</h3>

              <div className="rider-config-mini-grid">
                <div>
                  <label>Entradas mínimas</label>
                  <input
                    type="number"
                    min="1"
                    value={config.sistema.entradas_minimas}
                    onChange={(event) =>
                      updateNested(
                        'sistema',
                        'entradas_minimas',
                        Number(event.target.value)
                      )
                    }
                  />
                </div>

                <div>
                  <label>Auxiliares mínimos</label>
                  <input
                    type="number"
                    min="1"
                    value={config.sistema.auxiliares_minimos}
                    onChange={(event) =>
                      updateNested(
                        'sistema',
                        'auxiliares_minimos',
                        Number(event.target.value)
                      )
                    }
                  />
                </div>
              </div>

              <label>PA y consola</label>
              <textarea
                rows="5"
                value={config.sistema.pa}
                onChange={(event) =>
                  updateNested('sistema', 'pa', event.target.value)
                }
              />

              <label>Electricidad</label>
              <textarea
                rows="5"
                value={config.sistema.electricidad}
                onChange={(event) =>
                  updateNested(
                    'sistema',
                    'electricidad',
                    event.target.value
                  )
                }
              />
            </div>

            <div>
              <h3>Hospitalidad y notas</h3>

              <label>Hospitalidad</label>
              <textarea
                rows="7"
                value={config.sistema.hospitalidad}
                onChange={(event) =>
                  updateNested(
                    'sistema',
                    'hospitalidad',
                    event.target.value
                  )
                }
              />

              <label>Notas generales</label>
              <textarea
                rows="7"
                value={config.sistema.notas_generales}
                onChange={(event) =>
                  updateNested(
                    'sistema',
                    'notas_generales',
                    event.target.value
                  )
                }
              />
            </div>
          </section>

          {error && <p className="error">{error}</p>}

          <footer className="rider-config-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
            >
              Cancelar
            </button>

            <button type="submit" disabled={guardando}>
              {guardando
                ? 'Guardando configuración...'
                : 'Guardar rider del Formato'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
