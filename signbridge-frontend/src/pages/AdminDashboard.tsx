import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/client';
import type { AdminDashboardRow, SystemStats } from '../api/client';
import { Navbar } from '../components/Navbar';
import { StatCard, Card, Spinner, Alert, Badge } from '../components/UI';

export default function AdminDashboard() {
  const [rows, setRows] = useState<AdminDashboardRow[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([dashboardApi.admin(), dashboardApi.stats()])
      .then(([r1, r2]) => { setRows(r1.data); setStats(r2.data); })
      .catch(() => setError('No se pudieron cargar los datos'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase()) ||
    r.role_name.toLowerCase().includes(search.toLowerCase())
  );

  const roleVariant = (role: string): 'default' | 'amber' | 'success' | 'danger' => {
    if (role.toLowerCase().includes('admin')) return 'danger';
    if (role.toLowerCase().includes('soporte')) return 'amber';
    if (role.toLowerCase().includes('moderador')) return 'success';
    return 'default';
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <Navbar />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Panel de administración
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', color: 'var(--gray-800)', marginTop: 4 }}>
            Gestión de usuarios
          </h1>
        </div>

        {loading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spinner size={36} /></div>}
        {error && <Alert type="error" message={error} />}

        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
            <StatCard label="Usuarios totales" value={stats.total_users} icon={<span>👥</span>} />
            <StatCard label="Traducciones" value={stats.total_translations} icon={<span>🤟</span>} accent />
            <StatCard label="Tickets soporte" value={stats.total_support_requests} icon={<span>🎫</span>} />
            <StatCard label="Valoración media" value={stats.average_rating?.toFixed(1) ?? '—'} icon={<span>⭐</span>} accent />
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--gray-800)' }}>
                Todos los usuarios ({filtered.length})
              </h2>
              <input
                placeholder="Buscar por nombre, correo o rol..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  padding: '8px 14px', border: '1.5px solid var(--gray-200)', borderRadius: 8,
                  fontSize: '0.85rem', width: 260, outline: 'none', fontFamily: 'var(--font-body)',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--violet)'}
                onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
              />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    {['Usuario', 'Correo', 'Rol', 'Región', 'Traducciones', 'Soporte', 'Feedback'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--gray-100)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.9rem' }}>Sin resultados</td></tr>
                  ) : (
                    filtered.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--violet)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                              {row.full_name.charAt(0)}
                            </div>
                            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--gray-800)' }}>{row.full_name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--gray-600)' }}>{row.email}</td>
                        <td style={{ padding: '14px 16px' }}><Badge label={row.role_name} variant={roleVariant(row.role_name)} /></td>
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--gray-600)' }}>{row.region}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: 'var(--violet)' }}>{row.total_translations}</span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: row.support_tickets > 0 ? 'var(--amber-dark)' : 'var(--gray-400)' }}>{row.support_tickets}</span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: 'var(--gray-600)' }}>{row.feedback_count}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
