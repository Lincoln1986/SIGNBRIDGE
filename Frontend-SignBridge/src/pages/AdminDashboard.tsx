import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { dashboardApi, adminUsersApi , statsApi } from '../api/client';
import type { AdminDashboardRow, SystemStats, LexicalUnitAdmin, RoleOption,
              TopWordRow, TranslationTypeRow, ActivityRow, InteractionSummary } from '../api/client';
import { StatCard, Card, Spinner, Alert, Badge, Btn } from '../components/UI';
import { VideoModal, NewWordModal, DeleteConfirmModal } from '../components/VocabModals';
import { useAuth } from '../context/AuthContext';
import { StatDetailModal } from '../components/StatDetailModal';
import type { DetalleMetrica } from '../components/StatDetailModal';
import { MetricsBarChart, RatingGauge, RoleDistributionChart, RegionDistributionChart,
         TopWordsChart, ChannelUsageChart, ActivityChart } from '../components/StatsCharts';

const PAGE_SIZE = 8;

// ── Shared helpers ─────────────────────────────────────────────────────────

function PaginationBtn({ children, onClick, active = false, disabled = false }: {
  children: ReactNode; onClick: () => void; active?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 34, height: 34, padding: '0 10px',
        border: active ? 'none' : '1.5px solid var(--gray-200)',
        borderRadius: 8, fontWeight: active ? 700 : 500,
        fontSize: '0.85rem', cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? 'var(--violet)' : 'var(--white)',
        color: active ? 'white' : disabled ? 'var(--gray-200)' : 'var(--gray-600)',
        fontFamily: 'var(--font-body)', transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}

type AdminTab = 'users' | 'vocabulary' | 'stats';

// ── Uso de la plataforma ────────────────────────────────────────────────────
// Misma sección que la página /admin/stats, para que ambas vistas de
// "Estadísticas" muestren lo mismo y no haya dos verdades distintas.

function UsoDeLaPlataforma() {
  const [palabras, setPalabras]   = useState<TopWordRow[]>([]);
  const [canales, setCanales]     = useState<TranslationTypeRow[]>([]);
  const [actividad, setActividad] = useState<ActivityRow[]>([]);
  const [detalle, setDetalle]     = useState<DetalleMetrica | null>(null);
  const [resumen, setResumen]     = useState<InteractionSummary | null>(null);

  useEffect(() => {
    statsApi.resumenInteraccion().then(r => setResumen(r.data)).catch(() => {});
    statsApi.palabrasGlobales(10).then(r => setPalabras(r.data)).catch(() => {});
    statsApi.canalesGlobales().then(r => setCanales(r.data)).catch(() => {});
    statsApi.actividadGlobal(30).then(r => setActividad(r.data)).catch(() => {});
  }, []);

  const h3: React.CSSProperties = {
    fontFamily: 'var(--font-display)', fontWeight: 700,
    fontSize: '0.95rem', marginBottom: 4, color: 'var(--gray-800)',
  };
  const sub: React.CSSProperties = {
    fontSize: '0.82rem', color: 'var(--gray-400)', marginTop: 0, marginBottom: 14,
  };

  return (
    <>
      <div style={{ marginTop: 32, marginBottom: 16 }}>
        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--violet)',
                    textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
          Uso de la plataforma
        </p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800,
                     fontSize: '1.25rem', color: 'var(--gray-800)', marginTop: 4 }}>
          Cómo se está usando SignBridge
        </h2>
      </div>

      {/* Tarjetas de uso: son las mismas de la página /stats, que faltaban acá */}
      {resumen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: 16, marginBottom: 16 }}>
          {([
            ['traducidas',  'Palabras traducidas',        resumen.total_words_translated, '📖', true],
            ['vocabulario', 'Vocabulario distinto usado', resumen.distinct_words_used,    '🔤', false],
            ['sin-usar',    'Señas que nadie usó',        resumen.words_not_found,        '💤', false],
            ['promedio',    'Palabras por sesión',        resumen.avg_words_per_session,  '📊', true],
          ] as const).map(([tipo, etiqueta, valor, icono, acento]) => (
            <div key={tipo} role="button" tabIndex={0} title="Ver el detalle"
                 style={{ cursor: 'pointer' }}
                 onClick={() => setDetalle({ tipo } as DetalleMetrica)}
                 onKeyDown={e => { if (e.key === 'Enter') setDetalle({ tipo } as DetalleMetrica); }}>
              <StatCard label={etiqueta} value={valor} icon={<span>{icono}</span>} accent={acento} />
            </div>
          ))}
        </div>
      )}

      {/* Rejilla de dos columnas: el ranking ocupa la altura de las otras dos
          juntas, así todo entra en una pantalla sin tener que bajar. */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 16, alignItems: 'start',
      }}>
        <Card style={{ gridRow: 'span 2' }}>
          <h3 style={h3}>Señas más traducidas</h3>
          <p style={sub}>
            El color indica la calificación promedio. Una barra larga y roja es
            una palabra muy usada que la gente califica mal.
          </p>
          <TopWordsChart rows={palabras} onSelect={p => setDetalle({ tipo: 'palabra', palabra: p })} />
        </Card>

        <Card>
          <h3 style={h3}>Cómo traduce la gente</h3>
          <p style={sub}>Reparto de traducciones por canal de entrada.</p>
          <ChannelUsageChart rows={canales} onSelect={c => setDetalle({ tipo: 'canal', canal: c })} />
        </Card>

        <Card>
          <h3 style={h3}>Actividad diaria</h3>
          <p style={sub}>Traducciones realizadas por día.</p>
          <ActivityChart rows={actividad} />
        </Card>
      </div>

      {detalle && <StatDetailModal detalle={detalle} onClose={() => setDetalle(null)} />}
    </>
  );
}

