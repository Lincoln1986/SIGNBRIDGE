import { useEffect, useState } from 'react';
import { statsApi } from '../api/client';
import type { TopWordRow, TranslationTypeRow, ActivityRow, UnusedSign, TicketSummary } from '../api/client';

/**
 * Panel flotante con el detalle de una métrica.
 *
 * Antes las tarjetas y las barras solo mostraban un número: no había forma de
 * saber qué palabras había detrás. Ahora se puede hacer clic en cualquiera y
 * se abre este panel con el desglose.
 */

export type DetalleMetrica =
  | { tipo: 'palabra';    palabra: TopWordRow }
  | { tipo: 'canal';      canal: TranslationTypeRow }
  | { tipo: 'traducidas'  }
  | { tipo: 'vocabulario' }
  | { tipo: 'sin-usar'    }
  | { tipo: 'promedio'    }
  // Métricas del bloque superior (Estadísticas del sistema)
  | { tipo: 'usuarios'    }
  | { tipo: 'traducciones' }
  | { tipo: 'soporte'     }
  | { tipo: 'feedback'    }
  | { tipo: 'valoracion'  };

/** Los mismos nombres que muestra la rosquilla. Sin esto el modal mostraba
 *  el valor crudo de la base, como "sign_to_text". */
const CANAL_ETIQUETAS: Record<string, string> = {
  texto:         'Texto → Señas',
  text_to_sign:  'Texto → Señas',
  voz:           'Voz → Señas',
  voice_to_sign: 'Voz → Señas',
  sena:          'Señas → Texto',
  'seña':        'Señas → Texto',
  sign_to_text:  'Señas → Texto',
};

const nombreCanal = (v: string) => CANAL_ETIQUETAS[v] ?? v;

/** Estados de ticket en español, con su color. */
const ESTADOS: Record<string, { texto: string; color: string }> = {
  pending:     { texto: 'Pendiente',  color: '#F6A623' },
  in_progress: { texto: 'En proceso', color: '#5B4FCF' },
  resolved:    { texto: 'Resuelto',   color: '#27A85F' },
  closed:      { texto: 'Cerrado',    color: '#9CA3AF' },
};

/** Estados de ticket en español, con su color. */
const ESTADO_TICKET: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Pendiente',  color: '#F6A623' },
  in_progress: { label: 'En proceso', color: '#7C3AED' },
  resolved:    { label: 'Resuelto',   color: '#27A85F' },
  closed:      { label: 'Cerrado',    color: '#6B7280' },
};

const TITULOS: Record<string, string> = {
  traducidas:   'Palabras traducidas',
  vocabulario:  'Vocabulario distinto usado',
  'sin-usar':   'Señas que nadie usó todavía',
  promedio:     'Palabras por sesión',
  usuarios:     'Usuarios registrados',
  traducciones: 'Traducciones totales',
  soporte:      'Tickets de soporte',
  feedback:     'Valoraciones recibidas',
  valoracion:   'Valoración promedio',
};

const EXPLICACIONES: Record<string, string> = {
  traducidas:   'Cada vez que alguien traduce una frase se registra una fila por cada seña encontrada. Este es el total acumulado.',
  vocabulario:  'Cuántas señas distintas del diccionario se usaron al menos una vez. Mide qué tan variado es el uso.',
  'sin-usar':   'Señas cargadas en el diccionario que nadie ha traducido nunca. Puede indicar vocabulario poco visible o poco útil.',
  promedio:     'Total de señas traducidas dividido entre la cantidad de sesiones. Indica qué tan largas son las frases que escribe la gente.',
  usuarios:     'Cuentas registradas en la plataforma, sumando los tres roles.',
  traducciones: 'Sesiones de traducción abiertas. Una sesión puede contener varias señas, por eso este número no coincide con "palabras traducidas".',
  soporte:      'Tickets abiertos por los usuarios, en cualquier estado.',
  feedback:     'Valoraciones dejadas por los usuarios, tanto de sesión como de palabra.',
  valoracion:   'Promedio de todas las estrellas recibidas. Es el indicador más directo de si la gente encuentra útiles las traducciones.',
};

