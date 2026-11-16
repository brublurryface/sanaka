# Investigação de respostas HTTP 404 e 5xx

O middleware `src/server/http-request-log.ts` registra respostas concluídas com status 404 ou 500–599. A instalação em `src/server.ts` precede APIs, redirecionamentos legados, arquivos estáticos e Angular; por isso observa o status final mesmo quando outro handler decide a resposta.

Ele não modifica rotas, cache, cabeçalhos ou corpos. Endereços inexistentes continuam respondendo conforme o servidor atual. As artes e animações não participam desta entrega.

## Contrato do registro

Uma linha JSON por resposta elegível, enviada a stdout:

```json
{
  "event": "http_response_error",
  "level": "warning",
  "timestamp": "2026-11-16T18:00:00.000Z",
  "method": "GET",
  "path": "/images/missing.webp",
  "status": 404,
  "resource_type": "asset",
  "duration_ms": 2.417,
  "request_id": "8ebfa3c3-8929-4885",
  "revision": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
```

| Campo         | Regra                                                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| event         | Sempre `http_response_error`.                                                                                                                                        |
| level         | `warning` para 404, `error` para 5xx; não identifica a causa ou o solicitante.                                                                                       |
| timestamp     | Data UTC da conclusão.                                                                                                                                               |
| method        | Método HTTP conhecido ou `OTHER`.                                                                                                                                    |
| path          | Caminho original sem query ou fragmento, limitado a 256 unidades UTF-16; `…` indica truncamento.                                                                     |
| status        | Status final observado em `finish`.                                                                                                                                  |
| resource_type | `api` pelo prefixo; `asset` por pasta/extensão pública; `document` por resposta HTML; demais casos `other`. É uma classificação técnica, não identificação de robôs. |
| duration_ms   | Tempo monotônico até a conclusão no servidor, em milissegundos.                                                                                                      |
| request_id    | `Rndr-Id` aceito somente no formato hexadecimal limitado documentado pelo Render ou UUID. Outros formatos recebem um UUID local.                                     |
| revision      | `RENDER_GIT_COMMIT` validado; `unknown` se ausente ou inválido.                                                                                                      |

O ID recebido nunca é refletido em um novo cabeçalho de resposta. Se houver fallback para UUID local, esse ID existe apenas neste log. O campo de revisão é obtido no início do processo, sem expor o ambiente ao navegador.

O fluxo não serializa request/response, corpo, IP, cookies, Authorization, user-agent ou referer. Queries com e-mail e token de confirmação são descartadas integralmente. Segmentos com endereços de e-mail, delimitadores de query codificados ou valores após nomes sensíveis (`token`, `email`, `confirm`, etc.) são substituídos por `[redacted]`; codificação inválida recebe marcador próprio. Isso não é um anonimizador universal para dados arbitrários colocados em caminhos: rotas novas com identificadores privados precisam de uma política explícita antes de entrar neste diagnóstico.

Controles são neutralizados, e a serialização JSON mantém um único registro por linha. O caminho não é convertido para minúsculas, não tem barras codificadas decodificadas e não resolve `..`, preservando diferenças úteis ao diagnóstico. Caminhos truncados ou redigidos podem agrupar requisições distintas.

`finish` significa que o Node entregou a resposta ao sistema operacional; não confirma leitura pelo cliente. `close` anterior a `finish` apenas remove os listeners e não inventa um 404/503 entregue. A emissão acontece uma única vez, e uma falha síncrona no destino dos logs não lança uma exceção após o envio da resposta.

## Volume e alcance

Não são registrados 2xx, redirecionamentos ou os demais 4xx neste fluxo. Não há amostragem, timers ou mapas de URLs em memória: cada 404/5xx concluído produz uma linha curta. Em tráfego intenso, os limites e a retenção do provedor ainda podem causar perda de registros; os totais coletados não substituem automaticamente as métricas HTTP da borda. O Render documenta limite de 6.000 linhas de aplicação por minuto por instância; registros descartados pelo provedor não são recuperados por esta implementação.

