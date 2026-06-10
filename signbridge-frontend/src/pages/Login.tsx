import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Logo, Input, Btn, Alert, Card } from '../components/UI';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await authApi.login(email, password);
      await login(data);
      navigate(data.role === 'Administrador' || data.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--gray-50)' }}>
      {/* Left panel */}
      <div style={{
        width: '45%', background: 'var(--violet)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 48,
      }}>
        <div style={{ maxWidth: 360, textAlign: 'center' }}>
          <Logo size="lg" />
          <p style={{ color: 'rgba(255,255,255,0.75)', marginTop: 20, fontSize: '1rem', lineHeight: 1.7 }}>
            Plataforma de traducción entre lenguaje de señas colombiano y texto/voz en tiempo real.
          </p>
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '🤟', label: 'Traducción voz a señas' },
              { icon: '📝', label: 'Señas a texto' },
              { icon: '🌎', label: 'Regiones de Colombia' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 16px' }}>
                <span style={{ fontSize: 22 }}>{f.icon}</span>
                <span style={{ color: 'white', fontWeight: 500, fontSize: '0.9rem' }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Card style={{ width: '100%', maxWidth: 420, padding: 40 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.6rem', color: 'var(--gray-800)', marginBottom: 6 }}>
            Bienvenido de nuevo
          </h1>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem', marginBottom: 28 }}>
            Ingresa tus credenciales para continuar
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {error && <Alert type="error" message={error} />}
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>}
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
            />
            <div style={{ textAlign: 'right' }}>
              <Link to="/forgot-password" style={{ fontSize: '0.82rem', color: 'var(--violet)', fontWeight: 600 }}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Btn type="submit" loading={loading} size="lg" style={{ width: '100%', marginTop: 4 }}>
              Iniciar sesión
            </Btn>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem', color: 'var(--gray-400)' }}>
            ¿No tienes cuenta?{' '}
            <Link to="/register" style={{ color: 'var(--violet)', fontWeight: 600 }}>Regístrate</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
