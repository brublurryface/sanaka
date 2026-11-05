# Spike de SSR de artigos — 04/11/2026

## Decisão

Manter `/posts/:slug` em CSR na configuração padrão. A configuração **experimental** `ssr-spike` renderiza somente essa rota no servidor. Ainda falta validar a capacidade em 0,5 CPU/512 MiB e a latência do WordPress a partir do Render; o ambiente local tem cota de 8 CPUs/8 GiB. O limite Node de heap de 384 MiB não é um limite de RSS nem simula o Render.

O ganho de SEO ficou comprovado na fixture: o HTML SSR contém artigo, título, canonical e Open Graph. A versão CSR entrega o shell genérico e status 200 antes do JavaScript, inclusive para os slugs ausente e indisponível. Nenhuma mudança global de renderização foi habilitada.

## Cenários verificados sem JavaScript

| Cenário                                      | CSR        | SSR experimental                                  |
| -------------------------------------------- | ---------- | ------------------------------------------------- |
| Artigo público                               | 200, shell | 200, texto e OG do artigo                         |
| Falha de tags/categorias opcionais/navegação | 200, shell | 200, artigo preservado                            |
| Slug comprovadamente ausente                 | 200, shell | 404, `noindex`, `no-store`                        |
| CMS indisponível                             | 200, shell | 503, `Retry-After: 60`, `no-store`, sem `noindex` |
| Falha na resolução editorial obrigatória     | 200, shell | 503, sem expor conteúdo fora da política          |

Os cabeçalhos específicos de erro não são mais sobrescritos pela política genérica do Express. No navegador, erro temporário também deixa de indicar exclusão permanente de índice. Retentativa bem-sucedida restaura o estado de sucesso.

## TransferCache e cache editorial

A transferência ao navegador aceita apenas GET/HEAD públicos de posts/categorias/tags no host do CMS. Exclui autenticação, credenciais, contexto de edição, rascunhos, senha e contadores de óbolos. Os cabeçalhos `X-WP-Total` e `X-WP-TotalPages` acompanham as respostas, evitando que a hidratação perca a contagem filtrada. Nenhum POST é transferido. O contador tem opt-out explícito; o benchmark verifica que seu valor marcador não aparece no estado transferido.

O TransferCache serve à hidratação de uma resposta, não é um cache editorial compartilhado entre visitantes. Artigos continuam sendo buscados em cada visita; HTML e recursos sem hash exigem revalidação. Erros são `no-store`. A árvore de categorias e a política editorial expiram após cinco minutos e revalidam na próxima assinatura. Não há polling nem novo cache de CDN/Redis. Uma mudança de categoria essencial falha de forma segura, sem liberar o acervo excluído.

Não se presume atualização imediata de uma aba já aberta: a árvore exibida só muda na próxima consulta depois do TTL. Para atualização editorial instantânea, seria necessário um mecanismo de invalidação decidido com o fluxo de publicação; nenhum webhook ou purge foi instalado silenciosamente.

## Reprodução e limites

```sh
npm ci
npm run build
npm run build -- --configuration production,ssr-spike --output-path dist/ssr-spike
node experiments/ssr/benchmark.mjs /tmp/sanaka-ssr-benchmark.json
```

A fixture responde somente por loopback e rejeita métodos diferentes de GET. Introduz 20 ms por chamada e não contém dados pessoais nem credenciais. O servidor experimental sempre usa essa fixture; não pode ser configurado para carregar o CMS real. O script compara 100 requisições por nível de concorrência (1/5/20), com Node/heap iguais, e mede o tempo até receber todo o HTML, CPU do processo e RSS amostrado a cada 10 ms. Esses tempos não são LCP, INP nem TTFB puro. Os casos funcionais são executados antes da carga.

A telemetria é injetada com `--import` somente no processo de benchmark e usa IPC, sem endpoint público de diagnóstico. O script não realiza carga no site publicado e não modifica o Render.

As medições brutas ficam em `docs/performance/data/post-ssr-spike-2026-11.json`. Não extrapolar suas taxas para o plano de produção. O SSR faz oito GETs à fixture por artigo nesta composição; há custo real nos complementos que a renderização precisa aguardar. Antes de ativá-lo: medir no plano equivalente, estabelecer orçamento de tempo para enriquecimentos, confirmar hidratação no navegador e revisar a política editorial de invalidação. Uma otimização futura pode adiar complementos ao cliente, mas precisa preservar a leitura e ser medida separadamente.

Referências: [SSR híbrido e RESPONSE_INIT](https://angular.dev/guide/ssr), [configuração do TransferCache](https://angular.dev/guide/ssr#configuring-the-caching-options).

## Resultado de carga local

| Modo | Concorrência | Requisições | p50 do HTML (ms) | p95 do HTML (ms) | CPU (s) | Pico RSS (MiB) | GETs à fixture |
| ---- | ------------ | ----------- | ---------------- | ---------------- | ------- | -------------- | -------------- |
| CSR  | 1            | 100         | 1.3              | 3.1              | 0.13    | 68.6           | 0              |
| CSR  | 5            | 100         | 2.7              | 5.1              | 0.07    | 71.1           | 0              |
| CSR  | 20           | 100         | 7.3              | 12.8             | 0.08    | 72.4           | 0              |
| SSR  | 1            | 100         | 105.2            | 115.7            | 5.44    | 218.3          | 800            |
| SSR  | 5            | 100         | 162.0            | 240.5            | 4.45    | 251.4          | 800            |
| SSR  | 20           | 100         | 544.5            | 798.4            | 4.46    | 295.0          | 800            |

Medição: 2026-11-04T20:50:22.747Z. Sem outro build ou suíte de testes concorrente. O pico de RSS inclui aquecimento e efeitos do GC; não representa uma garantia de capacidade no Render.
