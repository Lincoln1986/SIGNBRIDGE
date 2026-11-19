import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignSequencePlayer, { type SignVideo } from './SignSequencePlayer';

const signs: SignVideo[] = [
  { word: 'buenas', video_url: 'https://cdn.test/buenas.mp4', found: true },
  { word: 'noches', video_url: 'https://cdn.test/noches.mp4', found: true },
  { word: 'oculto', video_url: null, found: false },
];

afterEach(() => {
  document.getElementById('yt-iframe-api')?.remove();
  // los <video> de jsdom no reproducen: silenciar la promesa rechazada
  vi.restoreAllMocks();
});

describe('SignSequencePlayer', () => {
  it('muestra el estado de carga', () => {
    render(<SignSequencePlayer signs={[]} isLoading />);
    expect(screen.getByText('Buscando señas…')).toBeInTheDocument();
  });

  it('sin señas reproducibles muestra el mensaje inicial', () => {
    render(<SignSequencePlayer signs={[]} isLoading={false} />);
    expect(screen.getByText(/Escribe texto o usa tu voz/)).toBeInTheDocument();
  });

  it('filtra las señas sin video y reproduce solo las encontradas', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    render(<SignSequencePlayer signs={signs} isLoading={false} />);

    const video = document.querySelector('video');
    expect(video).toHaveAttribute('src', 'https://cdn.test/buenas.mp4');
    // 3 señas en total pero solo 2 con video: el contador lo refleja
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    // el dot de la señal oculta no existe
    expect(screen.getByTitle('buenas')).toBeInTheDocument();
    expect(screen.getByTitle('noches')).toBeInTheDocument();
    expect(screen.queryByTitle('oculto')).not.toBeInTheDocument();
  });

  it('navega con los botones de anterior y siguiente', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    render(<SignSequencePlayer signs={signs} isLoading={false} />);

    await userEvent.click(screen.getByTitle('Seña siguiente'));
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    // en la última, siguiente vuelve al inicio (loop)
    await userEvent.click(screen.getByTitle('Seña siguiente'));
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    // desde el inicio, anterior va al final
    await userEvent.click(screen.getByTitle('Seña anterior'));
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('un clic en un dot salta a esa seña', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    render(<SignSequencePlayer signs={signs} isLoading={false} />);

    await userEvent.click(screen.getByTitle('noches'));
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('una sola señal no muestra la barra de navegación', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    render(
      <SignSequencePlayer
        signs={[{ word: 'casa', video_url: 'https://cdn.test/casa.mp4', found: true }]}
        isLoading={false}
      />
    );
    // sin barra de progreso: no hay contador ni botones de navegación
    expect(screen.queryByTitle('Seña siguiente')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Seña anterior')).not.toBeInTheDocument();
    expect(document.querySelector('video')).toHaveAttribute('src', 'https://cdn.test/casa.mp4');
  });

  it('una URL de YouTube crea el contenedor del player en vez del video', () => {
    render(
      <SignSequencePlayer
        signs={[{ word: 'hola', video_url: 'https://www.youtube.com/watch?v=abc123', found: true }]}
        isLoading={false}
      />
    );
    expect(document.querySelector('video')).not.toBeInTheDocument();
    // el contenedor de YouTube está presente (el API real no carga en jsdom)
    expect(document.getElementById('yt-iframe-api')).toBeInTheDocument();
  });
});
