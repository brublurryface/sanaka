# Validação do experimento de artigos — 18/11/2026

## Decisão de ativação

Manter artigos em CSR na configuração publicada. A P9 prepara e verifica o experimento de SSR;
não habilita SSR em produção, não publica uma prévia e não muda o plano do Render.

O serviço consultado permanece com uma instância de 0,5 CPU/512 MiB, região Virginia e deploy manual.
A revisão publicada observada em 18/11 ainda era `10c79ac`; a main examinada para esta entrega é
`6f9b268`, após a integração da P8. As medições antigas de 04/11 foram preservadas como histórico.

## O que muda no experimento

- As rotas vêm da mesma factory usada pela configuração principal. O experimento acrescenta somente
  `posts/:slug` como SSR, antes do wildcard CSR, preservando Sanaka-loka, redirecionamentos e 404 final.
  O teste de isolamento comprova que a configuração principal continua em CSR.
- O servidor experimental continua fixo na fixture de loopback, sem opção para trocar pelo CMS real.
  O mapa de origem do TransferCache identifica esses GETs como os mesmos que o navegador faria ao
  domínio do CMS. Somente o servidor recebe esse mapa; o navegador permanece com sua configuração.
- Complementos opcionais recebem um prazo **experimental de 750 ms por requisição**, contado até
  conclusão, com cancelamento e fallback existentes. O prazo não se renova por evento de progresso.
  Consultas essenciais de artigo e política editorial preservam seus limites. O valor é uma hipótese
  do experimento, não um SLO aprovado nem configuração instalada em produção.
- A fixture reproduz JSON inválido, artigo excluído, falha e lentidão de complementos, recuperação e
  atualização editorial. Os testes de navegador simulam o CMS e bloqueiam outros hosts externos.

## Contratos verificados

| Cenário SSR                                                | Resultado esperado                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| Artigo público                                             | 200, corpo, título, canonical e Open Graph do artigo.                     |
| Complementos falham ou demoram 2,5 s                       | 200 com corpo preservado, sem aguardar todo esse atraso.                  |
| Slug ausente ou artigo excluído                            | 404, noindex e no-store.                                                  |
| CMS/política indisponível ou contrato obrigatório inválido | 503, Retry-After 60, no-store; sem anunciar remoção permanente do índice. |
| Hidratação de sucesso                                      | Reutiliza o nó do artigo; não repete GETs essenciais já transferidos.     |
| Contador de Óbolos                                         | Sem marcador no TransferCache; leitura própria no navegador, sem POST.    |
| Retentativa explícita                                      | Recupera o leitor no cliente após 503 e restaura metadados de sucesso.    |
| Nova requisição após edição                                | Recebe a versão editorial nova, sem cache global do HTML de artigo.       |

O roteiro de hidratação executa cinco cenários em desktop e celular emulado. Ele pausa o bundle
principal, captura o artigo entregue pelo servidor e depois permite a inicialização Angular, tornando
a verificação de reutilização do DOM e de leituras HTTP explícita.

## Capacidade com limites aplicados

O novo workflow `Article SSR experiment` constrói os dois modos e executa cada processo de aplicação
em um container próprio: `--cpus 0.5 --memory 512m --memory-swap 512m`. A fixture e o gerador de carga
ficam no host do runner, fora desses limites. Não há navegador, build ou outra suíte concorrente nesse
job durante a medição. Docker não concede rede, CPU ou memória de produção a esses testes.

A aplicação mantém heap de 384 MiB; isso continua sem equivaler ao limite de RSS. A telemetria verifica
`cpu.max=50000 100000` e `memory.max=536870912` dentro do container, e registra RSS, pico de memória do
cgroup, CPU, latências do HTML completo e contagem de GETs à fixture. A amostragem de RSS é de 25 ms;
o pico do cgroup complementa a amostra. A imagem Node, seus digests e o commit estão no JSON.

São 100 respostas por modo/concorrência, nos níveis 1, 5 e 20. Não é LCP, INP, TTFB puro ou previsão
de tráfego suportado. Igualar quotas do plano não reproduz hardware, região, compartilhamento da CPU
ou latência Render–Locaweb. A fixture introduz 20 ms por chamada; não mede a rede do CMS real.

Os resultados restritos e o CI serão registrados após a execução da revisão publicada. Uma medição
local sem cgroup disponível permanece identificada como `local-unconstrained` e não libera ativação.

## Reprodução

```sh
npm ci
npm run build
npm run build:ssr:experiment
node experiments/ssr/benchmark.mjs /tmp/sanaka-article-ssr-local.json
docker pull node:24.22.1-bookworm-slim
node experiments/ssr/benchmark.mjs /tmp/sanaka-article-ssr-capacity.json --constrained
npx playwright install chromium
npm run test:ssr:hydration
```

O perfil com Docker exige Linux, Docker e rede host. O processo tem filesystem somente leitura e as
capabilities removidas. O nome exclusivo identifica somente containers criados pelo próprio roteiro;
o teardown os remove em caso de sucesso ou falha. A telemetria usa IPC ou stdin/stdout privados do
processo; não instala endpoint de diagnóstico na aplicação.

## O que ainda exige decisão

Antes de ativar SSR em uma entrega separada: confirmar latência real Render–CMS em ambiente autorizado,
adotar orçamento de latência e concorrência coerente com o uso, revisar atualização/invalidação com o
fluxo editorial e conferir o resultado no ambiente de publicação. O experimento não instala Redis,
CDN, webhook, cache global de artigos ou polling. Uma aba já aberta continua seguindo o TTL existente
das taxonomias; nova resposta HTTP de artigo deve refletir uma nova leitura do CMS.

As faltas de robots/sitemap e os pedidos malformados identificados nos logs em 18/11 são outra frente.
Esta entrega não tenta reduzir 404 substituindo endereços inexistentes por respostas 200.

Referências primárias: [Angular SSR](https://angular.dev/guide/ssr),
[hidratação](https://angular.dev/guide/hydration) e
[limites de recursos Docker](https://docs.docker.com/engine/containers/resource_constraints/).
