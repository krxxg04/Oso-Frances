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

  if (isLoginPage) {
    // En login no mostrar ni "Iniciar sesion" ni "Cerrar sesion" en la navbar.
    setHidden(loginLink, true);
    setHidden(logoutButton, true);
    return;
  }

  // En la app siempre mostrar "Cerrar sesion".
  setHidden(loginLink, true);
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
