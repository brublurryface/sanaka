import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

/** Um POST com resposta incompatível pode já ter produzido seu efeito no servidor. */
export class InvalidFormResponse extends Error {}

export function assertFormFlag<K extends string>(
  body: unknown,
  field: K,
): asserts body is Record<K, boolean> {
  if (
    body === null ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    !Object.hasOwn(body, field) ||
    typeof Reflect.get(body, field) !== 'boolean'
  ) {
    throw new InvalidFormResponse('Resposta de formulário incompatível.');
  }
}

/** Inclui falha de leitura de JSON após um HTTP 2xx, além de interrupção e prazo vencido. */
export function isUnconfirmedFormError(error: unknown): boolean {
  return (
    error instanceof InvalidFormResponse ||
    error instanceof TimeoutError ||
    (error instanceof HttpErrorResponse &&
      (error.status === 0 || error.status === 504 || (error.status >= 200 && error.status < 300)))
  );
}
