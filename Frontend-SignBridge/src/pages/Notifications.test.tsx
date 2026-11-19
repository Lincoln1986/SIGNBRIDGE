import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/client', () => ({
  notificationsApi: {
    list: vi.fn(),
    unreadCount: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    remove: vi.fn(),
  },
  default: { get: vi.fn(), post: vi.fn() },
}));

import { notificationsApi } from '../api/client';
import Notifications from './Notifications';

const api = vi.mocked(notificationsApi);

const avisos = [
  { id_notification: 'n1', type: 'ticket_resolved', title: 'Mi ticket quedó resuelto', body: 'Se solucionó', read_at: null, created_at: '2026-10-01T10:00:00Z' },
  { id_notification: 'n2', type: 'feedback_answered', title: 'Respondieron tu valoración', body: null, read_at: '2026-10-02T10:00:00Z', created_at: '2026-10-02T10:00:00Z' },
];

beforeEach(() => {
  vi.clearAllMocks();
  api.list.mockResolvedValue({ data: avisos } as never);
  api.markRead.mockResolvedValue({ data: {} } as never);
  api.markAllRead.mockResolvedValue({ data: {} } as never);
  api.remove.mockResolvedValue({ data: {} } as never);
});

describe('Notifications', () => {
  it('carga y lista los avisos con su etiqueta', async () => {
    render(<Notifications />);
    expect(await screen.findByText('Mi ticket quedó resuelto')).toBeInTheDocument();
    expect(screen.getByText('Respuesta a tu valoración')).toBeInTheDocument();
    expect(screen.getByText('Se solucionó')).toBeInTheDocument();
    expect(api.list).toHaveBeenCalledWith(false, 100);
  });

  it('muestra el contador de no leídas en el encabezado', async () => {
    render(<Notifications />);
    expect(await screen.findByText('1 sin leer')).toBeInTheDocument();
  });

  it('filtra solo los no leídos', async () => {
    render(<Notifications />);
    await screen.findByText('Mi ticket quedó resuelto');

    await userEvent.click(screen.getByRole('button', { name: 'Sin leer' }));
    expect(screen.getByText('Mi ticket quedó resuelto')).toBeInTheDocument();
    expect(screen.queryByText('Respondieron tu valoración')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Todas' }));
    expect(screen.getByText('Respondieron tu valoración')).toBeInTheDocument();
  });

  it('marca una notificación como leída', async () => {
    render(<Notifications />);
    await screen.findByText('Mi ticket quedó resuelto');

    await userEvent.click(screen.getByRole('button', { name: /Marcar como leída/ }));
    await waitFor(() => expect(api.markRead).toHaveBeenCalledWith('n1'));
    // tras marcarse ya no ofrece marcarla de nuevo
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Marcar como leída/ })).not.toBeInTheDocument()
    );
  });

  it('marca todas como leídas', async () => {
    render(<Notifications />);
    await screen.findByText('Mi ticket quedó resuelto');

    await userEvent.click(screen.getByRole('button', { name: 'Marcar todas como leídas' }));
    await waitFor(() => expect(api.markAllRead).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByText('1 sin leer')).not.toBeInTheDocument()
    );
  });

  it('elimina un aviso de la lista', async () => {
    render(<Notifications />);
    await screen.findByText('Mi ticket quedó resuelto');

    const botones = screen.getAllByRole('button', { name: 'Eliminar' });
    await userEvent.click(botones[0]);
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith('n1'));
    await waitFor(() => expect(screen.queryByText('Mi ticket quedó resuelto')).not.toBeInTheDocument());
  });

  it('muestra el estado vacío cuando no hay avisos', async () => {
    api.list.mockResolvedValue({ data: [] } as never);
    render(<Notifications />);
    expect(await screen.findByText('Todavía no tenés notificaciones.')).toBeInTheDocument();
  });

  it('muestra el mensaje específico al filtrar no leídos sin resultados', async () => {
    api.list.mockResolvedValue({ data: [avisos[1]] } as never);
    render(<Notifications />);
    await screen.findByText('Respondieron tu valoración');

    await userEvent.click(screen.getByRole('button', { name: 'Sin leer' }));
    expect(screen.getByText('No tenés notificaciones sin leer.')).toBeInTheDocument();
  });

  it('muestra error si la petición falla', async () => {
    api.list.mockRejectedValue(new Error('red caída'));
    render(<Notifications />);
    expect(await screen.findByText('No se pudieron cargar las notificaciones.')).toBeInTheDocument();
  });
});
