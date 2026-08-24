import { useState } from 'react';
import type { ReactNode, InputHTMLAttributes } from 'react';

// ── Logo ───────────────────────────────────────────────────────────────────

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 28, md: 36, lg: 48 };
  const px = sizes[size];
  const textSize = size === 'lg' ? '1.5rem' : size === 'md' ? '1.15rem' : '0.95rem';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={px} height={px} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="12" fill="#5B4FCF"/>
        <path d="M14 30 C14 22 20 16 28 16 C32 16 35 18 36 21" stroke="#F6A623" strokeWidth="3" strokeLinecap="round"/>
        <path d="M20 34 C22 28 26 24 32 24" stroke="#F6A623" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="34" cy="32" r="4" fill="#F6A623"/>
        <circle cx="16" cy="18" r="3" fill="white" opacity="0.7"/>
      </svg>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: textSize, color: 'var(--violet)', letterSpacing: '-0.02em' }}>
        Sign<span style={{ color: 'var(--amber)' }}>Bridge</span>
      </span>
    </div>
  );
}

// ── Button ─────────────────────────────────────────────────────────────────

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function Btn({ variant = 'primary', size = 'md', loading, children, style, ...rest }: BtnProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, fontWeight: 600, borderRadius: 'var(--radius-sm)', border: 'none',
    transition: 'all 0.15s ease', cursor: rest.disabled || loading ? 'not-allowed' : 'pointer',
    opacity: rest.disabled || loading ? 0.65 : 1,
    fontFamily: 'var(--font-body)',
  };
  const sizes = {
    sm: { padding: '6px 14px', fontSize: '0.8rem' },
    md: { padding: '10px 22px', fontSize: '0.9rem' },
    lg: { padding: '13px 30px', fontSize: '1rem' },
  };
  const variants = {
    primary: { background: 'var(--violet)', color: 'white' },
    secondary: { background: 'var(--amber)', color: 'white' },
    ghost: { background: 'transparent', color: 'var(--violet)', border: '1.5px solid var(--violet)' },
    danger: { background: 'var(--danger)', color: 'white' },
  };
  return (
    <button style={{ ...base, ...sizes[size], ...variants[variant], ...style }} disabled={loading || rest.disabled} {...rest}>
      {loading ? <Spinner size={14} color="currentColor" /> : null}
      {children}
    </button>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export function Input({ label, error, icon, style, ...rest }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
      {label && <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-600)' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', display: 'flex' }}>{icon}</span>}
        <input
          style={{
            width: '100%', padding: icon ? '10px 14px 10px 38px' : '10px 14px',
            border: `1.5px solid ${error ? 'var(--danger)' : 'var(--gray-200)'}`,
            borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', background: 'var(--white)',
            color: 'var(--gray-800)', outline: 'none', transition: 'border-color 0.15s',
            ...style,
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--violet)'; }}
          onBlur={e => { e.target.style.borderColor = error ? 'var(--danger)' : 'var(--gray-200)'; }}
          {...rest}
        />
      </div>
      {error && <span style={{ fontSize: '0.78rem', color: 'var(--danger)' }}>{error}</span>}
    </div>
  );
}

// ── PasswordInput ──────────────────────────────────────────────────────────
// Ojo para mostrar/ocultar contraseña + barra de fortaleza opcional

export type PasswordStrength = 'weak' | 'fair' | 'strong' | 'very-strong';

export function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return 'weak';
  if (score === 3) return 'fair';
  if (score === 4 || score === 5) return 'strong';
  return 'very-strong';
}

const strengthMeta: Record<PasswordStrength, { label: string; color: string; bars: number }> = {
  weak:        { label: 'Débil',      color: '#ef4444', bars: 1 },
  fair:        { label: 'Regular',    color: '#f59e0b', bars: 2 },
  strong:      { label: 'Fuerte',     color: '#10b981', bars: 3 },
  'very-strong':{ label: 'Muy fuerte', color: '#059669', bars: 4 },
};

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  showStrength?: boolean;
  /** Pass the password value when showStrength=true so the bar can be shown outside too */
  strengthValue?: string;
}

