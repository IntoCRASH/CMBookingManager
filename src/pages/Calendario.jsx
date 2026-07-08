import { useEffect, useState } from 'react';
import { getCotizaciones } from '../lib/cotizacionesService';

export default function Calendario({ goHome, abrirCotizacion, editarCotizacion }) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [fechaBase, setFechaBase] = useState(new Date());

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    const data = await getCotizaciones();
    setCotizaciones(data.filter((c) => c.fecha_evento));
  }

  const year = fechaBase.getFullYear();
  const month = fechaBase.getMonth();

  const primerDia = new Date(year, month, 1);
  const ultimoDia = new Date(year, month + 1, 0);
  const totalDias = ultimoDia.getDate();
  const inicioSemana = primerDia.getDay();

  const dias = [];

  for (let i = 0; i < inicioSemana; i++) {
    dias.push(null);
  }

  for (let d = 1; d <= totalDias; d++) {
    dias.push(new Date(year, month, d));
  }

  function fechaKey(fecha) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function eventosDelDia(fecha) {
    if (!fecha) return [];

    const key = fechaKey(fecha);

    return cotizaciones.filter((c) => c.fecha_evento === key);
  }

  function cambiarMes(delta) {
    setFechaBase(new Date(year, month + delta, 1));
  }

  const nombreMes = fechaBase.toLocaleDateString('es-DO', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="dashboard">
      <div className="top-bar">
        <div>
          <h1>Calendario</h1>
          <p>{nombreMes}</p>
        </div>

        <button onClick={goHome}>← Dashboard</button>
      </div>

      <div className="modal-card" style={{ marginBottom: 20 }}>
        <button onClick={() => cambiarMes(-1)}>← Mes anterior</button>
        <button onClick={() => setFechaBase(new Date())} style={{ marginLeft: 10 }}>
          Hoy
        </button>
        <button onClick={() => cambiarMes(1)} style={{ marginLeft: 10 }}>
          Mes siguiente →
        </button>
      </div>

      <div className="calendario-grid">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
          <div key={d} className="calendario-dia-header">
            {d}
          </div>
        ))}

        {dias.map((fecha, index) => {
          const eventos = fecha ? eventosDelDia(fecha) : [];

          return (
            <div key={index} className="calendario-dia">
              {fecha && (
                <>
                  <div className="calendario-numero">
                    {fecha.getDate()}
                  </div>

                  {eventos.map((e) => (
                    <div key={e.id} className="calendario-evento">
                      <strong>{e.clientes?.nombre}</strong>
                      <span>{e.tipo_evento}</span>
                      <small>{e.venue || e.provincias?.nombre}</small>

                      <div className="calendario-acciones">
                        <button onClick={() => abrirCotizacion(e.id)}>Ver</button>
                        <button onClick={() => editarCotizacion(e.id)}>Editar</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}