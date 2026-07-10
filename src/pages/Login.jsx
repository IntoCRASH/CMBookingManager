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
      </form>
    </div>
  );
}