# Política editorial e paginação do WordPress

Data: 04/11/2026. Escopo: A03, A06 e A08 da auditoria de 03/11/2026.

Base: `514e0c0dc5f47d8ba25adb468efed0cf1a99d5d6`, da PR #66. Esta etapa depende
da correção anterior de resiliência da leitura e mantém sua branch separada.

## Comportamento corrigido

Os IDs de Romance/WoD, Sobre e Sanakaverse eram valores da instalação original.
Além disso, o arquivo retirava volumes localmente depois de o WordPress calcular
os totais. Uma categoria recriada poderia produzir uma lista com quinze posts e
um total de vinte. Slugs ausentes eram convertidos em `-1` e enviados à API.

Agora `WordPressContentPolicyService` resolve os IDs pelos slugs estáveis
`romance`, `sobre` e `sanakaverse`, com uma consulta projetada em `id,slug`.
Posts, Sobre e a biblioteca compartilham essa resolução. As exclusões de ramos
incluem subcategorias e são enviadas antes da contagem e da paginação no CMS.

Os totais do arquivo são os cabeçalhos da mesma resposta filtrada. Se a resposta
contiver posts excluídos, a aplicação retorna erro recuperável; não remove linhas
localmente e apresenta os totais de outra coleção. Metadados ausentes, inválidos
ou incoerentes também geram erro recuperável, sem estimar páginas.

## Responsabilidades e decisões

- A confirmação da fronteira WoD é obrigatória antes de consultar conteúdo.
  Falha, timeout ou ausência dessa categoria bloqueia a consulta. Não existe
  fallback para os IDs históricos.
- A ausência confirmada das categorias opcionais Sobre ou Sanakaverse mantém
  vazia a respectiva coleção.
- Depois de carregar um artigo, os rótulos, tags e links adjacentes continuam
  opcionais. A consulta de segurança usa poucos termos e permanece separada do
  carregamento da árvore completa de rótulos.
- O serviço compartilha consultas em andamento. Um resultado válido pode ser
  reutilizado durante cinco minutos; a próxima assinatura após o vencimento
  consulta o CMS novamente. Erros não reutilizam um snapshot vencido, e uma
  tentativa anterior não limpa uma nova requisição iniciada no callback de erro.
- Esse cache não faz atualização automática da página aberta. Mudanças de
  taxonomia podem permanecer no snapshot até seu vencimento ou até recarregar a
  aplicação. A política editorial mais ampla de cache continua no escopo de A20.
- A hierarquia de categorias é carregada por páginas de até cem itens. Uma falha
  intermediária não entrega uma árvore parcial. Essa parte de A05 é necessária
  para resolver filtros e excluir corretamente os ramos.
- Tags de filtro usam busca direta por slug, inclusive quando a tag fica além
  dos primeiros cem termos. Um slug confirmado como ausente produz arquivo
  vazio sem consulta de posts. Falha HTTP continua sendo erro.
- Volumes continuam acessíveis por `/posts/:slug`, com navegação limitada ao ramo
  Sanakaverse. Sobre mantém os nove ciclos e sua ordem; as capas dos livros
  continuam independentes das imagens destacadas.

## Validação

`npm ci --no-audit --no-fund` executado com o lockfile, Node 24.22.1.

| Verificação                   | Base da PR #66 | Esta etapa                  |
| ----------------------------- | -------------- | --------------------------- |
| Testes Angular                | 457 passaram   | 503 passaram                |
| Testes de servidor            | 126 passaram   | 126 passaram                |
| Cobertura de linhas Angular   | 96,12%         | 96,16%                      |
| Cobertura de branches Angular | 93,44%         | 93,72%                      |
| Build de produção             | Aprovado       | Aprovado                    |
| Bundle inicial                | 418,65 kB      | 418,65 kB                   |
| Rotas prerenderizadas         | 10             | 10                          |
| Duplicação                    | 14 grupos      | 14 grupos, 1,16% das linhas |

Foram acrescentados 46 casos de teste e fortalecido o cenário de migração:
vinte posts de origem, cinco volumes excluídos pelo servidor e total final de
quinze. Os testes usam IDs diferentes da instalação atual para todos os ramos.
Cobrem falhas de política, renovação e cancelamento de cache, tags por slug,
categorias em 101/200/250 itens, navegação de subcategorias de volumes e rejeição
de respostas ou totais incoerentes. O teste da página real com HTTP simulado
continua verificando texto, SEO, progresso de leitura e estado do óbolo.

O comando agregado `npm run check` ainda tem a pendência de formatação anterior
em `docs/render-deployment.md`. As etapas funcionais foram executadas
individualmente. Os resultados acima não significam aprovação desse comando
agregado, nem representam um benchmark de LCP, memória ou latência em produção.

Antes da implementação, foram conferidos os slugs e a aceitação dos filtros pela
API pública do CMS, somente com GET. Os testes de falha usam respostas simuladas;
o WordPress não foi alterado e esta etapa não publicou a aplicação.

## Próximos recortes

A04/A09: janela de paginação e páginas fora de alcance. A05/A10: paginação dos
livros e carregamento de tags da leitura. A11/A12/A13: contratos compartilhados.
SSR, infraestrutura, ordenação editorial dos ciclos e artes permanecem nas
etapas próprias da auditoria.

## Referências de protocolo

- [Filtros de posts](https://developer.wordpress.org/rest-api/reference/posts/)
- [Consulta de categorias](https://developer.wordpress.org/rest-api/reference/categories/)
- [Tratamento de termos e include_children no core](https://developer.wordpress.org/reference/classes/wp_rest_posts_controller/prepare_tax_query/)
