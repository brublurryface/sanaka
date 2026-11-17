# Cabeçalhos de segurança do Sanaka

Esta entrega parte da `main` a29cc3c, após a integração da PR #105 pela autora.
A composição fica no Express existente. Não há nova dependência, mudança de modo de
renderização nem alteração nos arquivos aprovados de arte ou de Śabala/Hysteria.

## Proteções aplicadas

- `X-Content-Type-Options: nosniff`: respeita o tipo MIME enviado para cada recurso.
- `Referrer-Policy: strict-origin-when-cross-origin`: envia somente a origem nas
  requisições entre origens; na mesma origem, caminho e consulta continuam possíveis.
- `X-Frame-Options: SAMEORIGIN` e `Content-Security-Policy: frame-ancestors 'self'`:
  permitem o iframe original de Śabala dentro da aplicação e recusam enquadramento
  por outra origem.
- `Content-Security-Policy-Report-Only`: observa a política de recursos sem bloquear
  scripts, estilos, imagens, conexões ou frames com base nessa política candidata.
- `Reporting-Endpoints: csp="/api/security/csp-reports"`: destino relativo à mesma
  origem. `report-to csp` é acompanhado de `report-uri /api/security/csp-reports`
  para compatibilidade com navegadores que ainda usam o formato anterior.

O middleware é instalado antes dos endpoints, dos arquivos estáticos e da resposta
Angular. Assim, cobre SSR, prerender, páginas CSR, arquivos, JSON, redirecionamentos,
404 e respostas de erro da aplicação. As políticas de cache e os status existentes
continuam independentes desses cabeçalhos.

A CSP imposta restringe apenas os ancestrais de frames. As demais diretivas estão
em observação: esta entrega não representa uma CSP completa de bloqueio de scripts.
Não há `unsafe-inline` para scripts, `unsafe-eval` ou curingas amplos na candidata.

## Inventário inicial

O inventário vem de `src/index.html`, `src/styles.scss`, adaptadores WordPress/NASA,
formulários e arquivos originais em `public/loadings/sabala/hysteria/`.
As origens vindas de conteúdo editorial ou de respostas externas podem mudar;
desvios devem produzir observações, sem a liberação automática de novos hosts.

| Recurso                                           | Origem ou mecanismo observado                    | Decisão inicial                           |
| ------------------------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| Angular, traduções, artes, Matrix e manifest      | Própria origem                                   | `self` na observação                      |
| Roboto, Material Icons, Inter, Cormorant Garamond | `fonts.googleapis.com` e `fonts.gstatic.com`     | Origens exatas em estilos e fontes        |
| Estilos Angular e CSS crítico                     | `style` em HTML e inserido durante execução      | `unsafe-inline` só para estilos           |
| CSS crítico do build                              | Handlers inline gerados pelo Angular             | Scripts inline geram observação           |
| Conteúdo, imagens e óbolos WordPress              | `cms.sanaka.com.br`                              | Conexões e imagens inventariadas          |
| Matrix REST: busca e imagem NASA                  | `images-api.nasa.gov`, `images-assets.nasa.gov`  | Origens exatas; novos hosts geram relatos |
| Śabala/Hysteria                                   | Iframe, CSS, JS, WebP e PNG locais               | Enquadramento da mesma origem permitido   |
| Notas e letras do renderer                        | Atributos de estilo atualizados pelo JS original | Estilos inline preservados                |
| SMTP e Brevo                                      | Somente servidor                                 | Nenhuma origem nova no navegador          |

A candidata usa `default-src 'self'`, restringe objetos a `none` e observa
`base-uri` e `form-action` da própria origem. `data:` aparece apenas em imagens.
O renderer original não recebe áudio, novos scripts, conversões ou substituições
de animação.

O Angular combina SSR, prerender e CSR. `security.autoCsp` não é ativado:
a documentação do Angular informa a incompatibilidade com SSR. Não se introduz
nonce fixo, política permissiva de Trusted Types, desativação de CSS crítico
ou mudança no pipeline de imagens para fazer a política passar.

## Coleta limitada de observações

`POST /api/security/csp-reports` aceita os formatos
`application/csp-report` e `application/reports+json`.

- Corpo limitado a 16 KB, sem descompressão.
- No máximo dez itens examinados por lote.
- Limite global de sessenta requisições por minuto, por processo, com memória
  de uma entrada. O limite não depende de IP nem de cabeçalhos encaminhados.
- No máximo seiscentos registros por minuto por processo; relatos podem ser
  descartados pelo limite, pelo formato ou pelo próprio navegador.
- Resposta 204 e `Cache-Control: no-store`, inclusive para descarte de telemetria
  malformada ou excessiva. Erros do parser e do destino dos logs não são expostos.
