import { hasActiveSession, login, register } from './auth';

const AUTH_FLAG_KEY = 'oso_auth_ok_v1';

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
  const registerDniEl = getRequiredEl<HTMLInputElement>('register-dni');
  const registerUsernameEl = getRequiredEl<HTMLInputElement>('register-username');
  const registerEmailEl = getRequiredEl<HTMLInputElement>('register-email');
  const registerPasswordEl = getRequiredEl<HTMLInputElement>('register-password');
  const registerPasswordConfirmEl = getRequiredEl<HTMLInputElement>('register-password-confirm');
  const loginErrorEl = getRequiredEl<HTMLParagraphElement>('login-error');
  const registerErrorEl = getRequiredEl<HTMLParagraphElement>('register-error');
  const registerSuccessEl = getRequiredEl<HTMLParagraphElement>('register-success');

  setHidden(loginErrorEl, true);
  setHidden(registerErrorEl, true);
  setHidden(registerSuccessEl, true);

  void hasActiveSession().then((active) => {
    if (active) {
      sessionStorage.setItem(AUTH_FLAG_KEY, '1');
      window.location.assign('/');
    }
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

    sessionStorage.setItem(AUTH_FLAG_KEY, '1');
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

    const result = await register(
      registerDniEl.value,
      registerEmailEl.value,
      registerUsernameEl.value,
      password,
      passwordConfirm
    );

    if (!result.ok) {
      registerErrorEl.textContent = result.message ?? 'No se pudo crear la cuenta.';
      setHidden(registerErrorEl, false);
      return;
    }

    const loginAfterRegister = await login(registerUsernameEl.value, password);
    if (!loginAfterRegister.ok) {
      registerSuccessEl.textContent = 'Cuenta creada. Inicia sesion para continuar.';
      setHidden(registerSuccessEl, false);
      registerForm.reset();
      return;
    }

    sessionStorage.setItem(AUTH_FLAG_KEY, '1');
    window.location.assign('/');
  });
}
