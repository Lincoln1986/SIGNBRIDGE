import { useEffect, useState } from 'react';
import { supportApi, feedbackApi } from '../api/client';
import type { SupportTicketWithUser, FeedbackItemWithUser, QuickReply } from '../api/client';
import { Card, Spinner, Alert, Badge, StatCard, Btn } from '../components/UI';
import { useAuth } from '../context/AuthContext';

type SupportTab = 'tickets' | 'feedback';

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pendiente',  color: '#b45309', bg: '#fef3c7' },
  in_progress: { label: 'En proceso', color: '#7c3aed', bg: 'var(--violet-light)' },
  resolved:    { label: 'Resuelto',   color: '#15803d', bg: '#f0fdf4' },
  closed:      { label: 'Cerrado',    color: 'var(--gray-500)', bg: 'var(--gray-100)' },
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending',     label: 'Pendiente' },
  { value: 'in_progress', label: 'En proceso' },
  { value: 'resolved',    label: 'Resuelto' },
  { value: 'closed',      label: 'Cerrado' },
];

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: SupportTab; onChange: (t: SupportTab) => void }) {
  const tabs: { id: SupportTab; label: string; icon: string }[] = [
    { id: 'tickets',  label: 'Tickets',      icon: '🎫' },
    { id: 'feedback', label: 'Valoraciones', icon: '💬' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: '1.5px solid var(--gray-100)' }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '0.88rem', fontFamily: 'var(--font-body)',
            color: active === t.id ? 'var(--violet)' : 'var(--gray-400)',
            borderBottom: active === t.id ? '2.5px solid var(--violet)' : '2.5px solid transparent',
            marginBottom: -2, transition: 'all 0.15s',
          }}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Tickets ──────────────────────────────────────────────────────────────────

