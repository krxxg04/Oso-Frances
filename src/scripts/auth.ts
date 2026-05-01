export type StoredUser = {
  username: string;
  password: string;
};

const USERS_KEY = 'oso_frances_users_v1';
const SESSION_KEY = 'oso_frances_session_user_v1';

const isBrowser = (): boolean => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const safeJsonParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export function ensureDefaultUsers(): void {
  if (!isBrowser()) return;

  const existing = safeJsonParse<StoredUser[]>(localStorage.getItem(USERS_KEY));
  if (Array.isArray(existing) && existing.length > 0) return;

  const seed: StoredUser[] = [
    { username: 'admin', password: 'admin' },
    { username: 'user', password: 'user' },
  ];
  localStorage.setItem(USERS_KEY, JSON.stringify(seed));
}

export function getUsers(): StoredUser[] {
  if (!isBrowser()) return [];
  const users = safeJsonParse<StoredUser[]>(localStorage.getItem(USERS_KEY));
  return Array.isArray(users) ? users : [];
}

export function authenticate(username: string, password: string): boolean {
  const u = username.trim();
  if (!u) return false;

  const users = getUsers();
  return users.some((user) => user.username === u && user.password === password);
}

export function setSession(username: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(SESSION_KEY, username);
}

export function getSessionUser(): string | null {
  if (!isBrowser()) return null;
  const username = localStorage.getItem(SESSION_KEY);
  return username && username.trim() ? username : null;
}

export function clearSession(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(SESSION_KEY);
}

export function requireAuthOrRedirect(redirectPath = '/login'): void {
  if (!isBrowser()) return;
  ensureDefaultUsers();

  const user = getSessionUser();
  if (!user) window.location.assign(redirectPath);
}
