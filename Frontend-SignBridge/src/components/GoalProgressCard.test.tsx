import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { statsApi } from '../api/client';
import { GoalProgressCard } from './GoalProgressCard';

function progreso(extra = {}) {
  return {
    data: {
      meta: 10, total_traducciones: 23, en_ciclo_actual: 3, metas_completadas: 2,
      historial: [{ numero: 1, fecha: '2026-11-01T10:00:00Z' }, { numero: 2, fecha: null }],
      ...extra,
    },
  } as never;
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GoalProgressCard', () => {
  it('should show the cycle and the goals already reached', async () => {
    localStorage.setItem('signbridge:metas-festejadas', '2');
    vi.spyOn(statsApi, 'miProgreso').mockResolvedValue(progreso());

    render(<GoalProgressCard />);

    expect(await screen.findByText('3 / 10')).toBeInTheDocument();
    expect(screen.getByText('Te faltan 7 traducciones para la próxima meta')).toBeInTheDocument();
    expect(screen.getByText('🔥 2 metas cumplidas')).toBeInTheDocument();
    expect(screen.getByText(/Meta 1/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should invite to start when the cycle is empty', async () => {
    vi.spyOn(statsApi, 'miProgreso').mockResolvedValue(
      progreso({ en_ciclo_actual: 0, metas_completadas: 0, historial: [] })
    );

    render(<GoalProgressCard />);

    expect(await screen.findByText('Traduce 10 veces para completar tu próxima meta')).toBeInTheDocument();
  });

  it('should celebrate a new goal only once', async () => {
    vi.spyOn(statsApi, 'miProgreso').mockResolvedValue(progreso());

    render(<GoalProgressCard />);

    expect(await screen.findByRole('dialog', { name: 'Meta cumplida' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /¡Vamos!/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem('signbridge:metas-festejadas')).toBe('2');
  });

  it('should close the celebration with Escape or by itself', async () => {
    vi.spyOn(statsApi, 'miProgreso').mockResolvedValue(progreso());
    const { unmount } = render(<GoalProgressCard />);
    await screen.findByRole('dialog');

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    unmount();

    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<GoalProgressCard />);
    await screen.findByRole('dialog');
    await act(async () => { await vi.advanceTimersByTimeAsync(11_000); });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render nothing when the progress cannot be loaded', async () => {
    vi.spyOn(statsApi, 'miProgreso').mockRejectedValue(new Error('500'));

    const { container } = render(<GoalProgressCard />);

    await vi.waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('should render nothing when the answer does not have the expected shape', async () => {
    vi.spyOn(statsApi, 'miProgreso').mockResolvedValue({ data: [] } as never);

    const { container } = render(<GoalProgressCard />);

    await vi.waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
