import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  RadialBarChart, RadialBar, PolarAngleAxis,
  LineChart, Line, CartesianGrid, LabelList,
} from 'recharts';
import type { SystemStats, TopWordRow, TranslationTypeRow, ActivityRow } from '../api/client';

const METRIC_COLORS = {
  usuarios: '#5B4FCF',      // var(--violet)
  traducciones: '#F6A623',  // var(--amber)
  soporte: '#E5534B',
  feedback: '#27A85F',
};

// ── Comparación de métricas globales ────────────────────────────────────────

export function MetricsBarChart({
  stats,
  onSelect,
}: {
  stats: SystemStats;
  onSelect?: (metrica: string) => void;
}) {
  const data = [
    { name: 'Usuarios', value: stats.total_users, fill: METRIC_COLORS.usuarios },
    { name: 'Traducciones', value: stats.total_translations, fill: METRIC_COLORS.traducciones },
    { name: 'Soporte', value: stats.total_support_requests, fill: METRIC_COLORS.soporte },
    { name: 'Feedback', value: stats.total_feedback, fill: METRIC_COLORS.feedback },
  ];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8B8B9E' }} axisLine={{ stroke: '#EFEFF4' }} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#8B8B9E' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'rgba(91,79,207,0.06)' }}
          contentStyle={{ borderRadius: 10, border: '1px solid #EFEFF4', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}
        />
        <Bar
          dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={56}
          cursor={onSelect ? 'pointer' : undefined}
          onClick={(d: { payload?: { name?: string } }) => {
            if (onSelect && d?.payload?.name) onSelect(d.payload.name);
          }}
        >
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Gauge de valoración promedio ────────────────────────────────────────────

export function RatingGauge({ rating }: { rating: number }) {
  const pct = (rating / 5) * 100;
  const data = [{ name: 'rating', value: pct, fill: '#F6A623' }];

  return (
    <div style={{ position: 'relative', width: '100%', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="72%" outerRadius="100%"
          data={data} startAngle={90} endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar dataKey="value" cornerRadius={12} background={{ fill: '#EFEFF4' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--gray-800)' }}>
          {rating.toFixed(2)}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>de 5.0</div>
      </div>
    </div>
  );
}

// ── Distribución de usuarios por rol ────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  administrador: '#E5534B',
  soporte: '#F6A623',
  cliente: '#5B4FCF',
};

export function RoleDistributionChart({
  rows,
  onSelect,
}: {
  rows: { role_name: string }[];
  onSelect?: (rol: string) => void;
}) {
  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.role_name] = (acc[r.role_name] ?? 0) + 1;
    return acc;
  }, {});   
  const data = Object.entries(counts).map(([name, value]) => ({
    name, value, fill: ROLE_COLORS[name.toLowerCase()] ?? '#8B8B9E',
  }));

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
             innerRadius={50} outerRadius={78} paddingAngle={3}
             cursor={onSelect ? 'pointer' : undefined}
             onClick={(d: { payload?: { name?: string } }) => {
               if (onSelect && d?.payload?.name) onSelect(d.payload.name);
             }}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #EFEFF4', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }} />
        <Legend wrapperStyle={{ fontSize: '0.8rem', fontFamily: 'var(--font-body)' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Usuarios por región ──────────────────────────────────────────────────────

export function RegionDistributionChart({
  rows,
  onSelect,
}: {
  rows: { region?: string | null }[];
  onSelect?: (region: string) => void;
}) {
  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    const key = r.region || 'Sin región';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const data = Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <XAxis type="number" tick={{ fontSize: 12, fill: '#8B8B9E' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: '#8B8B9E' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #EFEFF4', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }} />
        <Bar
          dataKey="value" fill="#5B4FCF" radius={[0, 8, 8, 0]} maxBarSize={22}
          cursor={onSelect ? 'pointer' : undefined}
          onClick={(d: { payload?: { name?: string } }) => {
            if (onSelect && d?.payload?.name) onSelect(d.payload.name);
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// Estadísticas de interacción con el software
// ═══════════════════════════════════════════════════════════════════════════

const CANAL_ETIQUETAS: Record<string, string> = {
  texto:         'Texto → Señas',
  text_to_sign:  'Texto → Señas',
  voz:           'Voz → Señas',
  voice_to_sign: 'Voz → Señas',
  sena:          'Señas → Texto',
  'seña':        'Señas → Texto',
  sign_to_text:  'Señas → Texto',
};

const CANAL_COLORES = ['#5B4FCF', '#F6A623', '#27A85F', '#E5534B'];

/** Color de la barra según qué tan bien calificada está la traducción. */
function colorPorRating(rating?: number | null): string {
  if (rating == null) return '#8B5CF6';   // violeta: usada pero aún sin calificar
  if (rating >= 4) return '#27A85F';      // verde: traducción confiable
  if (rating >= 3) return '#F6A623';      // ámbar: revisar
  return '#E5534B';                       // rojo: mal calificada, urge revisar
}

/**
 * Ranking horizontal de las señas más traducidas.
 * El color de cada barra codifica su calificación promedio, así se ve de un
 * vistazo qué palabras se usan mucho pero están mal traducidas.
 */
export function TopWordsChart({
  rows,
  onSelect,
}: {
  rows: TopWordRow[];
  /** Si se pasa, cada barra se vuelve clicable y devuelve la palabra */
  onSelect?: (fila: TopWordRow) => void;
}) {
  if (!rows.length) {
    return (
      <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', textAlign: 'center', padding: '28px 0' }}>
        Todavía no hay traducciones registradas.
      </p>
    );
  }

  const data = rows.map(r => ({
    name: r.word,
    total: r.times_translated,
    rating: r.average_rating,
    votos: r.total_ratings,
    fila: r,
  }));

  return (
    <>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 42, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="name" width={110}
                 tick={{ fontSize: 12, fontWeight: 600 }} />
          <Tooltip
            formatter={(value, _name, item) => {
              const p = (item as { payload?: { rating?: number | null; votos?: number } })?.payload;
              const r = p?.rating;
              const votos = p?.votos ?? 0;
              const nota = r == null ? 'sin calificar' : `${r} ★ (${votos} voto${votos === 1 ? '' : 's'})`;
              return [`${Number(value)} traducción(es) — ${nota}`, 'Uso'];
            }}
          />
          <Bar
            dataKey="total" radius={[0, 6, 6, 0]} barSize={22}
            cursor={onSelect ? 'pointer' : undefined}
            onClick={(d: { payload?: { fila?: TopWordRow } }) => {
              if (onSelect && d?.payload?.fila) onSelect(d.payload.fila);
            }}
          >
            {data.map((d, i) => <Cell key={i} fill={colorPorRating(d.rating)} />)}
            <LabelList dataKey="total" position="right"
                       style={{ fontSize: 12, fontWeight: 700, fill: 'var(--gray-800)' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {onSelect && (
        <p style={{ fontSize: '0.76rem', color: 'var(--gray-400)', textAlign: 'center', margin: '2px 0 8px' }}>
          Tocá una barra para ver el detalle de esa seña
        </p>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center',
                    fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 4 }}>
        {[['#27A85F', 'Bien calificada (4-5★)'],
          ['#F6A623', 'Regular (3★)'],
          ['#E5534B', 'Mal calificada (<3★)'],
          ['#8B5CF6', 'Sin calificar']].map(([c, txt]) => (
          <span key={txt} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: c, display: 'inline-block' }} />
            {txt}
          </span>
        ))}
      </div>
    </>
  );
}

/** Reparto de traducciones por canal de entrada: texto, voz o cámara. */
export function ChannelUsageChart({
  rows,
  onSelect,
}: {
  rows: TranslationTypeRow[];
  /** Si se pasa, cada porción se vuelve clicable */
  onSelect?: (fila: TranslationTypeRow) => void;
}) {
  if (!rows.length) {
    return (
      <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', textAlign: 'center', padding: '28px 0' }}>
        Sin datos de uso todavía.
      </p>
    );
  }

  const data = rows.map(r => ({
    name: CANAL_ETIQUETAS[r.translation_type] ?? r.translation_type,
    value: r.total,
    fila: r,
  }));

  return (
    <ResponsiveContainer width="100%" height={230}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name"
             innerRadius={52} outerRadius={82} paddingAngle={3}
             cursor={onSelect ? 'pointer' : undefined}
             onClick={(d: { payload?: { fila?: TranslationTypeRow } }) => {
               if (onSelect && d?.payload?.fila) onSelect(d.payload.fila);
             }}
             label={(e: { percent?: number }) => `${Math.round((e.percent ?? 0) * 100)}%`}
             labelLine={false}
             style={{ fontSize: 11, fontWeight: 600 }}>
          {data.map((_, i) => <Cell key={i} fill={CANAL_COLORES[i % CANAL_COLORES.length]} />)}
        </Pie>
        <Tooltip formatter={(v, name) => [`${Number(v)} traducción(es)`, String(name)]} />
        <Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: '0.8rem' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Evolución del uso: cuántas traducciones se hicieron cada día. */
export function ActivityChart({ rows }: { rows: ActivityRow[] }) {
  if (!rows.length) {
    return (
      <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', textAlign: 'center', padding: '28px 0' }}>
        Sin actividad en el período seleccionado.
      </p>
    );
  }

  const data = rows.map(r => ({
    // Mostrar solo día/mes para que el eje no se amontone
    name: r.day.slice(5).replace('-', '/'),
    total: r.total,
  }));

  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => [`${Number(v)} traducción(es)`, 'Total']} />
        <Line type="monotone" dataKey="total" stroke="#5B4FCF" strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}


/**
 * Comparativa de las métricas personales del usuario.
 * Es el equivalente de MetricsBarChart del panel de administración, pero con
 * los números propios en lugar de los globales.
 */
export function UserMetricsChart({
  traducciones, favoritas, tickets, valoraciones,
}: {
  traducciones: number; favoritas: number; tickets: number; valoraciones: number;
}) {
  const data = [
    { name: 'Traducciones', value: traducciones, fill: METRIC_COLORS.traducciones },
    { name: 'Favoritas',    value: favoritas,    fill: '#8B5CF6' },
    { name: 'Soporte',      value: tickets,      fill: METRIC_COLORS.soporte },
    { name: 'Valoraciones', value: valoraciones, fill: METRIC_COLORS.feedback },
  ];

  if (data.every(d => !d.value)) {
    return (
      <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', textAlign: 'center', padding: '28px 0' }}>
        Todavía no hay actividad para comparar.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
