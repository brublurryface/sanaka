import express, { type ErrorRequestHandler, type RequestHandler, Router } from 'express';

import { contactHandler } from './contact';

/** O parser e seus erros pertencem à rota; o payload inválido nunca entra no corpo/log de erro. */
export function createContactRouter(handler: RequestHandler = contactHandler): Router {
  const router = Router();
  router.use(express.json({ limit: '16kb' }));
  router.post('/', handler);
  const bodyError: ErrorRequestHandler = (error: unknown, _request, response, next) => {
    const status =
      error && typeof error === 'object' && 'status' in error ? error.status : undefined;
    if (status === 400 || status === 413 || status === 415) {
      response.status(status).json({ delivered: false });
      return;
    }
    next(error);
  };
  router.use(bodyError);
  return router;
}