// ── Tab bar ────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: AdminTab; onChange: (t: AdminTab) => void }) {
  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'users',      label: 'Usuarios',     icon: '👥' },
    { id: 'vocabulary', label: 'Vocabulario',  icon: '📚' },
    { id: 'stats',      label: 'Estadísticas', icon: '📊' },
  ];
  return (
    <div style={{
      display: 'flex',
      background: 'var(--gray-50)',
      borderRadius: 12,
      padding: 4,
      gap: 4,
      marginBottom: 28,
      border: '1.5px solid var(--gray-100)',
    }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            flex: 1,
            padding: '10px 8px',
            borderRadius: 9,
            border: 'none',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            transition: 'all 0.15s',
            background: active === t.id ? 'var(--white)' : 'transparent',
            color: active === t.id ? 'var(--violet)' : 'var(--gray-400)',
            boxShadow: active === t.id ? 'var(--shadow-sm)' : 'none',
            fontFamily: 'var(--font-body)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <span>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Role edit modal ────────────────────────────────────────────────────────

function RoleModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminDashboardRow;
  onClose: () => void;
  onSaved: (userId: string, newRoleName: string) => void;
}) {
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [selected, setSelected] = useState(user.role_name);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    dashboardApi.roles()
      .then(r => {
        const data = r.data;
        if (Array.isArray(data) && data.length > 0) {
          setRoles(data);
        }
      })
      .catch(() => {
        setRoles([
          { id_role: 'cliente',       role_name: 'Cliente' },
          { id_role: 'administrador', role_name: 'Administrador' },
          { id_role: 'soporte',       role_name: 'Soporte' },
        ]);
      })
      .finally(() => setRolesLoading(false));
  }, []);

  const handleSave = async () => {
    if (!user.id_user) return;
    setSaving(true);
    setErr('');
    try {
      await adminUsersApi.updateRole(user.id_user, selected);
      onSaved(user.id_user, selected);
      onClose();
    } catch (e: unknown) {
      const axiosErr = e as { response?: { data?: { detail?: unknown } } };
      const detail = axiosErr.response?.data?.detail;
      setErr(typeof detail === 'string' ? detail : 'No se pudo actualizar el rol. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--white)', borderRadius: 16, padding: 28, width: 360,
        boxShadow: 'var(--shadow-lg)', fontFamily: 'var(--font-body)',
      }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--gray-800)', marginBottom: 4 }}>
          Cambiar rol
        </h3>
        <p style={{ fontSize: '0.83rem', color: 'var(--gray-400)', marginBottom: 20 }}>
          {user.full_name} · {user.email}
        </p>

        {rolesLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Spinner size={24} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {roles.map(r => (
              <label key={r.id_role} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                border: `1.5px solid ${selected === r.role_name ? 'var(--violet)' : 'var(--gray-200)'}`,
                borderRadius: 9, cursor: 'pointer', transition: 'border 0.15s',
                background: selected === r.role_name ? 'var(--violet-light)' : 'transparent',
              }}>
                <input
                  type="radio"
                  name="role"
                  value={r.role_name}
                  checked={selected === r.role_name}
                  onChange={() => setSelected(r.role_name)}
                  style={{ accentColor: 'var(--violet)' }}
                />
                <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--gray-800)' }}>
                  {r.role_name}
                </span>
              </label>
            ))}
          </div>
        )}

        {err && <p style={{ color: '#DC2626', fontSize: '0.82rem', marginBottom: 12 }}>{err}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: '8px 18px', border: '1.5px solid var(--gray-200)', borderRadius: 8, background: 'none', color: 'var(--gray-600)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Cancelar
          </button>
          <Btn size="sm" onClick={handleSave} disabled={saving || rolesLoading || selected === user.role_name}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Users tab ──────────────────────────────────────────────────────────────

function UsersTab({
  rows,
  loading,
  error,
  onRowsChange,
  currentUserId,
}: {
  rows: AdminDashboardRow[];
  loading: boolean;
  error: string;
  onRowsChange: (updater: (prev: AdminDashboardRow[]) => AdminDashboardRow[]) => void;
  currentUserId: string | undefined;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [roleTarget, setRoleTarget] = useState<AdminDashboardRow | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [flashMsg, setFlashMsg] = useState('');

  useEffect(() => { setPage(1); }, [search]);

  const flash = (msg: string) => {
    setFlashMsg(msg);
    setTimeout(() => setFlashMsg(''), 3000);
  };

  const handleToggleStatus = async (row: AdminDashboardRow) => {
    if (!row.id_user) return;
    const newStatus = !row.is_active;
    setTogglingId(row.id_user);
    try {
      await adminUsersApi.setActive(row.id_user, newStatus);
      onRowsChange(prev =>
        prev.map(r => r.id_user === row.id_user ? { ...r, is_active: newStatus } : r)
      );
      flash(`✅ Usuario ${newStatus ? 'activado' : 'desactivado'}`);
    } catch {
      flash('❌ No se pudo cambiar el estado');
    } finally {
      setTogglingId(null);
    }
  };

  const handleExportCsv = async () => {
    setExportLoading(true);
    try {
      const response = await adminUsersApi.exportCsv();
      const blob = new Blob([response.data as BlobPart], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usuarios_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      flash('✅ CSV descargado');
    } catch {
      flash('❌ No se pudo exportar el CSV');
    } finally {
      setExportLoading(false);
    }
  };

  const filtered = rows.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase()) ||
    r.role_name.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const startIdx = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(safePage * PAGE_SIZE, filtered.length);

  const roleVariant = (role: string): 'default' | 'amber' | 'success' | 'danger' => {
    if (role.toLowerCase().includes('admin')) return 'danger';
    if (role.toLowerCase().includes('soporte')) return 'amber';
    return 'default';
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    if (safePage <= 4) { pages.push(1, 2, 3, 4, 5, '...', totalPages); }
    else if (safePage >= totalPages - 3) { pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages); }
    else { pages.push(1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages); }
    return pages;
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spinner size={36} /></div>;
  if (error) return <Alert type="error" message={error} />;

  return (
    <>
      {flashMsg && (
        <div style={{ marginBottom: 14 }}>
          <Alert type={flashMsg.startsWith('✅') ? 'success' : 'error'} message={flashMsg} />
        </div>
      )}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--gray-800)' }}>
              Todos los usuarios
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>
              {filtered.length === 0 ? 'Sin resultados' : `Mostrando ${startIdx}–${endIdx} de ${filtered.length}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              placeholder="Buscar por nombre, correo o rol..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '8px 14px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '0.85rem', width: 260, outline: 'none', fontFamily: 'var(--font-body)' }}
              onFocus={e => e.target.style.borderColor = 'var(--violet)'}
              onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
            />
            <button
              onClick={handleExportCsv}
              disabled={exportLoading}
              title="Exportar usuarios a CSV"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                border: '1.5px solid var(--gray-200)',
                background: exportLoading ? 'var(--gray-50)' : 'var(--white)',
                color: exportLoading ? 'var(--gray-400)' : 'var(--gray-700)',
                fontSize: '0.84rem', fontWeight: 600,
                cursor: exportLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)', transition: 'all 0.15s',
              }}
            >
              {exportLoading ? <Spinner size={14} /> : '⬇'}
              {exportLoading ? 'Exportando…' : 'Exportar CSV'}
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', margin: '0 -24px', padding: '0 24px', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)' }}>
                {['Usuario', 'Correo', 'Rol', 'Región', 'Traducciones', 'Soporte', 'Feedback', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '12px 10px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--gray-100)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.9rem' }}>Sin resultados</td></tr>
              ) : paginated.map((row, i) => {
                const inactive = row.is_active === false;
                const isToggling = togglingId === row.id_user;
                return (
                  <tr
                    key={i}
                    style={{
                      borderBottom: '1px solid var(--gray-100)',
                      transition: 'background 0.1s',
                      opacity: inactive ? 0.55 : 1,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: inactive ? 'var(--gray-300)' : 'var(--violet)',
                          color: 'white', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
                        }}>
                          {row.full_name.charAt(0)}
                        </div>
                        <div>
                          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--gray-800)' }}>{row.full_name}</span>
                          {inactive && (
                            <span style={{
                              marginLeft: 8, fontSize: '0.7rem', fontWeight: 700,
                              background: '#FEE2E2', color: '#DC2626',
                              borderRadius: 4, padding: '1px 6px',
                            }}>
                              Inactivo
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 10px', fontSize: '0.85rem', color: 'var(--gray-600)' }}>{row.email}</td>
                    <td style={{ padding: '14px 10px' }}><Badge label={row.role_name} variant={roleVariant(row.role_name)} /></td>
                    <td style={{ padding: '14px 10px', fontSize: '0.85rem', color: 'var(--gray-600)' }}>{row.region}</td>

                    <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--violet)' }}>{row.total_translations}</span>
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: row.support_tickets > 0 ? 'var(--amber-dark)' : 'var(--gray-400)' }}>{row.support_tickets}</span>
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--gray-600)' }}>{row.feedback_count}</span>
                    </td>

                    <td style={{ padding: '14px 10px' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {(() => {
                          const isSelf = !!(row.id_user && currentUserId && row.id_user === currentUserId);
                          return (
                            <button
                              onClick={() => !isSelf && setRoleTarget(row)}
                              disabled={!row.id_user || isSelf}
                              title={isSelf ? 'No puedes cambiar tu propio rol' : 'Cambiar rol'}
                              style={{
                                padding: '5px 10px', borderRadius: 6,
                                border: `1.5px solid ${isSelf ? 'var(--gray-200)' : 'var(--violet)'}`,
                                background: 'none',
                                color: isSelf ? 'var(--gray-400)' : 'var(--violet)',
                                fontSize: '0.78rem', fontWeight: 600,
                                cursor: (row.id_user && !isSelf) ? 'pointer' : 'not-allowed',
                                fontFamily: 'var(--font-body)',
                              }}
                            >
                              {isSelf ? '🚫 Rol' : '✏️ Rol'}
                            </button>
                          );
                        })()}

                        <button
                          onClick={() => handleToggleStatus(row)}
                          disabled={!row.id_user || isToggling}
                          title={inactive ? 'Activar usuario' : 'Desactivar usuario'}
                          style={{
                            padding: '5px 10px', borderRadius: 6,
                            border: `1.5px solid ${inactive ? '#BBF7D0' : '#FECACA'}`,
                            background: 'none',
                            color: inactive ? '#15803D' : '#DC2626',
                            fontSize: '0.78rem', fontWeight: 600,
                            cursor: (row.id_user && !isToggling) ? 'pointer' : 'not-allowed',
                            fontFamily: 'var(--font-body)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isToggling
                            ? <Spinner size={12} />
                            : inactive ? '✓ Activar' : '✕ Baja'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
            <PaginationBtn onClick={() => setPage(1)} disabled={safePage === 1}>«</PaginationBtn>
            <PaginationBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</PaginationBtn>
            {getPageNumbers().map((p, idx) =>
              p === '...'
                ? <span key={`e${idx}`} style={{ padding: '0 4px', color: 'var(--gray-400)', fontSize: '0.85rem' }}>…</span>
                : <PaginationBtn key={p} onClick={() => setPage(p as number)} active={safePage === p}>{p}</PaginationBtn>
            )}
            <PaginationBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</PaginationBtn>
            <PaginationBtn onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>»</PaginationBtn>
          </div>
        )}
      </Card>

      {roleTarget && (
        <RoleModal
          user={roleTarget}
          onClose={() => setRoleTarget(null)}
          onSaved={(userId, newRole) => {
            onRowsChange(prev =>
              prev.map(r => r.id_user === userId ? { ...r, role_name: newRole } : r)
            );
            flash(`✅ Rol actualizado a "${newRole}"`);
          }}
        />
      )}
    </>
  );
}

// ── Vocabulary tab ─────────────────────────────────────────────────────────

function VocabularyTab() {
  const [vocabUnits, setVocabUnits] = useState<LexicalUnitAdmin[]>([]);
  const [vocabLoading, setVocabLoading] = useState(true);
  const [vocabSearch, setVocabSearch] = useState('');
  const [vocabPage, setVocabPage] = useState(1);
  const [editingUnit, setEditingUnit] = useState<LexicalUnitAdmin | null>(null);
  const [showNewWord, setShowNewWord] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<LexicalUnitAdmin | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [vocabMsg, setVocabMsg] = useState('');

  useEffect(() => {
    dashboardApi.lexicalUnitsAdmin()
      .then(r => setVocabUnits(r.data))
      .catch(() => {})
      .finally(() => setVocabLoading(false));
  }, []);

  useEffect(() => { setVocabPage(1); }, [vocabSearch]);

  const filteredVocab = vocabUnits.filter(u => u.text?.toLowerCase().includes(vocabSearch.toLowerCase()));
  const vocabTotalPages = Math.max(1, Math.ceil(filteredVocab.length / PAGE_SIZE));
  const safeVocabPage = Math.min(vocabPage, vocabTotalPages);
  const paginatedVocab = filteredVocab.slice((safeVocabPage - 1) * PAGE_SIZE, safeVocabPage * PAGE_SIZE);

  const flash = (msg: string) => { setVocabMsg(msg); setTimeout(() => setVocabMsg(''), 3000); };

  const handleSaveVideo = async (id: string, url: string | null) => {
    await dashboardApi.updateLexicalUnitVideo(id, url ?? '');
    setVocabUnits(prev => prev.map(u => u.id_lexicalunit === id ? { ...u, video_url: url ?? undefined } : u));
    flash(url ? '✅ Video asignado correctamente' : '✅ Video eliminado');
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await dashboardApi.deleteLexicalUnit(deleteConfirm.id_lexicalunit);
      setVocabUnits(prev => prev.filter(u => u.id_lexicalunit !== deleteConfirm.id_lexicalunit));
      flash('✅ Palabra eliminada');
    } catch { flash('❌ No se pudo eliminar'); }
    finally { setDeleting(false); setDeleteConfirm(null); }
  };

  return (
    <>
      {vocabMsg && <div style={{ marginBottom: 16 }}><Alert type={vocabMsg.startsWith('✅') ? 'success' : 'error'} message={vocabMsg} /></div>}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--gray-800)' }}>
              Unidades léxicas ({filteredVocab.length})
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>
              {filteredVocab.filter(u => u.video_url).length} con video asignado
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              placeholder="Buscar palabra..."
              value={vocabSearch}
              onChange={e => setVocabSearch(e.target.value)}
              style={{ padding: '8px 14px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '0.85rem', width: 200, outline: 'none', fontFamily: 'var(--font-body)' }}
              onFocus={e => e.target.style.borderColor = 'var(--violet)'}
              onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
            />
            <Btn size="sm" onClick={() => setShowNewWord(true)}>+ Nueva palabra</Btn>
          </div>
        </div>

        {vocabLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={28} /></div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', margin: '0 -24px', padding: '0 24px', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    {['Palabra', 'Idioma', 'Video', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '12px 10px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--gray-100)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedVocab.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Sin palabras. Usa "+ Nueva palabra" para agregar.</td></tr>
                  ) : paginatedVocab.map((u, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 12px', fontWeight: 700, color: 'var(--gray-800)', fontSize: '0.9rem' }}>{u.text}</td>
                      <td style={{ padding: '12px 12px' }}><Badge label={u.language} variant="default" /></td>
                      <td style={{ padding: '12px 12px' }}>
                        {u.video_url
                          ? <span style={{ color: '#15803D', fontWeight: 600, fontSize: '0.82rem' }}>🎬 Asignado</span>
                          : <span style={{ color: 'var(--gray-400)', fontSize: '0.82rem' }}>Sin video</span>}
                      </td>
                      <td style={{ padding: '12px 12px', width: 1, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditingUnit(u)} style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid var(--violet)', background: 'none', color: 'var(--violet)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                            {u.video_url ? '✏️ Editar' : '▶ Agregar'}
                          </button>
                          <button onClick={() => setDeleteConfirm(u)} style={{ padding: '5px 10px', borderRadius: 6, border: '1.5px solid #FECACA', background: 'none', color: '#DC2626', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                            🗑 Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {vocabTotalPages > 1 && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                <PaginationBtn onClick={() => setVocabPage(1)} disabled={safeVocabPage === 1}>«</PaginationBtn>
                <PaginationBtn onClick={() => setVocabPage(p => Math.max(1, p - 1))} disabled={safeVocabPage === 1}>‹</PaginationBtn>
                {Array.from({ length: vocabTotalPages }, (_, i) => i + 1).map(p => (
                  <PaginationBtn key={p} onClick={() => setVocabPage(p)} active={safeVocabPage === p}>{p}</PaginationBtn>
                ))}
                <PaginationBtn onClick={() => setVocabPage(p => Math.min(vocabTotalPages, p + 1))} disabled={safeVocabPage === vocabTotalPages}>›</PaginationBtn>
                <PaginationBtn onClick={() => setVocabPage(vocabTotalPages)} disabled={safeVocabPage === vocabTotalPages}>»</PaginationBtn>
              </div>
            )}
          </>
        )}
      </Card>

      {editingUnit && <VideoModal unit={editingUnit} onClose={() => setEditingUnit(null)} onSave={handleSaveVideo} />}
      {showNewWord && <NewWordModal onClose={() => setShowNewWord(false)} onCreated={u => setVocabUnits(prev => [u, ...prev])} />}
      {deleteConfirm && <DeleteConfirmModal unit={deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={handleDelete} deleting={deleting} />}
    </>
  );
}

// ── Stats tab ──────────────────────────────────────────────────────────────

function StatsTab({ stats, rows, loading }: { stats: SystemStats | null; rows: AdminDashboardRow[]; loading: boolean }) {
  const [detalleTop, setDetalleTop] = useState<DetalleMetrica | null>(null);
  const onDetalle = (d: DetalleMetrica) => setDetalleTop(d);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spinner size={36} /></div>;

  if (!stats) return (
    <Card style={{ textAlign: 'center', padding: 48 }}>
      <div style={{ fontSize: '2rem', marginBottom: 12 }}>📊</div>
      <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>
        Las estadísticas estarán disponibles cuando el endpoint <code>/dashboard/stats</code> esté activo.
      </p>
    </Card>
  );

  // `tipo: null` = tarjeta informativa. Solo se hacen clicables las métricas
  // que tienen un desglose real detrás; abrir un modal que dice "esto no tiene
  // detalle" es peor que no poder hacer clic.
  const statItems: { tipo: DetalleMetrica['tipo'] | null; label: string; value: string | number; icon: string; accent: boolean }[] = [
    { tipo: null,           label: 'Usuarios registrados', value: stats.total_users, icon: '👥', accent: false },
    { tipo: 'traducciones', label: 'Traducciones realizadas', value: stats.total_translations, icon: '🤟', accent: true },
    { tipo: 'soporte',      label: 'Tickets de soporte', value: stats.total_support_requests, icon: '🎫', accent: false },
    { tipo: null,           label: 'Valoración promedio', value: stats.average_rating ? `${stats.average_rating.toFixed(1)} / 5` : '—', icon: '⭐', accent: false },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        {statItems.map(s => s.tipo ? (
          <div key={s.label} role="button" tabIndex={0} title="Ver el detalle"
               style={{ cursor: 'pointer' }}
               onClick={() => onDetalle({ tipo: s.tipo } as DetalleMetrica)}
               onKeyDown={e => { if (e.key === 'Enter') onDetalle({ tipo: s.tipo } as DetalleMetrica); }}>
            <StatCard label={s.label} value={s.value} icon={<span>{s.icon}</span>} accent={s.accent} />
          </div>
        ) : (
          <StatCard key={s.label} label={s.label} value={s.value} icon={<span>{s.icon}</span>} accent={s.accent} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        <Card>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', marginBottom: 12, color: 'var(--gray-800)' }}>
            Comparativa de métricas
          </h3>
          <MetricsBarChart stats={stats} />
        </Card>

        <Card>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', marginBottom: 12, color: 'var(--gray-800)' }}>
            Usuarios por rol
          </h3>
          <RoleDistributionChart rows={rows} />   {/* sin desglose propio */}
        </Card>

        <Card>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', marginBottom: 12, color: 'var(--gray-800)' }}>
            Usuarios por región
          </h3>
          <RegionDistributionChart rows={rows} />
        </Card>

        {stats.average_rating != null && (
          <Card>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', marginBottom: 4, color: 'var(--gray-800)' }}>
              Valoración promedio
            </h3>
            <RatingGauge rating={stats.average_rating} />
          </Card>
        )}
      </div>

      <UsoDeLaPlataforma />

      {detalleTop && <StatDetailModal detalle={detalleTop} onClose={() => setDetalleTop(null)} />}
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [rows, setRows] = useState<AdminDashboardRow[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      adminUsersApi.list(),
      dashboardApi.stats(),
    ])
      .then(([r1, r2]) => {
        const adminRows = r1.data;
        dashboardApi.admin()
          .then(r3 => {
            const metricsByEmail = new Map(r3.data.map(row => [row.email, row]));
            const merged = adminRows.map(u => ({
              ...u,
              total_translations: metricsByEmail.get(u.email)?.total_translations ?? 0,
              support_tickets:    metricsByEmail.get(u.email)?.support_tickets    ?? 0,
              feedback_count:     metricsByEmail.get(u.email)?.feedback_count     ?? 0,
            }));
            setRows(merged);
          })
          .catch(() => {
            setRows(adminRows.map(u => ({
              ...u,
              total_translations: 0,
              support_tickets: 0,
              feedback_count: 0,
            })));
          });
        setStats(r2.data);
      })
      .catch(() => setError('No se pudieron cargar los datos'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Panel de administración
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', color: 'var(--gray-800)', marginTop: 4 }}>
          Administración
        </h1>
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} />

      {activeTab === 'users' && (
        <UsersTab
          rows={rows}
          loading={loading}
          error={error}
          onRowsChange={setRows}
          currentUserId={user?.id_user}
        />
      )}
      {activeTab === 'vocabulary' && <VocabularyTab />}
      {activeTab === 'stats' && <StatsTab stats={stats} rows={rows} loading={loading} />}
    </>
  );
}