import { afterEach, describe, expect, it, vi } from 'vitest';

// Defecto: la URL del backend estaba fija en client.ts y VITE_API_URL
// (documentada en .env.example) no se usaba. Estas pruebas cargan el cliente
// de nuevo con cada valor de la variable y revisan qué URL recibe axios.
vi.mock('axios', () => {
  const instance = { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } };
  return { default: { create: vi.fn(() => instance) } };
});

async function cargarCliente() {
  vi.resetModules();
  const { default: axios } = await import('axios');
  const { API_URL } = await import('./client');
  return { axios, API_URL };
}

describe('URL del backend', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should use VITE_API_URL when it is defined', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.signbridge.test');

    const { axios, API_URL } = await cargarCliente();

    expect(API_URL).toBe('https://api.signbridge.test');
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: 'https://api.signbridge.test' }),
    );
  });

  it('should fall back to localhost:8000 when the variable is empty', async () => {
    vi.stubEnv('VITE_API_URL', '');

    const { API_URL } = await cargarCliente();

    expect(API_URL).toBe('http://localhost:8000');
  });
});
