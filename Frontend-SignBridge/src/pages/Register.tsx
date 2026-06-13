import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { Logo, Input, Btn, Alert, Card } from '../components/UI';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    first_name: '', middle_name: '', last_name: '', second_last_name: '',
    phone: '', address: '', city: '', email: '', password: '', confirm: '',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return; }
    setError(''); setLoading(true);
    try {
      await authApi.register({
        first_name: form.first_name, middle_name: form.middle_name || undefined,
        last_name: form.last_name, second_last_name: form.second_last_name || undefined,
        phone: form.phone, address: form.address || undefined,
        city: form.city || undefined, email: form.email, password: form.password,
      });
      setSuccess('¡Cuenta creada exitosamente! Redirigiendo...');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Error al registrar usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ width: '100%', maxWidth: 580, padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Logo size="md" />
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', marginTop: 16, color: 'var(--gray-800)' }}>
            Crear cuenta
          </h1>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', marginTop: 4 }}>Únete a SignBridge hoy</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <Alert type="error" message={error} />}
          {success && <Alert type="success" message={success} />}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label="Primer nombre *" placeholder="Juan" value={form.first_name} onChange={set('first_name')} required />
            <Input label="Segundo nombre" placeholder="Carlos" value={form.middle_name} onChange={set('middle_name')} />
            <Input label="Primer apellido *" placeholder="Pérez" value={form.last_name} onChange={set('last_name')} required />
            <Input label="Segundo apellido" placeholder="García" value={form.second_last_name} onChange={set('second_last_name')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label="Teléfono *" placeholder="3001234567" value={form.phone} onChange={set('phone')} required />
            <Input label="Ciudad" placeholder="Bogotá" value={form.city} onChange={set('city')} />
          </div>

          <Input label="Dirección" placeholder="Calle 123 #45-67" value={form.address} onChange={set('address')} />
          <Input label="Correo electrónico *" type="email" placeholder="tu@correo.com" value={form.email} onChange={set('email')} required />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label="Contraseña *" type="password" placeholder="Mín. 8 caracteres" value={form.password} onChange={set('password')} required />
            <Input label="Confirmar contraseña *" type="password" placeholder="Repite la contraseña" value={form.confirm} onChange={set('confirm')} required />
          </div>

          <Btn type="submit" loading={loading} size="lg" style={{ width: '100%', marginTop: 6 }}>
            Crear cuenta
          </Btn>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--gray-400)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: 'var(--violet)', fontWeight: 600 }}>Inicia sesión</Link>
        </p>
      </Card>
    </div>
  );
}
