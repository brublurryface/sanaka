# Livros e tags sob demanda

Data: 04/11/2026. Issue: #70. Escopo: restante de A05 e A10 da auditoria de
03/11/2026. Base: `b7ee8866ffc06034f32d1a49fe8106e5e9f3ecf5`, da PR #69.

A paginação das categorias e a resolução de filtros por slug já foram tratadas
na PR #67. Esta etapa completa o recorte com a biblioteca incremental e as tags
da leitura, em branch própria e sem publicação.

## Biblioteca

O serviço devolve uma página normalizada de livros, com número da página,
tamanho, total e total de páginas. A primeira consulta pede doze volumes. O
botão **Carregar mais livros** consulta somente a próxima página; não há
prefetch das demais. Em um catálogo de 101 livros, a entrada carrega doze e o
último volume fica na nona página.

`X-WP-Total` e `X-WP-TotalPages` precisam ser inteiros seguros, não negativos e
coerentes com a quantidade de linhas e o tamanho solicitado. A ausência da
categoria opcional representa uma página vazia confirmada; falha na política
editorial obrigatória impede a consulta. Os IDs continuam resolvidos no CMS.

A interface preserva os livros durante a carga adicional e durante uma falha.
A tentativa manual repete a página que falhou, sem avançar o contador antes do
sucesso. Cliques concorrentes são bloqueados, registros sobrepostos são
deduplicados pelo ID e sair da biblioteca cancela a consulta em andamento.
Progresso, erros, indicador de carga e botão têm rótulos em português e inglês,
com `role="status"`, `role="alert"`, `aria-busy` e `aria-controls`.

Ordem crescente de publicação, capas independentes da imagem destacada, títulos
em maiúsculas via CSS, abertura em nova aba e exclusões de WoD permanecem
preservados. A coleção não é limitada a cem registros.

## Tags do artigo e sugestões

A leitura deixa de consultar os primeiros cem termos do vocabulário global.
As tags atribuídas são consultadas por `post=<id>`, com projeção `id,name,slug`.
Se o post não tem tags, essa consulta é dispensada. Se um único artigo possui
mais de cem tags, suas páginas são percorridas com os totais da própria resposta;
um erro intermediário não apresenta uma lista parcial como se estivesse
completa. Não foi imposto um limite editorial às tags que a autora atribuiu.

As sugestões usam um critério separado e explícito:

1. Consultar os cinco posts mais recentes que compartilham categorias com o
   artigo, incluindo descendentes e excluindo o próprio post.
2. Aplicar a mesma fronteira editorial da navegação: o arquivo comum exclui
   WoD e Sanakaverse; um volume permanece no ramo Sanakaverse e exclui WoD.
3. Projetar somente `tags,categories`, rejeitar amostras de coleções estranhas e
   selecionar até oito IDs distintos que não sejam tags do artigo.
4. Consultar somente esses termos por `include`, com limite de oito e
   `orderby=include`. Sem candidatos, não há nova consulta de tags.

Navegação e sugestões compartilham a definição da coleção na própria camada
de acesso a dados. O corpo continua sendo emitido antes dos complementos.
Tags atribuídas, sugestões e navegação degradam independentemente; timeouts ou
falhas desses enriquecimentos preservam texto, SEO, progresso de leitura e
estado do óbolo. A troca de slug cancela as consultas antigas, inclusive uma
página de termos ou amostra contextual em andamento.

O carregamento de tags acontece durante a visita ao artigo. As sugestões são
limitadas, mas ainda podem exigir duas consultas opcionais adicionais: uma
amostra de posts e seus termos selecionados. Não há consulta global de todas
as tags, nem cache eterno desse vocabulário.

## Validação

Dependências instaladas com `npm ci --no-audit --no-fund` e o lockfile, Node
24.22.1. Os testes iniciais reproduziram os dois defeitos antes da correção:
consulta de cem volumes na entrada e tags sem filtro pelo artigo.

| Verificação                   | Base da PR #69 | Esta etapa                  |
| ----------------------------- | -------------- | --------------------------- |
| Testes Angular                | 554 passaram   | 592 passaram                |
| Testes do servidor            | 126 passaram   | 126 passaram                |
| Cobertura de linhas Angular   | 96,60%         | 96,66%                      |
| Cobertura de branches Angular | 94,23%         | 94,03%                      |
| Build de produção             | Aprovado       | Aprovado                    |
| Bundle inicial                | 418,65 kB      | 420,39 kB                   |
| Rotas prerenderizadas         | 10             | 10                          |
| Duplicação                    | 14 grupos      | 14 grupos, 1,12% das linhas |

Foram acrescentados 38 casos: 16 do adaptador de livros, quatro da interface e
18 das tags. Há fixtures de 101 livros e vocabulários de 101/200/250 termos;
artigos com 0/1/100/101/200/250 tags; limites de consultas, políticas migradas,
metadados inválidos, timeout, falha intermediária, cancelamento por saída ou
troca de slug e isolamento de WoD/volumes. As regressões de leitura e dos nove
ciclos também passaram com os contratos atualizados.

A inspeção no navegador usou uma cópia isolada com respostas HTTP simuladas.
Os sete arquivos de produto alterados foram comparados byte a byte com a
branch antes do build. Foram conferidos entrada com doze livros, falha na
segunda página mantendo os doze, tentativa via Enter carregando 24, chegada ao
volume 101 e retirada do botão ao terminar. Os links mantiveram `_blank` e
`noopener`. Em frames de 320/390 pixels, os controles e mensagens couberam sem
rolagem horizontal; o botão observado tinha cerca de 52 pixels de altura. No
artigo simulado, apareceram a tag atribuída e oito sugestões com links internos,
sem erro no conteúdo. Fixture e arquivos da prévia não fazem parte da PR.

Somente com GET público e sem credenciais, a API real confirmou os parâmetros
`post`, `include`, projeções e totais: vinte tags de um artigo, quatro livros na
consulta inicial e uma amostra contextual restrita à coleção. Esses números
são observações do protocolo nesta data, não um teste de carga. A conexão
WPVibe continua registrada no endereço anterior e recusou encaminhar
credenciais ao redirecionamento; nenhuma configuração foi alterada.

O comando agregado `npm run check` ainda para na formatação preexistente de
`docs/render-deployment.md`. As etapas funcionais foram executadas
individualmente e os arquivos alterados passam na formatação. Os resultados
acima não representam aprovação desse comando agregado.

## Limites e próximos recortes

Não foram medidos LCP, memória ou latência em produção; as inspeções de largura
não equivalem a testes em aparelho físico ou leitor de tela. A paginação por
offset não congela o catálogo: edições durante a visita podem deslocar livros
entre páginas. A deduplicação evita repetir um mesmo volume, mas um snapshot
editorial ou uma ordem dedicada exigiria decisão própria. A ordenação existente
por data não foi substituída.

Retenção de cards em listas longas, SSR, cache editorial geral e infraestrutura
permanecem nas etapas próprias. O próximo recorte previsto é A11/A12/A13,
contratos compartilhados pequenos. WordPress, Render, produção, animações e
artes não foram modificados.

## Referências de protocolo

- [Paginação da REST API](https://developer.wordpress.org/rest-api/using-the-rest-api/pagination/)
- [Tags: post, include, ordenação e projeção](https://developer.wordpress.org/rest-api/reference/tags/)
