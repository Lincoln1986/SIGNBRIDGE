import { describe, expect, it } from 'vitest';
import { esYouTube, idDeYouTube, urlDeVideo, urlEmbebida } from './video';

describe('urlDeVideo', () => {
  it('should send local videos to the backend', () => {
    expect(urlDeVideo('/media/videos/hola.mp4')).toBe('http://localhost:8000/media/videos/hola.mp4');
    expect(urlDeVideo('/media/subidos/abc.webm')).toBe('http://localhost:8000/media/subidos/abc.webm');
  });

  it('should keep direct http and https links', () => {
    expect(urlDeVideo('https://cdn.example.com/a.mp4')).toBe('https://cdn.example.com/a.mp4');
    expect(urlDeVideo('http://cdn.example.com/a.mp4')).toBe('http://cdn.example.com/a.mp4');
  });

  it('should refuse any other scheme', () => {
    expect(urlDeVideo('javascript:alert(1)')).toBe('');
    expect(urlDeVideo('data:video/mp4;base64,AAAA')).toBe('');
    expect(urlDeVideo('/otra/ruta.mp4')).toBe('');
  });
});

describe('YouTube', () => {
  it.each([
    ['https://www.youtube.com/watch?v=XfeZ5MImPwo', 'XfeZ5MImPwo'],
    ['https://youtube.com/watch?feature=x&v=XfeZ5MImPwo', 'XfeZ5MImPwo'],
    ['https://youtu.be/XfeZ5MImPwo?si=abc', 'XfeZ5MImPwo'],
    ['https://youtube.com/embed/XfeZ5MImPwo', 'XfeZ5MImPwo'],
    ['https://www.youtube.com/shorts/XfeZ5MImPwo', 'XfeZ5MImPwo'],
  ])('should find the id in %s', (url, id) => {
    expect(esYouTube(url)).toBe(true);
    expect(idDeYouTube(url)).toBe(id);
    expect(urlEmbebida(url)).toBe(`https://www.youtube.com/embed/${id}`);
  });

  it('should not take other sites or local videos for YouTube', () => {
    expect(esYouTube('/media/videos/hola.mp4')).toBe(false);
    expect(esYouTube('https://notyoutube.com/watch?v=XfeZ5MImPwo')).toBe(false);
    expect(idDeYouTube('https://www.youtube.com/')).toBeNull();
    expect(urlEmbebida('https://www.youtube.com/')).toBe('');
  });
});