O registro cobre apenas requisições que chegam a este processo Express. Respostas do CMS/Locaweb, da borda do Render, de um proxy ou de um processo que caiu antes de concluir a resposta não aparecem automaticamente aqui. Um redirecionamento 308 ao CMS e um 404 posterior no CMS são respostas de serviços diferentes.

As rotas `/posts/**` continuam com renderização no cliente. Um post inexistente pode receber shell HTTP 200 e mostrar ausência depois da consulta ao WordPress; isso não deve ser reclassificado como HTTP 404 por este middleware. O trabalho de conteúdo e status dos artigos permanece na entrega de renderização editorial.

O log nativo de cada requisição HTTP no Render requer workspace Pro ou superior, segundo a documentação consultada em 16/11/2026. Este middleware usa os logs de aplicação existentes; não exige criar outro serviço, instalar um coletor, contratar upgrade ou configurar credenciais novas.

## Como investigar após publicação autorizada

1. Confirmar a revisão publicada e a presença de um registro sintético de 404. Conferir também que uma rota válida e um redirecionamento legado mantêm suas respostas.
2. No serviço correto do Render, consultar os logs de **aplicação** (`type=app`) pelo texto `http_response_error`. O filtro nativo `status_code` é para logs HTTP do provedor; ele não filtra automaticamente campos deste JSON de aplicação.
3. Analisar uma janela inicial de aproximadamente 24 horas. Agrupar por status, caminho, método e tipo de recurso; registrar intervalo e possível perda por retenção/limite. Comparar volumes com as métricas do mesmo serviço e período.
4. Conferir os caminhos mais frequentes contra o código, o build publicado e os links editoriais. Se houver um `request_id` do Render, ele pode correlacionar o registro com a requisição na borda quando esse log estiver disponível.
5. Corrigir somente destinos que deveriam funcionar. Preparar cada correção com um teste do comportamento observado.

| Evidência                                                         | Ação                                                                                                                         |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| JS, CSS ou imagem referenciada pelo site responde 404             | Corrigir publicação, referência ou cache da versão correspondente.                                                           |
| Rota/artigo válido responde 404                                   | Conferir roteamento, slug e origem do conteúdo; corrigir o ponto comprovado.                                                 |
| URL antiga tem um equivalente público confirmado                  | Redirecionar para esse destino específico.                                                                                   |
| Conteúdo realmente ausente                                        | Preservar 404; não redirecionar tudo para Home.                                                                              |
| Caminho incompatível com o projeto, como `/.env` ou `/vendor/...` | Tratar como indício de varredura, sem declarar a identidade do solicitante apenas pelo caminho. Manter resposta de ausência. |
| Volume afeta disponibilidade                                      | Investigar também proteção na borda, depois de identificar volume, serviço e impacto.                                        |

Sem user-agent ou IP, a suíte não promete identificar robôs individualmente. Uma sequência de caminhos pode sugerir varredura; não comprova autoria. A meta é preservar a navegação válida e descobrir o impacto real, não fazer o contador de 404 chegar a zero.

Os 4.601 registros históricos citados continuam sem causa confirmada. A instrumentação não reconstrói URLs que não foram registradas e não recupera logs expirados. A consulta a logs existentes depende de identificar o workspace e serviço corretos.

## Validação

`npm run test:server` cobre status final, deduplicação, interrupções, minimização dos dados, campos limitados, falha do destino dos logs e servidor Express real com arquivo estático, router montado e erro de handler. O novo módulo faz parte do limite de cobertura de 85% do servidor.

`npm run check` executa também auditoria de dependências, formatação, verificações de fonte, cobertura Angular, duplicação e build. Os fluxos de navegador e a regressão de segurança continuam nos workflows existentes.

## Referências

- [Node 24 — ServerResponse, finish e close](https://nodejs.org/download/release/v24.22.1/docs/api/http.html#class-httpserverresponse)
- [Render — logs, planos, correlação e limites](https://render.com/docs/logging)
- [Render — variáveis fornecidas ao processo](https://render.com/docs/environment-variables)
- [Google — status HTTP e URLs inexistentes](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes)
