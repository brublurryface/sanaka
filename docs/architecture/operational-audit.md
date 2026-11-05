# Conferência operacional — novembro de 2026

## Ciclos autobiográficos — A14

A leitura autenticada do CMS em 04/11/2026 encontrou estes nove ciclos. A aplicação conserva o limite e a ordem editorial atuais. Não existe autorização editorial para expandir o conjunto ou reorganizar a autobiografia apenas por causa da auditoria técnica.

| ID   | Título                  | Slug                    |
| ---- | ----------------------- | ----------------------- |
| 6708 | I — Morte               | `i-morte`               |
| 6711 | II — Ciclos Programados | `ii-ciclos-programados` |
| 6713 | III — Debug             | `iii-debug`             |
| 6716 | IV — Renascimento       | `iv-renascimento`       |
| 6718 | V — A Antiga            | `v-a-antiga`            |
| 6720 | VI — ॐ सनकाय नमः        | `vi-om-sanakaya-namah`  |
| 6884 | VII — Aplicação         | `vii-aplicacao`         |
| 6886 | VIII — Personagens      | `viii-personagens`      |
| 6890 | IX — Fim                | `ix-fim-por-enquanto`   |

Antes de remover o limite ou derivar a sequência de outra forma, definir com a autora a fonte da ordem e o comportamento de ciclos futuros. O CMS continua sendo a fonte do conteúdo; nenhum post ou categoria foi alterado nesta conferência.

## Proxy, limites e logs — A16

A configuração local não confia em proxies por padrão. `render.yaml` registra `TRUST_PROXY_HOPS=1` como hipótese para ingresso direto no Render. Os testes existentes verificam contagem à direita e prefixos forjados para zero/um salto; isso não comprova a topologia efetiva do serviço publicado.

O workspace do Render não foi selecionado nesta sessão. Sanaka e TEST-DEV-SESI são workspaces diferentes; a seleção explícita continua necessária antes de consultar ou modificar o serviço. O estado documentado de publicação em `docs/render-deployment.md` é histórico, não uma observação nova de métricas ou cabeçalhos.

Ainda falta conferir o ingresso real, o número de instâncias e os cabeçalhos recebidos pelo Express por um procedimento controlado que não registre dados pessoais. Não aumentar a confiança em `X-Forwarded-For` com base apenas no teste local. O health check não prova que a configuração de proxy está correta.

Os limitadores de contato/newsletter usam memória do processo. O novo teste de duas instâncias independentes explicita que elas não compartilham contagem. Reinício também perde essa memória. Antes de escalar horizontalmente, decidir entre proteção compartilhada na borda e armazenamento compartilhado; não acrescentar Redis ou outro serviço como efeito colateral desta revisão.

Falhas de contato agora registram somente uma mensagem genérica, sem serializar o erro bruto do provedor SMTP. O contrato HTTP de indisponibilidade continua 503. Os testes usam transporte simulado e não enviam e-mails reais.

## Óbolos — A18

O snippet ativo #6 e a engine InnoDB foram conferidos somente por leitura. O complemento transacional, os testes MySQL e o plano de ativação estão em [obolo-idempotency.md](obolo-idempotency.md). O frontend mantém a funcionalidade nova desabilitada até a validação no CMS. Instalação, ativação e topologia real permanecem acompanhadas pela issue #80.
