import React from 'react';

const Vocabulary = () => {
  const palabras = ['adiós', 'buenas noches', 'buenas noches', 'buenos días', 'buenos días', 'gracias', 'gracias', 'hola'];

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Unidades léxicas</h2>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Vocabulario disponible en el sistema SignBridge</p>
      
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
        <span style={{ background: '#fee2e2', color: '#ef4444', padding: '0.3rem 0.6rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '500' }}>8 palabras (LSC → es_Co)</span>
        <input type="text" placeholder="Buscar palabra..." style={{ marginLeft: 'auto', padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {palabras.map((palabra, idx) => (
          <div key={idx} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', textTransform: 'capitalize', color: '#1e293b' }}>{palabra}</h4>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>🇨🇴 es_Co</span>
            <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: '0.5rem' }}>Agregado el 06 de Jun de 2026</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Vocabulary;