export function PasswordInput({ label, error, showStrength, strengthValue, style, ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const val = String(strengthValue ?? rest.value ?? '');
  const strength = showStrength ? getPasswordStrength(val) : null;
  const meta = strength ? strengthMeta[strength] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
      {label && <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-600)' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {/* lock icon */}
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', display: 'flex', pointerEvents: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </span>
        <input
          type={visible ? 'text' : 'password'}
          style={{
            width: '100%',
            padding: '10px 42px 10px 38px',
            border: `1.5px solid ${error ? 'var(--danger)' : 'var(--gray-200)'}`,
            borderRadius: 'var(--radius-sm)', fontSize: '0.9rem',
            background: 'var(--white)', color: 'var(--gray-800)',
            outline: 'none', transition: 'border-color 0.15s',
            fontFamily: 'var(--font-body)',
            boxSizing: 'border-box',
            ...style,
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--violet)'; }}
          onBlur={e => { e.target.style.borderColor = error ? 'var(--danger)' : 'var(--gray-200)'; }}
          {...rest}
        />
        {/* eye toggle */}
        <button
          type="button"
          tabIndex={-1}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          onClick={() => setVisible(v => !v)}
          style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--gray-400)', display: 'flex', alignItems: 'center', padding: 4,
            borderRadius: 4,
          }}
        >
          {visible ? (
            // eye-off
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          ) : (
            // eye
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
        </button>
      </div>

      {/* Strength bar */}
      {showStrength && val.length > 0 && meta && (
        <div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                style={{
                  flex: 1, height: 4, borderRadius: 99,
                  background: i <= meta.bars ? meta.color : 'var(--gray-100)',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: meta.color, fontWeight: 600 }}>
              {meta.label}
            </span>
            {strength === 'weak' || strength === 'fair' ? (
              <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>
                Añade mayúsculas, números y símbolos
              </span>
            ) : null}
          </div>
        </div>
      )}

      {error && <span style={{ fontSize: '0.78rem', color: 'var(--danger)' }}>{error}</span>}
    </div>
  );
}

// ── Password requirements checker ─────────────────────────────────────────

export function PasswordRequirements({ password }: { password: string }) {
  const reqs = [
    { label: 'Mínimo 8 caracteres',        met: password.length >= 8 },
    { label: 'Al menos una mayúscula',      met: /[A-Z]/.test(password) },
    { label: 'Al menos una minúscula',      met: /[a-z]/.test(password) },
    { label: 'Al menos un número',          met: /[0-9]/.test(password) },
    { label: 'Al menos un carácter especial', met: /[^A-Za-z0-9]/.test(password) },
  ];

  if (!password) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
      {reqs.map(r => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.75rem', color: r.met ? '#10b981' : 'var(--gray-400)', lineHeight: 1 }}>
            {r.met ? '✓' : '○'}
          </span>
          <span style={{ fontSize: '0.75rem', color: r.met ? '#10b981' : 'var(--gray-400)', fontWeight: r.met ? 600 : 400 }}>
            {r.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────

export function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)', padding: 24, ...style }}>
      {children}
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────

export function StatCard({ label, value, icon, accent = false }: { label: string; value: string | number; icon?: ReactNode; accent?: boolean }) {
  return (
    <Card style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {icon && (
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: accent ? 'var(--amber-light)' : 'var(--violet-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent ? 'var(--amber)' : 'var(--violet)', fontSize: 22,
        }}>
          {icon}
        </div>
      )}
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--gray-800)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 4, fontWeight: 500 }}>{label}</div>
      </div>
    </Card>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────

export function Spinner({ size = 24, color = 'var(--violet)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity="0.2"/>
      <path d="M12 2 A10 10 0 0 1 22 12" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

// ── Alert ──────────────────────────────────────────────────────────────────

export function Alert({ type, message }: { type: 'error' | 'success' | 'info'; message: string }) {
  const colors = {
    error: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' },
    success: { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
    info: { bg: 'var(--violet-light)', border: 'var(--gray-200)', text: 'var(--violet)' },
  };
  const c = colors[type];
  return (
    <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: '0.85rem', fontWeight: 500 }}>
      {message}
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────

export function Badge({ label, variant = 'default' }: { label: string; variant?: 'default' | 'amber' | 'success' | 'danger' }) {
  const styles = {
    default: { background: 'var(--violet-light)', color: 'var(--violet)' },
    amber: { background: 'var(--amber-light)', color: 'var(--amber-dark)' },
    success: { background: '#F0FDF4', color: '#15803D' },
    danger: { background: '#FEF2F2', color: '#DC2626' },
  };
  return (
    <span style={{ ...styles[variant], padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
      {label}
    </span>
  );
}
