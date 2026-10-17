# Matrix — relatório de implementação V1

Data: 10/10/2026. **Implementação com validação automatizada concluída; revisão
visual e aceite pendentes.** Não considerar todos os critérios de aceite encerrados
antes do pente-fino em navegador.

## Resultado

Quatro laboratórios funcionais foram acrescentados à Matrix existente, seguindo as fases
A → B → C → D → validação automatizada. Não houve redesign de outras áreas, dependências
novas nem deploy nesta entrega.

| Rota               | Comportamento implementado                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `/matrix/obolos`   | Consultar/adicionar/remover, índices desde zero, percursos, loops aninhados, Set, Map, duplicatas e contagens                           |
| `/matrix/entregas` | FIFO/LIFO, comparação shift/head/pop, produtor/consumidor locais, processamento separado de ACK, retry e dead-letter                    |
| `/matrix/jogo`     | Três/cinco gestos, função pura versus regras compostas, resultados determinísticos, cenários e inspeção de políticas                    |
| `/matrix/padaria`  | GET/POST simulados, JSON, 200/201/400/404/409/500, validação local/rede/HTTP, contrato BFF opcional e pagamentos fictícios idempotentes |

Na implementação inicial, cada estudo apresentava história, três níveis e nove perguntas
antes da prática. A revisão de 11/10 substitui essa organização por etapas guiadas,
retorno leigo após cada ação e explicação técnica/código no mesmo ponto da experiência.
Conceitos, snapshots e comparações ficam opcionais. Os algoritmos continuam reais e
testados; os 25 pares do jogo estendido e os nove clássicos permanecem cobertos.

O catálogo tem seis experiências disponíveis, incluindo as duas anteriores. Signals,
Observables e Lifecycle continuam planejados, numerados 07, 08 e 09, sem links vazios.

## Reutilização e limites de escopo

Reutilizados: `CodeExplorerController`, `.matrix-code-explorer`, `.matrix-experiment-node`,
Header cinematográfico, shell, degradês, papéis tipográficos e `.sanaka-section-heading`.
Criados: Frame editorial, histórico de snapshots, visualizador, executor de cenários fixos,
contratos de estudo/fontes e **uma** folha Sass dos quatro laboratórios.

As rotas são lazy-loaded e prerenderizadas. O verificador de recortes entrou no comando
`check` sem remover verificações existentes. Não mudou nenhuma configuração de orçamento,
cobertura ou limite de duplicação. O lockfile não foi alterado.

Components e NASA mantiveram os arquivos de implementação intactos. Nenhum arquivo de
Posts, Home, Sobre, WordPress ou contador real de óbolos foi modificado por esta entrega.
Os dois JSON compartilhados receberam apenas conteúdo da família Matrix.

## Validações da implementação inicial (10/10)

Linha de base antes de alterar: 208 testes, 38 arquivos de teste, build de 407,08 KB e
zero clones TypeScript detectados pelo gate existente.

| Verificação                   | Resultado final                                                      |
| ----------------------------- | -------------------------------------------------------------------- |
| `npm run matrix:source:sync`  | Quatro arquivos gerados a partir dos domínios reais                  |
| `npm run matrix:source:check` | Recortes conferem com as fontes                                      |
| `npm run format:check`        | Aprovado                                                             |
| `npm run test:ci`             | Aprovado durante a implementação; suíte final repetida com cobertura |
| `npm run test:coverage`       | 371 testes em 51 arquivos, todos aprovados                           |
| Statements                    | 95,76%                                                               |
| Branches                      | 92,67%                                                               |
| Functions                     | 96,73%                                                               |
| Lines                         | 95,62%                                                               |
| `npm run duplication:check`   | 0,38% de linhas / 0,54% de tokens; limite existente de 3% atendido   |
| `npm run build`               | Aprovado, 10 rotas estáticas prerenderizadas                         |
| Bundle inicial                | 413,00 KB brutos; estimativa de transferência 108,61 KB              |
| `npm run check`               | Cadeia completa aprovada                                             |
| `git diff --check`            | Sem erros                                                            |

