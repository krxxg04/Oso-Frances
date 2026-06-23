import { hasActiveSession } from './auth';

const AUTH_FLAG_KEY = 'oso_auth_ok_v1';
const main = document.getElementById('app-main');

const showApp = () => {
  if (main) main.classList.remove('hidden');
};

const goLogin = () => {
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
