import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);

  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1rem' }}>Recuperar contraseña</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Te enviaremos un enlace a tu correo para restablecer tu acceso.</p>
      
      {!sent ? (
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
          <input type="email" placeholder="tu@correo.com" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '1rem' }} required />
          <button type="submit" style={{ width: '100%', padding: '0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Enviar enlace</button>
        </form>
      ) : (
        <div style={{ background: '#dcfce7', color: '#15803d', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>
          Si el correo existe, recibirás un enlace para restablecer tu contraseña. ¡Revisa tu Email Sandbox!
        </div>
      )}
      <p onClick={() => navigate('/login')} style={{ color: '#2563eb', marginTop: '1.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>← Volver al inicio de sesión</p>
    </div>
  );
};

export default ForgotPassword;