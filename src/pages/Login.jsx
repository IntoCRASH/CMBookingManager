import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function login(e) {
    e.preventDefault();

    setLoading(true);
    setError('');

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      setError(loginError.message);
    }

    setLoading(false);
  }

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={login}>
        <img
          src="/mibooking-logo.png"
          alt="MiBooking"
          style={{
            display: 'block',
            width: 'min(100%, 380px)',
            height: 'auto',
            margin: '0 auto 28px',
            objectFit: 'contain',
          }}
        />

        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        {error && <p className="error">{error}</p>}

        <div
          style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(16, 24, 40, 0.08)',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              marginBottom: '8px',
              color: '#7357ff',
              fontSize: '10px',
              fontWeight: '900',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            Tu negocio en un solo lugar
          </span>

          <p
            style={{
              maxWidth: '340px',
              margin: '0 auto',
              color: '#667085',
              fontSize: '13px',
              lineHeight: '1.6',
            }}
          >
            MiBooking centraliza artistas, cotizaciones, tarifas,
            agenda, comisiones y gestión de eventos en un solo lugar.
          </p>
        </div>
      </form>
    </div>
  );
}