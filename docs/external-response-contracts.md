# Contratos das respostas externas

Esta entrega parte da main `9c08c51`, após a integração da PR #106.
Não altera artes, animações, textos, estilos, modo de renderização, endpoints,
projeções `_fields`, paginação solicitada ou dependências.

## Fronteiras de validação

As leituras de Posts, política editorial, Sobre, Sanaka-loka e NASA recebem
`unknown`. O parâmetro genérico de `HttpClient` não valida JSON durante a execução.
Somente depois da validação os adaptadores produzem os modelos das páginas.

Os contratos WordPress ficam em `core/wordpress/wordpress-response.ts`.
O contrato NASA fica junto do seu adaptador, em `nasa-images-response.ts`.
Não há classe base comum para os dois provedores nem uma biblioteca nova de schemas.
Os modelos públicos das features permanecem os mesmos.

## WordPress

| Projeção                  | Dados obrigatórios                                                                  | Falha de contrato                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Política editorial        | Array de IDs inteiros positivos seguros e slugs não vazios, sem ambiguidades        | Erro antes de consultar publicações; nenhuma exclusão é removida                           |
| Arquivo                   | Array; ID, slug, título e resumo renderizados, data ISO e IDs de categorias         | A página inteira falha; não se descartam registros obrigatórios mantendo totais incorretos |
| Artigo                    | Mesmos campos e conteúdo renderizado; um resultado no máximo, com o slug consultado | Estado de erro, sem fabricar artigo ou declarar ausência                                   |
| Categorias                | ID, slug, nome e parent inteiro não negativo                                        | Erro; identidades duplicadas e ciclos são recusados antes de percorrer a árvore            |
| Tags e contexto editorial | Campos necessários para criar filtros ou links                                      | Filtro obrigatório falha; complemento opcional do artigo segue o fallback existente        |
| Livros                    | Array de ID, slug e título; identidades únicas e paginação coerente                 | Estado de erro e retentativa existente, sem catálogo inventado                             |
| Fragmentos de Sobre       | Array de até nove ID, slug, título e resumo; identidades únicas                     | Estado de erro, sem fragmentos fabricados                                                  |

Datas e campos numéricos obrigatórios não são fabricados por coerção de texto.
Um título renderizado vazio continua permitido: WordPress pode publicar conteúdo
sem título. Uma categoria com pai ausente da projeção mantém o comportamento
anterior; ancestrais presentes não podem formar ciclos.

`WordPressContractError` distingue dados incompatíveis de erros HTTP preservados.
`[]` é uma coleção válida; no artigo, confirma a ausência. Corpo `null`, objeto
no lugar de array ou registro obrigatório inválido não são convertidos em `[]`
nem em not-found. O erro HTTP de página fora do arquivo mantém o tratamento próprio
existente em `PostsPageOutOfRangeError`.

Os contadores `X-WP-Total` e `X-WP-TotalPages` aceitam inteiros decimais seguros,
sem números negativos, frações, expoentes ou notação hexadecimal. As verificações
existentes de totais são preservadas; o arquivo também recusa página vazia com total
positivo, quantidade maior que `per_page` e página além do total declarado.
Livros e tags continuam verificando a quantidade esperada em cada página.
Categorias mantêm o fallback de paginação quando o cabeçalho opcional não vem.

### Dados opcionais

- Tags do artigo, mídia incorporada, tamanhos de capa e metadados de personagens
  malformados são descartados ou normalizados para o fallback existente. Não
  passam números e objetos para operações de texto ou criação de links.
- Falha de contrato em categorias, tags, sugestões ou navegação complementar não
  substitui o corpo válido do artigo por erro. Esses complementos continuam
  independentes e não ficam em cache como sucesso falso.
- Capas dedicadas de Sanaka-loka preservam as representações existentes: string,
  objeto, valor em `meta` e lista. Entradas inválidas ficam sem capa; não se usa
  automaticamente a imagem destacada do post. Listas aninhadas são limitadas a
  oito níveis para evitar recursão excessiva.
- Texto de hover inválido não elimina o fragmento. Um valor válido em `meta` pode
  suprir o campo opcional; se não houver nenhum, o texto fica vazio.

O campo REST legado `sanakaverse_cover` permanece intacto para compatibilidade
com o CMS. Não há migração, publicação ou alteração de conteúdo no WordPress.
A conversão segura de HTML em texto e a sanitização Angular continuam sendo
responsabilidades existentes, separadas da validação estrutural.

## NASA

`collection` deve ser um objeto e `collection.items`, um array.
Envelope incompatível produz `NasaContractError`, alcançando o estado de erro e a
retentativa manual já presentes no portal. HTTP 200 com corpo `null` também falha.
HTTP 204 sem corpo mantém o comportamento explícito anterior de resposta sem conteúdo.

Dentro de uma coleção válida, candidatos sem ID/título textual, sem prévia HTTPS,
com arrays internos malformados ou de outro tipo de mídia são ignorados.
Essa escolha permite encontrar uma imagem válida posterior, preservando o
comportamento existente. Se nenhum candidato puder ser exibido, não se deduz
um endereço nem se substitui o ID de um exemplo selecionado por outro registro.

Crédito, centro e data opcionais inválidos usam os fallbacks existentes.
A URL HTTPS válida continua sendo a fornecida pela API, sem inferir tamanho ou
caminho. Um link opcional inválido não impede uma prévia válida posterior.
Metadados ausentes mantêm total zero; quando `total_hits` é fornecido, precisa
ser inteiro seguro não negativo e alcançar a quantidade de itens retornados.

## Testes e operação

As regressões cobrem respostas nulas, objetos em vez de arrays, IDs textuais,
campos obrigatórios inválidos, identidades ambíguas, árvores circulares, contadores
incoerentes e metadados opcionais malformados. Testes dos adaptadores comprovam que
a validação está conectada ao HTTP, que falhas não entram no cache como sucesso e
que as retentativas continuam disponíveis.

Os novos cenários de navegador usam o build real em Chromium desktop e celular
emulado, com serviços externos simulados:

1. Posts, artigo, Sanaka-loka e Sobre apresentam erro em JSON malformado com HTTP 200
   e recuperam o conteúdo em uma retentativa manual.
2. Uma política editorial inválida impede a consulta de publicações até ser revalidada.
3. Categorias opcionais inválidas preservam o leitor e seu conteúdo.
4. Uma busca NASA inválida apresenta erro, e a retentativa válida exibe a imagem.

A imagem da fixture NASA reutiliza bytes de uma arte já existente no repositório;
não gera nem modifica uma arte aprovada. Nenhum desses testes consulta provedores
reais, faz ofertas de óbolos ou envia formulários e e-mails.

Comandos:

```sh
npm run check
npm run test:e2e:types
npm run test:e2e
npm run test:browser:security
```

Os validadores conferem o contrato consumido pela aplicação; não auditam a
veracidade editorial nem substituem regras de acesso do servidor. Esta entrega
não altera renderização/status HTTP dos artigos, limites de imports, stores ou
Google Analytics, que continuam nas próximas etapas do plano.

## Referências

- [Angular: leituras HTTP e tipos de resposta](https://angular.dev/guide/http/making-requests).
- [WordPress: contrato de publicações](https://developer.wordpress.org/rest-api/reference/posts/).
- [WordPress: paginação](https://developer.wordpress.org/rest-api/using-the-rest-api/pagination/).
- [NASA: documentação da biblioteca de imagens](https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf).
