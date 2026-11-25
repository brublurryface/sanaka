# Auditoria de reutilização de estilos

## Linha de base

Revisão da main: `b54b64e`. O relatório local de 24/11/2026 registrou 39 clones SCSS,
332 linhas duplicadas (4,10%) e 2604 tokens duplicados (5,70%) em 28 arquivos de `src/app`.
O total combinado de TypeScript, HTML e SCSS ficou em 2,08% de linhas duplicadas. O limite
combinado de 3% não garante o mesmo limite por linguagem. Os estilos globais em `src/styles`
não participam desse relatório; a medição futura precisa explicitar o escopo.

## Primeira intervenção

- `src/styles/_editorial-typography.scss`: contratos tipográficos de títulos de página,
  introduções e rótulos editoriais. Os valores continuam nos tokens de `src/styles.scss`.
  About e Sanaka-loka preservam a família definida no seletor agrupado; Contact conserva
  seu peso explícito e PostDetail conserva sua escala editorial particular. Matrix, Catalog,
  REST, Posts e NotFound reutilizam o papel completo do título. Home, Sanctuary Paths e
  o estilo global reutilizam o rótulo editorial, preservando o token alternativo da Home.
- `src/app/pages/matrix/rest-api/_portal-controls.scss`: aparência comum da ação de busca
  e dos botões do Arcane Portal. Não compartilha eventos, estados de foco, dimensões ou
  comportamento, que continuam sob responsabilidade de seus componentes.

Os mixins foram escolhidos para preservar os seletores encapsulados, a ordem das declarações
e a especificidade. Eles centralizam a manutenção do código-fonte, mas não prometem reduzir
o CSS compilado. Cada substituição foi conferida por expansão textual reversível contra o
arquivo original. Compilação Sass e validação em navegador ainda dependem do CI.

## Inventário de investigação restante

- Layout e fundo editorial: Matrix/Catalog/REST, NotFound/Saṃvit e larguras de About.
- Tipografia de títulos de seção, assinatura, etiquetas e metadados: separar papéis de
  coincidências de valores; conferir Posts, PostDetail, Saṃvit, Contact e Newsletter.
- Foco e ações: App/Home, Posts, Flow Guide/Matrix e REST/Arcane Portal; conferir contraste,
  teclado e estados desabilitados antes de unificar regras.
- Responsividade: Home/Posts e variantes locais de quebra de linha; preservar diferenças
  de breakpoints e não contar comentários ou fechamentos de blocos como responsabilidades.
- Movimento reduzido: App e Home possuem animações independentes; não criar abstração
  compartilhada apenas pela repetição de uma media query.
- Templates de óbolos e arquivos TypeScript gerados: investigar em entregas próprias.

Não relaxar o limite global nem criar exclusões para obter aprovação artificial. O próximo
relatório deverá comparar os resultados por linguagem, revisar o escopo dos estilos globais
e distinguir semelhanças textuais de duplicações de responsabilidades.
