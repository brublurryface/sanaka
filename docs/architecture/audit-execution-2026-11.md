# Execução da auditoria de novembro de 2026

Fonte: `sanaka_auditoria_para_work_2026-11-03.md`, base original `b90936ed425dd77c9326455738a2303a73b0d333`. As mudanças abaixo são propostas em PRs empilhadas; não representam publicação em produção.

| Achados                         | Entrega                                                   | Estado                                                                        |
| ------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| A01/A02                         | [PR #66](https://github.com/brublurryface/sanaka/pull/66) | Rascunho; conteúdo e enriquecimentos isolados                                 |
| A03/A06/A08 e categorias de A05 | [PR #67](https://github.com/brublurryface/sanaka/pull/67) | Rascunho; política editorial e totais filtrados                               |
| A04 e rotas de A09              | [PR #69](https://github.com/brublurryface/sanaka/pull/69) | Rascunho; janela de paginação e rotas inválidas                               |
| A05/A10                         | [PR #71](https://github.com/brublurryface/sanaka/pull/71) | Rascunho; livros incrementais e tags contextuais                              |
| A11/A12/A13                     | [PR #74](https://github.com/brublurryface/sanaka/pull/74) | Rascunho; 597 testes Angular, 130 servidor e build aprovados                  |
| A15                             | CI e proteção da main                                     | PR #75: check local e GitHub verdes; proteção pendente de autenticação        |
| A07/A19/A20                     | Spike de SSR/SEO/cache                                    | Spike local implementado; benchmark em conferência; Render exige workspace    |
| A09/A17                         | Spike de DOM/imagens                                      | Pendente de medições; preservar artes e animações                             |
| A14                             | Nove ciclos e ordenação                                   | Manter comportamento atual até decisão editorial explícita                    |
| A16                             | Proxy e limite por processo                               | Testes locais existentes; confirmar topologia real antes de alterar confiança |
| A18                             | Óbolos no WordPress                                       | Conexão ao CMS verificada; snippet ativo #6 localizado para inspeção          |

## Limites de operação

Não mesclar PRs nem implantar automaticamente. Não mudar conteúdo, categorias, configuração do Render, segredos ou artes canônicas como efeito colateral de uma correção de frontend. Benchmarks usam fixtures e não fazem POST em SMTP, Brevo ou contadores de produção.

O workspace do Render ainda requer seleção explícita. WPVibe confirmou conexão autenticada somente de leitura a `https://cms.sanaka.com.br` em 04/11/2026. O backend de óbolos está no snippet ativo #6; a leitura não altera contadores.
