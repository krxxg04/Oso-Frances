import { authenticate, ensureDefaultUsers, setSession } from './auth';

const getRequiredEl = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`No se encontró el elemento #${id}`);
  return element as T;
};

const setHidden = (el: HTMLElement, hidden: boolean) => {
  if (hidden) {
    el.classList.add('hidden');
  } else {
    el.classList.remove('hidden');
  }
};

export default function initLogin(): void {
  ensureDefaultUsers();

  const form = getRequiredEl<HTMLFormElement>('login-form');
  const usernameEl = getRequiredEl<HTMLInputElement>('username');
  const passwordEl = getRequiredEl<HTMLInputElement>('password');
  const errorEl = getRequiredEl<HTMLParagraphElement>('login-error');

  setHidden(errorEl, true);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const username = usernameEl.value.trim();
    const password = passwordEl.value;

    const ok = authenticate(username, password);
    if (!ok) {
      errorEl.textContent = 'Credenciales inválidas. Revisa usuario y contraseña.';
      setHidden(errorEl, false);
      return;
    }

    setSession(username);
    window.location.assign('/');
  });
}
