import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

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
import { NotificationBell } from './NotificationBell';

const renderBell = () =>
  render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>
  );

const unreadCount = vi.mocked(notificationsApi.unreadCount);
const list = vi.mocked(notificationsApi.list);
const markRead = vi.mocked(notificationsApi.markRead);
const markAllRead = vi.mocked(notificationsApi.markAllRead);

beforeEach(() => {
  vi.clearAllMocks();
  unreadCount.mockResolvedValue({ data: { unread: 2 } } as never);
  list.mockResolvedValue({ data: [] } as never);
  markRead.mockResolvedValue({ data: {} } as never);
  markAllRead.mockResolvedValue({ data: { unread: 0 } } as never);
});

describe('NotificationBell', () => {
  it('muestra el contador de no leídas', async () => {
    renderBell();
    expect(await screen.findByLabelText('Notificaciones, 2 sin leer')).toBeInTheDocument();
    expect(unreadCount).toHaveBeenCalled();
  });

  it('sin no leídas no muestra insignia', async () => {
    unreadCount.mockResolvedValue({ data: { unread: 0 } } as never);
    renderBell();
    expect(await screen.findByLabelText('Notificaciones')).toBeInTheDocument();
  });

  it('abre el panel y muestra los avisos', async () => {
    list.mockResolvedValue({
      data: [{
        id_notification: 'n1',
        type: 'ticket_resolved',
        title: 'Ticket resuelto',
        body: 'Se solucionó tu problema',
        read_at: null,
        created_at: new Date().toISOString(),
      }],
    } as never);

    renderBell();
    await userEvent.click(await screen.findByLabelText('Notificaciones, 2 sin leer'));

    expect(await screen.findByText('Ticket resuelto')).toBeInTheDocument();
    expect(screen.getByText('recién')).toBeInTheDocument();
    expect(screen.getByText('Se solucionó tu problema')).toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay avisos', async () => {
    renderBell();
    await userEvent.click(await screen.findByLabelText('Notificaciones, 2 sin leer'));
    expect(await screen.findByText(/No tenés notificaciones todavía/)).toBeInTheDocument();
  });

  it('marca todas como leídas', async () => {
    list.mockResolvedValue({
      data: [{ id_notification: 'n1', type: 'ticket_resolved', title: 'Aviso', read_at: null }],
    } as never);

    renderBell();
    await userEvent.click(await screen.findByLabelText('Notificaciones, 2 sin leer'));
    await userEvent.click(await screen.findByText('Marcar todas como leídas'));

    await waitFor(() => expect(markAllRead).toHaveBeenCalled());
    // el contador baja a 0: la campana deja de anunciar "2 sin leer"
    await waitFor(() =>
      expect(screen.queryByLabelText('Notificaciones, 2 sin leer')).not.toBeInTheDocument()
    );
  });

  it('un aviso sin leer se marca al hacer clic', async () => {
    list.mockResolvedValue({
      data: [{ id_notification: 'n1', type: 'feedback_answered', title: 'Respuesta', read_at: null }],
    } as never);

    renderBell();
    await userEvent.click(await screen.findByLabelText('Notificaciones, 2 sin leer'));
    await userEvent.click(await screen.findByText('Respuesta'));

    await waitFor(() => expect(markRead).toHaveBeenCalledWith('n1'));
  });

  it('un aviso ya leído no vuelve a llammar markRead', async () => {
    list.mockResolvedValue({
      data: [{ id_notification: 'n2', type: 'otro', title: 'Leído', read_at: '2026-01-01T00:00:00Z' }],
    } as never);

    renderBell();
    await userEvent.click(await screen.findByLabelText('Notificaciones, 2 sin leer'));
    await userEvent.click(await screen.findByText('Leído'));
    expect(markRead).not.toHaveBeenCalled();
  });

  it('el panel se cierra con Escape', async () => {
    renderBell();
    await userEvent.click(await screen.findByLabelText('Notificaciones, 2 sin leer'));
    expect(screen.getByRole('dialog', { name: 'Notificaciones' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Notificaciones' })).not.toBeInTheDocument()
    );
  });

  it('no rompe el menú si el contador falla', async () => {
    unreadCount.mockRejectedValue(new Error('red caída'));
    renderBell();
    expect(await screen.findByLabelText('Notificaciones')).toBeInTheDocument();
  });
});
