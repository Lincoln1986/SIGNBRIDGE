import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { Logo, Input, Btn, Alert, Card } from '../components/UI';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setMsg('');
    try {
      const { data } = await authApi.forgotPassword(email);
      setMsg(data.message);
    } catch {
      setError('No se pudo procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <Alert type="error" message={error} />}
          {msg && <Alert type="success" message={msg} />}
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

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--gray-400)' }}>
          <Link to="/login" style={{ color: 'var(--violet)', fontWeight: 600 }}>← Volver al inicio de sesión</Link>
        </p>
      </Card>
    </div>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await authApi.resetPassword(token, password);
      setSuccess(data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Token inválido o expirado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ width: '100%', maxWidth: 420, padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Logo size="md" />
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', marginTop: 16 }}>
            Nueva contraseña
          </h1>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <Alert type="error" message={error} />}
          {success && <Alert type="success" message={success} />}
          <Input label="Nueva contraseña" type="password" placeholder="Mín. 8 caracteres" value={password} onChange={e => setPassword(e.target.value)} required />
          <Input label="Confirmar contraseña" type="password" placeholder="Repite la contraseña" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          <Btn type="submit" loading={loading} size="lg" style={{ width: '100%' }}>
            Restablecer contraseña
          </Btn>
        </form>
      </Card>
    </div>
  );
}
