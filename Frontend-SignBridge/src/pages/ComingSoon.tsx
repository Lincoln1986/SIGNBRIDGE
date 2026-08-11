import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, Btn } from '../components/UI';

const CONFIG: Record<string, { icon: string; title: string; desc: string }> = {
  'voice-to-sign': {
    icon: '🎙️',
    title: 'Traducir voz a señas',
    desc: 'Esta función convertirá audio en tiempo real a lengua de señas colombiana (LSC) mediante un avatar 3D.',
  },
  'sign-to-text': {
    icon: '✋',
    title: 'Señas a texto',
    desc: 'Esta función capturará señas mediante la cámara y las traducirá a texto en tiempo real.',
  },
};

export default function ComingSoon() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const key = location.pathname.replace('/', '');
  const info = CONFIG[key] ?? { icon: '🚧', title: 'Función', desc: 'Esta función está en desarrollo.' };

  const homePath = isAdmin ? '/admin' : '/home';
  const homeLabel = isAdmin ? 'Volver a Panel Admin' : 'Volver a Inicio';

  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
      <Card style={{ maxWidth: 480, textAlign: 'center', padding: 48 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', background: 'var(--violet-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', margin: '0 auto 20px',
        }}>
          {info.icon}
        </div>

        <span style={{
          display: 'inline-block', background: 'var(--amber)', color: 'white',
          fontSize: '0.7rem', fontWeight: 700, padding: '4px 12px', borderRadius: 99,
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14,
        }}>
          En desarrollo
        </span>

        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--gray-800)', marginBottom: 10 }}>
          {info.title}
        </h1>

        <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 28 }}>
          {info.desc}
        </p>

        <Btn onClick={() => navigate(homePath)} style={{ width: '100%' }}>
          {homeLabel}
        </Btn>
      </Card>
    </div>
  );
}