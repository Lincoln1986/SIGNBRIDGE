import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { Logo, Input, Btn, Alert, Card, PasswordInput, PasswordRequirements } from '../components/UI';
import { Footer } from '../components/Footer';

// Ciudades de respaldo (se usan si el endpoint aún no responde)
const FALLBACK_CITIES = [
  'Arauca', 'Armenia', 'Barranquilla', 'Bogotá', 'Bucaramanga', 'Buenaventura',
  'Bello', 'Cali', 'Cartagena', 'Cúcuta', 'Dosquebradas', 'Florencia',
  'Ibagué', 'Leticia', 'Manizales', 'Medellín', 'Mitú', 'Mocoa',
  'Montería', 'Neiva', 'Palmira', 'Pasto', 'Pereira', 'Popayán',
  'Puerto Carreño', 'Puerto Inírida', 'Quibdó', 'Riohacha', 'Santa Marta',
  'Sincelejo', 'Soledad', 'Soacha', 'Tunja', 'Valledupar', 'Villavicencio', 'Yumbo',
  'Barrancabermeja', 'Cartago', 'Duitama', 'El Banco', 'Florencia', 'Fundación',
  'Girardot', 'Honda', 'Ipiales', 'La Dorada', 'Lorica', 'Magangué',
  'Maicao', 'Malambo', 'Manizales', 'Mompox', 'Ocaña', 'Palmira',
  'Pamplona', 'Pitalito', 'Rionegro', 'Sahagún', 'San Gil', 'Santa Rosa de Cabal',
  'Sogamoso', 'Soledad', 'Tuluá', 'Tumaco', 'Turbo', 'Ubaté', 'Zipaquirá',
].filter((v, i, a) => a.indexOf(v) === i).sort();

// Capitaliza la primera letra y elimina espacios al final
const capitalize = (val: string) =>
  val.replace(/(^|\s)\S/g, c => c.toUpperCase());

