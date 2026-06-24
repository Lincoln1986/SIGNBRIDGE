import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { Logo, Input, Btn, Alert, Card } from '../components/UI';
import { Footer } from '../components/Footer';

// ── Componente de countdown reutilizable ──────────────────────────────────────
function RedirectCountdown({ seconds, to, navigate }: { seconds: number; to: string; navigate: ReturnType<typeof useNavigate> }) {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    if (count <= 0) { navigate(to); return; }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, to, navigate]);

  return (
    <div style={{
      marginTop: 20, padding: '14px 18px',
      background: 'var(--violet-light)', borderRadius: 'var(--radius-sm)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'var(--violet)', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: '0.9rem', flexShrink: 0,
        fontFamily: 'var(--font-display)',
      }}>
        {count}
      </div>
      <p style={{ fontSize: '0.83rem', color: 'var(--violet)', fontWeight: 600, margin: 0 }}>
        Redirigiendo al inicio de sesión en {count} segundo{count !== 1 ? 's' : ''}...
      </p>
    </div>
  );
}

// ── ForgotPassword ────────────────────────────────────────────────────────────
export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch {
      setError('No se pudo procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card style={{ width: '100%', maxWidth: 420, padding: 40 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Logo size="md" />
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', marginTop: 16 }}>
              Recuperar contraseña
            </h1>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', marginTop: 4 }}>
              Te enviaremos un enlace a tu correo
            </p>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && <Alert type="error" message={error} />}
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <Btn type="submit" loading={loading} size="lg" style={{ width: '100%' }}>
                Enviar enlace
              </Btn>
            </form>
          ) : (
            <div>
              {/* Éxito */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 12, padding: '8px 0 4px',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--violet), #4338ca)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.6rem',
                }}>
                  ✉️
                </div>
                <h2 style={{
                  fontFamily: 'var(--font-display)', fontWeight: 800,
                  fontSize: '1.1rem', color: 'var(--gray-800)', textAlign: 'center',
                }}>
                  ¡Enlace enviado!
                </h2>
                <p style={{
                  fontSize: '0.85rem', color: 'var(--gray-400)',
                  textAlign: 'center', lineHeight: 1.6,
                }}>
                  Si el correo <strong style={{ color: 'var(--gray-800)' }}>{email}</strong> está
                  registrado, recibirás un enlace para restablecer tu contraseña.
                  Revisa también tu carpeta de spam.
                </p>
              </div>

              {/* Countdown */}
              <RedirectCountdown seconds={5} to="/login" navigate={navigate} />
            </div>
          )}

          {!success && (
            <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--gray-400)' }}>
              <Link to="/login" style={{ color: 'var(--violet)', fontWeight: 600 }}>
                ← Volver al inicio de sesión
              </Link>
            </p>
          )}
        </Card>
      </div>
      <Footer />
    </div>
  );
}

// ── ResetPassword ─────────────────────────────────────────────────────────────
export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Token inválido o expirado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card style={{ width: '100%', maxWidth: 420, padding: 40 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Logo size="md" />
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', marginTop: 16 }}>
              Nueva contraseña
            </h1>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && <Alert type="error" message={error} />}

              <Input
                label="Nueva contraseña"
                type="password"
                placeholder="Mín. 8 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />

              {password.length > 0 && password.length < 8 && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '-8px' }}>
                  La contraseña debe tener al menos 8 caracteres
                </p>
              )}

              <Input
                label="Confirmar contraseña"
                type="password"
                placeholder="Repite la contraseña"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />

              <Btn
                type="submit"
                loading={loading}
                size="lg"
                style={{ width: '100%' }}
                disabled={password.length < 8 || password !== confirm}
              >
                Restablecer contraseña
              </Btn>
            </form>
          ) : (
            <div>
              {/* Éxito */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 12, padding: '8px 0 4px',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.6rem',
                }}>
                  ✅
                </div>
                <h2 style={{
                  fontFamily: 'var(--font-display)', fontWeight: 800,
                  fontSize: '1.1rem', color: 'var(--gray-800)', textAlign: 'center',
                }}>
                  ¡Contraseña actualizada!
                </h2>
                <p style={{
                  fontSize: '0.85rem', color: 'var(--gray-400)',
                  textAlign: 'center', lineHeight: 1.6,
                }}>
                  Tu contraseña fue restablecida correctamente.
                  Ya puedes iniciar sesión con tus nuevas credenciales.
                </p>
              </div>

              {/* Countdown */}
             <p
               style={{
               textAlign: 'center',
              marginTop: 20,
              fontSize: '1.2rem',
              color: '#000',
              fontWeight: 'bold'
            }}
            >
              Ya puedes cerrar la pestaña.
            </p> 
            </div>
          )}

          {!success && (
            <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--gray-400)' }}>
              <Link to="/login" style={{ color: 'var(--violet)', fontWeight: 600 }}>
                ← Volver al inicio de sesión
              </Link>
            </p>
          )}
        </Card>
      </div>
      <Footer />
    </div>
  );
}