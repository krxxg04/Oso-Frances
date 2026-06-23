import { hasActiveSession } from './auth';

const AUTH_FLAG_KEY = 'oso_auth_ok_v1';
const main = document.getElementById('app-main');
const params = new URLSearchParams(window.location.search);
const auth = params.get('auth');
const provider = params.get('provider');
const reason = params.get('reason');

const showApp = () => {
  if (main) main.classList.remove('hidden');
};

const goLogin = () => {
  if (auth === 'error' && provider === 'google') {
    const next = new URLSearchParams({
      auth: 'error',
      provider: 'google',
      ...(reason ? { reason } : {}),
    });
    window.location.replace(`/login?${next.toString()}`);
    return;
  }

  window.location.replace('/login');
};

void hasActiveSession().then((ok) => {
  if (ok) {
    localStorage.setItem(AUTH_FLAG_KEY, '1');
    showApp();
    return;
  }

  localStorage.removeItem(AUTH_FLAG_KEY);
  goLogin();
});
