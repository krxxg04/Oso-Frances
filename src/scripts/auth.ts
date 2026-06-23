import { API_BASE_URL, NETWORK_ERROR_MESSAGE, diagnoseBackendConnection } from './api';

type ApiErrorPayload = {
  detail?: string | Array<{ msg?: string } | string>;
  message?: string;
  error?: string | { code?: string; message?: string; field?: string };
};

type AuthResult = {
  ok: boolean;
  message?: string;
};

const isBrowser = (): boolean => typeof window !== 'undefined';

const buildErrorMessage = (status: number, payload: unknown, fallback: string): string => {
  const data = payload as ApiErrorPayload | null;

  if (Array.isArray(data?.detail)) {
    const first = data.detail[0];
    if (typeof first === 'string') return first;
    if (first?.msg) return first.msg;
  }

  if (data?.detail && typeof data.detail === 'string') return data.detail;
  if (data?.message && typeof data.message === 'string') return data.message;
  if (data?.error && typeof data.error === 'string') return data.error;
  if (typeof data?.error === 'object' && typeof data.error?.message === 'string') return data.error.message;

  if (payload && typeof payload === 'object') {
    return `${fallback} (HTTP ${status}) - ${JSON.stringify(payload)}`;
  }

  return `${fallback} (HTTP ${status})`;
};

const safePayload = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    try {
      const text = await response.text();
      if (!text) return null;
      return { message: text };
    } catch {
      return null;
    }
  }
};

async function postAuth(
  path: string,
  body: Record<string, unknown> | null,
  fallbackError: string
): Promise<AuthResult> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const payload = await safePayload(response);
    if (!response.ok) {
      return { ok: false, message: buildErrorMessage(response.status, payload, fallbackError) };
    }

    return { ok: true };
  } catch {
    const diagnosis = await diagnoseBackendConnection();
    return { ok: false, message: `${NETWORK_ERROR_MESSAGE} ${diagnosis}` };
  }
}

export async function register(
  dni: string,
  fullName: string,
  gmail: string,
  username: string,
  password: string,
  repeatPassword: string
): Promise<AuthResult> {
  const dniValue = dni.trim();
  const name = fullName.trim();
  const user = username.trim();
  const mail = gmail.trim().toLowerCase();

  if (!dniValue || !name || !user || !mail || !password || !repeatPassword) {
    return {
      ok: false,
      message: 'DNI, nombre completo, usuario, gmail, contrasena y repetir contrasena son obligatorios.',
    };
  }

  if (!/^\d{8}$/.test(dniValue)) {
    return { ok: false, message: 'El DNI debe tener 8 digitos.' };
  }

  if (!mail.includes('@')) {
    return { ok: false, message: 'Ingresa un gmail valido para crear la cuenta.' };
  }

  return postAuth(
    '/api/v1/auth/register',
    { dni: dniValue, fullName: name, username: user, gmail: mail, password, repeatPassword },
    'No se pudo crear la cuenta.'
  );
}

export async function login(username: string, password: string): Promise<AuthResult> {
  const user = username.trim();
  if (!user || !password) return { ok: false, message: 'Usuario y contrasena son obligatorios.' };
  return postAuth('/api/v1/auth/login', { username: user, password }, 'Credenciales invalidas.');
}

export async function logout(): Promise<AuthResult> {
  return postAuth('/api/v1/auth/logout', null, 'No se pudo cerrar sesion.');
}

export async function hasActiveSession(): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/session`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) return false;
    const payload = (await safePayload(response)) as { authenticated?: boolean } | null;
    return payload?.authenticated === true;
  } catch {
    return false;
  }
}

export async function requireAuthOrRedirect(redirectPath = '/login'): Promise<void> {
  if (!isBrowser()) return;

  const hasSession = await hasActiveSession();
  if (!hasSession) window.location.assign(redirectPath);
}
