import * as Sentry from '@sentry/node';
import { env } from './env.js';

export function initBackendSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return; // Si no está configurado, no inicializar y continuar sin fallar
  }

  Sentry.init({
    dsn,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Redacción estricta de headers y PII sensible
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-tenant-id'];
      }
      if (event.request?.data && typeof event.request.data === 'object') {
        const sensitiveFields = [
          'password',
          'token',
          'refreshToken',
          'twoFactorSecret',
          'cvv',
          'cardNumber',
          'documentNumber',
        ];
        for (const field of sensitiveFields) {
          if (field in (event.request.data as any)) {
            (event.request.data as any)[field] = '[REDACTED]';
          }
        }
      }
      return event;
    },
  });
}
