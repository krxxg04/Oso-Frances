import { hasActiveSession } from './auth';

const AUTH_FLAG_KEY = 'oso_auth_ok_v1';
const main = document.getElementById('app-main');
const loading = document.getElementById('app-loading');
const params = new URLSearchParams(window.location.search);
const auth = params.get('auth');
const provider = params.get('provider');
const reason = params.get('reason');

const showApp = () => {
  if (main) main.classList.remove('hidden');
  if (loading) loading.classList.add('hidden');
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

let settled = false;
const fallbackRedirect = window.setTimeout(() => {
  if (settled) return;
  settled = true;
  localStorage.removeItem(AUTH_FLAG_KEY);
  goLogin();
}, 6000);

void hasActiveSession().then((ok) => {
  if (settled) return;
  settled = true;
  window.clearTimeout(fallbackRedirect);

  if (ok) {
    localStorage.setItem(AUTH_FLAG_KEY, '1');
    showApp();
    return;
  }

  localStorage.removeItem(AUTH_FLAG_KEY);
  goLogin();
});
