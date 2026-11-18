import type { HttpInterceptorFn } from '@angular/common/http';
import { mergeMap, takeUntil, throwError, TimeoutError, timer } from 'rxjs';

// Experimental, per-request budget. Required article/policy reads retain their existing limits.
export const OPTIONAL_REQUEST_TIMEOUT_MS = 750;

export const boundedOptionalReads: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('http://127.0.0.1:45931/wp-json/wp/v2/')) return next(request);
  const url = new URL(request.urlWithParams);
  const optional =
    request.method === 'GET' &&
    url.origin === 'http://127.0.0.1:45931' &&
    ((url.pathname.endsWith('/categories') && !url.searchParams.has('slug')) ||
      url.pathname.endsWith('/tags') ||
      (url.pathname.endsWith('/posts') && !url.searchParams.has('slug')));
  const deadline = timer(OPTIONAL_REQUEST_TIMEOUT_MS).pipe(
    mergeMap(() => throwError(() => new TimeoutError())),
  );
  return optional ? next(request).pipe(takeUntil(deadline)) : next(request);
};
