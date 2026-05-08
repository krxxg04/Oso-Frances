import { hasActiveSession, logout } from './auth';

const setHidden = (el: HTMLElement, hidden: boolean) => {
  if (hidden) el.classList.add('hidden');
  else el.classList.remove('hidden');
};

export default function initNavAuth(): void {
  const loginLink = document.getElementById('nav-login-link') as HTMLAnchorElement | null;
  const logoutButton = document.getElementById('nav-logout-btn') as HTMLButtonElement | null;

  if (!loginLink || !logoutButton) return;

  void hasActiveSession().then((active) => {
    setHidden(loginLink, active);
    setHidden(logoutButton, !active);
  });

  logoutButton.addEventListener('click', async () => {
    const result = await logout();
    if (!result.ok) {
      alert(result.message ?? 'No se pudo cerrar sesion.');
      return;
    }

    window.location.assign('/login');
  });
}