/** Métricas que se explican solas y no tienen desglose por palabra. */
const SIN_DESGLOSE = new Set(['usuarios', 'feedback', 'valoracion']);

export function StatDetailModal({
  detalle,
  onClose,
  soloMias = false,
}: {
  detalle: DetalleMetrica;
  onClose: () => void;
  /** true en el panel del usuario: consulta sus datos, no los globales */
  soloMias?: boolean;
}) {
  const [palabras, setPalabras]   = useState<TopWordRow[]>([]);
  const [canales, setCanales]     = useState<TranslationTypeRow[]>([]);
  const [actividad, setActividad] = useState<ActivityRow[]>([]);
  const [sinUsar, setSinUsar]     = useState<UnusedSign[]>([]);
  const [tickets, setTickets]     = useState<TicketSummary | null>(null);
  const [cargando, setCargando]   = useState(true);

  useEffect(() => {
    const pedir = soloMias
      ? [statsApi.misPalabras(50), statsApi.misCanales(), statsApi.miActividad(30)]
      : [statsApi.palabrasGlobales(50), statsApi.canalesGlobales(), statsApi.actividadGlobal(30)];

    Promise.allSettled(pedir).then(res => {
      if (res[0].status === 'fulfilled') setPalabras((res[0].value.data as TopWordRow[]) ?? []);
      if (res[1].status === 'fulfilled') setCanales((res[1].value.data as TranslationTypeRow[]) ?? []);
      if (res[2].status === 'fulfilled') setActividad((res[2].value.data as ActivityRow[]) ?? []);
      setCargando(false);
    });

    // Las señas sin usar son lo contrario del ranking, así que necesitan su
    // propia consulta. Solo existe a nivel global (rol Administrador).
    if (!soloMias) {
      statsApi.senasSinUsar().then(r => setSinUsar(r.data)).catch(() => setSinUsar([]));
      statsApi.resumenTickets().then(r => setTickets(r.data)).catch(() => setTickets(null));
    }
  }, [soloMias]);

  // Cerrar con Escape
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const esPalabra = detalle.tipo === 'palabra';
  const esCanal   = detalle.tipo === 'canal';
  const titulo = esPalabra
    ? `Seña: ${detalle.palabra.word}`
    : esCanal
      ? `Canal: ${nombreCanal(detalle.canal.translation_type)}`
      : TITULOS[detalle.tipo] ?? 'Detalle';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 6000,
        background: 'rgba(15, 15, 25, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label={titulo}
        style={{
          width: 'min(560px, 100%)', maxHeight: 'min(80vh, 700px)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: 'var(--white)', borderRadius: 16,
          boxShadow: '0 24px 70px rgba(0,0,0,0.3)',
        }}
      >
        {/* Cabecera */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--gray-100)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12, flexShrink: 0,
        }}>
          <div>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: '1.1rem', color: 'var(--gray-800)', margin: 0,
            }}>
              {titulo}
            </h3>
            {!esPalabra && !esCanal && (
              <p style={{ fontSize: '0.82rem', color: 'var(--gray-400)', margin: '6px 0 0', lineHeight: 1.5 }}>
                {EXPLICACIONES[detalle.tipo]}
              </p>
            )}
            {esCanal && (
              <p style={{ fontSize: '0.82rem', color: 'var(--gray-400)', margin: '6px 0 0', lineHeight: 1.5 }}>
                {detalle.canal.total} traducción{detalle.canal.total !== 1 ? 'es' : ''} por
                este canal de entrada.
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              border: 'none', background: 'var(--gray-100)', cursor: 'pointer',
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              fontSize: '0.9rem', color: 'var(--gray-600)',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: 20 }}>
          {cargando && (
            <p style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.88rem' }}>
              Cargando…
            </p>
          )}

          {/* ── Detalle de una seña concreta ──────────────────────────────── */}
          {!cargando && esPalabra && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <Dato etiqueta="Veces traducida" valor={String(detalle.palabra.times_translated)} />
                <Dato
                  etiqueta="Calificación"
                  valor={detalle.palabra.average_rating != null
                    ? `${detalle.palabra.average_rating} ★`
                    : 'Sin calificar'}
                />
                <Dato etiqueta="Votos recibidos" valor={String(detalle.palabra.total_ratings)} />
                <Dato etiqueta="Video" valor={detalle.palabra.video_url ? 'Asignado' : 'Sin video'} />
              </div>

              {detalle.palabra.average_rating != null && detalle.palabra.average_rating < 3 && (
                <p style={{
                  background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
                  padding: '10px 14px', fontSize: '0.85rem', color: '#991B1B', lineHeight: 1.5,
                }}>
                  Esta seña se usa seguido pero la gente la califica mal. Conviene
                  revisar el video del diccionario.
                </p>
              )}

              {detalle.palabra.average_rating == null && (
                <p style={{
                  background: 'var(--gray-50, #F9FAFB)', border: '1px solid var(--gray-100)',
                  borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem',
                  color: 'var(--gray-600)', lineHeight: 1.5,
                }}>
                  Todavía nadie calificó esta traducción, así que no se sabe si es
                  confiable. Se puede calificar desde el Vocabulario.
                </p>
              )}
            </>
          )}

          {/* ── Canal: se muestra el reparto completo para comparar ───────── */}
          {!cargando && esCanal && (
            <>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-800)', marginBottom: 10 }}>
                Comparación con los demás canales
              </p>
              {canales.map(c => (
                <div key={c.translation_type} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '9px 0', borderBottom: '1px solid var(--gray-100)',
                  fontSize: '0.87rem',
                  fontWeight: c.translation_type === detalle.canal.translation_type ? 700 : 400,
                }}>
                  <span style={{ color: 'var(--gray-800)' }}>{nombreCanal(c.translation_type)}</span>
                  <span style={{ color: 'var(--gray-400)' }}>{c.total}</span>
                </div>
              ))}
            </>
          )}

          {/* ── Métricas que se explican solas, sin listado ───────────────── */}
          {!cargando && SIN_DESGLOSE.has(detalle.tipo) && (
            <p style={{ color: 'var(--gray-400)', fontSize: '0.87rem', lineHeight: 1.6, margin: 0 }}>
              Esta métrica no tiene un desglose por palabra. Para ver el detalle
              de usuarios entrá a la pestaña <strong>Usuarios</strong>, y para los
              tickets y valoraciones, al <strong>Panel de Soporte</strong>.
            </p>
          )}

          {/* ── Tickets: desglose por estado, el más viejo y el promedio ──── */}
          {!cargando && detalle.tipo === 'soporte' && (
            tickets ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                  <Dato etiqueta="Sin resolver" valor={String(tickets.sin_resolver)} />
                  <Dato
                    etiqueta="Días promedio"
                    valor={tickets.dias_promedio_resolucion != null
                      ? `${tickets.dias_promedio_resolucion} d`
                      : '—'}
                  />
                </div>

                {tickets.mas_viejo_pendiente && (
                  <div style={{
                    background: tickets.mas_viejo_pendiente.dias > 7 ? '#FEF2F2' : 'var(--gray-50, #F9FAFB)',
                    border: `1px solid ${tickets.mas_viejo_pendiente.dias > 7 ? '#FECACA' : 'var(--gray-100)'}`,
                    borderRadius: 10, padding: '12px 14px', marginBottom: 18,
                  }}>
                    <p style={{
                      fontSize: '0.72rem', fontWeight: 700, margin: 0,
                      color: tickets.mas_viejo_pendiente.dias > 7 ? '#991B1B' : 'var(--gray-400)',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      El que más lleva esperando
                    </p>
                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--gray-800)', margin: '4px 0 2px' }}>
                      {tickets.mas_viejo_pendiente.subject}
                    </p>
                    <p style={{
                      fontSize: '0.83rem', margin: 0,
                      color: tickets.mas_viejo_pendiente.dias > 7 ? '#991B1B' : 'var(--gray-600)',
                    }}>
                      {tickets.mas_viejo_pendiente.dias} día{tickets.mas_viejo_pendiente.dias !== 1 ? 's' : ''} sin resolver
                      {tickets.mas_viejo_pendiente.dias > 7 && ' — conviene priorizarlo'}
                    </p>
                  </div>
                )}

                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-800)', marginBottom: 10 }}>
                  Por estado
                </p>
                {tickets.por_estado.map(e => {
                  const info = ESTADO_TICKET[e.status] ?? { label: e.status, color: '#6B7280' };
                  return (
                    <div key={e.status} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 12, padding: '9px 0', borderBottom: '1px solid var(--gray-100)',
                      fontSize: '0.88rem',
                    }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--gray-800)' }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: info.color }} />
                        {info.label}
                      </span>
                      <span style={{ color: 'var(--gray-400)', fontWeight: 600 }}>{e.total}</span>
                    </div>
                  );
                })}

                {tickets.resueltos_medidos > 0 && (
                  <p style={{ fontSize: '0.76rem', color: 'var(--gray-400)', marginTop: 14, lineHeight: 1.5 }}>
                    El promedio se calcula sobre {tickets.resueltos_medidos} ticket
                    {tickets.resueltos_medidos !== 1 ? 's' : ''} resuelto
                    {tickets.resueltos_medidos !== 1 ? 's' : ''}, entre la fecha de
                    creación y la última actualización.
                  </p>
                )}
              </>
            ) : (
              <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem', textAlign: 'center' }}>
                No se pudo cargar el detalle de tickets.
              </p>
            )
          )}

          {/* ── Estado del soporte ────────────────────────────────────────── */}
          {!cargando && detalle.tipo === 'soporte' && (
            tickets ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                  <Dato etiqueta="Sin resolver" valor={String(tickets.sin_resolver)} />
                  <Dato
                    etiqueta="Resolución promedio"
                    valor={tickets.dias_promedio_resolucion != null
                      ? `${tickets.dias_promedio_resolucion} días`
                      : 'Sin datos'}
                  />
                </div>

                {tickets.dias_promedio_resolucion != null && (
                  <p style={{ fontSize: '0.76rem', color: 'var(--gray-400)',
                              margin: '-8px 0 18px', lineHeight: 1.5 }}>
                    Calculado sobre {tickets.resueltos_medidos} ticket
                    {tickets.resueltos_medidos !== 1 ? 's' : ''} resuelto
                    {tickets.resueltos_medidos !== 1 ? 's' : ''}, entre su creación y
                    su última actualización.
                  </p>
                )}

                {/* El pendiente más viejo: la señal más directa de que algo
                    se está quedando atrás */}
                {tickets.mas_viejo_pendiente && (
                  <div style={{
                    background: tickets.mas_viejo_pendiente.dias > 7 ? '#FEF2F2' : 'var(--gray-50, #F9FAFB)',
                    border: `1px solid ${tickets.mas_viejo_pendiente.dias > 7 ? '#FECACA' : 'var(--gray-100)'}`,
                    borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                  }}>
                    <p style={{
                      fontSize: '0.72rem', fontWeight: 700, margin: 0,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      color: tickets.mas_viejo_pendiente.dias > 7 ? '#991B1B' : 'var(--gray-400)',
                    }}>
                      Pendiente más antiguo
                    </p>
                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--gray-800)', margin: '4px 0 2px' }}>
                      {tickets.mas_viejo_pendiente.subject}
                    </p>
                    <p style={{
                      fontSize: '0.83rem', margin: 0,
                      color: tickets.mas_viejo_pendiente.dias > 7 ? '#991B1B' : 'var(--gray-600)',
                    }}>
                      Lleva <strong>{tickets.mas_viejo_pendiente.dias} día
                      {tickets.mas_viejo_pendiente.dias !== 1 ? 's' : ''}</strong> esperando
                      · {ESTADOS[tickets.mas_viejo_pendiente.status]?.texto ?? tickets.mas_viejo_pendiente.status}
                    </p>
                  </div>
                )}

                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-800)', marginBottom: 10 }}>
                  Reparto por estado
                </p>
                {tickets.por_estado.map(e => {
                  const info = ESTADOS[e.status];
                  const pct = tickets.total ? Math.round((e.total / tickets.total) * 100) : 0;
                  return (
                    <div key={e.status} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between',
                                    fontSize: '0.85rem', marginBottom: 4 }}>
                        <span style={{ color: 'var(--gray-800)', fontWeight: 600 }}>
                          {info?.texto ?? e.status}
                        </span>
                        <span style={{ color: 'var(--gray-400)' }}>{e.total} · {pct}%</span>
                      </div>
                      <div style={{ height: 7, borderRadius: 20, background: 'var(--gray-100)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%', borderRadius: 20,
                          background: info?.color ?? '#9CA3AF',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem', textAlign: 'center' }}>
                No se pudo cargar el estado del soporte.
              </p>
            )
          )}

          {/* ── Señas que nadie usó: listado propio ───────────────────────── */}
          {!cargando && detalle.tipo === 'sin-usar' && (
            <>
              {sinUsar.length === 0 ? (
                <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem', textAlign: 'center' }}>
                  Todas las señas del diccionario se usaron al menos una vez.
                </p>
              ) : sinUsar.map(p => (
                <div key={p.id_lexicalunit} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 12, padding: '10px 0', borderBottom: '1px solid var(--gray-100)',
                }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--gray-800)' }}>
                    {p.word}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                    {p.video_url ? 'Con video' : 'Sin video'}
                  </span>
                </div>
              ))}
            </>
          )}

          {/* ── Listado de palabras detrás de la métrica ──────────────────── */}
          {!cargando && !esPalabra && !esCanal && detalle.tipo !== 'sin-usar' && detalle.tipo !== 'soporte' && !SIN_DESGLOSE.has(detalle.tipo) && detalle.tipo !== 'promedio' && (
            <>
              {palabras.length === 0 && (
                <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem', textAlign: 'center' }}>
                  Todavía no hay datos.
                </p>
              )}
              {palabras.map(p => (
                <div
                  key={p.id_lexicalunit}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 12, padding: '10px 0', borderBottom: '1px solid var(--gray-100)',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--gray-800)' }}>
                    {p.word}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                    {p.times_translated}×
                    {p.average_rating != null && ` · ${p.average_rating} ★`}
                  </span>
                </div>
              ))}
            </>
          )}

          {/* ── Palabras por sesión: se explica con el reparto por canal ──── */}
          {!cargando && detalle.tipo === 'promedio' && (
            <>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-800)', marginBottom: 10 }}>
                Traducciones por canal
              </p>
              {canales.map(c => (
                <div key={c.translation_type} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid var(--gray-100)',
                  fontSize: '0.87rem',
                }}>
                  <span style={{ color: 'var(--gray-800)' }}>{nombreCanal(c.translation_type)}</span>
                  <span style={{ color: 'var(--gray-400)' }}>{c.total}</span>
                </div>
              ))}

              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-800)', margin: '18px 0 10px' }}>
                Últimos días con actividad
              </p>
              {actividad.slice(-10).reverse().map(a => (
                <div key={a.day} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid var(--gray-100)',
                  fontSize: '0.87rem',
                }}>
                  <span style={{ color: 'var(--gray-800)' }}>{a.day}</span>
                  <span style={{ color: 'var(--gray-400)' }}>
                    {a.total} traducción{a.total !== 1 ? 'es' : ''}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div style={{ background: 'var(--gray-50, #F9FAFB)', borderRadius: 10, padding: '10px 14px' }}>
      <p style={{ fontSize: '0.72rem', color: 'var(--gray-400)', margin: 0, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {etiqueta}
      </p>
      <p style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--gray-800)', margin: '2px 0 0' }}>
        {valor}
      </p>
    </div>
  );
}
