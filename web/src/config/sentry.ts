import * as Sentry from '@sentry/react';

export function initWebSentry(): void {
  const dsn = import.meta.env?.VITE_SENTRY_DSN;
  if (!dsn) {
    return; // Si no hay DSN configurado, no inicializar y no romper la app
  }

  Sentry.init({
    dsn,
    environment: import.meta.env?.MODE || 'development',
    tracesSampleRate: import.meta.env?.PROD ? 0.1 : 1.0,
    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}
