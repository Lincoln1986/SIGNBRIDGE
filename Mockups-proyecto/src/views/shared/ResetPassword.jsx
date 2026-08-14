import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [pass, setPass] = useState('');
  const [confPass, setConfPass] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });

  const handleReset = (e) => {
    e.preventDefault();
    if (pass.length < 8) {
      setMsg({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    if (pass !== confPass) {
      setMsg({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }
    setMsg({ type: 'success', text: 'Contraseña restablecida exitosamente.' });
    setTimeout(() => navigate('/login'), 2000);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '5rem auto', padding: '2rem', background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
      <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>Nueva contraseña</h2>
      <form onSubmit={handleReset}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Nueva contraseña (Mín. 8 caracteres)</label>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} required />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Confirmar contraseña</label>
          <input type="password" value={confPass} onChange={(e) => setConfPass(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} required />
        </div>

        {msg.text && (
          <div style={{ padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', color: 'white', backgroundColor: msg.type === 'error' ? '#ef4444' : '#22c55e', fontSize: '0.875rem' }}>
            {msg.text}
          </div>
        )}

        <button type="submit" style={{ width: '100%', padding: '0.6rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Restablecer contraseña</button>
      </form>
    </div>
  );
};

export default ResetPassword;