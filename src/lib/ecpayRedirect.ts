import type { EcpayForm } from './api';

export function submitToEcpay(form: EcpayForm, onTimeout?: () => void): void {
  const f = document.createElement('form');
  f.method = 'POST';
  f.action = form.endpoint;
  f.style.display = 'none';

  for (const [k, v] of Object.entries(form.fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = k;
    input.value = v;
    f.appendChild(input);
  }

  document.body.appendChild(f);
  f.submit();

  if (onTimeout) {
    const tid = setTimeout(onTimeout, 5000);
    const cleanup = () => {
      clearTimeout(tid);
      window.removeEventListener('pagehide', cleanup);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') cleanup();
    };
    window.addEventListener('pagehide', cleanup, { once: true });
    document.addEventListener('visibilitychange', onVisibility);
  }
}
