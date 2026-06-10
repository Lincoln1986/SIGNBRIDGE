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
