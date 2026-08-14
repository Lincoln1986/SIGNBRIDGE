/**
 * /login — ruta de fallback.
 * Ahora que el AuthModal está integrado en Landing (/),
 * esta página redirige a Landing pasando state para que el modal
 * de login se abra automáticamente.
 *
 * Se mantiene como fallback para links externos, correos, etc.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../components/UI';

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirige a Landing con state para abrir el modal de login
    navigate('/', { replace: true, state: { openModal: 'login' } });
  }, [navigate]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--gray-50)',
    }}>
      <Spinner size={36} />
    </div>
  );
}