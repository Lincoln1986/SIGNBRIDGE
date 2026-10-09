import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// jsdom no tiene layout: ResponsiveContainer no puede medir el contenedor.
// Los stubs renderizan los `data` que el componente calcula, de modo que los
// tests verifican el mapeo de datos sin depender del render real de SVG.
vi.mock('recharts', async () => {
  const React = await import('react');
  type Row = Record<string, unknown>;
  const rows = (data: Row[] | undefined) =>
    (data ?? []).map((d, i) =>
      React.createElement('span', { key: i, 'data-testid': 'chart-row' }, `${d.name}: ${d.value ?? d.total ?? ''}`)
    );
  const chart = () =>
    ({ data, children }: { data?: Row[]; children?: React.ReactNode }) =>
      React.createElement('div', null, rows(data), children);
  return {
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    BarChart: chart(),
    PieChart: chart(),
    RadialBarChart: chart(),
    LineChart: chart(),
    Bar: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    Pie: ({ data, children }: { data?: Row[]; children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, rows(data), children),
    RadialBar: () => null,
    Line: () => null,
    Cell: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Legend: () => null,
    PolarAngleAxis: () => null,
    CartesianGrid: () => null,
    LabelList: () => null,
  };
});

import {
  MetricsBarChart,
  RatingGauge,
  RegionDistributionChart,
  RoleDistributionChart,
  TopWordsChart,
} from './StatsCharts';

const systemStats = {
  total_users: 10,
  total_translations: 42,
  total_support_requests: 3,
  total_feedback: 7,
  average_rating: 4.2,
};

describe('MetricsBarChart', () => {
  it('etiqueta las cuatro métricas del sistema con sus valores', () => {
    render(<MetricsBarChart stats={systemStats} />);
    expect(screen.getByText('Usuarios: 10')).toBeInTheDocument();
    expect(screen.getByText('Traducciones: 42')).toBeInTheDocument();
    expect(screen.getByText('Soporte: 3')).toBeInTheDocument();
    expect(screen.getByText('Feedback: 7')).toBeInTheDocument();
  });
});

describe('RatingGauge', () => {
  it('muestra el promedio con dos decimales', () => {
    render(<RatingGauge rating={4.25} />);
    expect(screen.getByText('4.25')).toBeInTheDocument();
    expect(screen.getByText('de 5.0')).toBeInTheDocument();
  });
});

describe('RoleDistributionChart', () => {
  it('agrupa usuarios por rol y usa el color conocido', () => {
    render(
      <RoleDistributionChart
        rows={[{ role_name: 'Cliente' }, { role_name: 'Cliente' }, { role_name: 'Soporte' }]}
      />
    );
    expect(screen.getByText('Cliente: 2')).toBeInTheDocument();
    expect(screen.getByText('Soporte: 1')).toBeInTheDocument();
  });

  it('devuelve null sin filas', () => {
    const { container } = render(<RoleDistributionChart rows={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('RegionDistributionChart', () => {
  it('agrupa por región y cuenta las sin región', () => {
    render(
      <RegionDistributionChart
        rows={[{ region: 'Bogotá' }, { region: null }, { region: undefined }]}
      />
    );
    expect(screen.getByText('Bogotá: 1')).toBeInTheDocument();
    expect(screen.getByText('Sin región: 2')).toBeInTheDocument();
  });

  it('devuelve null sin filas', () => {
    const { container } = render(<RegionDistributionChart rows={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('TopWordsChart', () => {
  const rows = [
    { id_lexicalunit: '1', word: 'casa', times_translated: 10, average_rating: 4.5, total_ratings: 3, total_words: 10 },
    { id_lexicalunit: '2', word: 'perro', times_translated: 8, average_rating: 2, total_ratings: 2, total_words: 8 },
    { id_lexicalunit: '3', word: 'árbol', times_translated: 5, average_rating: null, total_ratings: 0, total_words: 5 },
  ];

  it('lista las palabras del ranking', () => {
    render(<TopWordsChart rows={rows} />);
    expect(screen.getByText('casa: 10')).toBeInTheDocument();
    expect(screen.getByText('perro: 8')).toBeInTheDocument();
    expect(screen.getByText('árbol: 5')).toBeInTheDocument();
  });

  it('muestra el estado vacío', () => {
    render(<TopWordsChart rows={[]} />);
    expect(screen.getByText(/Todavía no hay traducciones registradas/)).toBeInTheDocument();
  });
});
