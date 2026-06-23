import { logout } from './auth';

const AUTH_FLAG_KEY = 'oso_auth_ok_v1';

const setHidden = (el: HTMLElement, hidden: boolean) => {
  if (hidden) el.classList.add('hidden');
  else el.classList.remove('hidden');
};

export default function initNavAuth(): void {
  const loginLink = document.getElementById('nav-login-link') as HTMLAnchorElement | null;
  const logoutButton = document.getElementById('nav-logout-btn') as HTMLButtonElement | null;
  const isLoginPage = window.location.pathname === '/login';

  if (!loginLink || !logoutButton) return;

  setHidden(loginLink, true);
  if (isLoginPage) {
    setHidden(logoutButton, true);
    return;
  }

  setHidden(logoutButton, false);

  logoutButton.addEventListener('click', async () => {
    const result = await logout();
    if (!result.ok) {
      alert(result.message ?? 'No se pudo cerrar sesion.');
      return;
    }

    localStorage.removeItem(AUTH_FLAG_KEY);
    window.location.assign('/login');
  });
}
