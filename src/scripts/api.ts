export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  (import.meta.env.PUBLIC_API_BASE_URL as string | undefined)?.trim() ||
  'https://backend-oso-frances.onrender.com';

export const NETWORK_ERROR_MESSAGE =
  'No se pudo conectar con el backend. Si esta vivo, revisa CORS (origen del frontend) y cookies cross-site.';

const getCurrentOrigin = (): string => {
  if (typeof window === 'undefined') return 'desconocido';
  return window.location.origin;
};

export async function diagnoseBackendConnection(): Promise<string> {
  try {
    await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
    });
  } catch {
    return `No se logro conectar a ${API_BASE_URL} desde ${getCurrentOrigin()}. Revisa URL, DNS, firewall o bloqueo de red.`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
    });

    if (!response.ok) {
      return `El backend responde en /health pero con HTTP ${response.status}.`;
    }

    return `El backend responde en /health. El bloqueo esta en CORS/cookies para /api/v1/auth/* desde ${getCurrentOrigin()}.`;
  } catch {
    return `El host responde, pero el navegador bloquea la lectura por CORS en ${getCurrentOrigin()}.`;
  }
}