// Solo permite dígitos, máximo 10, y fuerza que empiece con 3
const formatPhone = (val: string) => {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length > 0 && digits[0] !== '3') return '3' + digits.slice(1, 10);
  return digits;
};

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cities, setCities] = useState<string[]>(FALLBACK_CITIES);
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '3', city: '', address: '', email: '', password: '', confirm: '',
  });

  // Intenta cargar ciudades desde el backend; si falla, usa el fallback silenciosamente
  useEffect(() => {
    authApi.getCities()
      .then(r => {
        const raw = r.data;
        if (!Array.isArray(raw) || raw.length === 0) return;

        // Detecta si la respuesta es string[] u objetos
        if (typeof raw[0] === 'string') {
          setCities(raw as string[]);
        } else {
          // Objetos con region_name / name / city
          const mapped = (raw as any[])
            .map((item: any) => item.region_name ?? item.name ?? item.city ?? '')
            .filter(Boolean)
            .sort() as string[];
          if (mapped.length > 0) setCities(mapped);
        }
      })
      .catch(() => { /* usa FALLBACK_CITIES */ });
  }, []);

  // Handler genérico
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let val = e.target.value;
    if (k === 'first_name' || k === 'last_name') val = capitalize(val);
    if (k === 'phone') val = formatPhone(val);
    setForm(f => ({ ...f, [k]: val }));
  };

  // Al salir del campo nombre/apellido, elimina espacios al final
  const trimOnBlur = (k: string) => () =>
    setForm(f => ({ ...f, [k]: f[k as keyof typeof f].trim() }));

  const passwordsMatch = form.password === form.confirm;
  const passwordValid  = form.password.length >= 8 &&
    /[A-Z]/.test(form.password) &&
    /[a-z]/.test(form.password) &&
    /[0-9]/.test(form.password) &&
    /[^A-Za-z0-9]/.test(form.password);
  const phoneValid     = form.phone.length === 10 && form.phone.startsWith('3');

  const isFormComplete =
    form.first_name.trim() &&
    form.last_name.trim() &&
    phoneValid &&
    form.city &&
    form.address.trim() &&
    form.email.trim() &&
    passwordValid &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) { setError('Las contraseñas no coinciden'); return; }
    if (!passwordValid)  { setError('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial'); return; }
    if (!phoneValid)     { setError('El teléfono debe tener 10 dígitos y empezar con 3'); return; }
    setError(''); setLoading(true);
    try {
      await authApi.register({
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim(),
        phone:      form.phone,
        city:       form.city,
        address:    form.address.trim(),
        email:      form.email.trim(),
        password:   form.password,
      });
      setSuccess('¡Cuenta creada exitosamente! Redirigiendo...');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err: unknown) {
      // FastAPI puede devolver detail como string o como array de objetos (errores 422)
      const axiosErr = err as { response?: { data?: { detail?: unknown } } };
      const detail = axiosErr.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail) && detail.length > 0) {
        // Tomar el primer mensaje de validación del array
        const first = detail[0] as { msg?: string; loc?: string[] };
        const field = first.loc?.slice(-1)[0] ?? '';
        const msg   = first.msg ?? 'Error de validación';
        setError(field ? `${field}: ${msg}` : msg);
      } else {
        setError('Error al registrar usuario. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card style={{ width: '100%', maxWidth: 520, padding: 40 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Logo size="md" />
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', marginTop: 16, color: 'var(--gray-800)' }}>
              Crear cuenta
            </h1>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', marginTop: 4 }}>Únete a SignBridge hoy</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error   && <Alert type="error"   message={error} />}
            {success && <Alert type="success" message={success} />}

            {/* Nombre / Apellido */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Input
                label="Nombres *"
                placeholder="Juan"
                value={form.first_name}
                onChange={set('first_name')}
                onBlur={trimOnBlur('first_name')}
                required
              />
              <Input
                label="Apellidos *"
                placeholder="Pérez"
                value={form.last_name}
                onChange={set('last_name')}
                onBlur={trimOnBlur('last_name')}
                required
              />
            </div>

            {/* Teléfono / Ciudad */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <Input
                  label="Teléfono *"
                  placeholder="3001234567"
                  value={form.phone}
                  onChange={set('phone')}
                  required
                  inputMode="numeric"
                />
                {form.phone.length > 0 && !phoneValid && (
                  <p style={{ color: '#ef4444', fontSize: '0.76rem', marginTop: 4 }}>
                    {!form.phone.startsWith('3')
                      ? 'Debe empezar con 3'
                      : 'Debe tener 10 dígitos'}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-600)' }}>Ciudad *</label>
                <select
                  value={form.city}
                  onChange={set('city')}
                  required
                  style={{
                    width: '100%', padding: '10px 14px',
                    border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-sm)',
                    fontSize: '0.9rem', background: 'var(--white)',
                    color: form.city ? 'var(--gray-800)' : 'var(--gray-400)',
                    outline: 'none', fontFamily: 'var(--font-body)', cursor: 'pointer',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--violet)'; }}
                  onBlur={e  => { e.target.style.borderColor = 'var(--gray-200)'; }}
                >
                  <option value="">Selecciona tu ciudad</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Dirección */}
            <Input
              label="Dirección *"
              placeholder="Cra 10 # 20-30, Barrio Centro"
              value={form.address}
              onChange={set('address')}
              onBlur={trimOnBlur('address')}
              required
            />

            {/* Correo */}
            <Input
              label="Correo electrónico *"
              type="email"
              placeholder="tu@correo.com"
              value={form.email}
              onChange={set('email')}
              required
            />

            {/* Contraseñas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <PasswordInput
                label="Contraseña *"
                placeholder="Mín. 8 caracteres"
                value={form.password}
                onChange={set('password')}
                required
                showStrength
              />
              <PasswordInput
                label="Confirmar contraseña *"
                placeholder="Repite la contraseña"
                value={form.confirm}
                onChange={set('confirm')}
                required
                error={form.confirm && !passwordsMatch ? 'No coinciden' : undefined}
              />
            </div>

            {form.password.length > 0 && (
              <PasswordRequirements password={form.password} />
            )}

            <Btn
              type="submit"
              loading={loading}
              size="lg"
              style={{ width: '100%', marginTop: 6 }}
              disabled={!isFormComplete}
            >
              Crear cuenta
            </Btn>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--gray-400)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: 'var(--violet)', fontWeight: 600 }}>Inicia sesión</Link>
          </p>
        </Card>
      </div>
      <Footer />
    </div>
  );
}