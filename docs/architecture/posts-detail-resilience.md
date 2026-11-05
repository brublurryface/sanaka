# Leitura de posts: isolamento de falhas opcionais

Data da execução: 04/11/2026 (UTC).

Base: `main`, commit `b90936ed425dd77c9326455738a2303a73b0d333`, também utilizado na
auditoria de 03/11/2026. Branch: `codex/posts-detail-resilience-20261104`.

## Problema e resultado

A01 e A02 da auditoria: a leitura aguardava posts, categorias e tags em um único
`forkJoin`. Uma falha nas taxonomias impedia a leitura e até a confirmação de um slug
ausente. Depois da primeira emissão do artigo, falhas nos links anterior/próximo
propagavam erro para a página, substituindo o conteúdo pelo estado de erro global.

Agora a resposta do post determina a disponibilidade do artigo. Categorias, tags e
navegação podem atualizar os complementos, com prazo e fallback próprios. Um link
saudável aparece sem aguardar o outro. Falhas opcionais preservam o texto já exibido.

## Decisões e limites

- A consulta principal continua usando a exclusão WoD na API. A resposta também é
  conferida pelos IDs da política atual antes da primeira emissão de conteúdo.
- Resposta vazia da consulta principal significa ausência. Erro HTTP ou timeout
  dessa consulta continua sendo erro recuperável, sem ser convertido em ausência.
- Sem resposta válida de categorias, não se deduz a coleção da navegação. O artigo
  e as tags disponíveis continuam legíveis, com os links adjacentes omitidos.
- Com categorias disponíveis, volumes mantêm a navegação dentro do Sanakaverse;
  posts comuns mantêm as exclusões do arquivo. Os parâmetros existentes foram
  preservados.
- Cada consulta tem prazo de 10 segundos. O prazo do conteúdo não encerra o fluxo
  depois da primeira emissão nem substitui os prazos dos complementos.
- As taxonomias compartilham respostas concluídas. Consultas ainda pendentes são
  canceladas quando ficam sem assinantes; erro ou fallback não vira cache definitivo.
- A troca de slug cancela consultas da leitura anterior. Complementos não repetem
  a consulta principal nem reiniciam a navegação ao receber tags.
- A sanitização de HTML continua ativa. O teste de página usa o serviço HTTP real
  com respostas simuladas e verifica artigo, SEO, progresso de leitura e óbolo.

## Evidências reproduzíveis

`npm ci --no-audit --no-fund` concluiu com o lockfile versionado, usando Node
24.22.1. A linha de base foi executada antes das alterações.

| Verificação                   | Base sem alterações | Após a correção                    |
| ----------------------------- | ------------------- | ---------------------------------- |
| Testes do servidor            | 126 passaram        | 126 passaram                       |
| Testes Angular                | 437 passaram        | 457 passaram                       |
| Cobertura de linhas Angular   | 96,04%              | 96,12%                             |
| Cobertura de branches Angular | 93,24%              | 93,44%                             |
| Verificação de duplicação     | Passou              | Passou, mesmos 14 grupos           |
| Build de produção             | Passou              | Passou                             |
| Bundle inicial                | 418,65 kB           | 418,65 kB                          |
| Rotas prerenderizadas         | 10                  | 10                                 |
| `npm run check` completo      | Falha de formatação | Mesma pendência anterior à mudança |

Foram acrescentados 20 casos de regressão. Antes da alteração de produção, a
execução das duas suítes afetadas terminou com **17 falhas e 18 testes passando**.
Depois da correção, as mesmas suítes terminaram com **35 testes passando**.

A pendência do comando agregado é a formatação de `docs/render-deployment.md`,
detectada na base antes da edição. Esse arquivo foi preservado. As etapas
`test:server`, `test:coverage`, `duplication:check` e `build` foram executadas
individualmente; não se apresenta o comando agregado como aprovado.

Comando das suítes afetadas:

```sh
npm run test:ci -- --include=src/app/pages/posts/data-access/wordpress-posts.service.spec.ts --include=src/app/pages/posts/post-detail/post-detail.spec.ts
```

Os testes cobrem conteúdo antes das taxonomias; falhas individuais e simultâneas;
resposta parcial da navegação; timeouts de conteúdo, categorias, tags e de cada
link; ausência de post; exclusão WoD; cancelamento; reaproveitamento de taxonomias
concluídas e nova tentativa após falha. A suíte existente continua verificando
sanitização, mídia, linhagem das categorias e navegação de volumes.

As medições acima são locais, de testes e build. Não representam LCP, memória ou
latência do WordPress em produção. A verificação da página usa DOM simulado, não
uma sessão de navegador contra o CMS real.

## Próxima etapa da auditoria

A03, A06 e A08 seguem separados: política por slugs, resolução de IDs e paginação
filtrada na origem. Os IDs existentes, os limites de taxonomias e livros, SSR,
cache editorial e infraestrutura não foram reformulados nesta entrega. Consultar
`../sanakaverse-content-contract.md` e `../wordpress-content-audit.md` antes dessa
próxima mudança.

Esta branch não inclui publicação, alterações no WordPress ou infraestrutura,
nem atualização das artes. A animação aprovada da Home permanece uma entrega
separada da correção de leitura.
