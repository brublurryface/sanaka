import type { RequestHandler } from 'express';

/** A dupla barra inicial é ambígua para o parser de URLs usado pelo renderer. */
export const rejectAmbiguousRequestTarget: RequestHandler = (request, response, next) => {
  if (request.originalUrl.startsWith('//')) {
    response
      .set('Cache-Control', 'no-store')
      .status(400)
      .type('text/plain')
      .send('Endereço inválido.\n');
    return;
  }

  next();
};
