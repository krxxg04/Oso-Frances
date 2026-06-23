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
  const loginSubtitle = getRequiredEl<HTMLParagraphElement>('login-subtitle');
  const goRegisterBtn = getRequiredEl<HTMLButtonElement>('go-register');
  const goLoginBtn = getRequiredEl<HTMLButtonElement>('go-login');
  const loginUsernameEl = getRequiredEl<HTMLInputElement>('login-username');
  const loginPasswordEl = getRequiredEl<HTMLInputElement>('login-password');
  const registerDniEl = getRequiredEl<HTMLInputElement>('register-dni');
  const registerFullNameEl = getRequiredEl<HTMLInputElement>('register-full-name');
  const registerUsernameEl = getRequiredEl<HTMLInputElement>('register-username');
  const registerEmailEl = getRequiredEl<HTMLInputElement>('register-email');
  const registerPasswordEl = getRequiredEl<HTMLInputElement>('register-password');
  const registerPasswordConfirmEl = getRequiredEl<HTMLInputElement>('register-password-confirm');
  const loginErrorEl = getRequiredEl<HTMLParagraphElement>('login-error');
  const registerErrorEl = getRequiredEl<HTMLParagraphElement>('register-error');
  const registerSuccessEl = getRequiredEl<HTMLParagraphElement>('register-success');
  const authStatusEl = getRequiredEl<HTMLParagraphElement>('auth-status');

  setHidden(loginErrorEl, true);
  setHidden(registerErrorEl, true);
  setHidden(registerSuccessEl, true);
  setHidden(authStatusEl, true);

  const params = new URLSearchParams(window.location.search);
  const googleAuth = params.get('auth');
  const googleProvider = params.get('provider');
  const googleReason = params.get('reason');

  if (googleProvider === 'google' && googleAuth === 'error') {
    authStatusEl.textContent = googleReason
      ? `No se pudo iniciar sesion con Google: ${decodeURIComponent(googleReason)}`
      : 'No se pudo iniciar sesion con Google.';
    setHidden(authStatusEl, false);
  }

  const showLogin = () => {
    setHidden(registerForm, true);
    setHidden(loginForm, false);
    loginSubtitle.textContent = 'Inicia sesion para continuar con el simulador.';
    setHidden(registerErrorEl, true);
    setHidden(registerSuccessEl, true);
  };

  const showRegister = () => {
    setHidden(loginForm, true);
    setHidden(registerForm, false);
    loginSubtitle.textContent = 'Crea tu cuenta para acceder al simulador.';
    setHidden(loginErrorEl, true);
  };

  goRegisterBtn.addEventListener('click', showRegister);
  goLoginBtn.addEventListener('click', showLogin);
  void hasActiveSession().then((active) => {
    if (active) {
      localStorage.setItem(AUTH_FLAG_KEY, '1');
      window.location.assign('/');
    }
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;

    setHidden(loginErrorEl, true);
    setHidden(authStatusEl, true);
    const result = await login(loginUsernameEl.value, loginPasswordEl.value);

    if (!result.ok) {
      loginErrorEl.textContent = result.message ?? 'No se pudo iniciar sesion.';
      setHidden(loginErrorEl, false);
      return;
    }

    const active = await hasActiveSession();
    if (!active) {
      loginErrorEl.textContent =
        'Se inicio sesion, pero no se pudo persistir la cookie de sesion. Revisa cookies de terceros, CORS y credenciales.';
      setHidden(loginErrorEl, false);
      localStorage.removeItem(AUTH_FLAG_KEY);
      return;
    }

    localStorage.setItem(AUTH_FLAG_KEY, '1');
    window.location.assign('/');
  });

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!registerForm.reportValidity()) return;

    setHidden(registerErrorEl, true);
    setHidden(registerSuccessEl, true);
    setHidden(authStatusEl, true);

    const password = registerPasswordEl.value;
    const passwordConfirm = registerPasswordConfirmEl.value;
    if (password !== passwordConfirm) {
      registerErrorEl.textContent = 'Las contrasenas no coinciden.';
      setHidden(registerErrorEl, false);
      return;
    }

    const result = await register(
      registerDniEl.value,
      registerFullNameEl.value,
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
      registerSuccessEl.textContent = 'Cuenta creada. Ahora inicia sesion.';
      setHidden(registerSuccessEl, false);
      registerForm.reset();
      showLogin();
      return;
    }

    const active = await hasActiveSession();
    if (!active) {
      registerSuccessEl.textContent =
        'Cuenta creada y credenciales validas, pero no se pudo guardar la cookie de sesion.';
      setHidden(registerSuccessEl, false);
      registerForm.reset();
      showLogin();
      localStorage.removeItem(AUTH_FLAG_KEY);
      return;
    }

    localStorage.setItem(AUTH_FLAG_KEY, '1');
    window.location.assign('/');
  });
}
