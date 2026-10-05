import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

import { getStaticCacheControl, HTML_CACHE_CONTROL } from './server-cache';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.disable('x-powered-by');

/**
 * Endpoints REST do Express podem ser definidos aqui quando houver uma responsabilidade concreta
 * para o servidor. O runtime SSR atual não deve ser tratado antecipadamente como BFF.
 *
 * Exemplo:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Processa a requisição da API.
 * });
 * ```
 */

/** Entrega os arquivos estáticos gerados em `/browser` com cache adequado ao versionamento. */
app.use(
  express.static(browserDistFolder, {
    index: false,
    redirect: false,
    setHeaders: (res, filePath) => {
      res.setHeader('Cache-Control', getStaticCacheControl(filePath));
    },
  }),
);

/** Renderiza pelo Angular todas as requisições que não correspondem a um arquivo estático. */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => {
      if (!response) {
        return next();
      }

      res.setHeader('Cache-Control', HTML_CACHE_CONTROL);
      return writeResponseToNodeResponse(response, res);
    })
    .catch(next);
});

/**
 * Inicia o servidor quando este módulo é o ponto de entrada ou quando a execução ocorre via PM2.
 * A porta vem da variável `PORT`; na ausência dela, o servidor usa a porta 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/** Handler utilizado pelo Angular CLI e por ambientes compatíveis com funções HTTP. */
export const reqHandler = createNodeRequestHandler(app);