Os três clones detectados são blocos de importações comuns entre páginas. Não são quatro
cópias de Header ou de algoritmos. Não foi criado um barrel artificial para esconder
esse resultado nem aumentada a tolerância do gate.

Testes de DOM com traduções reais verificaram controles, ACK, pending, seleção do índice
zero, navegação de código, âncoras com rota completa, ausência de `main` interno, nomes
acessíveis, estados desabilitados e configuração opcional de arte desktop/mobile.
Testes de conteúdo conferem chaves e placeholders PT-BR/en, conceitos, perguntas e
legendas das fontes. Os algoritmos são testados também sem DOM.

Os HTMLs prerenderizados dos quatro estudos foram inspecionados: título de aba próprio,
um único `main` do shell, Header comum, três conceitos/nove perguntas, âncoras da rota
correta e ausência de `<img>` quebrado no fallback.

**Aviso preexistente:** npm reporta `Unknown env config "http-proxy"`. O aviso também
existia na linha de base, não impediu as verificações e não foi alterado fora do escopo.
As falhas de tipagem, expectativas antigas do catálogo e uma chave de tradução ausente
encontradas durante a implementação foram corrigidas e as suítes repetidas.

## Pendências explícitas

1. **Revisão visual real:** não havia navegador de QA/control-browser disponível neste
   ambiente. Nenhum screenshot foi produzido; DOM/SSR não provam responsividade visual.
   Conferir desktop 1440px e mobile 360/390px, toque, teclado, zoom, contraste e leitor
   de tela. O código prepara esses contratos, mas essa conferência não foi realizada.
2. **Artes exclusivas:** Mors já recebeu a arte fornecida pela autora. As três outras
   experiências e uma variante mobile própria de Mors continuam pendentes, conforme
   o [manifesto](./manifesto-de-artes.md). O recorte mobile atual usa a mesma arte.
3. **PR da Matrix:** abrir após o teste da autora, incluir os ajustes necessários e
   aguardar sua aprovação antes de integrar os laboratórios a `main`.
4. **Aceite da autora:** revisar clareza dos controles e os percursos dos quatro experimentos.
5. **Produção não está neste escopo:** broker, BFF implantado, persistência, pagamentos,
   autenticação e operação financeira continuam explicitamente fora da simulação.

## Git e documentação de estudo

