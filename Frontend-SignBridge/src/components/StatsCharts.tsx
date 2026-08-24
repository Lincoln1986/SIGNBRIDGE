import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import type { SystemStats } from '../api/client';

const METRIC_COLORS = {
  usuarios: '#5B4FCF',      // var(--violet)
  traducciones: '#F6A623',  // var(--amber)
  soporte: '#E5534B',
  feedback: '#27A85F',
};

// ── Comparación de métricas globales ────────────────────────────────────────

export function MetricsBarChart({ stats }: { stats: SystemStats }) {
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
        <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={56}>
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

export function RoleDistributionChart({ rows }: { rows: { role_name: string }[] }) {
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
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #EFEFF4', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }} />
        <Legend wrapperStyle={{ fontSize: '0.8rem', fontFamily: 'var(--font-body)' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Usuarios por región ──────────────────────────────────────────────────────

export function RegionDistributionChart({ rows }: { rows: { region: string | null | undefined }[] }) {
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
        <Bar dataKey="value" fill="#5B4FCF" radius={[0, 8, 8, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}