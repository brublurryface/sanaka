# Auditoria de qualidade do código

Branch: `chore/36-code-quality-audit`

## Objetivo

Tornar a estrutura do Sanaka fácil de percorrer e manter, com responsabilidades visíveis,
tipagem estrita e verificações reproduzíveis. A organização adotada usa convenções pragmáticas
do Angular; ela não cria camadas ou abstrações sem uma responsabilidade concreta.

## Linha de base

- 22 arquivos de teste e 131 testes aprovados;
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
- `check` executa formatação, testes e build em sequência.

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

`PostsStore` concentra sincronização de rota, paginação, busca e redução de estado. O arquivo
ainda está coerente, mas deve ser acompanhado: uma nova responsabilidade será o sinal para
extrair navegação ou redução de estado, não apenas o número de linhas atual.

### Rotas desconhecidas

Não existe uma rota curinga no navegador. Uma URL inválida não recebe experiência de “não
encontrado” nem retorno explícito para a Home.

### Arquivos de estilo extensos

Os estilos do hero da Home e das páginas da Matrix são os maiores arquivos do projeto. O build
continua dentro dos budgets; portanto, a questão é navegabilidade e repetição, não tamanho de
bundle. A extração deve ocorrer somente quando surgir um padrão reutilizável claro.