function TicketsTab() {
  const { isSupport } = useAuth();
  const [tickets, setTickets] = useState<SupportTicketWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  // Estado local del cambio de estado en curso por ticket (para el select + solución)
  const [pendingStatus, setPendingStatus] = useState<Record<string, string>>({});
  const [solutionDrafts, setSolutionDrafts] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    supportApi.listAll()
      .then(({ data }) => setTickets(data))
      .catch(() => setError('No se pudieron cargar los tickets.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleStatusSelect = (id_support: string, status: string) => {
    setPendingStatus(prev => ({ ...prev, [id_support]: status }));
  };

  const handleConfirmStatus = async (id_support: string, status: string) => {
    const solution = solutionDrafts[id_support]?.trim();
    if (status === 'resolved' && !solution) {
      setError('Para marcar el ticket como resuelto debes escribir la solución.');
      return;
    }
    setUpdatingId(id_support);
    setError('');
    try {
      await supportApi.updateStatus(id_support, status as any, solution || undefined);
      setTickets(prev => prev.map(t =>
        (t.id_support ?? t.id_ticket) === id_support
          ? { ...t, status: status as any, solution: solution || t.solution }
          : t
      ));
      setPendingStatus(prev => { const { [id_support]: _drop, ...rest } = prev; return rest; });
    } catch {
      setError('No se pudo actualizar el estado del ticket. Solo Soporte puede solucionar tickets.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={32} /></div>;
  if (error && tickets.length === 0) return <Alert type="error" message={error} />;

  const filtered = statusFilter === 'all' ? tickets : tickets.filter(t => t.status === statusFilter);
  const pendingCount = tickets.filter(t => t.status === 'pending').length;

  return (
    <>
      {!isSupport && (
        <Alert type="info" message="Como Administrador puedes ver todos los tickets, pero solo Soporte puede solucionarlos." />
      )}
      {error && <div style={{ marginBottom: 12 }}><Alert type="error" message={error} /></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total tickets" value={tickets.length} icon="🎫" />
        <StatCard label="Pendientes" value={pendingCount} icon="⏳" accent={pendingCount > 0} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setStatusFilter('all')} style={{
          padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
          fontWeight: 600, fontSize: '0.78rem', fontFamily: 'var(--font-body)',
          background: statusFilter === 'all' ? 'var(--violet)' : 'var(--gray-100)',
          color: statusFilter === 'all' ? 'white' : 'var(--gray-600)',
        }}>
          Todos
        </button>
        {STATUS_OPTIONS.map(o => (
          <button key={o.value} onClick={() => setStatusFilter(o.value)} style={{
            padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.78rem', fontFamily: 'var(--font-body)',
            background: statusFilter === o.value ? 'var(--violet)' : 'var(--gray-100)',
            color: statusFilter === o.value ? 'white' : 'var(--gray-600)',
          }}>
            {o.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card style={{ padding: 32, textAlign: 'center', color: 'var(--gray-400)' }}>
          No hay tickets con este filtro.
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((t, i) => {
            const id = t.id_support ?? t.id_ticket ?? String(i);
            const st = STATUS_META[t.status ?? 'pending'] ?? STATUS_META.pending;
            const draftStatus = pendingStatus[id];
            const needsSolutionDraft = draftStatus === 'resolved';
            return (
              <Card key={id} style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-800)', marginBottom: 4 }}>
                      {t.subject}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginBottom: 8 }}>
                      {t.user_full_name} · {t.user_email} · {formatDate(t.date)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                      {t.message ?? t.description}
                    </div>
                    {t.solution && (
                      <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: '#f0fdf4', fontSize: '0.82rem', color: '#15803d' }}>
                        <strong>Solución de Soporte:</strong> {t.solution}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, minWidth: 180 }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
                      color: st.color, background: st.bg, whiteSpace: 'nowrap',
                    }}>
                      {st.label}
                    </span>
                    {isSupport ? (
                      <>
                        <select
                          value={draftStatus ?? t.status ?? 'pending'}
                          disabled={updatingId === id}
                          onChange={e => handleStatusSelect(id, e.target.value)}
                          style={{
                            padding: '5px 8px', borderRadius: 6, border: '1.5px solid var(--gray-200)',
                            fontSize: '0.78rem', fontFamily: 'var(--font-body)', cursor: 'pointer',
                          }}
                        >
                          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        {needsSolutionDraft && (
                          <textarea
                            placeholder="Escribe la solución del ticket (obligatorio)…"
                            value={solutionDrafts[id] ?? ''}
                            onChange={e => setSolutionDrafts(prev => ({ ...prev, [id]: e.target.value }))}
                            rows={3}
                            style={{
                              width: '100%', minWidth: 220, padding: '6px 8px', borderRadius: 6,
                              border: '1.5px solid var(--gray-200)', fontSize: '0.8rem', fontFamily: 'var(--font-body)',
                              resize: 'vertical',
                            }}
                          />
                        )}
                        {draftStatus && draftStatus !== t.status && (
                          <Btn size="sm" loading={updatingId === id} onClick={() => handleConfirmStatus(id, draftStatus)}>
                            Guardar
                          </Btn>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Solo lectura</span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Valoraciones ─────────────────────────────────────────────────────────────

function FeedbackAdminTab() {
  const { isSupport } = useAuth();
  const [items, setItems] = useState<FeedbackItemWithUser[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    feedbackApi.listAll()
      .then(({ data }) => setItems(data))
      .catch(() => setError('No se pudieron cargar las valoraciones.'))
      .finally(() => setLoading(false));
    if (isSupport) {
      feedbackApi.quickReplies().then(({ data }) => setQuickReplies(data)).catch(() => {});
    }
  };

  useEffect(load, []);

  const handleMarkReviewed = async (fb: FeedbackItemWithUser, quickReplyKey?: string) => {
    const id = fb.id_feedback!;
    const response = responseDrafts[id]?.trim();
    if (!quickReplyKey && !response) {
      setError('Debes escribir una respuesta manual (o elegir una respuesta rápida si la calificación es de 4-5 estrellas).');
      return;
    }
    setBusyId(id);
    setError('');
    try {
      const { data } = await feedbackApi.setReviewed(id, true, { response, quickReplyKey });
      setItems(prev => prev.map(f => f.id_feedback === id ? { ...f, is_reviewed: true, support_response: data.support_response } : f));
      setResponseDrafts(prev => { const { [id]: _drop, ...rest } = prev; return rest; });
    } catch {
      setError('No se pudo marcar la valoración como revisada. Solo Soporte puede hacerlo.');
    } finally {
      setBusyId(null);
    }
  };

  const handleUnmarkReviewed = async (fb: FeedbackItemWithUser) => {
    const id = fb.id_feedback!;
    setBusyId(id);
    try {
      await feedbackApi.setReviewed(id, false);
      setItems(prev => prev.map(f => f.id_feedback === id ? { ...f, is_reviewed: false } : f));
    } catch {
      setError('No se pudo actualizar el estado de revisión.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (fb: FeedbackItemWithUser) => {
    const id = fb.id_feedback!;
    if (!window.confirm('¿Eliminar esta valoración? Dejará de contar en el promedio general.')) return;
    setBusyId(id);
    try {
      await feedbackApi.remove(id);
      setItems(prev => prev.filter(f => f.id_feedback !== id));
    } catch {
      setError('No se pudo eliminar la valoración.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={32} /></div>;

  const average = items.length > 0 ? items.reduce((s, f) => s + f.rating, 0) / items.length : 0;
  const lowRatings = items.filter(f => f.rating <= 2).length;
  const pendingReview = items.filter(f => !f.is_reviewed).length;

  const filtered = items.filter(f => {
    if (filter === 'pending') return !f.is_reviewed;
    if (filter === 'reviewed') return !!f.is_reviewed;
    return true;
  });

  return (
    <>
      {!isSupport && (
        <Alert type="info" message="Como Administrador puedes ver las valoraciones, pero revisarlas y responderlas es una acción exclusiva de Soporte." />
      )}
      {error && <div style={{ marginBottom: 12 }}><Alert type="error" message={error} /></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Promedio general" value={average.toFixed(1) + ' / 5'} icon="⭐" />
        <StatCard label="Total valoraciones" value={items.length} icon="💬" />
        <StatCard label="Sin revisar" value={pendingReview} icon="🕓" accent={pendingReview > 0} />
        <StatCard label="Calificaciones bajas (≤2)" value={lowRatings} icon="⚠️" accent={lowRatings > 0} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {([
          { value: 'all', label: 'Todas' },
          { value: 'pending', label: 'Sin revisar' },
          { value: 'reviewed', label: 'Revisadas' },
        ] as const).map(o => (
          <button key={o.value} onClick={() => setFilter(o.value)} style={{
            padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.78rem', fontFamily: 'var(--font-body)',
            background: filter === o.value ? 'var(--violet)' : 'var(--gray-100)',
            color: filter === o.value ? 'white' : 'var(--gray-600)',
          }}>
            {o.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card style={{ padding: 32, textAlign: 'center', color: 'var(--gray-400)' }}>
          No hay valoraciones con este filtro.
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((f, i) => {
            const id = f.id_feedback ?? String(i);
            const isBusy = busyId === id;
            const unlocksQuickReplies = f.rating >= 4;
            return (
              <Card key={id} style={{ padding: '14px 18px', opacity: f.is_reviewed ? 0.75 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-800)' }}>
                      {f.user_full_name} <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>· {f.user_email}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>{formatDate(f.date ?? f.created_at)}</div>
                    {f.id_lexicalunit && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--violet)', marginTop: 2 }}>Valoración de una palabra puntual</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Badge label={'⭐'.repeat(f.rating) + ' ' + f.rating + '/5'} variant={f.rating <= 2 ? 'danger' : f.rating === 3 ? 'amber' : 'success'} />
                    {f.is_reviewed && <Badge label="✓ Revisada" variant="success" />}
                  </div>
                </div>
                {f.comment && (
                  <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--gray-600)' }}>{f.comment}</div>
                )}
                {f.support_response && (
                  <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--violet-light)', fontSize: '0.82rem', color: 'var(--violet)' }}>
                    <strong>Respuesta de Soporte:</strong> {f.support_response}
                  </div>
                )}

                {isSupport && !f.is_reviewed && (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea
                      placeholder="Respuesta manual para esta valoración…"
                      value={responseDrafts[id] ?? ''}
                      onChange={e => setResponseDrafts(prev => ({ ...prev, [id]: e.target.value }))}
                      rows={2}
                      style={{
                        width: '100%', padding: '6px 8px', borderRadius: 6,
                        border: '1.5px solid var(--gray-200)', fontSize: '0.8rem', fontFamily: 'var(--font-body)',
                        resize: 'vertical',
                      }}
                    />
                    {unlocksQuickReplies && quickReplies.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', alignSelf: 'center' }}>Respuestas rápidas (4-5⭐):</span>
                        {quickReplies.map(q => (
                          <button
                            key={q.key}
                            disabled={isBusy}
                            onClick={() => handleMarkReviewed(f, q.key)}
                            style={{
                              padding: '4px 10px', borderRadius: 999, border: '1.5px solid var(--violet)',
                              background: 'white', color: 'var(--violet)', fontSize: '0.72rem', fontWeight: 600,
                              cursor: isBusy ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)',
                            }}
                          >
                            {q.text.length > 40 ? q.text.slice(0, 40) + '…' : q.text}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                  {isSupport && (
                    <button
                      onClick={() => f.is_reviewed ? handleUnmarkReviewed(f) : handleMarkReviewed(f)}
                      disabled={isBusy}
                      style={{
                        padding: '5px 12px', borderRadius: 6, border: '1.5px solid var(--gray-200)',
                        background: 'white', cursor: isBusy ? 'not-allowed' : 'pointer',
                        fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-body)',
                        color: 'var(--gray-600)', opacity: isBusy ? 0.5 : 1,
                      }}
                    >
                      {f.is_reviewed ? 'Marcar como no revisada' : '✓ Marcar como revisada'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(f)}
                    disabled={isBusy}
                    style={{
                      padding: '5px 12px', borderRadius: 6, border: '1.5px solid #fecaca',
                      background: 'white', cursor: isBusy ? 'not-allowed' : 'pointer',
                      fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-body)',
                      color: '#dc2626', opacity: isBusy ? 0.5 : 1,
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function SupportDashboard() {
  const [tab, setTab] = useState<SupportTab>('tickets');
  const { isAdmin } = useAuth();

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-800)', marginBottom: 4 }}>
        Panel de Soporte
      </h1>
      <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', marginBottom: 24 }}>
        {isAdmin
          ? 'Tickets y valoraciones de todos los usuarios (solo lectura para tu rol).'
          : 'Tickets y valoraciones de todos los usuarios de la plataforma.'}
      </p>
      <TabBar active={tab} onChange={setTab} />
      {tab === 'tickets' ? <TicketsTab /> : <FeedbackAdminTab />}
    </div>
  );
}