Branch de entrega: `feature/matrix-learning-labs-v1`.
Base alinhada com `origin/main`, revisão `d8a18b3`, após o merge da
[PR #57](https://github.com/brublurryface/sanaka/pull/57). O alinhamento foi feito por
fast-forward: o conteúdo da base original, `48eeb5e`, já estava integrado, e nenhum
arquivo local precisou de resolução de conflitos.

O commit `edf1ceb` reúne a implementação inicial dos quatro laboratórios. A documentação
e a ativação dos links de estudo formam o commit seguinte. O commit `b039823` reúne
a revisão guiada de 11/10 e o Header de Mors. O commit seguinte fixa
`MATRIX_STUDY_SOURCE_REF` nessa revisão e atualiza a documentação da entrega.
Assim, os links do GitHub apontam aos arquivos correspondentes aos recortes exibidos.

Para testar, obtenha a branch indicada no [guia](./guia-de-estudos.md). Um `git pull`
feito em `main` só recebe os laboratórios após o merge da PR da Matrix. A autora
continua responsável pelo aceite e pelo merge. Nenhuma branch existente foi apagada.

Estude Óbolos → Entregas → Jogo → Padaria → NASA. Consulte o
[guia de estudos](./guia-de-estudos.md) para execução, arquivos, testes por laboratório,
alterações seguras, reversão de tentativas e adição de novos estudos. Os
[padrões didáticos](./padroes-didaticos.md) registram decisões e limites técnicos.

As habilidades de continuidade e Sites orientaram a retomada do checkout existente:
nenhum novo Site, cadastro de hospedagem ou publicação foi criado.

## Revisão guiada (11/10)

- Etapas com objetivo, ação, retorno leigo e explicação técnica/código contextual.
- Botões e campos com orientação junto à interação; referências completas opcionais.
- Navegação entre etapas com foco no novo título; requisição pendente não é abandonada.
- Header de Mors aplicado sem redesenhar a arte, em WebP de 1.942 × 809 px e 382.262 bytes.
- PT-BR/en com as mesmas chaves e parâmetros; dois níveis de explicação por evento.

`npm run check` passou com **378 testes em 51 arquivos**. Cobertura: statements 95,75%,
branches 92,69%, functions 96,36% e lines 95,86%; todas acima dos 85% exigidos.
Duplicação TypeScript: 0,54% das linhas e 0,76% dos tokens, abaixo do limite de 3%.
Os quatro clones são três blocos de imports e um bloco curto de reinício do cenário;
não são cópias dos algoritmos. Build aprovado com dez rotas prerenderizadas, bundle
inicial de 417,14 KB brutos e transferência estimada de 109,45 KB.

Testes de interação cobrem os quatro percursos guiados, código ligado à ação, mudança
de idioma, retorno de falha/retry, pagamento repetido e bloqueio de troca de etapa durante
uma requisição. A inspeção do HTML estático confirma um único `main` por página,
títulos próprios, etapas iniciais e explicação técnica recolhida. A revisão visual
em navegador continua pendente; nenhum screenshot ou aceite visual é alegado.

## Inventário exato da revisão guiada

34 arquivos novos/alterados nesta revisão de 11/10. Caminhos relativos à raiz:

```text
docs/matrix/guia-de-estudos.md
docs/matrix/manifesto-de-artes.md
docs/matrix/padroes-didaticos.md
docs/matrix/relatorio-v1.md
public/i18n/en.json
public/i18n/pt-BR.json
public/images/matrix/obolos/obolos-atmosphere-desktop.webp
scripts/matrix-study-source.mjs
src/app/pages/matrix/studies/entregas/delivery-queue.ts
src/app/pages/matrix/studies/entregas/entregas-lab.html
src/app/pages/matrix/studies/entregas/entregas-lab.spec.ts
src/app/pages/matrix/studies/entregas/entregas-lab.ts
src/app/pages/matrix/studies/entregas/entregas-source.generated.ts
src/app/pages/matrix/studies/jogo/jogo-lab.html
src/app/pages/matrix/studies/jogo/jogo-lab.spec.ts
src/app/pages/matrix/studies/jogo/jogo-lab.ts
src/app/pages/matrix/studies/obolos/obolo-inventory.ts
src/app/pages/matrix/studies/obolos/obolos-lab.html
src/app/pages/matrix/studies/obolos/obolos-lab.spec.ts
src/app/pages/matrix/studies/obolos/obolos-lab.ts
src/app/pages/matrix/studies/obolos/obolos-source.generated.ts
src/app/pages/matrix/studies/padaria/padaria-lab.html
src/app/pages/matrix/studies/padaria/padaria-lab.spec.ts
src/app/pages/matrix/studies/padaria/padaria-lab.ts
src/app/pages/matrix/studies/shared/matrix-study-content.spec.ts
src/app/pages/matrix/studies/shared/matrix-study-definition.ts
src/app/pages/matrix/studies/shared/matrix-study-files.ts
src/app/pages/matrix/studies/shared/matrix-study-frame.html
src/app/pages/matrix/studies/shared/matrix-study-frame.ts
src/app/pages/matrix/studies/shared/matrix-study-ui.spec.ts
src/app/pages/matrix/studies/shared/study-step-viewer.html
src/app/pages/matrix/studies/shared/study-step-viewer.ts
src/app/pages/matrix/studies/shared/study-walkthrough.ts
src/styles/_matrix-studies.scss
```
