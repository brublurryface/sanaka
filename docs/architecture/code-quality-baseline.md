# Sanaka — diagnóstico de qualidade e organização

Issue: [#36 — Audit project structure and plan incremental refactoring](https://github.com/brublurryface/sanaka/issues/36)

Data: 15/09/2026

Base examinada: [main em c738ea2](https://github.com/brublurryface/sanaka/tree/c738ea2556c3d9ad4d3ddcbfa42a80eb9235e138), após o merge da PR #37.

Status: diagnóstico histórico realizado sobre a revisão `c738ea2`. Parte das propostas foi implementada posteriormente na branch `chore/36-code-quality-audit`. Para métricas e situação atual, consulte [`../code-quality-audit.md`](../code-quality-audit.md).

## 1. Resultado e limites da auditoria

Sanaka já tem separação por áreas, componentes filhos e integrações HTTP isoladas. O problema não é uma ausência completa de arquitetura. Há, porém, pontos concretos que dificultam a navegação, deixam decisões importantes implícitas e não contam com verificações automatizadas suficientes.

A prioridade é tornar essa organização previsível e verificável, preservando o comportamento que já foi testado. Não houve alteração de componentes, estilos, rotas, traduções ou serviços nesta etapa. Este documento é a única entrega nova.

Foram examinados a árvore versionada, 106 arquivos textuais e o lockfile. O conteúdo dos 106 arquivos foi conferido contra os hashes dos arquivos da revisão indicada. A leitura incluiu código, testes, configuração, instruções do projeto e documentação; não foi uma auditoria de segurança completa nem uma medição de cobertura.

A última execução informada por Bruna passou em 22 arquivos e 131 testes, com build concluído e quatro rotas prerenderizadas. Esses resultados pertencem ao código levado à PR #37. Não executei novamente a suíte completa ou o build da revisão exata nesta auditoria. As verificações feitas aqui foram estáticas.

## 2. Como encontrar as responsabilidades hoje

| Local atual                                                           | Responsabilidade                                                                        |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/app/app.*`                                                       | Estrutura da aplicação: marca, navegação, idioma e ponto onde as páginas aparecem.      |
| `src/app/app.routes.ts`                                               | Rotas principais e entradas de carregamento sob demanda.                                |
| `src/app/app.routes.server.ts`                                        | Decide quais caminhos são prerenderizados ou renderizados no navegador.                 |
| `src/app/core/i18n/`                                                  | Carregamento das traduções, preferência de idioma e integração com o navegador.         |
| `src/app/pages/home/`                                                 | Página inicial e suas partes visuais.                                                   |
| `src/app/pages/posts/posts.ts`                                        | Conecta formulário e rota às ações da store; não concentra toda a lógica de Posts.      |
| `src/app/pages/posts/posts.store.ts`                                  | Busca, paginação, navegação e transições do estado da listagem.                         |
| `src/app/pages/posts/wordpress-posts.service.ts`                      | Consulta WordPress e transforma seu formato de resposta no modelo usado pela interface. |
| `src/app/pages/posts/post-card/`                                      | Apresentação de um post, incluindo a data localizada.                                   |
| `src/app/pages/matrix/catalog/`                                       | Catálogo dos experimentos disponíveis.                                                  |
| `src/app/pages/matrix/matrix.*`                                       | Experimento de comunicação entre pai e filho; o nome genérico esconde essa função.      |
| `src/app/pages/matrix/message-node/`, `flow-guide/`, `code-carousel/` | Partes desse experimento, hoje misturadas no nível principal de Matrix.                 |
| `src/app/pages/matrix/rest-api/`                                      | Experimento REST, serviço NASA, contratos e componentes visuais próprios.               |
| `public/i18n/` e `public/images/`                                     | Traduções e imagens publicadas como arquivos estáticos.                                 |
| `docs/` e `scripts/`                                                  | Documentação e ferramentas de apoio; não são código de interface.                       |

Um service não precisa obrigatoriamente de uma pasta individual. Precisa ter um lugar previsível, perto da funcionalidade que atende. Uma pasta global com todos os services juntaria tecnologias, mas separaria assuntos que deveriam continuar próximos.

### Rotas que a reorganização deve preservar

| Caminho                                        | Carregamento no navegador                                                     | Renderização configurada |
| ---------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------ |
| `/`                                            | Home importada diretamente na configuração principal.                         | Prerender.               |
| `/posts`, `/posts/paged`, `/posts/paged/:page` | `loadChildren` carrega a configuração da área; `loadComponent` carrega Posts. | Client.                  |
| `/matrix`                                      | `loadChildren` da área e `loadComponent` do catálogo.                         | Prerender.               |
| `/matrix/components`                           | `loadComponent` do experimento de comunicação.                                | Prerender.               |
| `/matrix/rest-api`                             | `loadComponent` do portal REST.                                               | Client.                  |
| `/maya`                                        | `loadComponent` de Māyā.                                                      | Prerender.               |

Mover arquivos não exige mudar URLs. Também não deve transformar imports dinâmicos em imports diretos de componentes na configuração principal.

## 3. O que já merece ser preservado

- Os arquivos de componente e seus testes estão próximos, e o projeto já usa nomes sem o sufixo obrigatório `.component`.
- Posts possui uma store fornecida na configuração de suas rotas. Essa escolha delimita seu escopo; não devemos transferi-la automaticamente para o escopo global.
- Os serviços recebem a URL da API por injeção de dependência e podem ser testados sem usar o servidor real.
- WordPress é convertido em `Post`; NASA é convertida em `PortalImageViewModel`. A interface não precisa conhecer toda a resposta externa.
- Há limpeza de assinaturas com `takeUntilDestroyed` e integração com `toSignal`. Os fluxos de busca usam `switchMap`.
- O portal distingue resposta HTTP, chegada dos metadados e carregamento da imagem. Seus testes cobrem cancelamento, resposta antiga, retry e falha do arquivo de imagem.
- Os dois arquivos de tradução têm as mesmas 214 chaves finais.
- Existe configuração de EditorConfig, Prettier e limites de tamanho no build.

Esses pontos não dispensam revisão; mostram quais contratos uma mudança não pode romper.

### Um cuidado com as versões

O lockfile fixa TypeScript 6.0.3 e Angular Compiler CLI 22.1.3. Embora `strict` e `strictTemplates` não estejam escritos no `tsconfig.json`, não devem ser classificados como desligados: TypeScript 6 passou a adotar `strict` por padrão; o compilador Angular instalado nessa versão também trata `strictTemplates` como ativo sem um opt-out explícito.

Conferi os defaults no compilador instalado, da mesma versão registrada no lockfile. Tornar a intenção explícita pode ajudar a leitura da configuração, mas seria documentação da política, não ativação inédita de uma proteção. [Mudanças de defaults no TypeScript 6](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html#simple-default-changes).

## 4. Achados e prioridades

“Prioridade alta” significa tratar cedo, não uma vulnerabilidade crítica. Riscos potenciais estão identificados como tal; não são bugs já reproduzidos.

### A01 — Região principal de acessibilidade duplicada

Prioridade alta. Evidência: `app.html` contém `<main>` envolvendo o `router-outlet`. Tanto `matrix-catalog.html` quanto `rest-api-portal.html` começam com outro `<main>`. Nessas rotas, a página acaba com regiões principais aninhadas.

A região principal ajuda tecnologias assistivas a encontrar o conteúdo central. A recomendação é um landmark principal por página, em nível superior. [Orientação W3C para main](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/main.html).

Proposta: manter o `main` da estrutura da aplicação e substituir apenas os invólucros internos apropriados. Revisar seletores antes da troca. Validar a página composta por App e rota, não apenas cada componente isoladamente, além de conferir desktop e mobile.

### A02 — Qualidade ainda depende de comandos manuais

Prioridade alta. Evidência: `package.json` não oferece `lint`, `format:check` ou uma validação conjunta. Não há configuração/target de ESLint nem workflow de CI na árvore examinada. Prettier instalado não significa formatação verificada automaticamente.

Proposta: definir comandos de formatação, lint de TypeScript/templates, testes sem watch e build. Depois, executá-los em CI nas PRs. CI é a execução automática dessas verificações fora do computador da autora.

A implantação precisa usar versões compatíveis com Angular 22, instalação reproduzível com o lockfile e alterações pequenas. Não misturar uma formatação geral com refactors de comportamento na mesma revisão.

### A03 — Decisões e contratos sem documentação de código

Prioridade média, central ao objetivo da issue. Evidência: a análise sintática não encontrou blocos de documentação `/** ... */` nos arquivos TypeScript de `src/app`. Existem comentários pontuais em inglês, como os que explicam o status HTTP zero e o uso da URL devolvida pela NASA. Portanto, não é correto dizer que o projeto inteiro possui zero comentários.

Proposta: documentar em português responsabilidades, contratos e decisões não óbvias, com TSDoc. Começar por `PostsStore`, serviços HTTP, preferência de idioma e fluxo do portal. A seção 6 define o padrão proposto.

### A04 — A organização de Matrix não revela seus experimentos

Prioridade média. Evidência: catálogo e REST têm pastas próprias, mas o experimento pai–filho ocupa `matrix.*` e distribui seus filhos no nível da área.

Proposta: dar ao experimento uma pasta e um nome específicos. Manter `matrix.routes.ts` como entrada da área. Ao renomear, atualizar imports, testes e também os nomes/trechos apresentados pelo carrossel didático.

### A05 — A store permite contornar suas próprias ações

Prioridade média. Evidência: `PostsStore.search` usa `asReadonly()`, enquanto `viewMode` e `currentPage` expõem Signals graváveis. Outro consumidor pode chamar `.set()` diretamente e evitar a lógica que sincroniza estado, rota e requisição. É uma fragilidade de contrato, não um erro visual observado.

Proposta: manter os Signals graváveis privados e expor leituras públicas. Antes, caracterizar as transições que precisam permanecer iguais.

Signals são valores reativos: consumidores leem o valor atual, e Angular acompanha essas leituras. `readonly` impede substituir a referência da propriedade; não remove os métodos de escrita do Signal. `asReadonly()` oculta `set` e `update` na API exposta, mas não congela profundamente objetos. [Signals no Angular](https://angular.dev/guide/signals).

Exemplo proposto, ainda não aplicado:

```ts
private readonly currentPageState = signal(1);
readonly currentPage = this.currentPageState.asReadonly();
```

A store escreveria em `currentPageState`; a interface continuaria lendo `currentPage()`.

### A06 — Cobertura desigual nas integrações e transições

Prioridade média. Evidência: WordPress tem três testes de serviço, concentrados em resposta válida, página padrão e limite de itens. Posts possui onze testes de página que exercitam também a store indiretamente; não existe um `posts.store.spec.ts` específico. Ausência desse arquivo não significa ausência completa de testes da store.

Proposta: acrescentar casos de erro e timeout em WordPress; falha ao carregar mais, retry preservando a lista, deduplicação e busca antiga em Posts. Verificar requisições pendentes e canceladas de forma apropriada. O número total de testes não substitui a identificação dessas lacunas.

Não mudar silenciosamente a regra de falha quando categorias ou mídia do WordPress não respondem. Uma degradação parcial pode ser útil, mas é uma decisão de comportamento, não mera organização.

### A07 — Arquivos extensos pedem revisão por responsabilidade

Prioridade média, com extrações condicionadas a benefício. Linhas do código-fonte examinado, sem linhas vazias finais:

| Arquivo                | Linhas | O que revisar                                                |
| ---------------------- | -----: | ------------------------------------------------------------ |
| `sanctuary-hero.scss`  |    793 | Estilos de partes visuais, animações e regras responsivas.   |
| `matrix.scss`          |    647 | Separação das áreas do experimento e organização das regras. |
| `posts.scss`           |    500 | Controles, estados, grade e navegação.                       |
| `rest-api-portal.scss` |    425 | Estrutura da página versus responsabilidade dos filhos.      |
| `arcane-portal.scss`   |    414 | Efeito visual, estados e redução de movimento.               |
| `posts.store.ts`       |    265 | Ações, sincronização de rota e reducer de estado.            |
| `rest-api-portal.ts`   |    180 | Estado do experimento e coordenação de requisições.          |
| `posts.ts`             |     88 | Já delega grande parte da lógica.                            |
| `matrix.ts`            |     78 | É pequeno; seu principal problema aqui é nome/localização.   |

Um arquivo SCSS longo não prova que a classe do componente tem responsabilidades demais. Importar parciais SCSS melhora navegação, mas não reduz automaticamente o CSS compilado.

Proposta: organizar estilos por seção e extrair somente responsabilidades claras. Preservar os limites atuais do build: bundle inicial com warning em 500 kB e erro em 1 MB; estilo de componente com warning em 9 kB e erro em 12 kB. Não aumentar limites apenas para encerrar uma checagem.

### A08 — Pequenas inconsistências que podem crescer

Prioridade baixa ou follow-up:

- `matrix.html` possui `aria-label="Angular concepts"` fixo em inglês. Revisar textos destinados a tecnologias assistivas, não apenas os visíveis.
- Os dois carrosséis repetem navegação entre trechos. Comparar necessidades antes de criar um componente comum; compartilhar conteúdo didático distinto pode dificultar a leitura.
- O limite de busca de 60 caracteres aparece no portal e no serviço NASA. Definir uma fonte de verdade dentro dessa área, sem criar um arquivo global de constantes.
- A data do portal valida formato/calendário; PostCard monta a data sem validação equivalente. Caracterizar valores inválidos antes de compartilhar uma função.
- `PostsQuery` e `PostsPage` são exportados pelo arquivo do serviço; `MatrixReply` é exportado pelo filho e consumido pelo pai. Contratos usados por vários participantes podem ter arquivos de modelos próprios.
- Os trechos de código educativos repetem partes da implementação. Toda alteração correspondente precisa revisar esses exemplos para não ensinar um código desatualizado.

### A09 — Tipagem externa não é validação em execução

Prioridade média para caracterização; mudança depende do contrato de erro. O DTO NASA contém campos opcionais e o mapper ignora registros incompletos, mas pressupõe arrays e strings quando os campos existem. Um campo presente com tipo inesperado pode lançar um erro.

O tipo genérico de `HttpClient.get<T>()` não verifica o JSON recebido em execução. É uma declaração para o compilador. [Contrato do HttpClient](https://angular.dev/guide/http/making-requests).

Proposta: adicionar respostas malformadas aos testes e decidir o comportamento esperado. Se necessário, validar na fronteira HTTP. Não assumir que optional chaining transforma dados arbitrários em dados válidos, nem instalar uma biblioteca de schema sem necessidade demonstrada.

## 5. Convenção de pastas proposta

A unidade principal continua sendo a funcionalidade: Home, Posts, Matrix e Māyā. Dentro de áreas com várias responsabilidades, nomes como `data-access`, `state`, `models` e `ui` indicam onde procurar.

Isso acompanha a orientação de organizar por área funcional e manter arquivos relacionados próximos. Não exige uma pasta para cada tipo nem a renomeação de `pages` para `features`. [Guia de estilo Angular](https://angular.dev/style-guide).

| Atual                                                   | Destino proposto                                           | Motivo                                                 |
| ------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| `matrix/matrix.*`                                       | `matrix/component-communication/component-communication.*` | Nomear o experimento, não confundi-lo com toda Matrix. |
| `matrix/message-node/`, `flow-guide/`, `code-carousel/` | `matrix/component-communication/ui/` com suas pastas       | Mostrar a quem esses componentes pertencem.            |
| Contratos pai–filho no arquivo do filho                 | `matrix/component-communication/models/`                   | Explicitar o contrato da comunicação.                  |
| `posts/wordpress-posts.service.*`                       | `posts/data-access/wordpress-posts.service.*`              | Local previsível da integração WordPress.              |
| `posts/posts.store.ts`                                  | `posts/state/posts.store.ts`                               | Local previsível das transições da listagem.           |
| `posts/post.ts` e contratos compartilhados              | `posts/models/`                                            | Separar modelos da aplicação do cliente HTTP.          |
| `posts/post-card/`                                      | `posts/ui/post-card/`                                      | Identificar componente de apresentação da área.        |
| `matrix/rest-api/nasa-images.service.*`                 | `matrix/rest-api/data-access/nasa-images.service.*`        | Manter a integração no experimento que a utiliza.      |
| `matrix/rest-api/rest-api.models.ts`                    | `matrix/rest-api/models/rest-api.models.ts`                | Tornar os contratos fáceis de localizar.               |
| Filhos visuais do portal REST                           | `matrix/rest-api/ui/` com suas pastas                      | Separar composição da página de suas partes.           |

Regras complementares:

- A página principal e a configuração de rotas ficam na entrada de cada área.
- TypeScript, HTML, SCSS e spec de cada componente continuam juntos.
- DTO privado, usado por um único serviço, pode permanecer nesse serviço.
- `core` guarda infraestrutura realmente transversal; não todo service.
- Criar `shared` somente para reutilização real entre áreas. Um filho do portal não é global só por ser pequeno.
- Evitar arquivos vagos como `utils.ts`, `helpers.ts` ou `common.service.ts`; nomear o assunto.
- Não acrescentar barrels `index.ts` em todas as pastas por costume. Imports devem continuar revelando as dependências.
- As propostas acima não autorizam uma movimentação geral em uma única PR.

Na árvore versionada examinada não há LEIA-ME versionados na raiz. Arquivos locais baixados anteriormente não podem ser considerados desnecessários sem revisão. O projeto mantém apenas `README.md` como apresentação principal; documentação técnica vive em `docs/`, com links de navegação no README numa entrega posterior.

## 6. Comentários, métodos e classes

### TSDoc em português

TSDoc padroniza comentários de documentação para TypeScript. O bloco `/** ... */` pode apresentar um resumo e usar tags como `@param`, `@returns` e `@remarks`. A última separa explicações detalhadas do resumo. Os tipos permanecem na assinatura TypeScript. [TSDoc](https://tsdoc.org/), [@remarks](https://tsdoc.org/pages/tags/remarks/).

Padrão proposto para Sanaka:

- Descrever o que uma classe coordena e o que fica sob responsabilidade de outra.
- Documentar efeitos importantes: navegação, cancelamento, preservação da lista, cache e relação entre estados.
- Explicar pressupostos de dados, limites e fallbacks que não sejam óbvios.
- Usar tags quando agregam informação, não preencher um formulário em todo método.
- Escrever identificadores em inglês e explicações em português.
- Atualizar o comentário na mesma mudança que altera o contrato.
- Não deixar código morto comentado nem histórico de alterações no código; Git guarda esse histórico.

Exemplo de bloco que poderemos colocar acima de `PostsStore.setViewMode`, sem mudar o corpo do método:

```ts
/**
 * Troca o modo de leitura e reinicia a listagem na primeira página.
 *
 * @remarks
 * Também atualiza a rota e solicita uma nova listagem.
 * Se o modo já estiver ativo, não navega nem repete a requisição.
 *
 * @param mode - Modo de leitura escolhido pela pessoa.
 */
```

Comentário inline útil:

```ts
// Preserva os posts já exibidos quando apenas a próxima página falha.
```

Comentário redundante:

```ts
// Define a página como 1.
this.currentPage.set(1);
```

A intenção é deixar o código bem explicado. Não contar comentários nem comentar cada atribuição: documentar o que outra pessoa precisaria descobrir percorrendo várias linhas ou arquivos.

### Ordem e acesso dos membros

Proposta de leitura: dependências e contratos de entrada/saída; estado privado antes dos valores que dele dependem; estado exposto/derivado; inicialização; ações; auxiliares privados próximos de seus usos.

Essa ordem não é decorativa. Inicializadores executam na ordem declarada: reorganizá-los exige conferir suas dependências. Um construtor que conecta uma assinatura não é equivalente a um método chamado após um clique.

Métodos devem ter nomes que indiquem a ação, poucas responsabilidades e guard clauses claras. `private` protege detalhes internos; membros destinados apenas ao template podem usar `protected`, desde que testes e contratos sejam revistos. Não acrescentar acessos públicos só para facilitar um teste.

Não transferir automaticamente lógica para `ngOnInit`. Por exemplo, `takeUntilDestroyed()` sem um `DestroyRef` explícito depende de contexto de injeção; mudar o ponto da chamada exige preservar essa condição. [Contrato de takeUntilDestroyed](https://angular.dev/api/core/rxjs-interop/takeUntilDestroyed).

## 7. Arquitetura Hexagonal: avaliação, não selo

Arquitetura Hexagonal, ou Ports and Adapters, busca separar a lógica da aplicação das tecnologias externas. Uma porta define uma conversa por contrato; um adaptador traduz uma tecnologia para esse contrato. O hexágono não exige seis pastas ou seis camadas. [Explicação original de Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture).

Em Sanaka, interfaces de resposta, modelos próprios e serviços HTTP já ajudam a separar formatos externos da apresentação. Isso não torna a aplicação uma implementação hexagonal completa: a store de Posts depende diretamente de Router e do serviço concreto.

Uma URL injetável também não é, por si só, uma porta de aplicação. Seria necessário definir um contrato de capacidade, como buscar posts, e separar sua implementação tecnológica.

Recomendação atual: organização por funcionalidade, fronteiras HTTP claras e regras testáveis. Avaliar uma porta quando houver uma necessidade concreta de trocar provedores ou testar regras independentes de Angular. Não adicionar interfaces, adaptadores e casos de uso vazios para aparentar uma arquitetura mais complexa.

## 8. Sequência de entregas e checagens

| Entrega                  | Conteúdo                                                          | Condição para avançar                                |
| ------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------- |
| 1. Diagnóstico           | Este documento e decisão sobre as convenções.                     | Entender e aprovar nomes e responsabilidades.        |
| 2. Correções delimitadas | Landmark principal e texto assistivo não localizado.              | Teste da composição real, idiomas e revisão visual.  |
| 3. Contratos de Posts    | Caracterização das transições, encapsulamento e comentários.      | Busca, paginação, erro e retry preservados.          |
| 4. Organização de Matrix | Agrupar comunicação pai–filho; depois revisar REST separadamente. | Imports dinâmicos, URLs, exemplos e testes corretos. |
| 5. Organização de Posts  | Separar data-access, state, models e ui conforme aprovado.        | Escopo da store e contratos de HTTP preservados.     |
| 6. Automação             | Formatação, lint e CI em revisão própria.                         | Versões compatíveis e checagens reproduzíveis.       |
| Follow-ups               | Estilos extensos, extrações e validação externa justificadas.     | Benefício demonstrado, sem redesign disfarçado.      |

A issue não deve virar uma promessa de reescrever todas as áreas de uma vez. Extrações grandes podem gerar issues próprias. Critério de aceite de cada refactor: mostrar responsabilidade antes/depois, razão da mudança e evidência de comportamento preservado.

Sempre revisar: PT-BR/en, foco e teclado, mobile, movimento reduzido, estados de carregamento/erro, rotas, renderização e trechos didáticos afetados. Um teste unitário com DOM simulado não comprova estabilidade visual ou toda a navegação assistiva.

### Git e validação, sem comandos destrutivos

Na branch local `chore/36-code-quality-audit`, este diagnóstico foi preservado em `docs/architecture/code-quality-baseline.md`. O `README.md` não foi substituído nesta entrega.

Para inspecionar o que mudou:

```powershell
git status -sb --untracked-files=all
git diff --check
git diff --stat
```

`status` mostra alterações e arquivos novos. `diff --check` procura problemas de whitespace, não bugs de lógica. `diff --stat` resume mudanças em arquivos rastreados; arquivos novos só passam a aparecer nesse diff quando adicionados ao stage.

Depois de conferir o documento e quando for preparar o commit:

```powershell
git add -- docs/architecture/code-quality-baseline.md
git diff --cached --check
git diff --cached --stat
```

`add` prepara o conteúdo que entrará no próximo commit. `--cached` inspeciona exatamente essa preparação. Não usar `git add .` para incluir sem revisão alterações de outras entregas.

Para estabelecer ou repetir a linha de base antes de alterar a aplicação:

```powershell
npx ng test --watch=false

if ($LASTEXITCODE -eq 0) {
  npx ng build
}
```

O código de saída zero indica sucesso do processo. Esse bloco evita executar o build após falha nos testes; não deve ser interpretado como prova de que testes, lint, acessibilidade e arquitetura foram todos verificados.

Ao concluir cada entrega, o repasse didático deve explicar conceitos utilizados, fluxo de execução, arquivos afetados, validações realizadas e comandos Git empregados. O objetivo é que a autora consiga entender e defender as decisões, não apenas reproduzir alterações.
