# Execução da auditoria de novembro de 2026

Fonte: `sanaka_auditoria_para_work_2026-11-03.md`, base original `b90936ed425dd77c9326455738a2303a73b0d333`. As mudanças abaixo foram preparadas em PRs empilhadas. A autora autorizou revisar e integrar as entregas validadas; merge não representa publicação em produção.

| Achados                         | Entrega                                                   | Estado                                                                         |
| ------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| A01/A02                         | [PR #66](https://github.com/brublurryface/sanaka/pull/66) | Conteúdo essencial e enriquecimentos isolados; validação cumulativa aprovada   |
| A03/A06/A08 e categorias de A05 | [PR #67](https://github.com/brublurryface/sanaka/pull/67) | Política editorial, categorias completas e totais filtrados validados          |
| A04 e rotas de A09              | [PR #69](https://github.com/brublurryface/sanaka/pull/69) | Janela de paginação e tratamento de rotas inválidas validados                  |
| A05/A10                         | [PR #71](https://github.com/brublurryface/sanaka/pull/71) | Livros incrementais e tags contextuais validados                               |
| A11/A12/A13                     | [PR #74](https://github.com/brublurryface/sanaka/pull/74) | Contratos compartilhados validados, sem mudar limites públicos                 |
| A15                             | [PR #75](https://github.com/brublurryface/sanaka/pull/75) | CI executado no GitHub; proteção da main ainda pendente na issue #73           |
| A07/A19/A20                     | [PR #77](https://github.com/brublurryface/sanaka/pull/77) | Spike e benchmark concluídos; produção permanece CSR para artigos              |
| A09/A17                         | [PR #79](https://github.com/brublurryface/sanaka/pull/79) | Linha de base registrada; artes e animações intactas                           |
| A14                             | [Conferência operacional](operational-audit.md)           | Nove ciclos inventariados; manter limite/ordem até decisão editorial           |
| A16                             | [PR #81](https://github.com/brublurryface/sanaka/pull/81) | Logs genéricos e limite por processo testados; topologia real pendente         |
| A18                             | [Protocolo de óbolos](obolo-idempotency.md)               | Complemento e CI MySQL preparados; frontend desabilitado até ativação validada |

A validação cumulativa local desta entrega passou com 613 testes Angular, 133 de servidor, cobertura de linhas de 96,59% e branches de 94,27%, verificação de duplicação e build de produção de 419,51 kB iniciais. O workflow PHP/MySQL verifica concorrência e resposta perdida em banco isolado. Cada PR conserva seu histórico de checks no GitHub.

Os resultados e limites dos experimentos estão em `docs/performance/post-ssr-spike-2026-11.md` e `docs/performance/browser-baseline-2026-11.md`. São medições de laboratório com fixtures, não capacidade comprovada do Render nem INP p75 de usuários reais. Nenhum experimento habilita SSR global, virtualização ou conversão de imagens.

## Limites de operação

Integrar somente PRs revisadas com validação aprovada, preservando a ordem da pilha. Não implantar automaticamente. Não mudar conteúdo, categorias, configuração do Render, segredos ou artes canônicas como efeito colateral de uma correção de frontend. Benchmarks usam fixtures e não fazem POST em SMTP, Brevo ou contadores de produção.

O workspace do Render ainda requer seleção explícita. WPVibe confirmou conexão autenticada somente de leitura a `https://cms.sanaka.com.br` em 04/11/2026. O backend de óbolos está no snippet ativo #6; a leitura não altera contadores. O complemento PHP não foi instalado. A flag padrão `false` permite integrar o código mantendo o endpoint legado até a validação de staging.

A criação da proteção da main não foi concluída após a confirmação adicional de acesso do GitHub. O workflow está validado, mas não equivale a uma regra de proteção. A issue #73 acompanha esse passo; #80 acompanha a ativação do protocolo no CMS e a conferência do ingresso real do Render.
