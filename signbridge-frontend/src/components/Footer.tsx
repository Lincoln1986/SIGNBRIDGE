export function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--gray-100)',
      background: 'var(--white)',
      padding: '18px 40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
    }}>
      <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', margin: 0 }}>
        © 2026 <strong style={{ color: 'var(--violet)' }}>SignBridge</strong> · Lengua de Señas Colombiana · SENA
      </p>
      <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)', margin: 0 }}>
        ✉️ signbridge@sena.edu.co
      </p>
    </footer>
  );
}
