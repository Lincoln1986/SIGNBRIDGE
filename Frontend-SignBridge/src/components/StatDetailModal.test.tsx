import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/client', () => ({
  statsApi: {
    misPalabras: vi.fn(),
    misCanales: vi.fn(),
    miActividad: vi.fn(),
    palabrasGlobales: vi.fn(),
    canalesGlobales: vi.fn(),
    actividadGlobal: vi.fn(),
    senasSinUsar: vi.fn(),
    resumenTickets: vi.fn(),
  },
  default: { get: vi.fn(), post: vi.fn() },
}));

import { statsApi } from '../api/client';
import { StatDetailModal } from './StatDetailModal';

const api = vi.mocked(statsApi);

beforeEach(() => {
  vi.clearAllMocks();
  // respuestas vacías por defecto: cada test puede sobreescribir la suya
  api.palabrasGlobales.mockResolvedValue({ data: [] } as never);
  api.canalesGlobales.mockResolvedValue({ data: [] } as never);
  api.actividadGlobal.mockResolvedValue({ data: [] } as never);
  api.misPalabras.mockResolvedValue({ data: [] } as never);
  api.misCanales.mockResolvedValue({ data: [] } as never);
  api.miActividad.mockResolvedValue({ data: [] } as never);
  api.senasSinUsar.mockResolvedValue({ data: [] } as never);
  api.resumenTickets.mockResolvedValue({
    data: {
      total: 3, por_estado: [], sin_resolver: 1, mas_viejo_pendiente: null,
      dias_promedio_resolucion: 2.5, resueltos_medidos: 1,
    },
  } as never);
});

describe('StatDetailModal', () => {
  it('muestra el título y la explicación de usuarios', async () => {
    render(<StatDetailModal detalle={{ tipo: 'usuarios' }} onClose={vi.fn()} />);
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Usuarios registrados');
    expect(screen.getByText(/Cuentas registradas en la plataforma/)).toBeInTheDocument();
    expect(screen.getByText(/no tiene un desglose por palabra/)).toBeInTheDocument();
  });

  it('consulta los endpoints globales por defecto', async () => {
    render(<StatDetailModal detalle={{ tipo: 'traducidas' }} onClose={vi.fn()} />);
    await waitFor(() => expect(api.palabrasGlobales).toHaveBeenCalledWith(50));
    expect(api.canalesGlobales).toHaveBeenCalled();
    expect(api.actividadGlobal).toHaveBeenCalledWith(30);
    expect(api.senasSinUsar).toHaveBeenCalled();
    expect(api.resumenTickets).toHaveBeenCalled();
    // soloMias=false nunca toca los endpoints personales
    expect(api.misPalabras).not.toHaveBeenCalled();
  });

  it('con soloMias consulta los endpoints del usuario', async () => {
    render(<StatDetailModal detalle={{ tipo: 'traducidas' }} onClose={vi.fn()} soloMias />);
    await waitFor(() => expect(api.misPalabras).toHaveBeenCalledWith(50));
    expect(api.misCanales).toHaveBeenCalled();
    expect(api.miActividad).toHaveBeenCalledWith(30);
    expect(api.palabrasGlobales).not.toHaveBeenCalled();
    expect(api.senasSinUsar).not.toHaveBeenCalled();
  });

  it('el detalle de una palabra muestra métricas y aviso de baja calificación', async () => {
    api.palabrasGlobales.mockResolvedValue({
      data: [{
        id_lexicalunit: 'lu1', word: 'casa', times_translated: 12,
        average_rating: 2, total_ratings: 4, video_url: null, total_words: 12,
      }],
    } as never);

    render(
      <StatDetailModal
        detalle={{
          tipo: 'palabra',
          palabra: {
            id_lexicalunit: 'lu1', word: 'casa', times_translated: 12,
            average_rating: 2, total_ratings: 4, video_url: null,
          },
        }}
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Seña: casa');
    expect(screen.getByText('Veces traducida')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText(/la gente la califica mal/)).toBeInTheDocument();
  });

  it('una palabra sin calificar muestra el aviso correspondiente', async () => {
    render(
      <StatDetailModal
        detalle={{
          tipo: 'palabra',
          palabra: {
            id_lexicalunit: 'lu2', word: 'perro', times_translated: 3,
            average_rating: null, total_ratings: 0, video_url: 'v.mp4',
          },
        }}
        onClose={vi.fn()}
      />
    );
    expect(await screen.findByText(/Todavía nadie calificó esta traducción/)).toBeInTheDocument();
    expect(screen.getByText('Sin calificar')).toBeInTheDocument();
    expect(screen.getByText('Asignado')).toBeInTheDocument();
  });

  it('el detalle de canal compara con los demás canales', async () => {
    api.canalesGlobales.mockResolvedValue({
      data: [
        { translation_type: 'texto', total: 40 },
        { translation_type: 'voz', total: 12 },
      ],
    } as never);

    render(
      <StatDetailModal
        detalle={{ tipo: 'canal', canal: { translation_type: 'text_to_sign', total: 40 } }}
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Canal: Texto → Señas');
    expect(screen.getByText('Comparación con los demás canales')).toBeInTheDocument();
    expect(screen.getByText('Voz → Señas')).toBeInTheDocument();
  });

  it('pluraliza la descripción del canal', async () => {
    render(
      <StatDetailModal
        detalle={{ tipo: 'canal', canal: { translation_type: 'voz', total: 1 } }}
        onClose={vi.fn()}
      />
    );
    expect(await screen.findByText(/1 traducción por/)).toBeInTheDocument();
  });

  it('muestra el desglose de tickets en soporte', async () => {
    render(<StatDetailModal detalle={{ tipo: 'soporte' }} onClose={vi.fn()} />);
    // "Sin resolver" aparece en los dos bloques de soporte del modal
    expect((await screen.findAllByText('Sin resolver')).length).toBeGreaterThan(0);
    expect(screen.getByText('2.5 d')).toBeInTheDocument();
  });

  it('cierra con Escape', async () => {
    const onClose = vi.fn();
    render(<StatDetailModal detalle={{ tipo: 'usuarios' }} onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cierra con el botón ✕', async () => {
    const onClose = vi.fn();
    render(<StatDetailModal detalle={{ tipo: 'usuarios' }} onClose={onClose} />);
    await userEvent.click(await screen.findByLabelText('Cerrar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('la pregunta inicial muestra Cargando… hasta que responde la API', () => {
    api.palabrasGlobales.mockReturnValue(new Promise(() => {}) as never);
    api.canalesGlobales.mockReturnValue(new Promise(() => {}) as never);
    api.actividadGlobal.mockReturnValue(new Promise(() => {}) as never);
    render(<StatDetailModal detalle={{ tipo: 'traducidas' }} onClose={vi.fn()} />);
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
  });
});
