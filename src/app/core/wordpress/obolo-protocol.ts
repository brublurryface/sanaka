import { InjectionToken } from '@angular/core';

/** Ativar por provider apenas depois de validar o complemento no WordPress. */
export const OBOLO_IDEMPOTENCY_ENABLED = new InjectionToken<boolean>('OBOLO_IDEMPOTENCY_ENABLED', {
  factory: () => false,
});
