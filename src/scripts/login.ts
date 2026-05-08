import { hasActiveSession, login, register } from './auth';

const getRequiredEl = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`No se encontro el elemento #${id}`);
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
  const loginForm = getRequiredEl<HTMLFormElement>('login-form');
  const registerForm = getRequiredEl<HTMLFormElement>('register-form');
  const loginUsernameEl = getRequiredEl<HTMLInputElement>('login-username');
  const loginPasswordEl = getRequiredEl<HTMLInputElement>('login-password');
  const registerUsernameEl = getRequiredEl<HTMLInputElement>('register-username');
  const registerPasswordEl = getRequiredEl<HTMLInputElement>('register-password');
  const registerPasswordConfirmEl = getRequiredEl<HTMLInputElement>('register-password-confirm');
  const loginErrorEl = getRequiredEl<HTMLParagraphElement>('login-error');
  const registerErrorEl = getRequiredEl<HTMLParagraphElement>('register-error');
  const registerSuccessEl = getRequiredEl<HTMLParagraphElement>('register-success');

  setHidden(loginErrorEl, true);
  setHidden(registerErrorEl, true);
  setHidden(registerSuccessEl, true);

  void hasActiveSession().then((active) => {
    if (active) window.location.assign('/');
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;

    setHidden(loginErrorEl, true);
    const result = await login(loginUsernameEl.value, loginPasswordEl.value);

    if (!result.ok) {
      loginErrorEl.textContent = result.message ?? 'No se pudo iniciar sesion.';
      setHidden(loginErrorEl, false);
      return;
    }

    window.location.assign('/');
  });

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!registerForm.reportValidity()) return;

    setHidden(registerErrorEl, true);
    setHidden(registerSuccessEl, true);

    const password = registerPasswordEl.value;
    const passwordConfirm = registerPasswordConfirmEl.value;
    if (password !== passwordConfirm) {
      registerErrorEl.textContent = 'Las contrasenas no coinciden.';
      setHidden(registerErrorEl, false);
      return;
    }

    const result = await register(registerUsernameEl.value, password);
    if (!result.ok) {
      registerErrorEl.textContent = result.message ?? 'No se pudo crear la cuenta.';
      setHidden(registerErrorEl, false);
      return;
    }

    registerSuccessEl.textContent = 'Cuenta creada. Ahora puedes iniciar sesion.';
    setHidden(registerSuccessEl, false);
    registerForm.reset();
  });
}