- Nenhum e-mail, requisição ao CMS, gravação de formulário ou tentativa de envio
  é acionado pelo coletor.

Os logs têm `event: csp_violation`, nível informativo, horário do servidor,
revisão validada e somente estas classificações:

- Diretiva, em uma lista fixa.
- Disposição `report`, `enforce` ou `unknown`.
- Grupo do documento: Home, Posts, Matrix, Sobre, Contato, Sanaka-loka,
  Saṃvit, renderer de Śabala ou outro.
- Grupo da origem observada: própria origem, CMS, fontes Google, NASA,
  externa, inline, eval, data, blob ou desconhecida.

URLs completas, caminhos editoriais, consultas, fragmentos, referrer, agente
do navegador, IP, política original, amostras de código e campos desconhecidos
não entram no registro. Não se solicita `report-sample`.
Os dados de entrada são tratados como não confiáveis: um relato não comprova
ataque e a ausência de relatos não comprova ausência de incompatibilidades.

Na Render, consultar logs de aplicação pelo texto `csp_violation` e pela revisão.
Os eventos `http_response_error` dos 404/5xx permanecem separados.

## Validação automatizada

O workflow existente executa testes HTTP, cobertura, Angular, build e navegador,
sem necessidade de workflow novo.

Os testes HTTP conferem GET/HEAD, tipos MIME, JSON, redirecionamento, 404/503,
cache e cabeçalhos. O coletor recebe os dois formatos, entradas inválidas,
corpo excessivo, compressão, revisão inválida, falha de log e rajada de
requisições com renovação da janela.

A suíte Chromium usa o build Angular/Express real em desktop e celular.
Verifica os cabeçalhos de Home, Posts, artigo, Sobre, Sanaka-loka, Matrix,
Contato e arquivos; preserva erro controlado do parser de contato sem SMTP.
Um script inline sintético gera evento de violação com disposição `report`
e continua executando, enquanto a interface Angular permanece interativa.
Um pai de outra origem é recusado no navegador. A fixture desse pai recebe
permissão de acesso à rede local somente no seu contexto e origem de teste,
para que a verificação alcance a CSP em vez de parar na proteção de loopback.
A asserção exige o erro de bloqueio da resposta, não uma falha de acesso à rede.

Śabala é testado na mesma origem com movimento normal e reduzido:
imagem aprovada decodificada, LOADING, nove notas, duas linhas ornamentais,
canvas desenhado no modo normal e limpo no reduzido, remoção do iframe ao
terminar o carregamento. O JavaScript e o CSS originais ficam intactos.
Os cenários já existentes continuam verificando navegação, cancelamento,
âncoras, retentativas, artigos e formulários com respostas simuladas.

Os serviços externos são simulados. Google Fonts retorna CSS vazio na fixture;
esses testes verificam a política e a aplicação com fontes de fallback,
sem comprovar o desenho das fontes baixadas dos servidores Google.
A entrega real dos relatos depende do navegador; os testes HTTP verificam
o receptor e o teste de navegador verifica o evento de violação.

Comandos:

```sh
npm run check
npm run test:e2e:types
npm run test:e2e
npm run test:browser:security
```

## Conferência após publicação autorizada

A PR não executa merge nem deploy. Depois que a autora publicar a revisão:

1. Conferir os mesmos cabeçalhos no domínio público, no HTML, em um arquivo JS/CSS,
   no renderer e em `/api/health`. O proxy pode acrescentar políticas próprias.
2. Abrir Home, Posts, artigo, Sobre, Sanaka-loka, Matrix, Contato e newsletter
   no desktop e celular; conferir fontes Google, mídia editorial e Śabala.
3. Consultar observações por revisão e separar inline esperado do build,
   conteúdo editorial, extensões do navegador e novas origens externas.
4. Definir hashes ou nonces por resposta e compatibilidade do conteúdo antes
   de promover restrições de scripts/estilos de observação para bloqueio.
   Não promover automaticamente nem resolver relatos liberando curingas.

HSTS, `includeSubDomains`, preload, Trusted Types e isolamento COOP/COEP não
são acrescentados nesta etapa. HSTS com subdomínios depende da revisão dos
demais hosts; o código não sobrescreve políticas eventualmente aplicadas pelo proxy.

## Referências

- [Angular: segurança e CSP](https://angular.dev/best-practices/security).
- [MDN: X-Content-Type-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options).
- [MDN: Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy).
- [MDN: X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options).
- [MDN: CSP Report-Only](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy-Report-Only).
- [W3C: resolução do destino de relatórios](https://w3c.github.io/reporting/#process-header).
