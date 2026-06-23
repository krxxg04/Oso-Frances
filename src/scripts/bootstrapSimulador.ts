import initSimuladorCredito from './simuladorCredito';

const showInitError = (error: unknown) => {
  const target = document.getElementById('simulador-error');
  if (!target) {
    console.error(error);
    return;
  }

  const message = error instanceof Error ? error.message : 'No se pudo inicializar el simulador.';
  target.textContent = message;
  target.classList.remove('hidden');
};

const boot = () => {
  try {
    initSimuladorCredito();
  } catch (error) {
    showInitError(error);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
