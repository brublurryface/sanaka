# Janela de paginação e recuperação de páginas de Posts

Data: 04/11/2026. Issue: #68. Escopo: A04 e a parte de A09 referente a URLs
inválidas, páginas fora de alcance e cancelamento de consultas antigas.

Base: `099c8c97ca3236c91ef8db52f86d802d470c60fb`, da PR #67, que depende da
PR #66. Esta alteração fica em branch própria e não publica a aplicação.

## Comportamento corrigido

O arquivo criava um botão para cada página, mesmo com milhares de páginas.
Agora a janela tem no máximo sete itens, incluindo reticências, e sempre oferece
a primeira página, a atual e a última. Anterior e Próxima continuam disponíveis.
As reticências não recebem foco nem são anunciadas como controles.

| Página atual / total | Janela exibida                   |
| -------------------- | -------------------------------- |
| 1 / 5                | 1, 2, 3, 4, 5                    |
| 1 / 500              | 1, 2, 3, 4, 5, …, 500            |
| 250 / 500            | 1, …, 249, 250, 251, …, 500      |
| 500 / 500            | 1, …, 496, 497, 498, 499, 500    |
| 5000 / 10000         | 1, …, 4999, 5000, 5001, …, 10000 |

O cálculo e a quantidade de controles não crescem com o total de páginas. Os
botões mantêm o tamanho mínimo existente, nomes acessíveis traduzidos e
`aria-current="page"`; a janela pode quebrar linha em telas estreitas.

## URLs, erros e concorrência

- O número da página precisa ser um inteiro positivo seguro, escrito com
  dígitos. Zero, negativos, frações, expoentes, valores não numéricos e inteiros
  fora do intervalo seguro voltam para `/posts/paged`. Zeros à esquerda são
  normalizados; `/posts/paged/1` também usa a rota sem número.
- Categoria e tag recebidas pela URL são aplicadas antes da normalização e
  preservadas na navegação. A busca atual da store também é preservada.
- O adaptador reconhece apenas o HTTP 400 com o código
  `rest_post_invalid_page_number` da consulta de posts como página fora de
  alcance. Outros erros de HTTP, rede, política editorial ou taxonomia continuam
  produzindo erro recuperável, com tentativa manual.
- No modo por páginas, uma coleção que encolheu ou uma URL acima da última
  página volta à primeira, usando `replaceUrl`. A recuperação pode consultar a
  página 1 uma única vez. Se essa consulta também falhar, o erro é apresentado;
  não há ciclo de redirecionamento. Um resultado vazio já confirmado é
  reaproveitado sem consulta extra.
- A recuperação fica dentro do mesmo `switchMap` da visita original. Mudar a
  rota, os filtros, a busca ou o modo de leitura cancela também a consulta de
  recuperação. Uma resposta antiga não substitui o novo estado.
- A ativação de uma rota reutilizada usa seu snapshot completo em
  `NavigationEnd`. Isso evita consultar a página antiga com os filtros novos ou
  repetir a consulta durante a canonicalização. A ativação inicial permanece
  imediata e a visita equivalente é deduplicada pela store.
- No modo contínuo, uma falha ao carregar a página seguinte preserva os posts
  já exibidos e oferece tentativa manual. Esta etapa não remove linhas
  acumuladas nem introduz virtualização.

## Validação

Dependências instaladas com o lockfile (`npm ci --no-audit --no-fund`), Node
24.22.1. Os testes foram executados localmente com dados controlados.

| Verificação                   | Base da PR #67 | Esta etapa                  |
| ----------------------------- | -------------- | --------------------------- |
| Testes Angular                | 503 passaram   | 554 passaram                |
| Testes de servidor            | 126 passaram   | 126 passaram                |
| Cobertura de linhas Angular   | 96,16%         | 96,60%                      |
| Cobertura de branches Angular | 93,72%         | 94,23%                      |
| Build de produção             | Aprovado       | Aprovado                    |
| Bundle inicial                | 418,65 kB      | 418,65 kB                   |
| Rotas prerenderizadas         | 10             | 10                          |
| Duplicação                    | 14 grupos      | 14 grupos, 1,15% das linhas |

Foram acrescentados 51 casos. O primeiro lote reproduziu 18 falhas antes da
correção; o lote ampliado com o roteador real reproduziu duas consultas
duplicadas adicionais. Ao final, os três arquivos focados passaram com cem
testes. Há casos de 1/2/5/8/500/10000 páginas, limites da janela, acessibilidade
dos controles, URL canônica, preservação de filtros, erro na própria recuperação,
troca de modo, cancelamento de consulta e manutenção das linhas no modo contínuo.

A inspeção no navegador usou uma cópia isolada da aplicação com respostas HTTP
simuladas: vinte cards por página, duzentos mil posts e dez mil páginas. Os cinco
arquivos de produto alterados foram conferidos byte a byte contra a branch. A
fixture e os arquivos de entrada da prévia não fazem parte da PR. Foram
conferidos primeira e última página com Enter, desativação correta de Anterior
e Próxima, janela intermediária e recuperação de `/posts/paged/999999` para a
primeira página com categoria e tag preservadas. A navegação manteve vinte cards.

Em frames de 320 e 390 pixels, o conteúdo e os controles ficaram dentro da
largura disponível, sem rolagem horizontal. Em 320 pixels, a janela com números
de quatro e cinco dígitos ocupou duas linhas; os controles mantiveram ao menos
40 pixels de altura. Também foram conferidos rótulos em português e inglês,
reticências fora da árvore de acessibilidade e indicação da página atual. Essa
inspeção de viewport não equivale a um teste em aparelho físico ou leitor de
tela.

O comando agregado `npm run check` continua com a pendência de formatação
preexistente em `docs/render-deployment.md`. As etapas funcionais foram
executadas individualmente; isso não representa aprovação do comando agregado.

Foi conferida, somente com GET, a resposta da API pública do WordPress para uma
página acima do alcance. Os cenários de erro e arquivo extenso usam dados
simulados. O CMS, Render, produção e artes não foram alterados.

## Limites e continuidade

Esta etapa limita os controles da paginação, não a quantidade de cards
acumulados pelo modo contínuo. Não foram medidos LCP, memória ou latência em
produção, e não se justifica virtualizar a lista sem essa medição. Esse restante
de A09 continua pendente. Paginação dos livros e carregamento das tags da
leitura permanecem no próximo recorte A05/A10.
