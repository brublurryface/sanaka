# Auditoria de qualidade do código

Branch: `chore/36-code-quality-audit`

## Objetivo

Tornar a estrutura do Sanaka fácil de percorrer e manter, com responsabilidades visíveis,
tipagem estrita e verificações reproduzíveis. A organização adotada usa convenções pragmáticas
do Angular; ela não cria camadas ou abstrações sem uma responsabilidade concreta.

## Linha de base

- 22 arquivos de teste e 131 testes aprovados;
- cobertura TypeScript de 94,63% de instruções, 91,91% de branches, 93,79% de funções e
  93,28% de linhas antes da refatoração de métodos;
- duplicação de 0,89% no TypeScript de produção e 4,77% no conjunto de TypeScript, HTML e SCSS;
- build de produção aprovado;
- quatro rotas prerenderizadas;
- bundles dentro dos limites configurados no Angular;
- nenhuma ocorrência de `any` no código de produção.

## Mudanças concluídas

### Acesso a dados

Serviços que atravessam a fronteira da aplicação foram agrupados em `data-access/`, mantendo
seus testes ao lado da implementação:

- `pages/posts/data-access/wordpress-posts.service.ts`;
- `pages/matrix/rest-api/data-access/nasa-images.service.ts`.

Stores e componentes continuam na raiz da feature quando coordenam estado ou apresentação.
`data-access` identifica comunicação com fontes externas; não é apenas um novo nome para toda
classe terminada em `Service`.

### Verificações automatizadas

- TypeScript estrito e templates Angular estritos;
- detecção de variáveis e parâmetros não utilizados;
- comandos `format`, `format:check`, `test:ci` e `check`;
- `test:coverage` mede apenas a lógica TypeScript de produção, sem arquivos declarativos de rotas,
  e exige pelo menos 85% em instruções, branches, funções e linhas;
- `duplication:check` impede que a duplicação do TypeScript de produção ultrapasse 3%;
- `duplication:report` também inspeciona HTML e SCSS para orientar refatorações visuais;
- `check` executa formatação, testes com cobertura, duplicação e build em sequência.

### Métodos e complexidade

O tamanho em linhas é usado como sinal de revisão, não como regra isolada. A decisão considera
quantidade de responsabilidades, ramificações e esforço necessário para acompanhar o fluxo.

- `WordPressPostsService.getPosts` passou a coordenar normalização, requisição e montagem da página
  por meio de métodos privados com responsabilidades nomeadas;
- `NasaImagesService.mapResponse` delega a busca e a conversão de cada item da NASA;
- `PostsStore.reduceState` explicita os três eventos da união discriminada e delega cada transição;
- `WordPressPostsService.mapPosts` permaneceu coeso; não foi fragmentado apenas por sua contagem
  de linhas.

## Próximas decisões

### Home e arquitetura de informação

A navegação principal oferece Home, Posts, Matrix e Māyā, mas a seção de caminhos da Home
apresentava apenas Posts e Māyā. A Matrix foi incorporada como o segundo caminho, entre Leituras
e Māyā, para que a seção represente os três núcleos atualmente acessíveis do Sanaka.

### Comentários e documentação

- comentários e TSDoc são escritos em português;
- contratos e métodos públicos recebem TSDoc quando a intenção, a fronteira ou o retorno precisam
  ser explicitados;
- comentários internos registram decisões e cuidados que o código não revela sozinho;
- nomes claros substituem comentários que apenas narrariam a implementação;
- explicações didáticas extensas pertencem à documentação, não ao meio de um método.

### Limites internos do portal REST

`NasaImagesService` ainda consulta a configuração visual dos presets para decidir quando trocar
uma busca textual por um `nasa_id`. Em uma separação mais rigorosa, o componente entrega ao
acesso a dados os parâmetros já escolhidos, e o serviço apenas executa e converte a resposta.

### Estado de Posts

`PostsStore` concentra sincronização de rota, paginação, busca e redução de estado. A redução foi
separada por evento, mas o arquivo deve continuar sendo acompanhado: uma nova responsabilidade
será o sinal para extrair navegação ou redução, não apenas o número de linhas atual.

### Rotas desconhecidas

Não existe uma rota curinga no navegador. Uma URL inválida não recebe experiência de “não
encontrado” nem retorno explícito para a Home.

### Arquivos de estilo extensos

Os estilos do hero da Home e das páginas da Matrix são os maiores arquivos do projeto. O build
continua dentro dos budgets. A análise encontrou 6,81% de linhas duplicadas em SCSS, sobretudo
entre os dois exploradores de código da Matrix. Esse valor permanece visível no relatório completo,
mas ainda não bloqueia o `check`: a extração deve preservar as variações visuais e partir de um
padrão reutilizável claro, em vez de criar mixins apenas para reduzir uma métrica.
