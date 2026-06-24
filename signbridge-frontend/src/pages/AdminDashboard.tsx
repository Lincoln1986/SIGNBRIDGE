import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { dashboardApi } from '../api/client';
import type { AdminDashboardRow, SystemStats, LexicalUnitAdmin } from '../api/client';
import { StatCard, Card, Spinner, Alert, Badge, Btn } from '../components/UI';
import { VideoModal, NewWordModal, DeleteConfirmModal } from '../components/VocabModals';

const PAGE_SIZE = 8;

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

export default function AdminDashboard() {
  // Users table state
  const [rows, setRows] = useState<AdminDashboardRow[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Vocabulary state
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
    Promise.all([dashboardApi.admin(), dashboardApi.stats()])
      .then(([r1, r2]) => { setRows(r1.data); setStats(r2.data); })
      .catch(() => setError('No se pudieron cargar los datos'))
      .finally(() => setLoading(false));

    dashboardApi.lexicalUnitsAdmin()
      .then(r => setVocabUnits(r.data))
      .catch(() => { /* show empty table */ })
      .finally(() => setVocabLoading(false));
  }, []);

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { setVocabPage(1); }, [vocabSearch]);

  // ── Users table helpers ──────────────────────────────────────────────────

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
    if (role.toLowerCase().includes('moderador')) return 'success';
    return 'default';
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    if (safePage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (safePage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages);
    }
    return pages;
  };

  // ── Vocabulary helpers ───────────────────────────────────────────────────

  const filteredVocab = vocabUnits.filter(u =>
    u.text?.toLowerCase().includes(vocabSearch.toLowerCase())
  );
  const vocabTotalPages = Math.max(1, Math.ceil(filteredVocab.length / PAGE_SIZE));
  const safeVocabPage = Math.min(vocabPage, vocabTotalPages);
  const paginatedVocab = filteredVocab.slice((safeVocabPage - 1) * PAGE_SIZE, safeVocabPage * PAGE_SIZE);

  const flash = (msg: string) => { setVocabMsg(msg); setTimeout(() => setVocabMsg(''), 3000); };

  const handleSaveVideo = async (id: string, url: string | null) => {
    await dashboardApi.updateLexicalUnitVideo(id, url ?? '');
    setVocabUnits(prev => prev.map((u: LexicalUnitAdmin) =>
      u.id_lexicalunit === id ? { ...u, video_url: url ?? undefined } : u
    ));
    flash(url ? '✅ Video asignado correctamente' : '✅ Video eliminado');
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await dashboardApi.deleteLexicalUnit(deleteConfirm.id_lexicalunit);
      setVocabUnits(prev => prev.filter((u: LexicalUnitAdmin) => u.id_lexicalunit !== deleteConfirm.id_lexicalunit));
      flash('✅ Palabra eliminada');
    } catch {
      flash('❌ No se pudo eliminar');
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
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

      {/* ── Users table ── */}
      {!loading && !error && (
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
            <input
              placeholder="Buscar por nombre, correo o rol..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '8px 14px', border: '1.5px solid var(--gray-200)', borderRadius: 8,
                fontSize: '0.85rem', width: 280, outline: 'none', fontFamily: 'var(--font-body)',
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
                {paginated.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.9rem' }}>Sin resultados</td></tr>
                ) : (
                  paginated.map((row, i) => (
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
      )}

      {/* ── Vocabulary section ── */}
      <div style={{ marginTop: 48, marginBottom: 24 }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--violet)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Vocabulario
        </p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--gray-800)', marginTop: 4 }}>
          Gestión de palabras y señas
        </h2>
      </div>

      {vocabMsg && (
        <div style={{ marginBottom: 16 }}>
          <Alert type={vocabMsg.startsWith('✅') ? 'success' : 'error'} message={vocabMsg} />
        </div>
      )}

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
              style={{
                padding: '8px 14px', border: '1.5px solid var(--gray-200)', borderRadius: 8,
                fontSize: '0.85rem', width: 200, outline: 'none', fontFamily: 'var(--font-body)',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--violet)'}
              onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
            />
            <Btn size="sm" onClick={() => setShowNewWord(true)}>
              + Nueva palabra
            </Btn>
          </div>
        </div>

        {vocabLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={28} /></div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    {['Palabra', 'Idioma', 'Video', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--gray-100)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedVocab.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
                        Sin palabras. Usa "+ Nueva palabra" para agregar.
                      </td>
                    </tr>
                  ) : paginatedVocab.map((u, i) => (
                    <tr key={i}
                      style={{ borderBottom: '1px solid var(--gray-100)', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--gray-800)', fontSize: '0.9rem' }}>
                        {u.text}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge label={u.language} variant="default" />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {u.video_url
                          ? <span style={{ color: '#15803D', fontWeight: 600, fontSize: '0.82rem' }}>🎬 Asignado</span>
                          : <span style={{ color: 'var(--gray-400)', fontSize: '0.82rem' }}>Sin video</span>
                        }
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => setEditingUnit(u)}
                            style={{
                              padding: '5px 12px', borderRadius: 6,
                              border: '1.5px solid var(--violet)', background: 'none',
                              color: 'var(--violet)', fontSize: '0.78rem', fontWeight: 600,
                              cursor: 'pointer', fontFamily: 'var(--font-body)',
                            }}
                          >
                            {u.video_url ? '✏️ Editar video' : '▶ Agregar video'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(u)}
                            style={{
                              padding: '5px 10px', borderRadius: 6,
                              border: '1.5px solid #FECACA', background: 'none',
                              color: '#DC2626', fontSize: '0.78rem', fontWeight: 600,
                              cursor: 'pointer', fontFamily: 'var(--font-body)',
                            }}
                          >
                            🗑
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

      {/* Modals */}
      {editingUnit && (
        <VideoModal
          unit={editingUnit}
          onClose={() => setEditingUnit(null)}
          onSave={handleSaveVideo}
        />
      )}
      {showNewWord && (
        <NewWordModal
          onClose={() => setShowNewWord(false)}
          onCreated={u => setVocabUnits(prev => [u, ...prev])}
        />
      )}
      {deleteConfirm && (
        <DeleteConfirmModal
          unit={deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </>
  );
}