// Autor: @Lincoln1986 · S3 (Front: página Vocabulario / Diccionario LSC)
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardApi, favoritesApi } from '../api/client';
import Vocabulary from './Vocabulary';

const fecha = '2026-10-01T00:00:00';
const PALABRAS = [
  { id_lexicalunit: 'u1', text: 'Hola', language: 'es_Co', created_at: fecha, updated_at: fecha, video_url: 'https://youtu.be/abc123' },
  { id_lexicalunit: 'u2', text: 'Gracias', language: 'es_Co', created_at: fecha, updated_at: fecha, video_url: 'https://cdn.example.com/gracias.mp4' },
  { id_lexicalunit: 'u3', text: 'Familia', language: 'es_Co', created_at: fecha, updated_at: fecha },
];

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(dashboardApi, 'lexicalUnits').mockResolvedValue({ data: PALABRAS } as never);
  vi.spyOn(favoritesApi, 'list').mockResolvedValue({ data: [] } as never);
});

const palabrasVisibles = () =>
  ['Hola', 'Gracias', 'Familia'].filter(p => screen.queryByText(p, { selector: 'div' }));

describe('Vocabulario', () => {
  it('should list every word with its counters', async () => {
    render(<Vocabulary />);

    expect(await screen.findByText('3 palabras')).toBeInTheDocument();
    expect(screen.getByText('2 con video')).toBeInTheDocument();
    expect(palabrasVisibles()).toEqual(['Hola', 'Gracias', 'Familia']);
  });

  it('should filter while the person types, ignoring upper and lower case', async () => {
    render(<Vocabulary />);
    await screen.findByText('3 palabras');

    await userEvent.type(screen.getByPlaceholderText('Buscar palabra...'), 'GRA');

    expect(palabrasVisibles()).toEqual(['Gracias']);
    expect(screen.getByText('1 palabras')).toBeInTheDocument();
  });

  it('should show an empty state when nothing matches', async () => {
    render(<Vocabulary />);
    await screen.findByText('3 palabras');

    await userEvent.type(screen.getByPlaceholderText('Buscar palabra...'), 'zzz');

    expect(screen.getByText('No se encontraron palabras con los filtros actuales.')).toBeInTheDocument();
  });

  it('should filter by the letter of the alphabet and by video', async () => {
    render(<Vocabulary />);
    await screen.findByText('3 palabras');

    await userEvent.click(screen.getByRole('button', { name: 'F' }));
    expect(palabrasVisibles()).toEqual(['Familia']);

    await userEvent.click(screen.getAllByRole('button', { name: 'Todos' })[1]); // quita la letra
    await userEvent.click(screen.getByRole('button', { name: 'Con video' }));
    expect(palabrasVisibles()).toEqual(['Hola', 'Gracias']);
  });

  it('should show an error when the dictionary cannot be loaded', async () => {
    vi.spyOn(dashboardApi, 'lexicalUnits').mockRejectedValue(new Error('500'));
    render(<Vocabulary />);

    expect(await screen.findByText('No se pudo cargar el vocabulario')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Buscar palabra...')).not.toBeInTheDocument();
  });

  it('should mark a word as favorite and confirm it', async () => {
    const toggle = vi.spyOn(favoritesApi, 'toggle').mockResolvedValue({ data: { action: 'added', id_favorite: 'f1' } } as never);
    render(<Vocabulary />);
    await screen.findByText('3 palabras');

    await userEvent.click(screen.getAllByTitle('Agregar a favoritos')[0]);

    expect(toggle).toHaveBeenCalledWith('u1');
    expect(await screen.findByText('¡Agregado a favoritos!')).toBeInTheDocument();
    expect(screen.getAllByTitle('Quitar de favoritos')).toHaveLength(1);
  });

  it('should undo the star when saving the favorite fails', async () => {
    vi.spyOn(favoritesApi, 'toggle').mockRejectedValue(new Error('sin red'));
    render(<Vocabulary />);
    await screen.findByText('3 palabras');

    await userEvent.click(screen.getAllByTitle('Agregar a favoritos')[0]);

    expect(await screen.findByText('Error al actualizar favorito')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryAllByTitle('Quitar de favoritos')).toHaveLength(0));
  });

  it('should open the YouTube video of the sign and close it with Escape', async () => {
    render(<Vocabulary />);
    await screen.findByText('3 palabras');

    await userEvent.click(screen.getAllByRole('button', { name: /Ver seña/ })[0]);

    expect(screen.getByRole('button', { name: 'Cerrar video' })).toBeInTheDocument();
    // El enlace corto youtu.be se convierte al formato embed para el iframe
    expect(document.querySelector('iframe')?.getAttribute('src')).toBe('https://www.youtube.com/embed/abc123?autoplay=1');

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: 'Cerrar video' })).not.toBeInTheDocument();
  });
});
