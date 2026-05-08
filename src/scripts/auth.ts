import { API_BASE_URL, NETWORK_ERROR_MESSAGE, diagnoseBackendConnection } from './api';

type ApiErrorPayload = {
  detail?: string;
  message?: string;
};

type AuthResult = {
  ok: boolean;
  message?: string;
};

const isBrowser = (): boolean => typeof window !== 'undefined';

const buildErrorMessage = (status: number, payload: unknown, fallback: string): string => {
  const data = payload as ApiErrorPayload | null;
  if (data?.detail && typeof data.detail === 'string') return data.detail;
  if (data?.message && typeof data.message === 'string') return data.message;
  return `${fallback} (HTTP ${status})`;
};

const safeJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

async function postAuth(path: string, body: Record<string, unknown>, fallbackError: string): Promise<AuthResult> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const payload = await safeJson(response);
    if (!response.ok) {
      return { ok: false, message: buildErrorMessage(response.status, payload, fallbackError) };
    }

    return { ok: true };
  } catch {
    const diagnosis = await diagnoseBackendConnection();
    return { ok: false, message: `${NETWORK_ERROR_MESSAGE} ${diagnosis}` };
  }
}

export async function register(username: string, password: string): Promise<AuthResult> {
  const user = username.trim();
  if (!user || !password) return { ok: false, message: 'Usuario y contraseña son obligatorios.' };

  return postAuth(
    '/api/v1/auth/register',
    { username: user, email: user, password },
    'No se pudo crear la cuenta.'
  );
}

export async function login(username: string, password: string): Promise<AuthResult> {
  const user = username.trim();
  if (!user || !password) return { ok: false, message: 'Usuario y contraseña son obligatorios.' };

  return postAuth('/api/v1/auth/login', { username: user, email: user, password }, 'Credenciales inválidas.');
}

export async function logout(): Promise<AuthResult> {
  return postAuth('/api/v1/auth/logout', {}, 'No se pudo cerrar sesión.');
}

export async function hasActiveSession(): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/session`, {
      method: 'GET',
      credentials: 'include',
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function requireAuthOrRedirect(redirectPath = '/login'): Promise<void> {
  if (!isBrowser()) return;

  const hasSession = await hasActiveSession();
  if (!hasSession) window.location.assign(redirectPath);
}
