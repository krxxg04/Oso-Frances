import { NETWORK_ERROR_MESSAGE, diagnoseBackendConnection } from './api';
import { hasActiveSession } from './auth';

export default function bootstrapIndex(): void {
  const AUTH_FLAG_KEY = 'oso_auth_ok_v1';
  const main = document.getElementById('app-main');
  const loading = document.getElementById('app-loading');
  const errorCard = document.getElementById('app-auth-error');
  const errorText = document.getElementById('app-auth-error-text');
  const retryButton = document.getElementById('app-auth-retry') as HTMLButtonElement | null;
  const params = new URLSearchParams(window.location.search);
  const auth = params.get('auth');
  const provider = params.get('provider');
  const reason = params.get('reason');

  const setHidden = (element: HTMLElement | null, hidden: boolean) => {
    if (!element) return;
    if (hidden) {
      element.classList.add('hidden');
    } else {
      element.classList.remove('hidden');
    }
  };

  const clearStoredAuthFlag = () => {
    try {
      localStorage.removeItem(AUTH_FLAG_KEY);
    } catch {
      // Ignore storage failures so the redirect/error UI can still continue.
    }
  };

  const persistStoredAuthFlag = () => {
    try {
      localStorage.setItem(AUTH_FLAG_KEY, '1');
    } catch {
      // Ignore storage failures; the active server session is the source of truth.
    }
  };

  const showApp = () => {
    setHidden(main, false);
    setHidden(loading, true);
    setHidden(errorCard, true);
  };

  const showAuthError = (message: string) => {
    if (errorText) {
      errorText.textContent = message;
    }
    setHidden(loading, true);
    setHidden(main, true);
    setHidden(errorCard, false);
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

  const failAuthCheck = async () => {
    if (settled) return;
    settled = true;
    clearStoredAuthFlag();

    let diagnosis = '';
    try {
      diagnosis = await diagnoseBackendConnection();
    } catch {
      diagnosis = '';
    }

    showAuthError(diagnosis ? `${NETWORK_ERROR_MESSAGE} ${diagnosis}` : NETWORK_ERROR_MESSAGE);
  };

  const fallbackToError = window.setTimeout(() => {
    void failAuthCheck();
  }, 6000);

  retryButton?.addEventListener('click', () => {
    window.location.reload();
  });

  void hasActiveSession()
    .then((ok) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(fallbackToError);

      if (ok) {
        persistStoredAuthFlag();
        showApp();
        return;
      }

      clearStoredAuthFlag();
      goLogin();
    })
    .catch(() => {
      window.clearTimeout(fallbackToError);
      settled = false;
      void failAuthCheck();
    });
}

bootstrapIndex();
