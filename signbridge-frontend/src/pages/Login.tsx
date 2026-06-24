import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Logo, Input, Btn, Alert, Card } from '../components/UI';
import { Footer } from '../components/Footer';

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
      // Todos los usuarios van a /home después del login.
      // Desde /home pueden navegar a /admin si son administradores.
      navigate('/home');
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .login-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--gray-50);
        }
        .login-body {
          flex: 1;
          display: flex;
        }
        .login-left {
          width: 45%;
          background: var(--violet);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px;
        }
        .login-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }
        @media (max-width: 768px) {
          .login-left { display: none; }
          .login-right { padding: 24px; }
        }
      `}</style>

      <div className="login-wrapper">
        <div className="login-body">
          {/* Left panel */}
          <div className="login-left">
            <div style={{ maxWidth: 360, textAlign: 'center' }}>
              <Logo size="lg" />
              <p style={{ color: 'rgba(255,255,255,0.75)', marginTop: 20, fontSize: '1rem', lineHeight: 1.7 }}>
                Plataforma de traducción entre lenguaje de señas colombiano y texto/voz en tiempo real.
              </p>

              <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { icon: '🤟', label: 'Traducción voz a Lengua de Señas Colombiana' },
                  { icon: '📚', label: 'Videoteca de señas grabadas por expertos' },
                  { icon: '📊', label: 'Historial y estadísticas de uso' },
                  { icon: '🤝', label: 'Inclusión para la comunidad sorda de Colombia' },
                ].map(f => (
                  <div key={f.label} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'rgba(255,255,255,0.12)', borderRadius: 10,
                    padding: '11px 16px', textAlign: 'left',
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{f.icon}</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500, fontSize: '0.85rem', lineHeight: 1.4 }}>{f.label}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 32, padding: '14px 20px', background: 'rgba(246,166,35,0.2)', borderRadius: 12, border: '1px solid rgba(246,166,35,0.3)' }}>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.8rem', margin: 0, lineHeight: 1.6 }}>
                  🇨🇴 Proyecto educativo SENA · LSC · v1.0.0
                </p>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="login-right">
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

        <Footer />
      </div>
    </>
  );
}