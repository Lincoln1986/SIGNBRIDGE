import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Logo, Input, Btn, Alert, PasswordInput, PasswordRequirements } from './UI';

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = 'login' | 'register' | 'forgot';

interface AuthModalProps {
  initialTab?: Tab;
  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const capitalize = (val: string) => val.replace(/(^|\s)\S/g, c => c.toUpperCase());
const formatPhone = (val: string) => {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length > 0 && digits[0] !== '3') return '3' + digits.slice(1, 10);
  return digits;
};

// ── Tabs component ─────────────────────────────────────────────────────────

function Tabs({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'login', label: 'Iniciar sesión' },
    { id: 'register', label: 'Registrarse' },
    { id: 'forgot', label: 'Recuperar' },
  ];
  return (
    <div style={{
      display: 'flex',
      background: 'var(--gray-50)',
      borderRadius: 10,
      padding: 4,
      gap: 4,
      marginBottom: 24,
    }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            flex: 1,
            padding: '8px 4px',
            borderRadius: 8,
            border: 'none',
            fontWeight: 600,
            fontSize: '0.82rem',
            cursor: 'pointer',
            transition: 'all 0.15s',
            background: active === t.id ? 'var(--white)' : 'transparent',
            color: active === t.id ? 'var(--violet)' : 'var(--gray-400)',
            boxShadow: active === t.id ? 'var(--shadow-sm)' : 'none',
            fontFamily: 'var(--font-body)',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Login form ─────────────────────────────────────────────────────────────

function LoginForm({ onClose, onTabChange }: { onClose: () => void; onTabChange: (t: Tab) => void }) {
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
      onClose();
      navigate('/home');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: unknown } } };
      const detail = axiosErr.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Correo o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <Alert type="error" message={error} />}
      <Input
        label="Correo electrónico"
        type="email"
        placeholder="tu@correo.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>}
      />
      <PasswordInput
        label="Contraseña"
        placeholder="••••••••"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      <div style={{ textAlign: 'right', marginTop: -8 }}>
        <button
          type="button"
          onClick={() => onTabChange('forgot')}
          style={{ background: 'none', border: 'none', color: 'var(--violet)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>
      <Btn type="submit" loading={loading} size="lg" style={{ width: '100%' }}>
        Iniciar sesión
      </Btn>
      <p style={{ textAlign: 'center', fontSize: '0.83rem', color: 'var(--gray-400)' }}>
        ¿No tienes cuenta?{' '}
        <button type="button" onClick={() => onTabChange('register')}
          style={{ background: 'none', border: 'none', color: 'var(--violet)', fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)', fontSize: '0.83rem' }}>
          Regístrate
        </button>
      </p>
    </form>
  );
}

// Ciudades de respaldo para el modal (se usan si el endpoint no responde)
const FALLBACK_CITIES_MODAL = [
  'Arauca','Armenia','Barranquilla','Bogotá','Bucaramanga','Buenaventura','Bello',
  'Cali','Cartagena','Cúcuta','Dosquebradas','Florencia','Ibagué','Leticia',
  'Manizales','Medellín','Mitú','Mocoa','Montería','Neiva','Palmira','Pasto',
  'Pereira','Popayán','Puerto Carreño','Puerto Inírida','Quibdó','Riohacha',
  'Santa Marta','Sincelejo','Soledad','Soacha','Tunja','Valledupar','Villavicencio','Yumbo',
  'Barrancabermeja','Cartago','Duitama','Girardot','Honda','Ipiales','La Dorada',
  'Maicao','Ocaña','Pamplona','Pitalito','Rionegro','San Gil','Santa Rosa de Cabal',
  'Sogamoso','Tuluá','Tumaco','Turbo','Zipaquirá',
].filter((v, i, a) => a.indexOf(v) === i).sort();

// ── Register form ──────────────────────────────────────────────────────────

function RegisterForm({ onClose, onTabChange }: { onClose: () => void; onTabChange: (t: Tab) => void }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cities, setCities] = useState<string[]>(FALLBACK_CITIES_MODAL);
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '3', city: '', address: '', email: '', password: '', confirm: '',
  });

  useEffect(() => {
    authApi.getCities()
      .then(r => {
        const raw = r.data;
        if (!Array.isArray(raw) || raw.length === 0) return;
        if (typeof raw[0] === 'string') {
          setCities(raw as string[]);
        } else {
          const mapped = (raw as any[])
            .map((item: any) => item.region_name ?? item.name ?? item.city ?? '')
            .filter(Boolean)
            .sort() as string[];
          if (mapped.length > 0) setCities(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let val = e.target.value;
    if (k === 'first_name' || k === 'last_name') val = capitalize(val);
    if (k === 'phone') val = formatPhone(val);
    setForm(f => ({ ...f, [k]: val }));
  };

  const passwordValid = form.password.length >= 8 &&
    /[A-Z]/.test(form.password) && /[a-z]/.test(form.password) &&
    /[0-9]/.test(form.password) && /[^A-Za-z0-9]/.test(form.password);
  const passwordsMatch = form.password === form.confirm;
  const phoneValid = form.phone.length === 10 && form.phone.startsWith('3');

  const isComplete = form.first_name.trim() && form.last_name.trim() && phoneValid &&
    form.city && form.address.trim() && form.email.trim() && passwordValid && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid) { setError('La contraseña no cumple los requisitos de seguridad'); return; }
    if (!passwordsMatch) { setError('Las contraseñas no coinciden'); return; }
    if (!phoneValid) { setError('El teléfono debe tener 10 dígitos y empezar con 3'); return; }
    setError(''); setLoading(true);
    try {
      await authApi.register({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone,
        city: form.city,
        address: form.address.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setSuccess('¡Cuenta creada! Redirigiendo al inicio de sesión…');
      setTimeout(() => { onClose(); navigate('/login'); }, 1800);
    } catch (err: unknown) {
      // FastAPI devuelve detail como string en errores personalizados,
      // o como array de objetos en errores de validación 422
      const axiosErr = err as { response?: { data?: { detail?: unknown } } };
      const detail = axiosErr.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail) && detail.length > 0) {
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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem', background: 'var(--white)', color: 'var(--gray-800)',
    outline: 'none', fontFamily: 'var(--font-body)',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Input label="Nombres *" placeholder="Juan" value={form.first_name} onChange={set('first_name')} required />
        <Input label="Apellidos *" placeholder="Pérez" value={form.last_name} onChange={set('last_name')} required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Input label="Teléfono *" placeholder="3001234567" value={form.phone} onChange={set('phone')} required inputMode="numeric" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-600)' }}>Ciudad *</label>
          <select value={form.city} onChange={set('city')} required
            style={{ ...inputStyle, color: form.city ? 'var(--gray-800)' : 'var(--gray-400)' }}
            onFocus={e => { e.target.style.borderColor = 'var(--violet)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--gray-200)'; }}
          >
            <option value="">Selecciona ciudad</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <Input label="Dirección *" placeholder="Cra 10 # 20-30, Barrio Centro" value={form.address} onChange={set('address')} required />
      <Input label="Correo electrónico *" type="email" placeholder="tu@correo.com" value={form.email} onChange={set('email')} required />
      <PasswordInput label="Contraseña *" placeholder="Mín. 8 caracteres" value={form.password} onChange={set('password')} required showStrength />
      {form.password.length > 0 && <PasswordRequirements password={form.password} />}
      <PasswordInput
        label="Confirmar contraseña *"
        placeholder="Repite la contraseña"
        value={form.confirm}
        onChange={set('confirm')}
        required
        error={form.confirm && !passwordsMatch ? 'No coinciden' : undefined}
      />
      <Btn type="submit" loading={loading} size="lg" style={{ width: '100%', marginTop: 4 }} disabled={!isComplete}>
        Crear cuenta
      </Btn>
      <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--gray-400)' }}>
        ¿Ya tienes cuenta?{' '}
        <button type="button" onClick={() => onTabChange('login')}
          style={{ background: 'none', border: 'none', color: 'var(--violet)', fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}>
          Inicia sesión
        </button>
      </p>
    </form>
  );
}

// ── Forgot Password form ───────────────────────────────────────────────────

function ForgotForm({ onTabChange }: { onTabChange: (t: Tab) => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch {
      setError('No se pudo procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--violet), #4338ca)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.5rem', margin: '0 auto 16px',
      }}>✉️</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', marginBottom: 8 }}>
        ¡Enlace enviado!
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)', lineHeight: 1.6, marginBottom: 20 }}>
        Si el correo <strong style={{ color: 'var(--gray-800)' }}>{email}</strong> está registrado,
        recibirás un enlace para restablecer tu contraseña. Revisa también tu carpeta de spam.
      </p>
      <button
        onClick={() => onTabChange('login')}
        style={{ background: 'none', border: 'none', color: 'var(--violet)', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}
      >
        ← Volver al inicio de sesión
      </button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)', lineHeight: 1.6, marginBottom: 4 }}>
        Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
      </p>
      {error && <Alert type="error" message={error} />}
      <Input
        label="Correo electrónico"
        type="email"
        placeholder="tu@correo.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>}
      />
      <Btn type="submit" loading={loading} size="lg" style={{ width: '100%' }}>
        Enviar enlace
      </Btn>
      <p style={{ textAlign: 'center', fontSize: '0.83rem', color: 'var(--gray-400)' }}>
        <button type="button" onClick={() => onTabChange('login')}
          style={{ background: 'none', border: 'none', color: 'var(--violet)', fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)', fontSize: '0.83rem' }}>
          ← Volver al inicio de sesión
        </button>
      </p>
    </form>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────

export function AuthModal({ initialTab = 'login', onClose }: AuthModalProps) {
  const [tab, setTab] = useState<Tab>(initialTab);

  // Close on Escape
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [handleKey]);

  const titles: Record<Tab, string> = {
    login: 'Bienvenido de nuevo',
    register: 'Crear cuenta',
    forgot: 'Recuperar contraseña',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titles[tab]}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: 16,
        overflowY: 'auto',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--white)',
        borderRadius: 'var(--radius)',
        padding: '32px 32px 28px',
        width: '100%',
        maxWidth: tab === 'register' ? 560 : 420,
        boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--gray-400)', fontSize: '1.2rem',
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6, fontFamily: 'var(--font-body)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--gray-100)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
        >
          ✕
        </button>

        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Logo size="sm" />
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: '1.3rem', color: 'var(--gray-800)', marginTop: 14, marginBottom: 0,
          }}>
            {titles[tab]}
          </h2>
        </div>

        <Tabs active={tab} onChange={setTab} />

        {tab === 'login' && <LoginForm onClose={onClose} onTabChange={setTab} />}
        {tab === 'register' && <RegisterForm onClose={onClose} onTabChange={setTab} />}
        {tab === 'forgot' && <ForgotForm onTabChange={setTab} />}
      </div>
    </div>
  );
}
