import { useEffect, useState } from 'react';
import { getCotizaciones } from '../lib/cotizacionesService';
import { supabase } from '../lib/supabaseClient';
import { getMyProfile } from '../lib/profileService';

export default function Comisiones({ goHome }) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    cargar();
  }, []);

async function cargar() {
  const perfil = await getMyProfile();
  setProfile(perfil);

  const data = await getCotizaciones();

  const conComision = data.filter((c) => Number(c.comision || 0) > 0);

  const visibles =
    perfil.rol === 'admin'
      ? conComision
      : conComision.filter((c) => c.vendedor_id === perfil.id);

  setCotizaciones(visibles);
}

  function money(valor) {
    return `RD$ ${Number(valor || 0).toLocaleString('es-DO')}`;
  }
async function cambiarEstado(id, estadoActual) {

  const nuevoEstado =
    estadoActual === 'Cobrada'
      ? 'Pendiente'
      : 'Cobrada';

  const { error } = await supabase
    .from('cotizaciones')
    .update({
      comision_estado: nuevoEstado,
    })
    .eq('id', id);

  if (error) {
    alert(error.message);
    return;
  }

  await cargar();
}
  
  const totalComisiones = cotizaciones.reduce(
    (sum, c) => sum + Number(c.comision || 0),
    0
  );

  return (
    <div className="dashboard">
      <div className="top-bar">
        <div>
          <h1>Comisiones</h1>
          <p>
  {profile?.rol === 'admin'
    ? 'Todas las comisiones generadas'
    : 'Tus comisiones generadas'}
</p>
        </div>

        <button onClick={goHome}>← Dashboard</button>
      </div>

      <div className="pagos-resumen">
        <div>
          <span>Total comisiones</span>
          <strong>{money(totalComisiones)}</strong>
        </div>

        <div>
          <span>Cotizaciones con comisión</span>
          <strong>{cotizaciones.length}</strong>
        </div>
      </div>

      <div className="cotizaciones-list">
        {cotizaciones.map((c) => (
          <div key={c.id} className="cotizacion-item">
            <div className="cot-numero">{c.numero}</div>

            <div className="cot-cliente">
              <strong>{c.clientes?.nombre || 'Cliente'}</strong>
              <div>{c.nombre_evento || c.tipo_evento}</div>
              {c.venue && (
                <div style={{ opacity: 0.75, fontSize: 13 }}>{c.venue}</div>
              )}
            </div>

            <div className="cot-fecha">{c.fecha_evento || '--'}</div>

            <div className="cot-total">{money(c.total)}</div>

            <div className="cot-estado">

  <div>
    Comisión
    <br />
    <strong>{money(c.comision)}</strong>
  </div>

  <div
    style={{
      marginTop: 8,
      fontSize: 13,
    }}
  >
    Estado:
    <strong>
      {' '}
      {c.comision_estado || 'Pendiente'}
    </strong>
  </div>

  <button
    style={{ marginTop: 10 }}
    onClick={() =>
      cambiarEstado(c.id, c.comision_estado)
    }
  >
    {c.comision_estado === 'Cobrada'
      ? 'Marcar pendiente'
      : 'Marcar cobrada'}
  </button>

</div>
          </div>
        ))}

        {cotizaciones.length === 0 && (
          <p>No hay comisiones registradas todavía.</p>
        )}
      </div>
    </div>
  );
}